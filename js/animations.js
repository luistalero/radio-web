export function initAnimations() {
  const gsap = window.gsap
  const ScrollTrigger = window.ScrollTrigger
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!gsap || !ScrollTrigger || reduceMotion) return

  gsap.registerPlugin(ScrollTrigger)

  const entrance = gsap.timeline({ defaults: { ease: 'power3.out' } })
  entrance
    .fromTo('.hero-eyebrow', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.68, delay: 0.1 })
    .fromTo('.hero-copy h1', { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.84 }, '-=0.42')
    .fromTo('.hero-description', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.68 }, '-=0.47')
    .fromTo('.hero-actions', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.58 }, '-=0.36')

  gsap.utils.toArray('.reveal').forEach((element) => {
    gsap.fromTo(element, { autoAlpha: 0, y: 26, scale: 0.99 }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.72,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 86%', once: true },
    })
  })

  gsap.to('.hero-parallax', {
    yPercent: 3,
    scale: 1.06,
    ease: 'none',
    scrollTrigger: { trigger: '.hero-section', start: 'top top', end: 'bottom top', scrub: 0.7 },
  })

  const canTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!canTilt) return

  gsap.utils.toArray('.tilt-card').forEach((card) => {
    const rotateX = gsap.quickTo(card, 'rotationX', { duration: 0.32, ease: 'power3.out' })
    const rotateY = gsap.quickTo(card, 'rotationY', { duration: 0.32, ease: 'power3.out' })
    const lift = gsap.quickTo(card, 'y', { duration: 0.32, ease: 'power3.out' })

    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return
      const bounds = card.getBoundingClientRect()
      const x = (event.clientX - bounds.left) / bounds.width
      const y = (event.clientY - bounds.top) / bounds.height
      rotateX((0.5 - y) * 4.5)
      rotateY((x - 0.5) * 4.5)
      lift(-3)
      card.style.setProperty('--shine-x', `${x * 100}%`)
      card.style.setProperty('--shine-y', `${y * 100}%`)
    })

    card.addEventListener('pointerleave', () => {
      rotateX(0)
      rotateY(0)
      lift(0)
      card.style.setProperty('--shine-x', '50%')
      card.style.setProperty('--shine-y', '50%')
    })
  })
}
