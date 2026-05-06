import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle, Map, FileText, Bell, Home,
  Menu, X, Search, ChevronLeft, ChevronRight, Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/report', label: 'Report Incident', icon: FileText },
  { path: '/map', label: 'Live Map', icon: Map },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/track', label: 'Track Report', icon: Search },
];

export default function PublicLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand">
            <div className="brand-icon">
              <AlertTriangle size={20} />
            </div>
            {!collapsed && <span className="brand-text">DisasterZW</span>}
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
            {!collapsed && <span className="nav-section-label">Menu</span>}
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
        </nav>

        <div className="sidebar-footer">
          <a
            href="http://localhost:5174/login"
            className="sidebar-link authority-login-link"
            title={collapsed ? 'Authority Portal' : undefined}
          >
            <Shield size={20} />
            {!collapsed && <span>Authority Portal</span>}
          </a>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-title">
            Zimbabwe Disaster Management System
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
