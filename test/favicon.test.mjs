import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const generator = await readFile(new URL('../scripts/generate-seo.mjs', import.meta.url), 'utf8')
const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')

test('Firma Total uses its own favicon on the app and generated SEO pages', () => {
  assert.match(homepage, /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
  assert.match(generator, /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/)
  assert.doesNotMatch(homepage, /rel="icon"[^>]+chapalab-mark/)
  assert.doesNotMatch(generator, /rel="icon"[^>]+chapalab-mark/)
})

test('the Firma Total favicon contains the product nib mark', () => {
  assert.match(favicon, /viewBox="0 0 64 64"/)
  assert.match(favicon, /#7f2138/)
  assert.match(favicon, /#c9a45b/)
})
