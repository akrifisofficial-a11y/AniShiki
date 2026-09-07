// ===== SERVICE WORKER ДЛЯ QUARWATCH =====
const CACHE_NAME = 'quarwatch-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/updates.json'
];

// ===== УСТАНОВКА =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Кэширование ресурсов...');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ===== АКТИВАЦИЯ =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Удаление старого кэша:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// ===== ПЕРЕХВАТ ЗАПРОСОВ =====
self.addEventListener('fetch', (event) => {
  // Пропускаем запросы к API (всегда свежие)
  if (event.request.url.includes('kodik-api.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
      .catch(() => {
        return new Response('Офлайн-режим: страница не доступна', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
  );
});
