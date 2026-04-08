import useUiStore from '../../store/uiStore';
import './Toast.css';

const ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

function ToastItem({ toast, onDismiss }) {
  return (
    <div className={`toast toast--${toast.type}`} role="alert">
      <span className="toast__icon">{ICONS[toast.type]}</span>
      <p className="toast__message">{toast.message}</p>
      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(toast.id)}
        aria-label="Schließen"
      >
        ✕
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
      ))}
    </div>
  );
}
