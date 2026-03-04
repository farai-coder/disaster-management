import { useState, useEffect } from 'react';
import { getIncidents, updateIncident, deleteIncident, UPLOAD_BASE } from '../services/api';
import { CATEGORY_COLORS, STATUS_LABELS } from '../components/IncidentMap';
import IncidentMap from '../components/IncidentMap';
import {
  Filter, CheckCircle, XCircle, Loader,
  Trash2, Eye, MapPin, Clock,
} from 'lucide-react';

export default function ManageIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [filter, setFilter] = useState({ category: '', status: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const authority = JSON.parse(localStorage.getItem('authority') || '{}');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.category) params.category = filter.category;
      if (filter.status) params.status = filter.status;
      if (authority.authority_type !== 'admin') {
        params.authority = authority.authority_type;
      }
      const res = await getIncidents(params);
      setIncidents(res.data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncidents();
  }, [filter]);

  const handleStatusUpdate = async (id, status) => {
    setUpdating(id);
    try {
      await updateIncident(id, { status });
      fetchIncidents();
      if (selected?.id === id) {
        setSelected({ ...selected, status });
      }
    } catch {
      // ignore
    }
    setUpdating(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    try {
      await deleteIncident(id);
      setIncidents((prev) => prev.filter((i) => i.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      // ignore
    }
  };

  return (
    <div className="page manage-page">
      <div className="page-header">
        <h1>Manage Incidents</h1>
        <div className="view-toggle">
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('map')}
          >
            Map
          </button>
        </div>
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
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="fake">Fake</option>
        </select>
        <span className="incident-count">{incidents.length} incidents</span>
      </div>

      {viewMode === 'map' ? (
        <IncidentMap
          incidents={incidents}
          height="calc(100vh - 280px)"
          onIncidentClick={setSelected}
        />
      ) : (
        <div className="incidents-table-wrapper">
          {loading ? (
            <div className="loading-center"><Loader size={24} className="spin" /></div>
          ) : incidents.length === 0 ? (
            <p className="empty-text">No incidents found</p>
          ) : (
            <table className="incidents-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((inc) => (
                  <tr key={inc.id} className={selected?.id === inc.id ? 'selected-row' : ''}>
                    <td>#{inc.id}</td>
                    <td>
                      <button className="link-btn" onClick={() => setSelected(inc)}>
                        {inc.title}
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
                    </td>
                    <td>{inc.location_name || `${inc.latitude.toFixed(4)}, ${inc.longitude.toFixed(4)}`}</td>
                    <td>{new Date(inc.created_at).toLocaleDateString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStatusUpdate(inc.id, 'verified')}
                          disabled={updating === inc.id}
                          title="Verify"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => handleStatusUpdate(inc.id, 'in_progress')}
                          disabled={updating === inc.id}
                          title="Mark In Progress"
                        >
                          <Clock size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleStatusUpdate(inc.id, 'resolved')}
                          disabled={updating === inc.id}
                          title="Resolve"
                        >
                          <CheckCircle size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleStatusUpdate(inc.id, 'fake')}
                          disabled={updating === inc.id}
                          title="Flag Fake"
                        >
                          <XCircle size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleDelete(inc.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {selected && (
        <div className="incident-detail-panel side-panel">
          <button className="close-btn" onClick={() => setSelected(null)}>&times;</button>
          <h3>#{selected.id} - {selected.title}</h3>
          <div className="detail-badges">
            <span
              className="badge"
              style={{ background: CATEGORY_COLORS[selected.category], color: 'white' }}
            >
              {selected.category.replace('_', ' ')}
            </span>
            <span className={`badge badge-status-${selected.status}`}>
              {STATUS_LABELS[selected.status]}
            </span>
          </div>
          <p>{selected.description}</p>
          {selected.location_name && (
            <p><MapPin size={14} /> {selected.location_name}</p>
          )}
          <p><Clock size={14} /> {new Date(selected.created_at).toLocaleString()}</p>
          {selected.is_anonymous ? (
            <p><Eye size={14} /> Anonymous report</p>
          ) : (
            <>
              {selected.reporter_name && <p>Reporter: {selected.reporter_name}</p>}
              {selected.reporter_contact && <p>Contact: {selected.reporter_contact}</p>}
            </>
          )}
          {selected.photo_url && (
            <img src={`${UPLOAD_BASE}${selected.photo_url}`} alt="Incident" className="detail-photo" />
          )}
          {selected.ai_suggested_category && (
            <p className="ai-label">AI Suggestion: {selected.ai_suggested_category.replace('_', ' ')}</p>
          )}

          <div className="detail-actions">
            <h4>Update Status:</h4>
            <div className="action-buttons">
              {['pending', 'verified', 'in_progress', 'resolved', 'fake'].map((s) => (
                <button
                  key={s}
                  className={`btn btn-sm ${selected.status === s ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleStatusUpdate(selected.id, s)}
                  disabled={updating === selected.id}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
