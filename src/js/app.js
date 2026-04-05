/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt der Anwendung (Bootstrapping)
 *
 * Problem, das wir hier abfangen:
 * - Leaflet wird als klassisches <script> geladen (window.L).
 * - Unsere App läuft als ES-Module.
 * - Je nach Timing kann das Module früher laufen als Leaflet → Karte bleibt leer.
 *
 * Lösung:
 * - Wir warten aktiv, bis window.L verfügbar ist, bevor wir initMapLogic() aufrufen.
 * ==========================================================================================
 */

import { initMapLogic } from './map.js';
import { initI18n, updatePageLanguage } from './i18n.js';
import { setupUI, showNotification } from './ui.js';
// export.js wird jetzt lazy bei Bedarf geladen (siehe Zeile 63)
import { State } from './state.js';

/**
 * Wartet, bis Leaflet (window.L) verfügbar ist.
 * Das macht die App robust gegen Script-Lade-Reihenfolge und langsame Netze.
 */
async function waitForLeaflet({ timeoutMs = 8000, intervalMs = 50 } = {}) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (window.L && typeof window.L.map === 'function') return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('[OpenFireMapV2] App startet...');

    // 1) i18n (Default: de, Fallback: en)
    await initI18n();
    updatePageLanguage();

    // 2) UI initialisieren
    setupUI();

    // 3) Leaflet sicher verfügbar machen
    const leafletOk = await waitForLeaflet();
    if (!leafletOk) {
      const msg =
        'Leaflet wurde nicht geladen. Prüfe index.html (leaflet.js) und den Pfad unter assets/vendor/leaflet/.';
      console.error('[OpenFireMapV2]', msg);
      showNotification(msg, 8000);
      return;
    }

    // 4) Karte starten
    initMapLogic();

    // 5) Export-Logik lazy laden (jspdf + html2canvas werden erst jetzt geholt)
    if (State.map) {
      const exportModule = await import('./export.js');
      exportModule.initSelectionLogic();
    } else {
      const msg = 'Karte wurde nicht initialisiert (State.map ist leer).';
      console.error('[OpenFireMapV2]', msg);
      showNotification(msg, 8000);
    }
  } catch (err) {
    console.error('[OpenFireMapV2] Fataler Fehler beim Start:', err);
    showNotification(`Startfehler: ${err?.message ?? String(err)}`, 8000);
  }

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('[SW] Service Worker registriert');
    } catch (e) {
      console.warn('[SW] Fehler bei Registrierung:', e);
    }
  }

  // Persistenten Speicher anfordern (verhindert aggressive IndexedDB-Löschung durch iOS Safari)
  // Gibt true zurück wenn gewährt (z.B. PWA auf dem Home Screen), false im Browser-Modus.
  if (navigator.storage && typeof navigator.storage.persist === 'function') {
    navigator.storage.persist().then(granted => {
      console.log('[Storage] Persistent storage granted:', granted);
    }).catch(e => {
      console.warn('[Storage] persist() nicht verfügbar:', e);
    });
  }
});
