// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/js/i18n.js', () => ({
  t: (key) => ({
    hydrant_load_started: 'Hydrantendaten werden geladen …',
    hydrant_load_more: '{count} Hydranten geladen – weitere Daten werden geladen …',
    hydrant_load_success: 'Hydrantendaten erfolgreich geladen: {count} Hydranten.',
    hydrant_load_error: 'Hydrantendaten konnten nicht geladen werden.',
    hydrant_load_slow: 'Hydrantendaten werden weiterhin geladen – bisher {count} Hydranten.'
  })[key]
}));

import { createHydrantDownloadStatus, getHydrantDownloadStatusText } from '../src/js/hydrant-download-status.js';
import { countHydrants } from '../src/js/api.js';

describe('Hydranten-Download-Status', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.replaceChildren();
  });

  afterEach(() => vi.useRealTimers());

  it('bleibt bei einem schnellen erfolgreichen Abruf unsichtbar', () => {
    const status = createHydrantDownloadStatus(document.createElement('div'));
    status.update({ state: 'loading' });
    vi.advanceTimersByTime(300);
    status.update({ state: 'success', count: 2 });
    expect(status.element.classList.contains('hidden')).toBe(true);
  });

  it('zeigt Laden, Langläufer und Erfolg mit Hydrantenanzahl', () => {
    const status = createHydrantDownloadStatus(document.createElement('div'));
    status.update({ state: 'refreshing', count: 7 });
    vi.advanceTimersByTime(500);
    expect(status.element.textContent).toContain('7 Hydranten geladen');

    vi.advanceTimersByTime(5500);
    expect(status.element.dataset.state).toBe('slow');
    expect(status.element.textContent).toContain('bisher 7 Hydranten');

    status.update({ state: 'success', count: 9 });
    expect(status.element.textContent).toContain('9 Hydranten');
    vi.advanceTimersByTime(1600);
    expect(status.element.classList.contains('hidden')).toBe(true);
  });

  it('zeigt einen Fehler mit erneutem Abruf', () => {
    const onRetry = vi.fn();
    const status = createHydrantDownloadStatus(document.createElement('div'), { onRetry });
    status.update({ state: 'error' });
    status.element.querySelector('#hydrant-data-retry').click();
    expect(onRetry).toHaveBeenCalledOnce();
  });
});

describe('Hydranten-Ermittlung im Datenservice', () => {
  it('zählt nur Hydranten und keine weiteren Overpass-Objekte', () => {
    const elements = [
      { tags: { emergency: 'fire_hydrant' } },
      { tags: { emergency: 'water_tank' } },
      { tags: { amenity: 'fire_station' } },
      { tags: { emergency: 'fire_hydrant' } }
    ];
    expect(countHydrants(elements)).toBe(2);
    expect(countHydrants(null)).toBe(0);
  });

  it('formatiert den Fortschritt mit der Anzahl', () => {
    expect(getHydrantDownloadStatusText({ state: 'refreshing', count: 4 })).toContain('4 Hydranten');
  });
});
