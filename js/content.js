const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]))

function renderPrograms(programs) {
  const list = document.querySelector('#program-list')
  if (!list || !Array.isArray(programs)) return

  list.innerHTML = programs.map((program, index) => {
    const id = `program-detail-${index + 1}`
    return `<article class="tilt-card program-row" data-program-row>
      <div class="program-art" aria-hidden="true"><span class="program-art-orbit orbit-one"></span><span class="program-art-orbit orbit-two"></span><span class="program-art-mark">${escapeHtml(program.mark)}</span><span class="program-art-index">${escapeHtml(program.number)}</span></div>
      <div class="program-info"><span class="program-category">${escapeHtml(program.category)}</span><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.description)}</p><p class="program-detail" id="${id}" hidden>${escapeHtml(program.detail)}</p></div>
      <button class="program-more" type="button" aria-expanded="false" aria-controls="${id}"><span class="program-more-label">Conocer más</span><span class="program-more-arrow" aria-hidden="true">↘</span></button>
    </article>`
  }).join('')
}

function setText(selector, value) {
  const element = document.querySelector(selector)
  if (element && value) element.textContent = value
}

export async function initContent() {
  try {
    const baseUrl = window.FRECUENCIA_API_URL || './data'
    const response = await fetch(`${baseUrl}/content`, { cache: 'no-cache' })
    if (!response.ok) throw new Error('No fue posible cargar el contenido')
    const content = await response.json()
    setText('#hero-location', content.hero?.location)
    setText('#hero-title-text', content.hero?.title)
    setText('#hero-subtitle', content.hero?.subtitle)
    setText('#hero-description', content.hero?.description)
    renderPrograms(content.programs)
    setText('#credits-author', content.credits?.author)
    setText('#credits-role', content.credits?.role)
    setText('#credits-email', content.credits?.email)
    const email = document.querySelector('#credits-email')
    if (email && content.credits?.email) email.href = `mailto:${content.credits.email}`
    setText('#credits-institution', content.credits?.institution)
    setText('#credits-course', content.credits?.course)
    setText('#credits-school', content.credits?.school)
    setText('#credits-location-year', content.credits?.locationYear)
  } catch (error) {
    console.warn('Se está mostrando el contenido de respaldo.', error)
  }
}
