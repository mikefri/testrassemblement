const CACHE_NAME = 'anomalies-kit-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Installation : mise en cache des ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Cache ouvert');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : stratégie Network First avec fallback cache
self.addEventListener('fetch', event => {
  const { request } = event;

  // Ne pas intercepter les requêtes Firebase (API, auth, Firestore)
  if (
    request.url.includes('firebaseio.com') ||
    request.url.includes('googleapis.com') ||
    request.url.includes('firestore.googleapis.com') ||
    request.url.includes('identitytoolkit.googleapis.com') ||
    request.url.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Mettre en cache les réponses valides
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback : servir depuis le cache
        return caches.match(request).then(cachedResponse => {
          if (cachedResponse) return cachedResponse;
          // Page de fallback offline si c'est une navigation
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
