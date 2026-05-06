import { useState, useEffect } from 'react';
import { getReportsSummary } from '../services/api';
import { BarChart3, Loader, Printer, Download } from 'lucide-react';

const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
};

export default function Reports() {
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState({ start: '', end: '' });
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (authority.authority_type) params.authority_type = authority.authority_type;
      if (range.start) params.start = new Date(range.start).toISOString();
      if (range.end) params.end = new Date(range.end).toISOString();
      const res = await getReportsSummary(params);
      setSummary(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load report');
    }
    setLoading(false);
  };

  useEffect(() => { fetchSummary(); }, []);

  const handlePrint = () => window.print();

  const handleCsv = () => {
    if (!summary?.incidents?.length) return;
    downloadCsv(`incidents-${new Date().toISOString().slice(0,10)}.csv`, summary.incidents);
  };

  return (
    <div className="page reports-page">
      <div className="page-header no-print">
        <h1><BarChart3 size={24} /> System Reports</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleCsv} disabled={!summary?.incidents?.length}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="map-filters no-print">
        <label>From <input type="date" value={range.start} onChange={(e) => setRange({ ...range, start: e.target.value })} /></label>
        <label>To <input type="date" value={range.end} onChange={(e) => setRange({ ...range, end: e.target.value })} /></label>
        <button className="btn btn-primary btn-sm" onClick={fetchSummary}>Apply</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><Loader className="spin" /> Generating report...</div>
      ) : summary && (
        <div className="printable-report">
          <header className="report-header">
            <h2>Disaster Management Report</h2>
            <p>
              <strong>Authority:</strong> {authority.name} ({authority.authority_type?.replace('_', ' ')})<br />
              <strong>Generated:</strong> {new Date(summary.generated_at).toLocaleString()}<br />
              {summary.range.start && <><strong>Range:</strong> {new Date(summary.range.start).toLocaleDateString()} – {summary.range.end ? new Date(summary.range.end).toLocaleDateString() : 'now'}<br /></>}
            </p>
          </header>

          <section>
            <h3>Summary</h3>
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <BarChart3 size={20} />
                <div>
                  <span className="stat-value">{summary.totals.incidents}</span>
                  <span className="stat-label">Incidents</span>
                </div>
              </div>
              <div className="stat-card stat-alerts">
                <BarChart3 size={20} />
                <div>
                  <span className="stat-value">{summary.totals.alerts_total}</span>
                  <span className="stat-label">Alerts issued</span>
                </div>
              </div>
              <div className="stat-card stat-pending">
                <BarChart3 size={20} />
                <div>
                  <span className="stat-value">{summary.totals.alerts_active}</span>
                  <span className="stat-label">Alerts active</span>
                </div>
              </div>
              <div className="stat-card stat-fake">
                <BarChart3 size={20} />
                <div>
                  <span className="stat-value">{summary.totals.false_alarms}</span>
                  <span className="stat-label">False alarms</span>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3>By Category</h3>
            <table className="incidents-table">
              <thead><tr><th>Category</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
              <tbody>
                {Object.entries(summary.by_category).map(([k, v]) => (
                  <tr key={k}><td style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</td><td style={{ textAlign: 'right' }}>{v}</td></tr>
                ))}
                {Object.keys(summary.by_category).length === 0 && <tr><td colSpan={2}>No data</td></tr>}
              </tbody>
            </table>
          </section>

          <section>
            <h3>By Status</h3>
            <table className="incidents-table">
              <thead><tr><th>Status</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
              <tbody>
                {Object.entries(summary.by_status).map(([k, v]) => (
                  <tr key={k}><td style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</td><td style={{ textAlign: 'right' }}>{v}</td></tr>
                ))}
                {Object.keys(summary.by_status).length === 0 && <tr><td colSpan={2}>No data</td></tr>}
              </tbody>
            </table>
          </section>

          <section>
            <h3>Incidents Detail</h3>
            <table className="incidents-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {summary.incidents.length === 0 && <tr><td colSpan={6}>No incidents in selected range.</td></tr>}
                {summary.incidents.map((i) => (
                  <tr key={i.id}>
                    <td>#{i.id}</td>
                    <td>{i.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{i.category.replace('_', ' ')}</td>
                    <td style={{ textTransform: 'capitalize' }}>{i.status.replace('_', ' ')}</td>
                    <td>{i.location_name || `${i.latitude.toFixed(3)}, ${i.longitude.toFixed(3)}`}</td>
                    <td>{new Date(i.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <footer className="report-footer">
            <p>Zimbabwe Disaster Management System &mdash; Confidential, for authority use.</p>
          </footer>
        </div>
      )}
    </div>
  );
}
