import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("localized SEO pages carry intent-specific HowTo content", async () => {
  const visible = await read("public/es/firmar-pdf-online/index.html");
  const certificate = await read("public/es/firmar-pdf-con-certificado-digital/index.html");
  const handwritten = await read("public/es/anadir-firma-a-pdf/index.html");
  for (const page of [visible, certificate, handwritten]) {
    assert.match(page, /"@type":"HowTo"/);
    assert.match(page, /class="intent"/);
    assert.match(page, /id="step-3"/);
  }
  assert.match(certificate, /PADES · PKCS#12/);
  assert.match(certificate, /PKCS#12 certificate support/);
  assert.match(handwritten, /Dibujar · Escribir · Subir imagen/);
  assert.notEqual(visible, certificate);
  assert.notEqual(certificate, handwritten);
});

test("sitemap is current and excludes privacy", async () => {
  const sitemap = await read("public/sitemap.xml");
  assert.match(sitemap, /<lastmod>2026-08-13<\/lastmod>/);
  assert.doesNotMatch(sitemap, /privacidad|privacy/);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 46);
});

test("the app links directly to all three localized guide intents", async () => {
  const app = await read("src/App.jsx");
  assert.match(app, /function GuideLinks/);
  assert.match(app, /firmar-pdf-online/);
  assert.match(app, /firmar-pdf-con-certificado-digital/);
  assert.match(app, /anadir-firma-a-pdf/);
});
