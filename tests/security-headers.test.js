import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('Firma Total preserves AutoFirma while applying the common security baseline', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8')
  for (const value of [
    'X-Content-Type-Options: nosniff',
    'X-Frame-Options: DENY',
    'Referrer-Policy: no-referrer',
    'Permissions-Policy:',
    'Content-Security-Policy:',
    'script-src',
    'connect-src',
    'worker-src',
    'frame-src',
    "frame-ancestors 'none'",
    'https://127.0.0.1:*',
    'wss://127.0.0.1:*',
    'afirma:',
  ]) assert.match(headers, new RegExp(value.replaceAll('*', '\\*')))
  assert.doesNotMatch(headers, /Strict-Transport-Security/i)
})
