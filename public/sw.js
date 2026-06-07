// Voyra Bali — minimal service worker
// Cache strategy (stale-proof by design):
// - HTML pages: NOT cached. Always go to network → never serve an old build.
// - JS / CSS:   NOT cached here. Next.js hashes filenames; the browser's
//               normal HTTP cache + new hashes guarantee freshness.
// - Images / fonts: cache-first (content is stable, safe to cache forever).
// - API: network-only.
// The SW exists mainly for Web Push + fast images, NOT for offline pages.

const STATIC_CACHE = "voyra-static-v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

// Page asks the waiting worker to activate immediately (new deploy).
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Only same-origin GETs are eligible for our cache logic.
  if (url.origin !== self.location.origin) return;

  // Cache-first ONLY for stable media (images + fonts). Safe — never stale
  // in a way that breaks the app, and Next image URLs change when content does.
  const isStableMedia =
    url.pathname.startsWith("/images/") ||
    /\.(woff2?|png|jpe?g|webp|gif|svg|ico)$/.test(url.pathname);

  if (isStableMedia) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Everything else (HTML pages, JS, CSS, API) → pass through to network.
  // We do NOT call respondWith, so the browser handles it normally and the
  // newest build is always served. This is what makes the app stale-proof.
});

// ── Web Push ───────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Voyra Bali", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Voyra Bali";
  const opts = {
    body: data.body || "",
    icon: data.icon || "/images/icons/icon-192.png",
    badge: "/images/icons/icon-192.png",
    tag: data.tag || "voyra",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(target) && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
