// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCacheEntry, isCacheDisabled, setCache } from '../src/js/cache.js';

describe('Cache-Einstellung "Aus"', () => {
    beforeEach(() => {
        localStorage.setItem('ofm_cache_hours', '0');
        vi.stubGlobal('indexedDB', { open: vi.fn() });
    });

    afterEach(() => {
        localStorage.removeItem('ofm_cache_hours');
        vi.unstubAllGlobals();
    });

    it('erkennt die Einstellung', () => {
        expect(isCacheDisabled()).toBe(true);
        localStorage.setItem('ofm_cache_hours', '168');
        expect(isCacheDisabled()).toBe(false);
    });

    it('schreibt nichts in IndexedDB', async () => {
        await setCache('key', { elements: [] }, { dataClass: 'aed' });
        expect(indexedDB.open).not.toHaveBeenCalled();
    });

    it('liest keine Altbestände aus IndexedDB', async () => {
        expect(await getCacheEntry('key')).toBeNull();
        expect(indexedDB.open).not.toHaveBeenCalled();
    });
});
