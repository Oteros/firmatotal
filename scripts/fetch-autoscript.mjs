import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'public/vendor/autoscript.js')
const commit = 'fe60ef3fdbae3c491e97c262a2179e2787b85776'
const expectedGitBlobSha = 'dc9401987c4cd6834cefbb68ec1adee038557f5b'
const source = `https://raw.githubusercontent.com/ctt-gob-es/clienteafirma/${commit}/afirma-ui-miniapplet-deploy/src/main/webapp/js/autoscript.js`

function gitBlobSha(buffer) {
  const header = Buffer.from(`blob ${buffer.length}\0`)
  return createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex')
}

async function currentIsValid() {
  try {
    const current = await readFile(output)
    return gitBlobSha(current) === expectedGitBlobSha
  } catch {
    return false
  }
}

if (!(await currentIsValid())) {
  const response = await fetch(source)
  if (!response.ok) throw new Error(`Could not fetch AutoScript: HTTP ${response.status}`)
  const content = Buffer.from(await response.arrayBuffer())
  const actual = gitBlobSha(content)
  if (actual !== expectedGitBlobSha) {
    throw new Error(`AutoScript integrity mismatch: expected ${expectedGitBlobSha}, got ${actual}`)
  }
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, content)
}

console.log(`AutoScript ${expectedGitBlobSha.slice(0, 12)} ready`)

