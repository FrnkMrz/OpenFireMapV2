// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Overpass-Hinweise: fetchWithRetry darf nur Meldungen schließen, die der Request selbst gezeigt hat.
// Fremde Meldungen ("Link kopiert", Export, Warnung "zeige Cache") dürfen nicht verschwinden.
// Wie ui.js: die Meldung landet in #notification-box > .notification-text
const showNotification = vi.fn((msg) => {
    let box = document.getElementById('notification-box');
    if (!box) { box = document.createElement('div'); box.id = 'notification-box'; document.body.appendChild(box); }
    box.innerHTML = '<span class="notification-text"></span>';
    box.querySelector('.notification-text').textContent = msg;
});
const hideNotification = vi.fn();
vi.mock('../src/js/ui.js', () => ({ showNotification, hideNotification }));

const okResponse = () => Promise.resolve({ ok: true, json: async () => ({ elements: [{ type: 'node', id: 1 }] }) });
const serverError = () => Promise.resolve({ ok: false, status: 500, statusText: 'err', text: async () => '', headers: new Headers() });

describe('fetchWithRetry: Benachrichtigungen gehören dem Request', () => {
    let fetchWithRetry;
    const realFetch = globalThis.fetch;

    beforeEach(async () => {
        vi.resetModules();
        showNotification.mockClear();
        hideNotification.mockClear();
        document.body.innerHTML = '';
        vi.useFakeTimers();
        vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: true });
        ({ _testing: { fetchWithRetry } } = await import('../src/js/api.js'));
    });

    afterEach(() => {
        globalThis.fetch = realFetch;
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    const run = async (opts) => {
        const settled = fetchWithRetry('[out:json];node(1);out;', { reqId: 'test', signal: new AbortController().signal, ...opts })
            .then((json) => ({ json }), (err) => ({ err }));
        await vi.advanceTimersByTimeAsync(5000);
        return settled;
    };

    it('schließt den eigenen Retry-Hinweis nach erfolgreichem Neuversuch', async () => {
        globalThis.fetch = vi.fn().mockImplementationOnce(serverError).mockImplementation(okResponse);
        const { json, err } = await run({});
        expect(err).toBeUndefined();
        expect(json.elements).toHaveLength(1);
        // "Serverfehler, neuer Versuch" + "Versuche Server …"
        expect(showNotification).toHaveBeenCalledTimes(2);
        expect(hideNotification).toHaveBeenCalledTimes(1);
    });

    it('lässt Meldungen anderer Abläufe in Ruhe, wenn ein stiller Request erfolgreich ist', async () => {
        globalThis.fetch = vi.fn().mockImplementationOnce(serverError).mockImplementation(okResponse);
        const { err } = await run({ silent: true });
        expect(err).toBeUndefined();
        expect(showNotification).not.toHaveBeenCalled();
        expect(hideNotification).not.toHaveBeenCalled();
    });

    it('schließt den eigenen Hinweis auch beim Abbruch, aber nicht ohne eigenen Hinweis', async () => {
        // Mit eigenem Hinweis: erst 500 (Hinweis), dann Abbruch
        globalThis.fetch = vi.fn().mockImplementationOnce(serverError)
            .mockImplementation(() => Promise.reject(new DOMException('aborted', 'AbortError')));
        const withOwn = await run({});
        expect(withOwn.err?.name).toBe('AbortError');
        expect(showNotification).toHaveBeenCalled();
        expect(hideNotification).toHaveBeenCalledTimes(1);

        // Ohne eigenen Hinweis: sofortiger Abbruch
        hideNotification.mockClear();
        globalThis.fetch = vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError')));
        const without = await run({ reqId: 'test2' });
        expect(without.err?.name).toBe('AbortError');
        expect(hideNotification).not.toHaveBeenCalled();
    });

    it('räumt eine Meldung nicht weg, die inzwischen ein anderer Ablauf angezeigt hat (Erfolg und Abbruch)', async () => {
        const replaceNotification = () => showNotification('Link kopiert!');

        // Erfolg: Nach dem eigenen Hinweis ersetzt jemand die Meldung, dann klappt der Neuversuch
        globalThis.fetch = vi.fn().mockImplementationOnce(serverError).mockImplementationOnce(() => {
            replaceNotification();
            return okResponse();
        });
        const ok = await run({});
        expect(ok.err).toBeUndefined();
        expect(hideNotification).not.toHaveBeenCalled();
        expect(document.querySelector('#notification-box .notification-text').textContent).toBe('Link kopiert!');

        // Abbruch: dasselbe, aber der zweite Versuch wird abgebrochen
        showNotification.mockClear();
        globalThis.fetch = vi.fn().mockImplementationOnce(serverError).mockImplementationOnce(() => {
            replaceNotification();
            return Promise.reject(new DOMException('aborted', 'AbortError'));
        });
        const aborted = await run({ reqId: 'test2' });
        expect(aborted.err?.name).toBe('AbortError');
        expect(hideNotification).not.toHaveBeenCalled();
    });
});
