import { get, put } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isAuthenticated, body } from './_auth.js'

const pathname = 'frecuencia-abierta/content.json'
const initialFile = fileURLToPath(new URL('../data/content.json', import.meta.url))
const sendError = (response, status, error) => response.status(status).json({ error })

async function readContent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return JSON.parse(await readFile(initialFile, 'utf8'))
  const saved = await get(pathname, { access: 'private', useCache: false })
  if (saved?.statusCode === 200) return JSON.parse(await new Response(saved.stream).text())
  return JSON.parse(await readFile(initialFile, 'utf8'))
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return response.status(200).json(await readContent())
    if (request.method !== 'PUT') return sendError(response, 405, 'Método no permitido.')
    if (!isAuthenticated(request)) return sendError(response, 401, 'Sesión no autorizada.')
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return sendError(response, 503, 'El almacenamiento privado aún no está configurado.')
    const content = await body(request)
    if (!content || typeof content !== 'object' || Array.isArray(content)) return sendError(response, 400, 'El contenido debe ser un objeto JSON.')
    await put(pathname, JSON.stringify(content, null, 2), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
    return response.status(200).json({ saved: true })
  } catch (error) {
    console.error(error)
    return sendError(response, 500, 'No fue posible acceder al contenido privado.')
  }
}
