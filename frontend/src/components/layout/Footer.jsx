import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner container">
        <span className="footer__copy">
          &copy; {new Date().getFullYear()} GRAPE
        </span>
        <span className="footer__tagline">
          Fahrzeugvermietung & Tausch
        </span>
      </div>
    </footer>
  );
}