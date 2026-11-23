/**
 * Beobachtet wiederholte Fehler verschiedener Kacheln eines Kartenhintergrunds.
 * Ein einzelner fehlgeschlagener Request reicht absichtlich nicht für einen Alarm.
 */
export const DEFAULT_BASEMAP_TILE_ERROR_CONFIG = Object.freeze({
    threshold: 3,
    windowMs: 15_000,
});

export function monitorTileErrors(layer, { threshold, windowMs, isActive, onUnavailable }) {
    if (typeof layer?.on !== 'function' || typeof layer?.off !== 'function') return () => {};

    const failedTiles = new Map();
    let notified = false;

    const onTileError = (event) => {
        if (notified || !isActive()) return;

        const coords = event?.coords;
        if (!coords || !Number.isFinite(coords.z) || !Number.isFinite(coords.x) || !Number.isFinite(coords.y)) return;

        const now = Date.now();
        for (const [key, timestamp] of failedTiles) {
            if (now - timestamp > windowMs) failedTiles.delete(key);
        }
        failedTiles.set(`${coords.z}/${coords.x}/${coords.y}`, now);

        if (failedTiles.size >= threshold) {
            notified = true;
            onUnavailable();
        }
    };

    layer.on('tileerror', onTileError);
    return () => {
        layer.off('tileerror', onTileError);
        failedTiles.clear();
    };
}
