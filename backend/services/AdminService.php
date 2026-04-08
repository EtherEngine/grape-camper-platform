<?php

declare(strict_types=1);

namespace Services;

use Core\Database;
use Repositories\BookingRepository;
use Repositories\ReportRepository;
use Repositories\UserRepository;
use Repositories\VehicleRepository;
use RuntimeException;

class AdminService
{
    private Database $db;
    private UserRepository $users;
    private BookingRepository $bookings;
    private VehicleRepository $vehicles;
    private ReportRepository $reports;

    private const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
    private const REPORT_SEVERITIES = ['low', 'medium', 'high', 'critical'];
    private const VEHICLE_STATUSES = ['active', 'inactive', 'archived'];

    public function __construct()
    {
        $this->db = Database::getInstance();
        $this->users = new UserRepository();
        $this->bookings = new BookingRepository();
        $this->vehicles = new VehicleRepository();
        $this->reports = new ReportRepository();
    }

    // ── Users ──────────────────────────────────────────────

    /**
     * List all users with optional filters.
     */
    public function listUsers(?string $role, ?string $active, int $page, int $perPage): array
    {
        $isActive = match ($active) {
            '1', 'true' => true,
            '0', 'false' => false,
            default => null,
        };

        return $this->users->findAll($role, $isActive, $page, $perPage);
    }

    /**
     * Get user detail.
     */
    public function getUser(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new RuntimeException('Nutzer nicht gefunden.', 404);
        }

        unset($user['password_hash']);

