import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createTranslator, languages, resolveLocale } from "./i18n.js";
import {
  applyVisualSignatures,
  downloadPdf,
} from "./lib/pdf-tools.js";
import { hasAutoFirmaBridge, signWithAutoFirma } from "./lib/autofirma.js";

GlobalWorkerOptions.workerSrc = workerUrl;

const DATE_FORMATS = {
  ar: "ar", bar: "de", ca: "ca", de: "de", en: "en-US", es: "es",
  eu: "eu", fr: "fr", gl: "gl", hi: "hi", it: "it", ja: "ja",
  pt: "pt", ur: "ur", zh: "zh-CN",
};

function makeTypedSignature(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#102b2b";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "220px Allura, cursive";
  ctx.fillText(text.trim(), canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL("image/png");
}

function Header({ locale, setLocale, t }) {
  return (
    <header className="site-header">
      <a className="brand" href={`/?lang=${locale}`} aria-label="Firma Total">
        <span className="brand-firma">firma</span><span>total.</span>
      </a>
      <span className="header-dash" aria-hidden="true">·</span>
      <a className="lab-mark" href="https://www.chapalab.com" rel="noreferrer">
        <span className="lab-seal" aria-hidden="true">✺</span> CHAPALAB.COM
      </a>
      <nav aria-label="Primary">
        <a href="#how">{t("how")}</a>
        <a href="#privacy">{t("privacy")}</a>
        <label className="language-label">
          <span className="sr-only">Language</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value)}
            aria-label="Language"
          >
            {languages.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </header>
  );
}

function Footer({ t }) {
  return (
    <footer>
      <div className="manifesto" aria-label="Privacy principles">
        <span>{t("local")}</span><i>·</i><span>{t("noAccount")}</span>
        <i>·</i><span>{t("pades")}</span>
      </div>
      <div className="footer-bottom">
        <a className="brand compact" href="#top"><span className="brand-firma">firma</span><span>total.</span></a>
        <p>{t("footerTagline")}</p>
        <div><a href="#how">{t("how")}</a><a href="#privacy">{t("privacy")}</a></div>
      </div>
    </footer>
  );
}

function SignaturePad({ t, onSignature }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState("draw");
  const [typed, setTyped] = useState("");
  const [hasInk, setHasInk] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    if (canvas.width === Math.round(rect.width * ratio)) return;
    const old = canvas.toDataURL();
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = "#102b2b";
    if (hasInk) {
      const image = new Image();
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
      image.src = old;
    }
  }, [hasInk]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  const point = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event) => {
    event.preventDefault();
    drawing.current = true;
    canvasRef.current.setPointerCapture(event.pointerId);
    const ctx = canvasRef.current.getContext("2d");
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (event) => {
    if (!drawing.current) return;
    const p = point(event);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const end = () => { drawing.current = false; };
  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onSignature(null);
  };
  const useCurrent = () => {
    if (mode === "draw" && hasInk) onSignature(canvasRef.current.toDataURL("image/png"));
    if (mode === "type" && typed.trim()) onSignature(makeTypedSignature(typed));
  };
  const upload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onSignature(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <section className="card signature-card">
      <div className="step-number">02</div>
      <h2>{t("signatureTitle")}</h2>
      <div className="tabs" role="tablist">
        {["draw", "type", "upload"].map((tab) => (
          <button key={tab} type="button" className={mode === tab ? "active" : ""}
            onClick={() => setMode(tab)} role="tab" aria-selected={mode === tab}>
            {t(tab)}
          </button>
        ))}
      </div>
      {mode === "draw" && (
        <div className="pad-wrap">
          <canvas ref={canvasRef} className="signature-pad" onPointerDown={start}
            onPointerMove={move} onPointerUp={end} onPointerCancel={end} />
          <span className="sign-line" aria-hidden="true" />
        </div>
      )}
      {mode === "type" && (
        <input className="typed-signature" value={typed} onChange={(e) => setTyped(e.target.value)}
          placeholder={t("typePlaceholder")} />
      )}
      {mode === "upload" && (
        <label className="file-box slim">
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
          <span className="nib-small" aria-hidden="true">♢</span>
          <strong>{t("upload")}</strong>
        </label>
      )}
      <div className="button-row">
        {mode !== "upload" && <button type="button" className="button ink" onClick={useCurrent}>{t("useSignature")}</button>}
        {mode === "draw" && <button type="button" className="text-button" onClick={clear}>{t("clear")}</button>}
      </div>
    </section>
  );
}

