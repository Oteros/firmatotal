import fs from 'node:fs/promises'
import path from 'node:path'
import { commonLabels, dictionaries, languages } from '../src/i18n.js'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
const base = 'https://firmatotal.chapalab.com'
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const alternates = languages.filter((language) => language.searchAlternate !== false)

const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char])

function localize(html, language, { privacy = false } = {}) {
  const dict = dictionaries[language.code]
  const canonical = `${base}/${language.code}/${privacy ? 'privacidad/' : ''}`
  const title = privacy ? `${dict.privacy} | Firma Total` : `${dict.heroTitle} | Firma Total`
  const description = privacy ? `${dict.privateNote} ${dict.p12Limit}` : dict.heroLead
  const alternateTags = privacy ? '' : alternates.map((item) => `<link rel="alternate" hreflang="${item.htmlLang}" href="${base}/${item.code}/">`).join('\n')
  const robots = privacy ? 'noindex,follow' : 'index,follow,max-image-preview:large'
  let output = html
    .replace(/<html lang="[^"]*"(?: dir="[^"]*")?>/, `<html lang="${language.htmlLang}"${language.direction ? ` dir="${language.direction}"` : ''}>`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace('</head>', `${alternateTags}${privacy ? '' : `\n<link rel="alternate" hreflang="x-default" href="${base}/">`}\n</head>`)
  if (privacy) {
    output = output.replace('<div id="root"></div>', `<div id="root"><main style="max-width:850px;margin:8vh auto;padding:32px"><p>FIRMA TOTAL</p><h1>${escapeHtml(dict.privacy)}</h1><p>${escapeHtml(description)}</p><p>${escapeHtml(dict.local)} · ${escapeHtml(dict.noAccount)}</p><p><a href="/${language.code}/">${escapeHtml(dict.heroCta)}</a> · <a href="https://www.chapalab.com/${language.code}/contacto/">${escapeHtml(commonLabels[language.code].contact)}</a></p></main></div>`)
    output = output.replace(/<script[^>]+src="[^"]*"[^>]*><\/script>/g, '')
  } else {
    output = output.replace('<div id="root"></div>', `<div id="root"><main style="max-width:980px;margin:8vh auto;padding:32px"><p>FIRMA TOTAL</p><h1>${escapeHtml(dict.heroTitle)}</h1><p>${escapeHtml(dict.heroLead)}</p><p>${escapeHtml(dict.local)} · ${escapeHtml(dict.noAccount)} · ${escapeHtml(dict.pades)}</p></main></div>`)
  }
  return output
}

for (const language of languages) {
  for (const privacy of [false, true]) {
    const directory = path.join(dist, language.code, ...(privacy ? ['privacidad'] : []))
    await fs.mkdir(directory, { recursive: true })
    await fs.writeFile(path.join(directory, 'index.html'), localize(template, language, { privacy }), 'utf8')
  }
}

console.log(`Generated ${languages.length} localized application shells and privacy pages.`)
