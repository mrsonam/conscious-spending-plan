// Minimal, safety-first service worker for the Finance app.
// This version intentionally does not implement any custom caching
// or push logic to avoid deployment/runtime issues.
//
// If you later want offline support, you can extend this file with a
// well-tested caching strategy. For now it just activates cleanly.

// Install: activate immediately so new versions take effect quickly
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

// Activate: take control of all clients
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

