// Service worker de base pour Réunion IA
// Met en cache la coquille de l'application pour permettre un premier
// chargement hors-ligne. Ne met jamais en cache les appels à l'API IA
// (requêtes POST), qui doivent toujours passer par le réseau.
//
// Chemins relatifs : fonctionne aussi bien à la racine d'un domaine
// (ex. Netlify) que dans un sous-dossier (ex. GitHub Pages
// username.github.io/nom-du-repo/).

const CACHE_NAME = "reunion-ia-cache-v26";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./app-background.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .catch((err) => console.warn("Mise en cache initiale échouée :", err))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // On ne touche jamais aux requêtes non-GET (ex. appels à l'API IA)
  if (event.request.method !== "GET") return;

  // On ignore aussi les requêtes vers d'autres origines (API externes)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