function PdfStage({ pdfDoc, currentPage, setCurrentPage, placements, setPlacements, signature, t }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!pdfDoc || !canvasRef.current) return;
      const page = await pdfDoc.getPage(currentPage + 1);
      const viewport = page.getViewport({ scale: 1.45 });
      const canvas = canvasRef.current;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      if (cancelled) return;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    };
    render();
    return () => { cancelled = true; };
  }, [pdfDoc, currentPage]);

  const addPlacement = (all = false) => {
    if (!pdfDoc || !signature) return;
    const pages = all ? Array.from({ length: pdfDoc.numPages }, (_, index) => index) : [currentPage];
    setPlacements((previous) => [
      ...previous,
      ...pages.map((pageIndex) => ({
        id: crypto.randomUUID(),
        pageIndex,
        x: 0.57,
        y: 0.72,
        width: 0.31,
        height: 0.12,
      })),
    ]);
  };

  const dragStart = (event, placement) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const onMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / bounds.width;
      const dy = (moveEvent.clientY - startY) / bounds.height;
      setPlacements((items) => items.map((item) => item.id === placement.id
        ? { ...item, x: Math.max(0, Math.min(1 - item.width, placement.x + dx)),
            y: Math.max(0, Math.min(1 - item.height, placement.y + dy)) }
        : item));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (!pdfDoc) {
    return <div className="empty-stage"><span>PDF</span><p>{t("choosePdf")}</p></div>;
  }

  const visible = placements.filter((placement) => placement.pageIndex === currentPage);
  return (
    <div className="stage-area">
      <div className="page-controls">
        <button type="button" onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
          disabled={currentPage === 0} aria-label={t("previous")}>←</button>
        <span>{t("page")} {currentPage + 1} / {pdfDoc.numPages}</span>
        <button type="button" onClick={() => setCurrentPage((p) => Math.min(pdfDoc.numPages - 1, p + 1))}
          disabled={currentPage === pdfDoc.numPages - 1} aria-label={t("next")}>→</button>
      </div>
      <div className="pdf-page" ref={wrapperRef}>
        <canvas ref={canvasRef} />
        {visible.map((placement) => (
          <button key={placement.id} type="button" className="placed-signature"
            style={{ left: `${placement.x * 100}%`, top: `${placement.y * 100}%`,
              width: `${placement.width * 100}%`, height: `${placement.height * 100}%` }}
            onPointerDown={(event) => dragStart(event, placement)}
            aria-label={`${t("remove")} ${t("page")} ${currentPage + 1}`}>
            <img src={signature} alt="" draggable="false" />
            <span onClick={(event) => {
              event.stopPropagation();
              setPlacements((items) => items.filter((item) => item.id !== placement.id));
            }}>×</span>
          </button>
        ))}
      </div>
      <div className="placement-actions">
        <button type="button" className="button paper" onClick={() => addPlacement(false)}
          disabled={!signature}>{t("addPlacement")}</button>
        <button type="button" className="text-button" onClick={() => addPlacement(true)}
          disabled={!signature}>{t("allPages")}</button>
      </div>
    </div>
  );
}

