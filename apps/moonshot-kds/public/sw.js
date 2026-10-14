/* Chromium fires beforeinstallprompt only after a service worker with a fetch
   handler controls the page. This worker does not cache: a stale kitchen shell
   would keep showing tickets after a deploy. An empty fetch listener lets the
   browser perform every request itself. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {});
