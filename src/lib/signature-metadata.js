import {PDFHexString} from 'pdf-lib'

// The placeholder library wraps these values in PDFString.of(), which expects
// an already encoded PDF literal string. Unicode code units would be truncated.
export function encodeSignatureMetadata(value) {
  const text=String(value).normalize('NFC')
  if (/^[\x20-\x7E]*$/.test(text) && !/[()\\]/.test(text)) return text
  return Array.from(PDFHexString.fromText(text).asBytes(),byte=>'\\'+byte.toString(8).padStart(3,'0')).join('')
}
