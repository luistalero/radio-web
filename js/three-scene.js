const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js'
const ringColors = ['#ADE1FF', '#8BBDE6', '#669DD3', '#3E7BB3', '#ADE1FF', '#8BBDE6']

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const supported = Boolean(context)
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return supported
  } catch {
    return false
  }
}

function createShell(THREE, density) {
  const latitudeCount = density < 0.6 ? 15 : 25
  const longitudeCount = density < 0.6 ? 28 : 46
  const positions = new Float32Array((latitudeCount - 1) * longitudeCount * 3)
  let offset = 0

  for (let latitude = 1; latitude < latitudeCount; latitude += 1) {
    const polar = (latitude / latitudeCount) * Math.PI
    for (let longitude = 0; longitude < longitudeCount; longitude += 1) {
      const azimuth = (longitude / longitudeCount) * Math.PI * 2
      positions[offset] = Math.sin(polar) * Math.cos(azimuth)
      positions[offset + 1] = Math.cos(polar)
      positions[offset + 2] = Math.sin(polar) * Math.sin(azimuth)
      offset += 3
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.userData.basePositions = positions.slice()

  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#ADE1FF',
    size: density < 0.6 ? 0.025 : 0.017,
    transparent: true,
    opacity: 0.86,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
  return points
}

function createDust(THREE, density) {
  const count = density < 0.6 ? 52 : 132
  const positions = new Float32Array(count * 3)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))

  for (let index = 0; index < count; index += 1) {
    const y = 1 - (2 * (index + 0.5)) / count
    const radius = Math.sqrt(1 - y * y)
    const angle = index * goldenAngle
    const distance = 1.48 + (index % 9) * 0.055
    positions[index * 3] = Math.cos(angle) * radius * distance
    positions[index * 3 + 1] = y * distance
    positions[index * 3 + 2] = Math.sin(angle) * radius * distance
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: '#8BBDE6',
    size: 0.014,
    transparent: true,
    opacity: 0.56,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }))
}

