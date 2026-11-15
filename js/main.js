import { initNavigation } from './navigation.js'
import { initPrograms } from './programs.js'
import { initContent } from './content.js'
import { initParticipation } from './participation.js'
import { initAudioPlayer } from './audio-player.js'
import { initAnimations } from './animations.js'
import { initThreeScene } from './three-scene.js'

initNavigation()
initParticipation()
initAudioPlayer()
initThreeScene()
initContent().then(() => {
  initPrograms()
  initAnimations()
})

document.querySelector('#current-year').textContent = String(new Date().getFullYear())
