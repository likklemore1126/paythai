// Thai Pocket Cards Service Worker
// NOTE: Bump SW_VERSION whenever app.html's APP_VERSION changes,
// so returning users get the fresh file instead of a stale cached one.
const SW_VERSION = '2026-07-15d';
const CACHE_NAME = `taka-thaipocket-${SW_VERSION}`;

const APP_SHELL = [
  './app.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-192-maskable.png',
  './icon-512-maskable.png',
  './so_chain.m4a',
  './vowel_s1.m4a', './vowel_s3.m4a', './vowel_s5.m4a', './vowel_s7.m4a',
  './vowel_s9.m4a', './vowel_s11.m4a', './vowel_s13.m4a', './vowel_s15.m4a', './vowel_s17.m4a',
  './vowel_l1.m4a', './vowel_l3.m4a', './vowel_l5.m4a', './vowel_l7.m4a',
  './vowel_l9.m4a', './vowel_l11.m4a', './vowel_l13.m4a', './vowel_l15.m4a', './vowel_l17.m4a',
  './vowel_d1.m4a', './vowel_d2.m4a', './vowel_d3.m4a', './vowel_d4.m4a', './vowel_d5.m4a', './vowel_d6.m4a',
  './vowel_sp1.m4a', './vowel_sp2.m4a', './vowel_sp3.m4a', './vowel_sp4.m4a',
  './vowel_sp5.m4a', './vowel_sp6.m4a', './vowel_sp7.m4a', './vowel_sp8.m4a',
  './help_tts_ios_1.jpeg', './help_tts_ios_2.jpeg', './help_tts_ios_3.jpeg', './help_tts_ios_4.jpeg',
  './help_tts_android_1.png', './help_tts_android_2.png', './help_tts_android_3.png', './help_tts_android_4.png',
  './help_pg_1.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
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
      const networkFetch = fetch(request)
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
