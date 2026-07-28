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
const sitemap = await readFile(sitemapPath, 'utf8').catch(() => '')
const robots = await readFile(robotsPath, 'utf8').catch(() => '')

if (!sitemap) errors.push(`Missing or empty sitemap: ${sitemapPath}`)
if (!robots) errors.push(`Missing or empty robots.txt: ${robotsPath}`)

const sitemapUrls = [...sitemap.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => match[1])
if (!sitemapUrls.length) errors.push('Sitemap has no <loc> entries')
if (new Set(sitemapUrls).size !== sitemapUrls.length) errors.push('Sitemap contains duplicate URLs')
for (const url of sitemapUrls) absoluteHttps(url, 'Sitemap URL')

if (robots) {
  if (!/^User-agent:\s*\*$/im.test(robots)) errors.push('robots.txt has no default user-agent block')
  if (!/^Allow:\s*\/\s*$/im.test(robots)) errors.push('robots.txt does not explicitly allow the public site')
  if (/^Disallow:\s*\/\s*$/im.test(robots)) errors.push('robots.txt blocks the complete site')
  const sitemapDirective = robots.match(/^Sitemap:\s*(\S+)\s*$/im)?.[1]
  if (!sitemapDirective) errors.push('robots.txt has no Sitemap directive')
  else absoluteHttps(sitemapDirective, 'robots.txt Sitemap')
}

const files = await walk(outputDir)
const htmlFiles = files.filter((file) => file.endsWith('.html'))
if (!htmlFiles.length) errors.push(`No HTML files found in ${outputDir}`)

let hreflangFiles = 0
for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8')
  const canonicalMatches = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  const noindex = /<meta\b[^>]*\bname=["']robots["'][^>]*\bcontent=["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(html)

  if (canonicalMatches.length !== 1) {
    errors.push(`${file}: expected exactly one canonical, found ${canonicalMatches.length}`)
  } else {
    const canonical = canonicalMatches[0][1]
    absoluteHttps(canonical, `${file} canonical`)
    if (!noindex && sitemapUrls.length && !sitemapUrls.includes(canonical)) {
      errors.push(`${file}: indexable canonical is absent from sitemap: ${canonical}`)
    }
  }

  const alternates = [...html.matchAll(/<link\b[^>]*\brel=["']alternate["'][^>]*\bhreflang=["']([^"']+)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  if (alternates.length) {
    hreflangFiles += 1
    const languages = alternates.map((match) => match[1].toLowerCase())
    if (new Set(languages).size !== languages.length) errors.push(`${file}: duplicate hreflang values`)
    if (!languages.includes('x-default')) errors.push(`${file}: hreflang set has no x-default`)
    for (const [, language, url] of alternates) {
      if (!/^(x-default|[a-z]{2,3}(?:-[a-z0-9]{2,8})*)$/i.test(language)) {
        errors.push(`${file}: invalid hreflang value: ${language}`)
      }
      absoluteHttps(url, `${file} hreflang`)
    }
  }
}

if (!hreflangFiles) warnings.push('No hreflang sets found; skipped multilingual reciprocity checks')

for (const warning of warnings) console.warn(`WARN: ${warning}`)
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`)
  process.exitCode = 1
} else {
  console.log(`Validated ${htmlFiles.length} HTML files, ${sitemapUrls.length} sitemap URLs and ${hreflangFiles} hreflang sets in ${outputDir}`)
}
