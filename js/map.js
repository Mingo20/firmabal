/**
 * FirmAbal Map & Territorial Classification Module
 * Uses Leaflet.js via CDN
 */

let leafletMap = null;
let markersGroup = null;
let collectorMarkersGroup = null;
let liveLocationWatchId = null;

const DEFAULT_TERRITORIES = [
  {
    id: 'terr-1',
    municipio: 'Santo Domingo Oeste',
    distrito: 'N/A',
    sector: 'Hato Nuevo',
    circunscripcion: 'Circunscripción 4'
  },
  {
    id: 'terr-2',
    municipio: 'Santo Domingo Este',
    distrito: 'San Luis',
    sector: 'Los Mina',
    circunscripcion: 'Circunscripción 2'
  },
  {
    id: 'terr-3',
    municipio: 'Distrito Nacional',
    distrito: 'N/A',
    sector: 'Bella Vista',
    circunscripcion: 'Circunscripción 1'
  },
  {
    id: 'terr-4',
    municipio: 'Santo Domingo Norte',
    distrito: 'La Victoria',
    sector: 'Villa Mella',
    circunscripcion: 'Circunscripción 6'
  }
];

function initMapContainer(containerId) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet.js not loaded yet.');
    return null;
  }

  const container = document.getElementById(containerId);
  if (!container) return null;

  if (leafletMap) {
    leafletMap.remove();
    leafletMap = null;
  }

  // Gran Santo Domingo center
  leafletMap = L.map(containerId, {
    zoomControl: true,
    attributionControl: true
  }).setView([18.4861, -69.9312], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'Leaflet | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(leafletMap);

  markersGroup = L.layerGroup().addTo(leafletMap);
  collectorMarkersGroup = L.layerGroup().addTo(leafletMap);

  return leafletMap;
}

async function renderMapMarkers(registros, recolectores = []) {
  if (!leafletMap || !markersGroup) return;

  markersGroup.clearLayers();
  collectorMarkersGroup.clearLayers();

  // Custom Icon for Citizen Pin
  const citizenIcon = L.divIcon({
    className: 'custom-map-pin citizen-pin',
    html: `<div style="background-color:#0B1220; width:28px; height:28px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,0.3); color:white; font-size:12px; font-weight:bold;">C</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  // Custom Icon for Collector Pin
  const collectorIcon = L.divIcon({
    className: 'custom-map-pin collector-pin',
    html: `<div style="background-color:#059669; width:32px; height:32px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.4); color:white;">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const bounds = [];

  // Plot citizens with location
  for (const r of registros) {
    if (r.latitud && r.longitud) {
      const marker = L.marker([r.latitud, r.longitud], { icon: citizenIcon });
      const popupContent = `
        <div style="font-family:sans-serif; padding:4px;">
          <div style="font-weight:bold; font-size:14px; color:#0F172A; margin-bottom:4px;">${r.nombre || 'Ciudadano'}</div>
          <div style="font-size:12px; color:#64748B;">Cédula: ${r.cedula}</div>
          <div style="font-size:12px; color:#64748B;">Tipo: ${r.tipo} · ${r.sector || 'S/N'}</div>
          <div style="margin-top:6px;"><span style="background:${r.estado==='Validado'?'#ECFDF5':'#FEF9E7'}; color:${r.estado==='Validado'?'#059669':'#B45309'}; padding:2px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${r.estado}</span></div>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersGroup.addLayer(marker);
      bounds.push([r.latitud, r.longitud]);
    }
  }

  // Plot active collectors with location
  for (const c of recolectores) {
    if (c.activo && c.ultima_lat && c.ultima_lng) {
      const marker = L.marker([c.ultima_lat, c.ultima_lng], { icon: collectorIcon });
      const popupContent = `
        <div style="font-family:sans-serif; padding:4px;">
          <div style="font-weight:bold; font-size:14px; color:#059669; margin-bottom:2px;">Recolector: ${c.nombre}</div>
          <div style="font-size:12px; color:#64748B;">Ubicación en vivo activa</div>
        </div>
      `;
      marker.bindPopup(popupContent);
      collectorMarkersGroup.addLayer(marker);
      bounds.push([c.ultima_lat, c.ultima_lng]);
    }
  }

  if (bounds.length > 0 && leafletMap) {
    leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }
}

// Live Location Tracking
function startCollectorLiveTracking(recolectorId, onUpdate = null) {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported by browser.');
    return;
  }

  if (liveLocationWatchId !== null) {
    navigator.geolocation.clearWatch(liveLocationWatchId);
  }

  liveLocationWatchId = navigator.geolocation.watchPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const recolector = await dbGet('recolectores', recolectorId);
      if (recolector) {
        recolector.ultima_lat = lat;
        recolector.ultima_lng = lng;
        recolector.ultima_actividad = new Date().toISOString();
        recolector.compartiendo_ubicacion = true;
        await dbPut('recolectores', recolector);
        if (onUpdate) onUpdate(position);
      }
    },
    (err) => {
      console.warn('Geolocation watch error:', err);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );
}

function stopCollectorLiveTracking() {
  if (liveLocationWatchId !== null) {
    navigator.geolocation.clearWatch(liveLocationWatchId);
    liveLocationWatchId = null;
  }
}
