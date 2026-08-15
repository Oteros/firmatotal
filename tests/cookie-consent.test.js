import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../public/cookie-consent.js', import.meta.url), 'utf8')

function loadConsent(initialValue = null) {
  const values = new Map(initialValue ? [['firmatotal-consent-v1', initialValue]] : [])
  const signals = []
  let ConsentElement
  class Element {
    attachShadow() {
      this.shadowRoot = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null }
    }
  }
  const sandbox = {
    HTMLElement: Element,
    customElements: { get: () => null, define: (_name, constructor) => { ConsentElement = constructor } },
    localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    location: { pathname: '/en/' },
    navigator: { languages: ['en-US'], language: 'en-US' },
    document: { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} },
    window: { gtag: (...args) => signals.push(args) },
    fetch: async () => ({ ok: false }),
    CustomEvent: class {},
    Date,
    JSON,
    Map,
    console,
  }
  vm.runInNewContext(source, sandbox)
  return { element: new ConsentElement(), values, signals }
}

test('the first visit has no advertising consent', () => {
  assert.equal(loadConsent().element.choice, null)
})

test('accepting advertising persists and updates every Google consent signal', () => {
  const { element, values, signals } = loadConsent()
  element.choose('granted')
  const saved = JSON.parse(values.get('firmatotal-consent-v1'))
  assert.equal(saved.advertising, 'granted')
  assert.deepEqual(JSON.parse(JSON.stringify(signals.at(-1))), ['consent', 'update', {
    ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied',
  }])
})

test('necessary-only keeps all advertising signals denied', () => {
  const { element, signals } = loadConsent()
  element.choose('denied')
  assert.deepEqual(JSON.parse(JSON.stringify(signals.at(-1)[2])), {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
  })
})
