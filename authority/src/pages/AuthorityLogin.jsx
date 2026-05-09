import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginAuthority } from '../services/api';
import { Shield, LogIn, Loader, UserPlus } from 'lucide-react';

export default function AuthorityLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="login-page-standalone">
      <div className="login-card">
        <div className="login-header">
          <Shield size={40} />
          <h1>Authority Login</h1>
          <p>Access the disaster management dashboard</p>
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
