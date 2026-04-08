<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class BookingRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── Blocking bookings for a vehicle in a date range ────

    /**
     * Statuses that block availability (occupy the vehicle).
     */
    private const BLOCKING_STATUSES = [
        'confirmed',
        'pending_contract',
        'pending_payment',
        'pending_owner_review',
    ];

    /**
     * Find all bookings that overlap with [startDate, endDate) for a vehicle.
     * Uses half-open interval: booking.start_date < endDate AND booking.end_date > startDate.
     *
     * @return array<int, array{id: int, start_date: string, end_date: string, status: string, user_id: int}>
     */
    public function findBlockingBookings(int $vehicleId, string $startDate, string $endDate, ?int $excludeBookingId = null): array
    {
        $statusPlaceholders = implode(',', array_fill(0, count(self::BLOCKING_STATUSES), '?'));

        $params = [$vehicleId, $endDate, $startDate, ...self::BLOCKING_STATUSES];

        $excludeClause = '';
        if ($excludeBookingId !== null) {
            $excludeClause = ' AND b.id != ?';
            $params[] = $excludeBookingId;
        }

        $sql = "SELECT b.id, b.start_date, b.end_date, b.status, b.user_id
                FROM bookings b
                WHERE b.vehicle_id = ?
                  AND b.start_date < ?
                  AND b.end_date > ?
                  AND b.status IN ({$statusPlaceholders})
                  {$excludeClause}
                ORDER BY b.start_date ASC";

        return $this->db->fetchAll($sql, $params);
    }

    /**
     * Check if a conflict exists (boolean shortcut).
     */
    public function hasConflict(int $vehicleId, string $startDate, string $endDate, ?int $excludeBookingId = null): bool
    {
        return count($this->findBlockingBookings($vehicleId, $startDate, $endDate, $excludeBookingId)) > 0;
    }

    /**
     * Pessimistic lock: check for conflicts with FOR UPDATE (must be inside a transaction).
     * Blocks concurrent inserts for the same vehicle/date range until the transaction commits.
     */
    public function hasConflictForUpdate(int $vehicleId, string $startDate, string $endDate, ?int $excludeBookingId = null): bool
    {
        $statusPlaceholders = implode(',', array_fill(0, count(self::BLOCKING_STATUSES), '?'));
        $params = [$vehicleId, $endDate, $startDate, ...self::BLOCKING_STATUSES];

        $excludeClause = '';
        if ($excludeBookingId !== null) {
            $excludeClause = ' AND b.id != ?';
            $params[] = $excludeBookingId;
        }

        $sql = "SELECT 1
                FROM bookings b
                WHERE b.vehicle_id = ?
                  AND b.start_date < ?
                  AND b.end_date > ?
                  AND b.status IN ({$statusPlaceholders})
                  {$excludeClause}
                FOR UPDATE";

        return $this->db->fetchOne($sql, $params) !== null;
    }

    /**
     * Get all blocking bookings within a date range for calendar display.
     * Returns date pairs only (no user info for public endpoint).
     *
     * @return array<int, array{start_date: string, end_date: string, status: string}>
     */
    public function findBlockingPeriods(int $vehicleId, string $startDate, string $endDate): array
    {
        $statusPlaceholders = implode(',', array_fill(0, count(self::BLOCKING_STATUSES), '?'));

        $sql = "SELECT b.start_date, b.end_date, b.status
                FROM bookings b
                WHERE b.vehicle_id = ?
                  AND b.start_date < ?
                  AND b.end_date > ?
                  AND b.status IN ({$statusPlaceholders})
                ORDER BY b.start_date ASC";

        $params = [$vehicleId, $endDate, $startDate, ...self::BLOCKING_STATUSES];

        return $this->db->fetchAll($sql, $params);
    }

    // ── Single booking ─────────────────────────────────────

    /**
     * Find a booking by ID.
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT b.*, v.title AS vehicle_title, v.slug AS vehicle_slug,
                       v.owner_id, v.daily_price, v.weekly_price, v.monthly_price,
                       v.cleaning_fee AS vehicle_cleaning_fee,
                       v.service_fee AS vehicle_service_fee,
                       v.deposit_amount AS vehicle_deposit,
                       v.latitude AS vehicle_lat, v.longitude AS vehicle_lng,
                       v.location_city AS vehicle_city, v.location_country AS vehicle_country,
                       v.license_plate,
                       owner.first_name AS owner_first_name,
                       owner.last_name AS owner_last_name,
                       owner.email AS owner_email,
                       owner.phone AS owner_phone,
                       renter.first_name AS renter_first_name,
                       renter.last_name AS renter_last_name,
                       renter.email AS renter_email
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users owner ON owner.id = v.owner_id
                JOIN users renter ON renter.id = b.user_id
                WHERE b.id = ?";

        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * Create a new booking.
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO bookings
                    (vehicle_id, user_id, start_date, end_date, days_count,
                     base_price, cleaning_fee, service_fee, deposit_amount,
                     total_price, currency, status, payment_status, payment_method, customer_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['vehicle_id'],
            $data['user_id'],
            $data['start_date'],
            $data['end_date'],
            $data['days_count'],
            $data['base_price'],
            $data['cleaning_fee'],
            $data['service_fee'],
            $data['deposit_amount'],
            $data['total_price'],
            $data['currency'] ?? 'EUR',
            $data['status'] ?? 'pending_owner_review',
            $data['payment_status'] ?? 'unpaid',
            $data['payment_method'] ?? 'none',
            $data['customer_notes'] ?? null,
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Update the booking status atomically.
     * Returns affected rows (0 = status was already changed by another request).
     */
    public function updateStatus(int $id, string $newStatus, ?string $expectedCurrentStatus = null): int
    {
        $timestampCol = match ($newStatus) {
            'confirmed' => ', confirmed_at = NOW()',
            'cancelled' => ', cancelled_at = NOW()',
            'completed' => ', completed_at = NOW()',
            default => '',
        };

        if ($expectedCurrentStatus !== null) {
            $sql = "UPDATE bookings SET status = ?{$timestampCol} WHERE id = ? AND status = ?";
            return $this->db->execute($sql, [$newStatus, $id, $expectedCurrentStatus]);
        }

        $sql = "UPDATE bookings SET status = ?{$timestampCol} WHERE id = ?";
        return $this->db->execute($sql, [$newStatus, $id]);
    }

    /**
     * Set the rejection reason alongside status update.
     * Uses WHERE status guard to prevent concurrent overwrites.
     */
    public function reject(int $id, ?string $reason, string $expectedStatus = 'pending_owner_review'): int
    {
        $sql = "UPDATE bookings SET status = 'rejected', rejection_reason = ? WHERE id = ? AND status = ?";

        return $this->db->execute($sql, [$reason, $id, $expectedStatus]);
    }

    /**
     * Update owner notes on a booking.
     */
    public function updateOwnerNotes(int $id, string $notes): int
    {
        $sql = "UPDATE bookings SET owner_notes = ? WHERE id = ?";

        return $this->db->execute($sql, [$notes, $id]);
    }

    /**
     * Update the payment_method on a booking.
     */
    public function updatePaymentMethod(int $id, string $method): int
    {
        $sql = "UPDATE bookings SET payment_method = ? WHERE id = ?";
        return $this->db->execute($sql, [$method, $id]);
    }

    /**
     * Update the payment_status on a booking.
     */
    public function updatePaymentStatus(int $id, string $status): int
    {
        $sql = "UPDATE bookings SET payment_status = ? WHERE id = ?";
        return $this->db->execute($sql, [$status, $id]);
    }

    // ── Listings ───────────────────────────────────────────

    /**
     * List bookings for a renter (user_id), paginated.
     */
    public function findByUserId(int $userId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['b.user_id = ?'];
        $params = [$userId];

        if ($status !== null && $status !== '') {
            $where[] = 'b.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        // Count
        $countSql = "SELECT COUNT(*) AS total FROM bookings b WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        // Fetch
        $offset = ($page - 1) * $perPage;
        $sql = "SELECT b.id, b.vehicle_id, b.start_date, b.end_date, b.days_count,
                       b.total_price, b.currency, b.status, b.payment_status,
                       b.created_at,
                       v.title AS vehicle_title, v.slug AS vehicle_slug,
                       vi.file_path AS vehicle_cover,
                       owner.swap_unlocked AS owner_swap_unlocked
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users owner ON owner.id = v.owner_id
                LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_cover = 1
                WHERE {$whereClause}
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }

    /**
     * List bookings for a vehicle owner (all bookings on their vehicles), paginated.
     */
    public function findByOwnerId(int $ownerId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['v.owner_id = ?'];
        $params = [$ownerId];

        if ($status !== null && $status !== '') {
            $where[] = 'b.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total
                     FROM bookings b
                     JOIN vehicles v ON v.id = b.vehicle_id
                     WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT b.id, b.vehicle_id, b.user_id, b.start_date, b.end_date,
                       b.days_count, b.total_price, b.currency, b.status,
                       b.payment_status, b.customer_notes, b.created_at,
                       b.swap_offer_id, b.swap_discount_value,
                       v.title AS vehicle_title, v.slug AS vehicle_slug,
                       vi.file_path AS vehicle_cover,
                       u.first_name AS renter_first_name,
                       u.last_name AS renter_last_name,
                       u.email AS renter_email,
                       owner.swap_unlocked AS owner_swap_unlocked,
                       so.title AS swap_title, so.type AS swap_type,
                       so.estimated_value AS swap_estimated_value,
                       so.status AS swap_status
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users u ON u.id = b.user_id
                JOIN users owner ON owner.id = v.owner_id
                LEFT JOIN vehicle_images vi ON vi.vehicle_id = v.id AND vi.is_cover = 1
                LEFT JOIN swap_offers so ON so.booking_id = b.id
                WHERE {$whereClause}
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }

    // ── Admin listings ──────────────────────────────────────

    /**
     * List all bookings system-wide (admin), with optional filters, paginated.
     */
    public function findAllAdmin(?string $status = null, ?string $paymentStatus = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['1 = 1'];
        $params = [];

        if ($status !== null && $status !== '') {
            $where[] = 'b.status = ?';
            $params[] = $status;
        }
        if ($paymentStatus !== null && $paymentStatus !== '') {
            $where[] = 'b.payment_status = ?';
            $params[] = $paymentStatus;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM bookings b WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT b.id, b.vehicle_id, b.user_id, b.start_date, b.end_date,
                       b.days_count, b.total_price, b.currency, b.status,
                       b.payment_status, b.payment_method, b.created_at,
                       v.title AS vehicle_title,
                       u.first_name AS renter_first_name,
                       u.last_name  AS renter_last_name,
                       u.email      AS renter_email,
                       o.first_name AS owner_first_name,
                       o.last_name  AS owner_last_name
                FROM bookings b
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users u ON u.id = b.user_id
                JOIN users o ON o.id = v.owner_id
                WHERE {$whereClause}
                ORDER BY b.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        return ['items' => $this->db->fetchAll($sql, $params), 'total' => $total];
    }
}