function buildScene(THREE, container) {
  const compact = window.matchMedia('(max-width: 760px)').matches
  const density = compact ? 0.42 : 1
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
  camera.position.set(0, 0, 5.7)

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.35))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.domElement.setAttribute('aria-hidden', 'true')
  renderer.domElement.setAttribute('role', 'presentation')
  container.append(renderer.domElement)
  container.classList.add('has-webgl')

  scene.add(new THREE.AmbientLight('#8BBDE6', 1.1))
  const keyLight = new THREE.PointLight('#ADE1FF', 7)
  keyLight.position.set(3, 2, 4)
  scene.add(keyLight)
  const fillLight = new THREE.PointLight('#3E7BB3', 4)
  fillLight.position.set(-3, -2, 1)
  scene.add(fillLight)

  const orb = new THREE.Group()
  scene.add(orb)

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.72, 3),
    new THREE.MeshPhysicalMaterial({ color: '#194F7F', roughness: 0.28, metalness: 0.38, clearcoat: 1, clearcoatRoughness: 0.18, transparent: true, opacity: 0.72 }),
  )
  orb.add(core)
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.52, 2),
    new THREE.MeshBasicMaterial({ color: '#669DD3', transparent: true, opacity: 0.28, wireframe: true }),
  )
  orb.add(wire)

  const shell = createShell(THREE, density)
  orb.add(shell)

  ringColors.forEach((color, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.18 + index * 0.105, 0.008 + (index % 2) * 0.003, 5, 96),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.33 - index * 0.025 }),
    )
    ring.rotation.set(index * 0.41, index * 0.29, index * 0.22)
    orb.add(ring)
  })

  const pulseRings = [0, 1, 2].map((index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.62, 0.006, 4, 96),
      new THREE.MeshBasicMaterial({ color: ringColors[index + 1], transparent: true, opacity: 0.14, depthWrite: false }),
    )
    ring.rotation.set(index * 0.7, index * 0.42, index * 0.2)
    orb.add(ring)
    return ring
  })

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshBasicMaterial({ color: '#ADE1FF' }))
  beacon.position.set(0, 0, 0.86)
  orb.add(beacon)

  const dust = new THREE.Group()
  dust.add(createDust(THREE, density))
  scene.add(dust)

  let frame = 0
  let animationFrame = 0
  let isVisible = true
  let destroyed = false
  let pointerX = 0
  let pointerY = 0
  let targetX = 0
  let targetY = 0
  const clock = new THREE.Clock()

  function resize() {
    if (!container.clientWidth || !container.clientHeight) return
    renderer.setSize(container.clientWidth, container.clientHeight, false)
    camera.aspect = container.clientWidth / container.clientHeight
    camera.updateProjectionMatrix()
  }

  function schedule() {
    if (!animationFrame && isVisible && document.visibilityState === 'visible' && !destroyed) {
      animationFrame = requestAnimationFrame(render)
    }
  }

  function render() {
    animationFrame = 0
    if (!isVisible || document.visibilityState !== 'visible' || destroyed) return

    const delta = Math.min(clock.getDelta(), 0.04)
    const elapsed = clock.elapsedTime
    pointerX += (targetX - pointerX) * 0.045
    pointerY += (targetY - pointerY) * 0.045
    orb.rotation.x += (Math.sin(elapsed * 0.24) * 0.09 - pointerY * 0.0015 - orb.rotation.x) * Math.min(1, delta * 2.5)
    orb.rotation.y += delta * 0.095 + pointerX * 0.00018
    dust.rotation.y += delta * 0.018
    dust.rotation.x = Math.sin(elapsed * 0.18) * 0.035

    const attribute = shell.geometry.getAttribute('position')
    const livePositions = attribute.array
    const basePositions = shell.geometry.userData.basePositions
    for (let index = 0; index < basePositions.length; index += 3) {
      const x = basePositions[index]
      const y = basePositions[index + 1]
      const z = basePositions[index + 2]
      const wave = Math.sin((x * 4.2 + y * 2.7 + z * 3.8) * 5.8 - elapsed * 2.4)
      const radius = 0.88 + wave * 0.035
      livePositions[index] = x * radius
      livePositions[index + 1] = y * radius
      livePositions[index + 2] = z * radius
    }
    attribute.needsUpdate = true

    pulseRings.forEach((ring, index) => {
      const phase = (elapsed * 0.19 + index / 3) % 1
      ring.scale.setScalar(0.82 + phase * 0.42)
      ring.material.opacity = (1 - phase) * 0.17
    })

    renderer.render(scene, camera)
    schedule()
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(container)
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting
    if (isVisible) schedule()
    else if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }
  }, { threshold: 0.02 })
  visibilityObserver.observe(container)

  const pointerTarget = container.closest('.hero-section') || container
  const onPointerMove = (event) => {
    if (event.pointerType !== 'mouse') return
    const bounds = container.getBoundingClientRect()
    targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 16
    targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12
  }
  const resetPointer = () => { targetX = 0; targetY = 0 }
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
    } else {
      schedule()
    }
  }
  const onContextLost = (event) => {
    event.preventDefault()
    container.classList.remove('has-webgl')
    renderer.domElement.remove()
    destroyed = true
    if (animationFrame) cancelAnimationFrame(animationFrame)
  }

  pointerTarget.addEventListener('pointermove', onPointerMove)
  pointerTarget.addEventListener('pointerleave', resetPointer)
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', () => {
    destroyed = true
    resizeObserver.disconnect()
    visibilityObserver.disconnect()
    pointerTarget.removeEventListener('pointermove', onPointerMove)
    pointerTarget.removeEventListener('pointerleave', resetPointer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (animationFrame) cancelAnimationFrame(animationFrame)
    renderer.dispose()
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach((material) => material.dispose())
      }
    })
  }, { once: true })

  resize()
  schedule()
}

export function initThreeScene() {
  const container = document.querySelector('#hero-orb')
  if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !supportsWebGL()) return
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return

  import(THREE_MODULE_URL)
    .then((THREE) => {
      if (container.isConnected && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) buildScene(THREE, container)
    })
    .catch(() => {
      container.classList.remove('has-webgl')
    })
}
