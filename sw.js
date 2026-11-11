// Thai Pocket Cards Service Worker
// NOTE: Bump SW_VERSION whenever app.html's APP_VERSION changes,
// so returning users get the fresh file instead of a stale cached one.
const SW_VERSION = '2026-11-11g';
const CACHE_NAME = `taka-thaipocket-${SW_VERSION}`;

const APP_SHELL = [
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './help_tts_ios_1.jpeg', './help_tts_ios_2.jpeg', './help_tts_ios_3.jpeg', './help_tts_ios_4.jpeg',
  './help_tts_android_1.png', './help_tts_android_2.png', './help_tts_android_3.png', './help_tts_android_4.png',
  './num_rule1.jpeg', './num_rule2.jpeg', './num_rule3.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // cache.addAll() uses the browser's normal HTTP cache for each fetch, so when a
      // file's URL doesn't change between versions (images, audio, icons), the browser
      // can silently hand back an old cached response here instead of real bytes from
      // the network — meaning a new SW version can still precache stale image content.
      // {cache:'reload'} forces every precache fetch to bypass the HTTP cache so a
      // version bump always pulls the current file from the server.
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: 'reload' }).then((response) => {
            if (!response.ok) throw new Error(`precache fetch failed: ${url} (${response.status})`);
            return cache.put(url, response);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('taka-thaipocket-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests; let everything else pass through normally.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      // Bypass the HTTP cache here too, for the same reason as the install step above:
      // otherwise this background refresh can quietly re-save an old cached response.
      const networkFetch = fetch(request, { cache: 'reload' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Cache-first for speed & offline reliability; refresh cache in background.
      return cached || networkFetch;
    })
  );
});
