import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAlert } from '../services/api';
import { Send, Loader, AlertTriangle } from 'lucide-react';

export default function CreateAlert() {
  const navigate = useNavigate();
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');

  const [form, setForm] = useState({
    title: '',
    message: '',
    severity: 'medium',
    category: '',
    target_area: '',
    latitude: null,
    longitude: null,
    radius_km: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { ...form };
      if (!payload.category) delete payload.category;
      if (!payload.latitude) {
        delete payload.latitude;
        delete payload.longitude;
        delete payload.radius_km;
      }

      await createAlert(payload, authority.id);
      setSuccess('Alert issued successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create alert');
    }
    setLoading(false);
  };

  return (
    <div className="page create-alert-page">
      <div className="page-header">
        <h1>Issue Emergency Alert</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="alert-form">
        <div className="form-group">
          <label>Alert Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Flash Flood Warning - Manicaland Province"
            required
          />
        </div>

        <div className="form-group">
          <label>Message *</label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            placeholder="Detailed alert message with instructions for the public..."
            rows={5}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Severity *</label>
            <select
              value={form.severity}
              onChange={(e) => setForm({ ...form, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label>Category (optional)</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">General</option>
              <option value="crime">Crime</option>
              <option value="fire">Fire</option>
              <option value="accident">Accident</option>
              <option value="disease_outbreak">Disease Outbreak</option>
              <option value="cyclone_flood">Cyclone / Flood</option>
              <option value="drought">Drought</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Target Area</label>
          <input
            type="text"
            value={form.target_area}
            onChange={(e) => setForm({ ...form, target_area: e.target.value })}
            placeholder="e.g. Harare Metropolitan, Manicaland Province"
          />
        </div>

        <div className="severity-preview">
          <AlertTriangle size={20} />
          <div>
            <strong>Preview:</strong>
            <div className={`alert-preview severity-${form.severity}`}>
              <strong>[{form.severity.toUpperCase()}]</strong> {form.title || 'Alert title'}
              <p>{form.message || 'Alert message will appear here...'}</p>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={loading}>
          {loading ? <Loader size={20} className="spin" /> : <Send size={20} />}
          {loading ? 'Issuing...' : 'Issue Alert'}
        </button>
      </form>
    </div>
  );
}
