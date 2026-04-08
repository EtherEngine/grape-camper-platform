import './Loader.css';

/**
 * Spinner loader with optional text.
 * @param {'sm'|'md'|'lg'} size
 * @param {boolean} overlay  — full-screen overlay mode
 * @param {boolean} inline   — render inline (no padding/centering)
 */
export default function Loader({ size = 'md', text = null, overlay = false, inline = false }) {
  const spinner = (
    <div className={`loader ${inline ? 'loader--inline' : ''} loader--${size}`}>
      <div className="loader__spinner" />
      {text && <p className="loader__text">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loader-overlay">
        {spinner}
      </div>
    );
  }

  return spinner;
}