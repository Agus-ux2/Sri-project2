const CACHE_NAME = 'sri-cache-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/Portal_Clientes_Login.html',
    '/App_Movil_Productor.html',
    '/manifest.json',
    '/sri_pwa_icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
