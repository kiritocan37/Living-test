// Service Worker for Livin Cafe Tbilisi PWA
const CACHE_NAME = 'livin-cafe-v1';
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/gallery.html',
  '/hotel.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/favicon.png',
  '/photos/interior.jpg',
  '/photos/cathedral-view.jpg',
  // Add other critical images
];

// Install event - cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName =>
          cacheWhitelist.indexOf(cacheName) === -1 ? caches.delete(cacheName) : null
        )
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests (like Google Maps, external APIs)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a one-time use
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));

          return response;
        })
        .catch(() => {
          // If fetch fails (offline), try to return offline page
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        })
      })
  );
});

// Handle push notifications (optional)
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/favicon.png',
    badge: '/favicon.png'
  };

  event.waitUntil(
    self.registration.showNotification('Livin Cafe Tbilisi', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  // Check if a tab is already open with this URL
  event.waitUntil(
    clients.matchAll({type: 'window'}).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // If no tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});