// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showNotification, hideNotification } from '../src/js/ui.js';

describe('showNotification & hideNotification', () => {
    let box;

    beforeEach(() => {
        vi.useFakeTimers();
        document.body.replaceChildren();
        box = document.createElement('div');
        box.id = 'notification-box';
        document.body.appendChild(box);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('zeigt eine Erfolgsbenachrichtigung mit passendem Typ und Icon an', () => {
        showNotification('Gespeichert', 'success');

        expect(box.dataset.type).toBe('success');
        expect(box.getAttribute('role')).toBe('status');
        expect(box.getAttribute('aria-live')).toBe('polite');
        expect(box.classList.contains('is-visible')).toBe(true);
        expect(box.style.display).toBe('flex');
        expect(box.textContent).toContain('Gespeichert');
        expect(box.querySelector('.notification-icon')).not.toBeNull();
    });

    it('konfiguriert Fehler als assertives alert', () => {
        showNotification('Fehler aufgetreten', 5000, 'error');

        expect(box.dataset.type).toBe('error');
        expect(box.getAttribute('role')).toBe('alert');
        expect(box.getAttribute('aria-live')).toBe('assertive');
        expect(box.textContent).toContain('Fehler aufgetreten');
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
