import fs from 'node:fs/promises'
import path from 'node:path'
import { commonLabels, dictionaries, languages } from '../src/i18n.js'
import cookieLocales from '../src/cookie-locales.generated.json' with { type: 'json' }

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const base = 'https://firmatotal.chapalab.com'
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const alternates = languages.filter((language) => language.searchAlternate !== false)

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const chapalabUrl = (code, suffix = '') => `https://www.chapalab.com/${code === 'es' ? '' : `${code}/`}${suffix}`

function languageSelector(language, page) {
  const segment = page === 'privacy' ? 'privacidad' : page
  const options = languages.map((item) => {
    const value = page === 'home' ? `${base}/${item.code}/` : `${base}/${item.code}/${segment}/`
    return `<option value="${value}"${item.code === language.code ? ' selected' : ''}>${escapeHtml(item.label)}</option>`
  }).join('')
  return `<label class="language-label"><span class="sr-only">Language</span><select data-language-selector aria-label="Language">${options}</select></label>`
}

function legalHeader(language, page) {
  const dict = dictionaries[language.code]
  const cookies = cookieLocales[language.code]
  return `<header class="site-header"><a class="brand" href="/${language.code}/" aria-label="Firma Total"><span class="brand-firma">firma</span><span>total.</span></a><span class="header-dash" aria-hidden="true">·</span><a class="lab-mark" href="${chapalabUrl(language.code)}"><img src="/chapalab-mark.png" alt="" width="28" height="28"> CHAPALAB.COM</a><nav aria-label="Primary"><a href="/${language.code}/">${escapeHtml(dict.heroCta)}</a>${page !== 'privacy' ? `<a href="/${language.code}/privacidad/">${escapeHtml(dict.privacy)}</a>` : ''}${page !== 'cookies' ? `<a href="/${language.code}/cookies/">${escapeHtml(cookies.footer.cookies)}</a>` : ''}${languageSelector(language, page)}</nav></header>`
}

function legalFooter(language) {
  const dict = dictionaries[language.code]
  const cookies = cookieLocales[language.code]
  return `<footer><div class="manifesto"><span>${escapeHtml(dict.local)}</span><i>·</i><span>${escapeHtml(dict.noAccount)}</span><i>·</i><span>${escapeHtml(dict.pades)}</span></div><div class="footer-bottom"><a class="brand compact" href="/${language.code}/"><span class="brand-firma">firma</span><span>total.</span></a><p>${escapeHtml(dict.footerTagline)}</p><div><a class="footer-lab" href="${chapalabUrl(language.code)}"><img src="/chapalab-mark.png" alt="" width="22" height="22"> CHAPALAB.COM</a><a href="/${language.code}/privacidad/">${escapeHtml(dict.privacy)}</a><a href="/${language.code}/cookies/">${escapeHtml(cookies.footer.cookies)}</a><button type="button" class="footer-cookie-settings" data-cookie-settings>${escapeHtml(cookies.footer.settings)}</button><a href="${chapalabUrl(language.code, 'apoya/')}">☕ ${escapeHtml(commonLabels[language.code].support)}</a><a href="${chapalabUrl(language.code, 'contacto/')}">${escapeHtml(commonLabels[language.code].contact)}</a></div></div></footer>`
}

function privacyMarkup(language) {
  const dict = dictionaries[language.code]
  const copy = cookieLocales[language.code]
  const p = copy.privacy
  return `<div id="root"><div id="top">${legalHeader(language, 'privacy')}<main class="legal-page"><article class="legal-sheet"><p class="eyebrow">${escapeHtml(p.kicker)}</p><h1>${escapeHtml(p.title)}</h1><p class="legal-intro">${escapeHtml(p.intro)}</p><section data-privacy-section="files"><h2>${escapeHtml(p.filesTitle)}</h2><p>${escapeHtml(p.filesBody)} ${escapeHtml(dict.p12Limit)}</p></section><section data-privacy-section="storage"><h2>${escapeHtml(p.storageTitle)}</h2><p>${escapeHtml(p.storageBody)}</p></section><section data-privacy-section="analytics"><h2>${escapeHtml(p.analyticsTitle)}</h2><p>${escapeHtml(p.analyticsBody)}</p></section><section data-privacy-section="advertising"><h2>${escapeHtml(p.advertisingTitle)}</h2><p>${escapeHtml(p.advertisingBody)}</p><a href="/${language.code}/cookies/">${escapeHtml(p.cookiesLink)} →</a></section><section data-privacy-section="autofirma"><h2>${escapeHtml(dict.autoTitle)}</h2><p>${escapeHtml(dict.autoLead)} ${escapeHtml(dict.autoLimit)}</p></section><p class="legal-updated">${escapeHtml(copy.policy.updated)}</p><a class="legal-back" href="/${language.code}/">← ${escapeHtml(p.back)}</a></article></main>${legalFooter(language)}</div></div>`
}

