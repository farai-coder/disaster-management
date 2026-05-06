import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Upload, Send, Eye, EyeOff, Loader, Camera, Image as ImageIcon } from 'lucide-react';
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

// Rough Zimbabwe bounding box for client-side coordinate validation
const ZW_BBOX = { minLat: -22.5, maxLat: -15.5, minLon: 25.0, maxLon: 33.2 };

const isInsideZimbabwe = (lat, lon) =>
  lat >= ZW_BBOX.minLat && lat <= ZW_BBOX.maxLat && lon >= ZW_BBOX.minLon && lon <= ZW_BBOX.maxLon;

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
  const [fieldErrors, setFieldErrors] = useState({});
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

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
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

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
    }, 400);
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

  const handlePhotoChange = async (file) => {
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

  const validate = () => {
    const errs = {};
    if (!form.title.trim() || form.title.trim().length < 3) errs.title = 'Title must be at least 3 characters';
    if (!form.description.trim() || form.description.trim().length < 10) errs.description = 'Description must be at least 10 characters';
    if (!form.category) errs.category = 'Please choose a category';
    if (form.latitude == null || form.longitude == null || isNaN(form.latitude) || isNaN(form.longitude)) {
      errs.location = 'Pick a location on the map or use your current location';
    } else if (!isInsideZimbabwe(form.latitude, form.longitude)) {
      errs.location = 'Location must be within Zimbabwe';
    }
    if (!form.is_anonymous) {
      if (!form.reporter_name.trim()) errs.reporter_name = 'Name is required for non-anonymous reports';
      if (!form.reporter_contact.trim()) {
        errs.reporter_contact = 'Phone or email is required';
      } else {
        const v = form.reporter_contact.trim();
        const isPhone = /^[+\d][\d\s-]{6,}$/.test(v);
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (!isPhone && !isEmail) errs.reporter_contact = 'Enter a valid phone number or email address';
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) {
      setError('Please fix the highlighted errors.');
      return;
    }
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('description', form.description.trim());
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
      setTimeout(() => navigate('/track', { state: { incidentId: res.data.id } }), 1800);
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
        Submit a geo-tagged report. Fields marked <span style={{ color: 'var(--danger)' }}>*</span> are mandatory. You can remain anonymous.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="report-form" noValidate>
        <div className="form-grid">
          <div className="form-section">
            <h3>Incident Details</h3>

            <div className="form-group">
              <label>Title <span className="req">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief title of the incident"
                aria-invalid={!!fieldErrors.title}
                required
              />
              {fieldErrors.title && <p className="field-error">{fieldErrors.title}</p>}
            </div>

            <div className="form-group">
              <label>Description <span className="req">*</span></label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened in detail..."
                rows={4}
                aria-invalid={!!fieldErrors.description}
                required
              />
              {fieldErrors.description && <p className="field-error">{fieldErrors.description}</p>}
            </div>

            <div className="form-group">
              <label>Category <span className="req">*</span></label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                aria-invalid={!!fieldErrors.category}
                required
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {fieldErrors.category && <p className="field-error">{fieldErrors.category}</p>}
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
              <label>Photo (optional)</label>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
              <div className="photo-source-buttons">
                <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()}>
                  <Camera size={16} /> Take Photo
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => galleryRef.current?.click()}>
                  <ImageIcon size={16} /> Choose from Gallery / Files
                </button>
                {photo && (
                  <button type="button" className="btn btn-outline" onClick={() => { setPhoto(null); setPhotoPreview(null); setAiSuggestion(null); }}>
                    Remove
                  </button>
                )}
              </div>
              {photo && <p className="file-name-hint">{photo.name}</p>}
              {photoPreview && (
                <img src={photoPreview} alt="Preview" className="photo-preview" />
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Location <span className="req">*</span></h3>

            <div className="form-group" style={{ position: 'relative' }} ref={suggestionsRef}>
              <label>Location Name</label>
              <input
                type="text"
                value={form.location_name}
                onChange={(e) => searchLocation(e.target.value)}
                placeholder="Start typing a place in Zimbabwe..."
                autoComplete="off"
              />
              {suggestionsLoading && (
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: 4 }}>Searching...</div>
              )}
              {suggestions.length > 0 && (
                <ul className="location-suggestions">
                  {suggestions.map((s) => (
                    <li key={s.place_id} onClick={() => selectSuggestion(s)}>
                      {s.display_name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button type="button" className="btn btn-primary" onClick={detectLocation} disabled={geoLoading}>
              <MapPin size={16} />
              {geoLoading ? 'Detecting...' : 'Use My Current Location'}
            </button>

            <div className="form-row" style={{ marginTop: 12 }}>
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

            {fieldErrors.location && <p className="field-error">{fieldErrors.location}</p>}

            <p className="map-hint">Tap on the map below to fine-tune the location.</p>
            <div className="map-picker" style={{ marginTop: 6 }}>
              <IncidentMap
                incidents={[{ id: 0, latitude: form.latitude, longitude: form.longitude, title: 'Report Location', category: form.category || 'other', status: 'pending', description: '', created_at: new Date().toISOString() }]}
                center={[form.latitude, form.longitude]}
                zoom={13}
                height="260px"
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
                  <label>Your Name <span className="req">*</span></label>
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                    placeholder="Full name"
                    aria-invalid={!!fieldErrors.reporter_name}
                  />
                  {fieldErrors.reporter_name && <p className="field-error">{fieldErrors.reporter_name}</p>}
                </div>
                <div className="form-group">
                  <label>Contact (Phone or Email) <span className="req">*</span></label>
                  <input
                    type="text"
                    value={form.reporter_contact}
                    onChange={(e) => setForm({ ...form, reporter_contact: e.target.value })}
                    placeholder="e.g. +263 77 123 4567 or you@example.com"
                    aria-invalid={!!fieldErrors.reporter_contact}
                  />
                  {fieldErrors.reporter_contact && <p className="field-error">{fieldErrors.reporter_contact}</p>}
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
