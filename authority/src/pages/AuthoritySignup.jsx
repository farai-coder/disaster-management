import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerAuthority, loginAuthority } from '../services/api';
import { Shield, UserPlus, Loader } from 'lucide-react';

const AUTHORITY_TYPES = [
  { value: 'police', label: 'Police' },
  { value: 'fire_department', label: 'Fire Brigade' },
  { value: 'health', label: 'Health / Ambulance' },
  { value: 'civil_protection', label: 'Civil Protection' },
];

export default function AuthoritySignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirm: '',
    name: '',
    authority_type: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (!form.authority_type) {
      setError('Please choose your authority type');
      return;
    }

    setLoading(true);
    try {
      await registerAuthority({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        authority_type: form.authority_type,
        department: form.department.trim() || null,
      });
      const loginRes = await loginAuthority({
        username: form.username.trim(),
        password: form.password,
      });
      localStorage.setItem('auth_token', loginRes.data.access_token);
      localStorage.setItem('authority', JSON.stringify(loginRes.data.authority));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    }
    setLoading(false);
  };

  return (
    <div className="login-page-standalone">
      <div className="login-card">
        <div className="login-header">
          <Shield size={40} />
          <h1>Create Authority Account</h1>
          <p>Sign up to access the dashboard</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="e.g. j.moyo"
              required
              minLength={3}
            />
          </div>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              required
            />
          </div>
          <div className="form-group">
            <label>Authority Type</label>
            <select
              value={form.authority_type}
              onChange={(e) => setForm({ ...form, authority_type: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {AUTHORITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Department / Station (optional)</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              placeholder="e.g. ZRP Avondale"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={4}
              />
            </div>
            <div className="form-group">
              <label>Confirm</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
                minLength={4}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : <UserPlus size={18} />}
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="login-back-link" style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to="/login">Already have an account? Login</Link>
        </div>
      </div>
    </div>
  );
}
