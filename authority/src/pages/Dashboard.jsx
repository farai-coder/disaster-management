import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getNotifications, markNotificationRead, getAlerts } from '../services/api';
import IncidentMap from '../components/IncidentMap';
import {
  BarChart3, AlertTriangle, CheckCircle, Clock, XCircle,
  Bell, LayoutDashboard, Loader,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [authority, setAuthority] = useState(null);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('authority');
    if (!stored) {
      navigate('/login', { replace: true });
      return;
    }
    const auth = JSON.parse(stored);
    setAuthority(auth);
    fetchData(auth.authority_type);
  }, []);

  const fetchData = async (authorityType) => {
    try {
      const [statsRes, notifsRes, alertsRes] = await Promise.all([
        getDashboardStats(authorityType === 'admin' ? null : authorityType),
        getNotifications(authorityType === 'admin' ? null : authorityType),
        getAlerts({ active_only: true }),
      ]);
      setStats(statsRes.data);
      setNotifications(notifsRes.data);
      setAlerts(alertsRes.data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (loading) {
    return (
      <div className="page dashboard-page">
        <div className="loading-center"><Loader size={32} className="spin" /> Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>
            <LayoutDashboard size={28} />
            {authority?.name || 'Dashboard'}
          </h1>
          <p className="authority-type">{authority?.department} - {authority?.authority_type?.replace('_', ' ')}</p>
        </div>
      </div>

      {stats && (
        <>
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <BarChart3 size={24} />
              <div>
                <span className="stat-value">{stats.total_incidents}</span>
                <span className="stat-label">Total Incidents</span>
              </div>
            </div>
            <div className="stat-card stat-pending">
              <Clock size={24} />
              <div>
                <span className="stat-value">{stats.pending_incidents}</span>
                <span className="stat-label">Pending</span>
              </div>
            </div>
            <div className="stat-card stat-verified">
              <CheckCircle size={24} />
              <div>
                <span className="stat-value">{stats.verified_incidents + stats.in_progress_incidents}</span>
                <span className="stat-label">Active</span>
              </div>
            </div>
            <div className="stat-card stat-resolved">
              <CheckCircle size={24} />
              <div>
                <span className="stat-value">{stats.resolved_incidents}</span>
                <span className="stat-label">Resolved</span>
              </div>
            </div>
            <div className="stat-card stat-fake">
              <XCircle size={24} />
              <div>
                <span className="stat-value">{stats.fake_incidents}</span>
                <span className="stat-label">Flagged Fake</span>
              </div>
            </div>
            <div className="stat-card stat-alerts">
              <AlertTriangle size={24} />
              <div>
                <span className="stat-value">{stats.active_alerts}</span>
                <span className="stat-label">Active Alerts</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-section">
              <h2>Incidents by Category</h2>
              <div className="category-bars">
                {Object.entries(stats.incidents_by_category).map(([cat, count]) => (
                  <div key={cat} className="category-bar-row">
                    <span className="bar-label">{cat.replace('_', ' ')}</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.max(5, (count / Math.max(stats.total_incidents, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="bar-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-section">
              <h2>
                <Bell size={18} /> Notifications ({notifications.length})
              </h2>
              <div className="notifications-list">
                {notifications.length === 0 ? (
                  <p className="empty-text">No unread notifications</p>
                ) : (
                  notifications.slice(0, 10).map((notif) => (
                    <div key={notif.id} className="notification-item">
                      <p>{notif.message}</p>
                      <div className="notification-meta">
                        <span>{new Date(notif.created_at).toLocaleString()}</span>
                        <button className="btn btn-sm" onClick={() => handleMarkRead(notif.id)}>
                          Mark read
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="dashboard-section">
              <h2><AlertTriangle size={18} /> Active Alerts ({alerts.length})</h2>
              <div className="alerts-list">
                {alerts.slice(0, 5).map((alert) => {
                  const colors = { critical: '#dc2626', high: '#ea580c', medium: '#ca8a04', low: '#2563eb' };
                  const bgs = { critical: '#fef2f2', high: '#fff7ed', medium: '#fefce8', low: '#eff6ff' };
                  const color = colors[alert.severity] || '#2563eb';
                  const bg = bgs[alert.severity] || '#eff6ff';
                  return (
                    <div key={alert.id} className="alert-card" style={{ borderLeft: `4px solid ${color}`, background: bg, padding: 16, borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <AlertTriangle size={18} style={{ color }} />
                        <span style={{ color, fontWeight: 700, fontSize: '0.8rem' }}>{alert.severity.toUpperCase()}</span>
                        <strong>{alert.title}</strong>
                      </div>
                      <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>{alert.message}</p>
                      <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        {alert.target_area && <span>Area: {alert.target_area} &middot; </span>}
                        <span>Issued: {new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="dashboard-section">
            <h2>Recent Incidents Map</h2>
            <IncidentMap
              incidents={stats.recent_incidents}
              height="400px"
              onIncidentClick={(inc) => navigate('/incidents', { state: { highlightId: inc.id } })}
            />
          </div>
        </>
      )}
    </div>
  );
}
