// Codify Service Worker — caches Pyodide WASM assets so they survive page refreshes.
// Scope is intentionally narrow: only /pyodide/* is cached. All other requests
// pass through to the network untouched.

const PYODIDE_CACHE = "pyodide-v0.27.2";
const PYODIDE_PREFIX = "/pyodide/";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PYODIDE_CACHE).then((cache) =>
      cache.addAll([
        "/pyodide/v0.27.2/pyodide.js",
        "/pyodide/v0.27.2/pyodide.asm.js",
        "/pyodide/v0.27.2/pyodide.asm.wasm",
        "/pyodide/v0.27.2/python_stdlib.zip",
        "/pyodide/v0.27.2/pyodide-lock.json",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("pyodide-") && key !== PYODIDE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only intercept same-origin /pyodide/ requests
  if (!url.pathname.startsWith(PYODIDE_PREFIX)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful responses for future use
        if (response.ok) {
          const clone = response.clone();
          caches.open(PYODIDE_CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
