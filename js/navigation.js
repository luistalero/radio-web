export function initNavigation() {
  const header = document.querySelector('.site-header')
  const toggle = document.querySelector('#menu-toggle')
  const navigation = document.querySelector('#primary-navigation')

  if (!header || !toggle || !navigation) return

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.setAttribute('aria-label', 'Abrir menú')
    toggle.classList.remove('menu-open')
    navigation.classList.remove('is-open')
  }

  toggle.addEventListener('click', () => {
    const willOpen = toggle.getAttribute('aria-expanded') !== 'true'
    toggle.setAttribute('aria-expanded', String(willOpen))
    toggle.setAttribute('aria-label', willOpen ? 'Cerrar menú' : 'Abrir menú')
    toggle.classList.toggle('menu-open', willOpen)
    navigation.classList.toggle('is-open', willOpen)
  })

  navigation.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu()
  })

  document.addEventListener('click', (event) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(event.target)) closeMenu()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
  })

  window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu)
}