export default function App() {
  const [locale, setLocaleState] = useState(resolveLocale());
  const t = useMemo(() => createTranslator(locale), [locale]);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [signature, setSignature] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [signerName, setSignerName] = useState("");
  const [includeDate, setIncludeDate] = useState(true);
  const [p12File, setP12File] = useState(null);
  const [passphrase, setPassphrase] = useState("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const setLocale = (next) => {
    setLocaleState(next);
    localStorage.setItem("firmatotal-language", next);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", next);
    history.replaceState({}, "", url);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = ["ar", "ur"].includes(locale) ? "rtl" : "ltr";
    document.title = `${t("heroTitle")} — Firma Total`;
  }, [locale, t]);

  const loadPdf = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const loaded = await getDocument({ data: bytes.slice() }).promise;
      setPdfFile(file);
      setPdfBytes(bytes);
      setPdfDoc(loaded);
      setCurrentPage(0);
      setPlacements([]);
      setStatus(`${file.name} · ${loaded.numPages} ${t("page")}`);
    } catch (error) {
      console.error(error);
      setStatus(t("error"));
    } finally {
      setBusy(false);
    }
  };

  const buildVisualPdf = async () => {
    if (!pdfBytes) throw new Error("No PDF selected");
    if (!signature || placements.length === 0) return pdfBytes.slice();
    return applyVisualSignatures(pdfBytes, signature, placements, {
      signerName,
      signedAt: includeDate
        ? new Intl.DateTimeFormat(DATE_FORMATS[locale] || locale, { dateStyle: "medium" }).format(new Date())
        : "",
    });
  };

  const execute = async (job) => {
    setBusy(true);
    setStatus(t("statusWorking"));
    try {
      await job();
      setStatus(t("statusDone"));
    } catch (error) {
      console.error(error);
      setStatus(`${t("error")} ${error?.message || ""}`.trim());
    } finally {
      setBusy(false);
    }
  };

  const downloadVisual = () => execute(async () => {
    const result = await buildVisualPdf();
    downloadPdf(result, pdfFile?.name, "firma-visual");
  });

  const signP12 = () => execute(async () => {
    if (!p12File) throw new Error(t("certificate"));
    const visual = await buildVisualPdf();
    const cert = new Uint8Array(await p12File.arrayBuffer());
    const { signPdfWithP12 } = await import("./lib/pades.js");
    const result = await signPdfWithP12(visual, cert, passphrase, {
      reason: reason || "Document approval",
      location,
      signerName,
      contactInfo: "",
    });
    downloadPdf(result, pdfFile?.name, "firmado-pades");
  });

  const signAuto = () => execute(async () => {
    const visual = await buildVisualPdf();
    const result = await signWithAutoFirma(visual, {
      locale,
      reason: reason || "Document approval",
      location,
    });
    downloadPdf(result, pdfFile?.name, "firmado-autofirma");
  });

  return (
    <div id="top">
      <Header locale={locale} setLocale={setLocale} t={t} />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{t("heroKicker")}</p>
            <h1>{t("heroTitle")}</h1>
            <p className="hero-lead">{t("heroLead")}</p>
            <a className="button oxblood" href="#tool">{t("heroCta")} <span>↓</span></a>
            <ul className="trust-list">
              <li>{t("local")}</li><li>{t("noAccount")}</li><li>{t("pades")}</li>
            </ul>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="collar left" /><div className="collar right" />
            <div className="tie" />
            <svg className="pen" viewBox="0 0 320 650">
              <path className="pen-body" d="M92 18h136l-18 354-50 151-50-151z" />
              <path className="pen-cut" d="M110 372h100l-50 151z" />
              <circle cx="160" cy="345" r="17" />
              <path d="M160 362v117" />
              <path className="pen-cap" d="M83 18h154v53H83z" />
            </svg>
            <span className="ink-stroke" />
          </div>
        </section>

        <section className="privacy-ribbon" id="privacy">
          <strong>{t("local")}</strong>
          <p>{t("privateNote")}</p>
        </section>

        <section className="tool-section" id="tool">
          <div className="section-heading">
            <p className="eyebrow">FIRMA TOTAL · WORKBENCH</p>
            <h2>{t("toolTitle")}</h2>
            <p>{t("toolLead")}</p>
          </div>
          <div className="workbench">
            <aside>
              <section className="card upload-card">
                <div className="step-number">01</div>
                <label className="file-box">
                  <input type="file" accept="application/pdf,.pdf" onChange={loadPdf} />
                  <span className="pdf-stamp">PDF</span>
                  <strong>{pdfFile?.name || t("choosePdf")}</strong>
                  <small>{t("privateNote")}</small>
                </label>
              </section>
              <SignaturePad t={t} onSignature={setSignature} />
            </aside>
            <section className="document-desk">
              <PdfStage pdfDoc={pdfDoc} currentPage={currentPage}
                setCurrentPage={setCurrentPage} placements={placements}
                setPlacements={setPlacements} signature={signature} t={t} />
              <div className="signature-options">
                <label><span>{t("signerName")}</span><input value={signerName} onChange={(e) => setSignerName(e.target.value)} /></label>
                <label className="check"><input type="checkbox" checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)} /> {t("includeDate")}</label>
              </div>
            </section>
          </div>
        </section>

        <section className="finish-section">
          <div className="section-heading">
            <p className="eyebrow">03 · EXPORT</p>
            <h2>{t("finishTitle")}</h2>
          </div>
          <div className="finish-grid">
            <article className="finish-card visual">
              <span className="card-mark">A</span><h3>{t("downloadVisual")}</h3>
              <p>{t("visualLead")}</p>
              <button type="button" className="button ink full" onClick={downloadVisual}
                disabled={!pdfBytes || busy}>{t("downloadVisual")}</button>
            </article>
            <article className="finish-card certificate">
              <span className="card-mark">B</span><h3>{t("p12Title")}</h3>
              <p>{t("p12Lead")}</p>
              <label><span>{t("certificate")}</span><input type="file" accept=".p12,.pfx,application/x-pkcs12"
                onChange={(e) => setP12File(e.target.files?.[0] || null)} /></label>
              <label><span>{t("passphrase")}</span><input type="password" value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)} autoComplete="off" /></label>
              <button type="button" className="button gold full" onClick={signP12}
                disabled={!pdfBytes || !p12File || busy}>{t("signP12")}</button>
              <small>{t("p12Limit")}</small>
            </article>
            <article className="finish-card autofirma">
              <span className="card-mark">ES</span><h3>{t("autoTitle")}</h3>
              <p>{t("autoLead")}</p>
              <label><span>{t("reason")}</span><input value={reason} onChange={(e) => setReason(e.target.value)} /></label>
              <label><span>{t("location")}</span><input value={location} onChange={(e) => setLocation(e.target.value)} /></label>
              <button type="button" className="button oxblood full" onClick={signAuto}
                disabled={!pdfBytes || busy}>{t("signAuto")}</button>
              <a className="install-link" href="https://firmaelectronica.gob.es/Home/Descargas.html"
                target="_blank" rel="noreferrer">{t("installAuto")} ↗</a>
              <small>{hasAutoFirmaBridge() ? t("statusReady") : t("autoLimit")}</small>
            </article>
          </div>
          <p className="status" role="status" aria-live="polite">{status}</p>
        </section>

        <section className="legal-section" id="how">
          <div className="legal-number">§</div>
          <div><p className="eyebrow">LEGAL REALITY, PLAINLY</p><h2>{t("legalTitle")}</h2></div>
          <p>{t("legalBody")}</p>
        </section>
      </main>
      <Footer t={t} />
    </div>
  );
}
