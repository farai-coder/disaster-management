import { useState, useEffect } from 'react';
import { getAlerts } from '../services/api';
import { Bell, AlertTriangle, Info, ShieldAlert, RefreshCw } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { icon: ShieldAlert, color: '#dc2626', bg: '#fef2f2' },
  high: { icon: AlertTriangle, color: '#ea580c', bg: '#fff7ed' },
  medium: { icon: Bell, color: '#ca8a04', bg: '#fefce8' },
  low: { icon: Info, color: '#2563eb', bg: '#eff6ff' },
};

export default function ViewAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { active_only: true };
      if (severityFilter) params.severity = severityFilter;
      const res = await getAlerts(params);
      setAlerts(res.data);
    } catch {
      setError('Failed to load alerts. Please check your connection and try again.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter]);

  return (
    <div className="page alerts-page">
      <h1>Emergency Alerts & Warnings</h1>
      <p className="page-subtitle">
        Active alerts issued by authorities. Stay informed and take precautions.
      </p>

      <div className="alerts-filter">
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <button className="btn btn-secondary" onClick={fetchAlerts} disabled={loading} style={{ marginLeft: 8 }}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} />
          <h3>No Active Alerts</h3>
          <p>There are currently no active emergency alerts in your area.</p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map((alert) => {
            const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
            const Icon = config.icon;
            return (
              <div
                key={alert.id}
                className="alert-card"
                style={{ borderLeftColor: config.color, background: config.bg }}
              >
                <div className="alert-card-header">
                  <Icon size={24} style={{ color: config.color }} />
                  <div>
                    <span className="alert-severity" style={{ color: config.color }}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <h3>{alert.title}</h3>
                  </div>
                </div>
                <p className="alert-message">{alert.message}</p>
                <div className="alert-meta">
                  {alert.target_area && <span>Area: {alert.target_area}</span>}
                  {alert.category && <span>Category: {alert.category.replace('_', ' ')}</span>}
                  <span>Issued: {new Date(alert.created_at).toLocaleString()}</span>
                  {alert.expires_at && (
                    <span>Expires: {new Date(alert.expires_at).toLocaleString()}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
