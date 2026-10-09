import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync, sign, constants } from 'node:crypto';
import forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import { inspectP12Certificate, signPdfWithP12 } from '../src/lib/pades.js';
import { hasPdfSignatures } from '../src/lib/binary-utils.js';

test('rejects nested DigestAlgorithm padding from CVE-2026-85393', () => {
  // Upstream regression: https://github.com/digitalbazaar/forge/pull/1158
  const publicKey = forge.pki.rsa.setPublicKey(
    new forge.jsbn.BigInteger('f'.repeat(256), 16),
    new forge.jsbn.BigInteger('1', 10)
  );
  const md = forge.md.sha256.create();
  md.update('nested-digest-algorithm');
  const digest = md.digest().getBytes();
  const digestInfo = forge.util.hexToBytes('30343010060960864801650304020105000401000420') + digest;
  const padding = forge.util.hexToBytes('0001' + 'ff'.repeat(128 - digestInfo.length - 3) + '00');
  assert.throws(() => publicKey.verify(digest, padding + digestInfo), /does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo/);
});

test('still verifies valid RSA signatures and rejects a changed message', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 65537 });
  const publicKey = forge.pki.publicKeyFromPem(keys.publicKey.export({ type: 'pkcs1', format: 'pem' }));
  const message = 'Firma Total RSA compatibility regression';
  const signature = sign('sha256', Buffer.from(message), { key: keys.privateKey, padding: constants.RSA_PKCS1_PADDING }).toString('binary');
  const md = forge.md.sha256.create();
  md.update(message);
  assert.equal(publicKey.verify(md.digest().getBytes(), signature), true);
  const different = forge.md.sha256.create();
  different.update(message + ' changed');
  assert.equal(publicKey.verify(different.digest().getBytes(), signature), false);
});

test('the application still reads a synthetic P12 and signs a PDF', async () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048, publicExponent: 65537 });
  const privateKey = forge.pki.privateKeyFromPem(keys.privateKey.export({ type: 'pkcs1', format: 'pem' }));
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forge.pki.publicKeyFromPem(keys.publicKey.export({ type: 'pkcs1', format: 'pem' }));
  certificate.serialNumber = '01';
  certificate.validity.notBefore = new Date(Date.now() - 60_000);
  certificate.validity.notAfter = new Date(Date.now() + 86_400_000);
  certificate.setSubject([{ name: 'commonName', value: 'ChapaLab synthetic test fixture' }]);
  certificate.setIssuer(certificate.subject.attributes);
  certificate.sign(privateKey, forge.md.sha256.create());
  const p12 = forge.pkcs12.toPkcs12Asn1(privateKey, certificate, 'test-pass', { algorithm: '3des' });
  const p12Bytes = Buffer.from(forge.asn1.toDer(p12).getBytes(), 'binary');
  assert.ok(inspectP12Certificate(p12Bytes, 'test-pass').notAfter > new Date());
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const input = await pdf.save({ useObjectStreams: false });
  const signed = await signPdfWithP12(input, p12Bytes, 'test-pass', { signerName: 'Synthetic fixture' });
  assert.ok(signed.length > input.length);
  assert.equal(hasPdfSignatures(signed), true);
  assert.ok((await PDFDocument.load(signed)).getPageCount() === 1);
});
