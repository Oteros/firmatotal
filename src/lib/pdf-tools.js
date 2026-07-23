import { Buffer } from "buffer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
    bytes: Uint8Array.from(Buffer.from(match[2], "base64")),
  };
}

export function hasPdfSignatures(pdfBytes) {
  const binary = Buffer.from(pdfBytes).toString("latin1");
  return /\/ByteRange\s*\[\s*\d+\s+\d+\s+\d+\s+\d+\s*\]/.test(binary);
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

export function bytesToBase64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .replace(/\s/g, "");
  return new Uint8Array(Buffer.from(normalized, "base64"));
}

export function downloadPdf(bytes, originalName = "document.pdf", suffix = "signed") {
  const stem = originalName
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "document";
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${stem}-${suffix}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
