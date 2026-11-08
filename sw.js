/* راجع لنفسي — Service Worker: Offline كامل */
const CACHE = 'raj3-v13';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/styles.css', './js/store.js', './js/data-rain.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  // cache:'reload' يأمر الملفات على الشبكة الفعلية — GitHub Pages كاش 10 دقايق ممكن يزوّرنا بنسخة قديمة
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
// Cache-first للملفات المحلية، مع تجاوز الجيد للمتصفح
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
