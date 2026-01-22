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

// 1. Browser-Sprache ermitteln (z.B. "de-DE" oder "en-US")
const userLangFull = navigator.language || navigator.userLanguage; 
const userLangShort = userLangFull.split('-')[0].toLowerCase(); // Nur "de" oder "en"

// 2. Entscheidung treffen
let currentLang = 'en'; // Standard ist Englisch

// Haben wir die Sprache im Wörterbuch? (z.B. "de")
if (dictionary[userLangShort]) {
    currentLang = userLangShort;
}

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
    // Normale Texte
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