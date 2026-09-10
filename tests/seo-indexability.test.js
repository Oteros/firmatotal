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
    const schema=JSON.parse(page.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
    const howTo=schema['@graph'].find(item=>item['@type']==='HowTo');
    assert.equal(howTo.step.length,3);
    const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
    for (const step of howTo.step) {
      assert.ok(page.includes(`<h2>${escape(step.name)}</h2>`));
      assert.ok(page.includes(`<p>${escape(step.text)}</p>`));
      assert.ok(step.text.length>100);
    }
    assert.match(page, /id="step-3"/);
    assert.match(page, /<firma-total-consent>/);
    assert.match(page, /data-language-selector/);
    assert.match(page, /data-cookie-settings/);
    assert.match(page, /summary_large_image/);
  }
  assert.match(certificate, /RSA/);
  assert.match(certificate, /PKCS#12 certificate support/);
  assert.match(handwritten, /evitar duplicados/);
  assert.notEqual(visible, certificate);
  assert.notEqual(certificate, handwritten);
});

test("sitemap is current and excludes privacy", async () => {
  const sitemap = await read("public/sitemap.xml");
  assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/);
  assert.doesNotMatch(sitemap, /privacidad|privacy/);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/firmatotal\.chapalab\.com\/bar\//);
  assert.doesNotMatch(sitemap, /<loc>https:\/\/firmatotal\.chapalab\.com\/es\/<\/loc>/);
  assert.equal((sitemap.match(/<loc>/g) || []).length, 80);
});

test("the app links directly to all three localized guide intents", async () => {
  const app = await read("src/App.jsx");
  assert.match(app, /function GuideLinks/);
  assert.match(app, /firmar-pdf-online/);
  assert.match(app, /firmar-pdf-con-certificado-digital/);
  assert.match(app, /anadir-firma-a-pdf/);
});
