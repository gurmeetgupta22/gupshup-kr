self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache fonts
  if (url.origin.startsWith('https://fonts.googleapis.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open('google-fonts-cache').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
  
  // Cache fonts
  if (url.origin.startsWith('https://fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open('google-fonts-cache').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
  
  // Cache API responses
  if (event.request.url.startsWith(window.location.origin + '/api/')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response && Date.now() - new Date(response.headers.get('date') || 0) < 300000) {
          return response;
        }
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open('api-cache').then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
  
  // Fall back to network
  event.respondWith(fetch(event.request));
});