/*
 * Service worker.
 *
 * HTML/navigations use a NETWORK-FIRST strategy so every load gets the current
 * index.html — and therefore the current content-hashed asset URLs. The
 * previous version cached index.html cache-first, which kept serving an old
 * shell after a redeploy; its stale asset hashes then 404'd and the app failed
 * to render (blank/gray screen).
 *
 * Content-hashed static assets are immutable, so they use cache-first.
 * Old caches are purged on activate, and the new worker takes over immediately
 * (skipWaiting + clients.claim) so broken installs self-heal on the next visit.
 */
const CACHE = 'worksync-cache-v2';
const SHELL = ['/', '/logo.svg', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only manage same-origin requests; let Firebase/Google/etc. pass straight through.
  if (url.origin !== self.location.origin) return;

  const accept = req.headers.get('accept') || '';
  const isHTML = req.mode === 'navigate' || accept.includes('text/html');

  if (isHTML) {
    // Network-first: always fetch fresh HTML so asset hashes match the deploy.
    event.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static (content-hashed) assets: cache-first, then populate the cache.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      });
    })
  );
});
