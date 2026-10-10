/**
 * ==========================================================================================
 * DATEI: data-status.js
 * ZWECK: Verwaltung und Anzeige von Datenstand, Datenherkunft und Live-Aktualität (Desktop)
 * ==========================================================================================
 */

import { State } from './state.js';
import { t } from './i18n.js';

/**
 * Formatiert eine Zeitdifferenz in eine kompakte relative Angabe (z. B. "vor 1 T.", "vor 2 Std.").
 * @param {string|number|Date} isoOrTimestamp 
 * @returns {string}
 */
export function formatRelativeAge(isoOrTimestamp) {
  if (!isoOrTimestamp) return '';
  const time = typeof isoOrTimestamp === 'number'
    ? isoOrTimestamp
    : new Date(isoOrTimestamp).getTime();
  if (isNaN(time)) return '';

  const diffMs = Math.max(0, Date.now() - time);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return t('time_just_now');
  }
  if (diffMinutes < 60) {
    return t('time_minutes_ago').replace('{n}', String(diffMinutes));
  }
  if (diffHours < 24) {
    return t('time_hours_ago').replace('{n}', String(diffHours));
  }
  return t('time_days_ago').replace('{n}', String(diffDays));
}

/**
 * Formatiert einen UTC-Zeitstempel (z. B. "2026-10-08T20:20:21Z") in ein lesbares UTC-Datum.
 * @param {string} isoString 
 * @returns {string}
 */
