<?php

declare(strict_types=1);

namespace Services;

use Core\Database;

class DashboardService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Dashboard stats for a renter (user role).
     */
    public function getRenterStats(int $userId): array
    {
        $active = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings WHERE user_id = ? AND status = 'confirmed'",
            [$userId]
        )['c'] ?? 0);

        $pending = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings WHERE user_id = ? AND status IN ('pending_owner_review', 'pending_payment')",
            [$userId]
        )['c'] ?? 0);

        $completed = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings WHERE user_id = ? AND status = 'completed'",
            [$userId]
        )['c'] ?? 0);

        $total = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings WHERE user_id = ?",
            [$userId]
        )['c'] ?? 0);

        $totalSpent = (float) ($this->db->fetchOne(
            "SELECT COALESCE(SUM(total_price), 0) AS c FROM bookings WHERE user_id = ? AND payment_status = 'paid'",
            [$userId]
        )['c'] ?? 0);

        $swapOffers = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM swap_offers WHERE user_id = ?",
            [$userId]
        )['c'] ?? 0);

        $swapAccepted = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM swap_offers WHERE user_id = ? AND status = 'accepted'",
            [$userId]
        )['c'] ?? 0);

        // Upcoming booking (next confirmed trip)
        $upcoming = $this->db->fetchOne(
            "SELECT b.id, b.start_date, b.end_date, v.title AS vehicle_title
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE b.user_id = ? AND b.status = 'confirmed' AND b.start_date >= CURDATE()
             ORDER BY b.start_date ASC LIMIT 1",
            [$userId]
        );

        // Recent bookings (last 5)
        $recent = $this->db->fetchAll(
            "SELECT b.id, b.start_date, b.end_date, b.status, b.total_price, b.currency,
                    v.title AS vehicle_title
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE b.user_id = ?
             ORDER BY b.created_at DESC LIMIT 5",
            [$userId]
        );

        // Bookings needing renter action (pending payment, pending contract)
        $actionNeeded = $this->db->fetchAll(
            "SELECT b.id, b.start_date, b.end_date, b.status, b.total_price, b.currency,
                    v.title AS vehicle_title
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE b.user_id = ? AND b.status IN ('pending_payment', 'pending_contract')
             ORDER BY b.created_at DESC LIMIT 3",
            [$userId]
        );

        return [
            'bookings_active' => $active,
            'bookings_pending' => $pending,
            'bookings_completed' => $completed,
            'bookings_total' => $total,
            'total_spent' => round($totalSpent, 2),
            'swap_offers' => $swapOffers,
            'swap_accepted' => $swapAccepted,
            'upcoming_trip' => $upcoming,
            'recent_bookings' => $recent,
            'action_needed' => $actionNeeded,
        ];
    }

    /**
     * Dashboard stats for a vehicle owner.
     */
    public function getOwnerStats(int $ownerId): array
    {
        $vehiclesTotal = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM vehicles WHERE owner_id = ?",
            [$ownerId]
        )['c'] ?? 0);

        $vehiclesActive = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM vehicles WHERE owner_id = ? AND status = 'active'",
            [$ownerId]
        )['c'] ?? 0);

        $pendingRequests = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.status = 'pending_owner_review'",
            [$ownerId]
        )['c'] ?? 0);

        $activeBookings = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.status = 'confirmed'",
            [$ownerId]
        )['c'] ?? 0);

        $completedBookings = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.status = 'completed'",
            [$ownerId]
        )['c'] ?? 0);

        $totalBookings = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ?",
            [$ownerId]
        )['c'] ?? 0);

        $revenue = (float) ($this->db->fetchOne(
            "SELECT COALESCE(SUM(b.total_price), 0) AS c FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.payment_status = 'paid'",
            [$ownerId]
        )['c'] ?? 0);

        $pendingSwaps = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM swap_offers so
             JOIN bookings b ON b.id = so.booking_id
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND so.status IN ('pending', 'under_review')",
            [$ownerId]
        )['c'] ?? 0);

        // Recent booking requests (last 5)
        $recentRequests = $this->db->fetchAll(
            "SELECT b.id, b.start_date, b.end_date, b.status, b.total_price, b.currency,
                    v.title AS vehicle_title,
                    u.first_name, u.last_name
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             JOIN users u ON u.id = b.user_id
             WHERE v.owner_id = ?
             ORDER BY b.created_at DESC LIMIT 5",
            [$ownerId]
        );

        // Upcoming confirmed bookings (next 3)
        $upcomingBookings = $this->db->fetchAll(
            "SELECT b.id, b.start_date, b.end_date, b.status,
                    v.title AS vehicle_title,
                    u.first_name AS renter_first_name, u.last_name AS renter_last_name
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             JOIN users u ON u.id = b.user_id
             WHERE v.owner_id = ? AND b.status = 'confirmed' AND b.start_date >= CURDATE()
             ORDER BY b.start_date ASC LIMIT 3",
            [$ownerId]
        );

        return [
            'vehicles_total' => $vehiclesTotal,
            'vehicles_active' => $vehiclesActive,
            'pending_requests' => $pendingRequests,
            'active_bookings' => $activeBookings,
            'completed_bookings' => $completedBookings,
            'total_bookings' => $totalBookings,
            'revenue' => round($revenue, 2),
            'pending_swaps' => $pendingSwaps,
            'recent_requests' => $recentRequests,
            'upcoming_bookings' => $upcomingBookings,
        ];
    }
}
