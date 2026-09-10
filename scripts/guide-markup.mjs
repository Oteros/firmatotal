import { languages } from '../src/i18n.js'
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
export const guideKinds=['visual','certificate','placement']
export const guideSteps=(dict,index)=>[1,2,3].map(step=>[dict[`guide.${guideKinds[index]}.title${step}`],dict[`guide.${guideKinds[index]}.body${step}`]])
export const sourcesMarkup=dict=>`<div class="firma-sources"><h3>${esc(dict['guide.sources'])}</h3><ul><li><a href="https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467109069/What+is+eSignature" target="_blank" rel="noreferrer">${esc(dict['guide.euSource'])} ↗</a></li><li><a href="https://firmaelectronica.gob.es/descargas" target="_blank" rel="noreferrer">${esc(dict['guide.autoSource'])} ↗</a></li></ul></div>`
export function videoMarkup(dict,locale) {
  return `<figure class="firma-video"><video controls playsinline preload="metadata" poster="/examples/placement-poster.webp" aria-label="${esc(dict['guide.videoTitle'])}"><source src="/examples/placement.mp4" type="video/mp4">${languages.map(language=>`<track kind="captions" src="/examples/placement.${language.code}.vtt" srclang="${language.code}" label="${esc(language.label)}"${locale===language.code?' default':''}>`).join('')}</video><figcaption><h3>${esc(dict['guide.videoTitle'])}</h3><p>${esc(dict['guide.videoMeta'])}</p></figcaption><details><summary>${esc(dict['guide.videoRead'])}</summary><ol>${[1,2,3,4].map(step=>`<li>${esc(dict[`guide.videoStep${step}`])}</li>`).join('')}</ol></details></figure>`
}
export function guideMarkup(dict,locale,index) {
  return `<section class="firma-reading"><div class="firma-reading-grid"><img src="/guides/${guideKinds[index]}.svg" width="800" height="400" alt="" loading="lazy"><ol class="firma-steps">${guideSteps(dict,index).map(([title,body],step)=>`<li id="step-${step+1}"><span class="eyebrow">0${step+1}</span><h2>${esc(title)}</h2><p>${esc(body)}</p></li>`).join('')}</ol></div>${index!==1?videoMarkup(dict,locale):''}${sourcesMarkup(dict)}</section>`
}
