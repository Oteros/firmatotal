import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import forge from "node-forge";
import { PDFDocument } from "pdf-lib";
import { createTranslator, dictionaries, languages } from "../src/i18n.js";
import { applyVisualSignatures, hasPdfSignatures, placementToPdfRect } from "../src/lib/pdf-tools.js";
import { signPdfWithP12 } from "../src/lib/pades.js";
import { signWithAutoFirma } from "../src/lib/autofirma.js";

const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XhT2AAAAAElFTkSuQmCC";

async function samplePdf() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  page.drawText("Firma Total QA document", { x: 55, y: 780, size: 18 });
  return new Uint8Array(await pdf.save({ useObjectStreams: false }));
}

function sampleP12(password, validity = {}) {
  const keys = forge.pki.rsa.generateKeyPair(1024);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = keys.publicKey;
  certificate.serialNumber = "01";
  certificate.validity.notBefore = validity.notBefore || new Date(Date.now() - 60_000);
  certificate.validity.notAfter = validity.notAfter || new Date(Date.now() + 86_400_000);
  const attributes = [{ name: "commonName", value: "Firma Total QA" }];
  certificate.setSubject(attributes);
  certificate.setIssuer(attributes);
  certificate.setExtensions([
    { name: "basicConstraints", cA: true },
    { name: "keyUsage", digitalSignature: true, keyCertSign: true },
  ]);
  certificate.sign(keys.privateKey, forge.md.sha256.create());
  const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [certificate], password, {
    algorithm: "3des",
  });
  return new Uint8Array(Buffer.from(forge.asn1.toDer(asn1).getBytes(), "binary"));
}

test("all 15 locales expose the complete Spanish key set", () => {
  assert.equal(languages.length, 15);
  const expected = Object.keys(dictionaries.es).sort();
  for (const language of languages) {
    assert.deepEqual(Object.keys(dictionaries[language.code]).sort(), expected);
  }
});

test("safety messages are localized in all 15 languages", () => {
  for (const language of languages) {
    const t = createTranslator(language.code);
    assert.notEqual(t("existingSignatureWarning"), "existingSignatureWarning");
    assert.notEqual(t("pdfAlreadySigned"), "pdfAlreadySigned");
    assert.match(t("certificateExpired"), /\{date\}/);
    assert.notEqual(t("certificateUnreadable"), "certificateUnreadable");
  }
});

test("SEO output contains 45 localized pages, the root and privacy", () => {
  const sitemap = fs.readFileSync(path.resolve("public/sitemap.xml"), "utf8");
  assert.equal((sitemap.match(/<url>/g) || []).length, 47);
  assert.match(sitemap, /<loc>https:\/\/firmatotal\.chapalab\.com\/privacidad\/<\/loc>/);
  assert.equal((sitemap.match(/<xhtml:link/g) || []).length, 45 * 16);
  assert.equal((sitemap.match(/hreflang="x-default"/g) || []).length, 45);
  for (const language of languages) {
    const localeDirectory = path.resolve("public", language.code);
    assert.equal(fs.readdirSync(localeDirectory, { withFileTypes: true }).filter((item) => item.isDirectory()).length, 3);
  }
});

test("normalized screen coordinates map to PDF coordinates", () => {
  assert.deepEqual(
    placementToPdfRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.1 }, 600, 800),
    { x: 60, y: 560, width: 180, height: 80 },
  );
});

test("visible signature preserves a valid PDF", async () => {
  const output = await applyVisualSignatures(await samplePdf(), ONE_PIXEL_PNG, [
    { pageIndex: 0, x: 0.5, y: 0.7, width: 0.25, height: 0.1 },
  ], { signerName: "Firma Total QA", signedAt: "23 Jul 2026" });
  const parsed = await PDFDocument.load(output);
  assert.equal(parsed.getPageCount(), 1);
  assert.ok(output.length > 1_000);
});

test("P12 flow emits a structurally signed PAdES PDF", async () => {
  const password = "qa-only";
  const signed = await signPdfWithP12(await samplePdf(), sampleP12(password), password, {
    signerName: "Firma Total QA",
    reason: "Automated test",
    location: "Madrid",
  });
  const binary = Buffer.from(signed).toString("latin1");
  assert.match(binary, /\/ByteRange\s*\[/);
  assert.match(binary, /\/SubFilter\s*\/ETSI\.CAdES\.detached/);
  assert.match(binary, /\/Contents\s*</);
  assert.equal(Buffer.from(signed.subarray(0, 5)).toString(), "%PDF-");
});

test("AutoFirma bridge returns raw PDF bytes instead of a wrapper object", async () => {
  const expected = Buffer.from("%PDF-1.7\n%%EOF\n");
  const previous = globalThis.AutoScript;
  globalThis.AutoScript = {
    cargarAppAfirma() {},
    sign(data, algorithm, format, params, success) {
      assert.equal(algorithm, "SHA256withRSA");
      assert.equal(format, "PAdES");
      assert.match(params, /mode=implicit/);
      success(expected.toString("base64"), "certificate", "metadata");
    },
  };
  try {
    const signed = await signWithAutoFirma(new Uint8Array(expected), { locale: "es" });
    assert.ok(signed instanceof Uint8Array);
    assert.deepEqual(Buffer.from(signed), expected);
  } finally {
    globalThis.AutoScript = previous;
  }
});
test("signed PDFs are detected and protected from destructive rewrites", async () => {
  const password = "qa-only";
  const signed = await signPdfWithP12(await samplePdf(), sampleP12(password), password);
  assert.equal(hasPdfSignatures(await samplePdf()), false);
  assert.equal(hasPdfSignatures(signed), true);
  await assert.rejects(
    () => signPdfWithP12(signed, sampleP12(password), password),
    (error) => error?.code === "PDF_ALREADY_SIGNED",
  );
  await assert.rejects(
    () => applyVisualSignatures(signed, ONE_PIXEL_PNG, [
      { pageIndex: 0, x: 0.5, y: 0.7, width: 0.25, height: 0.1 },
    ]),
    (error) => error?.code === "PDF_ALREADY_SIGNED",
  );
});

test("expired certificates are rejected before a PDF is generated", async () => {
  const password = "qa-only";
  const expired = sampleP12(password, {
    notBefore: new Date(Date.now() - 172_800_000),
    notAfter: new Date(Date.now() - 86_400_000),
  });
  const source = await samplePdf();
  await assert.rejects(
    () => signPdfWithP12(source, expired, password),
    (error) => error?.code === "CERTIFICATE_EXPIRED" && Boolean(error.validityDate),
  );
});

test("unreadable certificate passwords produce a safe error", async () => {
  const certificate = sampleP12("correct-password");
  const source = await samplePdf();
  await assert.rejects(
    () => signPdfWithP12(source, certificate, "wrong-password"),
    (error) => error?.code === "CERTIFICATE_UNREADABLE",
  );
});
