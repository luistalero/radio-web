import { handleUpload } from '@vercel/blob/client'
import { body, isAuthenticated } from './_auth.js'

const allowedContentTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac']

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido.' })
  try {
    const uploadBody = await body(request)
    if (uploadBody.type === 'blob.generate-client-token' && !isAuthenticated(request)) return response.status(401).json({ error: 'Sesión no autorizada.' })
    const result = await handleUpload({
      body: uploadBody,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/^frecuencia-abierta\/(images|audio)\//.test(pathname)) throw new Error('Ruta de archivo no permitida.')
        return { allowedContentTypes, addRandomSuffix: true, tokenPayload: JSON.stringify({ source: 'admin' }) }
      },
      onUploadCompleted: async () => {},
    })
    return response.status(200).json(result)
  } catch (error) {
    return response.status(400).json({ error: error.message || 'No fue posible preparar la subida.' })
  }
}
