const CACHE_VERSION = 'sri-v1.0.0';
const STATIC_CACHE = `sri-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sri-dynamic-${CACHE_VERSION}`;
const API_CACHE = `sri-api-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/hub.html',
    '/auth/login.html',
    '/auth/register.html',
    '/dashboard/dashboard.html',
    '/dashboard/contracts.html',
    '/dashboard/providers.html',
    '/dashboard/upload.html',
    '/assets/css/base.css',
    '/assets/js/api.js',
    '/assets/js/session.js',
    '/assets/images/sri-logo.png',
    '/sri_pwa_icon.png',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName.startsWith('sri-') &&
                            cacheName !== STATIC_CACHE &&
                            cacheName !== DYNAMIC_CACHE &&
                            cacheName !== API_CACHE;
                    })
                    .map((cacheName) => {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // API requests - Network First, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request, API_CACHE));
        return;
    }

    // Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname === asset) ||
        url.pathname.match(/\.(css|js|png|jpg|jpeg|svg|webp|woff|woff2)$/)) {
        event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
        return;
    }

    // HTML pages - Network First with fast fallback
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
        return;
    }

    // Default - Network First
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
});

// Cache First Strategy - serve from cache, fallback to network
async function cacheFirstStrategy(request, cacheName) {
    try {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            // Return cached response and update cache in background
            updateCacheInBackground(request, cache);
            return cachedResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.error('[SW] Cache First failed:', error);
        return caches.match('/offline.html') || new Response('Offline');
    }
}

// Network First Strategy - try network, fallback to cache
async function networkFirstStrategy(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        // Return offline page for HTML requests
        if (request.headers.get('accept').includes('text/html')) {
            return caches.match('/offline.html') || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }

        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// Update cache in background (Stale While Revalidate)
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
    } catch (error) {
        // Silently fail - we already returned cached response
    }
}

// Background Sync for offline uploads
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-uploads') {
        event.waitUntil(syncPendingUploads());
    }
});

async function syncPendingUploads() {
    // This will be integrated with the upload queue
    console.log('[SW] Syncing pending uploads...');
    // Implementation will connect to IndexedDB queue
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'SRI Agro';
    const options = {
        body: data.body || 'Nueva notificación',
        icon: '/sri_pwa_icon.png',
        badge: '/sri_pwa_icon.png',
        data: data.url || '/'
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});
