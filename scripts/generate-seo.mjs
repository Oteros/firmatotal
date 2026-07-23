import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dictionaries, languages } from "../src/i18n.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const base = "https://firmatotal.chapalab.com";
const today = "2026-07-23";

const pages = {
  es: [
    ["firmar-pdf-online", "Firmar PDF online gratis y sin subirlo", "Añade una firma visible a cualquier PDF directamente en tu navegador. Privado, sin registro y sin subir documentos."],
    ["firmar-pdf-con-certificado-digital", "Firmar un PDF con certificado digital PAdES", "Firma PDF con un certificado .p12 o .pfx, o usa AutoFirma con FNMT y DNIe en España. Todo se procesa localmente."],
    ["anadir-firma-a-pdf", "Añadir una firma manuscrita a un PDF", "Dibuja, escribe o importa tu firma, colócala exactamente en el documento y descarga el resultado en segundos."],
  ],
  en: [
    ["sign-pdf-online", "Sign a PDF online without uploading it", "Add a visible signature to a PDF locally in your browser. Private, free and no account required."],
    ["digitally-sign-pdf-with-certificate", "Digitally sign a PDF with a PAdES certificate", "Create a cryptographic PDF signature using your .p12 or .pfx certificate, with local browser processing."],
    ["add-signature-to-pdf", "Add a handwritten signature to a PDF", "Draw, type or import a signature, place it precisely on any PDF page and download the finished document."],
  ],
  fr: [
    ["signer-pdf-en-ligne", "Signer un PDF en ligne sans le téléverser", "Ajoutez une signature visible à un PDF dans votre navigateur, sans compte ni envoi vers un serveur."],
    ["signer-pdf-avec-certificat", "Signer un PDF avec un certificat PAdES", "Créez une signature cryptographique PAdES avec votre certificat .p12 ou .pfx, localement dans le navigateur."],
    ["ajouter-signature-pdf", "Ajouter une signature manuscrite à un PDF", "Dessinez, saisissez ou importez votre signature puis placez-la précisément sur le document."],
  ],
  de: [
    ["pdf-online-unterschreiben", "PDF online unterschreiben – ohne Upload", "Fügen Sie Ihrem PDF direkt im Browser eine sichtbare Unterschrift hinzu. Privat, kostenlos und ohne Konto."],
    ["pdf-mit-zertifikat-signieren", "PDF mit PAdES-Zertifikat digital signieren", "Erstellen Sie mit Ihrer .p12- oder .pfx-Datei eine kryptografische PAdES-Signatur direkt im Browser."],
    ["unterschrift-in-pdf-einfuegen", "Handschriftliche Unterschrift in PDF einfügen", "Zeichnen, tippen oder importieren Sie Ihre Unterschrift und platzieren Sie sie exakt im PDF."],
  ],
  it: [
    ["firmare-pdf-online", "Firmare un PDF online senza caricarlo", "Aggiungi una firma visibile al PDF direttamente nel browser, senza account né caricamenti."],
    ["firmare-pdf-con-certificato", "Firmare un PDF con certificato PAdES", "Crea una firma crittografica PAdES usando il tuo certificato .p12 o .pfx nel browser."],
    ["aggiungere-firma-pdf", "Aggiungere una firma autografa a un PDF", "Disegna, scrivi o importa la firma e posizionala con precisione su qualsiasi pagina PDF."],
  ],
  pt: [
    ["assinar-pdf-online", "Assinar PDF online sem enviar o ficheiro", "Adicione uma assinatura visível ao PDF no navegador, sem conta e sem transferir documentos."],
    ["assinar-pdf-com-certificado", "Assinar PDF com certificado PAdES", "Crie uma assinatura criptográfica PAdES com o seu certificado .p12 ou .pfx, localmente."],
    ["adicionar-assinatura-pdf", "Adicionar uma assinatura manuscrita ao PDF", "Desenhe, escreva ou importe a assinatura e coloque-a com precisão no documento."],
  ],
  ca: [
    ["signar-pdf-online", "Signar un PDF online sense pujar-lo", "Afegeix una signatura visible al PDF des del navegador, sense compte ni enviaments."],
    ["signar-pdf-amb-certificat", "Signar un PDF amb certificat PAdES", "Crea una signatura criptogràfica PAdES amb el certificat .p12 o .pfx localment."],
    ["afegir-signatura-pdf", "Afegir una signatura manuscrita a un PDF", "Dibuixa, escriu o importa la signatura i col·loca-la exactament al document."],
  ],
  eu: [
    ["pdf-online-sinatu", "Sinatu PDF bat online igo gabe", "Gehitu sinadura ikusgai bat PDFari nabigatzailean, konturik eta igoerarik gabe."],
    ["pdf-ziurtagiriarekin-sinatu", "Sinatu PDF bat PAdES ziurtagiriarekin", "Sortu PAdES sinadura kriptografikoa .p12 edo .pfx ziurtagiriarekin, lokalean."],
    ["sinadura-pdfra-gehitu", "Gehitu eskuzko sinadura PDF bati", "Marraztu, idatzi edo inportatu sinadura eta kokatu zehazki dokumentuan."],
  ],
  gl: [
    ["asinar-pdf-online", "Asinar un PDF online sen subilo", "Engade unha sinatura visible ao PDF no navegador, sen conta nin envíos."],
    ["asinar-pdf-con-certificado", "Asinar PDF con certificado PAdES", "Crea unha sinatura criptográfica PAdES co certificado .p12 ou .pfx localmente."],
    ["engadir-sinatura-pdf", "Engadir unha sinatura manuscrita ao PDF", "Debuxa, escribe ou importa a sinatura e colócaa exactamente no documento."],
  ],
  bar: [
    ["pdf-online-unterschreibn", "A PDF online unterschreibn – ohne Upload", "A sichtbare Unterschrift direkt im Browser ins PDF doa, privat und ohne Konto."],
    ["pdf-mit-zertifikat-signiern", "PDF mit PAdES-Zertifikat signiern", "A kryptografische PAdES-Signatur mit .p12 oder .pfx lokal im Browser erstelln."],
    ["unterschrift-ins-pdf", "A handschriftliche Unterschrift ins PDF doa", "Unterschrift zeichna, tippen oder importiern und genau im Dokument platziern."],
  ],
  zh: [
    ["zaixian-qianshu-pdf", "在线签署 PDF，无需上传文件", "直接在浏览器中为 PDF 添加可见签名，无需账户，文件不会上传。"],
    ["shuzi-zhengshu-qianshu-pdf", "使用 PAdES 数字证书签署 PDF", "使用 .p12 或 .pfx 证书在浏览器本地创建加密 PAdES 签名。"],
    ["pdf-tianjia-qianming", "在 PDF 中添加手写签名", "绘制、输入或导入签名，并将其精确放置在 PDF 的任意页面。"],
  ],
  ja: [
    ["pdf-online-shomei", "PDFをアップロードせずにオンライン署名", "ブラウザ内でPDFに見える署名を追加。アカウント不要で、ファイルは送信されません。"],
    ["denshi-shomeisho-pdf-shomei", "PAdES証明書でPDFにデジタル署名", ".p12または.pfx証明書を使い、ブラウザ内で暗号学的PAdES署名を作成します。"],
    ["pdf-shomei-tsuika", "PDFに手書き署名を追加", "署名を描く、入力する、または画像から取り込み、PDF上に正確に配置します。"],
  ],
  ur: [
    ["pdf-online-dastakhat", "PDF پر آن لائن دستخط، اپ لوڈ کے بغیر", "براؤزر میں PDF پر ظاہری دستخط لگائیں۔ اکاؤنٹ یا فائل اپ لوڈ کی ضرورت نہیں۔"],
    ["certificate-se-pdf-dastakhat", "PAdES سرٹیفکیٹ سے PDF پر ڈیجیٹل دستخط", ".p12 یا .pfx سرٹیفکیٹ کے ساتھ براؤزر میں مقامی طور پر کرپٹوگرافک دستخط بنائیں۔"],
    ["pdf-mein-dastakhat", "PDF میں ہاتھ کے دستخط شامل کریں", "دستخط بنائیں، لکھیں یا تصویر درآمد کریں اور اسے PDF پر درست جگہ رکھیں۔"],
  ],
  ar: [
    ["tawqi-pdf-online", "توقيع PDF عبر الإنترنت دون رفع الملف", "أضف توقيعاً مرئياً إلى PDF داخل المتصفح، دون حساب ودون إرسال المستند."],
    ["tawqi-pdf-bishahada", "توقيع PDF رقمياً بشهادة PAdES", "أنشئ توقيع PAdES مشفراً باستخدام شهادة .p12 أو .pfx محلياً في المتصفح."],
    ["idafat-tawqi-pdf", "إضافة توقيع بخط اليد إلى PDF", "ارسم توقيعك أو اكتبه أو استورده ثم ضعه بدقة داخل المستند."],
  ],
  hi: [
    ["pdf-online-hastakshar", "PDF पर ऑनलाइन हस्ताक्षर, बिना अपलोड", "ब्राउज़र में PDF पर दिखने वाला हस्ताक्षर जोड़ें। खाता या फ़ाइल अपलोड आवश्यक नहीं।"],
    ["certificate-se-pdf-sign", "PAdES प्रमाणपत्र से PDF पर डिजिटल हस्ताक्षर", ".p12 या .pfx प्रमाणपत्र से ब्राउज़र में स्थानीय क्रिप्टोग्राफ़िक PAdES हस्ताक्षर बनाएँ।"],
    ["pdf-mein-signature", "PDF में हस्तलिखित हस्ताक्षर जोड़ें", "हस्ताक्षर बनाएँ, लिखें या चित्र आयात करें और PDF में सही जगह रखें।"],
  ],
};

