import React from "react";
import './shims/browser-buffer.js';
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { installEditorial, resolveLocale } from './i18n.js';
import fallbackEditorial from './editorial/en.json';
import "./styles.css";
const editorialLoaders = import.meta.glob(['./editorial/*.json','!./editorial/en.json'], { import: 'default' });
installEditorial('en', fallbackEditorial);
async function start() {
  const locale = resolveLocale();
  try { if (locale !== 'en') installEditorial(locale, await editorialLoaders[`./editorial/${locale}.json`]()); }
  catch (error) { console.warn('Editorial translation unavailable', error); }


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
}
start();
