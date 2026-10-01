/**
 * Service Worker für OpenFireMapV2
 * 
 * HINWEIS ZUR ARCHITEKTUR (ONLINE-ONLY):
 * Diese PWA ist konzeptionell eine ONLINE-Anwendung. 
 * Der Service Worker speichert lediglich die "App-Hülle" (HTML, CSS, JS, UI-Icons) im Cache, 
 * damit die App sofort (ohne Ladebildschirm) startet und installierbar ist.
 * 
 * Echtzeit-Daten (Overpass-API, Nominatim) und Kartenkacheln (Tiles) werden 
 * BEWUSST NICHT vom Service Worker gecached, da ein Offline-Betrieb 
 * (z.B. im Waldbrandeinsatz ohne Netz) nicht vorgesehen ist und gefährlich 
 * veraltete Wasserentnahmestellen suggerieren könnte.
 */

const CACHE_NAME = 'ofm-v16-static';
// Nur wirklich statische Assets precachen (keine gehashten Bundles!)
const ASSETS = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Safari-kompatibel: Promise.all statt allSettled
            return Promise.all(
                ASSETS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn(`[SW] Failed to cache ${url}:`, err);
                        return null;
                    })
                )
            ).catch(err => {
                console.warn('[SW] Install failed:', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Range-Requests und PMTiles/lokale Pipeline nie durch den Service Worker leiten
    // (Verhindert den bekannten Safari/WebKit-Bug, bei dem der SW Range-Header verwirft)
    if (e.request.headers.has('range') ||
        url.pathname.endsWith('.pmtiles') ||
        url.hostname === 'pipeline.openfiremap.org') {
        return;
    }

    // API-Requests (Overpass/Nominatim/Tile-Server) nie cachen
    if (url.hostname.includes('overpass') ||
        url.hostname.includes('nominatim') ||
        url.hostname.includes('openstreetmap') ||
        url.hostname.includes('arcgisonline') ||
        url.hostname.includes('cartocdn') ||
        url.hostname.includes('maptiler')) {
        return;
    }

    // Seitenaufrufe (index.html) immer zuerst aus dem Netz laden (network-first).
    // Cache-first würde nach einem Deploy eine veraltete index.html liefern, die auf
    // nicht mehr existierende gehashte Bundles verweist (404 → leere Karte, v.a. Safari).
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).then((response) => {
                // Nur die App-Hülle als Offline-Fallback ablegen. Andere Seitenaufrufe
                // (z. B. /taginfo.json) dürfen den Eintrag '/index.html' nicht überschreiben.
                const isAppShell = url.pathname === '/' || url.pathname === '/index.html';
                if (isAppShell && response && response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put('/index.html', responseToCache);
                    });
                }
                return response;
            }).catch(() => caches.match('/index.html'))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            // Nicht im Cache -> holen und cachen (stale-while-revalidate)
            return fetch(e.request).then((response) => {
                // Nur erfolgreiche Responses cachen
                if (!response || response.status !== 200 || response.type === 'error') {
                    return response;
                }

                // Nur Same-Origin und JS/CSS/Fonts cachen
                if (url.origin === location.origin &&
                    (url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css') ||
                        url.pathname.endsWith('.woff2') ||
                        url.pathname.includes('/assets/'))) {

                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }

                return response;
            });
        })
    );
});
