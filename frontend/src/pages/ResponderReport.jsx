import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getIncident, submitResponderReport } from '../services/api';
import { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import { Loader, Send } from 'lucide-react';

const OUTCOMES = [
  { value: 'genuine', label: 'Genuine - incident confirmed and being handled' },
  { value: 'resolved', label: 'Resolved - situation handled on scene' },
  { value: 'duplicate', label: 'Duplicate - same as another report' },
];

const AUTHORITIES = [
  { value: 'police', label: 'Police' },
  { value: 'fire_department', label: 'Fire Brigade' },
  { value: 'health', label: 'Health / Ambulance' },
  { value: 'civil_protection', label: 'Civil Protection' },
];

export default function ResponderReport() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    responder_name: '',
    responder_authority: '',
    outcome: 'genuine',
    notes: '',
  });

  useEffect(() => {
    getIncident(incidentId)
      .then((res) => setIncident(res.data))
      .catch(() => setError('Incident not found'))
      .finally(() => setLoading(false));
  }, [incidentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.responder_name.trim() || form.responder_name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    if (!form.responder_authority) {
      setError('Please select your authority');
      return;
    }
    setSubmitting(true);
    try {
      await submitResponderReport(parseInt(incidentId, 10), {
        incident_id: parseInt(incidentId, 10),
        responder_name: form.responder_name.trim(),
        responder_authority: form.responder_authority,
        outcome: form.outcome,
        notes: form.notes,
        is_false_alarm: false,
      });
      setSuccess('Responder report submitted successfully.');
      setTimeout(() => navigate('/track', { state: { incidentId: parseInt(incidentId, 10) } }), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="page"><div className="loading-center"><Loader className="spin" /> Loading incident...</div></div>;
  }

  if (!incident) {
    return (
      <div className="page">
        <div className="alert alert-error">{error || 'Incident not found.'}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Responder Report</h1>
      <p className="page-subtitle">For the official who attended this incident. Use this form to confirm details. Only the authority dashboard can mark a report as a false alarm.</p>

      <div className="track-result" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 10 }}>Incident #{incident.id}: {incident.title}</h3>
        <div className="detail-badges">
          <span className="badge" style={{ background: CATEGORY_COLORS[incident.category], color: 'white' }}>
            {incident.category.replace('_', ' ')}
          </span>
          <span className={`badge badge-status-${incident.status}`}>{STATUS_LABELS[incident.status]}</span>
        </div>
        <p style={{ marginTop: 8 }}>{incident.description}</p>
        {incident.location_name && <p className="detail-location">{incident.location_name}</p>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="alert-form">
        <div className="form-row">
          <div className="form-group">
            <label>Your Name <span className="req">*</span></label>
            <input
              type="text"
              value={form.responder_name}
              onChange={(e) => setForm({ ...form, responder_name: e.target.value })}
              placeholder="Officer / responder full name"
              required
            />
          </div>
          <div className="form-group">
            <label>Your Authority <span className="req">*</span></label>
            <select
              value={form.responder_authority}
              onChange={(e) => setForm({ ...form, responder_authority: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {AUTHORITIES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Outcome <span className="req">*</span></label>
          <select
            value={form.outcome}
            onChange={(e) => setForm({ ...form, outcome: e.target.value })}
          >
            {OUTCOMES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="What did you find? Action taken, time of arrival, casualties, etc."
            rows={4}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={submitting}>
          {submitting ? <Loader size={18} className="spin" /> : <Send size={18} />}
          {submitting ? 'Submitting...' : 'Submit Responder Report'}
        </button>
      </form>
    </div>
  );
}
