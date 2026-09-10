import { StandardFonts } from 'pdf-lib'

// Keep printable Unicode intact. Control characters have no PDF text representation.
export const cleanPdfText = (value) => String(value ?? '')
  .normalize('NFC')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

const graphemes = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null
export const textUnits = (value) => graphemes
  ? Array.from(graphemes.segment(value), (part) => part.segment)
  : Array.from(value)

export const isRtlText = (text) => /^[^\p{L}]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u.test(text)

export function wrapPdfText(value, renderer, size, maximumWidth) {
  const words = cleanPdfText(value).replace(/\t/g, '    ').split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (renderer.widthOfTextAtSize(candidate, size) <= maximumWidth) {
      line = candidate
      continue
    }
    if (line) { lines.push(line); line = '' }
    // Long words must also wrap after a preceding word, not only at paragraph start.
    for (const unit of textUnits(word)) {
      if (line && renderer.widthOfTextAtSize(line + unit, size) > maximumWidth) {
        lines.push(line)
        line = ''
      }
      line += unit
    }
  }
  if (line) lines.push(line)
  return lines
}

export async function createPdfTextRenderer(pdf, values, {
  standardFont = StandardFonts.Helvetica,
  bold = false,
  italic = false,
  fetchFont = globalThis.fetch,
  createCanvas = () => globalThis.document?.createElement('canvas'),
} = {}) {
  const standard = await pdf.embedFont(standardFont)
  const standardCharacters = new Set(standard.getCharacterSet())
  const supports = (characters, text) => Array.from(text).every((character) => characters.has(character.codePointAt(0)))
  const needsUnicode = values.some((value) => /[\u0100-\u052F\u1E00-\u1FFF]/u.test(cleanPdfText(value)) && !supports(standardCharacters, cleanPdfText(value)))
  let unicode
  let unicodeCharacters
  if (needsUnicode) {
    const { default: fontkit } = await import('@pdf-lib/fontkit')
    pdf.registerFontkit(fontkit)
    const response = await fetchFont(`/fonts/NotoSans-${bold ? 'Bold' : 'Regular'}.ttf`, { credentials: 'same-origin' })
    if (!response.ok) throw new Error('unicode-font-unavailable')
    unicode = await pdf.embedFont(await response.arrayBuffer(), { subset: true })
    unicodeCharacters = new Set(unicode.getCharacterSet())
  }
  let measuringContext
  const contextFor = (text, size) => {
    measuringContext ||= createCanvas()?.getContext('2d')
    if (!measuringContext) throw new Error('unicode-renderer-unavailable')
    measuringContext.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px sans-serif`
    measuringContext.direction = isRtlText(text) ? 'rtl' : 'ltr'
    measuringContext.textAlign = 'left'
    measuringContext.textBaseline = 'alphabetic'
    return measuringContext
  }
  const fontFor = (text) => supports(standardCharacters, text) ? standard
    : unicode && supports(unicodeCharacters, text) ? unicode : null

  return {
    widthOfTextAtSize(value, size) {
      const text = cleanPdfText(value)
      const font = fontFor(text)
      return font ? font.widthOfTextAtSize(text, size) : contextFor(text, size).measureText(text).width
    },
    async draw(page, value, options) {
      const text = cleanPdfText(value)
      if (!text) return
      const font = fontFor(text)
      if (font) { page.drawText(text, { ...options, font }); return }

      // Browser shaping preserves joined Arabic, Indic marks, CJK and emoji.
      // Only unsupported lines become images; existing searchable text stays text.
      const { size, x, y, color } = options
      const context = contextFor(text, size)
      const metrics = context.measureText(text)
      const left = Math.max(0, metrics.actualBoundingBoxLeft || 0) + 2
      const right = Math.max(metrics.width, metrics.actualBoundingBoxRight || 0) + 2
      const ascent = Math.max(size, metrics.actualBoundingBoxAscent || 0) + 2
      const descent = Math.max(size * 0.4, metrics.actualBoundingBoxDescent || 0) + 2
      const width = left + right
      const height = ascent + descent
      const scale = Math.min(4, 8192 / Math.max(width, height), Math.sqrt(16_000_000 / (width * height)))
      const canvas = createCanvas()
      if (!canvas) throw new Error('unicode-renderer-unavailable')
      canvas.width = Math.max(1, Math.ceil(width * scale))
      canvas.height = Math.max(1, Math.ceil(height * scale))
      const drawing = canvas.getContext('2d')
      drawing.scale(scale, scale)
      drawing.font = context.font
      drawing.direction = context.direction
      drawing.textAlign = 'left'
      drawing.textBaseline = 'alphabetic'
      drawing.fillStyle = color ? `rgb(${color.red * 255}, ${color.green * 255}, ${color.blue * 255})` : '#000'
      drawing.fillText(text, left, ascent)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('unicode-renderer-unavailable')
      const image = await pdf.embedPng(await blob.arrayBuffer())
      page.drawImage(image, { x: x - left, y: y - descent, width: canvas.width / scale, height: canvas.height / scale })
    },
  }
}
