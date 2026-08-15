(() => {
  const STORAGE_KEY = 'firmatotal-consent-v1'
  const LANGUAGE_KEY = 'firmatotal-language'
  const SUPPORTED = ['es', 'en', 'fr', 'de', 'it', 'pt', 'ca', 'eu', 'gl', 'pl', 'zh', 'ja', 'ur', 'ar', 'hi', 'ru', 'el', 'tr', 'nl', 'ko', 'bar']
  const FALLBACK = {
    notice: {
      kicker: 'Firma Total · Cookies',
      title: 'Clear privacy, here too',
      body: 'Essential local storage remembers your language and choice. Measurement works without cookies. Advertising stays denied until you allow it.',
      essential: 'Necessary only', accept: 'Accept advertising', settings: 'View details',
      dialogTitle: 'Cookies and storage', dialogIntro: 'This is what Firma Total uses now.',
      essentialTitle: 'Essential preferences', essentialBody: 'Always active. They remember your language and privacy choice in this browser.',
      analyticsTitle: 'Cookieless measurement', analyticsBody: 'Cloudflare Web Analytics measures aggregate visits and performance without cookies, profiles, or access to your documents.',
      advertisingTitle: 'Optional advertising', advertisingBody: 'Google may use cookies or advertising storage only according to your choice and its applicable consent controls.',
      policy: 'Full policy', close: 'Close',
    },
    footer: { cookies: 'Cookies', settings: 'Cookie settings' },
  }

  const normalizeChoice = (value) => value === 'granted' || value === 'denied' ? value : null

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      return saved?.version === 1 ? normalizeChoice(saved.advertising) : null
    } catch {
      return null
    }
  }

  function saveChoice(advertising) {
    const choice = normalizeChoice(advertising) || 'denied'
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, advertising: choice, updatedAt: new Date().toISOString() }))
    } catch {
      // The choice still applies to the current page if storage is unavailable.
    }
    if (typeof window.gtag === 'function') {
      const value = choice === 'granted' ? 'granted' : 'denied'
      window.gtag('consent', 'update', {
        ad_storage: value,
        ad_user_data: value,
        ad_personalization: value,
        analytics_storage: 'denied',
      })
    }
    return choice
  }

  function resolveLocale() {
    const pathLocale = location.pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    if (SUPPORTED.includes(pathLocale)) return pathLocale
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY)
      if (SUPPORTED.includes(saved)) return saved
    } catch {
      // Browser preference remains available.
    }
    for (const preference of navigator.languages?.length ? navigator.languages : [navigator.language]) {
      const normalized = String(preference || '').toLowerCase()
      const match = SUPPORTED.find((code) => normalized === code || normalized.startsWith(`${code}-`))
      if (match) return match
    }
    return 'en'
  }

  class FirmaTotalConsent extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.choice = readChoice()
      this.locale = resolveLocale()
      this.copy = FALLBACK
      this.open = false
      this.handleOpen = () => { this.open = true; this.render() }
    }

    async connectedCallback() {
      document.addEventListener('firmatotal:cookie-settings', this.handleOpen)
      try {
        const response = await fetch('/cookie-locales.json', { credentials: 'same-origin' })
        if (response.ok) {
          const locales = await response.json()
          this.copy = locales[this.locale] || locales.en || FALLBACK
        }
      } catch {
        this.copy = FALLBACK
      }
      this.render()
    }

    disconnectedCallback() {
      document.removeEventListener('firmatotal:cookie-settings', this.handleOpen)
    }

    choose(value) {
      this.choice = saveChoice(value)
      this.open = false
      this.render()
    }

    render() {
      const t = this.copy.notice || FALLBACK.notice
      const direction = ['ar', 'ur'].includes(this.locale) ? 'rtl' : 'ltr'
      const banner = this.choice === null ? `
        <section class="notice" role="region" aria-labelledby="cookie-title">
          <div><p class="kicker">${t.kicker}</p><h2 id="cookie-title">${t.title}</h2><p>${t.body}</p></div>
          <div class="actions"><button class="primary" data-choice="denied">${t.essential}</button><button data-choice="granted">${t.accept}</button><button data-details>${t.settings}</button></div>
        </section>` : ''
      const dialog = this.open ? `
        <div class="backdrop" role="presentation">
          <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-dialog-title">
            <header><div><p class="kicker">${t.kicker}</p><h2 id="cookie-dialog-title">${t.dialogTitle}</h2></div><button class="close" data-close aria-label="${t.close}">×</button></header>
            <p class="intro">${t.dialogIntro}</p>
            <div class="status-list">
              <article><i class="on"></i><div><h3>${t.essentialTitle}</h3><p>${t.essentialBody}</p></div></article>
              <article><i class="on"></i><div><h3>${t.analyticsTitle}</h3><p>${t.analyticsBody}</p></div></article>
              <article><i class="${this.choice === 'granted' ? 'on' : ''}"></i><div><h3>${t.advertisingTitle}</h3><p>${t.advertisingBody}</p></div></article>
            </div>
            <a class="policy" href="/${this.locale}/cookies/">${t.policy} →</a>
            <div class="actions dialog-actions"><button class="primary" data-choice="denied">${t.essential}</button><button data-choice="granted">${t.accept}</button><button data-close>${t.close}</button></div>
          </section>
        </div>` : ''
      this.shadowRoot.innerHTML = `
        <style>
          :host{--ink:#102b2b;--paper:#f2eee5;--accent:#8e1d2c;font-family:"DM Sans",system-ui,sans-serif;color:var(--ink)}*{box-sizing:border-box}
          .notice{position:fixed;z-index:2147483000;right:20px;bottom:20px;width:min(680px,calc(100% - 40px));padding:20px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;border:1px solid var(--ink);background:var(--paper);box-shadow:7px 8px 0 rgba(16,43,43,.22);animation:rise .24s ease-out both}
          .kicker{margin:0 0 7px;color:var(--accent);font:700 10px/1.3 "DM Mono",monospace;letter-spacing:.12em;text-transform:uppercase}.notice h2,.dialog h2{margin:0;font:400 25px/1.05 "Libre Caslon Display",Georgia,serif}.notice div>p:last-child,.intro{max-width:540px;margin:8px 0 0;color:#5e5a52;font-size:12px;line-height:1.55}
          .actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.actions button{min-height:38px;padding:8px 12px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:700 10px/1.2 "DM Mono",monospace;cursor:pointer}.actions button:hover{background:#e7dfd3}.actions .primary{background:var(--ink);color:var(--paper)}.actions .primary:hover{background:var(--accent)}
          .backdrop{position:fixed;z-index:2147483001;inset:0;display:grid;place-items:center;padding:20px;background:rgba(16,37,59,.58)}.dialog{width:min(720px,100%);max-height:calc(100vh - 40px);overflow:auto;padding:28px;border:1px solid var(--ink);background:var(--paper);box-shadow:8px 9px 0 rgba(0,0,0,.26);animation:rise .2s ease-out both}.dialog header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.close{width:36px;height:36px;flex:0 0 auto;border:1px solid var(--ink);background:transparent;color:var(--ink);font-size:22px;cursor:pointer}.status-list{margin-top:22px;border-top:1px solid #bbb5aa}.status-list article{display:grid;grid-template-columns:13px minmax(0,1fr);gap:12px;padding:17px 0;border-bottom:1px solid #bbb5aa}.status-list i{width:9px;height:9px;margin-top:5px;border:1px solid #777166;border-radius:50%;background:#d7d0c5}.status-list i.on{border-color:#14736e;background:#45b8ad}.status-list h3{margin:0 0 4px;font:400 17px/1.2 "Libre Caslon Display",Georgia,serif}.status-list p{margin:0;color:#5e5a52;font-size:11px;line-height:1.55}.policy{display:inline-block;margin-top:18px;color:var(--accent);font:700 10px/1.3 "DM Mono",monospace;text-transform:uppercase;letter-spacing:.05em}.dialog-actions{margin-top:22px}
          @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@media(prefers-reduced-motion:reduce){.notice,.dialog{animation:none}}@media(max-width:560px){.notice{right:10px;bottom:10px;width:calc(100% - 20px);grid-template-columns:1fr;gap:15px;padding:17px}.actions{justify-content:stretch}.actions button{flex:1 1 auto}.backdrop{padding:10px}.dialog{max-height:calc(100vh - 20px);padding:20px}}
        </style><div dir="${direction}">${banner}${dialog}</div>`
      this.shadowRoot.querySelectorAll('[data-choice]').forEach((button) => button.addEventListener('click', () => this.choose(button.dataset.choice)))
      this.shadowRoot.querySelector('[data-details]')?.addEventListener('click', this.handleOpen)
      this.shadowRoot.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => { this.open = false; this.render() }))
      this.shadowRoot.querySelector('.backdrop')?.addEventListener('click', (event) => { if (event.target === event.currentTarget) { this.open = false; this.render() } })
    }
  }

  if (!customElements.get('firma-total-consent')) customElements.define('firma-total-consent', FirmaTotalConsent)

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-cookie-settings]')) {
      event.preventDefault()
      document.dispatchEvent(new CustomEvent('firmatotal:cookie-settings'))
    }
  })
  document.addEventListener('change', (event) => {
    if (event.target.matches('[data-language-selector]') && event.target.value) location.assign(event.target.value)
  })
})()
