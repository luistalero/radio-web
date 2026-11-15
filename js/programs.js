export function initPrograms() {
  const rows = [...document.querySelectorAll('[data-program-row]')]
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const gsap = window.gsap

  function closeRow(row) {
    const button = row.querySelector('.program-more')
    if (!button) return
    const detail = document.getElementById(button.getAttribute('aria-controls'))
    if (!detail || button.getAttribute('aria-expanded') !== 'true') return

    if (gsap) gsap.killTweensOf(detail)
    button.setAttribute('aria-expanded', 'false')
    button.querySelector('.program-more-label').textContent = 'Conocer más'
    row.classList.remove('is-expanded')

    if (!reducedMotion && gsap) {
      gsap.to(detail, {
        height: 0,
        autoAlpha: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          detail.hidden = true
          gsap.set(detail, { clearProps: 'height,opacity,visibility' })
        },
      })
    } else {
      detail.hidden = true
    }
  }

  rows.forEach((row) => {
    const button = row.querySelector('.program-more')
    if (!button) return
    const detail = document.getElementById(button.getAttribute('aria-controls'))
    if (!detail) return

    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true'
      rows.forEach((otherRow) => closeRow(otherRow))
      if (isOpen) return

      if (gsap) gsap.killTweensOf(detail)
      button.setAttribute('aria-expanded', 'true')
      button.querySelector('.program-more-label').textContent = 'Cerrar'
      row.classList.add('is-expanded')
      detail.hidden = false

      if (!reducedMotion && gsap) {
        gsap.fromTo(detail, { height: 0, autoAlpha: 0, y: -4 }, {
          height: 'auto',
          autoAlpha: 1,
          y: 0,
          duration: 0.26,
          ease: 'power2.out',
          onComplete: () => gsap.set(detail, { clearProps: 'height,opacity,visibility,transform' }),
        })
      }
    })
  })
}
