export function initCasterPlayer(config = {}) {
  const player = document.querySelector('#caster-player')
  const modal = document.querySelector('#caster-modal')
  const openButton = document.querySelector('#caster-open')
  const closeButton = document.querySelector('#caster-close')
  const publicToken = String(config.publicToken || '').trim()
  if (!player || !modal || !openButton || !publicToken) return

  function loadWidget() {
    if (document.querySelector('script[data-caster-widget]')) return
    const script = document.createElement('script')
    script.src = 'https://cdn.cloud.caster.fm/widgets/embed.js'
    script.async = true
    script.dataset.casterWidget = 'true'
    script.onerror = () => {
      const status = document.querySelector('#player-status')
      if (status) {
        status.textContent = 'No fue posible cargar el reproductor en este momento. Inténtalo de nuevo más tarde.'
        status.hidden = false
      }
    }
    document.head.append(script)
  }

  openButton.addEventListener('click', () => {
    modal.showModal()
    loadWidget()
  })
  closeButton?.addEventListener('click', () => modal.close())
  modal.addEventListener('click', (event) => { if (event.target === modal) modal.close() })
}

export function initAudioPlayer(stream = '') {
  const audio = document.querySelector('#radio-audio')
  const playButton = document.querySelector('#play-toggle')
  const waveform = document.querySelector('#waveform')
  const status = document.querySelector('#player-status')
  const volume = document.querySelector('#radio-volume')
  const volumeOutput = document.querySelector('#volume-output')
  const playLabel = document.querySelector('#play-label')
  const connectionLabel = document.querySelector('#connection-label')
  const playerBadge = document.querySelector('#player-badge')
  const signalState = document.querySelector('#signal-state')

  if (!audio || !playButton || !waveform || !status) return

  const streamUrl = String(stream).trim()
  const bars = document.createDocumentFragment()
  for (let index = 0; index < 48; index += 1) {
    const bar = document.createElement('i')
    const height = 16 + ((index * 17 + index * index * 3) % 28)
    bar.style.setProperty('--bar-height', `${height}%`)
    bar.style.setProperty('--bar-index', String(index))
    bars.append(bar)
  }
  waveform.append(bars)

  let audioContext = null
  let analyser = null
  let animationFrame = 0

  function announce(message) {
    status.textContent = message
    status.hidden = false
  }

  function updatePlaybackState(isPlaying) {
    waveform.classList.toggle('is-playing', isPlaying && !analyser)
    waveform.classList.toggle('is-reactive', isPlaying && Boolean(analyser))
    playButton.setAttribute('aria-label', isPlaying ? 'Pausar transmisión en vivo' : 'Intentar escuchar la transmisión en vivo')
    playButton.querySelector('.play-glyph').textContent = isPlaying ? 'Ⅱ' : '▶'
    playLabel.textContent = isPlaying ? 'Sintonizado' : 'Escucha la señal'
    connectionLabel.textContent = isPlaying ? 'Audio en directo' : streamUrl ? 'Listo para conectar' : 'Conexión de audio pendiente'
  }

  function connectAnalyser() {
    if (!streamUrl || audioContext || !window.AudioContext) return

    try {
      const streamOrigin = new URL(streamUrl, window.location.href).origin
      if (streamOrigin !== window.location.origin) return

      audioContext = new window.AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.82
      const source = audioContext.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    } catch {
      if (audioContext && audioContext.state !== 'closed') void audioContext.close()
      audioContext = null
      analyser = null
    }
  }

  function stopVisualizer() {
    if (animationFrame) cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }

  function animateVisualizer() {
    if (!analyser || audio.paused) return
    const frequencyData = new Uint8Array(analyser.frequencyBinCount)
    const elements = [...waveform.children]

    const draw = () => {
      if (!analyser || audio.paused) {
        stopVisualizer()
        return
      }

      analyser.getByteFrequencyData(frequencyData)
      elements.forEach((bar, index) => {
        const frequencyIndex = Math.min(frequencyData.length - 1, Math.floor((index / elements.length) * frequencyData.length))
        const level = 0.2 + (frequencyData[frequencyIndex] / 255) * 0.8
        bar.style.setProperty('--audio-level', level.toFixed(2))
      })
      animationFrame = requestAnimationFrame(draw)
    }

    stopVisualizer()
    draw()
  }

  playButton.addEventListener('click', async () => {
    if (!streamUrl) {
      announce('La señal todavía no está disponible. Configura una URL real en RADIO_STREAM_URL para habilitar la transmisión.')
      return
    }

    if (!audio.paused) {
      audio.pause()
      return
    }

    audio.src = streamUrl
    connectAnalyser()

    try {
      if (audioContext?.state === 'suspended') await audioContext.resume()
      await audio.play()
      status.hidden = true
      status.textContent = ''
    } catch {
      announce('No fue posible iniciar la transmisión. Comprueba la URL de la señal e inténtalo de nuevo.')
    }
  })

  audio.addEventListener('play', () => {
    updatePlaybackState(true)
    if (analyser) animateVisualizer()
  })
  audio.addEventListener('pause', () => {
    updatePlaybackState(false)
    stopVisualizer()
  })
  audio.addEventListener('ended', () => updatePlaybackState(false))
  audio.addEventListener('error', () => {
    updatePlaybackState(false)
    announce('No fue posible recibir la transmisión. Comprueba la URL configurada.')
  })

  if (volume && volumeOutput) {
    audio.volume = Number(volume.value)
    volumeOutput.value = `${Math.round(Number(volume.value) * 100)}%`
    volume.addEventListener('input', () => {
      audio.volume = Number(volume.value)
      volumeOutput.value = `${Math.round(Number(volume.value) * 100)}%`
    })
  }

  if (streamUrl) {
    playerBadge.textContent = 'LISTO PARA CONECTAR'
    signalState.textContent = 'SEÑAL CONFIGURADA'
    connectionLabel.textContent = 'Listo para conectar'
  }

  updatePlaybackState(false)
  window.addEventListener('pagehide', () => {
    stopVisualizer()
    if (audioContext && audioContext.state !== 'closed') void audioContext.close()
  }, { once: true })
}
