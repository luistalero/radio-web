import { sessionCookie } from './_auth.js'

export default function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido.' })
  response.setHeader('Set-Cookie', sessionCookie('', 0))
  return response.status(200).json({ authenticated: false })
}
