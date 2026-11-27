'use strict';

// Service worker de l'application installée : l'interface s'ouvre même sans réseau.
// Stratégie « réseau d'abord » : on sert toujours la dernière version, le cache ne sert qu'hors connexion.
// Les appels /api/ (commandes, menus) ne sont jamais mis en cache.

const CACHE = 'winged-eats-v5';
const SHELL = [
  './', './index.html', './app.js?v=4', './refinement.css?v=5',
  './card-grillades.svg', './card-africaine.svg', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', '../shared/demo-api.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/')) return;
  event.respondWith(fetch(req)
    .then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
