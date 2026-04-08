<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class SwapUnlockRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /* ── Owner progress queries ─────────────────────── */

    public function getOwnerRevenue(int $ownerId): float
    {
        $row = $this->db->fetchOne(
            "SELECT COALESCE(SUM(b.total_price), 0) AS total
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ?
               AND b.payment_status = 'paid'
               AND b.status IN ('confirmed', 'completed')",
            [$ownerId]
        );
        return (float) ($row['total'] ?? 0);
    }

    public function getOwnerCompletedLongBookings(int $ownerId): int
    {
        $row = $this->db->fetchOne(
            "SELECT COUNT(*) AS cnt
             FROM bookings b
             JOIN vehicles v ON v.id = b.vehicle_id
             WHERE v.owner_id = ?
               AND b.status = 'completed'
               AND DATEDIFF(b.end_date, b.start_date) >= 7",
            [$ownerId]
        );
        return (int) ($row['cnt'] ?? 0);
    }

    public function isSwapUnlocked(int $userId): bool
    {
        $row = $this->db->fetchOne(
            'SELECT swap_unlocked FROM users WHERE id = ?',
            [$userId]
        );
        return (bool) ($row['swap_unlocked'] ?? false);
    }

    public function unlockSwap(int $userId, string $method): void
    {
        $this->db->execute(
            'UPDATE users SET swap_unlocked = 1, swap_unlocked_at = NOW(), swap_unlock_method = ? WHERE id = ?',
            [$method, $userId]
        );
    }

    public function lockSwap(int $userId): void
    {
        $this->db->execute(
            'UPDATE users SET swap_unlocked = 0, swap_unlocked_at = NULL, swap_unlock_method = NULL WHERE id = ?',
            [$userId]
        );
    }

    /* ── Unlock codes ───────────────────────────────── */

    public function createCode(string $code, string $email, int $createdBy, ?string $expiresAt): int
    {
        $this->db->execute(
            'INSERT INTO swap_unlock_codes (code, email, created_by, expires_at) VALUES (?, ?, ?, ?)',
            [$code, $email, $createdBy, $expiresAt]
        );
        return $this->db->lastInsertId();
    }

    public function findCodeByCode(string $code): ?array
    {
        return $this->db->fetchOne(
            'SELECT * FROM swap_unlock_codes WHERE code = ?',
            [$code]
        );
    }

    public function redeemCode(int $codeId, int $userId): void
    {
        $this->db->execute(
            'UPDATE swap_unlock_codes SET redeemed_by = ?, redeemed_at = NOW(), is_active = 0 WHERE id = ?',
            [$userId, $codeId]
        );
    }

    public function listCodes(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        $total = (int) $this->db->fetchOne(
            'SELECT COUNT(*) AS cnt FROM swap_unlock_codes',
            []
        )['cnt'];

        $items = $this->db->fetchAll(
            "SELECT c.*,
                    creator.email AS creator_email,
                    redeemer.email AS redeemer_email
             FROM swap_unlock_codes c
             JOIN users creator ON creator.id = c.created_by
             LEFT JOIN users redeemer ON redeemer.id = c.redeemed_by
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?",
            [$perPage, $offset]
        );

        return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
    }

    public function deactivateCode(int $codeId): void
    {
        $this->db->execute(
            'UPDATE swap_unlock_codes SET is_active = 0 WHERE id = ?',
            [$codeId]
        );
    }

    /* ── Admin: list owners with unlock status ──────── */

    public function listOwnersUnlockStatus(int $page = 1, int $perPage = 20): array
    {
        $offset = ($page - 1) * $perPage;

        $total = (int) $this->db->fetchOne(
            "SELECT COUNT(*) AS cnt FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'owner'",
            []
        )['cnt'];

        $items = $this->db->fetchAll(
            "SELECT u.id, u.first_name, u.last_name, u.email,
                    u.swap_unlocked, u.swap_unlocked_at, u.swap_unlock_method,
                    COALESCE(rev.total, 0) AS revenue,
                    COALESCE(comp.cnt, 0) AS completed_long_bookings
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN (
                 SELECT v.owner_id, SUM(b.total_price) AS total
                 FROM bookings b
                 JOIN vehicles v ON v.id = b.vehicle_id
                 WHERE b.payment_status = 'paid' AND b.status IN ('confirmed','completed')
                 GROUP BY v.owner_id
             ) rev ON rev.owner_id = u.id
             LEFT JOIN (
                 SELECT v.owner_id, COUNT(*) AS cnt
                 FROM bookings b
                 JOIN vehicles v ON v.id = b.vehicle_id
                 WHERE b.status = 'completed' AND DATEDIFF(b.end_date, b.start_date) >= 7
                 GROUP BY v.owner_id
             ) comp ON comp.owner_id = u.id
             WHERE r.name = 'owner'
             ORDER BY u.swap_unlocked DESC, rev.total DESC
             LIMIT ? OFFSET ?",
            [$perPage, $offset]
        );

        return ['items' => $items, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
    }
}
