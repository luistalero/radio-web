export function initParticipation() {
  const form = document.querySelector('#participation-form')
  const status = document.querySelector('#form-status')
  if (!form || !status) return

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (!form.reportValidity()) return

    const submit = form.querySelector('[type="submit"]')
    submit.disabled = true
    status.textContent = 'Enviando tu historia…'
    status.hidden = false
    try {
      const response = await fetch(`${window.FRECUENCIA_API_URL || '/api'}/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'No fue posible enviar la historia.')
      form.reset()
      status.textContent = '¡Gracias! Recibimos tu historia y pronto la revisaremos.'
    } catch (error) {
      status.textContent = error.message || 'No fue posible enviar la historia. Inténtalo nuevamente.'
    } finally {
      submit.disabled = false
      status.focus({ preventScroll: true })
    }
  })

  form.addEventListener('input', () => {
    status.hidden = true
    status.textContent = ''
  })
}
