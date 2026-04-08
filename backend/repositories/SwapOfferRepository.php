<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class SwapOfferRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    // ── Single ─────────────────────────────────────────────

    public function findById(int $id): ?array
    {
        $sql = "SELECT so.*,
                       u.first_name, u.last_name, u.email AS user_email,
                       b.vehicle_id, b.start_date AS booking_start, b.end_date AS booking_end,
                       v.title AS vehicle_title, v.owner_id
                FROM swap_offers so
                JOIN users u ON u.id = so.user_id
                LEFT JOIN bookings b ON b.id = so.booking_id
                LEFT JOIN vehicles v ON v.id = b.vehicle_id
                WHERE so.id = ?";

        return $this->db->fetchOne($sql, [$id]);
    }

    // ── Create / Update ────────────────────────────────────

    public function create(array $data): int
    {
        $sql = "INSERT INTO swap_offers
                    (user_id, booking_id, type, title, description,
                     estimated_value, currency, available_from, available_to, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['user_id'],
            $data['booking_id'] ?? null,
            $data['type'],
            $data['title'],
            $data['description'],
            $data['estimated_value'],
            $data['currency'] ?? 'EUR',
            $data['available_from'] ?? null,
            $data['available_to'] ?? null,
            $data['status'] ?? 'pending',
        ]);

        return $this->db->lastInsertId();
    }

    public function update(int $id, array $data): int
    {
        $fields = [];
        $params = [];

        $allowed = [
            'type',
            'title',
            'description',
            'estimated_value',
            'currency',
            'available_from',
            'available_to',
            'booking_id'
        ];

        foreach ($allowed as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "{$col} = ?";
                $params[] = $data[$col];
            }
        }

        if (empty($fields)) {
            return 0;
        }

        $params[] = $id;
        $sql = "UPDATE swap_offers SET " . implode(', ', $fields) . " WHERE id = ?";

        return $this->db->execute($sql, $params);
    }

    public function updateStatus(int $id, string $status, ?string $ownerComment = null): int
    {
        $sql = "UPDATE swap_offers SET status = ?, owner_comment = COALESCE(?, owner_comment) WHERE id = ?";

        return $this->db->execute($sql, [$status, $ownerComment, $id]);
    }

    // ── Listings ───────────────────────────────────────────

    /**
     * Offers created by a specific user, paginated.
     */
    public function findByUserId(int $userId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['so.user_id = ?'];
        $params = [$userId];

        if ($status !== null && $status !== '') {
            $where[] = 'so.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total FROM swap_offers so WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT so.id, so.booking_id, so.type, so.title, so.estimated_value,
                       so.currency, so.available_from, so.available_to, so.status,
                       so.created_at
                FROM swap_offers so
                WHERE {$whereClause}
                ORDER BY so.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        $items = $this->db->fetchAll($sql, $params);

        return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
    }

    /**
     * Offers linked to bookings of vehicles owned by a specific owner, paginated.
     */
    public function findByOwnerId(int $ownerId, ?string $status = null, int $page = 1, int $perPage = 20): array
    {
        $where = ['v.owner_id = ?'];
        $params = [$ownerId];

        if ($status !== null && $status !== '') {
            $where[] = 'so.status = ?';
            $params[] = $status;
        }

        $whereClause = implode(' AND ', $where);

        $countSql = "SELECT COUNT(*) AS total
                     FROM swap_offers so
                     JOIN bookings b ON b.id = so.booking_id
                     JOIN vehicles v ON v.id = b.vehicle_id
                     WHERE {$whereClause}";
        $total = (int) ($this->db->fetchOne($countSql, $params)['total'] ?? 0);

        $offset = ($page - 1) * $perPage;
        $sql = "SELECT so.id, so.user_id, so.booking_id, so.type, so.title,
                       so.estimated_value, so.currency, so.available_from, so.available_to,
                       so.status, so.created_at,
                       u.first_name, u.last_name,
                       v.title AS vehicle_title
                FROM swap_offers so
                JOIN bookings b ON b.id = so.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users u ON u.id = so.user_id
                WHERE {$whereClause}
                ORDER BY so.created_at DESC
                LIMIT ? OFFSET ?";

        $params[] = $perPage;
        $params[] = $offset;

        $items = $this->db->fetchAll($sql, $params);

        return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
    }

    /**
     * Get a swap offer linked to a specific booking.
     */
    public function findByBookingId(int $bookingId): ?array
    {
        $sql = "SELECT so.* FROM swap_offers so WHERE so.booking_id = ? ORDER BY so.created_at DESC LIMIT 1";

        return $this->db->fetchOne($sql, [$bookingId]);
    }

    // ── Images ─────────────────────────────────────────────

    public function getImages(int $offerId): array
    {
        $sql = "SELECT id, file_path, alt_text, sort_order
                FROM swap_offer_images
                WHERE swap_offer_id = ?
                ORDER BY sort_order ASC, id ASC";

        return $this->db->fetchAll($sql, [$offerId]);
    }

    public function addImage(int $offerId, string $filePath, ?string $altText = null, int $sortOrder = 0): int
    {
        $sql = "INSERT INTO swap_offer_images (swap_offer_id, file_path, alt_text, sort_order)
                VALUES (?, ?, ?, ?)";

        $this->db->execute($sql, [$offerId, $filePath, $altText, $sortOrder]);

        return $this->db->lastInsertId();
    }

    public function findImageById(int $imageId): ?array
    {
        $sql = "SELECT * FROM swap_offer_images WHERE id = ?";

        return $this->db->fetchOne($sql, [$imageId]);
    }

    public function deleteImage(int $imageId): int
    {
        $sql = "DELETE FROM swap_offer_images WHERE id = ?";

        return $this->db->execute($sql, [$imageId]);
    }
}