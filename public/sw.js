// Field Issue Tracker - Service Worker
// Caches app shell on first visit so the app loads fully offline thereafter

const CACHE_NAME = 'field-issue-tracker-v1';

// Essential initial assets to pre-cache
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/icon.svg',
];

// ─── Install: pre-cache the core shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(
                PRECACHE_ASSETS.map((url) =>
                    cache.add(url).catch((err) =>
                        console.warn(`[SW] Precache failed for ${url}:`, err)
                    )
                )
            );
        }).then(() => self.skipWaiting())
    );
});

// ─── Activate: clean up outdated caches and take control immediately ───────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

// ─── Fetch: handle offline fallback and dynamic asset caching ─────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Only cache GET requests
    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Never intercept API calls – IndexedDB & syncService handle offline API data
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // Do not intercept chrome extensions or other schemes
    if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
        return;
    }

    // 1. Navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(async () => {
                    // Offline fallback: try specific page first, then root shell
                    const cachedResponse = await caches.match(request);
                    if (cachedResponse) return cachedResponse;
                    const rootShell = await caches.match('/');
                    if (rootShell) return rootShell;
                    return new Response('Offline - Field Tracker app shell not yet cached.', {
                        status: 503,
                        headers: { 'Content-Type': 'text/plain' },
                    });
                })
        );
        return;
    }

    // 2. Next.js static assets and media (JS, CSS, RSC chunks, fonts, images)
    const isStaticAsset =
        url.pathname.startsWith('/_next/static/') ||
        url.searchParams.has('_rsc') ||
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'font' ||
        request.destination === 'image';

    if (isStaticAsset) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) {
                    return cached;
                }
                return fetch(request).then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                }).catch(() => {
                    // Return empty or fallback if unavailable offline
                    return new Response('', { status: 408 });
                });
            })
        );
        return;
    }
});
