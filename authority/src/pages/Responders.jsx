import { useEffect, useState } from 'react';
import { getAllResponderReports } from '../services/api';
import { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import { ClipboardCheck, AlertTriangle, CheckCircle, Loader, Filter, RefreshCw } from 'lucide-react';

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

export default function Responders() {
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('mine'); // 'mine' or 'all'
  const [outcomeFilter, setOutcomeFilter] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (scope === 'mine' && authority.authority_type) {
        params.authority = authority.authority_type;
      }
      const res = await getAllResponderReports(params);
      setReports(res.data || []);
    } catch {
      setReports([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, [scope]);

  const filtered = outcomeFilter
    ? reports.filter((r) => r.outcome === outcomeFilter)
    : reports;

  const total = reports.length;
  const flagged = reports.filter((r) => r.is_false_alarm).length;
  const genuine = reports.filter((r) => r.outcome === 'genuine').length;
  const resolved = reports.filter((r) => r.outcome === 'resolved').length;

  return (
    <div className="page">
      <div className="page-header">
        <h1><ClipboardCheck size={26} /> Responders</h1>
        <button className="btn btn-outline" onClick={fetchReports} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <p className="page-subtitle">
        Reports submitted by officers and responders who attended incidents. Use this to flag false alarms
        and review outcomes across all incidents.
      </p>

      <div className="stats-grid" style={{ marginTop: 12 }}>
        <div className="stat-card stat-total">
          <ClipboardCheck size={22} />
          <div><span className="stat-value">{total}</span><span className="stat-label">Total Reports</span></div>
        </div>
        <div className="stat-card stat-fake">
          <AlertTriangle size={22} />
          <div><span className="stat-value">{flagged}</span><span className="stat-label">False Alarms</span></div>
        </div>
        <div className="stat-card stat-verified">
          <CheckCircle size={22} />
          <div><span className="stat-value">{genuine}</span><span className="stat-label">Genuine</span></div>
        </div>
        <div className="stat-card stat-resolved">
          <CheckCircle size={22} />
          <div><span className="stat-value">{resolved}</span><span className="stat-label">Resolved</span></div>
        </div>
      </div>

      <div className="map-filters" style={{ marginTop: 16 }}>
        <Filter size={16} />
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="mine">My authority only</option>
          <option value="all">All authorities</option>
        </select>
        <select value={outcomeFilter} onChange={(e) => setOutcomeFilter(e.target.value)}>
          <option value="">All outcomes</option>
          <option value="genuine">Genuine</option>
          <option value="false_alarm">False alarm</option>
          <option value="duplicate">Duplicate</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="incident-count">{filtered.length} reports</span>
      </div>

      <div className="incidents-table-wrapper" style={{ marginTop: 12 }}>
        {loading ? (
          <div className="loading-center"><Loader size={24} className="spin" /></div>
        ) : filtered.length === 0 ? (
          <p className="empty-text">No responder reports yet.</p>
        ) : (
          <table className="incidents-table">
            <thead>
              <tr>
                <th>Incident</th>
                <th>Category</th>
                <th>Responder</th>
                <th>Authority</th>
                <th>Outcome</th>
                <th>False alarm</th>
                <th>Notes</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>#{r.incident_id}{r.incident_title ? ` — ${r.incident_title}` : ''}</td>
                  <td>
                    {r.incident_category && (
                      <span className="badge" style={{ background: CATEGORY_COLORS[r.incident_category], color: 'white' }}>
                        {r.incident_category.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td>{r.responder_name}</td>
                  <td>{r.responder_authority.replace('_', ' ')}</td>
                  <td>
                    <span className={`badge ${OUTCOME_BADGE_CLASS[r.outcome] || ''}`}>
                      {OUTCOME_LABELS[r.outcome] || r.outcome}
                    </span>
                  </td>
                  <td>
                    {r.is_false_alarm ? (
                      <span className="badge badge-status-fake"><AlertTriangle size={12} /> Flagged</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td style={{ maxWidth: 320, fontSize: '0.85rem', color: 'var(--gray-600, #4b5563)' }}>
                    {r.notes || '—'}
                  </td>
                  <td>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