function cookiesMarkup(language) {
  const copy = cookieLocales[language.code]
  const n = copy.notice
  const p = copy.policy
  return `<div id="root"><div id="top">${legalHeader(language, 'cookies')}<main class="legal-page"><article class="legal-sheet"><p class="eyebrow">${escapeHtml(p.kicker)}</p><h1>${escapeHtml(p.title)}</h1><p class="legal-intro">${escapeHtml(p.intro)}</p><section><h2>${escapeHtml(n.essentialTitle)}</h2><p>${escapeHtml(n.essentialBody)}</p></section><section><h2>${escapeHtml(n.analyticsTitle)}</h2><p>${escapeHtml(n.analyticsBody)}</p></section><section><h2>${escapeHtml(n.advertisingTitle)}</h2><p>${escapeHtml(n.advertisingBody)}</p></section><section><h2>${escapeHtml(p.controlTitle)}</h2><p>${escapeHtml(p.controlBody)}</p><button type="button" class="legal-action" data-cookie-settings>${escapeHtml(copy.footer.settings)}</button></section><p class="legal-updated">${escapeHtml(p.updated)}</p><a class="legal-back" href="/${language.code}/">← ${escapeHtml(p.back)}</a></article></main>${legalFooter(language)}</div></div>`
}

function localize(html, language, { page = 'home' } = {}) {
  const dict = dictionaries[language.code]
  const copy = cookieLocales[language.code]
  const isLegal = page !== 'home'
  const segment = page === 'privacy' ? 'privacidad' : page
  const canonical = `${base}/${language.code}/${isLegal ? `${segment}/` : ''}`
  const title = page === 'privacy' ? `${dict.privacy} | Firma Total` : page === 'cookies' ? `${copy.footer.cookies} | Firma Total` : `${dict.heroTitle} | Firma Total`
  const description = page === 'privacy' ? copy.privacy.intro : page === 'cookies' ? copy.policy.intro : dict.heroLead
  const alternateTags = isLegal ? '' : alternates.map((item) => `<link rel="alternate" hreflang="${item.htmlLang}" href="${base}/${item.code}/">`).join('\n')
  const robots = isLegal ? 'noindex,follow' : 'index,follow,max-image-preview:large'
  let output = html
    .replace(/\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+" \/>/g, '')
    .replace(/<html lang="[^"]*"(?: dir="[^"]*")?>/, `<html lang="${language.htmlLang}"${language.direction ? ` dir="${language.direction}"` : ''}>`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`)
    .replace('</head>', `${alternateTags}${isLegal ? '' : `\n<link rel="alternate" hreflang="x-default" href="${base}/">`}\n</head>`)
  if (isLegal) {
    output = output.replace('<div id="root"></div>', page === 'privacy' ? privacyMarkup(language) : cookiesMarkup(language))
    output = output
      .replace(/\s*<script\b(?=[^>]*type="module")(?=[^>]*src="\/assets\/)[^>]*><\/script>/g, '')
      .replace(/\s*<script\b[^>]*src="\/vendor\/autoscript\.js"[^>]*><\/script>/g, '')
  } else {
    output = output.replace('<div id="root"></div>', `<div id="root"><main style="max-width:980px;margin:8vh auto;padding:32px"><p>FIRMA TOTAL</p><h1>${escapeHtml(dict.heroTitle)}</h1><p>${escapeHtml(dict.heroLead)}</p><p>${escapeHtml(dict.local)} · ${escapeHtml(dict.noAccount)} · ${escapeHtml(dict.pades)}</p></main></div>`)
  }
  return output
}

for (const language of languages) {
  for (const page of ['home', 'privacy', 'cookies']) {
    const directory = path.join(dist, language.code, ...(page === 'home' ? [] : [page === 'privacy' ? 'privacidad' : page]))
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(path.join(directory, 'index.html'), localize(template, language, { page }), 'utf8')
  }
}

console.log(`Generated ${languages.length} localized application shells, privacy pages and cookie policies.`)
