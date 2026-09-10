// Static generators install every language; the browser imports only the selected one.
import editorial from './editorial.generated.json' with {type:'json'}
import {installEditorial} from './i18n.js'
for (const [locale,copy] of Object.entries(editorial)) installEditorial(locale,copy)
export * from './i18n.js'
