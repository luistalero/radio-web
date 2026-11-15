const api = window.FRECUENCIA_API_URL || '/api'
const request = (path, options = {}) => fetch(`${api}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
const loginView = document.querySelector('#login-view')
const editorView = document.querySelector('#editor-view')
const fields = document.querySelector('#editor-fields')
const loginStatus = document.querySelector('#login-status')
const editorStatus = document.querySelector('#editor-status')

let content = null
const labels = { hero: 'Portada', location: 'Ubicación', title: 'Título', subtitle: 'Subtítulo', description: 'Descripción', programs: 'Programas', number: 'Número', mark: 'Símbolo', category: 'Temática', detail: 'Información ampliada', credits: 'Créditos académicos', author: 'Autora', role: 'Rol', email: 'Correo electrónico', institution: 'Universidad', course: 'Asignatura y docente', school: 'Escuela', locationYear: 'Sede y año' }
const label = (key) => labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
const escape = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))
function field(path, key, value) { const long = value.length > 80; return `<label>${label(key)}${long ? `<textarea data-path="${path}">${escape(value)}</textarea>` : `<input data-path="${path}" value="${escape(value)}">`}</label>` }
function renderObject(object, path = '') { return Object.entries(object).map(([key, value]) => { const next = path ? `${path}.${key}` : key; if (Array.isArray(value)) return `<section class="field-section"><h2>${label(key)}</h2>${value.map((item, index) => `<div class="field-group"><h3>${label(key).slice(0, -1)} ${index + 1}</h3>${renderObject(item, `${next}.${index}`)}</div>`).join('')}</section>`; if (value && typeof value === 'object') return `<section class="field-section"><h2>${label(key)}</h2>${renderObject(value, next)}</section>`; return field(next, key, String(value ?? '')) }).join('') }
function updateContent(path, value) { const parts = path.split('.'); const last = parts.pop(); const target = parts.reduce((object, part) => object[part], content); target[last] = value }
async function openEditor() { const response = await request('/content'); content = await response.json(); fields.innerHTML = renderObject(content); loginView.hidden = true; editorView.hidden = false }
document.querySelector('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); loginStatus.textContent = 'Verificando acceso…'; const form = new FormData(event.currentTarget); const response = await request('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) return (loginStatus.textContent = result.error || 'No fue posible iniciar sesión.'); openEditor() })
fields.addEventListener('input', (event) => { if (event.target.matches('[data-path]')) updateContent(event.target.dataset.path, event.target.value) })
document.querySelector('#save').addEventListener('click', async () => { editorStatus.textContent = 'Guardando…'; const response = await request('/content', { method: 'PUT', body: JSON.stringify(content) }); const result = await response.json(); editorStatus.textContent = response.ok ? 'Cambios guardados. La página mostrará el contenido actualizado.' : result.error })
document.querySelector('#logout').addEventListener('click', async () => { await request('/logout', { method: 'POST' }); editorView.hidden = true; loginView.hidden = false; loginStatus.textContent = '' })
