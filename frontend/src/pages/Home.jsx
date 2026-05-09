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
    </div>
  );
}
