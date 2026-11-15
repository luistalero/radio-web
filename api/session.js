import { isAuthenticated } from './_auth.js'

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Método no permitido.' })
  return response.status(200).json({ authenticated: isAuthenticated(request) })
}
