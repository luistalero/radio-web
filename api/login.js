import { body, configured, createSession, secureEqual, sessionCookie } from './_auth.js'

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido.' })
  if (!configured()) return response.status(503).json({ error: 'El acceso privado aún no está configurado.' })
  try {
    const credentials = await body(request)
    const valid = secureEqual(credentials.username || '', process.env.ADMIN_USERNAME) && secureEqual(credentials.password || '', process.env.ADMIN_PASSWORD)
    if (!valid) return response.status(401).json({ error: 'Credenciales incorrectas.' })
    const token = createSession()
    response.setHeader('Set-Cookie', sessionCookie(token))
    return response.status(200).json({ authenticated: true })
  } catch { return response.status(400).json({ error: 'Solicitud inválida.' }) }
}
