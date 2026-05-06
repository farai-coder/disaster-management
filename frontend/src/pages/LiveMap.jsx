import { useState, useEffect } from 'react';
import { getIncidents } from '../services/api';
import IncidentMap, { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import { RefreshCw, Filter } from 'lucide-react';

export default function LiveMap() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      const res = await getIncidents(params);
      setIncidents(res.data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  return (
    <div className="page map-page">
      <div className="page-header">
        <h1>Live Incident Map</h1>
        <button className="btn btn-secondary" onClick={fetchIncidents}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="map-filters">
        <Filter size={16} />
        <select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}>
          <option value="">All Categories</option>
          <option value="crime">Crime</option>
          <option value="fire">Fire</option>
          <option value="accident">Accident</option>
          <option value="disease_outbreak">Disease Outbreak</option>
          <option value="cyclone_flood">Cyclone / Flood</option>
          <option value="drought">Drought</option>
          <option value="other">Other</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <span className="incident-count">{incidents.length} incidents</span>
      </div>

      <IncidentMap
        incidents={incidents}
        height="calc(100vh - 240px)"
        onIncidentClick={setSelected}
      />

      <div className="map-legend">
        <strong>Legend:</strong>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="legend-item">
            <span className="legend-dot" style={{ background: color }} />
            {cat.replace('_', ' ')}
          </span>
        ))}
      </div>

      {selected && (
        <div className="incident-detail-panel">
          <button className="close-btn" onClick={() => setSelected(null)}>&times;</button>
          <h3>{selected.title}</h3>
          <div className="detail-badges">
            <span className={`badge badge-${selected.category}`}>
              {selected.category.replace('_', ' ')}
            </span>
            <span className={`badge badge-status-${selected.status}`}>
              {STATUS_LABELS[selected.status]}
            </span>
          </div>
          <p>{selected.description}</p>
          {selected.location_name && <p className="detail-location">{selected.location_name}</p>}
          <p className="detail-time">{new Date(selected.created_at).toLocaleString()}</p>
          {selected.is_anonymous && <p className="detail-anon">Reported anonymously</p>}
        </div>
      )}
    </div>
  );
}
