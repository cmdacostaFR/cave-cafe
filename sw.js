/**
 * Cave à Café - Service Worker
 * Provides offline support and caching for PWA
 * VERSION 2 - with auto-update support
 */

// IMPORTANT: Change this version number to force update
const CACHE_VERSION = 'v2.2';
const CACHE_NAME = 'cave-cafe-' + CACHE_VERSION;

const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './db.js',
    './parser.js',
    './exporter.js',
    './app.js',
    './manifest.json'
];

// Install event - precache static assets and skip waiting immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing version ' + CACHE_VERSION);
    
    // Skip waiting to activate immediately
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete');
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating version ' + CACHE_VERSION);
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete, claiming clients');
                return self.clients.claim();
            })
    );
});

// Fetch event - Network first, then cache (for better updates)
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        // Try network first
        fetch(event.request)
            .then((networkResponse) => {
                // If successful, cache the response
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                }
                return networkResponse;
            })
            .catch(() => {
                // If network fails, try cache
                return caches.match(event.request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // If both fail and it's a navigation, return index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return null;
                    });
            })
    );
});

// Message event - handle cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        }).then(() => {
            console.log('[SW] All caches cleared');
        });
    }
});
