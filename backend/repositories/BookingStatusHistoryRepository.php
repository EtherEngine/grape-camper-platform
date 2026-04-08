<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class BookingStatusHistoryRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Record a status transition.
     */
    public function create(int $bookingId, ?string $oldStatus, string $newStatus, ?int $changedBy, ?string $comment = null): int
    {
        $sql = "INSERT INTO booking_status_history
                    (booking_id, old_status, new_status, changed_by, comment)
                VALUES (?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $bookingId,
            $oldStatus,
            $newStatus,
            $changedBy,
            $comment,
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Get full history for a booking, newest first.
     */
    public function findByBookingId(int $bookingId): array
    {
        $sql = "SELECT h.id, h.old_status, h.new_status, h.comment, h.created_at,
                       u.first_name AS changed_by_name
                FROM booking_status_history h
                LEFT JOIN users u ON u.id = h.changed_by
                WHERE h.booking_id = ?
                ORDER BY h.created_at DESC";

        return $this->db->fetchAll($sql, [$bookingId]);
    }
}
