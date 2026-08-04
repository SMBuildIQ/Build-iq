const CACHE = "buildiq-v2";
// Only public, unauthenticated assets — never cache private app HTML
const PRECACHE = ["/", "/login", "/signup", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

const PRIVATE_PREFIXES = [
  "/dashboard",
  "/projects",
  "/shop",
  "/cart",
  "/orders",
  "/team",
  "/settings",
  "/onboarding",
  "/modules",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (isPrivatePath(url.pathname)) {
    // Network-only for authenticated app surfaces
    event.respondWith(
      fetch(request).catch(() =>
        new Response("You appear to be offline. Connect to load BuildIQ.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
