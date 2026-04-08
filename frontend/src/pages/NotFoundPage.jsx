import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '4rem', color: 'var(--color-primary)' }}>404</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>Seite nicht gefunden.</p>
      <Link to="/" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Zur Startseite
      </Link>
    </div>
  );
}