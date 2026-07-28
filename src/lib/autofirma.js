import { base64ToBytes, bytesToBase64 } from './binary-utils.js'

const localeMap = {
  es: 'es_ES',
  en: 'en_US',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  pt: 'pt_PT',
  ca: 'ca_ES',
  eu: 'eu_ES',
  gl: 'gl_ES',
}

function sanitizeParam(value) {
  return String(value || '').replace(/[\r\n=]/g, ' ').trim()
}

export function hasAutoFirmaBridge() {
  return Boolean(globalThis.AutoScript?.cargarAppAfirma && globalThis.AutoScript?.sign)
}

export async function signWithAutoFirma(pdfBytes, metadata = {}) {
  if (!hasAutoFirmaBridge()) throw new Error('AUTOFIRMA_BRIDGE_MISSING')
  const api = globalThis.AutoScript
  api.setAppName?.('Firma Total')
  api.setLocale?.(localeMap[metadata.locale] || 'en_US')
  api.enableProgressDialog?.(true)
  api.cargarAppAfirma()

  const params = [
    'mode=implicit',
    `reason=${sanitizeParam(metadata.reason || 'Document approval')}`,
    `signatureProductionCity=${sanitizeParam(metadata.location || '')}`,
    'allowSignFormatFallback=false',
  ].join('\n')

  return new Promise((resolve, reject) => {
    api.sign(
      bytesToBase64(pdfBytes),
      'SHA256withRSA',
      'PAdES',
      params,
      (signatureB64, certificateB64, extraData) => {
        try {
          const signed = base64ToBytes(signatureB64)
          const header = new TextDecoder().decode(signed.slice(0, 5))
          if (header !== '%PDF-') throw new Error('AUTOFIRMA_INVALID_RESULT')
          // Match the other signing backends: callers always receive raw PDF bytes.
          // A wrapper object would be serialized by Blob as "[object Object]".
          resolve(signed)
        } catch (error) {
          reject(error)
        }
      },
      (type, message, code) => {
        const error = new Error(message || type || 'AUTOFIRMA_ERROR')
        error.code = code
        error.type = type
        reject(error)
      },
    )
  })
}
