// DPR-Skalierung für Android-High-DPI-Displays.
// Läuft synchron im <head> vor dem ersten Rendern. Bewusst eine eigene Datei statt Inline-Skript,
// damit die Content Security Policy (script-src 'self') ohne 'unsafe-inline' auskommt.
// Ungehashte Datei: sw.js liefert .js cache-first aus, bei Änderungen dort CACHE_NAME erhöhen.
document.documentElement.style.setProperty('--dpr', Math.max(1, window.devicePixelRatio || 1));
if (/Android/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-android');
}
