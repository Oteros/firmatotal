import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const token = 'cc411a2668544626a4163e11fad154e1'
const snippet = `  <!-- Cloudflare Web Analytics -->\n  <script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}"}'></script>\n  <!-- End Cloudflare Web Analytics -->`
const dist = fileURLToPath(new URL('../dist/', import.meta.url))

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return htmlFiles(target)
    return entry.isFile() && entry.name.endsWith('.html') ? [target] : []
  }))
  return nested.flat()
}

const files = await htmlFiles(dist)
if (files.length === 0) throw new Error('No HTML files found in dist')

let inserted = 0
for (const file of files) {
  let html = await readFile(file, 'utf8')
  if (html.includes(token)) continue
  if (!/<\/head>/i.test(html)) throw new Error(`Missing </head> in ${file}`)
  html = html.replace(/<\/head>/i, `${snippet}\n</head>`)
  await writeFile(file, html)
  inserted += 1
}

console.log(`Cloudflare Web Analytics: ${inserted} inserted, ${files.length - inserted} already present`)
