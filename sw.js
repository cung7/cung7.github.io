const CACHE_NAME = 'uno-tracker-v2';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json'
];

// Install
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - Cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Strategy: Network-First for HTML, Cache-First for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Network-First für HTML (immer frische Version)
    if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Update cache mit neuer Version
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }
    
    // Cache-First für statische Assets
    event.respondWith(
        caches.match(request).then(cached => {
            if (cached) {
                // Im Hintergrund aktualisieren (Stale-While-Revalidate)
                fetch(request).then(response => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, response);
                    });
                }).catch(() => {});
                return cached;
            }
            
            return fetch(request).then(response => {
                // Cachen von neuen Ressourcen (Bilder, etc.)
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, clone);
                    });
                }
                return response;
            });
        })
    );
});

// Background Sync für spätere Speicherung (optional)
self.addEventListener('sync', (event) => {
    if (event.tag === 'save-score') {
        event.waitUntil(
            // Hier könnte man Daten an Server senden wenn online
            Promise.resolve()
        );
    }
});
