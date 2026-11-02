const CACHE = 'domos-44489556';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never stores old files.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('domos-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // App files: try the network first so updates show right away; use the saved copy when offline.
    e.respondWith(caches.open(CACHE).then(async c => {
      const key = req.mode === 'navigate' ? './' : req;
      try {
        const net = fetch(req, { cache: 'no-cache' });
        const r = await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
        if (r.ok && r.type === 'basic') c.put(key, r.clone());
        return r;
      } catch (err) {
        const hit = await c.match(key, { ignoreSearch: true });
        return hit || fetch(req);
      }
    }));
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    // Fonts: cache on first use so the app looks right offline.
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const r = await fetch(req); c.put(req, r.clone()); return r; } catch (err) { return new Response('', { status: 504 }); }
    }));
  }
});
