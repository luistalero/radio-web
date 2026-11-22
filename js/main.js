import { initNavigation } from './navigation.js'
import { initPrograms } from './programs.js'
import { loadContent, renderSite } from './content.js'
import { initParticipation } from './participation.js'
import { initRadioPlayer } from './audio-player.js'
import { initAnimations } from './animations.js'
import { initThreeScene } from './three-scene.js'

const root = document.querySelector('#site-root')

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
}).catch((error) => {
  console.error(error)
  if (root) {
    root.classList.add('is-error')
    root.removeAttribute('aria-busy')
    root.innerHTML = '<div class="site-loading" role="alert"><div class="loading-copy"><span class="loading-kicker">Conexión interrumpida</span><strong>No pudimos sintonizar la página</strong><span class="loading-message">Comprueba tu conexión e inténtalo de nuevo en unos momentos.</span></div></div>'
  }
})
