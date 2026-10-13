const CACHE_NAME = 'agent-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never cache API calls — always go to network.
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    (async () => {
      if (event.request.mode === 'navigate') {
        try {
          const response = await fetch(event.request);
          if (response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        } catch (err) {
          const cached =
            (await caches.match(event.request)) ||
            (await caches.match('/')) ||
            (await caches.match('/index.html'));
          if (cached) return cached;
          return new Response('<h1>You are offline</h1>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          });
        }
      }
      try {
        return await fetch(event.request);
      } catch (err) {
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })()
  );
});

// Phone push (Web Push): deposit + withdrawal alerts even with the app closed.
// Tapping opens the matching pending list.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Nexora Agent', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Nexora Agent';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: { url: (data.data && data.data.url) || '/dashboard/pending-deposits' },
      requireInteraction: true,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/dashboard/pending-deposits';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/dashboard')) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