const labels = {
  es:["Privacidad real","Dos tipos de firma","Compatibilidad"], en:["Real privacy","Two kinds of signature","Compatibility"],
  fr:["Confidentialité réelle","Deux types de signature","Compatibilité"], de:["Echte Privatsphäre","Zwei Signaturarten","Kompatibilität"],
  it:["Privacy reale","Due tipi di firma","Compatibilità"], pt:["Privacidade real","Dois tipos de assinatura","Compatibilidade"],
  ca:["Privadesa real","Dos tipus de signatura","Compatibilitat"], eu:["Benetako pribatutasuna","Bi sinadura mota","Bateragarritasuna"],
  gl:["Privacidade real","Dous tipos de sinatura","Compatibilidade"], bar:["Echte Privatsphäre","Zwoa Signaturartn","Kompatibilität"],
  zh:["真正的隐私","两种签名","兼容性"], ja:["確かなプライバシー","2種類の署名","互換性"],
  ur:["حقیقی رازداری","دستخط کی دو اقسام","مطابقت"], ar:["خصوصية حقيقية","نوعان من التوقيع","التوافق"],
  hi:["वास्तविक गोपनीयता","दो प्रकार के हस्ताक्षर","अनुकूलता"],
};

const jurisdiction = {
  es: "En España puedes usar AutoFirma con FNMT o DNIe. En la UE, PAdES es un formato reconocido, pero solo un certificado cualificado y el proceso adecuado producen una firma electrónica cualificada.",
  en: "For United States workflows, capture the parties' intent and consent and retain the final record. E-SIGN and state law govern legal effect; a visual mark or PAdES file is not automatically valid for every transaction.",
  fr: "En France et dans l’Union européenne, PAdES est un format reconnu. Seuls un certificat qualifié et une procédure conforme peuvent produire une signature électronique qualifiée.",
  de: "In Deutschland und der EU ist PAdES ein anerkanntes Format. Nur ein qualifiziertes Zertifikat mit einem geeigneten Verfahren erzeugt eine qualifizierte elektronische Signatur.",
  it: "In Italia e nell’UE, PAdES è un formato riconosciuto. Solo un certificato qualificato e una procedura conforme generano una firma elettronica qualificata.",
  pt: "Em Portugal e na UE, PAdES é um formato reconhecido. Só um certificado qualificado e um processo adequado produzem uma assinatura eletrónica qualificada.",
  ca: "A la Unió Europea, PAdES és un format reconegut. Només un certificat qualificat i un procés adequat produeixen una signatura electrònica qualificada.",
  eu: "Europar Batasunean PAdES formatu aitortua da. Ziurtagiri kualifikatu batek eta prozesu egokiak soilik sortzen dute sinadura elektroniko kualifikatua.",
  gl: "Na Unión Europea, PAdES é un formato recoñecido. Só un certificado cualificado e un proceso axeitado producen unha sinatura electrónica cualificada.",
  bar: "In da EU is PAdES a anerkannts Format. Bloß a qualifizierts Zertifikat mit am passenden Verfahren macht a qualifizierte elektronische Signatur.",
  zh: "PAdES 是欧盟认可的格式，但只有合格证书与合规流程才能产生合格电子签名。其他国家或交易可能有不同要求。",
  ja: "EUではPAdESが認められた形式ですが、適格電子署名には適格証明書と適切な手続きが必要です。国や取引により要件は異なります。",
  ur: "یورپی یونین میں PAdES ایک تسلیم شدہ فارمیٹ ہے، مگر اہل الیکٹرانک دستخط کے لیے اہل سرٹیفکیٹ اور درست طریقہ کار دونوں ضروری ہیں۔",
  ar: "يُعد PAdES تنسيقاً معترفاً به في الاتحاد الأوروبي، لكن التوقيع الإلكتروني المؤهل يتطلب شهادة مؤهلة وإجراءً مطابقاً. وقد تختلف المتطلبات حسب الدولة والمعاملة.",
  hi: "यूरोपीय संघ में PAdES मान्य प्रारूप है, लेकिन योग्य इलेक्ट्रॉनिक हस्ताक्षर के लिए योग्य प्रमाणपत्र और सही प्रक्रिया दोनों आवश्यक हैं।",
};

