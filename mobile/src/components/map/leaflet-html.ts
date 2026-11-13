import type { MapViewState } from './map.types';

/**
 * Builds a self-contained Leaflet page (free, no API key):
 *  - Tiles: official OpenStreetMap tile server (free, no key; keep the attribution visible)
 *  - Routing: public OSRM demo server (fine for a thesis / low traffic)
 * The page talks to React Native through postMessage (native WebView) or window.parent (web iframe).
 */
export function buildLeafletHtml(initialState: MapViewState): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #E8EEF5; }
  .pin { display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%;
         border:3px solid #fff; box-shadow:0 4px 12px rgba(15,23,42,.35); font-size:18px; }
  .pin-customer { background:#0B6BCB; }
  .pin-rider { background:#F97316; }
  .pin-station { background:#0E9F9E; }
  .pin-label { background:#0F172A; color:#fff; padding:3px 8px; border-radius:8px; font:600 12px system-ui; white-space:nowrap; }
  #picker { position:absolute; left:50%; top:50%; transform:translate(-50%,-100%); z-index:500; pointer-events:none; display:none; }
  #picker svg { filter: drop-shadow(0 4px 6px rgba(15,23,42,.35)); }
  #picker-dot { position:absolute; left:50%; top:50%; width:8px; height:8px; margin:-4px 0 0 -4px; border-radius:50%;
                background:rgba(15,23,42,.35); z-index:499; display:none; }
</style>
</head>
<body>
<div id="map"></div>
<div id="picker"><svg width="40" height="52" viewBox="0 0 40 52"><path d="M20 0C9 0 0 9 0 20c0 14 20 32 20 32s20-18 20-32C40 9 31 0 20 0z" fill="#DC2626"/><circle cx="20" cy="20" r="8" fill="#fff"/></svg></div>
<div id="picker-dot"></div>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  var markerLayer = L.layerGroup().addTo(map);
  var routeLayer = L.layerGroup().addTo(map);
  var state = null;
  var lastRouteKey = null;
  var icons = { customer: '🏠', rider: '🛵', station: '💧' };

  function send(message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent && window.parent !== window) window.parent.postMessage({ source: 'aquatap-map', payload: text }, '*');
  }

  function drawMarkers(markers) {
    markerLayer.clearLayers();
    markers.forEach(function (marker) {
      var icon = L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 19],
        html: '<div class="pin pin-' + marker.kind + '">' + (icons[marker.kind] || '📍') + '</div>' });
      var leafletMarker = L.marker([marker.latitude, marker.longitude], { icon: icon }).addTo(markerLayer);
      if (marker.label) leafletMarker.bindTooltip(marker.label, { permanent: true, direction: 'top', offset: [0, -20], className: 'pin-label' });
    });
  }

  function drawRoute(route) {
    if (!route) { routeLayer.clearLayers(); lastRouteKey = null; return; }
    var key = [route.from.latitude, route.from.longitude, route.to.latitude, route.to.longitude].map(function (n) { return n.toFixed(4); }).join(',');
    if (key === lastRouteKey) return;
    lastRouteKey = key;
    var url = 'https://router.project-osrm.org/route/v1/driving/' + route.from.longitude + ',' + route.from.latitude + ';' +
      route.to.longitude + ',' + route.to.latitude + '?overview=full&geometries=geojson';
    fetch(url).then(function (response) { return response.json(); }).then(function (data) {
      routeLayer.clearLayers();
      if (!data.routes || !data.routes.length) throw new Error('no route');
      var best = data.routes[0];
      var line = best.geometry.coordinates.map(function (pair) { return [pair[1], pair[0]]; });
      L.polyline(line, { color: '#0B6BCB', weight: 6, opacity: 0.85 }).addTo(routeLayer);
      send({ type: 'route', distanceKm: Math.round(best.distance / 100) / 10, durationMinutes: Math.max(1, Math.round(best.duration / 60)) });
    }).catch(function () {
      routeLayer.clearLayers();
      L.polyline([[route.from.latitude, route.from.longitude], [route.to.latitude, route.to.longitude]],
        { color: '#0B6BCB', weight: 4, dashArray: '8 8' }).addTo(routeLayer);
      var meters = map.distance([route.from.latitude, route.from.longitude], [route.to.latitude, route.to.longitude]);
      send({ type: 'route', distanceKm: Math.round(meters / 100) / 10, durationMinutes: Math.max(1, Math.round(meters / 400)) });
    });
  }

  function fitView(nextState) {
    var points = nextState.markers.map(function (m) { return [m.latitude, m.longitude]; });
    if (!nextState.isPicker && points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 17 });
    } else {
      map.setView([nextState.center.latitude, nextState.center.longitude], nextState.zoom);
    }
  }

  window.applyMapState = function (nextState) {
    var isFirst = state === null;
    var centerChanged = isFirst || nextState.center.latitude !== state.center.latitude || nextState.center.longitude !== state.center.longitude;
    var markersChanged = isFirst || JSON.stringify(nextState.markers.map(function (m) { return m.id; })) !== JSON.stringify(state.markers.map(function (m) { return m.id; }));
    state = nextState;
    document.getElementById('picker').style.display = nextState.isPicker ? 'block' : 'none';
    document.getElementById('picker-dot').style.display = nextState.isPicker ? 'block' : 'none';
    drawMarkers(nextState.markers);
    drawRoute(nextState.route);
    if (centerChanged || markersChanged) fitView(nextState);
  };

  map.on('moveend', function () {
    if (!state || !state.isPicker) return;
    var center = map.getCenter();
    send({ type: 'pick', latitude: Number(center.lat.toFixed(7)), longitude: Number(center.lng.toFixed(7)) });
  });

  window.addEventListener('message', function (event) {
    try {
      var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type === 'aquatap-map-state') window.applyMapState(data.state);
    } catch (error) {}
  });

  window.applyMapState(${JSON.stringify(initialState)});
  send({ type: 'ready' });
</script>
</body>
</html>`;
}
