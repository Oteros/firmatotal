import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PDFDocument,degrees} from 'pdf-lib'
import {dictionaries,languages,createTranslator} from '../src/i18n-editorial.js'
import {signaturePageGeometry,fitSignatureImage} from '../src/lib/signature-geometry.js'
import {applyVisualSignatures} from '../src/lib/pdf-tools.js'

test('all editorial text and captions are localized, with literal text and intact placeholders',async()=>{
 const base=JSON.parse(await readFile(new URL('../src/editorial/es.json',import.meta.url),'utf8'))
 for(const {code}of languages){
  const copy=JSON.parse(await readFile(new URL(`../src/editorial/${code}.json`,import.meta.url),'utf8'))
  assert.deepEqual(Object.keys(copy).sort(),Object.keys(base).sort())
  for(const [key,value]of Object.entries(dictionaries[code]))assert.doesNotMatch(value,/<\/?[a-z][^>]*>|&lt;\/?[a-z]/i,`${code}:${key}`)
  for(const key of Object.keys(base))assert.equal(createTranslator(code)(key),copy[key])
  const vtt=await readFile(new URL(`../public/examples/placement.${code}.vtt`,import.meta.url),'utf8')
  for(const n of [1,2,3,4])assert.ok(vtt.includes(copy[`guide.videoStep${n}`]))
  for(const key of ['certificateExpired','certificateNotYetValid'])assert.match(createTranslator(code)(key),/\{date\}/)
 }
})

test('signature geometry preserves image proportions and centers within the visible box',()=>{
 const wide=fitSignatureImage({x:20,y:40,width:300,height:120},{width:800,height:200})
 assert.deepEqual(wide,{x:20,y:62.5,width:300,height:75})
 const tall=fitSignatureImage({x:20,y:40,width:300,height:120},{width:200,height:800})
 assert.deepEqual(tall,{x:155,y:40,width:30,height:120})
})

test('all four rotations use the visible crop without changing original PDF page boxes',async()=>{
 const pdf=await PDFDocument.create()
 for(const angle of [0,90,180,270]){const page=pdf.addPage([600,800]);page.setCropBox(50,80,450,600);page.setRotation(degrees(angle))}
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XhT2AAAAAElFTkSuQmCC'
 const bytes=await applyVisualSignatures(await pdf.save(),png,pdf.getPages().map((_,pageIndex)=>({pageIndex,x:.2,y:.25,width:.3,height:.12})))
 const result=await PDFDocument.load(bytes)
 for(const [index,page]of result.getPages().entries()){
  const angle=index*90
  assert.equal(page.getRotation().angle,angle)
  assert.deepEqual(page.getCropBox(),{x:50,y:80,width:450,height:600})
  assert.deepEqual(page.getMediaBox(),{x:0,y:0,width:600,height:800})
  const g=signaturePageGeometry(page)
  assert.equal(g.width,angle%180?600:450);assert.equal(g.height,angle%180?450:600)
 }
})
