const CACHE = 'scanner-v1';
const PRECACHE = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// Install: pre-cache the supabase library
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE))
  );
  // Take over immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// Activate: wipe old caches, claim all clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
  // Tell every open scanner tab to reload so they get the new version instantly
  self.clients.matchAll({ type: 'window' }).then(clients => {
    clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }));
  });
});

// Fetch strategy:
// - scanner.html → always network-first, fall back to cache only if offline
// - supabase CDN → cache-first (it never changes for a fixed version)
// - everything else → network only
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // scanner.html — network first, always get fresh HTML
  if (url.pathname.endsWith('scanner.html') || url.pathname.endsWith('/scanner')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // Supabase CDN — cache first
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // Everything else — straight to network
  e.respondWith(fetch(e.request));
});
