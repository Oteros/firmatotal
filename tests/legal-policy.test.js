import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const privacy = await readFile(new URL('../public/privacidad/index.html', import.meta.url), 'utf8')
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
const redirects = await readFile(new URL('../public/_redirects', import.meta.url), 'utf8')

test('Firma Total publishes its complete local privacy contract', () => {
  assert.match(privacy, /rel="canonical" href="https:\/\/firmatotal\.chapalab\.com\/privacidad\/"/)
  assert.match(privacy, /name="robots" content="noindex, follow"/)
  for (const section of ['data', 'storage', 'retention', 'analytics', 'advertising', 'providers', 'responsible']) {
    assert.match(privacy, new RegExp(`data-privacy-section="${section}"`))
  }
  assert.match(privacy, /https:\/\/www\.chapalab\.com\/contacto\//)
  assert.match(privacy, /https:\/\/www\.chapalab\.com\/apoya\//)
  assert.match(privacy, /Google AdSense/)
})

test('Firma Total replaces the internal-only privacy block with a real route', () => {
  assert.match(redirects, /^\/privacy \/privacidad\/ 301$/m)
  assert.match(app, /href="\/privacidad\/"/)
  assert.match(app, /https:\/\/www\.chapalab\.com\/apoya\//)
  assert.match(app, /https:\/\/www\.chapalab\.com\/contacto\//)
})
