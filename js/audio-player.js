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

export function initRadioPlayer(initialLive = {}, { openCasterOnStart = false } = {}) {
  const audio = document.querySelector('#radio-audio')
  const playButton = document.querySelector('#play-toggle')
  const waveform = document.querySelector('#waveform')
  const status = document.querySelector('#player-status')
  const modal = document.querySelector('#caster-modal')
  const closeCaster = document.querySelector('#caster-close')
  const soundCloudPlayer = document.querySelector('#soundcloud-player')
  const volume = document.querySelector('#radio-volume')
  const volumeOutput = document.querySelector('#volume-output')
  if (!audio || !playButton || !waveform || !status) return () => {}

  const ui = {
    badge: document.querySelector('#player-badge'), signal: document.querySelector('#signal-state'), label: document.querySelector('#play-label'),
    connection: document.querySelector('#connection-label'), trackLabel: document.querySelector('#track-label'), title: document.querySelector('#track-title'),
    description: document.querySelector('#track-description'), schedule: document.querySelector('#track-schedule'),
  }
  let live = initialLive
  let mode = modeOf(live)
  let queue = []
  let queueIndex = -1
  let phase = 'opening'
  let currentTrack = null
  let fallbackPlaying = false
  let soundCloudWidget = null

  for (let index = 0; index < 48; index += 1) {
    const bar = document.createElement('i')
    bar.style.setProperty('--bar-height', String(16 + ((index * 17 + index * index * 3) % 28)) + '%')
    bar.style.setProperty('--bar-index', String(index))
    waveform.append(bar)
  }

  const announce = (message) => { status.textContent = message; status.hidden = false }
  const hideStatus = () => { status.hidden = true; status.textContent = '' }
  const tracks = () => (live.fallback?.tracks || []).filter((track) => text(track?.src))
  const validTrack = (track) => track && text(track.src)
  const shuffle = (items) => {
    const copy = [...items]
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swap]] = [copy[swap], copy[index]]
    }
    return copy
  }

  function setPlaying(playing) {
    fallbackPlaying = playing
    waveform.classList.toggle('is-playing', playing)
    playButton.querySelector('.play-glyph').textContent = playing ? 'Ⅱ' : '▶'
    if (mode === 'fallback') {
      playButton.setAttribute('aria-label', playing ? 'Pausar programación grabada' : 'Reanudar programación grabada')
      ui.label.textContent = playing ? 'Programación al aire' : 'Programación pausada'
      ui.connection.textContent = playing ? 'Historias y voces grabadas' : 'Pulsa para continuar'
    }
  }

  function paint() {
    const fallback = mode === 'fallback'
    ui.badge.textContent = fallback ? 'PROGRAMACIÓN GRABADA' : 'EN VIVO'
    ui.signal.textContent = fallback ? 'PROGRAMACIÓN AUTOMÁTICA' : 'SEÑAL EN VIVO'
    ui.trackLabel.textContent = fallback ? (phase === 'opening' ? 'PRESENTACIÓN' : phase === 'interlude' ? 'IDENTIFICACIÓN' : 'AHORA SUENA') : (live.trackLabel || 'TRANSMISIÓN')
    ui.title.textContent = fallback ? (currentTrack?.title || live.fallback?.title || 'Programación grabada') : (live.trackTitle || 'Frecuencia Abierta')
    ui.description.textContent = fallback ? (currentTrack?.artist || live.fallback?.description || 'Historias, voces y música') : (live.trackDescription || 'Radio comunitaria')
    ui.schedule.textContent = fallback ? 'En bucle' : (live.trackSchedule || 'En vivo')
    if (!fallback) {
      waveform.classList.remove('is-playing')
      playButton.querySelector('.play-glyph').textContent = '▶'
      playButton.setAttribute('aria-label', 'Abrir reproductor de la señal en vivo')
      ui.label.textContent = 'Escucha la señal'
      ui.connection.textContent = 'Reproductor oficial de Caster.fm'
    }
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

  function stopFallback() {
    soundCloudWidget?.pause()
    soundCloudWidget = null
    soundCloudPlayer?.replaceChildren()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    currentTrack = null
    setPlaying(false)
  }

  async function playSoundCloud(track) {
    if (!soundCloudPlayer) return announce('No fue posible preparar este audio de SoundCloud.')
    soundCloudWidget?.pause()
    soundCloudPlayer.replaceChildren()
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    const frame = document.createElement('iframe')
    frame.title = track.title || 'Audio de SoundCloud'
    frame.allow = 'autoplay'
    frame.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(track.src) + '&auto_play=true&hide_related=true&show_comments=false&show_reposts=false&show_teaser=false&visual=false'
    soundCloudPlayer.append(frame)
    try {
      const SC = await loadSoundCloudApi()
      soundCloudWidget = SC.Widget(frame)
      await new Promise((resolve) => soundCloudWidget.bind(SC.Widget.Events.READY, resolve))
      soundCloudWidget.bind(SC.Widget.Events.FINISH, () => void playNext())
      soundCloudWidget.bind(SC.Widget.Events.PLAY, () => setPlaying(true))
      soundCloudWidget.bind(SC.Widget.Events.PAUSE, () => setPlaying(false))
      soundCloudWidget.setVolume(Math.round(audio.volume * 100))
      soundCloudWidget.play()
      hideStatus()
    } catch {
      announce('No fue posible reproducir este audio de SoundCloud. Intentando el siguiente…')
      window.setTimeout(() => void playNext(), 800)
    }
  }

  async function playTrack(track) {
    currentTrack = track
    paint()
    if (isSoundCloudUrl(track.src)) return playSoundCloud(track)
    soundCloudWidget?.pause()
    soundCloudWidget = null
    soundCloudPlayer?.replaceChildren()
    audio.src = track.src
    try {
      await audio.play()
      hideStatus()
    } catch { announce('Pulsa reproducir para iniciar la programación grabada.') }
  }

  async function playNext() {
    if (mode !== 'fallback') return
    if (!tracks().length) return announce('Aún no hay audios en la programación grabada. Agrégalos desde el administrador.')
    if (phase === 'opening') {
      phase = 'program'
      if (validTrack(live.fallback?.opening)) return playTrack(live.fallback.opening)
    }
    if (phase === 'interlude') {
      phase = 'program'
      if (validTrack(live.fallback?.interlude)) return playTrack(live.fallback.interlude)
    }
    if (!queue.length || queueIndex >= queue.length - 1) {
      queue = shuffle(tracks())
      queueIndex = -1
    }
    queueIndex += 1
    phase = 'interlude'
    return playTrack(queue[queueIndex])
  }

  async function toggleFallback() {
    if (mode !== 'fallback') return
    if (!currentTrack) return playNext()
    if (soundCloudWidget) return fallbackPlaying ? soundCloudWidget.pause() : soundCloudWidget.play()
    if (audio.paused) {
      try { await audio.play(); hideStatus() } catch { announce('Pulsa reproducir para iniciar la programación grabada.') }
    } else audio.pause()
  }

  function openCaster() {
    stopFallback()
    if (!modal || !text(live.caster?.publicToken)) return announce('El reproductor en vivo aún no está configurado.')
    if (!modal.open) modal.showModal()
    loadCasterWidget()
  }

  function applyMode(nextMode) {
    mode = nextMode
    stopFallback()
    if (mode === 'fallback') { phase = 'opening'; queue = []; queueIndex = -1; if (modal?.open) modal.close() }
    paint()
  }

  const onPlayClick = () => { if (mode === 'caster') openCaster(); else void toggleFallback() }
  const onCloseCaster = () => modal.close()
  const onModalClick = (event) => { if (event.target === modal) modal.close() }
  const onAudioPlay = () => setPlaying(true)
  const onAudioPause = () => setPlaying(false)
  const onAudioEnded = () => void playNext()
  const onAudioError = () => { if (audio.src) { announce('No fue posible reproducir este audio. Intentando el siguiente…'); void playNext() } }
  const onVolume = () => {
    audio.volume = Number(volume.value)
    soundCloudWidget?.setVolume(Math.round(audio.volume * 100))
    volumeOutput.value = String(Math.round(audio.volume * 100)) + '%'
  }
  playButton.addEventListener('click', onPlayClick)
  closeCaster?.addEventListener('click', onCloseCaster)
  modal?.addEventListener('click', onModalClick)
  audio.addEventListener('play', onAudioPlay)
  audio.addEventListener('pause', onAudioPause)
  audio.addEventListener('ended', onAudioEnded)
  audio.addEventListener('error', onAudioError)
  if (volume && volumeOutput) { audio.volume = Number(volume.value); volume.addEventListener('input', onVolume) }

  paint()
  if (openCasterOnStart && mode === 'caster') openCaster()

  return () => {
    playButton.removeEventListener('click', onPlayClick)
    closeCaster?.removeEventListener('click', onCloseCaster)
    modal?.removeEventListener('click', onModalClick)
    audio.removeEventListener('play', onAudioPlay)
    audio.removeEventListener('pause', onAudioPause)
    audio.removeEventListener('ended', onAudioEnded)
    audio.removeEventListener('error', onAudioError)
    volume?.removeEventListener('input', onVolume)
    stopFallback()
  }
}
