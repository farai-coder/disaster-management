import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getIncident, getNearestAuthorities, getIncidentReports } from '../services/api';
import IncidentMap, { STATUS_LABELS, CATEGORY_COLORS } from '../components/IncidentMap';
import { Search, CheckCircle, Clock, AlertTriangle, XCircle, Loader, Phone, Shield, Navigation } from 'lucide-react';
import { UPLOAD_BASE } from '../services/api';

const STATUS_ICONS = {
  pending: Clock,
  verified: CheckCircle,
  in_progress: Loader,
  resolved: CheckCircle,
  fake: XCircle,
};

const STATUS_STEPS = ['pending', 'verified', 'in_progress', 'resolved'];

export default function TrackIncident() {
  const location = useLocation();
  const [incidentId, setIncidentId] = useState(location.state?.incidentId || '');
  const [incident, setIncident] = useState(null);
  const [nearby, setNearby] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeError, setRouteError] = useState('');
  const [locating, setLocating] = useState(false);

  const showDirections = () => {
    setRouteError('');
    if (!navigator.geolocation) {
      setRouteError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRouteFrom([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) setRouteError('Location permission denied.');
        else setRouteError('Could not determine your location.');
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  const clearDirections = () => {
    setRouteFrom(null);
    setRouteSummary(null);
    setRouteError('');
  };

  const fetchIncident = async (id) => {
    setLoading(true);
    setError('');
    setIncident(null);
    setNearby([]);
    setReports([]);
    try {
      const res = await getIncident(id);
      setIncident(res.data);
      try {
        const [authRes, reportRes] = await Promise.all([
          getNearestAuthorities(id, 6),
          getIncidentReports(id),
        ]);
        setNearby(authRes.data.offices || []);
        setReports(reportRes.data || []);
      } catch { /* optional */ }
    } catch {
      setError('Incident not found. Please check the reference number.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (location.state?.incidentId) fetchIncident(location.state.incidentId);
  }, [location.state]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!incidentId) return;
    fetchIncident(incidentId);
  };

  const currentStep = incident ? STATUS_STEPS.indexOf(incident.status) : -1;

  return (
    <div className="page track-page">
      <h1>Track Your Report</h1>
      <p className="page-subtitle">
        Enter your incident reference number to check its status.
      </p>

      <form onSubmit={handleSearch} className="track-form">
        <div className="search-input-group">
          <input
            type="number"
            value={incidentId}
            onChange={(e) => setIncidentId(e.target.value)}
            placeholder="Enter incident ID (e.g. 1)"
            min="1"
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : <Search size={18} />}
            Search
          </button>
        </div>
      </form>

      {error && <div className="alert alert-error">{error}</div>}

      {incident && (
        <div className="track-result">
          <div className="track-header">
            <h2>Incident #{incident.id}: {incident.title}</h2>
            <div className="track-badges">
              <span
                className="badge"
                style={{ background: CATEGORY_COLORS[incident.category], color: 'white' }}
              >
                {incident.category.replace('_', ' ')}
              </span>
              <span className={`badge badge-status-${incident.status}`}>
                {STATUS_LABELS[incident.status]}
              </span>
            </div>
          </div>

          {incident.status !== 'fake' && (
            <div className="status-tracker">
              {STATUS_STEPS.map((step, i) => {
                const Icon = STATUS_ICONS[step];
                const isActive = i <= currentStep;
                return (
                  <div key={step} className={`status-step ${isActive ? 'active' : ''}`}>
                    <div className="step-icon">
                      <Icon size={20} />
                    </div>
                    <span>{STATUS_LABELS[step]}</span>
                    {i < STATUS_STEPS.length - 1 && <div className="step-line" />}
                  </div>
                );
              })}
            </div>
          )}

          {incident.status === 'fake' && (
            <div className="alert alert-error">
              <AlertTriangle size={20} />
              This report has been flagged as a false alarm by the responder.
            </div>
          )}

          <div className="track-details">
            <div className="detail-row">
              <strong>Description:</strong>
              <p>{incident.description}</p>
            </div>
            {incident.location_name && (
              <div className="detail-row">
                <strong>Location:</strong>
                <p>{incident.location_name}</p>
              </div>
            )}
            <div className="detail-row">
              <strong>Coordinates:</strong>
              <p>{incident.latitude}, {incident.longitude}</p>
            </div>
            <div className="detail-row">
              <strong>Assigned To:</strong>
              <p>{(incident.assigned_authority || 'Not assigned').replace('_', ' ')}</p>
            </div>
            <div className="detail-row">
              <strong>Reported:</strong>
              <p>{new Date(incident.created_at).toLocaleString()}</p>
            </div>
            <div className="detail-row">
              <strong>Last Updated:</strong>
              <p>{new Date(incident.updated_at).toLocaleString()}</p>
            </div>
            {incident.photo_url && (
              <div className="detail-row">
                <strong>Photo:</strong>
                <img src={`${UPLOAD_BASE}${incident.photo_url}`} alt="Incident" className="track-photo" />
              </div>
            )}
          </div>

          <div className="detail-row">
            <strong>Incident on map:</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {!routeFrom ? (
                <button type="button" className="btn btn-secondary" onClick={showDirections} disabled={locating}>
                  <Navigation size={14} /> {locating ? 'Locating...' : 'Get directions from my location'}
                </button>
              ) : (
                <button type="button" className="btn btn-outline" onClick={clearDirections}>
                  Hide directions
                </button>
              )}
              {routeSummary && (
                <span style={{ fontSize: '0.9rem', color: 'var(--gray-600, #4b5563)' }}>
                  {routeSummary.distance_km.toFixed(1)} km · about {Math.round(routeSummary.duration_min)} min by road
                </span>
              )}
              {routeError && <span style={{ fontSize: '0.85rem', color: '#dc2626' }}>{routeError}</span>}
            </div>
            <div style={{ marginTop: 8 }}>
              <IncidentMap
                incidents={[incident]}
                offices={nearby}
                center={[incident.latitude, incident.longitude]}
                zoom={11}
                height="320px"
                routeFrom={routeFrom}
                routeTo={routeFrom ? [incident.latitude, incident.longitude] : null}
                onRouteSummary={setRouteSummary}
              />
            </div>
          </div>

          {nearby.length > 0 && (
            <div className="detail-row">
              <strong><Shield size={14} /> Nearest Authorities</strong>
              <div className="nearby-list">
                {nearby.map((o, i) => (
                  <div key={i} className="nearby-card">
                    <div>
                      <span className="nearby-name">{o.name}</span>
                      <span className="nearby-meta">{o.type.replace('_', ' ')} · {o.city} · {o.distance_km} km</span>
                    </div>
                    {o.phone && (
                      <a href={`tel:${o.phone}`} className="btn btn-sm btn-secondary">
                        <Phone size={12} /> {o.phone}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <div className="detail-row">
              <strong>Responder Reports</strong>
              {reports.map((r) => (
                <div key={r.id} className="responder-report">
                  <p><strong>{r.responder_name}</strong> ({r.responder_authority.replace('_', ' ')}) - outcome: <em>{r.outcome.replace('_', ' ')}</em></p>
                  {r.notes && <p>{r.notes}</p>}
                  <p className="detail-time">{new Date(r.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <Link to={`/respond/${incident.id}`} className="btn btn-outline">
              Did you attend this incident? Submit responder report
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
