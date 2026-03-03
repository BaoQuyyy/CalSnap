// Service Worker for CalSnap PWA
// Strategy: Cache-first for static assets, Network-first for API calls

const CACHE_NAME = 'calsnap-v1'

const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon.svg',
    '/icon-maskable.svg',
    '/calsnap-logo.svg',
]

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    )
    self.clients.claim()
})

// Fetch: cache-first for static, network-first for API + pages
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // Skip non-GET and browser-extension requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) return

    // Network-first for API routes
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(() =>
                new Response(JSON.stringify({ error: 'Bạn đang offline. Vui lòng kết nối mạng và thử lại.' }), {
                    status: 503,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        )
        return
    }

    // Cache-first for static assets (images, fonts, etc.)
    if (
        url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|woff2?|ttf)$/) ||
        STATIC_ASSETS.includes(url.pathname)
    ) {
        event.respondWith(
            caches.match(request).then(
                (cached) => cached ?? fetch(request).then((res) => {
                    const clone = res.clone()
                    caches.open(CACHE_NAME).then((c) => c.put(request, clone))
                    return res
                })
            )
        )
        return
    }

    // Network-first for everything else (pages, Next.js chunks)
    event.respondWith(
        fetch(request).catch(() => caches.match(request))
    )
})

// Push notification handler
self.addEventListener('push', (event) => {
    if (!event.data) return
    const data = event.data.json()
    event.waitUntil(
        self.registration.showNotification(data.title ?? 'CalSnap', {
            body: data.body ?? 'Đừng quên log bữa ăn hôm nay nhé!',
            icon: '/icon.svg',
            badge: '/icon-maskable.svg',
            tag: 'calsnap-reminder',
            renotify: true,
            data: { url: data.url ?? '/' },
        })
    )
})

// Notification click: open the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            const targetUrl = event.notification.data?.url ?? '/'
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) return client.focus()
            }
            if (clients.openWindow) return clients.openWindow(targetUrl)
        })
    )
})
