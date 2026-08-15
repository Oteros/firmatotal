import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'src', 'cookie-locales.generated.json')
const destination = path.join(root, 'public', 'cookie-locales.json')

await fs.copyFile(source, destination)
console.log('Prepared 21 cookie and privacy translations.')
