// Service Worker for VocabMaster PWA
const CACHE_NAME = 'vocabmaster-v11';

// Files to cache for offline use
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/style.v2.css',
    '/js/app.js',
    '/js/storage.js',
    '/js/srs.js',
    '/js/speech.js',
    '/js/wordlist.js',
    '/js/dictionary.js',
    '/js/patterns.js',
    '/js/matching.js',
    '/js/stats.js',
    '/js/chatbot.js',
    '/data/patterns.json',
    '/data/categories/senses.json',
    '/data/categories/kitchen.json',
    '/data/categories/home.json',
    '/data/categories/family.json',
    '/data/categories/work.json',
    '/data/categories/shopping.json',
    '/data/categories/travel.json',
    '/data/categories/health.json',
    '/data/categories/education.json',
    '/data/categories/emotions.json',
    '/data/categories/weather.json',
    '/data/categories/hobbies.json',
    '/data/categories/technology.json',
    '/data/categories/clothing.json',
    '/data/categories/city.json',
    '/data/categories/sports.json',
    '/data/categories/music.json',
    '/data/categories/nature.json',
    '/data/categories/food.json',
    '/data/categories/finance.json',
    '/data/categories/law.json',
    '/data/categories/science.json',
    '/data/categories/relationships.json',
    '/data/categories/business.json',
    '/data/categories/computer.json',
    '/data/categories/daily.json',
    '/data/categories/academic.json',
    '/data/categories/animals.json',
    '/data/categories/arts.json',
    '/data/categories/index.json',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Install failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('[SW] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests (like API calls)
    if (!event.request.url.startsWith(self.location.origin)) {
        // For dictionary API, try network first
        if (event.request.url.includes('dictionaryapi.dev')) {
            event.respondWith(
                fetch(event.request)
                    .catch(() => {
                        return new Response(JSON.stringify({
                            error: 'Offline - Sözlük için internet bağlantısı gerekli'
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    })
            );
            return;
        }
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached version if available
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone and cache the response
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline fallback for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Background sync for future features
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
});

// Push notifications for future features
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');
    const options = {
        body: event.data?.text() || 'Yeni kelimeler seni bekliyor!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [100, 50, 100],
        tag: 'vocabmaster-notification'
    };

    event.waitUntil(
        self.registration.showNotification('VocabMaster', options)
    );
});
