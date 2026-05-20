import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Shield, Menu, X, ChevronLeft, ChevronRight, LogOut, Bell,
  LayoutDashboard, FileText, PlusCircle, Map, Home, BarChart3, Settings, ClipboardCheck, UserCheck,
  Flame, HeartPulse, ShieldAlert,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getNotifications } from '../services/api';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/incidents', label: 'Manage Incidents', icon: FileText },
  { path: '/attendance', label: 'Attendance', icon: UserCheck },
  { path: '/responders', label: 'Responders', icon: ClipboardCheck },
  { path: '/alerts', label: 'Alerts & Issue New', icon: PlusCircle },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Account Settings', icon: Settings },
];

const AUTHORITY_BRAND = {
  police: { Icon: Shield, label: 'Police' },
  fire_department: { Icon: Flame, label: 'Fire Department' },
  health: { Icon: HeartPulse, label: 'Health' },
  civil_protection: { Icon: ShieldAlert, label: 'Civil Protection' },
};

export default function AuthorityLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authority, setAuthority] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMobileOpen(false);
    const stored = localStorage.getItem('authority');
    if (stored) {
      setAuthority(JSON.parse(stored));
    } else {
      setAuthority(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!authority?.authority_type) return;
    const tick = async () => {
      try {
        const res = await getNotifications(authority.authority_type, true);
        setUnreadCount(Array.isArray(res.data) ? res.data.length : 0);
      } catch { /* ignore */ }
    };
    tick();
    const interval = setInterval(tick, 12000);
    return () => clearInterval(interval);
  }, [authority?.authority_type, location.pathname]);

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

  const authorityClass = authority ? `theme-${authority.authority_type}` : '';
  const brand = AUTHORITY_BRAND[authority?.authority_type];
  const BrandIcon = brand?.Icon || Shield;
  const brandLabel = brand?.label || 'Authority';

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''} ${authorityClass}`}>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar sidebar-authority ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="sidebar-brand" title={brandLabel}>
            <div className="brand-icon brand-icon-authority">
              <BrandIcon size={20} />
            </div>
            {!collapsed && <span className="brand-text">{brandLabel}</span>}
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
          <Link
            to="/dashboard"
            className={`topbar-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
          >
            <Bell size={20} className={unreadCount > 0 ? 'bell-flicker' : ''} />
            {unreadCount > 0 && <span className="topbar-bell-badge">{unreadCount}</span>}
          </Link>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
