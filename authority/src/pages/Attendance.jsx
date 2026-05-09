import { useEffect, useState, Fragment } from 'react';
import {
  getIncidents,
  getIncidentReports,
  submitResponderReport,
} from '../services/api';
import { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import {
  ClipboardCheck, AlertTriangle, CheckCircle, Loader, Filter, RefreshCw,
  X, Send, MapPin, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';

const OUTCOMES = [
  { value: 'genuine', label: 'Genuine — incident confirmed' },
  { value: 'resolved', label: 'Resolved — handled on scene' },
  { value: 'duplicate', label: 'Duplicate — same as another report' },
  { value: 'false_alarm', label: 'False alarm — no incident occurred' },
];

const OUTCOME_LABELS = {
  genuine: 'Genuine',
  false_alarm: 'False alarm',
  duplicate: 'Duplicate',
  resolved: 'Resolved',
};

const OUTCOME_BADGE_CLASS = {
  genuine: 'badge-status-verified',
  false_alarm: 'badge-status-fake',
  duplicate: 'badge-status-pending',
  resolved: 'badge-status-resolved',
};

export default function Attendance() {
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');
  const [incidents, setIncidents] = useState([]);
  const [reportsByIncident, setReportsByIncident] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [scope, setScope] = useState('mine');
  const [expandedId, setExpandedId] = useState(null);
  const [logForm, setLogForm] = useState({
    responder_name: authority?.name || '',
    outcome: 'genuine',
    notes: '',
  });
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState('');

  const fetchIncidents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (scope === 'mine' && authority.authority_type) {
        params.authority = authority.authority_type;
      }
      const res = await getIncidents(params);
      const list = res.data || [];
      setIncidents(list);
      const reports = await Promise.all(
        list.map((inc) => getIncidentReports(inc.id).then((r) => [inc.id, r.data]).catch(() => [inc.id, []]))
      );
      setReportsByIncident(Object.fromEntries(reports));
    } catch {
      setError('Could not load incidents.');
    }
    setLoading(false);
  };

  useEffect(() => { fetchIncidents(); }, [statusFilter, scope]);

  const totals = {
    incidents: incidents.length,
    attended: incidents.filter((i) => (reportsByIncident[i.id] || []).length > 0).length,
    falseAlarms: Object.values(reportsByIncident).flat().filter((r) => r.is_false_alarm).length,
    awaiting: incidents.filter((i) => (reportsByIncident[i.id] || []).length === 0).length,
  };

  const submitAttendance = async (incidentId) => {
    setError('');
    if (!logForm.responder_name.trim()) {
      setError('Please enter the responder name.');
      return;
    }
    if (!authority.authority_type) {
      setError('Could not determine your authority. Please re-login.');
      return;
    }
    setSubmittingId(incidentId);
    try {
      await submitResponderReport(incidentId, {
        incident_id: incidentId,
        responder_name: logForm.responder_name.trim(),
        responder_authority: authority.authority_type,
        outcome: logForm.outcome,
        notes: logForm.notes,
        is_false_alarm: logForm.outcome === 'false_alarm',
      });
      setLogForm({ ...logForm, notes: '' });
      const r = await getIncidentReports(incidentId);
      setReportsByIncident((prev) => ({ ...prev, [incidentId]: r.data }));
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit attendance.');
    }
    setSubmittingId(null);
  };

  const flagFalseAlarm = async (incidentId) => {
    if (!confirm('Flag this incident as a false alarm?')) return;
    setError('');
    if (!authority.authority_type) {
      setError('Could not determine your authority. Please re-login.');
      return;
    }
    const name = (logForm.responder_name || authority?.name || '').trim() || 'Authority';
    setSubmittingId(incidentId);
    try {
      await submitResponderReport(incidentId, {
        incident_id: incidentId,
        responder_name: name,
        responder_authority: authority.authority_type,
        outcome: 'false_alarm',
        notes: 'Flagged as false alarm from attendance dashboard.',
        is_false_alarm: true,
      });
      const r = await getIncidentReports(incidentId);
      setReportsByIncident((prev) => ({ ...prev, [incidentId]: r.data }));
      fetchIncidents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to flag.');
    }
    setSubmittingId(null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><ClipboardCheck size={26} /> Attendance & False Alarms</h1>
        <button className="btn btn-outline" onClick={fetchIncidents} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>
      <p className="page-subtitle">
        Log who attended each incident and flag false alarms here. Each entry is saved as a responder
        report against the incident.
      </p>

      <div className="stats-grid" style={{ marginTop: 12 }}>
        <div className="stat-card stat-total">
          <ClipboardCheck size={22} />
          <div><span className="stat-value">{totals.incidents}</span><span className="stat-label">Incidents</span></div>
        </div>
        <div className="stat-card stat-verified">
          <CheckCircle size={22} />
          <div><span className="stat-value">{totals.attended}</span><span className="stat-label">Attended</span></div>
        </div>
        <div className="stat-card stat-pending">
          <Clock size={22} />
          <div><span className="stat-value">{totals.awaiting}</span><span className="stat-label">Awaiting attendance</span></div>
        </div>
        <div className="stat-card stat-fake">
          <AlertTriangle size={22} />
          <div><span className="stat-value">{totals.falseAlarms}</span><span className="stat-label">False alarms</span></div>
        </div>
      </div>

      <div className="map-filters" style={{ marginTop: 16 }}>
        <Filter size={16} />
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="mine">My authority's incidents</option>
          <option value="all">All incidents</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="fake">Flagged Fake</option>
        </select>
        <span className="incident-count">{incidents.length} incidents</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><Loader size={28} className="spin" /></div>
      ) : incidents.length === 0 ? (
        <p className="empty-text">No incidents to attend to.</p>
      ) : (
        <div className="incidents-table-wrapper" style={{ marginTop: 12 }}>
          <table className="incidents-table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Category</th>
                <th>Status</th>
                <th>Location</th>
                <th>Attended by</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const reports = reportsByIncident[inc.id] || [];
                const isExpanded = expandedId === inc.id;
                const flagged = reports.some((r) => r.is_false_alarm);
                return (
                  <Fragment key={inc.id}>
                    <tr className={isExpanded ? 'selected-row' : ''}>
                      <td>
                        <button
                          className="link-btn"
                          onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          #{inc.id} — {inc.title}
                        </button>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: CATEGORY_COLORS[inc.category], color: 'white' }}
                        >
                          {inc.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-status-${inc.status}`}>
                          {STATUS_LABELS[inc.status]}
                        </span>
                        {flagged && (
                          <span className="badge badge-status-fake" style={{ marginLeft: 4 }}>
                            <AlertTriangle size={11} /> False alarm
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {inc.location_name || `${inc.latitude.toFixed(3)}, ${inc.longitude.toFixed(3)}`}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {reports.length === 0 ? (
                          <span style={{ color: '#9ca3af' }}>No attendance yet</span>
                        ) : (
                          <span>{reports.length} report{reports.length === 1 ? '' : 's'}</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => setExpandedId(isExpanded ? null : inc.id)}
                          >
                            {isExpanded ? <X size={12} /> : 'Log attendance'}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => flagFalseAlarm(inc.id)}
                            disabled={submittingId === inc.id || flagged}
                            title={flagged ? 'Already flagged' : 'Flag as false alarm'}
                          >
                            <AlertTriangle size={12} /> False alarm
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="attendance-detail-row">
                        <td colSpan={6}>
                          <div className="attendance-detail">
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ margin: '4px 0' }}>{inc.description}</p>
                              {inc.location_name && (
                                <p style={{ margin: '2px 0', fontSize: '0.85rem', color: '#6b7280' }}>
                                  <MapPin size={12} /> {inc.location_name}
                                </p>
                              )}
                            </div>

                            <h4 style={{ margin: '6px 0 8px' }}>Existing attendance reports</h4>
                            {reports.length === 0 ? (
                              <p className="empty-text" style={{ marginBottom: 12 }}>
                                No one has logged attendance for this incident yet.
                              </p>
                            ) : (
                              <div style={{ marginBottom: 12 }}>
                                {reports.map((r) => (
                                  <div key={r.id} className="responder-report">
                                    <p>
                                      <strong>{r.responder_name}</strong>{' '}
                                      ({r.responder_authority.replace('_', ' ')}) —{' '}
                                      <span className={`badge ${OUTCOME_BADGE_CLASS[r.outcome] || ''}`}>
                                        {OUTCOME_LABELS[r.outcome] || r.outcome}
                                      </span>
                                      {r.is_false_alarm && (
                                        <span className="badge badge-status-fake" style={{ marginLeft: 4 }}>
                                          <AlertTriangle size={11} /> False alarm
                                        </span>
                                      )}
                                    </p>
                                    {r.notes && <p>{r.notes}</p>}
                                    <p className="detail-time">{new Date(r.created_at).toLocaleString()}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            <h4 style={{ margin: '12px 0 8px' }}>Log new attendance</h4>
                            <div className="form-row">
                              <div className="form-group">
                                <label>Responder name</label>
                                <input
                                  type="text"
                                  value={logForm.responder_name}
                                  onChange={(e) => setLogForm({ ...logForm, responder_name: e.target.value })}
                                  placeholder="Officer / responder full name"
                                />
                              </div>
                              <div className="form-group">
                                <label>Outcome</label>
                                <select
                                  value={logForm.outcome}
                                  onChange={(e) => setLogForm({ ...logForm, outcome: e.target.value })}
                                >
                                  {OUTCOMES.map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Notes</label>
                              <textarea
                                value={logForm.notes}
                                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                                placeholder="What did you find? Casualties, action taken, time of arrival..."
                                rows={3}
                              />
                            </div>
                            <button
                              className="btn btn-primary"
                              onClick={() => submitAttendance(inc.id)}
                              disabled={submittingId === inc.id}
                            >
                              {submittingId === inc.id ? <Loader size={14} className="spin" /> : <Send size={14} />}
                              Submit attendance
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