export function formatAbsoluteUtc(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year}, ${hours}:${minutes} UTC`;
  } catch {
    return String(isoString);
  }
}

/**
 * Aktualisiert den Datenstatus im globalen State und rendert die UI.
 * @param {Object} [partial] 
 */
export function updateDataStatus(partial = {}) {
  if (partial && State.dataStatus) {
    Object.assign(State.dataStatus, partial);
  }
  renderDataStatus();
}

/**
 * Aktualisiert die Darstellung von #data-status und den Feldern im Popover.
 */
export function renderDataStatus() {
  const statusEl = document.getElementById('data-status');
  const ds = State.dataStatus;
  if (!ds) return;

  // 1. Text und Farbe für #data-status
  if (statusEl) {
    if (ds.loadPhase === 'standby') {
      statusEl.innerText = t('status_standby');
      statusEl.className = 'text-green-400';
    } else if (ds.loadPhase === 'waiting') {
      statusEl.innerText = t('status_waiting');
      statusEl.className = 'text-amber-400 font-bold';
    } else if (ds.loadPhase === 'loading') {
      statusEl.innerText = t('status_loading');
      statusEl.className = 'text-blue-400';
    } else if (ds.loadPhase === 'ready') {
      if (ds.source === 'pipeline') {
        const baseAge = ds.baseTimestamp ? formatRelativeAge(ds.baseTimestamp) : '';
        if (ds.deltaStatus === 'success') {
          statusEl.innerText = baseAge
            ? `${t('status_base_prefix')} ${baseAge} (+Sync)`
            : `${t('status_current')} (+Sync)`;
          statusEl.className = 'text-green-400 font-bold';
        } else if (ds.deltaStatus === 'loading') {
          statusEl.innerText = baseAge
            ? `${t('status_base_prefix')} ${baseAge} (Sync...)`
            : `${t('status_current')} (Sync...)`;
          statusEl.className = 'text-blue-400 font-bold';
        } else {
          // Delta nicht verfügbar / aus / fehlgeschlagen: Zeige Alter des Basis-Datenstands
          if (baseAge) {
            statusEl.innerText = `${t('status_base_prefix')} ${baseAge}`; // "Stand: vor 1 T."
            statusEl.className = 'text-green-400 font-bold';
          } else {
            statusEl.innerText = t('status_current');
            statusEl.className = 'text-green-400 font-bold';
          }
        }
      } else if (ds.source === 'overpass') {
        statusEl.innerText = t('status_live'); // "LIVE"
        statusEl.className = 'text-green-400 font-bold';
      } else if (ds.source === 'cache') {
        const age = formatRelativeAge(ds.cacheTimestamp);
        statusEl.innerText = age ? `${t('from_cache')} (${age})` : t('from_cache');
        statusEl.className = 'text-blue-400';
      } else {
        statusEl.innerText = t('status_current');
        statusEl.className = 'text-green-400 font-bold';
      }
    }
  }

  // 2. Felder im Popover (#data-info-popover) aktualisieren
  const sourceValEl = document.getElementById('data-info-source-val');
  const baseValEl = document.getElementById('data-info-base-val');
  const baseSubEl = document.getElementById('data-info-base-sub');
  const deltaValEl = document.getElementById('data-info-delta-val');
  const deltaSubEl = document.getElementById('data-info-delta-sub');

  if (sourceValEl) {
    if (ds.source === 'pipeline') {
      sourceValEl.textContent = t('data_source_pipeline');
    } else if (ds.source === 'overpass') {
      sourceValEl.textContent = t('data_source_overpass');
    } else if (ds.source === 'cache') {
      sourceValEl.textContent = t('data_source_cache');
    } else {
      sourceValEl.textContent = '–';
    }
  }

  if (baseValEl) {
    if (ds.source === 'pipeline' && ds.baseTimestamp) {
      const abs = formatAbsoluteUtc(ds.baseTimestamp);
      const rel = formatRelativeAge(ds.baseTimestamp);
      baseValEl.textContent = `${abs} (${rel})`;
      if (baseSubEl) baseSubEl.textContent = t('data_base_sub_geofabrik');
    } else if (ds.source === 'overpass') {
      baseValEl.textContent = t('data_source_overpass_desc');
      if (baseSubEl) baseSubEl.textContent = '–';
    } else if (ds.source === 'cache' && ds.cacheTimestamp) {
      baseValEl.textContent = formatRelativeAge(ds.cacheTimestamp);
      if (baseSubEl) baseSubEl.textContent = '–';
    } else {
      baseValEl.textContent = '–';
      if (baseSubEl) baseSubEl.textContent = '–';
    }
  }

  if (deltaValEl) {
    if (ds.source === 'pipeline') {
      if (ds.deltaStatus === 'success') {
        deltaValEl.textContent = `✅ ${t('data_sync_active')}`;
        deltaValEl.className = 'text-green-400 font-medium';
        if (deltaSubEl) {
          deltaSubEl.textContent = ds.deltaCount > 0
            ? t('data_sync_delta_updated').replace('{count}', String(ds.deltaCount))
            : t('data_sync_delta_none');
        }
      } else if (ds.deltaStatus === 'loading') {
        deltaValEl.textContent = `⏳ ${t('data_sync_loading')}`;
        deltaValEl.className = 'text-blue-400 font-medium';
        if (deltaSubEl) deltaSubEl.textContent = t('data_sync_checking');
      } else if (ds.deltaStatus === 'failed') {
        deltaValEl.textContent = `⚠️ ${t('data_sync_unavailable')}`;
        deltaValEl.className = 'text-amber-400 font-medium';
        if (deltaSubEl) deltaSubEl.textContent = t('data_sync_offline_or_failed');
      } else if (ds.deltaStatus === 'disabled') {
        deltaValEl.textContent = `⚪ ${t('data_sync_disabled')}`;
        deltaValEl.className = 'text-slate-400 font-medium';
        if (deltaSubEl) deltaSubEl.textContent = t('data_sync_disabled_hint');
      } else {
        deltaValEl.textContent = '–';
        deltaValEl.className = 'text-slate-400 font-medium';
        if (deltaSubEl) deltaSubEl.textContent = '–';
      }
    } else if (ds.source === 'overpass') {
      deltaValEl.textContent = `✅ ${t('data_sync_direct')}`;
      deltaValEl.className = 'text-green-400 font-medium';
      if (deltaSubEl) deltaSubEl.textContent = t('data_sync_osm_direct');
    } else {
      deltaValEl.textContent = '–';
      deltaValEl.className = 'text-slate-400 font-medium';
      if (deltaSubEl) deltaSubEl.textContent = '–';
    }
  }
}

/**
 * Schließt das Popover für den Datenstand.
 */
export function closeDataInfoPopover() {
  const popover = document.getElementById('data-info-popover');
  const btn = document.getElementById('data-info-btn');
  if (popover) popover.classList.add('hidden');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

/**
 * Öffnet oder schließt das Popover für den Datenstand.
 * @param {boolean} [show] 
 */
export function toggleDataInfoPopover(show) {
  const popover = document.getElementById('data-info-popover');
  const btn = document.getElementById('data-info-btn');
  if (!popover) return;

  const isHidden = popover.classList.contains('hidden');
  const willShow = (typeof show === 'boolean') ? show : isHidden;

  if (willShow) {
    // Andere Menüs schließen und ARIA-Zustände sauber zurücksetzen
    ['layer-menu', 'export-menu'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
    const layerBtn = document.getElementById('layer-btn-trigger');
    if (layerBtn) {
      layerBtn.setAttribute('aria-expanded', 'false');
      layerBtn.setAttribute('aria-label', t('menu_layers_open'));
    }
    const exportBtn = document.getElementById('export-btn-trigger');
    if (exportBtn) {
      exportBtn.setAttribute('aria-expanded', 'false');
      exportBtn.setAttribute('aria-label', t('menu_export_open'));
    }
    const legal = document.getElementById('legal-modal');
    if (legal) legal.style.display = 'none';

    renderDataStatus();
    popover.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  } else {
    popover.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Initialisiert die Event-Listener für das Datenstand-Popover (Desktop).
 */
export function initDataStatusUI() {
  const btn = document.getElementById('data-info-btn');
  const closeBtn = document.getElementById('data-info-close-btn');
  const legalLink = document.getElementById('data-info-legal-link');
  const popover = document.getElementById('data-info-popover');
  const statusBox = document.getElementById('status-box');

  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDataInfoPopover();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDataInfoPopover();
    });
  }

  if (legalLink) {
    legalLink.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDataInfoPopover();
      document.getElementById('btn-legal-trigger')?.click();
    });
  }

  // Escape-Taste schließt Popover
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (popover && !popover.classList.contains('hidden')) {
        closeDataInfoPopover();
        btn?.focus();
      }
    }
  });

  // Klick außerhalb schließt Popover
  document.addEventListener('click', (e) => {
    if (!popover || popover.classList.contains('hidden')) return;
    const target = e.target;
    if (!popover.contains(target) && !statusBox?.contains(target)) {
      closeDataInfoPopover();
    }
  });

  // Sprachwechsel beachten
  window.addEventListener('ofm:langchange', () => {
    renderDataStatus();
  });

  // Initiale Darstellung
  renderDataStatus();
}