const esc = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);

function alternates(index) {
  return languages.map(({ code, htmlLang }) =>
    `<link rel="alternate" hreflang="${htmlLang}" href="${base}/${code}/${pages[code][index][0]}/">`).join("\n");
}

function pageHtml(code, index) {
  const language = languages.find((item) => item.code === code);
  const dict = dictionaries[code];
  const [slug, title, description] = pages[code][index];
  const canonical = `${base}/${code}/${slug}/`;
  const siblingLinks = pages[code].map(([linkSlug, linkTitle]) =>
    `<a href="/${code}/${linkSlug}/">${esc(linkTitle)}</a>`).join("");
  const direction = language.direction || "ltr";
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Firma Total",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: canonical,
    description,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    featureList: ["Local PDF processing", "Visible PDF signature", "PAdES digital signature"],
  }).replace(/</g, "\\u003c");
  const proof = [
    dict.privateNote,
    `${dict.visualLead} ${dict.p12Lead}`,
    index === 1 ? `${dict.p12Limit} ${jurisdiction[code]}` : jurisdiction[code],
  ];
  return `<!doctype html>
<html lang="${language.htmlLang}" dir="${direction}">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Firma Total</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${canonical}">
${alternates(index)}
<link rel="alternate" hreflang="x-default" href="${base}/en/${pages.en[index][0]}/">
<meta property="og:type" content="website"><meta property="og:site_name" content="Firma Total">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}"><meta name="twitter:card" content="summary">
<link rel="icon" type="image/png" sizes="512x512" href="/chapalab-mark.png"><link rel="stylesheet" href="/seo.css">
<script type="application/ld+json">${schema}</script>
</head>
<body>
<header class="header"><a class="brand" href="/?lang=${code}">firma<span>total.</span></a><b>·</b><a class="lab" href="https://www.chapalab.com"><img src="/chapalab-mark.png" alt="" width="28" height="28"> CHAPALAB.COM</a><nav class="nav"><a href="/?lang=${code}#how">${esc(dict.how)}</a><a href="/?lang=${code}#privacy">${esc(dict.privacy)}</a><a href="/?lang=${code}#tool">${esc(dict.heroCta)}</a></nav></header>
<main>
<section class="hero"><div class="copy"><p class="eyebrow">${esc(dict.heroKicker)}</p><h1>${esc(title)}</h1><p class="lead">${esc(description)}</p><a class="cta" href="/?lang=${code}#tool">${esc(dict.heroCta)} ↓</a></div><div class="art" aria-hidden="true"><div class="collar"></div><div class="tie"></div><div class="nib"></div></div></section>
<section class="proof"><p class="eyebrow">FIRMA TOTAL · LOCAL PDF WORKBENCH</p><h2>${esc(dict.toolTitle)}</h2><div class="grid">${proof.map((text, i) => `<article><strong>0${i+1} · ${esc(labels[code][i])}</strong><p>${esc(text)}</p></article>`).join("")}</div></section>
<section class="legal"><div><p class="eyebrow">PAdES · VISIBLE SIGNATURE</p><h2>${esc(dict.legalTitle)}</h2></div><p>${esc(dict.legalBody)} ${esc(jurisdiction[code])}</p></section>
<section class="related"><h2>${esc(dict.how)}</h2><div class="links">${siblingLinks}<a href="/?lang=${code}#tool">${esc(dict.heroCta)} →</a></div></section>
</main>
<footer><div class="manifesto"><span>${esc(dict.local)}</span><i>·</i><span>${esc(dict.noAccount)}</span><i>·</i><span>${esc(dict.pades)}</span></div><div class="footer"><a class="brand" href="/?lang=${code}">firma<span>total.</span></a><p>${esc(dict.footerTagline)}</p><nav><a class="footer-lab" href="https://www.chapalab.com"><img src="/chapalab-mark.png" alt="" width="22" height="22"> CHAPALAB.COM</a><a href="https://github.com/Oteros/firmatotal" target="_blank" rel="noreferrer">${esc(dict.sourceCode)} ↗</a><a href="/?lang=${code}#how">${esc(dict.how)}</a><a href="/?lang=${code}#privacy">${esc(dict.privacy)}</a></nav></div></footer>
</body></html>`;
}

await Promise.all(Object.entries(pages).flatMap(([code, entries]) =>
  entries.map(async ([slug], index) => {
    const directory = path.join(publicDir, code, slug);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "index.html"), pageHtml(code, index), "utf8");
  })));

const urls = Object.entries(pages).flatMap(([code, entries]) =>
  entries.map(([slug], index) => {
    const loc = `${base}/${code}/${slug}/`;
    const links = languages.map(({ code: altCode, htmlLang }) =>
      `<xhtml:link rel="alternate" hreflang="${htmlLang}" href="${base}/${altCode}/${pages[altCode][index][0]}/"/>`).join("");
    return `<url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${index === 1 ? "0.9" : "0.8"}</priority>${links}</url>`;
  }));
urls.unshift(`<url><loc>${base}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
await fs.writeFile(path.join(publicDir, "sitemap.xml"), sitemap, "utf8");
console.log(`Generated ${urls.length} sitemap URLs and ${urls.length - 1} localized landing pages.`);
