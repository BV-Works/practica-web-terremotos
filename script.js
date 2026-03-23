let map = L.map("map", {
//   worldCopyJump: true,
    maxBounds: [[-90, -180], [90, 180]],
    maxBoundsViscosity: 1.0,
    minZoom: 2,
    maxZoom: 10
}).setView([20, 0], 2);

let Esri_NatGeoWorldMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
	maxZoom: 16
}).addTo(map);


// //Agregar marcador
// const marker = L.marker([51.5, -0.09])
// .bindPopup("cheese house")
// .addTo(map);

// //Agregar popup
// const popup = L.popup()
//     .setLatLng([51.513, -0.09])
//     .setContent("I am a standalone popup.")
//     .openOn(map);

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
      tiempo: new Date(eq.properties.time),
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
    //Tratamiento de datos
    const coordenadas_terremoto = [
      terremoto.coordenadas.lat,
      terremoto.coordenadas.lon,
    ];

    // Representación de datos
    const marker = L.marker(coordenadas_terremoto)
      .bindPopup(
        `${terremoto.nombre}<br><button class='fav-btn'>Añadir a favoritos</button>`,
      )
      .addTo(map);

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
