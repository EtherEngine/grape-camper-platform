import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SwapsApi from '../swaps/SwapsApi';
import './SwapUnlockProgress.css';

export default function SwapUnlockProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeSuccess, setCodeSuccess] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await SwapsApi.getUnlockProgress();
      setProgress(res.data?.data || res.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    const raw = code.trim().toUpperCase();
    const match = raw.match(/^(SWAP-[A-Z0-9]{5}-[A-Z0-9]{5})/);
    const cleaned = match ? match[1] : raw;
    if (!cleaned) return;
    setCodeError('');
    setCodeSuccess('');
    setRedeeming(true);
    try {
      const res = await SwapsApi.redeemCode(cleaned);
      setCodeSuccess(res.data?.message || 'Freigeschaltet!');
      setCode('');
      fetchProgress();
    } catch (err) {
      setCodeError(err.message || err.response?.data?.message || 'Fehler beim Einlösen.');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading || !progress) return null;

  if (progress.unlocked) {
    return (
      <div className="swap-unlock swap-unlock--done">
        <div className="swap-unlock__header">
          <span className="swap-unlock__icon">✓</span>
          <div>
            <h3 className="swap-unlock__title">Tauschoption freigeschaltet</h3>
            <p className="swap-unlock__subtitle">Du kannst Tauschangebote erstellen und verwalten.</p>
          </div>
        </div>
        <Link to="/owner/swaps" className="swap-unlock__cta">Tauschangebote →</Link>
      </div>
    );
  }

  const rev = progress.revenue;
  const bk = progress.bookings;

  return (
    <div className="swap-unlock">
      <div className="swap-unlock__header">
        <span className="swap-unlock__icon swap-unlock__icon--locked">🔒</span>
        <div>
          <h3 className="swap-unlock__title">Tauschoption freischalten</h3>
          <p className="swap-unlock__subtitle">
            Erfülle eine der Bedingungen, um die Tauschoption zu aktivieren.
          </p>
        </div>
      </div>

      <div className="swap-unlock__tracks">
        {/* Track 1: Revenue */}
        <div className={`swap-unlock__track${rev.complete ? ' swap-unlock__track--done' : ''}`}>
          <div className="swap-unlock__track-header">
            <span className="swap-unlock__track-label">Einnahmen</span>
            <span className="swap-unlock__track-value">
              {rev.current.toLocaleString('de-DE', { minimumFractionDigits: 0 })} € / {rev.target.toLocaleString('de-DE')} €
            </span>
          </div>
          <div className="swap-unlock__bar">
            <div
              className="swap-unlock__bar-fill"
              style={{ width: `${rev.percent}%` }}
            />
          </div>
          <p className="swap-unlock__track-hint">
            {rev.complete ? 'Bedingung erfüllt' : `Noch ${(rev.target - rev.current).toLocaleString('de-DE', { minimumFractionDigits: 0 })} € bis zur Freischaltung`}
          </p>
        </div>

        <div className="swap-unlock__or">oder</div>

        {/* Track 2: Bookings */}
        <div className={`swap-unlock__track${bk.complete ? ' swap-unlock__track--done' : ''}`}>
          <div className="swap-unlock__track-header">
            <span className="swap-unlock__track-label">Buchungen (min. {bk.min_days} Tage)</span>
            <span className="swap-unlock__track-value">{bk.current} / {bk.target}</span>
          </div>
          <div className="swap-unlock__bar">
            <div
              className="swap-unlock__bar-fill"
              style={{ width: `${bk.percent}%` }}
            />
          </div>
          <p className="swap-unlock__track-hint">
            {bk.complete ? 'Bedingung erfüllt' : `Noch ${bk.target - bk.current} abgeschlossene Buchung${bk.target - bk.current !== 1 ? 'en' : ''}`}
          </p>
        </div>
      </div>

      {/* Code redemption – collapsible */}
      <div className="swap-unlock__code">
        <button
          type="button"
          className="swap-unlock__code-toggle"
          onClick={() => setCodeOpen((v) => !v)}
        >
          <span className={`swap-unlock__code-chevron${codeOpen ? ' swap-unlock__code-chevron--open' : ''}`}>&#9656;</span>
          Freischalt-Code einlösen
        </button>
        {codeOpen && (
          <form className="swap-unlock__code-form" onSubmit={handleRedeem}>
            <div className="swap-unlock__code-row">
              <input
                type="text"
                className="swap-unlock__code-input"
                placeholder="SWAP-XXXXX-XXXXX"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCodeError(''); }}
                maxLength={20}
              />
              <button
                type="submit"
                className="swap-unlock__code-btn"
                disabled={redeeming || !code.trim()}
              >
                {redeeming ? '…' : 'Einlösen'}
              </button>
            </div>
            {codeError && <p className="swap-unlock__code-msg swap-unlock__code-msg--error">{codeError}</p>}
            {codeSuccess && <p className="swap-unlock__code-msg swap-unlock__code-msg--success">{codeSuccess}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
