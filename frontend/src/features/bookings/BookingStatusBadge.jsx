import './BookingStatusBadge.css';

const STATUS_CONFIG = {
  draft:                { label: 'Entwurf',               cls: 'bstatus--draft' },
  pending_owner_review: { label: 'Wartet auf Vermieter',  cls: 'bstatus--pending' },
  pending_payment:      { label: 'Zahlung ausstehend',    cls: 'bstatus--payment' },
  pending_contract:     { label: 'Vertrag ausstehend',    cls: 'bstatus--contract' },
  confirmed:            { label: 'Bestätigt',             cls: 'bstatus--confirmed' },
  rejected:             { label: 'Abgelehnt',             cls: 'bstatus--rejected' },
  cancelled:            { label: 'Storniert',             cls: 'bstatus--cancelled' },
  completed:            { label: 'Abgeschlossen',         cls: 'bstatus--completed' },
};

export default function BookingStatusBadge({ status, size = 'md', label }) {
  const config = STATUS_CONFIG[status] || { label: status, cls: '' };

  return (
    <span className={`bstatus bstatus--${size} ${config.cls}`}>
      {label || config.label}
    </span>
  );
}
