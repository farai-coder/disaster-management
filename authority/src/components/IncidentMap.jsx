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

// Zimbabwe center coordinates
const ZIMBABWE_CENTER = [-19.015438, 29.154857];
const DEFAULT_ZOOM = 7;

export default function IncidentMap({ incidents = [], center, zoom, onIncidentClick, height = '500px' }) {
  return (
    <MapContainer
      center={center || ZIMBABWE_CENTER}
      zoom={zoom || DEFAULT_ZOOM}
      style={{ height, width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
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
              <p style={{ margin: '8px 0 4px', fontSize: 13 }}>{incident.description.slice(0, 120)}...</p>
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
    </MapContainer>
  );
}

export { CATEGORY_COLORS, STATUS_LABELS, ZIMBABWE_CENTER };
