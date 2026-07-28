import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8')
const runtime = await readFile(new URL('../src/lib/pdf-runtime.js', import.meta.url), 'utf8')

test('Firma Total defers PDF rendering, visual signing, certificates and AutoFirma', () => {
  assert.doesNotMatch(app, /^import .*pdfjs-dist/m)
  assert.doesNotMatch(app, /^import .*pdf-tools/m)
  assert.doesNotMatch(app, /^import .*autofirma/m)
  assert.match(app, /import\("\.\/lib\/pdf-runtime\.js"\)/)
  assert.match(app, /import\("\.\/lib\/pdf-tools\.js"\)/)
  assert.match(app, /import\("\.\/lib\/pades\.js"\)/)
  assert.match(app, /import\("\.\/lib\/autofirma\.js"\)/)
  assert.match(runtime, /from "pdfjs-dist"/)
  assert.doesNotMatch(main, /from "buffer"/)
})
