<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class PaymentRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── CRUD ───────────────────────────────────────────────

    /**
     * Create a new payment record.
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO payments
                    (booking_id, provider, provider_reference, amount, currency, status, payment_url)
                VALUES (?, ?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['booking_id'],
            $data['provider'],
            $data['provider_reference'] ?? null,
            $data['amount'],
            $data['currency'] ?? 'EUR',
            $data['status'] ?? 'initiated',
            $data['payment_url'] ?? null,
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Find a payment by ID.
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT p.*,
                       b.vehicle_id, b.user_id, b.status AS booking_status,
                       b.total_price AS booking_total
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                WHERE p.id = ?";

        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * Find a payment by provider reference (external ID from provider).
     */
    public function findByProviderReference(string $ref): ?array
    {
        $sql = "SELECT * FROM payments WHERE provider_reference = ?";
        return $this->db->fetchOne($sql, [$ref]);
    }

    /**
     * Get all payments for a booking, newest first.
     */
    public function findByBookingId(int $bookingId): array
    {
        $sql = "SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC";
        return $this->db->fetchAll($sql, [$bookingId]);
    }

    /**
     * Get the latest active payment for a booking (not cancelled/failed).
     */
    public function findActiveByBookingId(int $bookingId): ?array
    {
        $sql = "SELECT * FROM payments
                WHERE booking_id = ?
                  AND status NOT IN ('cancelled', 'failed')
                ORDER BY created_at DESC
                LIMIT 1";

        return $this->db->fetchOne($sql, [$bookingId]);
    }

    // ── Status updates ─────────────────────────────────────

    /**
     * Update payment status.
     */
    public function updateStatus(int $id, string $status): int
    {
        $timestampCol = match ($status) {
            'paid' => ', paid_at = NOW()',
            'failed' => ', failed_at = NOW()',
            'refunded', 'partially_refunded' => ', refunded_at = NOW()',
            default => '',
        };

        $sql = "UPDATE payments SET status = ?{$timestampCol} WHERE id = ?";
        return $this->db->execute($sql, [$status, $id]);
    }

    /**
     * Set the provider reference (external payment ID).
     */
    public function setProviderReference(int $id, string $reference): int
    {
        $sql = "UPDATE payments SET provider_reference = ? WHERE id = ?";
        return $this->db->execute($sql, [$reference, $id]);
    }

    /**
     * Set the payment URL (redirect for user).
     */
    public function setPaymentUrl(int $id, string $url): int
    {
        $sql = "UPDATE payments SET payment_url = ? WHERE id = ?";
        return $this->db->execute($sql, [$url, $id]);
    }

    // ── Listings ───────────────────────────────────────────

    /**
     * List payments for a user (as booking renter), paginated.
     */
    public function findByUserId(int $userId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['b.user_id = ?'];
        $params = [$userId];

        if ($status !== null && $status !== '') {
            $where[] = 'p.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total
                     FROM payments p
                     JOIN bookings b ON b.id = p.booking_id
                     WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT p.id, p.booking_id, p.provider, p.amount, p.currency,
                       p.status, p.paid_at, p.created_at,
                       b.start_date, b.end_date, b.status AS booking_status,
                       v.title AS vehicle_title
                FROM payments p
                JOIN bookings b ON b.id = p.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                WHERE {$whereClause}
                ORDER BY p.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }

    /**
     * Count payments by status for a booking.
     */
    public function countByBookingAndStatus(int $bookingId, string $status): int
    {
        $sql = "SELECT COUNT(*) AS cnt FROM payments WHERE booking_id = ? AND status = ?";
        return (int) ($this->db->fetchOne($sql, [$bookingId, $status])['cnt'] ?? 0);
    }
}