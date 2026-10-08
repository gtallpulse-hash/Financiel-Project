// Service worker: schil en inhoud bewaren zodat het spel zonder bereik werkt.
const VERSIE = 'v1';
const SCHIL = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/store.js', 'js/sync.js',
  'data/test.json', 'manifest.webmanifest', 'icon.svg',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIE).then((c) => c.addAll(SCHIL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((k) => Promise.all(k.filter((n) => n !== VERSIE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // Eerst het netwerk (altijd de nieuwste inhoud), bij geen bereik de bewaarde versie.
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        if (r.ok) { const kopie = r.clone(); caches.open(VERSIE).then((c) => c.put(e.request, kopie)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
