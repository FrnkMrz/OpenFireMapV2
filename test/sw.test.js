import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

// Führt public/sw.js in einer nachgebauten Service-Worker-Umgebung aus
// und prüft, welche Seitenaufrufe als Offline-Fallback abgelegt werden.
const source = readFileSync(resolve(__dirname, '../public/sw.js'), 'utf8');
const ORIGIN = 'https://openfiremap.org';

function loadServiceWorker() {
    const listeners = {};
    const cache = { put: vi.fn(), add: vi.fn(() => Promise.resolve()) };
    const context = {
        URL,
        console,
        location: { origin: ORIGIN },
        self: {
            addEventListener: (type, fn) => { listeners[type] = fn; },
            skipWaiting: () => {},
            clients: { claim: () => {} },
        },
        caches: {
            open: vi.fn(() => Promise.resolve(cache)),
            match: vi.fn(() => Promise.resolve(undefined)),
            keys: vi.fn(() => Promise.resolve([])),
        },
        fetch: vi.fn(() => Promise.resolve({ status: 200, clone() { return this; } })),
    };
    vm.runInNewContext(source, context);
    return { listeners, cache };
}

async function navigate(listeners, path) {
    let responsePromise;
    listeners.fetch({
        request: { url: `${ORIGIN}${path}`, mode: 'navigate', headers: new Map() },
        respondWith: (p) => { responsePromise = p; },
    });
    await responsePromise;
    // cache.put läuft in einem nachgelagerten then()
    await new Promise((r) => setTimeout(r, 0));
}

describe('Service Worker: Offline-Fallback für Seitenaufrufe', () => {
    let sw;
    beforeEach(() => {
        sw = loadServiceWorker();
    });

    it('legt die App-Hülle (/) als /index.html ab', async () => {
        await navigate(sw.listeners, '/');
        expect(sw.cache.put).toHaveBeenCalledWith('/index.html', expect.anything());
    });

    it('überschreibt die App-Hülle nicht bei anderen Seitenaufrufen', async () => {
        await navigate(sw.listeners, '/taginfo.json');
        expect(sw.cache.put).not.toHaveBeenCalled();
    });
});
