self.skipWaiting();
const CACHE = 'scp-portable-v14';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/styles.css', '/app.js', '/config.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))); });
self.addEventListener('fetch', e => { e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))); });
