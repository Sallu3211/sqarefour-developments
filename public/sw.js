// Minimal service worker — its only job is to exist with a fetch handler
// so Android Chrome treats this as a fully "installable" app (own window,
// no address bar) instead of just a home-screen bookmark shortcut. It
// intentionally does no caching: this app always needs fresh Supabase
// data, so we don't want stale-content bugs from an offline cache.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
