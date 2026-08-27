import { readFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const outputDir = resolve(process.argv[2] || 'dist')
const errors = []
const warnings = []

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

function absoluteHttps(value, label) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') errors.push(`${label} must use HTTPS: ${value}`)
    if (url.hash || url.search) errors.push(`${label} must not contain a query or fragment: ${value}`)
  } catch {
    errors.push(`${label} is not an absolute URL: ${value}`)
  }
}

const sitemapPath = join(outputDir, 'sitemap.xml')
const robotsPath = join(outputDir, 'robots.txt')
const [sitemap, robots, headers, redirects, notFound] = await Promise.all([
  readFile(sitemapPath, 'utf8').catch(() => ''),
  readFile(robotsPath, 'utf8').catch(() => ''),
  readFile(join(outputDir, '_headers'), 'utf8').catch(() => ''),
  readFile(join(outputDir, '_redirects'), 'utf8').catch(() => ''),
  readFile(join(outputDir, '404.html'), 'utf8').catch(() => ''),
])

if (!sitemap) errors.push(`Missing or empty sitemap: ${sitemapPath}`)
if (!robots) errors.push(`Missing or empty robots.txt: ${robotsPath}`)
if (!headers) errors.push('Missing or empty _headers')
if (!redirects) errors.push('Missing or empty _redirects')
if (!notFound) errors.push('Missing 404.html')

const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1])
if (!sitemapUrls.length) errors.push('Sitemap has no <loc> entries')
if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push('Sitemap contains duplicate URLs')
for (const url of sitemapUrls) absoluteHttps(url, 'Sitemap URL')
if (sitemapUrls.length !== 80) errors.push(`Expected 80 canonical sitemap URLs, found ${sitemapUrls.length}`)
if (sitemapUrls.some((url) => new URL(url).pathname.startsWith('/bar/'))) errors.push('Bavarian noindex routes must be absent from sitemap')
if (sitemapUrls.includes('https://firmatotal.chapalab.com/es/')) errors.push('Duplicate Spanish home must be absent from sitemap')
if (/<lastmod>|<changefreq>|<priority>/i.test(sitemap)) errors.push('Sitemap contains synthetic lastmod, changefreq or priority metadata')
const sitemapAlternates = [...sitemap.matchAll(/<xhtml:link\b[^>]*hreflang=["']([^"']+)["']/gi)].map((match) => match[1].toLowerCase())
if (sitemapAlternates.length !== 1680) errors.push(`Expected 1680 sitemap alternate links, found ${sitemapAlternates.length}`)
if (sitemapAlternates.includes('bar')) errors.push('Bavarian must not be emitted as hreflang')

if (robots) {
  if (!/^User-agent:\s*\*$/im.test(robots)) errors.push('robots.txt has no default user-agent block')
  if (!/^Allow:\s*\/\s*$/im.test(robots)) errors.push('robots.txt does not explicitly allow the public site')
  if (/^Disallow:\s*\/\s*$/im.test(robots)) errors.push('robots.txt blocks the complete site')
  const sitemapDirective = robots.match(/^Sitemap:\s*(\S+)\s*$/im)?.[1]
  if (!sitemapDirective) errors.push('robots.txt has no Sitemap directive')
  else absoluteHttps(sitemapDirective, 'robots.txt Sitemap')
}

for (const aliasRule of ['https://firmatotal.pages.dev/*', 'https://:version.firmatotal.pages.dev/*']) {
  if (!headers.includes(aliasRule)) errors.push(`_headers is missing Pages alias protection: ${aliasRule}`)
}
if (!/^\/es\s+\/\s+301$/m.test(redirects) || !/^\/es\/\s+\/\s+301$/m.test(redirects)) errors.push('Missing permanent consolidation redirects from /es to /')
if (!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(notFound)) errors.push('404.html must be noindex')
if (!/<title>[^<]*(?:404|no encontrada)[^<]*<\/title>/i.test(notFound)) errors.push('404.html has no explicit not-found title')

const files = await walk(outputDir)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
if (!htmlFiles.length) errors.push(`No HTML files found in ${outputDir}`)
if (htmlFiles.length !== 127) errors.push(`Expected 127 HTML documents, found ${htmlFiles.length}`)

let hreflangFiles = 0
let indexableFiles = 0
let noindexFiles = 0
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8')
  const canonicalMatches = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  const noindex = /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(html)
  if (noindex) noindexFiles += 1
  else indexableFiles += 1

  if (canonicalMatches.length !== 1) {
    errors.push(`${file}: expected exactly one canonical, found ${canonicalMatches.length}`)
  } else {
    const canonical = canonicalMatches[0][1]
    absoluteHttps(canonical, `${file} canonical`)
    if (!noindex && sitemapUrls.length && !sitemapUrls.includes(canonical)) {
      errors.push(`${file}: indexable canonical is absent from sitemap: ${canonical}`)
    }
    if (noindex && sitemapUrls.includes(canonical)) errors.push(`${file}: noindex canonical is present in sitemap: ${canonical}`)
    if (new URL(canonical).pathname.startsWith('/bar/') && !noindex) errors.push(`${file}: Bavarian page must be noindex`)
  }

  const alternates = [...html.matchAll(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  if (noindex && alternates.length) errors.push(`${file}: noindex page must not emit hreflang`)
  if (!noindex && alternates.length !== 21) errors.push(`${file}: expected 21 alternate links, found ${alternates.length}`)
  if (alternates.length) {
    hreflangFiles += 1
    const languages = alternates.map((match) => match[1].toLowerCase())
    if (new Set(languages).size !== languages.length) errors.push(`${file}: duplicate hreflang values`)
    if (!languages.includes('x-default')) errors.push(`${file}: hreflang set has no x-default`)
    if (languages.includes('bar')) errors.push(`${file}: bar must not be emitted as hreflang`)
    const canonical = canonicalMatches[0]?.[1]
    if (canonical && !alternates.some((match) => match[2] === canonical)) errors.push(`${file}: hreflang set has no canonical self-reference`)
    for (const [, language, url] of alternates) {
      if (!/^(x-default|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/i.test(language)) {
        errors.push(`${file}: invalid hreflang value: ${language}`)
      }
      absoluteHttps(url, `${file} hreflang`)
      if (!sitemapUrls.includes(url)) errors.push(`${file}: hreflang target is absent from sitemap: ${url}`)
    }
  }
}

if (indexableFiles !== 80) errors.push(`Expected 80 indexable HTML documents, found ${indexableFiles}`)
if (noindexFiles !== 47) errors.push(`Expected 47 noindex HTML documents, found ${noindexFiles}`)
if (hreflangFiles !== 80) errors.push(`Expected 80 reciprocal hreflang sets, found ${hreflangFiles}`)

for (const warning of warnings) console.warn(`WARN: ${warning}`)
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`)
  process.exitCode = 1
} else {
  console.log(`Validated ${htmlFiles.length} HTML files, ${sitemapUrls.length} canonical sitemap URLs, ${hreflangFiles} hreflang sets and ${noindexFiles} noindex pages in ${outputDir}`)
}
