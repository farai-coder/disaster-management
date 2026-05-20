import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginAuthority } from '../services/api';
import {
  Shield, LogIn, Loader, UserPlus,
  Flame, HeartPulse, ShieldAlert,
} from 'lucide-react';

const AUTHORITY_CHIPS = [
  { type: 'police',           Icon: Shield,       label: 'Police',          dept: 'ZRP',                color: '#1d4ed8', defaultUser: 'police_admin' },
  { type: 'fire_department',  Icon: Flame,        label: 'Fire Department', dept: 'City Fire',          color: '#b91c1c', defaultUser: 'fire_admin'   },
  { type: 'health',           Icon: HeartPulse,   label: 'Health',          dept: 'Ministry of Health', color: '#047857', defaultUser: 'health_admin' },
  { type: 'civil_protection', Icon: ShieldAlert,  label: 'Civil Protection',dept: 'DCP',                color: '#6d28d9', defaultUser: 'civil_admin'  },
];

export default function AuthorityLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginAuthority({ username, password });
      localStorage.setItem('auth_token', res.data.access_token);
      localStorage.setItem('authority', JSON.stringify(res.data.authority));
      navigate('/dashboard');
    } catch {
      setError('Invalid credentials. Please try again.');
    }
    setLoading(false);
  };

  const pickAuthority = (chip) => {
    setSelectedType(chip.type);
    setUsername(chip.defaultUser);
  };

  return (
    <div className="login-page-standalone">
      <div className="login-card">
        <div className="zim-flag-stripe" style={{ borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }} />
        <div className="login-header">
          <Shield size={40} />
          <h1>Authority Login</h1>
          <p>Choose your authority and sign in</p>
        </div>

        <div className="authority-chooser">
          {AUTHORITY_CHIPS.map((chip) => {
            const Icon = chip.Icon;
            return (
              <button
                key={chip.type}
                type="button"
                className={`authority-chip ${selectedType === chip.type ? 'active' : ''}`}
                onClick={() => pickAuthority(chip)}
              >
                <span className="authority-chip-badge" style={{ background: chip.color }}>
                  <Icon size={18} />
                </span>
                <span className="authority-chip-text">
                  <strong>{chip.label}</strong>
                  <small>{chip.dept}</small>
                </span>
              </button>
            );
          })}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <Loader size={18} className="spin" /> : <LogIn size={18} />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-back-link" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
          <Link to="/signup"><UserPlus size={14} /> Create authority account</Link>
          <a href="http://localhost:5173/">Back to Public Portal</a>
        </div>
      </div>
    </div>
  );
}
