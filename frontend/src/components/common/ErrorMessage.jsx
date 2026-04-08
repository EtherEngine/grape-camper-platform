import './ErrorMessage.css';

/**
 * Inline message banner.
 * @param {'error'|'success'|'warning'|'info'} variant
 */
export default function ErrorMessage({ message, onRetry, variant = 'error', onDismiss }) {
  if (!message) return null;

  return (
    <div className={`msg msg--${variant}`} role="alert">
      <p className="msg__text">{message}</p>
      <div className="msg__actions">
        {onRetry && (
          <button type="button" className="msg__btn" onClick={onRetry}>
            Erneut versuchen
          </button>
        )}
        {onDismiss && (
          <button type="button" className="msg__dismiss" onClick={onDismiss} aria-label="Schließen">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}