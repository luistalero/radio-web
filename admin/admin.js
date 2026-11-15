const api = window.FRECUENCIA_API_URL || '/api'
const request = (path, options = {}) => fetch(`${api}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
const loginView = document.querySelector('#login-view')
const editorView = document.querySelector('#editor-view')
const editor = document.querySelector('#content-editor')
const loginStatus = document.querySelector('#login-status')
const editorStatus = document.querySelector('#editor-status')

async function openEditor() { const response = await request('/content'); editor.value = JSON.stringify(await response.json(), null, 2); loginView.hidden = true; editorView.hidden = false }
document.querySelector('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); loginStatus.textContent = 'Verificando acceso…'; const form = new FormData(event.currentTarget); const response = await request('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) return (loginStatus.textContent = result.error || 'No fue posible iniciar sesión.'); openEditor() })
document.querySelector('#save').addEventListener('click', async () => { try { const content = JSON.parse(editor.value); editorStatus.textContent = 'Guardando…'; const response = await request('/content', { method: 'PUT', body: JSON.stringify(content) }); const result = await response.json(); editorStatus.textContent = response.ok ? 'Cambios guardados. La página mostrará el contenido actualizado.' : result.error } catch { editorStatus.textContent = 'Revisa el JSON: hay un error de formato.' } })
document.querySelector('#logout').addEventListener('click', async () => { await request('/logout', { method: 'POST' }); editorView.hidden = true; loginView.hidden = false; loginStatus.textContent = '' })
