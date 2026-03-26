// FIREBASE

const firebaseConfig = {
  apiKey: "AIzaSyDBNBCyEOhDM32ydcr0Irq9TrzcDrX4Xw8",
  authDomain: "app-terremotos.firebaseapp.com",
  projectId: "app-terremotos",
  storageBucket: "app-terremotos.firebasestorage.app",
  messagingSenderId: "855782016333",
  appId: "1:855782016333:web:ab349cdd464f3050c2e304",
};
firebase.initializeApp(firebaseConfig); // Inicializaar app Firebase

const db = firebase.firestore(); // db representa mi BBDD //inicia Firestore

// VARIABLES Y CONSTANTES
const errorDiv = document.getElementById("errorMsg");
const today = new Date().toISOString().split("T")[0];

document.getElementById("startDate").max = today;
document.getElementById("endDate").max = today;
document.getElementById("endDate").value = today;



let isLogin = true;

const authTitle = document.getElementById("authTitle");
const authButton = document.getElementById("authButton");
const authToggle = document.getElementById("authToggle");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const welcomeMessage = document.getElementById("welcomeMessage");
const logoutBtn = document.getElementById("logoutBtn");
const mapButtons = document.getElementById("mapButtons");

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

let terremotosGlobal = [];
let terremotosFiltrados = [];
let favoritos = [];

// EVENTOS

authToggle.addEventListener("click", () => {
  changeForm();
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = authEmail.value.trim();
  const password = authPassword.value;

  // Validación básica email
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    alert("Introduce un email válido");
    return;
  }

  // Validación mínima de password
  if (!password || password.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres");
    return;
  }

  try {
    let userLogged;

    if (isLogin) {
      userLogged = await firebase.auth().signInWithEmailAndPassword(email, password);
      pintarMapaFavs(true);
    } else {
      pintarMapaFavs(true);
      userLogged = await firebase.auth().createUserWithEmailAndPassword(email, password);
    }

    authTitle.classList.add("hidden")
    authForm.classList.add("hidden");
    authToggle.classList.add("hidden");

    welcomeMessage.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    welcomeMessage.textContent = `Bienvenido ${userLogged.user.email}`;
    mapButtons.classList.remove("hidden");
  } catch (error) {
    alert(error.message);
  }
});


logoutBtn.addEventListener("click", async () => {
  try {
    await firebase.auth().signOut();

    authForm.reset();
    authTitle.classList.remove("hidden")
    authForm.classList.remove("hidden");
    authToggle.classList.remove("hidden");
    welcomeMessage.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    mapButtons.classList.add("hidden");

    if (!isLogin) changeForm();
    pintarMapaFavs();
  } catch (error) {
    alert("Error cerrando sesión: " + error.message);
  }
});

document.getElementById("filtrarBtn").addEventListener("click", (e) => {
  e.preventDefault();
  actualizarMapaFiltrado();
});

map1.scrollWheelZoom.disable();
map2.scrollWheelZoom.disable();
// Habilitar solo si se mantiene Ctrl
map1.on("wheel", function (e) {
  if (e.originalEvent.ctrlKey) {
    map1.scrollWheelZoom.enable();
  } else {
    map1.scrollWheelZoom.disable();
  }
});

map2.on("wheel", function (e) {
  if (e.originalEvent.ctrlKey) {
    map2.scrollWheelZoom.enable();
  } else {
    map2.scrollWheelZoom.disable();
  }
});

// FUNCIONES

function changeForm() {
  isLogin = !isLogin;

  if (isLogin) {
    authTitle.textContent = "Login";
    authButton.textContent = "Entrar";
    authToggle.textContent = "¿No estás registrado?";
  } else {
    authTitle.textContent = "Sign Up";
    authButton.textContent = "Registrarse";
    authToggle.textContent = "¿Ya tienes cuenta?";
  }
}

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

