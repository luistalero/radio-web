export function initParticipation() {
  const form = document.querySelector('#participation-form')
  const status = document.querySelector('#form-status')
  if (!form || !status) return

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!form.reportValidity()) return

    status.textContent = 'Tu propuesta está validada, pero todavía no se envió. Este formulario no está conectado a un servicio de recepción.'
    status.hidden = false
    status.focus({ preventScroll: true })
  })

  form.addEventListener('input', () => {
    status.hidden = true
    status.textContent = ''
  })
}
