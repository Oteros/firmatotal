import { readFile, writeFile, mkdir } from 'node:fs/promises'
const root = new URL('../',import.meta.url)
const locales = ['es','en','fr','de','it','pt','ca','eu','gl','bar','zh','ja','ur','ar','hi','pl','ru','el','tr','nl','ko']
const base = JSON.parse(await readFile(new URL('src/editorial/es.json',root),'utf8'))
const output = {}
await mkdir(new URL('public/examples/',root),{recursive:true})
for (const locale of locales) {
  const copy = JSON.parse(await readFile(new URL(`src/editorial/${locale}.json`,root),'utf8'))
  for (const key of Object.keys(base)) {
    if (typeof copy[key] !== 'string' || !copy[key].trim() || /<\/?[a-z][^>]*>|&lt;\/?[a-z]/i.test(copy[key])) throw new Error(`Invalid editorial translation: ${locale}:${key}`)
  }
  output[locale]=copy
  const timestamp=seconds=>`00:${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}.000`
  const cues=Array.from({length:4},(_,i)=>`${timestamp(i*6)} --> ${timestamp((i+1)*6)}\n${copy[`guide.videoStep${i+1}`]}`).join('\n\n')
  await writeFile(new URL(`public/examples/placement.${locale}.vtt`,root),`WEBVTT\n\n${cues}\n`)
}
await writeFile(new URL('src/editorial.generated.json',root),JSON.stringify(output,null,2)+'\n')
console.log(`Verified ${Object.keys(base).length} editorial keys and generated captions in ${locales.length} languages.`)
