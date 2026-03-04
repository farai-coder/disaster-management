import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Upload, Send, Eye, EyeOff, Loader } from 'lucide-react';
import { createIncident, classifyImage } from '../services/api';
import IncidentMap from '../components/IncidentMap';

const CATEGORIES = [
  { value: 'crime', label: 'Crime' },
  { value: 'fire', label: 'Fire' },
  { value: 'accident', label: 'Accident' },
  { value: 'disease_outbreak', label: 'Disease Outbreak' },
  { value: 'cyclone_flood', label: 'Cyclone / Flood' },
  { value: 'drought', label: 'Drought' },
  { value: 'other', label: 'Other' },
];

export default function ReportIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    latitude: -17.8292,
    longitude: 31.0522,
    location_name: '',
    is_anonymous: false,
    reporter_name: '',
    reporter_contact: '',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              setForm((prev) => ({ ...prev, location_name: data.display_name }));
            }
          }
        } catch { /* ignore */ }
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) setError('Location permission denied. Please allow location access in your browser settings.');
        else setError('Could not get your location. Please enter it manually.');
      },
      { timeout: 15000 }
    );
  };

  useEffect(() => {
    // Don't auto-detect on load - let the user click the button
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocation = (query) => {
    setForm((prev) => ({ ...prev, location_name: query }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 3) { setSuggestions([]); setSuggestionsLoading(false); return; }
    setSuggestionsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=7&countrycodes=zw&viewbox=25.2,-22.4,33.1,-15.6&bounded=1`
        );
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      } catch {
        setSuggestions([]);
      }
      setSuggestionsLoading(false);
    }, 500);
  };

  const selectSuggestion = (s) => {
    setForm((prev) => ({
      ...prev,
      location_name: s.display_name,
      latitude: parseFloat(s.lat),
      longitude: parseFloat(s.lon),
    }));
    setSuggestions([]);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));

    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('description', form.description || form.title);
      const res = await classifyImage(fd);
      setAiSuggestion(res.data);
    } catch {
      // AI classification is optional
    }
  };

  const handleMapClick = ({ lat, lng }) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('latitude', form.latitude);
      fd.append('longitude', form.longitude);
      fd.append('location_name', form.location_name);
      fd.append('is_anonymous', form.is_anonymous);
      if (!form.is_anonymous) {
        fd.append('reporter_name', form.reporter_name);
        fd.append('reporter_contact', form.reporter_contact);
      }
      if (photo) {
        fd.append('photo', photo);
      }

      const res = await createIncident(fd);
      setSuccess(`Incident reported successfully! Reference ID: #${res.data.id}`);
      setTimeout(() => navigate('/track', { state: { incidentId: res.data.id } }), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page report-page">
      <h1>Report an Incident</h1>
      <p className="page-subtitle">
        Submit a geo-tagged report. You can remain anonymous.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-grid">
          <div className="form-section">
            <h3>Incident Details</h3>

            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief title of the incident"
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened in detail..."
                rows={4}
                required
              />
            </div>

            <div className="form-group">
              <label>Category *</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {aiSuggestion && (
                <div className="ai-suggestion">
                  AI suggests: <strong>{aiSuggestion.suggested_category.replace('_', ' ')}</strong>
                  {' '}({Math.round(aiSuggestion.confidence * 100)}% confidence)
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setForm({ ...form, category: aiSuggestion.suggested_category })}
                  >
                    Use suggestion
                  </button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Upload Photo</label>
              <div className="file-upload">
                <input type="file" accept="image/*" onChange={handlePhotoChange} id="photo-upload" />
                <label htmlFor="photo-upload" className="file-upload-label">
                  <Upload size={20} />
                  <span>{photo ? photo.name : 'Choose a photo...'}</span>
                </label>
              </div>
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="photo-preview" />
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Location</h3>

            <div className="form-group" style={{ position: 'relative' }} ref={suggestionsRef}>
              <label>Location Name</label>
              <input
                type="text"
                value={form.location_name}
                onChange={(e) => searchLocation(e.target.value)}
                placeholder="e.g. Corner of Samora Machel & J. Nkomo"
                autoComplete="off"
              />
              {suggestionsLoading && (
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>Searching...</div>
              )}
              {suggestions.length > 0 && (
                <ul style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
                  border: '1.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  listStyle: 'none', margin: 0, padding: 0, zIndex: 1000, maxHeight: 220, overflowY: 'auto',
                }}>
                  {suggestions.map((s) => (
                    <li
                      key={s.place_id}
                      onClick={() => selectSuggestion(s)}
                      style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid #f3f4f6' }}
                      onMouseEnter={(e) => (e.target.style.background = '#f9fafb')}
                      onMouseLeave={(e) => (e.target.style.background = 'white')}
                    >
                      {s.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <button type="button" className="btn btn-secondary" onClick={detectLocation} disabled={geoLoading}>
              <MapPin size={16} />
              {geoLoading ? 'Detecting...' : 'Use My Location'}
            </button>

            <div className="map-picker" style={{ marginTop: 12 }}>
              <IncidentMap
                incidents={[{ id: 0, latitude: form.latitude, longitude: form.longitude, title: 'Report Location', category: form.category || 'other', status: 'pending', description: '', created_at: new Date().toISOString() }]}
                center={[form.latitude, form.longitude]}
                zoom={13}
                height="250px"
                onMapClick={handleMapClick}
              />
            </div>

            <h3 style={{ marginTop: 20 }}>Reporter Info</h3>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_anonymous}
                  onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })}
                />
                {form.is_anonymous ? <EyeOff size={16} /> : <Eye size={16} />}
                Report anonymously
              </label>
            </div>

            {!form.is_anonymous && (
              <>
                <div className="form-group">
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label>Contact (Phone/Email)</label>
                  <input
                    type="text"
                    value={form.reporter_contact}
                    onChange={(e) => setForm({ ...form, reporter_contact: e.target.value })}
                    placeholder="Phone number or email"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg submit-btn" disabled={loading}>
          {loading ? <Loader size={20} className="spin" /> : <Send size={20} />}
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </div>
  );
}
