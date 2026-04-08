<?php

declare(strict_types=1);

namespace Services;

use Repositories\SwapUnlockRepository;
use RuntimeException;

class SwapUnlockService
{
    private SwapUnlockRepository $repo;

    private const REVENUE_THRESHOLD = 3000.00;
    private const LONG_BOOKING_THRESHOLD = 3;
    private const LONG_BOOKING_MIN_DAYS = 7;

    public function __construct()
    {
        $this->repo = new SwapUnlockRepository();
    }

    /**
     * Get the full progress object for an owner.
     */
    public function getProgress(int $ownerId): array
    {
        $unlocked = $this->repo->isSwapUnlocked($ownerId);
        $revenue = $this->repo->getOwnerRevenue($ownerId);
        $longBookings = $this->repo->getOwnerCompletedLongBookings($ownerId);

        $revenuePercent = min(100, round(($revenue / self::REVENUE_THRESHOLD) * 100));
        $bookingsPercent = min(100, round(($longBookings / self::LONG_BOOKING_THRESHOLD) * 100));

        $revenueComplete = $revenue >= self::REVENUE_THRESHOLD;
        $bookingsComplete = $longBookings >= self::LONG_BOOKING_THRESHOLD;
        $qualifies = $revenueComplete || $bookingsComplete;

        // Auto-unlock if conditions met and not yet unlocked
        if ($qualifies && !$unlocked) {
            $method = $revenueComplete ? 'revenue' : 'bookings';
            $this->repo->unlockSwap($ownerId, $method);
            $unlocked = true;
        }

        return [
            'unlocked' => $unlocked,
            'revenue' => [
                'current' => round($revenue, 2),
                'target' => self::REVENUE_THRESHOLD,
                'percent' => $revenuePercent,
                'complete' => $revenueComplete,
            ],
            'bookings' => [
                'current' => $longBookings,
                'target' => self::LONG_BOOKING_THRESHOLD,
                'min_days' => self::LONG_BOOKING_MIN_DAYS,
                'percent' => $bookingsPercent,
                'complete' => $bookingsComplete,
            ],
        ];
    }

    /**
     * Check if a user has swap unlocked (fast check for gating).
     */
    public function isUnlocked(int $userId): bool
    {
        return $this->repo->isSwapUnlocked($userId);
    }

    /**
     * Redeem an unlock code.
     */
    public function redeemCode(int $userId, string $code, string $userEmail): void
    {
        $record = $this->repo->findCodeByCode(trim($code));

        if (!$record) {
            throw new RuntimeException('Ungültiger Freischalt-Code.', 404);
        }

        if (!$record['is_active']) {
            throw new RuntimeException('Dieser Code wurde bereits verwendet oder deaktiviert.', 409);
        }

        if ($record['redeemed_by'] !== null) {
            throw new RuntimeException('Dieser Code wurde bereits eingelöst.', 409);
        }

        if (!empty($record['email']) && strtolower($record['email']) !== strtolower($userEmail)) {
            throw new RuntimeException('Dieser Code ist für eine andere E-Mail-Adresse ausgestellt (' . $record['email'] . ').', 403);
        }

        if ($record['expires_at'] && strtotime($record['expires_at']) < time()) {
            throw new RuntimeException('Dieser Code ist abgelaufen.', 410);
        }

        $this->repo->redeemCode((int) $record['id'], $userId);
        $this->repo->unlockSwap($userId, 'code');
    }

    /* ── Admin methods ──────────────────────────────── */

    public function adminCreateCode(string $email, int $adminId, ?string $expiresAt = null): array
    {
        $code = strtoupper(substr(bin2hex(random_bytes(5)), 0, 10));
        $code = 'SWAP-' . substr($code, 0, 5) . '-' . substr($code, 5);

        $id = $this->repo->createCode($code, $email, $adminId, $expiresAt);

        return $this->repo->findCodeByCode($code);
    }

    public function adminListCodes(int $page = 1, int $perPage = 20): array
    {
        return $this->repo->listCodes($page, $perPage);
    }

    public function adminDeactivateCode(int $codeId): void
    {
        $this->repo->deactivateCode($codeId);
    }

    public function adminToggleUnlock(int $userId, bool $unlock): void
    {
        if ($unlock) {
            $this->repo->unlockSwap($userId, 'admin');
        } else {
            $this->repo->lockSwap($userId);
        }
    }

    public function adminListOwners(int $page = 1, int $perPage = 20): array
    {
        return $this->repo->listOwnersUnlockStatus($page, $perPage);
    }
}
