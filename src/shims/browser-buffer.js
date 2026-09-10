import {Buffer} from 'buffer'

// @signpdf uses Node's global Buffer even when bundled for a browser.
// Reuse the same existing polyfill as binary-utils and the P12 module.
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer
