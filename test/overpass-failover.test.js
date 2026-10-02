// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { _testing } from '../src/js/api.js';

// Overpass-Anfragen: Ein hängender Server darf nicht als Abbruch durch den Nutzer gelten,
// sonst wird kein anderer Server versucht (Zeitüberschreitung = TimeoutError, siehe net.js).
const { fetchWithRetry } = _testing;

describe('fetchWithRetry: Server-Wechsel bei Zeitüberschreitung', () => {
    it('versucht nach einem hängenden Overpass-Server den nächsten', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: true });
        const realFetch = globalThis.fetch;
        const calls = [];
        globalThis.fetch = vi.fn((url, options) => {
            calls.push(url);
            if (calls.length === 1) {
                // Erster Server antwortet nicht – erst der 25-s-Timeout bricht ab
                return new Promise((_, reject) => options.signal.addEventListener('abort',
                    () => reject(new DOMException('aborted', 'AbortError'))));
            }
            return Promise.resolve({ ok: true, json: async () => ({ elements: [{ type: 'node', id: 1 }] }) });
        });
        try {
            const promise = fetchWithRetry('[out:json];node(1);out;', { reqId: 'test', silent: true, signal: new AbortController().signal });
            const settled = promise.then((json) => ({ json }), (err) => ({ err }));
            await vi.advanceTimersByTimeAsync(27000);
            const { json, err } = await settled;
            expect(err).toBeUndefined();
            expect(json.elements).toHaveLength(1);
            expect(calls).toHaveLength(2);
            expect(calls[1]).not.toBe(calls[0]);
        } finally {
            globalThis.fetch = realFetch;
            vi.unstubAllGlobals();
            vi.useRealTimers();
        }
    });
});
