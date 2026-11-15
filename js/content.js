const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character]))

function renderPrograms(programs) {
  const list = document.querySelector('#program-list')
  if (!list || !Array.isArray(programs)) return

  list.innerHTML = programs.map((program, index) => {
    const id = `program-detail-${index + 1}`
    return `<article class="tilt-card program-row" data-program-row>
      <div class="program-art" aria-hidden="true"><img class="program-art-logo" src="./assets/icons/light_logo.jpeg" alt=""><span class="program-art-index">${escapeHtml(program.number)}</span></div>
      <div class="program-info"><span class="program-category">${escapeHtml(program.category)}</span><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.description)}</p><p class="program-detail" id="${id}" hidden>${escapeHtml(program.detail)}</p></div>
      <button class="program-more" type="button" aria-expanded="false" aria-controls="${id}"><span class="program-more-label">Conocer más</span><span class="program-more-arrow" aria-hidden="true">↘</span></button>
    </article>`
  }).join('')
}

function renderArchive(archive) {
  const list = document.querySelector('#archive-list')
  if (!list || !archive || !Array.isArray(archive.items)) return

  const heading = document.querySelector('#scripts-title')
  if (heading && archive.title) {
    heading.replaceChildren(document.createTextNode(archive.title))
    if (archive.subtitle) {
      const lineBreak = document.createElement('br')
      const emphasis = document.createElement('em')
      emphasis.textContent = archive.subtitle
      heading.append(lineBreak, emphasis)
    }
  }
  setText('#archive-description', archive.description)
  setText('#archive-index-count', archive.indexCount)
  setText('#archive-index-label', archive.indexLabel)
  list.innerHTML = archive.items.map((item, index) => {
    const paragraphs = String(item.body ?? '').split(/\n\s*\n/).filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')
    return `<details class="script-item"><summary><span class="script-number">${escapeHtml(item.number || String(index + 1).padStart(2, '0'))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.category)}</small></span><i aria-hidden="true">+</i></summary><div class="script-content">${paragraphs}</div></details>`
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
    renderArchive(content.archive)
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
