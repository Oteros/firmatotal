import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import forge from "node-forge";
import { PDFDocument, rgb } from "pdf-lib";
import { applyVisualSignatures } from "../src/lib/pdf-tools.js";
import { signPdfWithP12 } from "../src/lib/pades.js";

const directory = path.resolve("tmp/pdfs");
await fs.mkdir(directory, { recursive: true });
const sourceDoc = await PDFDocument.create();
const page = sourceDoc.addPage([595, 842]);
page.drawText("FIRMA TOTAL", { x: 55, y: 770, size: 28, color: rgb(.06, .17, .17) });
page.drawText("End-to-end PAdES validation document", { x: 55, y: 725, size: 15 });
page.drawText("The signature should appear in the lower-right corner.", { x: 55, y: 690, size: 11 });
const source = new Uint8Array(await sourceDoc.save({ useObjectStreams: false }));

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
}
function signaturePng(width = 900, height = 240) {
  const pixels = Buffer.alloc(width * height * 4);
  const dot = (cx, cy, radius = 5) => {
    for (let y = Math.max(0, cy - radius); y < Math.min(height, cy + radius); y += 1) {
      for (let x = Math.max(0, cx - radius); x < Math.min(width, cx + radius); x += 1) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > radius ** 2) continue;
        const offset = (y * width + x) * 4;
        pixels[offset] = 16; pixels[offset + 1] = 43; pixels[offset + 2] = 43; pixels[offset + 3] = 255;
      }
    }
  };
  for (let x = 35; x < 860; x += 2) {
    const y = Math.round(120 + 46 * Math.sin(x / 49) + 25 * Math.sin(x / 21));
    dot(x, y);
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}
const signature = `data:image/png;base64,${signaturePng().toString("base64")}`;
const visual = await applyVisualSignatures(source, signature, [
  { pageIndex: 0, x: .57, y: .73, width: .31, height: .12 },
], { signerName: "Firma Total QA", signedAt: "23 Jul 2026" });

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = "20260723";
cert.validity.notBefore = new Date(Date.now() - 60_000);
cert.validity.notAfter = new Date(Date.now() + 86_400_000);
const attrs = [{ name: "commonName", value: "Firma Total QA Certificate" }];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([{ name: "basicConstraints", cA: true }, { name: "keyUsage", digitalSignature: true }]);
cert.sign(keys.privateKey, forge.md.sha256.create());
const p12 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], "qa-only", { algorithm: "3des" });
const p12Bytes = Buffer.from(forge.asn1.toDer(p12).getBytes(), "binary");
const signed = await signPdfWithP12(visual, p12Bytes, "qa-only", {
  signerName: "Firma Total QA Certificate",
  reason: "End-to-end validation",
  location: "Madrid",
});

await fs.writeFile(path.join(directory, "qa-source.pdf"), source);
await fs.writeFile(path.join(directory, "qa-visual.pdf"), visual);
await fs.writeFile(path.join(directory, "qa-signed-pades.pdf"), signed);
await fs.writeFile(path.join(directory, "qa-certificate.p12"), p12Bytes);
console.log(directory);
