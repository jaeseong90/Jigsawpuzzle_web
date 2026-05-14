const CACHE = "jigsaw-v2";
const ASSETS = ["/", "/manifest.webmanifest", "/icons/icon.svg", "/icons/maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  const sameOrigin = url.origin === location.origin;
  // Stage photos: cache cross-origin Picsum responses (opaque is fine).
  const isStagePhoto =
    url.hostname === "picsum.photos" ||
    url.hostname === "fastly.picsum.photos" ||
    url.hostname.endsWith(".unsplash.com");
  if (!sameOrigin && !isStagePhoto) return;

  // Network-first for HTML so app updates ship quickly.
  if (sameOrigin && (req.mode === "navigate" || req.destination === "document")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match("/")))
    );
    return;
  }

  // Cache-first for static assets and stage photos.
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            // Don't cache failed responses (opaque is OK and has status 0).
            if (res && (res.ok || res.type === "opaque")) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached)
    )
  );
});
