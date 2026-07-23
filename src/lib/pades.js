import { Buffer } from "buffer";
import { PDFDocument } from "pdf-lib";
import forge from "node-forge";
import { SignPdf } from "@signpdf/signpdf";
import { pdflibAddPlaceholder } from "@signpdf/placeholder-pdf-lib";
import { P12Signer } from "@signpdf/signer-p12";
import { SUBFILTER_ETSI_CADES_DETACHED } from "@signpdf/utils";
import { hasPdfSignatures } from "./pdf-tools.js";

function signingError(code, details = {}) {
  const error = new Error(code);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export function inspectP12Certificate(p12Bytes, passphrase = "") {
  try {
    const der = forge.util.createBuffer(Buffer.from(p12Bytes).toString("binary"));
    const asn1 = forge.asn1.fromDer(der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, passphrase);
    const certBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag] || [];
    const shroudedKeyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag] || [];
    const plainKeyBags = p12.getBags({
      bagType: forge.pki.oids.keyBag,
    })[forge.pki.oids.keyBag] || [];
    const privateKey = [...shroudedKeyBags, ...plainKeyBags].find((bag) => bag.key)?.key;
    const certificate = certBags
      .map((bag) => bag.cert)
      .find((cert) => privateKey?.n && cert.publicKey?.n
        && privateKey.n.compareTo(cert.publicKey.n) === 0
        && privateKey.e.compareTo(cert.publicKey.e) === 0);

    if (!certificate) throw new Error("Signing certificate not found");
    return {
      notBefore: new Date(certificate.validity.notBefore),
      notAfter: new Date(certificate.validity.notAfter),
    };
  } catch (cause) {
    throw signingError("CERTIFICATE_UNREADABLE", { cause });
  }
}

export async function signPdfWithP12(pdfBytes, p12Bytes, passphrase, metadata = {}) {
  if (hasPdfSignatures(pdfBytes)) {
    throw signingError("PDF_ALREADY_SIGNED");
  }

  const certificate = inspectP12Certificate(p12Bytes, passphrase);
  const now = new Date();
  if (now < certificate.notBefore) {
    throw signingError("CERTIFICATE_NOT_YET_VALID", {
      validityDate: certificate.notBefore.toISOString(),
    });
  }
  if (now > certificate.notAfter) {
    throw signingError("CERTIFICATE_EXPIRED", {
      validityDate: certificate.notAfter.toISOString(),
    });
  }

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
