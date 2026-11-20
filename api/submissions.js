import { del, get, list, put } from '@vercel/blob'
import { body, isAuthenticated } from './_auth.js'

const prefix = 'frecuencia-abierta/submissions/'
const clean = (value, limit) => String(value || '').trim().slice(0, limit)
const sendError = (response, status, error) => response.status(status).json({ error })

export default async function handler(request, response) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) return sendError(response, 503, 'La recepción de historias todavía no está configurada.')

    if (request.method === 'POST') {
      const input = await body(request)
      if (input.website) return response.status(201).json({ received: true })
      const submission = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: clean(input.name, 120),
        email: clean(input.email, 180),
        topic: clean(input.topic, 180),
        message: clean(input.message, 5000)
      }
      if (submission.name.length < 2 || !/^\S+@\S+\.\S+$/.test(submission.email) || submission.topic.length < 3 || submission.message.length < 12) return sendError(response, 400, 'Revisa los datos del formulario e inténtalo nuevamente.')
      await put(`${prefix}${Date.now()}-${submission.id}.json`, JSON.stringify(submission), { access: 'private', addRandomSuffix: false, contentType: 'application/json' })
      return response.status(201).json({ received: true })
    }

    if (request.method === 'GET') {
      if (!isAuthenticated(request)) return sendError(response, 401, 'Sesión no autorizada.')
      const result = await list({ prefix, limit: 100 })
      const submissions = await Promise.all(result.blobs.map(async (blob) => {
        const saved = await get(blob.pathname, { access: 'private', useCache: false })
        return saved?.statusCode === 200 ? JSON.parse(await new Response(saved.stream).text()) : null
      }))
      return response.status(200).json(submissions.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }

    if (request.method === 'DELETE') {
      if (!isAuthenticated(request)) return sendError(response, 401, 'Sesión no autorizada.')
      const input = await body(request)
      if (!input.pathname?.startsWith(prefix)) return sendError(response, 400, 'Historia no válida.')
      await del(input.pathname)
      return response.status(200).json({ deleted: true })
    }
    return sendError(response, 405, 'Método no permitido.')
  } catch (error) {
    console.error(error)
    return sendError(response, 500, 'No fue posible procesar la historia.')
  }
}
