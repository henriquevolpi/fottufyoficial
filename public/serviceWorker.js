// This is the service worker with the Cache-first network
// It caches assets for offline use and handles SPA routing

// INSTALL: cache basic assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('fottufy-cache-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/index.css',
        '/assets/index.js',
        '/logo.png',
        '/favicon.ico'
      ]);
    })
  );
});

// ACTIVATE: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName.startsWith('fottufy-cache-') && 
                 cacheName !== 'fottufy-cache-v1';
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

// FETCH: serve from cache or network with SPA navigation handling
self.addEventListener('fetch', (event) => {
  // Handle SPA navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }
  
  // Cache-first strategy for assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((response) => {
        // Cache new requests
        if (
          event.request.url.includes('/assets/') ||
          event.request.url.includes('.png') ||
          event.request.url.includes('.jpg') ||
          event.request.url.includes('.svg') ||
          event.request.url.includes('.ico')
        ) {
          let responseClone = response.clone();
          caches.open('fottufy-cache-v1').then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }).catch(() => {
      // Fallback for HTML requests
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('/index.html');
      }
    })
  );
});