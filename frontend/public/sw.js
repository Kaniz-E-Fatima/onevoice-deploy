const CACHE_NAME = 'onevoice-v2'
const urlsToCache = ['/', '/index.html', '/logo.png', '/manifest.json']

self.addEventListener('install', event => {
    self.skipWaiting()
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    )
})

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    )
})

self.addEventListener('fetch', event => {
    // Never cache JS/CSS bundles — always fetch fresh
    if (event.request.url.includes('/assets/')) {
        event.respondWith(fetch(event.request))
        return
    }
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    )
})