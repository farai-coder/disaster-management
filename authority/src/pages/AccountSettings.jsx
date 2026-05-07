import { useState } from 'react';
import { changePassword } from '../services/api';
import { Lock, Loader } from 'lucide-react';

export default function AccountSettings() {
  const authority = JSON.parse(localStorage.getItem('authority') || '{}');
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.new_password !== form.confirm) {
      setError('New password and confirmation do not match');
      return;
    }
    if (form.new_password.length < 4) {
      setError('New password must be at least 4 characters');
      return;
    }
    setLoading(true);
    try {
      await changePassword(authority.id, {
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess('Password updated successfully.');
      setForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <h1>Account Settings</h1>
      <p className="page-subtitle">Manage your authority account.</p>

      <div className="dashboard-section" style={{ maxWidth: 640 }}>
        <h2><Lock size={18} /> Change Password</h2>
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={form.current_password}
              onChange={(e) => setForm({ ...form, current_password: e.target.value })}
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                required
                minLength={4}
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
                minLength={4}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Loader size={16} className="spin" /> : <Lock size={16} />}
            {loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
