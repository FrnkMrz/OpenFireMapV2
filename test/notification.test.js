// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showNotification, hideNotification } from '../src/js/ui.js';

describe('showNotification & hideNotification', () => {
    let box;
    let statusRegion;
    let alertRegion;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.replaceChildren();
        box = document.createElement('div');
        box.id = 'notification-box';
        statusRegion = document.createElement('div');
        statusRegion.id = 'notification-live-status';
        statusRegion.setAttribute('role', 'status');
        alertRegion = document.createElement('div');
        alertRegion.id = 'notification-live-alert';
        alertRegion.setAttribute('role', 'alert');
        document.body.append(box, statusRegion, alertRegion);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('zeigt eine Erfolgsbenachrichtigung mit passendem Typ und Icon an', () => {
        showNotification('Gespeichert', 'success');

        expect(box.dataset.type).toBe('success');
        expect(box.classList.contains('is-visible')).toBe(true);
        expect(box.style.display).toBe('flex');
        expect(box.textContent).toContain('Gespeichert');
        expect(box.querySelector('.notification-icon')).not.toBeNull();
    });

    it('zeigt Fehler sichtbar an', () => {
        showNotification('Fehler aufgetreten', 5000, 'error');

        expect(box.dataset.type).toBe('error');
        expect(box.textContent).toContain('Fehler aufgetreten');
    });

    it('die sichtbare Box ist für Screenreader stumm und wechselt nie ihre Rolle', () => {
        showNotification('Info', 'info');
        showNotification('Fehler', 'error');

        expect(box.getAttribute('aria-hidden')).toBe('true');
        expect(box.hasAttribute('role')).toBe(false);
        expect(box.hasAttribute('aria-live')).toBe(false);
    });

    it('sagt Info, Erfolg und Warnung in der status-Region an, Fehler in der alert-Region', () => {
        showNotification('Gespeichert', 'success');
        vi.advanceTimersByTime(50);
        expect(statusRegion.textContent).toBe('Gespeichert');
        expect(alertRegion.textContent).toBe('');

        showNotification('Kaputt', 'error');
        vi.advanceTimersByTime(50);
        expect(alertRegion.textContent).toBe('Kaputt');
        expect(statusRegion.textContent).toBe('');

        showNotification('Achtung', 'warning');
        vi.advanceTimersByTime(50);
        expect(statusRegion.textContent).toBe('Achtung');
        expect(alertRegion.textContent).toBe('');
    });

    it('die Live-Regionen behalten ihre feste Rolle', () => {
        showNotification('A', 'error');
        showNotification('B', 'info');
        vi.advanceTimersByTime(50);

        expect(statusRegion.getAttribute('role')).toBe('status');
        expect(alertRegion.getAttribute('role')).toBe('alert');
    });

    it('leert die Live-Regionen, wenn die Meldung verschwindet', () => {
        showNotification('Kurz', 1000, 'info');
        vi.advanceTimersByTime(50);
        expect(statusRegion.textContent).toBe('Kurz');

        vi.advanceTimersByTime(1000 + 250);
        expect(statusRegion.textContent).toBe('');
    });

    it('akzeptiert vertauschte Parameter (type, duration)', () => {
        showNotification('Achtung', 'warning', 4000);

        expect(box.dataset.type).toBe('warning');
        expect(box.textContent).toContain('Achtung');

        vi.advanceTimersByTime(3999);
        expect(box.classList.contains('is-visible')).toBe(true);

        vi.advanceTimersByTime(1);
        expect(box.classList.contains('is-visible')).toBe(false);
    });

    it('blendet sich nach Ablauf der Dauer automatisch aus', () => {
        showNotification('Info-Text', 2000, 'info');

        expect(box.classList.contains('is-visible')).toBe(true);

        vi.advanceTimersByTime(2000);
        expect(box.classList.contains('is-visible')).toBe(false);

        vi.advanceTimersByTime(250);
        expect(box.style.display).toBe('none');
    });

    it('hideNotification blendet die Nachricht vorzeitig aus', () => {
        showNotification('Lange Nachricht', 60000);
        expect(box.classList.contains('is-visible')).toBe(true);

        hideNotification();
        expect(box.classList.contains('is-visible')).toBe(false);

        vi.advanceTimersByTime(250);
        expect(box.style.display).toBe('none');
    });

    it('verhindert HTML-Injection über die Meldung', () => {
        showNotification('<img src=x onerror=alert(1)>', 'warning');

        expect(box.querySelector('img')).toBeNull();
        expect(box.querySelector('.notification-text').textContent).toBe('<img src=x onerror=alert(1)>');
    });

    it('hideNotification(id) schließt nur die Meldung mit dieser ID, eine neuere bleibt stehen', () => {
        const first = showNotification('Erste', 5000);
        const second = showNotification('Zweite', 5000);
        expect(second).toBeGreaterThan(first);

        hideNotification(first);
        expect(box.classList.contains('is-visible')).toBe(true);
        expect(box.textContent).toContain('Zweite');

        hideNotification(second);
        expect(box.classList.contains('is-visible')).toBe(false);
    });

    it('hideNotification() ohne ID schließt wie bisher immer', () => {
        showNotification('Egal', 5000);
        hideNotification();
        expect(box.classList.contains('is-visible')).toBe(false);
    });

    it('showNotification gibt ohne #notification-box null zurück', () => {
        document.body.replaceChildren();
        expect(showNotification('Nirgends')).toBeNull();
    });
});
