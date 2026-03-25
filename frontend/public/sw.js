const CACHE_NAME = 'onevoice-v4'
// Only cache truly static assets — NEVER cache index.html
const urlsToCache = ['/logo.png', '/manifest.json']

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
    self.clients.claim()
})

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url)

    // Always fetch HTML (navigation) fresh from network — never serve from cache
    // This prevents stale index.html from referencing old JS bundle hashes
    if (event.request.mode === 'navigate' ||
        url.pathname === '/' ||
        url.pathname.endsWith('.html')) {
        event.respondWith(fetch(event.request))
        return
    }

    // Always fetch JS/CSS bundles fresh (they have content hashes anyway)
    if (url.pathname.includes('/assets/')) {
        event.respondWith(fetch(event.request))
        return
    }

    // Cache-first for logo, manifest, icons
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    )
})