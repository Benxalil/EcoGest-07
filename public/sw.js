/**
 * 🚀 OPTIMISATION: Service Worker pour cache agressif des assets
 * Cache les images et fichiers statiques pour améliorer les performances
 */

const CACHE_NAME = 'ecogest-cache-v1';
const ASSETS_TO_CACHE = [
  '/lovable-uploads/',
  '/assets/',
  '/*.png',
  '/*.jpg',
  '/*.jpeg',
  '/*.svg',
  '/*.webp'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installation');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cache ouvert');
      return cache;
    })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Stratégie de cache: Cache First pour les assets, Network First pour le reste
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache agressif pour les uploads et assets
  if (
    url.pathname.includes('/lovable-uploads/') ||
    url.pathname.includes('/assets/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff|woff2)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log('[Service Worker] Serving from cache:', url.pathname);
          return response;
        }

        return fetch(event.request).then((networkResponse) => {
          // Ne cacher que les réponses réussies
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network First pour le reste (HTML, API, etc.)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        // Fallback au cache si le réseau échoue
        return caches.match(event.request);
      })
  );
});
