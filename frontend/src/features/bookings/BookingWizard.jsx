import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import VehiclesApi from '../vehicles/VehiclesApi';
import BookingsApi from './BookingsApi';
import BookingCalendar from './BookingCalendar';
import BookingForm from './BookingForm';
import BookingSummary from './BookingSummary';
import BookingPriceBox from './BookingPriceBox';
import SwapOfferForm from '../swaps/SwapOfferForm';
import PaymentMethodSelector from '../payments/PaymentMethodSelector';
import PaymentStatus from '../payments/PaymentStatus';
import PaymentsApi from '../payments/PaymentsApi';
import Loader from '../../components/common/Loader';
import ErrorMessage from '../../components/common/ErrorMessage';
import './BookingWizard.css';

const ALL_STEPS = [
  { key: 'dates', label: 'Zeitraum' },
  { key: 'review', label: 'Buchungsdaten' },
  { key: 'swap', label: 'Tauschoption' },
  { key: 'payment', label: 'Zahlung' },
  { key: 'summary', label: 'Übersicht' },
];

const INITIAL_DATA = {
  start_date: '',
  end_date: '',
  customer_notes: '',
  swap_enabled: false,
  swap_type: 'vehicle',
  swap_title: '',
  swap_description: '',
  swap_estimated_value: '',
  swap_available_from: '',
  swap_available_to: '',
  payment_method: '',
};

