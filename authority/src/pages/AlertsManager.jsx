import { useState, useEffect } from 'react';
import { createAlert, getAlerts, deactivateAlert, deleteAlert } from '../services/api';
import { useToast, useConfirm } from '../components/Notifications';
import { useLiveIncidents } from '../hooks/useLiveIncidents';
import { Send, Loader, AlertTriangle, Trash2, Power, RefreshCw, PlusCircle } from 'lucide-react';

export default function AlertsManager() {
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');
  const toast = useToast();
  const confirm = useConfirm();

  const [alerts, setAlerts] = useState([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

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
  const [submitting, setSubmitting] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await getAlerts({ active_only: activeOnly });
      setAlerts(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [activeOnly]);

  useLiveIncidents(fetchAlerts, ['alert_changed']);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.category) delete payload.category;
      if (!payload.latitude) {
        delete payload.latitude;
        delete payload.longitude;
        delete payload.radius_km;
      }
      await createAlert(payload, authority.id);
      toast.success('Alert issued.');
      setForm({ title: '', message: '', severity: 'medium', category: '', target_area: '', latitude: null, longitude: null, radius_km: null });
      setShowForm(false);
      fetchAlerts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create alert.');
    }
    setSubmitting(false);
  };

  const handleDeactivate = async (id) => {
    try {
      await deactivateAlert(id);
      toast.success(`Alert #${id} deactivated.`);
      fetchAlerts();
    } catch {
      toast.error('Failed to deactivate alert.');
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete alert?',
      message: 'This alert will be permanently removed for everyone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await deleteAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success(`Alert #${id} deleted.`);
    } catch {
      toast.error('Failed to delete alert.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Alerts</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={fetchAlerts}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            <PlusCircle size={16} /> {showForm ? 'Close form' : 'Issue New Alert'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="dashboard-section">
          <h2><AlertTriangle size={18} /> Issue Emergency Alert</h2>
          <form onSubmit={handleSubmit} className="alert-form">
            <div className="form-group">
              <label>Alert Title <span className="req">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Flash Flood Warning - Manicaland Province"
                required
              />
            </div>

            <div className="form-group">
              <label>Message <span className="req">*</span></label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Detailed alert message with instructions for the public..."
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Severity <span className="req">*</span></label>
                <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Category (optional)</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
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

            <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={submitting}>
              {submitting ? <Loader size={18} className="spin" /> : <Send size={18} />}
              {submitting ? 'Issuing...' : 'Issue Alert'}
            </button>
          </form>
        </div>
      )}

      <div className="map-filters" style={{ marginTop: 12 }}>
        <label className="checkbox-label">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Show active only
        </label>
        <span className="incident-count">{alerts.length} alerts</span>
      </div>

      {loading ? (
        <div className="loading-center"><Loader className="spin" /> Loading...</div>
      ) : alerts.length === 0 ? (
        <p className="empty-text">No alerts found.</p>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => {
            const colors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#2563eb' };
            const bgs = { critical: '#fef2f2', high: '#fff7ed', medium: '#fefce8', low: '#eff6ff' };
            const color = colors[alert.severity] || '#2563eb';
            return (
              <div key={alert.id} className="alert-card" style={{ borderLeftColor: color, background: bgs[alert.severity] }}>
                <div className="alert-card-header">
                  <AlertTriangle size={20} style={{ color }} />
                  <div style={{ flex: 1 }}>
                    <span className="alert-severity" style={{ color }}>{alert.severity.toUpperCase()}</span>
                    <h3>{alert.title}</h3>
                  </div>
                  {!alert.is_active && <span className="badge badge-status-resolved">inactive</span>}
                </div>
                <p className="alert-message">{alert.message}</p>
                <div className="alert-meta">
                  {alert.target_area && <span>Area: {alert.target_area}</span>}
                  {alert.category && <span>Category: {alert.category.replace('_', ' ')}</span>}
                  <span>Issued: {new Date(alert.created_at).toLocaleString()}</span>
                </div>
                <div className="action-buttons" style={{ marginTop: 10 }}>
                  {alert.is_active && (
                    <button className="btn btn-sm btn-warning" onClick={() => handleDeactivate(alert.id)}>
                      <Power size={12} /> Deactivate
                    </button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(alert.id)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
