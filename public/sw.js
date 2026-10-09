// Service worker: schil en inhoud bewaren zodat het spel zonder bereik werkt.
const VERSIE = 'v3';
const SCHIL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg',
  'js/app.js', 'js/store.js', 'js/sync.js', 'js/dom.js', 'js/logica.js', 'js/grafiek.js', 'js/vragen.js', 'js/feest.js',
  'data/index.json', 'data/level1.json',
];
// De rest van de lesinhoud (samen ruim 100 kB ingepakt) wordt op de achtergrond bewaard, zodat alle levels ook zonder bereik werken.
const INHOUD = ['data/level2.json', 'data/level3.json', 'data/level4.json', 'data/level5.json', 'data/level6.json', 'data/rt1.json', 'data/rt2.json'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIE).then((c) => c.addAll(SCHIL).then(() => Promise.allSettled(INHOUD.map((u) => c.add(u))))).then(() => self.skipWaiting()));
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
