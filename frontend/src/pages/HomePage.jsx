import { Link } from 'react-router-dom';
import heroImg from '../assets/camper_hero.jpg';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="hp">
      {/* ── Hero ──────────────────────────────────────── */}
      <section className="hp__hero" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hp__hero-overlay" />
        <div className="hp__hero-content">
          <span className="hp__hero-badge">Camper · Mieten · Tauschen</span>
          <h1 className="hp__hero-title">
            Dein nächstes Abenteuer<br />beginnt hier.
          </h1>
          <p className="hp__hero-sub">
            Finde den perfekten Camper für deinen Roadtrip — oder tausche
            deinen eigenen mit anderen Reisenden. Einfach, sicher und fair.
          </p>
          <div className="hp__hero-actions">
            <Link to="/vehicles" className="hp__btn hp__btn--primary">
              Fahrzeuge entdecken
            </Link>
            <Link to="/register" className="hp__btn hp__btn--outline">
              Kostenlos registrieren
            </Link>
          </div>
        </div>
        <div className="hp__scroll-hint" aria-hidden="true">
          <span />
        </div>
      </section>

      {/* ── Features ──────────────────────────────────── */}
      <section className="hp__features">
        <div className="hp__section-inner">
          <h2 className="hp__section-title">Warum GRAPE?</h2>
          <p className="hp__section-sub">
            Wir machen Camper-Vermietung persönlich, transparent und unkompliziert.
          </p>
          <div className="hp__features-grid">
            <div className="hp__feature-card">
              <span className="hp__feature-icon">🚐</span>
              <h3>Vielfältige Auswahl</h3>
              <p>
                Vom kompakten Van bis zum geräumigen Wohnmobil — entdecke
                Fahrzeuge von privaten Besitzern in deiner Nähe.
              </p>
            </div>
            <div className="hp__feature-card">
              <span className="hp__feature-icon">🔄</span>
              <h3>Camper tauschen</h3>
              <p>
                Du besitzt selbst einen Camper? Tausche ihn mit anderen und
                erlebe neue Fahrzeuge, ohne extra zu zahlen.
              </p>
            </div>
            <div className="hp__feature-card">
              <span className="hp__feature-icon">📋</span>
              <h3>Digitaler Mietvertrag</h3>
              <p>
                Automatische Vertragserstellung mit Versicherungsangaben —
                alles rechtssicher und in wenigen Klicks erledigt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────── */}
      <section className="hp__steps">
        <div className="hp__section-inner">
          <h2 className="hp__section-title">So funktioniert's</h2>
          <div className="hp__steps-grid">
            <div className="hp__step">
              <span className="hp__step-num">1</span>
              <h3>Fahrzeug finden</h3>
              <p>Stöbere durch verfügbare Camper und wähle deinen Favoriten.</p>
            </div>
            <div className="hp__step-arrow" aria-hidden="true">→</div>
            <div className="hp__step">
              <span className="hp__step-num">2</span>
              <h3>Anfrage senden</h3>
              <p>Wähle deine Reisedaten und sende eine Buchungsanfrage an den Besitzer.</p>
            </div>
            <div className="hp__step-arrow" aria-hidden="true">→</div>
            <div className="hp__step">
              <span className="hp__step-num">3</span>
              <h3>Losfahren</h3>
              <p>Vertrag unterschreiben, Schlüssel abholen — und dein Abenteuer kann beginnen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="hp__cta">
        <div className="hp__section-inner">
          <h2>Bereit für die Straße?</h2>
          <p>
            Erstelle jetzt dein kostenloses Konto und finde deinen Traum-Camper
            — oder teile deinen eigenen mit der Community.
          </p>
          <Link to="/vehicles" className="hp__btn hp__btn--primary hp__btn--lg">
            Jetzt Camper finden
          </Link>
        </div>
      </section>
    </div>
  );
}