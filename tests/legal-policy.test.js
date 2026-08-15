import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8')
const [app, redirects, generator, index, cookieScript, localeText, notFound] = await Promise.all([
  read('src/App.jsx'),
  read('public/_redirects'),
  read('scripts/generate-locale-shells.mjs'),
  read('index.html'),
  read('public/cookie-consent.js'),
  read('src/cookie-locales.generated.json'),
  read('public/404.html'),
])
const cookieLocales = JSON.parse(localeText)

test('Firma Total generates complete localized privacy and cookie routes', () => {
  assert.equal(Object.keys(cookieLocales).length, 21)
  for (const [code, copy] of Object.entries(cookieLocales)) {
    for (const section of ['notice', 'policy', 'privacy', 'footer']) assert.ok(copy[section], `${code} is missing ${section}`)
    assert.ok(copy.notice.body)
    assert.ok(copy.policy.controlBody)
    assert.ok(copy.privacy.advertisingBody)
    assert.ok(copy.privacy.analyticsBody)
  }
  for (const section of ['files', 'storage', 'analytics', 'advertising', 'autofirma']) {
    assert.match(generator, new RegExp(`data-privacy-section=\\"${section}\\"`))
  }
  assert.match(generator, /for \(const page of \['home', 'privacy', 'cookies'\]\)/)
  assert.match(generator, /noindex,follow/)
})

test('advertising consent is denied before the edge-injected advertising script can run', () => {
  assert.match(index, /firmatotal-consent-v1/)
  assert.match(index, /ad_storage: granted \? 'granted' : 'denied'/)
  assert.match(index, /ad_user_data: granted \? 'granted' : 'denied'/)
  assert.match(index, /ad_personalization: granted \? 'granted' : 'denied'/)
  assert.match(index, /<firma-total-consent>/)
  assert.match(cookieScript, /data-choice=\"denied\"/)
  assert.match(cookieScript, /data-choice=\"granted\"/)
  assert.match(cookieScript, /firmatotal:cookie-settings/)
})

test('legacy legal URLs redirect to localized canonicals and unknown routes are real 404s', () => {
  assert.match(redirects, /^\/privacidad \/es\/privacidad\/ 301$/m)
  assert.match(redirects, /^\/privacy \/en\/privacidad\/ 301$/m)
  assert.match(redirects, /^\/cookies \/es\/cookies\/ 301$/m)
  assert.match(redirects, /^\/cookie-policy \/en\/cookies\/ 301$/m)
  assert.match(notFound, /name="robots" content="noindex,follow"/)
  assert.match(notFound, /rel="canonical" href="https:\/\/firmatotal\.chapalab\.com\/404\.html"/)
  assert.match(app, /href=\{`\/\$\{locale\}\/privacidad\/`\}/)
  assert.match(app, /href=\{`\/\$\{locale\}\/cookies\/`\}/)
  assert.match(app, /data-cookie-settings/)
})
