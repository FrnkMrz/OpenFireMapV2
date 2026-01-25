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
import { initSelectionLogic } from './export.js';
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

    // 5) Export-Logik nur, wenn Karte existiert
    if (State.map) {
      initSelectionLogic();
    } else {
      const msg = 'Karte wurde nicht initialisiert (State.map ist leer).';
      console.error('[OpenFireMapV2]', msg);
      showNotification(msg, 8000);
    }
  } catch (err) {
    console.error('[OpenFireMapV2] Fataler Fehler beim Start:', err);
    showNotification(`Startfehler: ${err?.message ?? String(err)}`, 8000);
  }
});
