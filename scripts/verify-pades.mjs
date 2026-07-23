import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const input = path.resolve(process.argv[2] || "tmp/pdfs/qa-signed-pades.pdf");
const pdf = await fs.readFile(input);
const text = pdf.toString("latin1");
const byteRange = /\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/.exec(text);
const contents = /\/Contents\s*<([0-9a-fA-F]+)>/.exec(text);
if (!byteRange || !contents) throw new Error("No detached PDF signature was found");
const [, firstStart, firstLength, secondStart, secondLength] = byteRange.map(Number);
const signedContent = Buffer.concat([
  pdf.subarray(firstStart, firstStart + firstLength),
  pdf.subarray(secondStart, secondStart + secondLength),
]);
const signatureHex = contents[1].replace(/(?:00)+$/, "");
const signature = Buffer.from(signatureHex, "hex");
const directory = path.dirname(input);
const contentPath = path.join(directory, "qa-byte-range.bin");
const signaturePath = path.join(directory, "qa-signature.der");
await fs.writeFile(contentPath, signedContent);
await fs.writeFile(signaturePath, signature);

const candidates = [
  "openssl",
  "C:\\Strawberry\\c\\bin\\openssl.exe",
];
let result;
for (const executable of candidates) {
  result = spawnSync(executable, [
    "cms", "-verify", "-binary", "-inform", "DER",
    "-in", signaturePath, "-content", contentPath, "-noverify", "-out", "NUL",
  ], { encoding: "utf8" });
  if (!result.error) break;
}
await Promise.all([fs.unlink(contentPath), fs.unlink(signaturePath)]);
if (result?.status !== 0) {
  throw new Error(result?.stderr || result?.error?.message || "OpenSSL verification failed");
}
console.log(`Cryptographic CMS verification passed: ${path.basename(input)}`);
