<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Services\AdminService;
use Services\SwapUnlockService;
use RuntimeException;

class AdminController
{
    private AdminService $adminService;
    private SwapUnlockService $swapUnlock;

    public function __construct()
    {
        $this->adminService = new AdminService();
        $this->swapUnlock = new SwapUnlockService();
    }

    // ── Dashboard ──────────────────────────────────────────

    /**
     * GET /api/admin/dashboard — Aggregate stats.
     */
    public function dashboard(Request $request, Response $response): never
    {
        $stats = $this->adminService->getDashboardStats();
        $response->success($stats);
    }

    // ── Users ──────────────────────────────────────────────

    /**
     * GET /api/admin/users — List all users.
     * Query: ?role=owner&active=1&page=1&per_page=20
     */
    public function users(Request $request, Response $response): never
    {
        $role = $request->query('role');
        $active = $request->query('active');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = min(50, max(1, (int) ($request->query('per_page', 20))));

        $result = $this->adminService->listUsers($role, $active, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * GET /api/admin/users/{id} — User detail.
     */
    public function showUser(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');

        try {
            $user = $this->adminService->getUser($userId);
            $response->success($user);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/users/{id}/activate — Activate user.
     */
    public function activateUser(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');

        try {
            $user = $this->adminService->activateUser($userId);
            $response->success($user, 'Nutzer aktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/users/{id}/deactivate — Deactivate user.
     */
    public function deactivateUser(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');

        try {
            $user = $this->adminService->deactivateUser($userId);
            $response->success($user, 'Nutzer deaktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/users/{id}/verify-owner — Verify owner account.
     */
    public function verifyOwner(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');

        try {
            $user = $this->adminService->verifyOwner($userId);
            $response->success($user, 'Vermieter verifiziert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/users/{id}/unverify-owner — Revoke owner verification.
     */
    public function unverifyOwner(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');

        try {
            $user = $this->adminService->unverifyOwner($userId);
            $response->success($user, 'Vermieter-Verifizierung widerrufen.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Bookings ───────────────────────────────────────────

    /**
     * GET /api/admin/bookings — List all bookings system-wide.
     * Query: ?status=confirmed&payment_status=paid&page=1&per_page=20
     */
    public function bookings(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $paymentStatus = $request->query('payment_status');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = min(50, max(1, (int) ($request->query('per_page', 20))));

        $result = $this->adminService->listBookings($status, $paymentStatus, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * GET /api/admin/bookings/{id} — Booking detail.
     */
    public function showBooking(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $booking = $this->adminService->getBooking($bookingId);
            $response->success($booking);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/bookings/{id}/cancel — Admin force-cancel.
     * Body: { "reason"?: "..." }
     */
    public function cancelBooking(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');
        $data = $request->input();
        $reason = $data['reason'] ?? null;

        try {
            $booking = $this->adminService->cancelBooking($bookingId, Auth::id(), $reason);
            $response->success($booking, 'Buchung storniert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Vehicles ───────────────────────────────────────────

    /**
     * GET /api/admin/vehicles — already handled by VehicleController::adminIndex
     * This method exists for admin moderation actions.
     */

    /**
     * PATCH /api/admin/vehicles/{id}/moderate — Set vehicle status.
     * Body: { "status": "active"|"inactive"|"archived", "reason"?: "..." }
     */
    public function moderateVehicle(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $data = $request->input();
        $status = $data['status'] ?? '';
        $reason = $data['reason'] ?? null;

        if ($status === '') {
            $response->error('status ist erforderlich.', 422);
        }

        try {
            $vehicle = $this->adminService->moderateVehicle($vehicleId, $status, $reason);
            $response->success($vehicle, 'Fahrzeugstatus aktualisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Reports ────────────────────────────────────────────

    /**
     * GET /api/admin/reports — List reports.
     * Query: ?status=open&type=abuse&severity=high&page=1&per_page=20
     */
    public function reports(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $type = $request->query('type');
        $severity = $request->query('severity');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = min(50, max(1, (int) ($request->query('per_page', 20))));

        $result = $this->adminService->listReports($status, $type, $severity, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * GET /api/admin/reports/stats — Report summary counts.
     */
    public function reportStats(Request $request, Response $response): never
    {
        $stats = $this->adminService->getReportStats();
        $response->success($stats);
    }

    /**
     * GET /api/admin/reports/{id} — Report detail.
     */
    public function showReport(Request $request, Response $response): never
    {
        $reportId = (int) $request->param('id');

        try {
            $report = $this->adminService->getReport($reportId);
            $response->success($report);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/admin/reports — Create a report.
     * Body: { "title", "description", "report_type"?, "severity"?, "user_id"?, "booking_id"?, "vehicle_id"? }
     */
    public function createReport(Request $request, Response $response): never
    {
        $data = $request->input();

        try {
            $report = $this->adminService->createReport($data);
            $response->created($report, 'Report erstellt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/reports/{id} — Update report (status, comment, severity).
     * Body: { "status"?: "...", "admin_comment"?: "...", "severity"?: "..." }
     */
    public function updateReport(Request $request, Response $response): never
    {
        $reportId = (int) $request->param('id');
        $data = $request->input();

        try {
            $report = $this->adminService->updateReport($reportId, $data);
            $response->success($report, 'Report aktualisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Swap Unlock Management ─────────────────────────────

    /**
     * GET /api/admin/swap-unlock/owners — List owners with unlock status.
     */
    public function swapUnlockOwners(Request $request, Response $response): never
    {
        $page = max(1, (int) ($request->query('page') ?? 1));
        $perPage = min(50, max(1, (int) ($request->query('per_page') ?? 20)));

        $result = $this->swapUnlock->adminListOwners($page, $perPage);
        $response->paginated($result['items'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * PATCH /api/admin/swap-unlock/owners/{id}/toggle — Toggle swap unlock for a user.
     * Body: { "unlocked": true|false }
     */
    public function swapUnlockToggle(Request $request, Response $response): never
    {
        $userId = (int) $request->param('id');
        $unlock = (bool) ($request->input()['unlocked'] ?? false);

        try {
            $this->swapUnlock->adminToggleUnlock($userId, $unlock);
            $response->success(null, $unlock ? 'Tauschoption freigeschaltet.' : 'Tauschoption deaktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/admin/swap-unlock/codes — List all unlock codes.
     */
    public function swapUnlockCodes(Request $request, Response $response): never
    {
        $page = max(1, (int) ($request->query('page') ?? 1));
        $perPage = min(50, max(1, (int) ($request->query('per_page') ?? 20)));

        $result = $this->swapUnlock->adminListCodes($page, $perPage);
        $response->paginated($result['items'], $result['page'], $result['per_page'], $result['total']);
    }

    /**
     * POST /api/admin/swap-unlock/codes — Create an unlock code.
     * Body: { "email": "...", "expires_at"?: "YYYY-MM-DD" }
     */
    public function swapUnlockCreateCode(Request $request, Response $response): never
    {
        $data = $request->input();

        if (empty($data['email'])) {
            $response->error('E-Mail ist erforderlich.', 422);
        }

        try {
            $code = $this->swapUnlock->adminCreateCode(
                $data['email'],
                Auth::id(),
                $data['expires_at'] ?? null
            );
            $response->created($code, 'Freischalt-Code erstellt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/admin/swap-unlock/codes/{id}/deactivate — Deactivate an unlock code.
     */
    public function swapUnlockDeactivateCode(Request $request, Response $response): never
    {
        $codeId = (int) $request->param('id');

        try {
            $this->swapUnlock->adminDeactivateCode($codeId);
            $response->success(null, 'Code deaktiviert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}