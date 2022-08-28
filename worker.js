self.addEventListener('install', (event) => {
    event.waitUntil(caches.open('offline-backup').then(cache => cache.addAll([
        'app.webmanifest', 'favicon.svg', 'index.html', 'script.js', 'style.css'
    ])));
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then(response => {
            caches.open('offline-backup').then(cache => cache.put(event.request, response.clone()));
            return response.clone();
        }).catch(() => caches.open('offline-backup').then(cache => cache.match(event.request)))
    );
});