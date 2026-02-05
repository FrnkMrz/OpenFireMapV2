const CACHE_NAME = 'ofm-v1-static';
const ASSETS = [
    '/',
    '/index.html',
    '/src/input.css',
    '/src/js/app.js',
    '/src/js/map.js',
    '/src/js/ui.js',
    '/src/js/config.js',
    '/src/js/state.js',
    '/src/js/api.js',
    '/src/js/export.js',
    '/src/js/i18n.js',
    '/src/js/mobile-ui.js',
    '/assets/vendor/leaflet/leaflet.css',
    '/assets/vendor/leaflet/leaflet.js',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
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
    // API-Requests (Overpass/Nominatim) nicht cachen oder anders behandeln
    if (e.request.url.includes('overpass') || e.request.url.includes('nominatim')) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request).catch(() => {
                // Optional: Fallback page
            });
        })
    );
});
