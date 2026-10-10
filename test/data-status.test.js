// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { State } from '../src/js/state.js';
import { initI18n, setLang } from '../src/js/i18n.js';
import {
  formatRelativeAge,
  formatAbsoluteUtc,
  updateDataStatus,
  renderDataStatus,
  toggleDataInfoPopover,
  closeDataInfoPopover,
  initDataStatusUI
} from '../src/js/data-status.js';

describe('data-status.js', () => {
  let nowMock;

  beforeEach(async () => {
    await initI18n();
    await setLang('de');
    // Feste Zeit für reproduzierbare Relative-Time-Tests (10.10.2026, 12:00:00 UTC)
    nowMock = new Date('2026-10-10T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(nowMock);

    // DOM vorbereiten
    document.body.innerHTML = `
      <div id="status-box">
        <span id="data-status"></span>
        <button id="data-info-btn" aria-haspopup="true" aria-expanded="false" aria-controls="data-info-popover">
          <span id="data-info-btn-text">Datenstand-Details</span>
        </button>
      </div>

      <div id="data-info-popover" class="hidden">
        <button id="data-info-close-btn">✕</button>
        <div id="data-info-source-val"></div>
        <div id="data-info-base-val"></div>
        <div id="data-info-base-sub"></div>
        <div id="data-info-delta-val"></div>
        <div id="data-info-delta-sub"></div>
        <button id="data-info-legal-link">Mehr</button>
      </div>

      <div id="layer-menu" class="hidden"></div>
      <button id="layer-btn-trigger" aria-expanded="false" aria-label="Ebenen öffnen"></button>
      <div id="export-menu" class="hidden"></div>
      <button id="export-btn-trigger" aria-expanded="false" aria-label="Exportieren"></button>

      <button id="btn-legal-trigger"></button>
    `;

    // State zurücksetzen
    State.dataStatus = {
      source: 'none',
      baseTimestamp: null,
      generatedAt: null,
      deltaStatus: 'none',
      deltaTimestamp: null,
      deltaCount: 0,
      cacheTimestamp: null,
      loadPhase: 'idle'
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('formatRelativeAge', () => {
    it('liefert leeren String bei ungültigen oder leeren Eingaben', () => {
      expect(formatRelativeAge(null)).toBe('');
      expect(formatRelativeAge(undefined)).toBe('');
      expect(formatRelativeAge('')).toBe('');
      expect(formatRelativeAge('invalid-date')).toBe('');
    });

    it('formatiert "gerade eben" bei weniger als 1 Minute Differenz', () => {
      const recent = nowMock - 30 * 1000; // vor 30s
      expect(formatRelativeAge(recent)).toBe('gerade eben');
    });

    it('formatiert "vor {n} Min." bei unter 60 Minuten', () => {
      const fiveMinAgo = nowMock - 5 * 60 * 1000;
      expect(formatRelativeAge(fiveMinAgo)).toBe('vor 5 Min.');
    });

    it('formatiert "vor {n} Std." bei unter 24 Stunden', () => {
      const threeHoursAgo = nowMock - 3 * 3600 * 1000;
      expect(formatRelativeAge(threeHoursAgo)).toBe('vor 3 Std.');
    });

    it('formatiert "vor 1 T." bei ca. einem Tag', () => {
      const oneDayAgo = nowMock - 25 * 3600 * 1000;
      expect(formatRelativeAge(oneDayAgo)).toBe('vor 1 T.');
    });

    it('formatiert "vor {n} T." bei mehreren Tagen', () => {
      const twoDaysAgo = nowMock - 49 * 3600 * 1000;
      expect(formatRelativeAge(twoDaysAgo)).toBe('vor 2 T.');
    });

    it('akzeptiert auch ISO-Strings', () => {
      // 1 Tag vorher = 2026-10-09T12:00:00Z
      expect(formatRelativeAge('2026-10-09T12:00:00Z')).toBe('vor 1 T.');
    });
  });

  describe('formatAbsoluteUtc', () => {
    it('formatiert ISO-Zeitstempel sauber in Tag.Monat.Jahr, HH:mm UTC', () => {
      expect(formatAbsoluteUtc('2026-10-08T20:20:21Z')).toBe('08.10.2026, 20:20 UTC');
      expect(formatAbsoluteUtc('2026-01-05T08:05:00Z')).toBe('05.01.2026, 08:05 UTC');
    });

    it('behandelt leere oder ungültige Werte sicher', () => {
      expect(formatAbsoluteUtc('')).toBe('');
      expect(formatAbsoluteUtc(null)).toBe('');
    });
  });

  describe('renderDataStatus & updateDataStatus', () => {
    it('zeigt Standby bei Zoom < 12', () => {
      updateDataStatus({ loadPhase: 'standby' });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('STANDBY (Zoom < 12)');
      expect(el.className).toContain('text-green-400');
    });

    it('zeigt Warten-Status', () => {
      updateDataStatus({ loadPhase: 'waiting' });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('WARTE AUF DATEN...');
      expect(el.className).toContain('text-amber-400');
    });

    it('zeigt Laden-Status', () => {
      updateDataStatus({ loadPhase: 'loading' });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('LÄDT...');
      expect(el.className).toContain('text-blue-400');
    });

    it('zeigt Basis-Stand mit (+Sync) bei erfolgreichem Pipeline-Delta', () => {
      updateDataStatus({
        source: 'pipeline',
        baseTimestamp: '2026-10-09T12:00:00Z',
        deltaStatus: 'success',
        deltaCount: 3,
        loadPhase: 'ready'
      });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('Stand: vor 1 T. (+Sync)');
      expect(el.className).toContain('text-green-400');

      // Popover-Felder prüfen
      expect(document.getElementById('data-info-source-val').textContent).toContain('Cloudflare Edge');
      expect(document.getElementById('data-info-base-val').textContent).toContain('09.10.2026, 12:00 UTC (vor 1 T.)');
      expect(document.getElementById('data-info-delta-val').textContent).toContain('Aktiv');
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('+3 Objekte aktualisiert');
    });

    it('zeigt Basis-Stand mit (Sync...) während Delta lädt', () => {
      updateDataStatus({
        source: 'pipeline',
        baseTimestamp: '2026-10-09T12:00:00Z',
        deltaStatus: 'loading',
        loadPhase: 'ready'
      });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('Stand: vor 1 T. (Sync...)');
      expect(el.className).toContain('text-blue-400');
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('Prüfe neue Objekte per Overpass …');
    });

    it('übersetzt dynamische Meldungen auch bei Sprache Englisch', async () => {
      updateDataStatus({
        source: 'pipeline',
        baseTimestamp: '2026-10-09T12:00:00Z',
        deltaStatus: 'success',
        deltaCount: 0,
        loadPhase: 'ready'
      });
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('Aktuell (keine Änderungen seit Export)');

      await setLang('en');
      renderDataStatus();
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('Up to date (no changes since export)');

      await setLang('de');
    });

    it('zeigt Stand des Basis-Auszugs, wenn kein Delta geladen wurde oder fehlgeschlagen ist', () => {
      updateDataStatus({
        source: 'pipeline',
        baseTimestamp: '2026-10-08T12:00:00Z', // vor 2 Tagen
        deltaStatus: 'failed',
        loadPhase: 'ready'
      });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('Stand: vor 2 T.');
      expect(el.className).toContain('text-green-400');

      expect(document.getElementById('data-info-delta-val').textContent).toContain('Nicht verfügbar');
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('Overpass-Server nicht erreichbar oder offline');
    });

    it('zeigt LIVE bei direkter Overpass-Abfrage', () => {
      updateDataStatus({
        source: 'overpass',
        loadPhase: 'ready'
      });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('LIVE');
      expect(el.className).toContain('text-green-400');
      expect(document.getElementById('data-info-source-val').textContent).toContain('Overpass API');
      expect(document.getElementById('data-info-delta-sub').textContent).toBe('Direkt von OSM-Servern');
    });

    it('zeigt Cache-Status bei IndexedDB-Treffer', () => {
      const oneHourAgo = nowMock - 3600 * 1000;
      updateDataStatus({
        source: 'cache',
        cacheTimestamp: oneHourAgo,
        loadPhase: 'ready'
      });
      const el = document.getElementById('data-status');
      expect(el.innerText).toBe('Aus Cache (vor 1 Std.)');
      expect(el.className).toContain('text-blue-400');
    });
  });

  describe('Popover Interaktion', () => {
    it('öffnet und schließt das Popover über toggleDataInfoPopover und closeDataInfoPopover', () => {
      const popover = document.getElementById('data-info-popover');
      const btn = document.getElementById('data-info-btn');

      expect(popover.classList.contains('hidden')).toBe(true);
      expect(btn.getAttribute('aria-expanded')).toBe('false');

      toggleDataInfoPopover(true);
      expect(popover.classList.contains('hidden')).toBe(false);
      expect(btn.getAttribute('aria-expanded')).toBe('true');

      closeDataInfoPopover();
      expect(popover.classList.contains('hidden')).toBe(true);
      expect(btn.getAttribute('aria-expanded')).toBe('false');
    });

    it('setzt aria-expanded und Menüzustand von Layer- und Export-Buttons zurück', () => {
      const layerMenu = document.getElementById('layer-menu');
      const layerBtn = document.getElementById('layer-btn-trigger');
      const exportMenu = document.getElementById('export-menu');
      const exportBtn = document.getElementById('export-btn-trigger');

      layerMenu.classList.remove('hidden');
      layerBtn.setAttribute('aria-expanded', 'true');
      exportMenu.classList.remove('hidden');
      exportBtn.setAttribute('aria-expanded', 'true');

      toggleDataInfoPopover(true);

      expect(layerMenu.classList.contains('hidden')).toBe(true);
      expect(layerBtn.getAttribute('aria-expanded')).toBe('false');
      expect(exportMenu.classList.contains('hidden')).toBe(true);
      expect(exportBtn.getAttribute('aria-expanded')).toBe('false');
    });

    it('initDataStatusUI bindet Klicks, Escape und Schließen korrekt ein', () => {
      initDataStatusUI();
      const popover = document.getElementById('data-info-popover');
      const btn = document.getElementById('data-info-btn');
      const closeBtn = document.getElementById('data-info-close-btn');

      // 1. Klick auf Button öffnet
      btn.click();
      expect(popover.classList.contains('hidden')).toBe(false);

      // 2. Klick auf Close-Button schließt
      closeBtn.click();
      expect(popover.classList.contains('hidden')).toBe(true);

      // 3. Öffnen und per Escape schließen
      btn.click();
      expect(popover.classList.contains('hidden')).toBe(false);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(popover.classList.contains('hidden')).toBe(true);

      // 4. Klick auf Legal-Link leitet weiter
      let legalClicked = false;
      document.getElementById('btn-legal-trigger').addEventListener('click', () => {
        legalClicked = true;
      });
      btn.click();
      document.getElementById('data-info-legal-link').click();
      expect(popover.classList.contains('hidden')).toBe(true);
      expect(legalClicked).toBe(true);
    });
  });
});
