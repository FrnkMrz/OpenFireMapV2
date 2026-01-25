/**
 * ==========================================================================================
 * DATEI: app.js
 * ZWECK: Haupt-Einstiegspunkt der Anwendung
 * ==========================================================================================
 */

import { initMapLogic } from './map.js';
import { initI18n, updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';

import { initSelectionLogic } from './export.js';
import { State } from './state.js';

document.addEventListener('DOMContentLoaded', async () => {
  console.log("App startet...");

  // 1) Sprache laden (Default: de, Fallback: en)
  await initI18n();
  updatePageLanguage();

  // 2) UI vorbereiten
  setupUI();

  // 3) Karte starten
  initMapLogic();

  // 4) Export-Logik initialisieren (nur wenn Karte da ist)
  if (State.map) {
    initSelectionLogic();
  } else {
    console.error("Fehler: Karte wurde nicht initialisiert!");
  }
});