export default function BookingWizard() {
  const { id: vehicleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const passedDates = location.state;

  // ── Vehicle data ────────────────────────────────────────
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [vehicleError, setVehicleError] = useState(null);

  // ── Wizard state ────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [data, setData] = useState(() => {
    if (passedDates?.start_date && passedDates?.end_date) {
      return { ...INITIAL_DATA, start_date: passedDates.start_date, end_date: passedDates.end_date };
    }
    return INITIAL_DATA;
  });
  const [errors, setErrors] = useState({});

  // ── Pricing ─────────────────────────────────────────────
  const [pricing, setPricing] = useState(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // ── Submission ──────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // ── Payment state ───────────────────────────────────────
  const [paymentId, setPaymentId] = useState(null);
  const [bookingId, setBookingId] = useState(null);

  // ── Calendar selection state (shared with step 1) ──────
  const [calendarSelection, setCalendarSelection] = useState(null);

  // ── Dynamic steps: skip swap if owner hasn't unlocked, skip payment when swap is enabled ───
  const ownerSwapUnlocked = vehicle?.owner_swap_unlocked === '1' || vehicle?.owner_swap_unlocked === 1;
  const steps = (() => {
    let s = ALL_STEPS;
    if (!ownerSwapUnlocked) s = s.filter((st) => st.key !== 'swap');
    if (data.swap_enabled) s = s.filter((st) => st.key !== 'payment');
    return s;
  })();

  const currentStepKey = steps[step - 1]?.key;

  // ── Load vehicle ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setVehicleLoading(true);
    VehiclesApi.get(vehicleId)
      .then((res) => {
        if (!cancelled) setVehicle(res.data?.data?.vehicle || res.data?.data || null);
      })
      .catch((err) => {
        if (!cancelled) setVehicleError(err.message || 'Fahrzeug konnte nicht geladen werden.');
      })
      .finally(() => {
        if (!cancelled) setVehicleLoading(false);
      });
    return () => { cancelled = true; };
  }, [vehicleId]);

  // ── Fetch pricing when dates change ─────────────────────
  useEffect(() => {
    if (!data.start_date || !data.end_date) {
      setPricing(null);
      return;
    }
    let cancelled = false;
    setPricingLoading(true);
    BookingsApi.pricePreview(vehicleId, data.start_date, data.end_date)
      .then((res) => {
        if (!cancelled) setPricing(res.data?.data || null);
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      })
      .finally(() => {
        if (!cancelled) setPricingLoading(false);
      });
    return () => { cancelled = true; };
  }, [vehicleId, data.start_date, data.end_date]);

  // ── Calendar selection handler ──────────────────────────
  const handleSelectionChange = useCallback((sel) => {
    setCalendarSelection(sel);
    if (sel?.startDate && sel?.endDate) {
      setData((prev) => ({
        ...prev,
        start_date: sel.startDate,
        end_date: sel.endDate,
      }));
    }
  }, []);

  // ── Field change handler ────────────────────────────────
  const handleChange = useCallback((field, value) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      // When swap is toggled, reset payment_method accordingly
      if (field === 'swap_enabled') {
        next.payment_method = value ? 'none' : '';
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ── Validation ──────────────────────────────────────────
  const validateStep = (stepNum) => {
    const errs = {};
    const stepKey = steps[stepNum - 1]?.key;

    if (stepKey === 'dates') {
      if (!data.start_date) errs.start_date = 'Startdatum ist erforderlich.';
      if (!data.end_date) errs.end_date = 'Enddatum ist erforderlich.';
      if (data.start_date && data.end_date && calendarSelection?.available === false) {
        errs.start_date = 'Der gewählte Zeitraum ist nicht verfügbar.';
      }
    }

    if (stepKey === 'swap' && data.swap_enabled) {
      if (!data.swap_type) errs.swap_type = 'Bitte wähle eine Art.';
      if (!data.swap_title?.trim()) errs.swap_title = 'Titel ist erforderlich.';
      if (!data.swap_description?.trim()) errs.swap_description = 'Beschreibung ist erforderlich.';
      const val = parseFloat(data.swap_estimated_value);
      if (!data.swap_estimated_value || isNaN(val) || val <= 0) {
        errs.swap_estimated_value = 'Bitte gib einen gültigen Wert > 0 an.';
      }
      if (data.swap_available_from && data.swap_available_to && data.swap_available_from > data.swap_available_to) {
        errs.swap_available_to = 'Enddatum darf nicht vor dem Startdatum liegen.';
      }
    }

    if (stepKey === 'payment') {
      if (!data.payment_method) errs.payment_method = 'Bitte wähle eine Zahlungsart.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Navigation ──────────────────────────────────────────
  const nextStep = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length));
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Submission ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        vehicle_id: parseInt(vehicleId, 10),
        start_date: data.start_date,
        end_date: data.end_date,
        payment_method: data.swap_enabled ? 'none' : data.payment_method,
        customer_notes: data.customer_notes || undefined,
      };

      if (data.swap_enabled) {
        payload.swap_offer = {
          type: data.swap_type || 'vehicle',
          title: data.swap_title,
          description: data.swap_description,
          estimated_value: parseFloat(data.swap_estimated_value),
          available_from: data.swap_available_from || undefined,
          available_to: data.swap_available_to || undefined,
        };
      }

      const res = await BookingsApi.create(payload);
      const created = res.data?.data || {};
      const newBookingId = created.booking_id || created.id;
      setBookingId(newBookingId);

      const bookingStatus = created.status;

      // With swap: always goes to owner review first — no payment initiation
      if (data.swap_enabled) {
        navigate('/my-bookings', {
          state: {
            success: `Buchung #${newBookingId} mit Tauschangebot erstellt! Der Vermieter wurde benachrichtigt und muss dein Angebot zuerst prüfen.`,
          },
        });
        return;
      }

      // Without swap: existing flow
      if (bookingStatus === 'pending_payment') {
        try {
          const payRes = await PaymentsApi.initiate(newBookingId, data.payment_method);
          const pId = payRes.data?.data?.id || payRes.data?.data?.payment_id;
          setPaymentId(pId);
          setStep(steps.length + 1); // move to payment status view
        } catch (payErr) {
          navigate('/my-bookings', {
            state: {
              success: `Buchung #${newBookingId} erstellt.`,
              warning: 'Zahlung konnte nicht initiiert werden. Bitte später erneut versuchen.',
            },
          });
        }
      } else {
        navigate('/my-bookings', {
          state: {
            success: `Buchung #${newBookingId} erstellt! Der Vermieter wurde benachrichtigt. Du kannst bezahlen, sobald die Buchung bestätigt wurde.`,
          },
        });
      }
    } catch (err) {
      setSubmitError(err.message || 'Buchung konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Payment callbacks ───────────────────────────────────
  const handlePaymentPaid = useCallback(() => {
    navigate('/my-bookings', {
      state: { success: `Buchung #${bookingId} – Zahlung erfolgreich!` },
    });
  }, [bookingId, navigate]);

  const handlePaymentFailed = useCallback(() => {
    // Stay on page so user can retry
  }, []);

  // ── Loading / error states ──────────────────────────────
  if (vehicleLoading) return <Loader size="lg" text="Fahrzeug wird geladen…" />;
  if (vehicleError) return <ErrorMessage message={vehicleError} />;
  if (!vehicle) return <ErrorMessage message="Fahrzeug nicht gefunden." />;

  return (
    <div className="bwiz">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bwiz__header">
        <h2 className="bwiz__title">{vehicle.title} buchen</h2>
      </div>

      {/* ── Progress bar ───────────────────────────────── */}
      <div className="bwiz__progress">
        {steps.map((s, i) => {
          const num = i + 1;
          const isActive = num === step;
          const isDone = num < step;
          return (
            <div
              key={s.key}
              className={`bwiz__step ${isActive ? 'bwiz__step--active' : ''} ${isDone ? 'bwiz__step--done' : ''}`}
            >
              <span className="bwiz__step-num">{isDone ? '✓' : num}</span>
              <span className="bwiz__step-label">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ── Content area ───────────────────────────────── */}
      <div className="bwiz__body">
        <div className="bwiz__main">
          {/* Step: Calendar */}
          {currentStepKey === 'dates' && (
            <div className="bwiz__step-content">
              <h3 className="bform__step-title">Zeitraum wählen</h3>
              <p className="bform__step-desc">Wähle Start- und Enddatum im Kalender.</p>
              <BookingCalendar
                vehicleId={vehicleId}
                minRentalDays={vehicle.min_rental_days || 1}
                maxRentalDays={vehicle.max_rental_days || null}
                onSelectionChange={handleSelectionChange}
                initialSelection={
                  passedDates?.start_date && passedDates?.end_date
                    ? { startDate: passedDates.start_date, endDate: passedDates.end_date }
                    : null
                }
              />
              {errors.start_date && <p className="bform__error">{errors.start_date}</p>}
              {errors.end_date && <p className="bform__error">{errors.end_date}</p>}
            </div>
          )}

          {/* Step: Review */}
          {currentStepKey === 'review' && (
            <BookingForm
              step={step}
              data={data}
              errors={errors}
              onChange={handleChange}
              vehicle={vehicle}
            />
          )}

          {/* Step: Payment method selection */}
          {currentStepKey === 'payment' && (
            <PaymentMethodSelector
              value={data.payment_method}
              onChange={(method) => handleChange('payment_method', method)}
              error={errors.payment_method}
              disabled={submitting}
            />
          )}

          {/* Post-submit: Payment status */}
          {step === steps.length + 1 && paymentId && (
            <PaymentStatus
              paymentId={paymentId}
              onPaid={handlePaymentPaid}
              onFailed={handlePaymentFailed}
            />
          )}

          {/* Step: Swap offer */}
          {currentStepKey === 'swap' && (
            <SwapOfferForm
              data={data}
              errors={errors}
              onChange={handleChange}
            />
          )}

          {/* Step: Summary */}
          {currentStepKey === 'summary' && (
            <BookingSummary
              data={data}
              vehicle={vehicle}
              pricing={pricing}
              pricingLoading={pricingLoading}
            />
          )}

          {submitError && <ErrorMessage message={submitError} />}

          {/* ── Navigation buttons ─────────────────────── */}
          {step <= steps.length && (
            <div className="bwiz__nav">
              {step > 1 && (
                <button
                  type="button"
                  className="bwiz__btn bwiz__btn--back"
                  onClick={prevStep}
                  disabled={submitting}
                >
                  Zurück
                </button>
              )}

              <div className="bwiz__nav-spacer" />

              {step < steps.length ? (
                <button
                  type="button"
                  className="bwiz__btn bwiz__btn--next"
                  onClick={nextStep}
                >
                  Weiter
                </button>
              ) : (
                <button
                  type="button"
                  className="bwiz__btn bwiz__btn--submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Wird gesendet…' : (data.swap_enabled ? 'Tauschangebot senden' : 'Buchung absenden')}
                </button>
              )}
            </div>
          )}

          {/* Post-submit: link to bookings */}
          {step > steps.length && (
            <div className="bwiz__nav">
              <div className="bwiz__nav-spacer" />
              <button
                type="button"
                className="bwiz__btn bwiz__btn--next"
                onClick={() => navigate('/my-bookings')}
              >
                Zu meinen Buchungen
              </button>
            </div>
          )}
        </div>

        {/* ── Sidebar: Price box ───────────────────────── */}
        <aside className="bwiz__sidebar">
          <BookingPriceBox
            pricing={pricing}
            loading={pricingLoading}
            vehicle={vehicle}
            startDate={data.start_date}
            endDate={data.end_date}
          />
        </aside>
      </div>
    </div>
  );
}