        return $user;
    }

    /**
     * Activate a user account.
     */
    public function activateUser(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new RuntimeException('Nutzer nicht gefunden.', 404);
        }

        $this->users->setActive($userId, true);

        return $this->getUser($userId);
    }

    /**
     * Verify an owner account (allow vehicle publishing).
     */
    public function verifyOwner(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new RuntimeException('Nutzer nicht gefunden.', 404);
        }
        if ($user['role_name'] !== 'owner') {
            throw new RuntimeException('Nutzer ist kein Vermieter.', 422);
        }

        $this->users->setOwnerVerified($userId, true);

        return $this->getUser($userId);
    }

    /**
     * Revoke owner verification.
     */
    public function unverifyOwner(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new RuntimeException('Nutzer nicht gefunden.', 404);
        }
        if ($user['role_name'] !== 'owner') {
            throw new RuntimeException('Nutzer ist kein Vermieter.', 422);
        }

        $this->users->setOwnerVerified($userId, false);

        return $this->getUser($userId);
    }

    /**
     * Deactivate a user account. Also kills all sessions.
     */
    public function deactivateUser(int $userId): array
    {
        $user = $this->users->findById($userId);
        if (!$user) {
            throw new RuntimeException('Nutzer nicht gefunden.', 404);
        }
        if ($user['role_name'] === 'admin') {
            throw new RuntimeException('Admin-Konten können nicht deaktiviert werden.', 403);
        }

        $this->db->beginTransaction();
        try {
            $this->users->setActive($userId, false);
            $this->users->deleteUserSessions($userId);
            $this->db->commit();
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw new RuntimeException('Deaktivierung fehlgeschlagen.', 500);
        }

        return $this->getUser($userId);
    }

    // ── Bookings ───────────────────────────────────────────

    /**
     * List all bookings system-wide.
     */
    public function listBookings(?string $status, ?string $paymentStatus, int $page, int $perPage): array
    {
        return $this->bookings->findAllAdmin($status, $paymentStatus, $page, $perPage);
    }

    /**
     * Get full booking detail (admin has global access).
     */
    public function getBooking(int $bookingId): array
    {
        $booking = $this->bookings->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }

        return $booking;
    }

    /**
     * Admin force-cancels a booking.
     */
    public function cancelBooking(int $bookingId, int $adminId, ?string $reason = null): array
    {
        $bookingService = new BookingService();
        return $bookingService->cancel($bookingId, $adminId, $reason ?? 'Durch Admin storniert.');
    }

    // ── Vehicles ───────────────────────────────────────────

    /**
     * List all vehicles system-wide.
     */
    public function listVehicles(?string $status, int $page, int $perPage): array
    {
        return $this->vehicles->findAllAdmin($status, $page, $perPage);
    }

    /**
     * Admin sets a vehicle's status (active / inactive / archived).
     */
    public function moderateVehicle(int $vehicleId, string $status, ?string $reason = null): array
    {
        $vehicle = $this->vehicles->findById($vehicleId);
        if (!$vehicle) {
            throw new RuntimeException('Fahrzeug nicht gefunden.', 404);
        }

        if (!in_array($status, self::VEHICLE_STATUSES, true)) {
            throw new RuntimeException(
                'Ungültiger Status. Erlaubt: ' . implode(', ', self::VEHICLE_STATUSES),
                422
            );
        }

        $this->vehicles->updateStatus($vehicleId, $status);

        return $this->vehicles->findById($vehicleId);
    }

    // ── Reports ────────────────────────────────────────────

    /**
     * List reports with filters.
     */
    public function listReports(?string $status, ?string $type, ?string $severity, int $page, int $perPage): array
    {
        return $this->reports->findAll($status, $type, $severity, $page, $perPage);
    }

    /**
     * Get single report.
     */
    public function getReport(int $reportId): array
    {
        $report = $this->reports->findById($reportId);
        if (!$report) {
            throw new RuntimeException('Report nicht gefunden.', 404);
        }

        return $report;
    }

    /**
     * Create a report (can be created by any user or by admin).
     */
    public function createReport(array $data): array
    {
        if (empty($data['title']) || empty($data['description'])) {
            throw new RuntimeException('Titel und Beschreibung sind erforderlich.', 422);
        }

        $id = $this->reports->create($data);

        return $this->reports->findById($id);
    }

    /**
     * Admin updates a report (status, admin_comment, severity).
     */
    public function updateReport(int $reportId, array $data): array
    {
        $report = $this->reports->findById($reportId);
        if (!$report) {
            throw new RuntimeException('Report nicht gefunden.', 404);
        }

        if (isset($data['status']) && !in_array($data['status'], self::REPORT_STATUSES, true)) {
            throw new RuntimeException(
                'Ungültiger Status. Erlaubt: ' . implode(', ', self::REPORT_STATUSES),
                422
            );
        }
        if (isset($data['severity']) && !in_array($data['severity'], self::REPORT_SEVERITIES, true)) {
            throw new RuntimeException(
                'Ungültige Schwere. Erlaubt: ' . implode(', ', self::REPORT_SEVERITIES),
                422
            );
        }

        $this->reports->update($reportId, $data);

        return $this->reports->findById($reportId);
    }

    /**
     * Get report summary stats.
     */
    public function getReportStats(): array
    {
        return $this->reports->countByStatus();
    }

    // ── Dashboard stats ────────────────────────────────────

    /**
     * Aggregate dashboard metrics.
     */
    public function getDashboardStats(): array
    {
        $userCount = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM users")['c'] ?? 0);
        $activeUsers = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM users WHERE is_active = 1")['c'] ?? 0);
        $vehicleCount = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM vehicles")['c'] ?? 0);
        $activeVehicles = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM vehicles WHERE status = 'active'")['c'] ?? 0);
        $bookingCount = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM bookings")['c'] ?? 0);
        $revenue = (float) ($this->db->fetchOne("SELECT COALESCE(SUM(total_price), 0) AS c FROM bookings WHERE payment_status = 'paid'")['c'] ?? 0);
        $openReports = (int) ($this->db->fetchOne("SELECT COUNT(*) AS c FROM system_reports WHERE status IN ('open', 'in_progress')")['c'] ?? 0);
        $pendingOwners = (int) ($this->db->fetchOne(
            "SELECT COUNT(*) AS c FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'owner' AND u.owner_verified = 0"
        )['c'] ?? 0);

        // Monthly revenue trend (last 12 months)
        $revenueTrend = $this->db->fetchAll(
            "SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
                    COUNT(*) AS bookings,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END), 0) AS revenue
             FROM bookings
             WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
             GROUP BY DATE_FORMAT(created_at, '%Y-%m')
             ORDER BY month ASC"
        );

        // Bookings by status
        $bookingsByStatus = $this->db->fetchAll(
            "SELECT status, COUNT(*) AS count FROM bookings GROUP BY status"
        );

        // Monthly user registrations (last 12 months)
        $userTrend = $this->db->fetchAll(
            "SELECT DATE_FORMAT(u.created_at, '%Y-%m') AS month,
                    SUM(CASE WHEN r.name = 'owner' THEN 1 ELSE 0 END) AS owners,
                    SUM(CASE WHEN r.name = 'user' THEN 1 ELSE 0 END) AS renters
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
               AND r.name IN ('owner', 'user')
             GROUP BY DATE_FORMAT(u.created_at, '%Y-%m')
             ORDER BY month ASC"
        );

        // Vehicle type distribution
        $vehicleTypes = $this->db->fetchAll(
            "SELECT vehicle_type, COUNT(*) AS count FROM vehicles GROUP BY vehicle_type"
        );

        // Revenue by payment provider
        $revenueByProvider = $this->db->fetchAll(
            "SELECT p.provider, COALESCE(SUM(p.amount), 0) AS total
             FROM payments p
             WHERE p.status = 'paid'
             GROUP BY p.provider"
        );

        // Top 5 vehicles by revenue
        $topVehicles = $this->db->fetchAll(
            "SELECT v.id, v.title, COALESCE(SUM(b.total_price), 0) AS revenue, COUNT(b.id) AS bookings
             FROM vehicles v
             JOIN bookings b ON b.vehicle_id = v.id AND b.payment_status = 'paid'
             GROUP BY v.id, v.title
             ORDER BY revenue DESC
             LIMIT 5"
        );

        return [
            'users_total' => $userCount,
            'users_active' => $activeUsers,
            'vehicles_total' => $vehicleCount,
            'vehicles_active' => $activeVehicles,
            'bookings_total' => $bookingCount,
            'revenue_total' => round($revenue, 2),
            'reports_open' => $openReports,
            'owners_pending_verification' => $pendingOwners,
            'revenue_trend' => $revenueTrend,
            'bookings_by_status' => $bookingsByStatus,
            'user_trend' => $userTrend,
            'vehicle_types' => $vehicleTypes,
            'revenue_by_provider' => $revenueByProvider,
            'top_vehicles' => $topVehicles,
        ];
    }
}