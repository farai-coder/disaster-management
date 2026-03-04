import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getIncident } from '../services/api';
import { STATUS_LABELS, CATEGORY_COLORS } from '../components/IncidentMap';
import { Search, CheckCircle, Clock, AlertTriangle, XCircle, Loader } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    setLoading(true);
    setError('');
    setIncident(null);

    try {
      const res = await getIncident(incidentId);
      setIncident(res.data);
    } catch {
      setError('Incident not found. Please check the reference number.');
    }
    setLoading(false);
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
              This report has been flagged as fake/false by authorities.
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
            {incident.ai_suggested_category && (
              <div className="detail-row">
                <strong>AI Suggested Category:</strong>
                <p>{incident.ai_suggested_category.replace('_', ' ')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
