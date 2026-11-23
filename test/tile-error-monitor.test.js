import { describe, expect, it, vi } from 'vitest';
import { monitorTileErrors } from '../src/js/tile-error-monitor.js';

function tileLayer() {
    const handlers = new Map();
    return {
        on: (name, handler) => handlers.set(name, handler),
        off: (name) => handlers.delete(name),
        fail: (x, y, z = 14) => handlers.get('tileerror')?.({ coords: { x, y, z } }),
    };
}

describe('monitorTileErrors', () => {
    it('ignoriert einen einzelnen Fehler und wiederholte Fehler derselben Kachel', () => {
        const layer = tileLayer();
        const onUnavailable = vi.fn();
        monitorTileErrors(layer, { threshold: 3, windowMs: 10000, isActive: () => true, onUnavailable });

        layer.fail(1, 2);
        layer.fail(1, 2);

        expect(onUnavailable).not.toHaveBeenCalled();
    });

    it('meldet mehrere verschiedene Kachelausfälle nur einmal', () => {
        const layer = tileLayer();
        const onUnavailable = vi.fn();
        monitorTileErrors(layer, { threshold: 3, windowMs: 10000, isActive: () => true, onUnavailable });

        layer.fail(1, 2);
        layer.fail(2, 2);
        layer.fail(3, 2);
        layer.fail(4, 2);

        expect(onUnavailable).toHaveBeenCalledTimes(1);
    });

    it('lässt veraltete Fehler und Fehler außerhalb des Zeitfensters unbeachtet', () => {
        vi.useFakeTimers();
        const layer = tileLayer();
        const onUnavailable = vi.fn();
        let active = true;
        monitorTileErrors(layer, { threshold: 3, windowMs: 10000, isActive: () => active, onUnavailable });

        layer.fail(1, 1);
        vi.advanceTimersByTime(10001);
        layer.fail(2, 1);
        layer.fail(3, 1);
        expect(onUnavailable).not.toHaveBeenCalled();

        active = false;
        layer.fail(4, 1);
        layer.fail(5, 1);
        expect(onUnavailable).not.toHaveBeenCalled();
        vi.useRealTimers();
    });
});
