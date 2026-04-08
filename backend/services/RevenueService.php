<?php

declare(strict_types=1);

namespace Services;

use Core\Database;

class RevenueService
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Get comprehensive revenue data for an owner.
     */
    public function getOwnerRevenue(int $ownerId): array
    {
        return [
            'summary' => $this->getSummary($ownerId),
            'monthly' => $this->getMonthlyRevenue($ownerId),
            'by_vehicle' => $this->getRevenueByVehicle($ownerId),
            'recent_transactions' => $this->getRecentTransactions($ownerId),
            'by_status' => $this->getBookingsByPaymentStatus($ownerId),
            'fee_breakdown' => $this->getFeeBreakdown($ownerId),
        ];
    }

    /** Overall totals */
    private function getSummary(int $ownerId): array
    {
        $row = $this->db->fetchOne(
            "SELECT
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) AS total_earned,
                COALESCE(SUM(CASE WHEN b.payment_status IN ('unpaid','initiated','pending') AND b.status NOT IN ('cancelled','rejected') THEN b.total_price ELSE 0 END), 0) AS total_pending,
                COALESCE(SUM(CASE WHEN b.payment_status = 'refunded' THEN b.total_price ELSE 0 END), 0) AS total_refunded,
                COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) AS paid_bookings,
                COUNT(CASE WHEN b.status NOT IN ('cancelled','rejected') THEN 1 END) AS active_bookings,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.service_fee ELSE 0 END), 0) AS total_service_fees,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.cleaning_fee ELSE 0 END), 0) AS total_cleaning_fees
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ?",
            [$ownerId]
        );

        return [
            'total_earned' => round((float) $row['total_earned'], 2),
            'total_pending' => round((float) $row['total_pending'], 2),
            'total_refunded' => round((float) $row['total_refunded'], 2),
            'paid_bookings' => (int) $row['paid_bookings'],
            'active_bookings' => (int) $row['active_bookings'],
            'total_service_fees' => round((float) $row['total_service_fees'], 2),
            'total_cleaning_fees' => round((float) $row['total_cleaning_fees'], 2),
            'net_revenue' => round((float) $row['total_earned'] - (float) $row['total_service_fees'], 2),
        ];
    }

    /** Revenue per month for the last 12 months */
    private function getMonthlyRevenue(int $ownerId): array
    {
        $rows = $this->db->fetchAll(
            "SELECT
                DATE_FORMAT(b.created_at, '%Y-%m') AS month,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) AS revenue,
                COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) AS bookings
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             GROUP BY month
             ORDER BY month ASC",
            [$ownerId]
        );

        // Fill missing months with 0
        $result = [];
        $date = new \DateTime('first day of -11 months');
        for ($i = 0; $i < 12; $i++) {
            $key = $date->format('Y-m');
            $found = array_filter($rows, fn($r) => $r['month'] === $key);
            $found = $found ? array_values($found)[0] : null;
            $result[] = [
                'month' => $key,
                'label' => $date->format('M Y'),
                'revenue' => round((float) ($found['revenue'] ?? 0), 2),
                'bookings' => (int) ($found['bookings'] ?? 0),
            ];
            $date->modify('+1 month');
        }

        return $result;
    }

    /** Revenue breakdown per vehicle */
    private function getRevenueByVehicle(int $ownerId): array
    {
        return $this->db->fetchAll(
            "SELECT
                v.id AS vehicle_id,
                v.title AS vehicle_title,
                COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) AS paid_bookings,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.base_price ELSE 0 END), 0) AS base_revenue,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.cleaning_fee ELSE 0 END), 0) AS cleaning_fees,
                COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.service_fee ELSE 0 END), 0) AS service_fees
             FROM vehicles v
             LEFT JOIN bookings b ON b.vehicle_id = v.id
             WHERE v.owner_id = ?
             GROUP BY v.id, v.title
             ORDER BY revenue DESC",
            [$ownerId]
        );
    }

    /** Last 10 paid/refunded transactions */
    private function getRecentTransactions(int $ownerId): array
    {
        return $this->db->fetchAll(
            "SELECT
                b.id AS booking_id,
                v.title AS vehicle_title,
                u.first_name AS renter_first_name,
                u.last_name AS renter_last_name,
                b.start_date, b.end_date,
                b.total_price, b.base_price, b.service_fee, b.cleaning_fee,
                b.currency, b.payment_status, b.payment_method,
                b.completed_at, b.created_at
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             JOIN users u ON u.id = b.user_id
             WHERE v.owner_id = ? AND b.payment_status IN ('paid', 'refunded')
             ORDER BY b.created_at DESC
             LIMIT 10",
            [$ownerId]
        );
    }

    /** Count bookings by payment status */
    private function getBookingsByPaymentStatus(int $ownerId): array
    {
        $rows = $this->db->fetchAll(
            "SELECT b.payment_status, COUNT(*) AS count, COALESCE(SUM(b.total_price), 0) AS total
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.status NOT IN ('cancelled', 'rejected')
             GROUP BY b.payment_status",
            [$ownerId]
        );

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'status' => $row['payment_status'],
                'count' => (int) $row['count'],
                'total' => round((float) $row['total'], 2),
            ];
        }
        return $result;
    }

    /** Fee breakdown: base price vs service fees vs cleaning fees */
    private function getFeeBreakdown(int $ownerId): array
    {
        $row = $this->db->fetchOne(
            "SELECT
                COALESCE(SUM(b.base_price), 0) AS base,
                COALESCE(SUM(b.service_fee), 0) AS service,
                COALESCE(SUM(b.cleaning_fee), 0) AS cleaning,
                COALESCE(SUM(b.deposit_amount), 0) AS deposits
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ? AND b.payment_status = 'paid'",
            [$ownerId]
        );

        return [
            'base_price' => round((float) $row['base'], 2),
            'service_fee' => round((float) $row['service'], 2),
            'cleaning_fee' => round((float) $row['cleaning'], 2),
            'deposits' => round((float) $row['deposits'], 2),
        ];
    }
}
