import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8')
const entryPath = html.match(/<script type="module"[^>]+src="([^"]+)"/)?.[1]
assert.ok(entryPath, 'Production HTML must reference its module entry')
const entry = await stat(resolve(root, 'dist', entryPath.replace(/^\//, '')))

assert.ok(entry.size <= 350_000, `Firma Total initial JS is ${entry.size} bytes; budget is 350000`)
assert.doesNotMatch(html, /pdf\.worker|pdf-runtime|pdf-tools|pades|autofirma-/)

console.log(JSON.stringify({
  app: 'Firma Total',
  initialJavaScriptBytes: entry.size,
  budgetBytes: 350_000,
  initialFiles: [entryPath],
}))
