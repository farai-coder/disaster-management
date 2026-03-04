import { Link } from 'react-router-dom';
import { FileText, Map, Bell, Shield, AlertTriangle, Eye } from 'lucide-react';

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <AlertTriangle size={44} className="hero-icon" />
          <h1>Zimbabwe Disaster Management</h1>
          <p>
            Report critical incidents, receive emergency alerts, and help authorities
            coordinate disaster response across Zimbabwe.
          </p>
          <div className="hero-actions">
            <Link to="/report" className="btn btn-primary btn-lg">
              <FileText size={20} />
              Report an Incident
            </Link>
            <Link to="/map" className="btn btn-secondary btn-lg">
              <Map size={20} />
              View Live Map
            </Link>
          </div>
        </div>
      </section>

      <section className="features">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <FileText size={32} />
            <h3>Report Incidents</h3>
            <p>
              Submit geo-tagged reports with photos for crimes, fires, accidents,
              disease outbreaks, floods, and more. Anonymous reporting supported.
            </p>
          </div>
          <div className="feature-card">
            <Map size={32} />
            <h3>Live Map Tracking</h3>
            <p>
              View all reported incidents on an interactive map of Zimbabwe.
              Color-coded markers show incident categories and status.
            </p>
          </div>
          <div className="feature-card">
            <Bell size={32} />
            <h3>Receive Alerts</h3>
            <p>
              Get real-time warnings and advisories issued by authorities.
              Stay informed about emergencies in your area.
            </p>
          </div>
          <div className="feature-card">
            <Eye size={32} />
            <h3>Track Your Report</h3>
            <p>
              Follow the status of your submitted report from pending
              through verification to resolution.
            </p>
          </div>
          <div className="feature-card">
            <Shield size={32} />
            <h3>Authority Dashboard</h3>
            <p>
              Police, fire, health, and civil protection authorities manage
              incidents, verify reports, and issue alerts.
            </p>
          </div>
          <div className="feature-card">
            <AlertTriangle size={32} />
            <h3>AI Classification</h3>
            <p>
              Uploaded photos are analyzed to suggest incident categories,
              helping speed up the reporting process.
            </p>
          </div>
        </div>
      </section>

      <section className="categories-section">
        <h2>Incident Categories</h2>
        <div className="category-grid">
          {[
            { name: 'Crime', color: '#ef4444', desc: 'Theft, robbery, assault, vandalism' },
            { name: 'Fire', color: '#f97316', desc: 'Building fires, veld fires, explosions' },
            { name: 'Accident', color: '#eab308', desc: 'Road accidents, industrial accidents' },
            { name: 'Disease Outbreak', color: '#8b5cf6', desc: 'Cholera, typhoid, COVID-19' },
            { name: 'Cyclone / Flood', color: '#3b82f6', desc: 'Flooding, cyclones, storms' },
            { name: 'Drought', color: '#a16207', desc: 'Water shortage, crop failure' },
          ].map((cat) => (
            <div key={cat.name} className="category-card" style={{ borderColor: cat.color }}>
              <div className="category-dot" style={{ background: cat.color }} />
              <h4>{cat.name}</h4>
              <p>{cat.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
