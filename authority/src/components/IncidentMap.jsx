import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet default marker icons
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

function createColoredIcon(color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 14px; height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function createOfficeIcon(color, label) {
  return L.divIcon({
    className: 'office-marker',
    html: `<div style="
      background: white;
      border: 2.5px solid ${color};
      color: ${color};
      width: 26px; height: 26px;
      border-radius: 6px;
      display:flex; align-items:center; justify-content:center;
      font-weight: 700; font-size: 11px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    ">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const officeLabel = (type) => ({
  police: 'P',
  fire_department: 'F',
  health: 'H',
  civil_protection: 'C',
}[type] || '?');

// Zimbabwe geography
const ZIMBABWE_CENTER = [-19.015438, 29.154857];
const DEFAULT_ZOOM = 7;
const ZIMBABWE_BOUNDS = [
  [-22.4, 25.2],
  [-15.6, 33.1],
];
const MIN_ZOOM = 6;
const MAX_ZOOM = 18;

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function IncidentMap({
  incidents = [],
  offices = [],
  center,
  zoom,
  onIncidentClick,
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
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        bounds={ZIMBABWE_BOUNDS}
        noWrap
      />
      {center && <RecenterMap center={center} />}
      {validIncidents.map((incident) => (
        <Marker
          key={`inc-${incident.id}`}
          position={[incident.latitude, incident.longitude]}
          icon={createColoredIcon(CATEGORY_COLORS[incident.category] || '#6b7280')}
          eventHandlers={{
            click: () => onIncidentClick?.(incident),
          }}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{incident.title}</strong>
              <br />
              <span className={`badge badge-${incident.category}`}>
                {incident.category.replace('_', ' ')}
              </span>
              <span className={`badge badge-status-${incident.status}`} style={{ marginLeft: 4 }}>
                {STATUS_LABELS[incident.status]}
              </span>
              <p style={{ margin: '8px 0 4px', fontSize: 13 }}>
                {(incident.description || '').slice(0, 120)}
                {(incident.description || '').length > 120 ? '...' : ''}
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
              <div style={{ minWidth: 180 }}>
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
                    📞 <a href={`tel:${office.phone}`}>{office.phone}</a>
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
