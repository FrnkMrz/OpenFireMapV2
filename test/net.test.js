import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, HttpError, TimeoutError } from '../src/js/net.js';

describe('net.js', () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('fetchJson returns JSON data on success (200)', async () => {
        const mockData = { foo: 'bar' };
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        });

        const result = await fetchJson('https://example.com/api');
        expect(result).toEqual(mockData);
        expect(fetchMock).toHaveBeenCalledWith('https://example.com/api', expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({ 'Accept': 'application/json' })
        }));
    });

    it('fetchJson throws HttpError on 404', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => 'Not Found',
        });

        await expect(fetchJson('https://example.com/404')).rejects.toThrow(HttpError);
        try {
            await fetchJson('https://example.com/404');
        } catch (e) {
            expect(e.status).toBe(404);
            expect(e.body).toBe('Not Found');
        }
    });

    it('fetchJson throws HttpError on 500', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Server Error',
        });

        await expect(fetchJson('https://example.com/500')).rejects.toThrow(HttpError);
    });

    // fetch-Mock, der wie der Browser auf das Abort-Signal mit einem AbortError reagiert
    const hangingFetch = (url, options) => new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    });

    it('fetchJson meldet eine Zeitüberschreitung als TimeoutError, nicht als AbortError', async () => {
        vi.useFakeTimers();
        try {
            fetchMock.mockImplementation(hangingFetch);
            const promise = fetchJson('https://example.com/timeout', { timeoutMs: 1000 });
            const assertion = expect(promise).rejects.toBeInstanceOf(TimeoutError);
            await vi.advanceTimersByTimeAsync(1100);
            await assertion;
        } finally {
            vi.useRealTimers();
        }
    });

    it('fetchJson meldet einen Abbruch von außen weiterhin als AbortError', async () => {
        fetchMock.mockImplementation(hangingFetch);
        const controller = new AbortController();
        const promise = fetchJson('https://example.com/abort', { timeoutMs: 60000, signal: controller.signal });
        controller.abort();
        await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    // Re-implementing timeout test with more realistic mock
    it('fetchJson passes signal to fetch', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            json: async () => ({}),
        });

        const controller = new AbortController();
        await fetchJson('https://example.com/signal', { signal: controller.signal });

        const callArgs = fetchMock.mock.calls[0];
        const options = callArgs[1];
        expect(options.signal).toBeDefined();
    });
});
