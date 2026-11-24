const CACHE = 'den-shell-fd51364a1f52053f';
const shell = new URL('index.html', self.registration.scope).href;
const paths = ["index.html", "style.css?v=09aa469f2711", "config.js?v=66028fe97e03", "denman-transparent.png", "denman-sprites.png", "app-icon-graphite-180.png", "app-icon-graphite-192.png", "app-icon-graphite-512.png", "app-icon-graphite.webmanifest", "app-icon-lavender-180.png", "app-icon-lavender-192.png", "app-icon-lavender-512.png", "app-icon-lavender.webmanifest", "app-icon-letter-d-180.png", "app-icon-letter-d-192.png", "app-icon-letter-d-512.png", "app-icon-letter-d-lavender-180.png", "app-icon-letter-d-lavender-192.png", "app-icon-letter-d-lavender-512.png", "app-icon-letter-d-lavender.webmanifest", "app-icon-letter-d-sage-180.png", "app-icon-letter-d-sage-192.png", "app-icon-letter-d-sage-512.png", "app-icon-letter-d-sage.webmanifest", "app-icon-letter-d.webmanifest", "app-icon-sage-180.png", "app-icon-sage-192.png", "app-icon-sage-512.png", "app-icon-sage.webmanifest"];
const resources = new Set(paths.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([...resources])));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('den-shell-') && key !== CACHE).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.open(CACHE).then(cache => cache.match(shell))));
  } else if (resources.has(request.url)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(request)).then(response => response || fetch(request)));
  }
});
