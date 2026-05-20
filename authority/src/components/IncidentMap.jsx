import { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, LayersControl, Marker, Popup, Polyline, useMap,
  ScaleControl, ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const CATEGORY_COLORS = {
  crime: '#ef4444',
  fire: '#f97316',
  accident: '#eab308',
  disease_outbreak: '#8b5cf6',
  cyclone_flood: '#3b82f6',
  drought: '#a16207',
  other: '#6b7280',
};

const CATEGORY_GLYPHS = {
  crime: '!',
  fire: '🔥',
  accident: '⚠',
  disease_outbreak: '+',
  cyclone_flood: '~',
  drought: '☼',
  other: '•',
};

const STATUS_LABELS = {
  pending: 'Pending Review',
  verified: 'Verified',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  fake: 'Marked Fake',
};

const AUTHORITY_ICON_COLORS = {
  police: '#1d4ed8',
  fire_department: '#b91c1c',
  health: '#047857',
  civil_protection: '#7c3aed',
};

function createIncidentIcon(category, status) {
  const color = CATEGORY_COLORS[category] || '#6b7280';
  const glyph = CATEGORY_GLYPHS[category] || '•';
  const dim = status === 'resolved' || status === 'fake';
  return L.divIcon({
    className: 'incident-marker',
    html: `<div class="incident-pin" style="--pin-color:${color}; opacity:${dim ? 0.65 : 1};">
      <div class="incident-pin-bubble"><span>${glyph}</span></div>
      <div class="incident-pin-tail"></div>
    </div>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    popupAnchor: [0, -32],
  });
}

function createOfficeIcon(color, label) {
  return L.divIcon({
    className: 'office-marker',
    html: `<div class="office-pin" style="--pin-color:${color};">
      <span>${label}</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

const officeLabel = (type) => ({
  police: 'P',
  fire_department: 'F',
  health: 'H',
  civil_protection: 'C',
}[type] || '?');

const ZIMBABWE_CENTER = [-19.015438, 29.154857];
const DEFAULT_ZOOM = 7;
const ZIMBABWE_BOUNDS = [
  [-22.4, 25.2],
  [-15.6, 33.1],
];
const MIN_ZOOM = 6;
const MAX_ZOOM = 19;

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function RouteLine({ from, to, onSummary }) {
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!from || !to) { setCoords(null); return; }
    let cancelled = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const route = data.routes?.[0];
        if (!route) return;
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        setCoords(latlngs);
        const steps = (route.legs?.[0]?.steps || []).map((s) => ({
          instruction: s.maneuver?.modifier
            ? `${(s.maneuver.type || '').replace('_', ' ')} ${s.maneuver.modifier} on ${s.name || 'road'}`
            : (s.maneuver?.type || '').replace('_', ' '),
          distance_m: s.distance,
          duration_s: s.duration,
        }));
        onSummary?.({ distance_km: route.distance / 1000, duration_min: route.duration / 60, steps });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [from?.[0], from?.[1], to?.[0], to?.[1]]);
  if (!coords) return null;
  return (
    <>
      <Polyline positions={coords} pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.55 }} />
      <Polyline positions={coords} pathOptions={{ color: '#0f766e', weight: 5, opacity: 0.95 }} />
    </>
  );
}

const startIcon = L.divIcon({
  className: 'route-start-marker',
  html: `<div style="background:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.4);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function IncidentMap({
  incidents = [],
  offices = [],
  center,
  zoom,
  onIncidentClick,
  routeFrom,
  routeTo,
  onRouteSummary,
  height = '500px',
}) {
  const validIncidents = incidents.filter(
    (i) => i.latitude != null && i.longitude != null && isFinite(i.latitude) && isFinite(i.longitude)
  );

  return (
    <MapContainer
      center={center || ZIMBABWE_CENTER}
      zoom={zoom || DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      maxBounds={ZIMBABWE_BOUNDS}
      maxBoundsViscosity={1.0}
      style={{ height, width: '100%', borderRadius: '12px' }}
      zoomControl={false}
      preferCanvas={true}
    >
      <ZoomControl position="topright" />
      <ScaleControl position="bottomleft" imperial={false} />
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Streets">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
            detectRetina
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Humanitarian">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &middot; Tiles by HOT'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            subdomains="ab"
            maxZoom={19}
            detectRetina
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {center && <RecenterMap center={center} />}
      {routeFrom && routeTo && (
        <>
          <Marker position={routeFrom} icon={startIcon}>
            <Popup>Start</Popup>
          </Marker>
          <RouteLine from={routeFrom} to={routeTo} onSummary={onRouteSummary} />
        </>
      )}
      {validIncidents.map((incident) => (
        <Marker
          key={`inc-${incident.id}`}
          position={[incident.latitude, incident.longitude]}
          icon={createIncidentIcon(incident.category, incident.status)}
          eventHandlers={{
            click: () => onIncidentClick?.(incident),
          }}
        >
          <Popup>
            <div style={{ minWidth: 220 }}>
              <strong>{incident.title}</strong>
              <br />
              <span className={`badge badge-${incident.category}`}>
                {incident.category.replace('_', ' ')}
              </span>
              <span className={`badge badge-status-${incident.status}`} style={{ marginLeft: 4 }}>
                {STATUS_LABELS[incident.status]}
              </span>
              <p style={{ margin: '8px 0 4px', fontSize: 13 }}>
                {(incident.description || '').slice(0, 140)}
                {(incident.description || '').length > 140 ? '...' : ''}
              </p>
              {incident.location_name && (
                <p style={{ fontSize: 12, color: '#666' }}>{incident.location_name}</p>
              )}
              <p style={{ fontSize: 11, color: '#999' }}>
                {new Date(incident.created_at).toLocaleString()}
              </p>
            </div>
          </Popup>
        </Marker>
      ))}

      {offices.map((office, idx) => {
        const color = AUTHORITY_ICON_COLORS[office.type] || '#374151';
        return (
          <Marker
            key={`office-${idx}-${office.name}`}
            position={[office.latitude, office.longitude]}
            icon={createOfficeIcon(color, officeLabel(office.type))}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <strong>{office.name}</strong>
                <br />
                <span style={{ fontSize: 12, color: '#555', textTransform: 'capitalize' }}>
                  {office.type.replace('_', ' ')} &middot; {office.city}
                </span>
                {office.distance_km != null && (
                  <p style={{ margin: '6px 0 2px', fontSize: 12 }}>
                    {office.distance_km} km from incident
                  </p>
                )}
                {office.phone && (
                  <p style={{ margin: '2px 0', fontSize: 12 }}>
                    <a href={`tel:${office.phone}`}>📞 {office.phone}</a>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export { CATEGORY_COLORS, STATUS_LABELS, ZIMBABWE_CENTER, ZIMBABWE_BOUNDS, AUTHORITY_ICON_COLORS };
