/**
 * Solar Eclipse Guide UK 2026 — Service Worker
 * Caches all app assets for full offline support.
 */

const CACHE_NAME = 'eclipse-guide-v2';

// All assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/eclipse-map.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ─── Install: pre-cache all assets ───────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Activate immediately without waiting for old SW to die
  self.skipWaiting();
});

// ─── Activate: clean up old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: serve from cache, fall back to network ───────────────────────────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // For YouTube embeds / external resources — network only, no caching
  const url = new URL(event.request.url);
  if (url.hostname.includes('youtube') || url.hostname.includes('ytimg')) {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — try network then cache the response
      return fetch(event.request)
        .then(response => {
          // Only cache valid same-origin responses
          if (
            response &&
            response.status === 200 &&
            response.type === 'basic'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return cached index.html for navigation requests when offline
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
