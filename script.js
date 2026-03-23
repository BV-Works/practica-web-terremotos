let map1 = L.map("map1", {
  maxBounds: [
    [-90, -190],
    [90, 190],
  ],
  maxBoundsViscosity: 1.0,
  minZoom: 1,
  maxZoom: 10,
}).setView([20, 0], 2);

let map2 = L.map("map2", {
  maxBounds: [
    [-90, -190],
    [90, 190],
  ],
  maxBoundsViscosity: 1.0,
  minZoom: 1,
  maxZoom: 10,
}).setView([20, 0], 2);

let Esri_NatGeoWorldMap1 = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC",
    maxZoom: 16,
  },
).addTo(map1);

let Esri_NatGeoWorldMap2 = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
  {
    attribution:
      "Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC",
    maxZoom: 16,
  },
).addTo(map2);

map1.scrollWheelZoom.disable();
map2.scrollWheelZoom.disable();
// Habilitar solo si se mantiene Ctrl
map1.on('wheel', function(e) {
  if (e.originalEvent.ctrlKey) {
    map1.scrollWheelZoom.enable();
  } else {
    map1.scrollWheelZoom.disable();
  }
});

map2.on('wheel', function(e) {
  if (e.originalEvent.ctrlKey) {
    map2.scrollWheelZoom.enable();
  } else {
    map2.scrollWheelZoom.disable();
  }
});


async function obtenerTerremotos() {
  const url =
    "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error en la petición");
    }

    const data = await response.json();

    return data.features.map((eq) => ({
      id: eq.id,
      nombre: eq.properties.title,
      magnitud: eq.properties.mag,
      lugar: eq.properties.place,
      fecha: new Date(eq.properties.time),
      coordenadas: {
        lat: eq.geometry.coordinates[1],
        lon: eq.geometry.coordinates[0],
        profundidad: eq.geometry.coordinates[2],
      },
      url: eq.properties.url,
    }));
  } catch (error) {
    console.error("Error obteniendo terremotos:", error);
    return [];
  }
}

(async () => {
  const terremotos = await obtenerTerremotos();

  terremotos.map((terremoto) => {
    const coordenadas_terremoto = [
      terremoto.coordenadas.lat,
      terremoto.coordenadas.lon,
    ];

    const color = getColor(terremoto.magnitud);
    const marker = L.circleMarker(coordenadas_terremoto, {
      radius: 3 + terremoto.magnitud,
      fillColor: color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    })
      .bindPopup(crearPopup(terremoto, color))
      .addTo(map1);

    marker.on("popupopen", (e) => {
      const favButton = e.popup._contentNode.querySelector(".fav-btn");
      if (favButton) {
        favButton.addEventListener("click", () => {
          alert("favorito guardado:" + terremoto.nombre);
        });
      }
    });
  });
  console.log(terremotos);
})();

function getColor(mag) {
  if (mag < 1) return "#9e9e9e";
  if (mag < 2) return "#4caf50";
  if (mag < 3) return "#1b5e20";
  if (mag < 4) return "#ffeb3b";
  if (mag < 5) return "#ffb74d";
  if (mag < 6) return "#ef6c00";
  if (mag < 7) return "#d32f2f";
  return "#e91e63";
}

function crearPopup(terremoto, color) {
  return `
    <div class="quake-popup" style="background:${color}">
      <h3 class="quake-title">🌍 Terremoto</h3>

      <p><strong>Nombre:</strong> ${terremoto.nombre}</p>
      <p><strong>Fecha del Evento:</strong> ${terremoto.fecha.toLocaleString()}</p>
      <p><strong>Ubicación:</strong> ${terremoto.lugar}</p>
      <p><strong>Código:</strong> ${terremoto.id}</p>
      <p><strong>Magnitud:</strong> ${terremoto.magnitud}</p>

      <button class="fav-btn">⭐ Añadir a favoritos</button>
    </div>
  `;
}
