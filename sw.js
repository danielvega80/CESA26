// Service worker — Asturias CESA
// Cachea la app para que abra sin conexión; los partidos siempre se piden a la red primero.
const CACHE = 'cesa-v1';
const APP = ['./', './index.html', './icon-192.png', './icon-512.png', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // partidos.json y la API de GitHub: red primero, cae a caché si no hay conexión
  if (/partidos\.json/.test(url.pathname) || url.hostname === 'api.github.com') {
    e.respondWith(
      fetch(req).then(res => {
        if (/partidos\.json/.test(url.pathname)) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // resto: caché primero, con respaldo de red
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
