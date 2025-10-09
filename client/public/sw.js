const CACHE_NAME = 'zeno-gas-v1.0.1';
const APP_PREFIX = 'ZENO_';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon-96x96.png',
  '/favicon.svg',
  '/apple-touch-icon.png'
];

// Assets to cache on demand
const DYNAMIC_ASSETS = [
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/screenshot-mobile.png',
  '/screenshot-tablet.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log(`${APP_PREFIX} Service Worker: Installing...`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`${APP_PREFIX} Service Worker: Caching static assets`);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log(`${APP_PREFIX} Service Worker: Installation complete`);
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error(`${APP_PREFIX} Service Worker: Installation failed:`, error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log(`${APP_PREFIX} Service Worker: Activating...`);
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`${APP_PREFIX} Service Worker: Deleting old cache:`, cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`${APP_PREFIX} Service Worker: Activation complete`);
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
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
          .then((networkResponse) => {
            // Cache dynamic assets on demand
            if (DYNAMIC_ASSETS.some(asset => event.request.url.includes(asset))) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // If both cache and network fail, show offline page for navigation requests
            if (event.request.destination === 'document') {
              return caches.match('/offline.html');
            }
            
            // For images, return a placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#9ca3af">Image not available offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'zeno-background-sync') {
    console.log(`${APP_PREFIX} Service Worker: Background sync triggered`);
    event.waitUntil(doBackgroundSync());
  }
});

// Periodic sync for updates (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'zeno-content-update') {
    console.log(`${APP_PREFIX} Service Worker: Periodic sync for content updates`);
    event.waitUntil(updateCachedContent());
  }
});

async function doBackgroundSync() {
  try {
    // Sync pending orders, cart items, etc.
    const pendingData = await getPendingActions();
    console.log(`${APP_PREFIX} Syncing ${pendingData.length} pending actions`);
    
    for (const action of pendingData) {
      await syncAction(action);
    }
  } catch (error) {
    console.error(`${APP_PREFIX} Background sync failed:`, error);
  }
}

async function updateCachedContent() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = STATIC_ASSETS.map(url => new Request(url));
    
    for (const request of requests) {
      try {
        const networkResponse = await fetch(request);
        await cache.put(request, networkResponse);
      } catch (error) {
        console.log(`${APP_PREFIX} Failed to update:`, request.url);
      }
    }
  } catch (error) {
    console.error(`${APP_PREFIX} Content update failed:`, error);
  }
}

// Utility functions
async function getPendingActions() {
  // Get pending actions from IndexedDB or localStorage
  return JSON.parse(localStorage.getItem('zeno-pending-actions') || '[]');
}

async function syncAction(action) {
  // Sync individual action with server
  try {
    const response = await fetch(action.url, {
      method: action.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data)
    });
    
    if (response.ok) {
      // Remove from pending actions
      const pendingActions = await getPendingActions();
      const updatedActions = pendingActions.filter(a => a.id !== action.id);
      localStorage.setItem('zeno-pending-actions', JSON.stringify(updatedActions));
    }
  } catch (error) {
    throw error;
  }
}