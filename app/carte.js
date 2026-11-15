(function () {
  const conteneur = document.getElementById("map");
  if (!window.L || !conteneur) return;

  const map = L.map("map", { zoomControl: true }).setView([9.458, -5.629], 15);
  new ResizeObserver(() => map.invalidateSize()).observe(conteneur);

  const GrilleLocale = L.GridLayer.extend({
    createTile: function (coords) {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#121b17";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(34, 197, 94, 0.16)";
      ctx.strokeRect(0, 0, 256, 256);
      return c;
    },
  });
  new GrilleLocale().addTo(map);

  L.tileLayer(
    "https://arcgisonline.com{z}/{y}/{x}",
    { maxZoom: 19 }
  ).addTo(map);

  let marqueur = null;
  const calqueAnalyse = L.layerGroup().addTo(map);
  let dernierePos = { lat: 9.458, lon: -5.629 };

  window.placerPositionCarte = function (lat, lon, libelle) {
    dernierePos = { lat, lon };
    map.invalidateSize();
    map.setView([lat, lon], 16);
    if (marqueur) map.removeLayer(marqueur);
    marqueur = L.circleMarker([lat, lon], { radius: 8, color: "#fff", fillColor: "#22c55e", fillOpacity: 1, weight: 2 })
      .addTo(map).bindPopup(libelle || "Position GPS").openPopup();
    document.getElementById("badge-zone").textContent = libelle || `GPS : ${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    document.getElementById("weather-coords").textContent = `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°O`;
  };

  window.afficherAnalyseParcelle = function (pt) {
    const lat = dernierePos.lat;
    const lon = dernierePos.lon;
    map.invalidateSize();
    map.setView([lat, lon], 16);
    calqueAnalyse.clearLayers();
    const d = 0.0012;
    L.polygon([[lat - d, lon - d], [lat + d, lon - d], [lat + d, lon + d], [lat - d, lon + d]],
      { color: "#22c55e", weight: 2, fillOpacity: 0.12 }).addTo(calqueAnalyse);
    if (pt.niveau_couleur !== "vert") {
      L.polygon([[lat - d, lon - d], [lat + d * 0.4, lon - d], [lat + d * 0.1, lon + d * 0.2], [lat - d, lon + d * 0.2]],
        { color: "#ef4444", weight: 3, fillColor: "#ef4444", fillOpacity: 0.3 }).addTo(calqueAnalyse)
        .bindPopup(`<b>Zone encadrée :</b> ${pt.etat_libelle} (${pt.sante_pct} %)`).openPopup();
    }
    document.getElementById("legend-box").hidden = false;
    document.getElementById("badge-sante").textContent = `${pt.etat_libelle} (${pt.sante_pct} %)`;
    const barre = document.getElementById("kpi-barre");
    barre.style.width = `${pt.sante_pct}%`;
    barre.className = `jauge-barre ${pt.niveau_couleur}`;
  };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (p) => window.placerPositionCarte(p.coords.latitude, p.coords.longitude, "Votre position GPS"),
      () => {}, { timeout: 5000 }
    );
  }
})();
