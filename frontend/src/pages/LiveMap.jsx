import { useState, useEffect } from 'react';
import { getIncidents, getNearestAuthorities } from '../services/api';
import IncidentMap, { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import { RefreshCw, Filter, Navigation, Phone, Shield, X } from 'lucide-react';

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [routeLabel, setRouteLabel] = useState('');
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [locating, setLocating] = useState(false);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      const res = await getIncidents(params);
      setIncidents(res.data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const handleSelect = async (inc) => {
    setSelected(inc);
    setNearby([]);
    clearRoute();
    try {
      const res = await getNearestAuthorities(inc.id, 6);
      setNearby(res.data.offices || []);
    } catch { /* ignore */ }
  };

  const clearRoute = () => {
    setRouteFrom(null);
    setRouteTo(null);
    setRouteLabel('');
    setRouteSummary(null);
    setRouteError('');
  };

  const getMyLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        resolve([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        setLocating(false);
        reject(err);
      },
      { timeout: 15000, enableHighAccuracy: true },
    );
  };

  const routeMeToIncident = async () => {
    if (!selected) return;
    setRouteError('');
    try {
      const me = await getMyLocation();
      setRouteFrom(me);
      setRouteTo([selected.latitude, selected.longitude]);
      setRouteLabel('You → incident');
    } catch (err) {
      setRouteError(err?.code === 1 ? 'Location permission denied.' : 'Could not get your location.');
    }
  };

  const routeNearestAuthorityToIncident = () => {
    if (!selected || nearby.length === 0) return;
    const o = nearby[0];
    setRouteFrom([o.latitude, o.longitude]);
    setRouteTo([selected.latitude, selected.longitude]);
    setRouteLabel(`${o.name} → incident`);
    setRouteError('');
  };

  const routeOfficeToIncident = (o) => {
    if (!selected) return;
    setRouteFrom([o.latitude, o.longitude]);
    setRouteTo([selected.latitude, selected.longitude]);
    setRouteLabel(`${o.name} → incident`);
    setRouteError('');
  };

  return (
    <div className="page map-page">
      <div className="page-header">
        <h1>Live Incident Map</h1>
        <button className="btn btn-secondary" onClick={fetchIncidents}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="map-filters">
        <Filter size={16} />
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          <option value="crime">Crime</option>
          <option value="fire">Fire</option>
          <option value="accident">Accident</option>
          <option value="disease_outbreak">Disease Outbreak</option>
          <option value="cyclone_flood">Cyclone / Flood</option>
          <option value="drought">Drought</option>
          <option value="other">Other</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="incident-count">{incidents.length} incidents</span>
      </div>

      <IncidentMap
        incidents={selected ? [selected, ...incidents.filter((i) => i.id !== selected.id)] : incidents}
        offices={selected ? nearby : []}
        center={selected ? [selected.latitude, selected.longitude] : undefined}
        zoom={selected ? 12 : undefined}
        height="calc(100vh - 240px)"
        onIncidentClick={handleSelect}
        routeFrom={routeFrom}
        routeTo={routeTo}
        onRouteSummary={setRouteSummary}
      />

      <div className="map-legend">
        <strong>Legend:</strong>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {cat.replace('_', ' ')}
          </span>
        ))}
      </div>

      {selected && (
        <div className="incident-detail-panel">
          <button className="close-btn" onClick={() => { setSelected(null); setNearby([]); clearRoute(); }}>&times;</button>
          <h3>{selected.title}</h3>
          <div className="detail-badges">
            <span className={`badge badge-${selected.category}`}>
              {selected.category.replace('_', ' ')}
            </span>
            <span className={`badge badge-status-${selected.status}`}>
              {STATUS_LABELS[selected.status]}
            </span>
          </div>
          <p>{selected.description}</p>
          {selected.location_name && <p className="detail-location">{selected.location_name}</p>}
          <p className="detail-time">{new Date(selected.created_at).toLocaleString()}</p>
          {selected.is_anonymous && <p className="detail-anon">Reported anonymously</p>}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <button className="btn btn-sm btn-primary" onClick={routeMeToIncident} disabled={locating}>
              <Navigation size={14} /> {locating ? 'Locating...' : 'Directions to incident'}
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={routeNearestAuthorityToIncident}
              disabled={nearby.length === 0}
              title={nearby.length === 0 ? 'No nearby authorities loaded yet' : ''}
            >
              <Shield size={14} /> Route nearest authority → incident
            </button>
            {(routeFrom || routeTo) && (
              <button className="btn btn-sm btn-outline" onClick={clearRoute}>
                <X size={14} /> Clear route
              </button>
            )}
          </div>
          {(routeLabel || routeError || routeSummary) && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#4b5563' }}>
              {routeError && <span style={{ color: '#dc2626' }}>{routeError}</span>}
              {!routeError && routeLabel && (
                <span>
                  Route: <strong>{routeLabel}</strong>
                  {routeSummary && ` · ${routeSummary.distance_km.toFixed(1)} km · ~${Math.round(routeSummary.duration_min)} min by road`}
                </span>
              )}
            </div>
          )}

          {nearby.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} /> Nearest authorities
              </strong>
              <div className="nearby-list" style={{ marginTop: 8 }}>
                {nearby.slice(0, 5).map((o, i) => (
                  <div key={i} className="nearby-card">
                    <div>
                      <span className="nearby-name">{o.name}</span>
                      <span className="nearby-meta">{o.type.replace('_', ' ')} · {o.city} · {o.distance_km} km</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => routeOfficeToIncident(o)}
                        title="Show route from this office to the incident"
                      >
                        <Navigation size={12} /> Route
                      </button>
                      {o.phone && (
                        <a href={`tel:${o.phone}`} className="btn btn-sm btn-secondary">
                          <Phone size={12} /> {o.phone}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
