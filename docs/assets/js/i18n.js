/**
 * ==========================================================================================
 * DATEI: i18n.js (Internationalisierung / Sprache)
 * ZWECK: Sprachauswahl + Textaustausch auf der Webseite.
 *
 * Regeln:
 * - Default: Deutsch (de)
 * - Fallback: Englisch (en)
 * - Weitere Sprachen: src/js/lang/<code>.js (optional, darf unvollständig sein)
 * ==========================================================================================
 */

const DEFAULT_LANG = 'de';
const FALLBACK_LANG = 'en';

let currentLang = DEFAULT_LANG;
let currentDict = null;
let fallbackDict = null;

/**
 * Aus einer Browser-Sprache (z.B. "de-DE") den Code ableiten.
 * - Erst exakte Treffer versuchen (de-de)
 * - Dann Short-Code (de)
 * - Dann Default
 */
function detectLangCode() {
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang) return urlLang.toLowerCase();

  const stored = localStorage.getItem('ofm_lang');
  if (stored) return stored.toLowerCase();

  const full = (navigator.language || navigator.userLanguage || DEFAULT_LANG).toLowerCase();
  return full;
}

async function loadLangDict(code) {
  // unterstützt z.B. de, en, pt, pt-br
  const clean = (code || '').toLowerCase();

  // 1) exakter Import (de-de)
  try {
    const mod = await import(`./lang/${clean}.js`);
    return mod.strings || mod.default || null;
  } catch (_) {}

  // 2) short-code Import (de)
  const short = clean.split('-')[0];
  if (short && short !== clean) {
    try {
      const mod = await import(`./lang/${short}.js`);
      return mod.strings || mod.default || null;
    } catch (_) {}
  }

  return null;
}

/**
 * Initialisiert i18n. Muss einmal beim App-Start laufen.
 */
export async function initI18n() {
  // Fallback immer laden (damit t() immer etwas liefern kann)
  fallbackDict = await loadLangDict(FALLBACK_LANG);

  // Zielsprache bestimmen
  const detected = detectLangCode();
  const detectedDict = await loadLangDict(detected);

  if (detectedDict) {
    currentLang = detected.includes('-') ? detected.split('-')[0] : detected;
    currentDict = detectedDict;
  } else {
    currentLang = DEFAULT_LANG;
    currentDict = await loadLangDict(DEFAULT_LANG);
  }

  // wenn de-Datei fehlt: hart auf fallback
  if (!currentDict) {
    currentLang = FALLBACK_LANG;
    currentDict = fallbackDict || {};
  }

  console.log(`Sprache: app='${currentLang}' (fallback='${FALLBACK_LANG}')`);
}

/**
 * Sprache wechseln (z.B. aus einem Dropdown).
 * Speichert die Wahl in localStorage.
 */
export async function setLang(code) {
  const dict = await loadLangDict(code);
  if (!dict) return false;

  currentLang = (code || '').toLowerCase().split('-')[0] || DEFAULT_LANG;
  currentDict = dict;

  localStorage.setItem('ofm_lang', currentLang);
  updatePageLanguage();
  return true;
}

/**
 * Übersetzt einen Schlüssel in die aktuelle Sprache.
 * Fallback: Englisch -> Key selbst
 */
export function t(key) {
  if (!key) return '';
  return (currentDict?.[key] ?? fallbackDict?.[key] ?? key);
}

/**
 * Tauscht Texte im DOM aus.
 * - data-i18n="key"        -> innerText
 * - data-i18n-title="key"  -> title
 * - data-i18n-placeholder  -> placeholder
 */
export function updatePageLanguage() {
  document.documentElement.lang = currentLang;

  // Asiatische Fonts (bleibt als Feature)
  if (['zh', 'ja', 'ko', 'th', 'tw', 'yue'].includes(currentLang)) {
    document.body.classList.add('asian-font');
  } else {
    document.body.classList.remove('asian-font');
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerText = t(el.getAttribute('data-i18n'));
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
}

/**
 * Gibt den aktuellen Sprachcode zurück (z.B. 'de').
 */
export function getLang() {
  return currentLang;
}
