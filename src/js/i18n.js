/**
 * ==========================================================================================
 * DATEI: i18n.js (Internationalisierung / Sprache)
 * ZWECK: Verwaltet die Sprachauswahl und tauscht Texte auf der Webseite aus.
 * LERN-ZIEL: Modularisierung - Trennung von Daten (dictionary.js) und Logik (hier).
 * ==========================================================================================
 */

// WICHTIG: Wir holen uns das Wörterbuch aus der externen Datei!
import { dictionary } from './dictionary.js';

/* =============================================================================
   LOGIK: WELCHE SPRACHE SOLL GENUTZT WERDEN?
   ============================================================================= */

// 1. Browser-Sprache ermitteln und normalisieren (z.B. "zh-TW", "en-US")
const userLangFull = (navigator.language || navigator.userLanguage).toLowerCase(); 
const userLangShort = userLangFull.split('-')[0]; // Nur "zh", "en", "de"

// 2. Entscheidung treffen
let currentLang = 'en'; // Fallback ist Englisch

// SPEZIAL-CHECK: Zuerst prüfen wir auf spezifische Regionen (Hongkong, Taiwan, Macau)
// Das behebt das Problem, dass Taiwan/HK sonst fälschlich als "zh" (China) erkannt werden.
const regionMap = {
    'zh-tw': 'tw',   // Taiwan -> Traditionelles Chinesisch (tw)
    'zh-hk': 'yue',  // Hongkong -> Kantonesisch (yue)
    'zh-mo': 'yue',  // Macau -> Kantonesisch (yue)
    'zh-hant': 'tw', // Generisch Traditionell -> Taiwan (tw)
    'zh-hans': 'zh'  // Generisch Vereinfacht -> China (zh)
};

if (dictionary[regionMap[userLangFull]]) {
    // Treffer 1: Wir haben eine direkte Regions-Zuordnung (z.B. zh-tw -> tw)
    currentLang = regionMap[userLangFull];
} 
else if (dictionary[userLangFull]) {
    // Treffer 2: Die Sprache existiert exakt so im Wörterbuch (z.B. 'pt-br')
    currentLang = userLangFull;
} 
else if (dictionary[userLangShort]) {
    // Treffer 3: Fallback auf die Hauptsprache (z.B. de-AT -> de, zh-CN -> zh)
    currentLang = userLangShort;
}

// Debugging (damit du in der Konsole siehst, welche Sprache gewählt wurde)
console.log(`Spracherkennung: Browser='${userLangFull}' -> App='${currentLang}'`);

/* =============================================================================
   EXPORTIERTE FUNKTIONEN (Die von anderen Dateien benutzt werden)
   ============================================================================= */

/**
 * Übersetzt einen Schlüssel in die aktuelle Sprache.
 * @param {string} key - Der Schlüssel (z.B. "zoom_info")
 * @returns {string} - Der übersetzte Text (z.B. "ZOOM")
 */
export function t(key) {
    // Versuche Sprache -> Fallback Englisch -> Fallback Schlüsselname
    return dictionary[currentLang]?.[key] || dictionary['en']?.[key] || key;
}

/**
 * Geht durch die ganze Webseite und tauscht die Texte aus.
 * Sucht nach Elementen mit 'data-i18n="..."'.
 */
export function updatePageLanguage() {
    // 1. Sprache im HTML-Tag setzen (WICHTIG für Asiatische Fonts & Screenreader!)
    document.documentElement.lang = currentLang; 
    
    // 2. CSS-Klasse für asiatische Schriftarten setzen
    // Wir prüfen hier auch auf 'tw' und 'yue' für die neuen Regionen
    if (['zh', 'ja', 'ko', 'th', 'tw', 'yue'].includes(currentLang)) {
        document.body.classList.add('asian-font');
    } else {
        document.body.classList.remove('asian-font');
    }

    // 3. Normale Texte tauschen
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerText = t(key);
    });
    
    // Tooltips (Titel beim Maus-Drüberfahren)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });
    
    // Platzhalter in Eingabefeldern (z.B. Suche)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

/**
 * Gibt den aktuellen Sprachcode zurück (z.B. 'de').
 * Wichtig für das Datumsformat beim Export.
 */
export function getLang() { 
    return currentLang; 
}