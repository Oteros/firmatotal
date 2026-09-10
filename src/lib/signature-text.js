export function fittedSignatureSize(context, text, width, height) {
  const maximum = 220;
  context.font = `${maximum}px Allura, cursive`;
  const metrics = context.measureText(text);
  const textWidth = Math.max(metrics.width, (metrics.actualBoundingBoxLeft || 0) + (metrics.actualBoundingBoxRight || 0));
  const textHeight = (metrics.actualBoundingBoxAscent || maximum) + (metrics.actualBoundingBoxDescent || maximum * 0.2);
  return Math.min(maximum, maximum * (width - 80) / Math.max(textWidth, 1), maximum * (height - 48) / Math.max(textHeight, 1));
}

export function makeTypedSignature(value, createCanvas = () => document.createElement('canvas')) {
  const text = String(value).normalize('NFC').trim();
  const canvas = createCanvas();
  canvas.width = 1400;
  canvas.height = 360;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#102b2b';
  context.direction = /^[^\p{L}]*[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/u.test(text) ? 'rtl' : 'ltr';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const size = fittedSignatureSize(context, text, canvas.width, canvas.height);
  context.font = `${size}px Allura, cursive`;
  const metrics = context.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || size;
  const descent = metrics.actualBoundingBoxDescent || 0;
  const left = metrics.actualBoundingBoxLeft || metrics.width / 2;
  const right = metrics.actualBoundingBoxRight || metrics.width / 2;
  context.fillText(text, canvas.width / 2 + (left - right) / 2, canvas.height / 2 + (ascent - descent) / 2);
  return canvas.toDataURL('image/png');
}
