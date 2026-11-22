import { initNavigation } from './navigation.js'
import { initPrograms } from './programs.js'
import { loadContent, renderSite } from './content.js'
import { initParticipation } from './participation.js'
import { initRadioPlayer } from './audio-player.js'
import { initAnimations } from './animations.js'
import { initThreeScene } from './three-scene.js'

const root = document.querySelector('#site-root')
const api = window.FRECUENCIA_API_URL || '/api'
const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname) || window.location.protocol === 'file:'
const localContentKey = 'frecuencia-abierta:local-content'

loadContent().then((content) => {
  renderSite(content)
  root?.classList.add('is-ready')
  root?.removeAttribute('aria-busy')
  initNavigation()
  initParticipation()
  initRadioPlayer(content.live)
  initThreeScene()
  initPrograms()
  initAnimations()
  document.querySelector('#current-year').textContent = String(new Date().getFullYear())
  const fingerprint = JSON.stringify(content)
  const refreshPage = async () => {
    try {
      const next = localPreview
        ? JSON.parse(window.localStorage.getItem(localContentKey) || '{}')
        : await (async () => {
            const response = await fetch(`${api}/content`, { cache: 'no-store' })
            return response.ok ? response.json() : null
          })()
      if (next?.branding && JSON.stringify(next) !== fingerprint) window.location.reload()
    } catch { /* Conserva la página actual si no hay conexión. */ }
  }
  const contentPolling = window.setInterval(refreshPage, 15000)
  const onStorage = (event) => { if (event.key === localContentKey) void refreshPage() }
  if (localPreview) window.addEventListener('storage', onStorage)
  window.addEventListener('pagehide', () => {
    window.clearInterval(contentPolling)
    if (localPreview) window.removeEventListener('storage', onStorage)
  }, { once: true })
}).catch((error) => {
  console.error(error)
  if (root) {
    root.classList.add('is-error')
    root.removeAttribute('aria-busy')
    root.innerHTML = '<div class="site-loading" role="alert"><div class="loading-copy"><span class="loading-kicker">Conexión interrumpida</span><strong>No pudimos sintonizar la página</strong><span class="loading-message">Comprueba tu conexión e inténtalo de nuevo en unos momentos.</span></div></div>'
  }
})
