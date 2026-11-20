import { get, put } from '@vercel/blob'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isAuthenticated, body } from './_auth.js'

const pathname = 'frecuencia-abierta/content.json'
const initialFile = fileURLToPath(new URL('../data/content.json', import.meta.url))
const sendError = (response, status, error) => response.status(status).json({ error })

async function initialContent() {
  return JSON.parse(await readFile(initialFile, 'utf8'))
}

function withRuntimeConfig(content) {
  const streamUrl = String(process.env.RADIO_STREAM_URL || '').trim()
  if (content.live?.caster?.publicToken) return content
  if (!/^https?:\/\//i.test(streamUrl)) {
    return {
      ...content,
      live: {
        ...content.live,
        signalState: 'PRÓXIMAMENTE',
        badge: 'SEÑAL PENDIENTE',
        frequency: 'FA — 01',
        trackLabel: 'PROGRAMACIÓN',
        trackTitle: 'Próxima transmisión',
        trackDescription: 'Frecuencia Abierta · San Juan Nepomuceno',
        trackSchedule: 'Próximamente',
        connectionLabel: 'Conexión de audio pendiente',
        note: 'Estamos preparando nuestra señal en vivo para compartirla contigo.',
        streamUrl: ''
      }
    }
  }
  return { ...content, live: { ...content.live, streamUrl } }
}

async function readContent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return initialContent()
  const saved = await get(pathname, { access: 'private', useCache: false })
  if (saved?.statusCode === 200) {
    const content = JSON.parse(await new Response(saved.stream).text())
    if (content?.branding && content?.programs?.items) return content
  }
  return initialContent()
}

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') return response.status(200).json(withRuntimeConfig(await readContent()))
    if (request.method !== 'PUT') return sendError(response, 405, 'Método no permitido.')
    if (!isAuthenticated(request)) return sendError(response, 401, 'Sesión no autorizada.')
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return sendError(response, 503, 'El almacenamiento privado aún no está configurado.')
    const content = await body(request)
    if (!content || typeof content !== 'object' || Array.isArray(content) || !content.branding || !content.programs?.items) return sendError(response, 400, 'El contenido no tiene la estructura esperada.')
    await put(pathname, JSON.stringify(content, null, 2), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
    return response.status(200).json({ saved: true })
  } catch (error) {
    console.error(error)
    return sendError(response, 500, 'No fue posible acceder al contenido privado.')
  }
}
