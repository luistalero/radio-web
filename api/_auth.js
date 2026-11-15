import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const secret = () => process.env.SESSION_SECRET || ''
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const decode = (value) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
const sign = (value) => createHmac('sha256', secret()).update(value).digest('base64url')

export function configured() {
  return Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && secret().length >= 32)
}

export function secureEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createSession() {
  const payload = encode({ exp: Date.now() + 8 * 60 * 60_000, nonce: randomBytes(18).toString('base64url') })
  return `${payload}.${sign(payload)}`
}

export function isAuthenticated(request) {
  const cookie = request.headers.cookie || ''
  const token = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('fa_session='))?.slice(11)
  if (!token) return false
  const [payload, signature] = token.split('.')
  try { return Boolean(payload && signature && secureEqual(signature, sign(payload)) && decode(payload).exp > Date.now()) } catch { return false }
}

export function sessionCookie(token, expires = 28800) {
  return `fa_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${expires}`
}

export async function body(request) {
  if (request.body && typeof request.body === 'object') return request.body
  return new Promise((resolve, reject) => {
    let value = ''
    request.on('data', (chunk) => { value += chunk; if (value.length > 1_000_000) request.destroy() })
    request.on('end', () => { try { resolve(JSON.parse(value || '{}')) } catch { reject(new Error('JSON inválido')) } })
    request.on('error', reject)
  })
}
