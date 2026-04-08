<?php

declare(strict_types=1);

namespace Services;

use Core\Auth;
use Core\Database;
use Repositories\BookingRepository;
use Repositories\SwapOfferRepository;
use RuntimeException;

class SwapService
{
    private Database $db;
    private SwapOfferRepository $swaps;
    private BookingRepository $bookings;

    private const VALID_TYPES = ['vehicle', 'property', 'other'];

    private const TRANSITIONS = [
        'pending' => ['under_review', 'cancelled'],
        'under_review' => ['accepted', 'rejected'],
        'accepted' => ['cancelled'],
        'rejected' => [],
        'cancelled' => [],
    ];

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->swaps = new SwapOfferRepository();
        $this->bookings = new BookingRepository();
    }

    // ── Create ─────────────────────────────────────────────

    public function createOffer(int $userId, array $data): array
    {
        $this->validateOfferData($data);

        // If linked to a booking, verify booking exists and belongs to user
        if (!empty($data['booking_id'])) {
            $booking = $this->bookings->findById((int) $data['booking_id']);
            if ($booking === null) {
                throw new RuntimeException('Buchung nicht gefunden.', 404);
            }
            if ((int) $booking['user_id'] !== $userId) {
                throw new RuntimeException('Diese Buchung gehört nicht Ihnen.', 403);
            }
        }

        $offerId = $this->swaps->create([
            'user_id' => $userId,
            'booking_id' => !empty($data['booking_id']) ? (int) $data['booking_id'] : null,
            'type' => $data['type'],
            'title' => $data['title'],
            'description' => $data['description'],
            'estimated_value' => (float) $data['estimated_value'],
            'currency' => $data['currency'] ?? 'EUR',
            'available_from' => $data['available_from'] ?? null,
            'available_to' => $data['available_to'] ?? null,
        ]);

        return $this->swaps->findById($offerId);
    }

    // ── Update (only by creator, while pending) ────────────

    public function updateOffer(int $offerId, int $userId, array $data): array
    {
        $offer = $this->findOrFail($offerId);

        if ((int) $offer['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        if ($offer['status'] !== 'pending') {
            throw new RuntimeException('Nur Angebote im Status „pending" können bearbeitet werden.', 400);
        }

        if (isset($data['type']) || isset($data['estimated_value']) || isset($data['available_from']) || isset($data['available_to'])) {
            $this->validateOfferData(array_merge($offer, $data), true);
        }

        // If re-linking to a different booking
        if (isset($data['booking_id'])) {
            if ($data['booking_id'] !== null) {
                $booking = $this->bookings->findById((int) $data['booking_id']);
                if ($booking === null) {
                    throw new RuntimeException('Buchung nicht gefunden.', 404);
                }
                if ((int) $booking['user_id'] !== $userId) {
                    throw new RuntimeException('Diese Buchung gehört nicht Ihnen.', 403);
                }
            }
        }

        $this->swaps->update($offerId, $data);

        return $this->swaps->findById($offerId);
    }

    // ── Status transitions ─────────────────────────────────

    /**
     * Owner accepts the swap offer → under_review → accepted
     */
    public function accept(int $offerId, int $ownerId, ?string $comment = null): array
    {
        $offer = $this->findOrFail($offerId);
        $this->assertOwnerOfLinkedVehicle($offer, $ownerId);

        // Auto-transition through under_review if still pending
        if ($offer['status'] === 'pending') {
            $this->transition($offer, 'under_review');
            $offer['status'] = 'under_review';
        }

        $this->transition($offer, 'accepted', $comment);

        // Link swap offer to booking (set swap_offer_id + swap_discount_value)
        if ($offer['booking_id'] !== null) {
            $bookingId = (int) $offer['booking_id'];

            $this->db->execute(
                "UPDATE bookings SET swap_offer_id = ?, swap_discount_value = ? WHERE id = ?",
                [$offerId, $offer['estimated_value'], $bookingId]
            );

            // If booking is still pending owner review, approve it automatically
            // so that tryConfirmBooking can evaluate if swap covers the full price
            $booking = $this->bookings->findById($bookingId);
            if ($booking && $booking['status'] === 'pending_owner_review') {
                $bookingService = new BookingService();
                $bookingService->approve($bookingId, $ownerId);
            }

            // Re-evaluate whether booking can be confirmed now
            (new BookingService())->tryConfirmBooking($bookingId);
        }

        return $this->swaps->findById($offerId);
    }

    /**
     * Owner rejects the swap offer → under_review → rejected
     */
    public function reject(int $offerId, int $ownerId, ?string $comment = null): array
    {
        $offer = $this->findOrFail($offerId);
        $this->assertOwnerOfLinkedVehicle($offer, $ownerId);

        // Auto-transition through under_review if still pending
        if ($offer['status'] === 'pending') {
            $this->transition($offer, 'under_review');
            $offer['status'] = 'under_review';
        }

        $this->transition($offer, 'rejected', $comment);

        return $this->swaps->findById($offerId);
    }

    /**
     * Owner puts offer under review → pending → under_review
     */
    public function review(int $offerId, int $ownerId): array
    {
        $offer = $this->findOrFail($offerId);
        $this->assertOwnerOfLinkedVehicle($offer, $ownerId);
        $this->transition($offer, 'under_review');

        return $this->swaps->findById($offerId);
    }

    /**
     * User cancels own offer → pending/under_review → cancelled
     */
    public function cancel(int $offerId, int $userId): array
    {
        $offer = $this->findOrFail($offerId);

        if ((int) $offer['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        $this->transition($offer, 'cancelled');

        return $this->swaps->findById($offerId);
    }

    // ── Listings ───────────────────────────────────────────

    public function getUserOffers(int $userId, ?string $status, int $page, int $perPage): array
    {
        return $this->swaps->findByUserId($userId, $status, $page, $perPage);
    }

    public function getOwnerOffers(int $ownerId, ?string $status, int $page, int $perPage): array
    {
        return $this->swaps->findByOwnerId($ownerId, $status, $page, $perPage);
    }

    public function getOffer(int $offerId): array
    {
        $offer = $this->findOrFail($offerId);
        $offer['images'] = $this->swaps->getImages($offerId);

        return $offer;
    }

    // ── Images ─────────────────────────────────────────────

    public function addImage(int $offerId, int $userId, string $filePath, ?string $altText = null): array
    {
        $offer = $this->findOrFail($offerId);

        if ((int) $offer['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        $currentImages = $this->swaps->getImages($offerId);
        $sortOrder = count($currentImages);

        $imageId = $this->swaps->addImage($offerId, $filePath, $altText, $sortOrder);

        return $this->swaps->findImageById($imageId);
    }

    public function deleteImage(int $offerId, int $imageId, int $userId): void
    {
        $offer = $this->findOrFail($offerId);

        if ((int) $offer['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        $image = $this->swaps->findImageById($imageId);
        if ($image === null || (int) $image['swap_offer_id'] !== $offerId) {
            throw new RuntimeException('Bild nicht gefunden.', 404);
        }

        $this->swaps->deleteImage($imageId);
    }

    // ── Private helpers ────────────────────────────────────

    private function findOrFail(int $id): array
    {
        $offer = $this->swaps->findById($id);
        if ($offer === null) {
            throw new RuntimeException('Tauschangebot nicht gefunden.', 404);
        }
        return $offer;
    }

    private function assertOwnerOfLinkedVehicle(array $offer, int $ownerId): void
    {
        if ($offer['booking_id'] === null) {
            throw new RuntimeException('Tauschangebot hat keine verknüpfte Buchung.', 400);
        }

        if (!isset($offer['owner_id']) || (int) $offer['owner_id'] !== $ownerId) {
            throw new RuntimeException('Keine Berechtigung. Sie sind nicht der Fahrzeug-Eigentümer.', 403);
        }
    }

    private function transition(array $offer, string $newStatus, ?string $comment = null): void
    {
        $current = $offer['status'];
        $allowed = self::TRANSITIONS[$current] ?? [];

        if (!in_array($newStatus, $allowed, true)) {
            throw new RuntimeException(
                "Statusübergang von '{$current}' zu '{$newStatus}' nicht erlaubt.",
                400
            );
        }

        $this->swaps->updateStatus((int) $offer['id'], $newStatus, $comment);
    }

    private function validateOfferData(array $data, bool $partial = false): void
    {
        if (!$partial || isset($data['type'])) {
            $type = $data['type'] ?? '';
            if (!in_array($type, self::VALID_TYPES, true)) {
                throw new RuntimeException(
                    'Ungültiger Typ. Erlaubt: ' . implode(', ', self::VALID_TYPES),
                    422
                );
            }
        }

        if (!$partial || isset($data['estimated_value'])) {
            $value = $data['estimated_value'] ?? 0;
            if (!is_numeric($value) || (float) $value <= 0) {
                throw new RuntimeException('Der geschätzte Wert muss größer als 0 sein.', 422);
            }
            if ((float) $value > 99999999.99) {
                throw new RuntimeException('Der geschätzte Wert ist unrealistisch hoch.', 422);
            }
        }

        // Validate date range
        $from = $data['available_from'] ?? null;
        $to = $data['available_to'] ?? null;

        if ($from !== null && $to !== null) {
            if (strtotime($from) === false || strtotime($to) === false) {
                throw new RuntimeException('Ungültiges Datumsformat.', 422);
            }
            if ($from > $to) {
                throw new RuntimeException('Das Startdatum muss vor dem Enddatum liegen.', 422);
            }
        }
    }
}