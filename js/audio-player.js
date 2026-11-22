const api = window.FRECUENCIA_API_URL || '/api'
const text = (value) => String(value || '').trim()
const modeOf = (live) => live?.mode === 'fallback' ? 'fallback' : 'caster'
let soundCloudApi

const isSoundCloudUrl = (value) => {
  try {
    const host = new URL(text(value)).hostname.toLowerCase()
    return host === 'soundcloud.com' || host.endsWith('.soundcloud.com') || host === 'on.soundcloud.com'
  } catch { return false }
}

function loadSoundCloudApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC)
  if (soundCloudApi) return soundCloudApi
  soundCloudApi = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://w.soundcloud.com/player/api.js'
    script.async = true
    script.onload = () => window.SC?.Widget ? resolve(window.SC) : reject(new Error('API no disponible'))
    script.onerror = () => reject(new Error('No fue posible cargar SoundCloud'))
    document.head.append(script)
  })
  return soundCloudApi
}

export function initRadioPlayer(initialLive = {}) {
  const audio = document.querySelector('#radio-audio')
  const playButton = document.querySelector('#play-toggle')
  const waveform = document.querySelector('#waveform')
  const status = document.querySelector('#player-status')
  const modal = document.querySelector('#caster-modal')
  const closeCaster = document.querySelector('#caster-close')
  const soundCloudPlayer = document.querySelector('#soundcloud-player')
  const volume = document.querySelector('#radio-volume')
  const volumeOutput = document.querySelector('#volume-output')
  if (!audio || !playButton || !waveform || !status) return

  const ui = {
    badge: document.querySelector('#player-badge'), signal: document.querySelector('#signal-state'), label: document.querySelector('#play-label'),
    connection: document.querySelector('#connection-label'), trackLabel: document.querySelector('#track-label'), title: document.querySelector('#track-title'),
    description: document.querySelector('#track-description'), schedule: document.querySelector('#track-schedule'),
  }
  let live = initialLive
  let mode = modeOf(live)
  let queue = []
  let queueIndex = -1
  let userStartedFallback = false
  let soundCloudWidget = null

  for (let index = 0; index < 48; index += 1) {
    const bar = document.createElement('i')
    bar.style.setProperty('--bar-height', `${16 + ((index * 17 + index * index * 3) % 28)}%`)
    bar.style.setProperty('--bar-index', String(index))
    waveform.append(bar)
  }

  const announce = (message) => { status.textContent = message; status.hidden = false }
  const hideStatus = () => { status.hidden = true; status.textContent = '' }
  const tracks = () => (live.fallback?.tracks || []).filter((track) => text(track?.src))
  const shuffle = (items) => {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
    }
    return copy
  }

  function setPlaying(playing) {
    waveform.classList.toggle('is-playing', playing)
    playButton.querySelector('.play-glyph').textContent = playing ? 'Ⅱ' : '▶'
    if (mode === 'fallback') {
      playButton.setAttribute('aria-label', playing ? 'Pausar programación grabada' : 'Escuchar programación grabada')
      ui.label.textContent = playing ? 'Programación al aire' : 'Escuchar programación'
      ui.connection.textContent = playing ? 'Historias y voces grabadas' : 'Lista preparada'
    }
  }

  function paint() {
    const fallback = mode === 'fallback'
    const track = queue[queueIndex]
    ui.badge.textContent = fallback ? 'PROGRAMACIÓN GRABADA' : 'EN VIVO'
    ui.signal.textContent = fallback ? 'PROGRAMACIÓN AUTOMÁTICA' : 'SEÑAL EN VIVO'
    ui.trackLabel.textContent = fallback ? 'AHORA SUENA' : (live.trackLabel || 'TRANSMISIÓN')
    ui.title.textContent = fallback ? (track?.title || live.fallback?.title || 'Programación grabada') : (live.trackTitle || 'Frecuencia Abierta')
    ui.description.textContent = fallback ? (track?.artist || live.fallback?.description || 'Historias, voces y música') : (live.trackDescription || 'Radio comunitaria')
    ui.schedule.textContent = fallback ? 'En bucle' : (live.trackSchedule || 'En vivo')
    if (!fallback) {
      waveform.classList.remove('is-playing')
      playButton.querySelector('.play-glyph').textContent = '▶'
      playButton.setAttribute('aria-label', 'Abrir reproductor de la señal en vivo')
      ui.label.textContent = 'Escucha la señal'
      ui.connection.textContent = 'Reproductor oficial de Caster.fm'
    } else setPlaying(!audio.paused)
  }

  function loadCasterWidget() {
    if (!text(live.caster?.publicToken)) return announce('El reproductor en vivo aún no está configurado.')
    if (document.querySelector('script[data-caster-widget]')) return
    const script = document.createElement('script')
    script.src = 'https://cdn.cloud.caster.fm/widgets/embed.js'
    script.async = true
    script.dataset.casterWidget = 'true'
    script.onerror = () => announce('No fue posible cargar el reproductor en vivo. Inténtalo de nuevo en unos minutos.')
    document.head.append(script)
  }

  function resetCasterWidget() {
    const player = document.querySelector('#caster-player')
    if (!player?.querySelector('iframe')) return
    player.replaceChildren()
    ;['Shoutcast Hosting', 'Stream Hosting', 'Radio Server Hosting'].forEach((label) => {
      const link = document.createElement('a')
      link.href = 'https://www.caster.fm'
      link.textContent = label
      player.append(link, ' ')
    })
    player.dataset.rendered = 'false'
    document.querySelector('script[data-caster-widget]')?.remove()
  }

  function stopFallback() {
    soundCloudWidget?.pause()
    soundCloudWidget = null
    if (soundCloudPlayer) soundCloudPlayer.replaceChildren()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setPlaying(false)
  }

  async function playNext() {
    if (!queue.length || queueIndex >= queue.length - 1) {
      queue = shuffle(tracks())
      queueIndex = -1
    }
    queueIndex += 1
    const track = queue[queueIndex]
    if (!track) return announce('Aún no hay audios en la programación grabada. Agrégalos desde el administrador.')
    if (isSoundCloudUrl(track.src)) return playSoundCloud(track)
    audio.src = track.src
    paint()
    try {
      await audio.play()
      hideStatus()
    } catch {
      announce('Pulsa reproducir para iniciar la programación grabada.')
    }
  }

  async function playSoundCloud(track) {
    if (!soundCloudPlayer) return announce('No fue posible preparar este audio de SoundCloud.')
    stopFallback()
    const frame = document.createElement('iframe')
    frame.title = track.title || 'Audio de SoundCloud'
    frame.allow = 'autoplay'
    frame.src = `https://w.soundcloud.com/player/?url=${encodeURIComponent(track.src)}&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false&visual=false`
    soundCloudPlayer.replaceChildren(frame)
    try {
      const SC = await loadSoundCloudApi()
      soundCloudWidget = SC.Widget(frame)
      await new Promise((resolve) => soundCloudWidget.bind(SC.Widget.Events.READY, resolve))
      soundCloudWidget.bind(SC.Widget.Events.FINISH, () => void playNext())
      soundCloudWidget.play()
      paint()
      setPlaying(true)
      hideStatus()
    } catch {
      announce('No fue posible reproducir este audio de SoundCloud. Intentando el siguiente…')
      window.setTimeout(() => void playNext(), 800)
    }
  }

  async function useFallback() {
    if (mode !== 'fallback') return
    if (!tracks().length) return announce('Aún no hay audios en la programación grabada. Agrégalos desde el administrador.')
    if (audio.paused || !audio.src) await playNext()
    else audio.pause()
  }

  function openCaster() {
    stopFallback()
    if (!modal || !text(live.caster?.publicToken)) return announce('El reproductor en vivo aún no está configurado.')
    if (!modal.open) modal.showModal()
    loadCasterWidget()
  }

  function applyMode(nextMode, changedRemotely = false) {
    const wasFallbackPlaying = mode === 'fallback' && !audio.paused
    mode = nextMode
    if (mode === 'caster') {
      stopFallback()
      paint()
      if (changedRemotely) openCaster()
      return
    }
    resetCasterWidget()
    if (modal?.open) modal.close()
    paint()
    if (wasFallbackPlaying || (changedRemotely && userStartedFallback)) void useFallback()
  }

  playButton.addEventListener('click', () => {
    if (mode === 'caster') openCaster()
    else { userStartedFallback = true; void useFallback() }
  })
  closeCaster?.addEventListener('click', () => modal.close())
  modal?.addEventListener('click', (event) => { if (event.target === modal) modal.close() })
  audio.addEventListener('play', () => setPlaying(true))
  audio.addEventListener('pause', () => setPlaying(false))
  audio.addEventListener('ended', () => void playNext())
  audio.addEventListener('error', () => { announce('No fue posible reproducir este audio. Intentando el siguiente…'); void playNext() })

  if (volume && volumeOutput) {
    audio.volume = Number(volume.value)
    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value)
      volumeOutput.value = `${Math.round(audio.volume * 100)}%`
    })
  }

  async function refreshMode() {
    try {
      const response = await fetch(`${api}/content`, { cache: 'no-store' })
      if (!response.ok) return
      const nextLive = (await response.json()).live
      if (!nextLive) return
      const nextMode = modeOf(nextLive)
      live = nextLive
      if (nextMode !== mode) applyMode(nextMode, true)
    } catch { /* Continúa con la última programación disponible. */ }
  }

  paint()
  const polling = window.setInterval(refreshMode, 15000)
  window.addEventListener('pagehide', () => { window.clearInterval(polling); stopFallback() }, { once: true })
}