async function obtenerTerremotosFiltrados(minMag, startDate, endDate) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startDate}&endtime=${endDate}&minmagnitude=${minMag}`;
  errorDiv.textContent = '';
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error en la petición filtrada");
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
    console.error("Error obteniendo terremotos filtrados:", error);
    // Mostrar en pantalla
    if (errorDiv) {
      errorDiv.textContent = "Error al obtener datos: " + error.message;
    } else {
      alert("Error al obtener datos: " + error.message);
    }
    return [];
  }
}

function pintarMapaFavs(isLoggedIn = false) {
  limpiarMapa(map1);

  terremotosGlobal.forEach((terremoto) => {
    crearMarker(map1, terremoto, true, isLoggedIn);
  });
}

function pintarMapaFiltroInit() {
  limpiarMapa(map2);

  terremotosGlobal.forEach((terremoto) => {
    crearMarker(map2, terremoto, false);
  });
}

function pintarMapaFiltrado() {
  terremotosFiltrados.forEach((terremoto) => {
    crearMarker(map2, terremoto, false);
  });
}

async function actualizarMapaFiltrado() {
  const minMag = parseFloat(document.getElementById("minMag").value);
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;

  if (!validarFiltros(minMag, startDate, endDate)) return;

  limpiarMapa(map2);

  terremotosFiltrados = await obtenerTerremotosFiltrados(
    minMag,
    startDate,
    endDate
  );

  pintarMapaFiltrado();
}

function validarFiltros(minMag, startDate, endDate) {
  const hoy = new Date();

  if (minMag < 1 || minMag > 7) {
    alert("La magnitud debe estar entre 1 y 7");
    return false;
  }

  const fechaInicio = new Date(startDate);
  const fechaFin = new Date(endDate);
  const fechaMin = new Date("2024-01-01");

  if (fechaInicio < fechaMin || fechaFin < fechaMin) {
    alert("Las fechas deben ser posteriores a 01/01/2024");
    return false;
  }

  if (fechaInicio > hoy || fechaFin > hoy) {
    alert("Las fechas no pueden ser futuras");
    return false;
  }

  if (fechaInicio > fechaFin) {
    alert("La fecha de inicio no puede ser mayor que la de fin");
    return false;
  }

  return true;
}

function limpiarMapa(map) {
  map.eachLayer((layer) => {
    if (!(layer instanceof L.TileLayer)) {
      map.removeLayer(layer);
    }
  });
}

function crearMarker(map, terremoto, isFav = false, isLoggedIn = false) {
  const color = getColor(terremoto.magnitud);
  const marker = L.circleMarker(
    [terremoto.coordenadas.lat, terremoto.coordenadas.lon],
    {
      radius: 6 + terremoto.magnitud,
      fillColor: color,
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8,
    },
  )
    .bindPopup(crearPopup(terremoto, color, isFav, isLoggedIn))
    .addTo(map);
  if (isFav && isLoggedIn) {
    marker.on("popupopen", (e) => {
      const favButton = e.popup._contentNode.querySelector(".fav-btn");
      if (favButton) {
        favButton.addEventListener("click", () => {
          favoritos.push(terremoto);
          alert("favorito guardado:" + terremoto.nombre);
        });
      }
    });
  }
}

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

function crearPopup(terremoto, color, isFav = false, isLoggedIn = false) {
  const favButtonShow = isFav && isLoggedIn ? "show" : "";

  return `
    <div class="quake-popup" style="background:${color}">
      <h3 class="quake-title">🌍 Terremoto</h3>

      <p><strong>Nombre:</strong> ${terremoto.nombre}</p>
      <p><strong>Fecha del Evento:</strong> ${terremoto.fecha.toLocaleString()}</p>
      <p><strong>Ubicación:</strong> ${terremoto.lugar}</p>
      <p><strong>Código:</strong> ${terremoto.id}</p>
      <p><strong>Magnitud:</strong> ${terremoto.magnitud}</p>

      <button class="fav-btn ${favButtonShow}">⭐ Añadir a favoritos</button>
    </div>
  `;
}

(async () => {
  terremotosGlobal = await obtenerTerremotos();
  pintarMapaFavs();
  pintarMapaFiltroInit();
  console.log(terremotosGlobal);
})();
