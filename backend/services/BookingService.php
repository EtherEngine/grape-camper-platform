<?php

declare(strict_types=1);

namespace Services;

use Core\Auth;
use Core\Database;
use Repositories\BookingRepository;
use Repositories\BookingStatusHistoryRepository;
use Repositories\PaymentRepository;
use Repositories\SwapOfferRepository;
use Repositories\VehicleRepository;
use Services\ContractService;
use RuntimeException;

class BookingService
{
    private Database $db;
    private BookingRepository $bookings;
    private BookingStatusHistoryRepository $history;
    private PaymentRepository $payments;
    private SwapOfferRepository $swapOffers;
    private VehicleRepository $vehicles;
    private AvailabilityService $availability;
    private PricingService $pricing;

    /**
     * Valid status transitions: current → [allowed next statuses].
     */
    private const TRANSITIONS = [
        'draft' => ['pending_owner_review', 'cancelled'],
        'pending_owner_review' => ['pending_payment', 'rejected', 'cancelled'],
        'pending_payment' => ['pending_contract', 'cancelled'],
        'pending_contract' => ['confirmed', 'cancelled'],
        'confirmed' => ['completed', 'cancelled'],
        'rejected' => [],
        'cancelled' => [],
        'completed' => [],
    ];

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->bookings = new BookingRepository();
        $this->history = new BookingStatusHistoryRepository();
        $this->payments = new PaymentRepository();
        $this->swapOffers = new SwapOfferRepository();
        $this->vehicles = new VehicleRepository();
        $this->availability = new AvailabilityService();
        $this->pricing = new PricingService();
    }

    // ── Create booking ─────────────────────────────────────

    /**
     * Create a new booking.
     *
     * 1. Validate vehicle exists & is active
     * 2. Check availability (no conflicts)
     * 3. Calculate price server-side
     * 4. Store booking + initial history entry
     *
     * Status starts as pending_owner_review (owner must approve first).
     */
    public function createBooking(int $vehicleId, int $userId, string $startDate, string $endDate, ?string $customerNotes = null, ?array $swapOffer = null, ?string $paymentMethod = null): array
    {
        // 1. Vehicle check
        $vehicle = $this->vehicles->findById($vehicleId);
        if ($vehicle === null) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        if ($vehicle['status'] !== 'active') {
            throw new RuntimeException('Fahrzeug ist nicht verfügbar.', 400);
        }

        // Prevent owner from booking their own vehicle
        if ((int) $vehicle['owner_id'] === $userId) {
            throw new RuntimeException('Sie können Ihr eigenes Fahrzeug nicht buchen.', 400);
        }

        // 2. Non-locking availability pre-check (fast fail before transaction)
        $availCheck = $this->availability->checkAvailability($vehicleId, $startDate, $endDate);
        if (!$availCheck['available']) {
            $messages = array_map(fn($c) => $c['message'], $availCheck['conflicts']);
            throw new RuntimeException(
                'Zeitraum nicht verfügbar: ' . implode('; ', $messages),
                409
            );
        }

        // 3. Price
        $price = $this->pricing->calculate($vehicleId, $startDate, $endDate);

        // 4. Determine initial status – always requires owner approval
        $initialStatus = 'pending_owner_review';

        // 5. Save in transaction with pessimistic lock to prevent double-booking
        $this->db->beginTransaction();
        try {
            // Re-check within transaction using FOR UPDATE row lock
            if ($this->bookings->hasConflictForUpdate($vehicleId, $startDate, $endDate)) {
                $this->db->rollback();
                throw new RuntimeException('Zeitraum wurde soeben von einer anderen Buchung belegt.', 409);
            }

            $bookingId = $this->bookings->create([
                'vehicle_id' => $vehicleId,
                'user_id' => $userId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days_count' => $price['days_count'],
                'base_price' => $price['base_price'],
                'cleaning_fee' => $price['cleaning_fee'],
                'service_fee' => $price['service_fee'],
                'deposit_amount' => $price['deposit_amount'],
                'total_price' => $price['total_price'],
                'currency' => $price['currency'],
                'status' => $initialStatus,
                'payment_status' => 'unpaid',
                'payment_method' => $paymentMethod ?? 'none',
                'customer_notes' => $customerNotes,
            ]);

            $this->history->create($bookingId, null, $initialStatus, $userId, 'Buchung erstellt.');

            // Create swap offer if provided (atomically within same transaction)
            if ($swapOffer !== null) {
                $this->swapOffers->create([
                    'user_id' => $userId,
                    'booking_id' => $bookingId,
                    'type' => $swapOffer['type'],
                    'title' => $swapOffer['title'],
                    'description' => $swapOffer['description'],
                    'estimated_value' => (float) $swapOffer['estimated_value'],
                    'currency' => $swapOffer['currency'] ?? 'EUR',
                    'available_from' => $swapOffer['available_from'] ?? null,
                    'available_to' => $swapOffer['available_to'] ?? null,
                ]);
            }

            $this->db->commit();
        } catch (RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Buchung konnte nicht gespeichert werden.', 500);
        }

        return $this->getBookingDetail($bookingId);
    }

    // ── Get single booking ─────────────────────────────────

    /**
     * Get booking detail with history.
     * Accessible by: renter, vehicle owner, admin.
     */
    public function getBookingDetail(int $bookingId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if ($booking === null) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }

        $booking['history'] = $this->history->findByBookingId($bookingId);

        return $booking;
    }

    /**
     * Get booking with authorization check.
     */
    public function getBookingForUser(int $bookingId, int $userId): array
    {
        $booking = $this->getBookingDetail($bookingId);
        $this->authorizeAccess($booking, $userId);

        return $booking;
    }

    // ── Status transitions ─────────────────────────────────

    /**
     * Owner approves booking → pending_payment.
     */
    public function approve(int $bookingId, int $ownerId): array
    {
        $booking = $this->getBookingDetail($bookingId);
        $this->authorizeOwner($booking, $ownerId);
        $this->transitionStatus($bookingId, $booking['status'], 'pending_payment', $ownerId, 'Vom Vermieter bestätigt.');

        return $this->getBookingDetail($bookingId);
    }

    /**
     * Owner rejects booking.
     */
    public function reject(int $bookingId, int $ownerId, ?string $reason = null): array
    {
        $booking = $this->getBookingDetail($bookingId);
        $this->authorizeOwner($booking, $ownerId);
        $this->validateTransition($booking['status'], 'rejected');

        $this->db->beginTransaction();
        try {
            $affected = $this->bookings->reject($bookingId, $reason, $booking['status']);
            if ($affected === 0) {
                throw new RuntimeException('Statuswechsel fehlgeschlagen — Buchung wurde zwischenzeitlich geändert.', 409);
            }
            $this->history->create($bookingId, $booking['status'], 'rejected', $ownerId, $reason ?? 'Vom Vermieter abgelehnt.');
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Statusänderung fehlgeschlagen.', 500);
        }

        return $this->getBookingDetail($bookingId);
    }

    /**
     * Confirm booking (payment received) → pending_contract.
     */
    public function confirm(int $bookingId, int $userId): array
    {
        $booking = $this->getBookingDetail($bookingId);
        $this->authorizeAccess($booking, $userId);

        if (($booking['payment_status'] ?? '') !== 'paid') {
            throw new RuntimeException('Zahlung muss zunächst bestätigt werden.', 422);
        }

        $this->transitionStatus($bookingId, $booking['status'], 'pending_contract', $userId, 'Zahlung eingegangen – Mietvertrag wird erstellt.');

        // Auto-create contract
        $contractService = new ContractService();
        $contractService->createForBooking($bookingId);

        return $this->getBookingDetail($bookingId);
    }

    /**
     * Cancel booking.
     * Both renter and owner can cancel (in allowed states).
     */
    public function cancel(int $bookingId, int $userId, ?string $comment = null): array
    {
        $booking = $this->getBookingDetail($bookingId);
        $this->authorizeAccess($booking, $userId);
        $this->transitionStatus($bookingId, $booking['status'], 'cancelled', $userId, $comment ?? 'Buchung storniert.');

        return $this->getBookingDetail($bookingId);
    }

    /**
     * Complete booking (trip done).
     * Owner or admin can mark as completed.
     */
    public function complete(int $bookingId, int $userId): array
    {
        $booking = $this->getBookingDetail($bookingId);

        // Only owner or admin can complete
        $isOwner = (int) $booking['owner_id'] === $userId;
        $isAdmin = Auth::check() && Auth::is('admin');
        if (!$isOwner && !$isAdmin) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        $this->transitionStatus($bookingId, $booking['status'], 'completed', $userId, 'Buchung abgeschlossen.');

        return $this->getBookingDetail($bookingId);
    }

    // ── Automated confirmation logic ───────────────────────

    /**
     * Evaluate whether a booking can be confirmed automatically.
     *
     * Called by PaymentService (when payment becomes "paid") and by
     * SwapService (when owner accepts a swap offer).
     *
     * Rules:
     *   • WITHOUT swap  → confirm when payment_status = paid
     *   • WITH swap     → confirm when:
     *       1. swap offer status = accepted (owner review done), AND
     *       2. remaining amount (total_price − swap_discount_value) is covered:
     *          a) remainder ≤ 0 → fully covered by swap, no payment needed
     *          b) remainder > 0 → payment_status must be "paid"
     *
     * Returns the (possibly updated) booking.
     */
    public function tryConfirmBooking(int $bookingId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }

        // Only act on bookings that are still awaiting confirmation
        if ($booking['status'] !== 'pending_payment') {
            return $this->getBookingDetail($bookingId);
        }

        $swapOffer = $this->swapOffers->findByBookingId($bookingId);
        $hasSwap = $swapOffer !== null;

        if (!$hasSwap) {
            // ── No swap: move to pending_contract when payment is paid ──
            if ($booking['payment_status'] === 'paid') {
                $this->transitionStatus(
                    $bookingId,
                    $booking['status'],
                    'pending_contract',
                    (int) $booking['user_id'],
                    'Zahlung eingegangen – Mietvertrag wird erstellt.'
                );
                $this->bookings->updatePaymentStatus($bookingId, 'paid');
                // Auto-create contract
                $contractService = new ContractService();
                $contractService->createForBooking($bookingId);
            }
        } else {
            // ── With swap: check owner review + remainder ──
            $swapAccepted = ($swapOffer['status'] === 'accepted');

            if (!$swapAccepted) {
                return $this->getBookingDetail($bookingId);
            }

            $totalPrice = (float) $booking['total_price'];
            $swapDiscount = (float) ($booking['swap_discount_value'] ?? 0.00);
            $remainder = round($totalPrice - $swapDiscount, 2);

            if ($remainder <= 0) {
                // Swap covers the full price – move to pending_contract
                $this->db->beginTransaction();
                try {
                    $this->bookings->updatePaymentStatus($bookingId, 'paid');
                    $this->transitionStatus(
                        $bookingId,
                        $booking['status'],
                        'pending_contract',
                        (int) $booking['user_id'],
                        "Tauschangebot deckt den Gesamtpreis – Mietvertrag wird erstellt."
                    );
                    // Auto-create contract
                    $contractService = new ContractService();
                    $contractService->createForBooking($bookingId);
                    $this->db->commit();
                } catch (\Throwable $e) {
                    $this->db->rollback();
                    throw new RuntimeException('Statusänderung fehlgeschlagen.', 500);
                }
            } else {
                // Remainder must be paid
                if ($booking['payment_status'] === 'paid') {
                    $this->transitionStatus(
                        $bookingId,
                        $booking['status'],
                        'pending_contract',
                        (int) $booking['user_id'],
                        "Tauschangebot akzeptiert + Restzahlung ({$remainder} {$booking['currency']}) eingegangen – Mietvertrag wird erstellt."
                    );
                    // Auto-create contract
                    $contractService = new ContractService();
                    $contractService->createForBooking($bookingId);
                }
                // else: payment still outstanding – wait
            }
        }

        return $this->getBookingDetail($bookingId);
    }

    // ── Listings ───────────────────────────────────────────

    /**
     * List bookings for the current renter.
     */
    public function listForRenter(int $userId, ?string $status, int $page, int $perPage): array
    {
        return $this->bookings->findByUserId($userId, $status, $page, $perPage);
    }

    /**
     * List bookings for the vehicle owner.
     */
    public function listForOwner(int $ownerId, ?string $status, int $page, int $perPage): array
    {
        return $this->bookings->findByOwnerId($ownerId, $status, $page, $perPage);
    }

    // ── Private helpers ────────────────────────────────────

    /**
     * Execute a status transition with validation + history logging.
     */
    private function transitionStatus(int $bookingId, string $currentStatus, string $newStatus, int $changedBy, string $comment): void
    {
        $this->validateTransition($currentStatus, $newStatus);

        $this->db->beginTransaction();
        try {
            $affected = $this->bookings->updateStatus($bookingId, $newStatus, $currentStatus);
            if ($affected === 0) {
                throw new RuntimeException(
                    'Statuswechsel fehlgeschlagen — Buchung wurde zwischenzeitlich geändert.',
                    409
                );
            }
            $this->history->create($bookingId, $currentStatus, $newStatus, $changedBy, $comment);
            $this->db->commit();
        } catch (RuntimeException $e) {
            $this->db->rollback();
            throw $e;
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Statusänderung fehlgeschlagen.', 500);
        }
    }

    /**
     * Validate that a status transition is allowed.
     */
    private function validateTransition(string $from, string $to): void
    {
        $allowed = self::TRANSITIONS[$from] ?? [];
        if (!in_array($to, $allowed, true)) {
            throw new RuntimeException(
                "Statuswechsel von '{$from}' zu '{$to}' ist nicht erlaubt.",
                422
            );
        }
    }

    /**
     * Check that the user is the renter, vehicle owner, or admin.
     */
    private function authorizeAccess(array $booking, int $userId): void
    {
        $isRenter = (int) $booking['user_id'] === $userId;
        $isOwner = (int) $booking['owner_id'] === $userId;
        $isAdmin = Auth::check() && Auth::is('admin');

        if (!$isRenter && !$isOwner && !$isAdmin) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }
    }

    /**
     * Check that the user is the vehicle owner.
     */
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