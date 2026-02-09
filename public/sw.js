const CACHE_NAME = 'ofm-v4-static';
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

    // API-Requests (Overpass/Nominatim/Tile-Server) nie cachen
    if (url.hostname.includes('overpass') ||
        url.hostname.includes('nominatim') ||
        url.hostname.includes('openstreetmap') ||
        url.hostname.includes('arcgisonline') ||
        url.hostname.includes('maptiler')) {
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
            }).catch(() => {
                // Offline fallback: Zeige cached index.html für Navigation
                if (e.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
