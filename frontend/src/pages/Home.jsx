import { Link } from 'react-router-dom';
import { FileText, Map, AlertTriangle } from 'lucide-react';

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
