import { useState, useEffect, useRef, useCallback } from 'react';
import PaymentsApi from './PaymentsApi';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import './PaymentStatus.css';

const STATUS_META = {
  initiated:            { label: 'Initiiert',          cls: 'pstat__badge--info' },
  pending:              { label: 'Ausstehend',         cls: 'pstat__badge--warning' },
  paid:                 { label: 'Bezahlt',            cls: 'pstat__badge--success' },
  failed:               { label: 'Fehlgeschlagen',     cls: 'pstat__badge--danger' },
  cancelled:            { label: 'Storniert',          cls: 'pstat__badge--muted' },
  refunded:             { label: 'Erstattet',          cls: 'pstat__badge--muted' },
  partially_refunded:   { label: 'Teilweise erstattet', cls: 'pstat__badge--warning' },
};

const POLL_INTERVAL = 4000;
const TERMINAL_STATUSES = ['paid', 'failed', 'cancelled', 'refunded'];

/**
 * Zeigt den aktuellen Zahlungsstatus mit Auto-Polling.
 *
 * @param {{ paymentId: number, onPaid?: () => void, onFailed?: () => void }} props
 */
export default function PaymentStatus({ paymentId, onPaid, onFailed }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);

  // ── Fetch payment detail ────────────────────────────────
  const fetchPayment = useCallback(async () => {
    try {
      const res = await PaymentsApi.get(paymentId);
      const p = res.data?.data || null;
      setPayment(p);
      setError(null);

      if (p && TERMINAL_STATUSES.includes(p.status)) {
        clearInterval(intervalRef.current);
        if (p.status === 'paid' && onPaid) onPaid();
        if (p.status === 'failed' && onFailed) onFailed();
      }
    } catch (err) {
      setError(err.message || 'Zahlung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [paymentId, onPaid, onFailed]);

  // ── Start polling ───────────────────────────────────────
  useEffect(() => {
    if (!paymentId) return;
    setLoading(true);
    fetchPayment();

    intervalRef.current = setInterval(fetchPayment, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [paymentId, fetchPayment]);

  // ── Manual sync ─────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await PaymentsApi.sync(paymentId);
      setPayment(res.data?.data || payment);
    } catch (err) {
      setError(err.message || 'Sync fehlgeschlagen.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Manual confirm (mock) ───────────────────────────────
  const handleConfirm = async () => {
    setSyncing(true);
    try {
      const res = await PaymentsApi.confirm(paymentId);
      setPayment(res.data?.data || payment);
    } catch (err) {
      setError(err.message || 'Bestätigung fehlgeschlagen.');
    } finally {
      setSyncing(false);
    }
  };

  // ── Render ──────────────────────────────────────────────
  if (loading) return <Loader text="Zahlungsstatus wird geladen…" />;
  if (error && !payment) return <ErrorMessage message={error} />;
  if (!payment) return null;

  const meta = STATUS_META[payment.status] || { label: payment.status, cls: '' };
  const isTerminal = TERMINAL_STATUSES.includes(payment.status);
  const hasPaymentUrl = !!payment.payment_url;

  return (
    <div className="pstat">
      <h3 className="pstat__title">Zahlungsstatus</h3>

      {/* ── Status badge ────────────────────────────────── */}
      <div className="pstat__status-row">
        <span className={`pstat__badge ${meta.cls}`}>{meta.label}</span>
        <span className="pstat__amount">
          {Number(payment.amount).toFixed(2)}&nbsp;{payment.currency || 'EUR'}
        </span>
      </div>

      {/* ── Provider info ───────────────────────────────── */}
      <div className="pstat__info">
        <div className="pstat__info-row">
          <span>Anbieter</span>
          <span>{payment.provider}</span>
        </div>
        {payment.provider_reference && (
          <div className="pstat__info-row">
            <span>Referenz</span>
            <span className="pstat__mono">{payment.provider_reference}</span>
          </div>
        )}
      </div>

      {/* ── Payment URL (mock redirect) ─────────────────── */}
      {hasPaymentUrl && !isTerminal && (
        <a
          href={payment.payment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="pstat__pay-link"
        >
          Jetzt bezahlen →
        </a>
      )}

      {/* ── Actions ─────────────────────────────────────── */}
      {!isTerminal && (
        <div className="pstat__actions">
          <button
            type="button"
            className="pstat__btn pstat__btn--sync"
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'Synchronisiere…' : 'Status aktualisieren'}
          </button>
          <button
            type="button"
            className="pstat__btn pstat__btn--confirm"
            onClick={handleConfirm}
            disabled={syncing}
          >
            Zahlung bestätigen (Test)
          </button>
        </div>
      )}

      {/* ── Success / failure message ───────────────────── */}
      {payment.status === 'paid' && (
        <p className="pstat__msg pstat__msg--success">Zahlung erfolgreich abgeschlossen!</p>
      )}
      {payment.status === 'failed' && (
        <p className="pstat__msg pstat__msg--danger">Zahlung fehlgeschlagen. Bitte versuche es erneut.</p>
      )}

      {/* ── Transaction history ─────────────────────────── */}
      {payment.transactions?.length > 0 && (
        <div className="pstat__tx">
          <h4 className="pstat__tx-title">Transaktionsverlauf</h4>
          <div className="pstat__tx-list">
            {payment.transactions.map((tx) => (
              <div key={tx.id} className="pstat__tx-row">
                <span className="pstat__tx-type">{tx.transaction_type}</span>
                <span className={`pstat__badge pstat__badge--sm ${STATUS_META[tx.status]?.cls || ''}`}>
                  {tx.status}
                </span>
                {tx.amount && (
                  <span className="pstat__tx-amount">{Number(tx.amount).toFixed(2)} EUR</span>
                )}
                <span className="pstat__tx-date">{formatDT(tx.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}
    </div>
  );
}

function formatDT(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}