/**
 * ==========================================================================================
 * FILE: app.js
 * PURPOSE: Main entry point of the application
 * ==========================================================================================
 *
 * P2.1 Runtime checks:
 * - Verify Leaflet is present (window.L)
 * - Verify config is present (window.config)
 * - Verify basic DOM anchors exist (e.g., #map)
 * - Verify i18n is initialized and language application works
 * - Initialize map + UI in a predictable order with clear error reporting
 */

import { initMapLogic } from './map.js';
import { initI18n, updatePageLanguage } from './i18n.js';
import { setupUI } from './ui.js';

import { initSelectionLogic } from './export.js';
import { State } from './state.js';

/**
 * Small helper: consistent log prefix so console output is searchable.
 */
const LOG_PREFIX = '[OpenFireMapV2]';

/**
 * Minimal runtime guardrails to fail fast on missing hard dependencies.
 * Returns true if app can continue, false if it should stop early.
 */
function runRuntimeChecks() {
  // 1) Leaflet must be loaded (otherwise map cannot be initialized at all)
  if (typeof window.L === 'undefined') {
    console.error(
      `${LOG_PREFIX} Leaflet is not loaded (window.L is undefined). ` +
        `Check index.html asset paths: assets/vendor/leaflet/leaflet.js + leaflet.css.`,
    );
    return false;
  }

  // 2) config.js must be present (your modules rely on it indirectly)
  if (typeof window.config === 'undefined') {
    console.error(
      `${LOG_PREFIX} config.js is not loaded (window.config is undefined). ` +
        `Check index.html includes config.js before app.js.`,
    );
    return false;
  }

  // 3) Map container must exist
  const mapEl = document.getElementById('map');
  if (!mapEl) {
    console.error(
      `${LOG_PREFIX} Missing #map element in DOM. ` +
        `The map cannot render without <div id="map">.`,
    );
    return false;
  }

  // Optional: warn if map container has zero height (common CSS/layout issue)
  const rect = mapEl.getBoundingClientRect();
  if (rect.height === 0) {
    console.warn(
      `${LOG_PREFIX} #map has height=0px. ` +
        `Map may appear blank. Check CSS/layout (height/positioning).`,
    );
  }

  return true;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Keep this log, but make it easy to filter.
  console.log(`${LOG_PREFIX} App starting...`);

  // Hard dependency checks first.
  if (!runRuntimeChecks()) {
    // Stop early: continuing would create confusing secondary errors.
    return;
  }

  // 1) i18n init (Default: de, fallback: en)
  try {
    await initI18n();
  } catch (err) {
    console.warn(`${LOG_PREFIX} i18n init failed. UI may show fallback strings.`, err);
  }

  // Apply translations to DOM (safe even if i18n fell back internally)
  try {
    updatePageLanguage();
  } catch (err) {
    console.warn(`${LOG_PREFIX} updatePageLanguage() failed.`, err);
  }

  // 2) Setup UI
  try {
    setupUI();
  } catch (err) {
    console.error(`${LOG_PREFIX} setupUI() failed.`, err);
    // UI failure should not necessarily block the map, so we continue.
  }

  // 3) Initialize map logic
  try {
    initMapLogic();
  } catch (err) {
    console.error(`${LOG_PREFIX} initMapLogic() failed. Map will not work.`, err);
    return; // Without a map, selection/export makes no sense
  }

  // 4) Export/selection logic (only if State.map exists)
  if (State.map) {
    try {
      initSelectionLogic();
    } catch (err) {
      console.warn(`${LOG_PREFIX} initSelectionLogic() failed. Export may not work.`, err);
    }
  } else {
    console.error(`${LOG_PREFIX} Map was not initialized (State.map is empty).`);
  }
});
