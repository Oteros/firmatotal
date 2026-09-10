import { languages } from './i18n.js'

export function FirmaVideo({ locale, t }) {
  return <figure className="firma-video">
    <video controls playsInline preload="metadata" poster="/examples/placement-poster.webp" aria-label={t('guide.videoTitle')}>
      <source src="/examples/placement.mp4" type="video/mp4" />
      {languages.map(language=><track key={language.code} kind="captions" src={`/examples/placement.${language.code}.vtt`} srcLang={language.code} label={language.label} default={language.code===locale} />)}
    </video>
    <figcaption><h3>{t('guide.videoTitle')}</h3><p>{t('guide.videoMeta')}</p></figcaption>
    <details><summary>{t('guide.videoRead')}</summary><ol>{[1,2,3,4].map(index=><li key={index}>{t(`guide.videoStep${index}`)}</li>)}</ol></details>
  </figure>
}

export function FirmaSources({ t }) {
  return <div className="firma-sources"><h3>{t('guide.sources')}</h3><ul>
    <li><a href="https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467109069/What+is+eSignature" target="_blank" rel="noreferrer">{t('guide.euSource')} ↗</a></li>
    <li><a href="https://firmaelectronica.gob.es/descargas" target="_blank" rel="noreferrer">{t('guide.autoSource')} ↗</a></li>
  </ul></div>
}

export default function FirmaGuide({locale,t}) {
  return <section className="firma-reading" aria-labelledby="firma-example-title">
    <div className="firma-reading-heading"><p className="eyebrow">Firma Total · PDF</p><h2 id="firma-example-title">{t('guide.visual.title1')}</h2></div>
    <div className="firma-reading-grid"><img src="/guides/visual.svg" width="800" height="400" alt="" loading="lazy" />
      <div><p>{t('guide.visual.body1')}</p>{[2,3].map(index=><article key={index}><h3>{t(`guide.visual.title${index}`)}</h3><p>{t(`guide.visual.body${index}`)}</p></article>)}</div>
    </div>
    <FirmaVideo locale={locale} t={t}/>
    <FirmaSources t={t}/>
  </section>
}
