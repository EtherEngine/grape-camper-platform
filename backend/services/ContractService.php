<?php

declare(strict_types=1);

namespace Services;

use Core\Auth;
use Core\Database;
use Repositories\BookingRepository;
use Repositories\BookingStatusHistoryRepository;
use Repositories\ContractRepository;
use RuntimeException;

class ContractService
{
    private Database $db;
    private ContractRepository $contracts;
    private BookingRepository $bookings;
    private BookingStatusHistoryRepository $history;

    private const TRANSITIONS = [
        'pending_owner'      => ['pending_renter', 'cancelled'],
        'pending_renter'     => ['pending_signatures', 'cancelled'],
        'pending_signatures' => ['signed', 'cancelled'],
        'signed'             => [],
        'cancelled'          => [],
    ];

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->contracts = new ContractRepository();
        $this->bookings = new BookingRepository();
        $this->history = new BookingStatusHistoryRepository();
    }

    // ── Create contract (called automatically) ─────────────

    /**
     * Auto-create a contract when booking transitions to pending_contract.
     */
    public function createForBooking(int $bookingId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }

        // Check if contract already exists
        $existing = $this->contracts->findByBookingId($bookingId);
        if ($existing) {
            return $existing;
        }

        $template = $this->generateTemplate($booking);

        $this->contracts->create([
            'booking_id'       => $bookingId,
            'status'           => 'pending_owner',
            'contract_text'    => $template,
            'insurance_type'   => 'private',
            'insurance_details' => null,
        ]);

        return $this->contracts->findByBookingId($bookingId);
    }

    // ── Get contract ───────────────────────────────────────

    /**
     * Get contract for a booking with authorization.
     */
    public function getForBooking(int $bookingId, int $userId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        $this->authorizeAccess($booking, $userId);

        $contract = $this->contracts->findByBookingId($bookingId);
        if (!$contract) {
            // Auto-create contract for bookings that are in a contract-worthy state
            $eligible = ['pending_contract', 'confirmed', 'completed'];
            $isPaid = ($booking['payment_status'] ?? '') === 'paid';
            if (in_array($booking['status'], $eligible, true) && $isPaid) {
                $contract = $this->createForBooking($bookingId);
            } else {
                throw new RuntimeException('Kein Mietvertrag für diese Buchung vorhanden.', 404);
            }
        }

        // Hide pickup/return locations from renter until contract is signed
        $isRenter = (int) $booking['user_id'] === $userId;
        if ($isRenter && $contract['status'] !== 'signed') {
            $contract['pickup_address'] = null;
            $contract['pickup_lat'] = null;
            $contract['pickup_lng'] = null;
            $contract['pickup_notes'] = null;
            $contract['key_handover_details'] = null;
            $contract['return_address'] = null;
            $contract['return_lat'] = null;
            $contract['return_lng'] = null;
            $contract['return_notes'] = null;
        }

        return $contract;
    }

    // ── Owner updates contract ─────────────────────────────

    /**
     * Owner edits contract text, insurance, locations.
     */
    public function ownerUpdate(int $bookingId, int $ownerId, array $data): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        $this->authorizeOwner($booking, $ownerId);

        $contract = $this->contracts->findByBookingId($bookingId);
        if (!$contract) {
            throw new RuntimeException('Kein Mietvertrag vorhanden.', 404);
        }
        if ($contract['status'] !== 'pending_owner') {
            throw new RuntimeException('Der Vertrag kann in diesem Status nicht mehr bearbeitet werden.', 422);
        }

        $this->contracts->updateOwnerFields($bookingId, $data);

        return $this->contracts->findByBookingId($bookingId);
    }

    // ── Owner sends contract to renter ─────────────────────

    /**
     * Owner finished editing → send to renter for filling.
     */
    public function sendToRenter(int $bookingId, int $ownerId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        $this->authorizeOwner($booking, $ownerId);

        $contract = $this->contracts->findByBookingId($bookingId);
        if (!$contract) {
            throw new RuntimeException('Kein Mietvertrag vorhanden.', 404);
        }

        // Validate required fields before sending
        if (empty($contract['pickup_address'])) {
            throw new RuntimeException('Bitte geben Sie eine Abholadresse an.', 422);
        }
        if (empty($contract['return_address'])) {
            throw new RuntimeException('Bitte geben Sie eine Rückgabeadresse an.', 422);
        }

        $affected = $this->contracts->updateStatus($bookingId, 'pending_renter', 'pending_owner');
        if ($affected === 0) {
            throw new RuntimeException('Statuswechsel fehlgeschlagen.', 409);
        }

        return $this->contracts->findByBookingId($bookingId);
    }

    // ── Renter fills personal details ──────────────────────

    /**
     * Renter submits personal data → contract moves to pending_signatures.
     */
    public function renterFill(int $bookingId, int $renterId, array $data): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        if ((int) $booking['user_id'] !== $renterId) {
            throw new RuntimeException('Nur der Mieter kann seine Daten ausfüllen.', 403);
        }

        $contract = $this->contracts->findByBookingId($bookingId);
        if (!$contract) {
            throw new RuntimeException('Kein Mietvertrag vorhanden.', 404);
        }
        if ($contract['status'] !== 'pending_renter') {
            throw new RuntimeException('Der Vertrag erwartet derzeit keine Mieterdaten.', 422);
        }

        $this->db->beginTransaction();
        try {
            $this->contracts->updateRenterFields($bookingId, $data);
            $this->contracts->updateStatus($bookingId, 'pending_signatures', 'pending_renter');
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Daten konnten nicht gespeichert werden.', 500);
        }

        return $this->contracts->findByBookingId($bookingId);
    }

    // ── Sign contract ──────────────────────────────────────

    /**
     * Either party signs. When both have signed → contract = signed, booking = confirmed.
     */
    public function sign(int $bookingId, int $userId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        $this->authorizeAccess($booking, $userId);

        $contract = $this->contracts->findByBookingId($bookingId);
        if (!$contract) {
            throw new RuntimeException('Kein Mietvertrag vorhanden.', 404);
        }
        if ($contract['status'] !== 'pending_signatures') {
            throw new RuntimeException('Der Vertrag ist nicht bereit zur Unterschrift.', 422);
        }

        $isOwner = (int) $booking['owner_id'] === $userId;
        $isRenter = (int) $booking['user_id'] === $userId;

        $this->db->beginTransaction();
        try {
            if ($isOwner && $contract['owner_signed_at'] === null) {
                $this->contracts->signOwner($bookingId);
            } elseif ($isRenter && $contract['renter_signed_at'] === null) {
                $this->contracts->signRenter($bookingId);
            } else {
                throw new RuntimeException('Sie haben bereits unterschrieben.', 422);
            }

            // Re-fetch to check if both have signed
            $updated = $this->contracts->findByBookingId($bookingId);

            if ($updated['owner_signed_at'] !== null && $updated['renter_signed_at'] !== null) {
                // Both signed → finalize
                $this->contracts->updateStatus($bookingId, 'signed', 'pending_signatures');

                // Transition booking to confirmed
                $affected = $this->bookings->updateStatus($bookingId, 'confirmed', 'pending_contract');
                if ($affected > 0) {
                    $this->history->create(
                        $bookingId,
                        'pending_contract',
                        'confirmed',
                        $userId,
                        'Mietvertrag von beiden Parteien unterschrieben – Buchung bestätigt.'
                    );
                }
            }

            $this->db->commit();
        } catch (RuntimeException $e) {
            $this->db->rollback();
            throw $e;
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Unterschrift fehlgeschlagen.', 500);
        }

        return $this->contracts->findByBookingId($bookingId);
    }

    // ── Contract template ──────────────────────────────────

    /**
     * Generate a pre-filled German rental contract template.
     */
    private function generateTemplate(array $booking): string
    {
        $ownerName = trim(($booking['owner_first_name'] ?? '') . ' ' . ($booking['owner_last_name'] ?? ''));
        $renterName = trim(($booking['renter_first_name'] ?? '') . ' ' . ($booking['renter_last_name'] ?? ''));
        $vehicle = $booking['vehicle_title'] ?? 'Fahrzeug';
        $plate = $booking['license_plate'] ?? '_______________';
        $startDate = $this->formatGerman($booking['start_date'] ?? '');
        $endDate = $this->formatGerman($booking['end_date'] ?? '');
        $days = $booking['days_count'] ?? '___';
        $totalPrice = number_format((float) ($booking['total_price'] ?? 0), 2, ',', '.');
        $currency = $booking['currency'] ?? 'EUR';
        $deposit = number_format((float) ($booking['deposit_amount'] ?? 0), 2, ',', '.');

        return <<<TEMPLATE
MIETVERTRAG FÜR WOHNMOBILE / CAMPINGFAHRZEUGE

──────────────────────────────────────────────

§ 1 VERTRAGSPARTEIEN

Vermieter:
Name: {$ownerName}
(Anschrift wird im Vertrag ergänzt)

Mieter:
Name: {$renterName}
(Persönliche Daten werden vom Mieter ausgefüllt)

──────────────────────────────────────────────

§ 2 MIETGEGENSTAND

Fahrzeug: {$vehicle}
Kennzeichen: {$plate}
Der Vermieter überlässt dem Mieter das oben beschriebene Fahrzeug für den vereinbarten Zeitraum zur Nutzung.

──────────────────────────────────────────────

§ 3 MIETZEITRAUM

Beginn: {$startDate}
Ende: {$endDate}
Dauer: {$days} Tag(e)

Die Übergabe erfolgt am vereinbarten Übergabeort zum Mietbeginn. Die Rückgabe hat spätestens am letzten Miettag bis zur vereinbarten Uhrzeit am Rückgabeort zu erfolgen.

──────────────────────────────────────────────

§ 4 MIETPREIS UND ZAHLUNGSBEDINGUNGEN

Gesamtmietpreis: {$totalPrice} {$currency}
Kaution: {$deposit} {$currency}

Die Kaution wird vor Übergabe des Fahrzeugs fällig und nach ordnungsgemäßer Rückgabe erstattet. Abzüge für Schäden oder fehlende Ausstattung sind zulässig.

──────────────────────────────────────────────

§ 5 VERSICHERUNG

□ Privat (Haftpflichtversicherung des Vermieters)
□ Gewerblich (separate Gewerbeschein-Versicherung erforderlich)

Der Vermieter bestätigt, dass für das Fahrzeug eine gültige Kfz-Haftpflichtversicherung besteht. Vollkasko- und Teilkaskoversicherungen sind gesondert zu vereinbaren.

Hinweis für private Nutzung:
- Die bestehende Kfz-Haftpflichtversicherung des Fahrzeugs gilt auch für den Mieter
- Empfehlung: Zusätzliche Vollkasko mit angemessener Selbstbeteiligung

Hinweis für gewerbliche Nutzung:
- Bei gewerblicher Nutzung muss der Mieter über einen gültigen Gewerbeschein verfügen
- Eine erweiterte gewerbliche Kfz-Versicherung kann erforderlich sein
- Der Mieter ist verpflichtet, seine Versicherung über die gewerbliche Nutzung zu informieren

──────────────────────────────────────────────

§ 6 PFLICHTEN DES MIETERS

a) Das Fahrzeug ist pfleglich und sachgemäß zu behandeln.
b) Das Fahrzeug darf nur von Personen geführt werden, die im Besitz einer gültigen Fahrerlaubnis der erforderlichen Klasse sind.
c) Schäden am Fahrzeug sind dem Vermieter unverzüglich mitzuteilen.
d) Der Mieter haftet für alle während der Mietzeit entstandenen Verkehrsverstöße.
e) Das Fahrzeug ist vollgetankt und in gereinigtem Zustand zurückzugeben, sofern nicht anders vereinbart.
f) Rauchen im Fahrzeug ist nur gestattet, wenn ausdrücklich vereinbart.
g) Haustiere sind nur mit ausdrücklicher Genehmigung des Vermieters erlaubt.

