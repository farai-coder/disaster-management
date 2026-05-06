import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Map, Phone, AlertTriangle } from 'lucide-react';
import { getEmergencyNumbers } from '../services/api';

const FALLBACK_NUMBERS = [
  { label: 'Police', number: '995', alt: '+263 242 700 171' },
  { label: 'Ambulance / Health', number: '994', alt: '+263 242 705 906' },
  { label: 'Fire Brigade', number: '993', alt: '+263 242 752 167' },
  { label: 'Civil Protection', number: '0242-700-117', alt: '' },
  { label: 'Childline Zimbabwe', number: '116', alt: '' },
  { label: 'Musasa (GBV)', number: '08080074', alt: '' },
  { label: 'ZESA Emergency', number: '08006328', alt: '' },
  { label: 'ZINWA Emergency', number: '08004545', alt: '' },
];

export default function Home() {
  const [numbers, setNumbers] = useState(FALLBACK_NUMBERS);

  useEffect(() => {
    getEmergencyNumbers()
      .then((res) => setNumbers(res.data.numbers || FALLBACK_NUMBERS))
      .catch(() => {});
  }, []);

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

      <section className="emergency-numbers">
        <div className="emergency-header">
          <Phone size={22} />
          <div>
            <h2>Emergency Toll-Free Numbers</h2>
            <p>Call any of the lines below for immediate assistance anywhere in Zimbabwe.</p>
          </div>
        </div>
        <div className="emergency-grid">
          {numbers.map((n) => (
            <a
              key={n.label}
              href={`tel:${n.number.replace(/\s|-/g, '')}`}
              className="emergency-card"
            >
              <span className="emergency-label">{n.label}</span>
              <span className="emergency-number">{n.number}</span>
              {n.alt && <span className="emergency-alt">{n.alt}</span>}
            </a>
          ))}
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
