import { upload } from 'https://esm.sh/@vercel/blob@2.6.1/client'

const api = window.FRECUENCIA_API_URL || '/api'
const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:'
const localContentKey = 'frecuencia-abierta:local-content'
const request = (path, options = {}) => fetch(`${api}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
const loginView = document.querySelector('#login-view')
const editorView = document.querySelector('#editor-view')
const fields = document.querySelector('#editor-fields')
const loginStatus = document.querySelector('#login-status')
const editorStatus = document.querySelector('#editor-status')
let content = null

const labels = { meta: 'Metadatos', branding: 'Marca', navigation: 'Navegación', hero: 'Portada', live: 'Señal en vivo', programs: 'Programas y horarios', territory: 'Nuestra tierra', stories: 'Historias', archive: 'Archivo sonoro', academic: 'Proyecto académico', participation: 'Participación', footer: 'Pie de página', items: 'Elementos', image: 'Imagen', src: 'Archivo o URL', alt: 'Texto alternativo', href: 'Enlace', body: 'Contenido', description: 'Descripción', subtitle: 'Título destacado', title: 'Título', kicker: 'Etiqueta de sección', label: 'Etiqueta', countLabel: 'Texto del contador', indexLabel: 'Etiqueta del índice', details: 'Datos', placeholders: 'Textos de ayuda', fields: 'Campos del formulario', schedule: 'Horarios', headers: 'Encabezados', actions: 'Botones', links: 'Enlaces', facts: 'Datos destacados', credits: 'Créditos', soundcloud: 'Audio de SoundCloud', url: 'URL pública de SoundCloud', mode: 'Modo al aire', fallback: 'Programación grabada', tracks: 'Audios de la playlist', artist: 'Autor o descripción', opening: 'Presentación inicial de Frecuencia Abierta', interlude: 'Presentación entre programas' }
Object.assign(labels, { project: 'Dossier del proyecto', intro: 'Sobre el proyecto', objectives: 'Objetivos', justification: 'Justificación', audiences: 'Públicos', themes: 'Temáticas', style: 'Estilo de la emisora', general: 'Objetivo general', generalLabel: 'Etiqueta objetivo general', specificLabel: 'Etiqueta objetivos específicos', groups: 'Grupos de público' })
const label = (key) => labels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
const escape = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))
const clone = (value) => JSON.parse(JSON.stringify(value))
const pathParts = (path) => path ? path.split('.') : []
const getAt = (path) => pathParts(path).reduce((target, part) => target?.[part], content)
const setAt = (path, value) => { const parts = pathParts(path); const key = parts.pop(); const parent = parts.reduce((target, part) => target[part], content); parent[key] = value }
const mediaType = (path, key) => {
  if (path === 'branding.logo' || key === 'src' && path.endsWith('.image.src')) return 'image'
  if (key === 'src' && (path.endsWith('.audio.src') || path.includes('.fallback.'))) return 'audio'
  return null
}

function input(path, key, value) {
  const text = String(value ?? '')
  const long = text.length > 90 || ['description', 'detail', 'body', 'privacy', 'note'].includes(key)
  const soundCloudUrl = key === 'url' && path.includes('.soundcloud.')
  const control = path === 'live.mode'
    ? `<select data-path="${escape(path)}"><option value="fallback"${text === 'fallback' ? ' selected' : ''}>Programación grabada</option><option value="caster"${text === 'caster' ? ' selected' : ''}>En vivo por Caster.fm</option></select><small>Guarda el cambio para cambiar la señal de los oyentes conectados.</small>`
    : long ? `<textarea data-path="${escape(path)}">${escape(text)}</textarea>` : `<input${soundCloudUrl ? ' type="url" placeholder="https://on.soundcloud.com/..."' : ''} data-path="${escape(path)}" value="${escape(text)}">`
  const type = mediaType(path, key)
  const accept = type === 'audio' ? 'audio/mpeg,audio/ogg,audio/wav,audio/mp4,audio/aac' : 'image/jpeg,image/png,image/webp,image/avif'
  const uploadControl = type ? `<div class="media-control"><input type="file" accept="${accept}" data-upload-path="${escape(path)}" data-media-type="${type}"><small>O pega una URL. Máximo recomendado: ${type === 'audio' ? '50' : '10'} MB.</small></div>` : ''
  const preview = type === 'image' && text ? `<img class="media-preview" src="${escape(text)}" alt="Vista previa">` : type === 'audio' && text ? `<audio class="media-preview" controls preload="none" src="${escape(text)}"></audio>` : ''
  return `<label class="editor-field">${label(key)}${control}${uploadControl}${preview}</label>`
}

function renderValue(value, path = '', key = '') {
  if (Array.isArray(value)) {
    const base = path ? `${path}.` : ''
    const cards = value.map((item, index) => `<div class="field-group"><div class="item-toolbar"><h3>${label(key).replace(/s$/, '')} ${index + 1}</h3><div><button type="button" data-action="up" data-path="${escape(path)}" data-index="${index}" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="down" data-path="${escape(path)}" data-index="${index}" ${index === value.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-action="remove" data-path="${escape(path)}" data-index="${index}">Eliminar</button></div></div>${renderValue(item, `${base}${index}`, '')}</div>`).join('')
    return `<section class="field-section"><div class="section-toolbar"><h2>${label(key)}</h2><button type="button" data-action="add" data-path="${escape(path)}">Añadir</button></div>${cards || '<p class="empty-state">Aún no hay elementos.</p>'}</section>`
  }
  if (value && typeof value === 'object') return `<section class="field-section"><h2>${label(key)}</h2>${Object.entries(value).map(([childKey, childValue]) => renderValue(childValue, path ? `${path}.${childKey}` : childKey, childKey)).join('')}</section>`
  return input(path, key, value)
}

function renderEditor() { fields.innerHTML = content ? Object.entries(content).map(([key, value], index) => `<details class="admin-section" ${index === 0 ? 'open' : ''}><summary><span>${label(key)}</span><small>Editar sección</small></summary><div class="admin-section-body">${renderValue(value, key, key)}<button class="section-save" type="button" data-action="save">Guardar cambios de esta sección</button></div></details>`).join('') : '' }

function changeArray(action, path, index) {
  const list = getAt(path)
  if (!Array.isArray(list)) return
  if (action === 'add') list.push(list.length ? clone(list[list.length - 1]) : path === 'live.fallback.tracks' ? { title: 'Nuevo audio', artist: '', src: '' } : {})
  if (action === 'remove') list.splice(index, 1)
  if (action === 'up' && index > 0) [list[index - 1], list[index]] = [list[index], list[index - 1]]
  if (action === 'down' && index < list.length - 1) [list[index + 1], list[index]] = [list[index], list[index + 1]]
  renderEditor()
}

async function openEditor() {
  if (localPreview) {
    try { content = JSON.parse(window.localStorage.getItem(localContentKey) || '') } catch { /* Se carga el contenido inicial abajo. */ }
    if (!content) {
      const response = await fetch('../data/content.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('No fue posible cargar el contenido inicial.')
      content = await response.json()
    }
  } else {
    const response = await request('/content')
    if (!response.ok) throw new Error('No fue posible cargar el contenido.')
    content = await response.json()
  }
  content.live ||= {}
  content.live.mode ||= 'caster'
  content.live.fallback ||= { title: 'Programación grabada', description: 'Historias, voces y música de Frecuencia Abierta.', tracks: [] }
  content.live.fallback.opening ||= { title: 'Presentación de Frecuencia Abierta', artist: 'Se reproduce antes de la programación', src: '' }
  content.live.fallback.interlude ||= { title: 'Frecuencia Abierta', artist: 'Se reproduce entre programas', src: '' }
  content.live.fallback.tracks ||= []
  if (!content.live.fallback.tracks.length) content.live.fallback.tracks.push(
    { title: 'Canciones con historia', artist: 'Programa musical · Frecuencia Abierta', src: 'https://soundcloud.com/silvia-luna-140230178/silvia-luna-programa-musical?si=9ce3b2b9ae2e4c18989a66083bddbb54' },
    { title: 'Gente de verdad', artist: 'Crónica sonora · Frecuencia Abierta', src: 'https://soundcloud.com/silvia-luna-140230178/gente-de-verdad-cronica-sonora?si=0f8d442c588042a9bd477ab27a803f34' }
  )
  content.archive?.items?.forEach((item, index) => {
    if (!Object.hasOwn(item, 'soundcloud') || index === 0 && item.soundcloud?.url?.includes('on.soundcloud.com')) item.soundcloud = index === 0 ? { title: 'Escucha este episodio', url: 'https://soundcloud.com/silvia-luna-140230178/microprograma-radial-los?si=bcc04f95cbd7405f8d6d57972129be01' } : { title: 'Escuchar en SoundCloud', url: '' }
    item.audio ||= { title: 'Testimonio sonoro', src: '' }
  })
  renderEditor()
  loginView.hidden = true
  editorView.hidden = false
}

document.querySelector('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  loginStatus.textContent = 'Verificando acceso…'
  try {
    if (localPreview) {
      await openEditor()
      return
    }
    const response = await request('/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'No fue posible iniciar sesión.')
    await openEditor()
  } catch (error) { loginStatus.textContent = error.message }
})

fields.addEventListener('input', (event) => { if (event.target.matches('[data-path]')) setAt(event.target.dataset.path, event.target.value) })
async function saveContent() {
  editorStatus.textContent = 'Guardando…'
  try {
    if (localPreview) {
      window.localStorage.setItem(localContentKey, JSON.stringify(content))
      editorStatus.textContent = 'Cambios guardados solo en este navegador (modo local).'
      return
    }
    const response = await request('/content', { method: 'PUT', body: JSON.stringify(content) })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'No fue posible guardar.')
    editorStatus.textContent = 'Cambios guardados y publicados.'
  } catch (error) { editorStatus.textContent = error.message }
}

fields.addEventListener('click', (event) => { const button = event.target.closest('[data-action]'); if (!button) return; if (button.dataset.action === 'save') return saveContent(); changeArray(button.dataset.action, button.dataset.path, Number(button.dataset.index)) })
fields.addEventListener('change', async (event) => {
  if (event.target.matches('[data-path]')) setAt(event.target.dataset.path, event.target.value)
  const fileInput = event.target.closest('[data-upload-path]')
  const file = fileInput?.files?.[0]
  if (!file) return
  if (localPreview) { editorStatus.textContent = 'En modo local coloca el archivo en assets/audio y pega una ruta como /assets/audio/mi-audio.mp3; las cargas a Blob solo funcionan en producción.'; fileInput.value = ''; return }
  const type = fileInput.dataset.mediaType
  const limit = type === 'audio' ? 50 : 10
  if (file.size > limit * 1024 * 1024) { editorStatus.textContent = `El ${type === 'audio' ? 'audio' : 'archivo'} supera el límite de ${limit} MB.`; fileInput.value = ''; return }
  try {
    editorStatus.textContent = `Subiendo ${file.name}…`
    const folder = type === 'audio' ? 'audio' : 'images'
    const result = await upload(`frecuencia-abierta/${folder}/${Date.now()}-${file.name}`, file, { access: 'public', handleUploadUrl: `${api}/media`, onUploadProgress: ({ percentage }) => { editorStatus.textContent = `Subiendo ${type === 'audio' ? 'audio' : 'imagen'}: ${Math.round(percentage)}%` } })
    setAt(fileInput.dataset.uploadPath, result.url)
    editorStatus.textContent = `${type === 'audio' ? 'Audio' : 'Imagen'} cargado. Guarda los cambios para publicarlo.`
    renderEditor()
  } catch (error) { editorStatus.textContent = error.message || 'No fue posible subir la imagen.' }
})

document.querySelector('#save').addEventListener('click', saveContent)
document.querySelector('#logout').addEventListener('click', async () => { if (!localPreview) await request('/logout', { method: 'POST' }); editorView.hidden = true; loginView.hidden = false; loginStatus.textContent = '' })
if (localPreview) document.querySelectorAll('#login-form [required]').forEach((field) => field.removeAttribute('required'))
