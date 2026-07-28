import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { base64ToBytes, hasPdfSignatures } from "./binary-utils.js";

export {
  base64ToBytes,
  bytesToBase64,
  downloadPdf,
  hasPdfSignatures,
} from "./binary-utils.js";

export function placementToPdfRect(placement, pageWidth, pageHeight) {
  const width = placement.width * pageWidth;
  const height = placement.height * pageHeight;
  return {
    x: placement.x * pageWidth,
    y: pageHeight - ((placement.y + placement.height) * pageHeight),
    width,
    height,
  };
}

function dataUrlParts(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/i.exec(dataUrl || "");
  if (!match) throw new Error("Unsupported signature image");
  return {
    mime: match[1].toLowerCase(),
    bytes: base64ToBytes(match[2]),
  };
}

export async function applyVisualSignatures(pdfBytes, signatureDataUrl, placements, options = {}) {
  if (!placements?.length) return new Uint8Array(pdfBytes);
  if (hasPdfSignatures(pdfBytes)) {
    const error = new Error("PDF_ALREADY_SIGNED");
    error.code = "PDF_ALREADY_SIGNED";
    throw error;
  }
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const { mime, bytes } = dataUrlParts(signatureDataUrl);
  const image = mime === "image/png" ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const page = pages[placement.pageIndex];
    if (!page) continue;
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const rect = placementToPdfRect(placement, pageWidth, pageHeight);
    page.drawImage(image, rect);

    const detail = [options.signerName?.trim(), options.signedAt]
      .filter(Boolean)
      .join(" · ");

    if (detail) {
      const size = Math.max(7, Math.min(11, rect.height * 0.12));
      page.drawText(detail, {
        x: rect.x,
        y: Math.max(4, rect.y - size - 3),
        size,
        font,
        color: rgb(0.08, 0.15, 0.24),
        maxWidth: rect.width * 1.35,
      });
    }
  }

  return pdfDoc.save({ useObjectStreams: false });
}
