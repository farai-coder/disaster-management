import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Send, Eye, EyeOff, Loader, Camera, Image as ImageIcon, X } from 'lucide-react';
import { createIncident } from '../services/api';
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
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const searchTimeoutRef = useRef(null);
  const suggestionsRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

  const handlePhotoChange = (file) => {
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const openLiveCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera not supported by this browser.');
      setCameraOpen(true);
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setCameraError('Live camera requires HTTPS. On a LAN address, use the "Take Photo" button instead — it opens your phone\'s camera directly.');
      setCameraOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch (err) {
      setCameraError(err?.message || 'Unable to access camera.');
      setCameraOpen(true);
    }
  };

  const closeLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraError('');
  };

  const captureFromLiveCamera = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handlePhotoChange(file);
      closeLiveCamera();
    }, 'image/jpeg', 0.9);
  };

  useEffect(() => () => closeLiveCamera(), []);

  const handleMapClick = ({ lat, lng }) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fd = new FormData();
      const title = form.title.trim() || 'Incident report';
      fd.append('title', title);
      fd.append('description', form.description.trim());
      fd.append('category', form.category || 'other');
      fd.append('latitude', form.latitude);
      fd.append('longitude', form.longitude);
      fd.append('location_name', form.location_name);
      fd.append('is_anonymous', form.is_anonymous);
      if (!form.is_anonymous) {
        fd.append('reporter_name', form.reporter_name);
        fd.append('reporter_contact', form.reporter_contact);
      }
      if (photo) fd.append('photo', photo);

      const res = await createIncident(fd);
      setSuccess(`Report submitted. Reference #${res.data.id}.`);
      setTimeout(() => navigate('/track', { state: { incidentId: res.data.id } }), 1200);
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
        Submit a report. All fields are optional &mdash; just give what you can.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="report-form" noValidate>
        <div className="form-grid">
          <div className="form-section">
            <h3>Incident Details</h3>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief title (optional)"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what happened (e.g. 'head-on collision and the cars caught fire'). The system uses keywords to alert the right authorities."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select category (optional)...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
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
                <button type="button" className="btn btn-secondary" onClick={openLiveCamera}>
                  <Camera size={16} /> Live Camera
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()}>
                  <Camera size={16} /> Take Photo
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => galleryRef.current?.click()}>
                  <ImageIcon size={16} /> Gallery / Files
                </button>
                {photo && (
                  <button type="button" className="btn btn-outline" onClick={() => { setPhoto(null); setPhotoPreview(null); }}>
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
            <h3>Location</h3>

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
                  <label>Your Name</label>
                  <input
                    type="text"
                    value={form.reporter_name}
                    onChange={(e) => setForm({ ...form, reporter_name: e.target.value })}
                    placeholder="Full name (optional)"
                  />
                </div>
                <div className="form-group">
                  <label>Contact (Phone or Email)</label>
                  <input
                    type="text"
                    value={form.reporter_contact}
                    onChange={(e) => setForm({ ...form, reporter_contact: e.target.value })}
                    placeholder="Optional contact info"
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

      {cameraOpen && (
        <div className="camera-modal-overlay" onClick={closeLiveCamera}>
          <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="camera-close" onClick={closeLiveCamera} aria-label="Close camera">
              <X size={20} />
            </button>
            {cameraError ? (
              <div className="alert alert-error" style={{ margin: 16 }}>{cameraError}</div>
            ) : (
              <>
                <video ref={videoRef} className="camera-video" playsInline muted />
                <div className="camera-actions">
                  <button type="button" className="btn btn-primary btn-lg" onClick={captureFromLiveCamera}>
                    <Camera size={18} /> Capture
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
