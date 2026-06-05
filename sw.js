/* MyLittlePenguin — Service Worker
 * Objectif : démarrage hors-ligne + app plus robuste (et plus de page blanche
 * quand le réseau est capricieux, typiquement en raccourci écran d'accueil iOS).
 *
 * Stratégies :
 *  - Navigation (HTML)            : réseau d'abord, repli sur le cache (puis index.html).
 *  - Assets statiques même origine: stale-while-revalidate.
 *  - CDN (jsDelivr, Google Fonts) : stale-while-revalidate.
 *  - Supabase (API/Storage)       : réseau uniquement (jamais en cache).
 *  - Tuiles de carte (OSM/MapTiler): réseau uniquement (évite un cache énorme).
 *
 * IMPORTANT : pense à incrémenter CACHE_VERSION à chaque déploiement notable
 * pour forcer le rafraîchissement des assets en cache.
 */
const CACHE_VERSION = 'mlp-v2';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/app-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isMapTile(url) {
  return /tile\.openstreetmap\.org/.test(url) || /api\.maptiler\.com/.test(url);
}
function isSupabase(url) {
  return /supabase\.co/.test(url);
}
function isCDN(url) {
  return /cdn\.jsdelivr\.net/.test(url) || /fonts\.googleapis\.com/.test(url) || /fonts\.gstatic\.com/.test(url) || /unpkg\.com/.test(url);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;

  // Jamais en cache : API/Storage Supabase, tuiles de carte, géocodage.
  if (isSupabase(url) || isMapTile(url) || /photon\.komoot\.io/.test(url)) {
    return; // laisse le navigateur faire (réseau direct)
  }

  // Navigation (chargement de page) : réseau d'abord, repli cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // CDN + assets statiques même origine : stale-while-revalidate.
  const sameOrigin = url.startsWith(self.location.origin);
  if (sameOrigin || isCDN(url)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && (res.status === 200 || res.type === 'opaque')) {
              const copy = res.clone();
              caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
