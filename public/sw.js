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

// Set pour tracker les assets déjà loggés (évite les logs répétitifs)
self.cachedAssetsLogged = new Set();

// Installation du service worker
self.addEventListener('install', (event) => {
  if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
    console.log('[SW] Installation');
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache;
    })
  );
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            if (self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1') {
              console.log('[SW] Suppression ancien cache:', cacheName);
            }
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
          // ✅ Logger uniquement une fois par asset et seulement en dev
          const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
          if (isDev && !self.cachedAssetsLogged.has(url.pathname)) {
            console.log('[SW] Cache:', url.pathname);
            self.cachedAssetsLogged.add(url.pathname);
          }
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