──────────────────────────────────────────────

§ 7 HAFTUNG UND SCHADENSREGULIERUNG

a) Der Mieter haftet für alle Schäden, die während der Mietzeit am Fahrzeug entstehen, soweit sie nicht auf normalen Verschleiß zurückzuführen sind.
b) Die Selbstbeteiligung im Schadensfall beträgt den Kautionsbetrag, sofern nicht anders vereinbart.
c) Bei grober Fahrlässigkeit oder Vorsatz entfällt der Versicherungsschutz.

──────────────────────────────────────────────

§ 8 STORNIERUNG UND VORZEITIGE RÜCKGABE

Eine Stornierung ist nach den Bedingungen der Plattform möglich. Bei vorzeitiger Rückgabe besteht kein Anspruch auf Rückerstattung des Mietpreises.

──────────────────────────────────────────────

§ 9 SCHLUSSBESTIMMUNGEN

a) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.
b) Sollte eine Bestimmung unwirksam sein, bleibt der Vertrag im Übrigen gültig.
c) Es gilt das Recht der Bundesrepublik Deutschland.
d) Gerichtsstand ist der Wohnsitz des Vermieters.

──────────────────────────────────────────────

Dieser Vertrag wird elektronisch über die GRAPE-Plattform geschlossen. Die elektronische Bestätigung beider Parteien gilt als rechtsverbindliche Unterschrift.
TEMPLATE;
    }

    private function formatGerman(?string $dateStr): string
    {
        if (!$dateStr) {
            return '_______________';
        }
        $parts = explode('-', $dateStr);
        if (count($parts) !== 3) {
            return $dateStr;
        }
        return (int) $parts[2] . '.' . (int) $parts[1] . '.' . $parts[0];
    }

    // ── Authorization helpers ──────────────────────────────

    private function authorizeAccess(array $booking, int $userId): void
    {
        $isRenter = (int) $booking['user_id'] === $userId;
        $isOwner = (int) $booking['owner_id'] === $userId;
        $isAdmin = Auth::check() && Auth::is('admin');

        if (!$isRenter && !$isOwner && !$isAdmin) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }
    }

    private function authorizeOwner(array $booking, int $userId): void
    {
        if ((int) $booking['owner_id'] !== $userId) {
            $isAdmin = Auth::check() && Auth::is('admin');
            if (!$isAdmin) {
                throw new RuntimeException('Nur der Vermieter kann diese Aktion durchführen.', 403);
            }
        }
    }
}
