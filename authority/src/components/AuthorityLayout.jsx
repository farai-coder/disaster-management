import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Shield, Menu, X, ChevronLeft, ChevronRight, LogOut,
  LayoutDashboard, FileText, PlusCircle, Bell, Map, Home,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/incidents', label: 'Manage Incidents', icon: FileText },
  { path: '/alerts', label: 'Create Alert', icon: PlusCircle },
];

export default function AuthorityLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authority, setAuthority] = useState(null);

  useEffect(() => {
    setMobileOpen(false);
    const stored = localStorage.getItem('authority');
    if (stored) {
      setAuthority(JSON.parse(stored));
    } else {
      setAuthority(null);
    }
  }, [location.pathname]);

  const stored = localStorage.getItem('authority');
  if (!stored) {
    return <Navigate to="/login" replace />;
  }

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('authority');
    setAuthority(null);
    navigate('/login');
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar sidebar-authority ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand">
            <div className="brand-icon brand-icon-authority">
              <Shield size={20} />
            </div>
            {!collapsed && <span className="brand-text">Authority</span>}
          </Link>
          <button
            className="collapse-btn desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            className="collapse-btn mobile-only"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            {!collapsed && <span className="nav-section-label">Dashboard</span>}
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          <div className="nav-section">
            {!collapsed && <span className="nav-section-label">Quick Links</span>}
            <a
              href="http://localhost:5173/map"
              className="sidebar-link"
              title={collapsed ? 'Public Map' : undefined}
            >
              <Map size={20} />
              {!collapsed && <span>Public Map</span>}
            </a>
            <a
              href="http://localhost:5173/"
              className="sidebar-link"
              title={collapsed ? 'Public Portal' : undefined}
            >
              <Home size={20} />
              {!collapsed && <span>Public Portal</span>}
            </a>
          </div>
        </nav>

        <div className="sidebar-footer">
          {authority && (
            <div className="sidebar-user">
              {!collapsed && (
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{authority.name}</span>
                  <span className="sidebar-user-role">
                    {authority.department} &middot; {authority.authority_type?.replace('_', ' ')}
                  </span>
                </div>
              )}
              <button
                className="sidebar-link logout-link"
                onClick={handleLogout}
                title={collapsed ? 'Logout' : undefined}
              >
                <LogOut size={20} />
                {!collapsed && <span>Logout</span>}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            Authority Dashboard &mdash; {authority?.name || 'Loading...'}
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
