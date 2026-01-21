/**
 * ==========================================================================================
 * DATEI: i18n.js (Internationalisierung)
 * ZWECK: Mehrsprachigkeit
 * ==========================================================================================
 */

// HIER DEINE ÜBERSETZUNGEN EINFÜGEN (Kopiere den Inhalt aus deiner alten translations.js)
const dictionary = {
    de: {
        search_placeholder: "Ort suchen...",
        status_loading: "LÄDT...",
        status_current: "AKTUELL",
        status_standby: "STANDBY (Zoom < 12)",
        status_waiting: "WARTE...",
        err_generic: "Fehler beim Laden.",
        err_ratelimit: "Zu viele Anfragen!",
        err_timeout: "Server überlastet.",
        err_offline: "Kein Internet.",
        no_results: "Ort nicht gefunden",
        geo_error: "GPS Fehler",
        geo_found: "Standort gefunden",
        geo_fail: "Standort nicht ermittelbar",
        drag_area: "Bereich ziehen",
        no_objects: "Keine Objekte",
        gpx_success: "GPX exportiert",
        too_large: "Bereich zu groß!",
        locating: "Lokalisiere...",
        loading_tiles: "Lade Kacheln...",
        render_bounds: "Rendere Grenzen...",
        render_infra: "Rendere Infrastruktur...",
        layout_final: "Finalisiere Layout...",
        plan_title: "Hydrantenplan",
        legend_date: "Stand",
        legend_res: "Auflösung",
        details: "Details",
        defib: "Defibrillator",
        station: "Feuerwache",
        hydrant: "Hydrant"
    },
    en: {
        search_placeholder: "Search location...",
        status_loading: "LOADING...",
        status_current: "CURRENT",
        status_standby: "STANDBY (Zoom < 12)",
        status_waiting: "WAITING...",
        err_generic: "Error loading data.",
        err_ratelimit: "Too many requests!",
        err_timeout: "Server overload.",
        err_offline: "No internet.",
        no_results: "Location not found",
        geo_error: "GPS Error",
        geo_found: "Location found",
        geo_fail: "Location failed",
        drag_area: "Draw area",
        no_objects: "No objects",
        gpx_success: "GPX exported",
        too_large: "Area too large!",
        locating: "Locating...",
        loading_tiles: "Loading tiles...",
        render_bounds: "Rendering bounds...",
        render_infra: "Rendering infrastructure...",
        layout_final: "Finalizing layout...",
        plan_title: "Hydrant Map",
        legend_date: "Date",
        legend_res: "Resolution",
        details: "Details",
        defib: "Defibrillator",
        station: "Fire Station",
        hydrant: "Hydrant"
    }
};

const userLangFull = navigator.language || navigator.userLanguage; 
const userLangShort = userLangFull.split('-')[0].toLowerCase();
let currentLang = 'en';

if (dictionary[userLangShort]) {
    currentLang = userLangShort;
}

export function t(key) {
    return dictionary[currentLang]?.[key] || dictionary['en']?.[key] || key;
}

export function updatePageLanguage() {
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

export function getLang() { return currentLang; }