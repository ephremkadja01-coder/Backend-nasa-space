(function () {
  if (!window.L || !document.getElementById("map")) return;

  const map = L.map("map", { zoomControl: true }).setView([9.458, -5.629], 15);
  const coucheSat = L.tileLayer(
    "https://arcgisonline.com{z}/{y}/{x}",
    { maxZoom: 19, attribution: "Esri Satellite" }
  ).addTo(map);
  const couchePlan = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "OSM" }
  );

  let marqueur = null;
  let calqueAnalyse = L.layerGroup().addTo(map);
  let dernierePos = { lat: 9.458, lon: -5.629 };

  window.basculerFond = function (mode) {
    document.getElementById("btn-sat").classList.toggle("active", mode === "sat");
    document.getElementById("btn-plan").classList.toggle("active", mode === "plan");
    if (mode === "sat") { map.removeLayer(couchePlan); coucheSat.addTo(map); }
    else { map.removeLayer(coucheSat); couchePlan.addTo(map); }
  };

  window.centrerCarte = function () {
    map.setView([dernierePos.lat, dernierePos.lon], 16);
  };

  window.placerPositionCarte = function (lat, lon, libelle) {
    dernierePos = { lat, lon };
    map.setView([lat, lon], 16);
    if (marqueur) map.removeLayer(marqueur);
    marqueur = L.marker([lat, lon]).addTo(map).bindPopup(libelle || "Position GPS").openPopup();
    const elZone = document.getElementById("badge-zone");
    const elCoords = document.getElementById("weather-coords");
    if (elZone) elZone.textContent = libelle || `GPS : ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    if (elCoords) elCoords.textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°O`;
  };

  window.afficherAnalyseParcelle = function (pt) {
    const lat = pt.lat || dernierePos.lat;
    const lon = pt.lon || dernierePos.lon;
    window.placerPositionCarte(lat, lon, `Secteur : ${pt.ville.toUpperCase()}`);
    calqueAnalyse.clearLayers();

    // Périmètre complet de la parcelle (~200m x 200m)
    const d = 0.0012;
    L.polygon(
      [[lat - d, lon - d], [lat + d, lon - d], [lat + d, lon + d], [lat - d, lon + d]],
      { color: "#22c55e", weight: 2, fillColor: "#22c55e", fillOpacity: 0.12 }
    ).addTo(calqueAnalyse);

    // Encadré rouge uniquement sur la sous-zone où un stress ou une fatigue est détecté
    if (pt.niveau_couleur !== "vert") {
      L.polygon(
        [[lat - d, lon - d], [lat + d * 0.4, lon - d], [lat + d * 0.1, lon + d * 0.2], [lat - d, lon + d * 0.2]],
        { color: "#ef4444", weight: 3, fillColor: "#ef4444", fillOpacity: 0.28 }
      ).addTo(calqueAnalyse).bindPopup(`<b>Zone encadrée :</b> ${pt.etat_libelle} (${pt.sante_pct} %)`).openPopup();
    }

    const legende = document.getElementById("legend-box");
    const badgeSante = document.getElementById("badge-sante");
    const barre = document.getElementById("kpi-barre");
    if (legende) legende.hidden = false;
    if (badgeSante) badgeSante.textContent = `${pt.etat_libelle} (${pt.sante_pct} %)`;
    if (barre) { barre.style.width = `${pt.sante_pct}%`; barre.className = `jauge-barre ${pt.niveau_couleur}`; }
  };

  // Centrage automatique sur la position GPS réelle au démarrage si autorisée
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (p) => window.placerPositionCarte(p.coords.latitude, p.coords.longitude, "Votre position GPS"),
      () => {},
      { timeout: 4000 }
    );
  }
})();
