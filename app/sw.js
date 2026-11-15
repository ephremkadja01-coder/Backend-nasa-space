// Fonctionnement hors connexion. Tout est servi d'abord depuis le cache, pour que
// l'application démarre même quand le réseau ne répond pas. Les recommandations sont
// ensuite mises à jour en arrière-plan si le réseau répond.
const CACHE = "conseil-rotation-v30";
const FICHIERS = ["./", "index.html", "style.css", "app.js", "icone.svg", "icone-192.png", "icone-512.png",
                  "manifest.webmanifest", "donnees/recommandations.json", "donnees/localites.json", "donnees/parcelles_satellite.json"];

async function installer() {
  const cache = await caches.open(CACHE);
  await cache.addAll(FICHIERS);
  const donnees = await (await cache.match("donnees/recommandations.json")).json();
  const audios = Object.values(donnees.lieux).flatMap((l) => Object.values(l.resultats))
    .map((r) => r.audio).filter(Boolean);
  await cache.addAll(audios);
  // Le diagnostic, environ 17 Mo, n'est pas installé ici, pour que l'essentiel soit prêt sans
  // attendre. L'application le télécharge ensuite en arrière-plan.
}

self.addEventListener("install", (e) => {
  e.waitUntil(installer().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()));
});

async function mettreAJour(requete) {
  try {
    const reponse = await fetch(requete, { cache: "no-store" });
    if (reponse.ok) await (await caches.open(CACHE)).put(requete, reponse.clone());
    return reponse;
  } catch (e) {
    return undefined;
  }
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  if (e.request.mode === "navigate") {
    e.respondWith(caches.match("index.html").then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((enCache) => {
    if (e.request.url.endsWith("donnees/recommandations.json")) {
      const miseAJour = mettreAJour(e.request);
      e.waitUntil(miseAJour);
      if (enCache) return enCache;
      return miseAJour.then((r) => r || Response.error());
    }
    return enCache || fetch(e.request);
  }));
});
