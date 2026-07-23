import { Buffer } from "buffer";
import { PDFDocument } from "pdf-lib";
import { SignPdf } from "@signpdf/signpdf";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { P12Signer } from "@signpdf/signer-p12";
import { SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";

export async function signPdfWithP12(pdfBytes, p12Bytes, passphrase, metadata = {}) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdflibAddPlaceholder({
    pdfDoc,
    appName: "Firma Total",
    reason: metadata.reason || "Document approval",
    contactInfo: metadata.contactInfo || "",
    name: metadata.signerName || "Certificate holder",
    location: metadata.location || "",
    signingTime: new Date(),
    signatureLength: 32768,
    subFilter: SUBFILTER_ETSI_CADES_DETACHED,
  });

  const prepared = await pdfDoc.save({ useObjectStreams: false });
  const signer = new P12Signer(Buffer.from(p12Bytes), { passphrase: passphrase || "" });
  const signed = await new SignPdf().sign(Buffer.from(prepared), signer);
  return new Uint8Array(signed);
}
