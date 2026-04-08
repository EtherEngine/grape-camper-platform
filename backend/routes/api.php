<?php

declare(strict_types=1);

use Core\Request;
use Core\Response;
use Middleware\AuthMiddleware;
use Middleware\RoleMiddleware;
use Middleware\CsrfMiddleware;

// ── Health Check ───────────────────────────────────────────
$router->get('/api/health', function (Request $req, Response $res) {
    $res->success(['timestamp' => date('c')], 'API is running.');
});

// ── API Routes ─────────────────────────────────────────────
$router->group(['prefix' => '/api', 'middleware' => [CsrfMiddleware::class]], function ($router) {

    // ── Auth (public) ──────────────────────────────────────
    $router->post('/auth/register', [\Controllers\AuthController::class, 'register']);
    $router->post('/auth/login', [\Controllers\AuthController::class, 'login']);

    // ── Auth (protected) ───────────────────────────────────
    $router->post('/auth/logout', [\Controllers\AuthController::class, 'logout'], [AuthMiddleware::class]);
    $router->get('/auth/me', [\Controllers\AuthController::class, 'me'], [AuthMiddleware::class]);

    // ── Vehicles (public) ──────────────────────────────────
    $router->get('/vehicles', [\Controllers\VehicleController::class, 'index']);
    $router->get('/vehicles/{id}', [\Controllers\VehicleController::class, 'show']);

    // ── Availability & Pricing (public) ──────────────────
    $router->get('/vehicles/{id}/availability', [\Controllers\BookingController::class, 'calendar']);
    $router->post('/vehicles/{id}/check-availability', [\Controllers\BookingController::class, 'checkAvailability']);
    $router->post('/vehicles/{id}/price-preview', [\Controllers\BookingController::class, 'pricePreview']);

    // ── Bookings (renter) ──────────────────────────────────
    $router->get('/dashboard', [\Controllers\DashboardController::class, 'renter'], [AuthMiddleware::class]);
    $router->get('/bookings', [\Controllers\BookingController::class, 'myBookings'], [AuthMiddleware::class]);
    $router->post('/bookings', [\Controllers\BookingController::class, 'store'], [AuthMiddleware::class]);
    $router->get('/bookings/{id}', [\Controllers\BookingController::class, 'show'], [AuthMiddleware::class]);
    $router->patch('/bookings/{id}/confirm', [\Controllers\BookingController::class, 'confirm'], [AuthMiddleware::class]);
    $router->patch('/bookings/{id}/cancel', [\Controllers\BookingController::class, 'cancel'], [AuthMiddleware::class]);

    // ── Bookings (owner) ───────────────────────────────────
    $router->get('/owner/dashboard', [\Controllers\DashboardController::class, 'owner'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->get('/owner/revenue', [\Controllers\DashboardController::class, 'ownerRevenue'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->get('/owner/bookings', [\Controllers\BookingController::class, 'ownerBookings'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/bookings/{id}/approve', [\Controllers\BookingController::class, 'approve'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/bookings/{id}/reject', [\Controllers\BookingController::class, 'reject'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/bookings/{id}/complete', [\Controllers\BookingController::class, 'complete'], [AuthMiddleware::class, new RoleMiddleware('owner')]);

    // ── Vehicles (owner) ───────────────────────────────────
    $router->get('/owner/vehicles', [\Controllers\VehicleController::class, 'ownerIndex'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->post('/owner/vehicles', [\Controllers\VehicleController::class, 'store'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->put('/owner/vehicles/{id}', [\Controllers\VehicleController::class, 'update'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/vehicles/{id}/activate', [\Controllers\VehicleController::class, 'activate'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/vehicles/{id}/deactivate', [\Controllers\VehicleController::class, 'deactivate'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/vehicles/{id}/archive', [\Controllers\VehicleController::class, 'archive'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->post('/owner/vehicles/{id}/images', [\Controllers\VehicleController::class, 'addImage'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->delete('/owner/vehicles/{id}/images/{imageId}', [\Controllers\VehicleController::class, 'deleteImage'], [AuthMiddleware::class, new RoleMiddleware('owner')]);

    // ── Availability rules (owner) ─────────────────────────
    $router->get('/owner/vehicles/{id}/availability-rules', [\Controllers\VehicleController::class, 'availabilityRules'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->post('/owner/vehicles/{id}/availability-rules', [\Controllers\VehicleController::class, 'createAvailabilityRule'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->put('/owner/vehicles/{id}/availability-rules/bulk', [\Controllers\VehicleController::class, 'bulkSaveAvailabilityRules'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->put('/owner/vehicles/{id}/availability-rules/{ruleId}', [\Controllers\VehicleController::class, 'updateAvailabilityRule'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->delete('/owner/vehicles/{id}/availability-rules/{ruleId}', [\Controllers\VehicleController::class, 'deleteAvailabilityRule'], [AuthMiddleware::class, new RoleMiddleware('owner')]);

    // ── Swaps (user) ───────────────────────────────────────
    $router->get('/swap-unlock/progress', [\Controllers\SwapController::class, 'unlockProgress'], [AuthMiddleware::class]);
    $router->post('/swap-unlock/redeem', [\Controllers\SwapController::class, 'redeemCode'], [AuthMiddleware::class]);
    $router->get('/swaps', [\Controllers\SwapController::class, 'index'], [AuthMiddleware::class]);
    $router->post('/swaps', [\Controllers\SwapController::class, 'store'], [AuthMiddleware::class]);
    $router->get('/swaps/{id}', [\Controllers\SwapController::class, 'show'], [AuthMiddleware::class]);
    $router->put('/swaps/{id}', [\Controllers\SwapController::class, 'update'], [AuthMiddleware::class]);
    $router->patch('/swaps/{id}/cancel', [\Controllers\SwapController::class, 'cancel'], [AuthMiddleware::class]);
    $router->post('/swaps/{id}/images', [\Controllers\SwapController::class, 'addImage'], [AuthMiddleware::class]);
    $router->delete('/swaps/{id}/images/{imageId}', [\Controllers\SwapController::class, 'deleteImage'], [AuthMiddleware::class]);

    // ── Swaps (owner) ──────────────────────────────────────
    $router->get('/owner/swaps', [\Controllers\SwapController::class, 'ownerIndex'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/swaps/{id}/review', [\Controllers\SwapController::class, 'review'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/swaps/{id}/accept', [\Controllers\SwapController::class, 'accept'], [AuthMiddleware::class, new RoleMiddleware('owner')]);
    $router->patch('/owner/swaps/{id}/reject', [\Controllers\SwapController::class, 'reject'], [AuthMiddleware::class, new RoleMiddleware('owner')]);

    // ── Payments (user) ────────────────────────────────────
    $router->get('/payments', [\Controllers\PaymentController::class, 'index'], [AuthMiddleware::class]);
    $router->post('/payments/initiate', [\Controllers\PaymentController::class, 'initiate'], [AuthMiddleware::class]);
    $router->get('/payments/{id}', [\Controllers\PaymentController::class, 'show'], [AuthMiddleware::class]);
    $router->patch('/payments/{id}/confirm', [\Controllers\PaymentController::class, 'confirm'], [AuthMiddleware::class]);
    $router->patch('/payments/{id}/sync', [\Controllers\PaymentController::class, 'sync'], [AuthMiddleware::class]);
    $router->get('/bookings/{id}/payments', [\Controllers\PaymentController::class, 'bookingPayments'], [AuthMiddleware::class]);

    // ── Payments (admin) ───────────────────────────────────
    $router->post('/payments/{id}/refund', [\Controllers\PaymentController::class, 'refund'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // ── Contracts (both parties) ───────────────────────────
    $router->get('/bookings/{id}/contract', [\Controllers\ContractController::class, 'show'], [AuthMiddleware::class]);
    $router->get('/bookings/{id}/contract/pdf', [\Controllers\ContractController::class, 'pdf'], [AuthMiddleware::class]);
    $router->put('/bookings/{id}/contract', [\Controllers\ContractController::class, 'update'], [AuthMiddleware::class]);
    $router->patch('/bookings/{id}/contract/send', [\Controllers\ContractController::class, 'send'], [AuthMiddleware::class]);
    $router->put('/bookings/{id}/contract/fill', [\Controllers\ContractController::class, 'fill'], [AuthMiddleware::class]);
    $router->patch('/bookings/{id}/contract/sign', [\Controllers\ContractController::class, 'sign'], [AuthMiddleware::class]);

    // ── Webhooks (no auth — external providers) ────────────
    $router->post('/webhooks/payment/{provider}', [\Controllers\PaymentController::class, 'webhook']);

    // ── Vehicles (admin) ───────────────────────────────────
    $router->get('/admin/vehicles', [\Controllers\VehicleController::class, 'adminIndex'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // ── Admin ──────────────────────────────────────────────
    $router->get('/admin/dashboard', [\Controllers\AdminController::class, 'dashboard'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // Users
    $router->get('/admin/users', [\Controllers\AdminController::class, 'users'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->get('/admin/users/{id}', [\Controllers\AdminController::class, 'showUser'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/users/{id}/activate', [\Controllers\AdminController::class, 'activateUser'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/users/{id}/deactivate', [\Controllers\AdminController::class, 'deactivateUser'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/users/{id}/verify-owner', [\Controllers\AdminController::class, 'verifyOwner'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/users/{id}/unverify-owner', [\Controllers\AdminController::class, 'unverifyOwner'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // Bookings
    $router->get('/admin/bookings', [\Controllers\AdminController::class, 'bookings'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->get('/admin/bookings/{id}', [\Controllers\AdminController::class, 'showBooking'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/bookings/{id}/cancel', [\Controllers\AdminController::class, 'cancelBooking'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // Vehicle moderation
    $router->patch('/admin/vehicles/{id}/moderate', [\Controllers\AdminController::class, 'moderateVehicle'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // Reports
    $router->get('/admin/reports', [\Controllers\AdminController::class, 'reports'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->get('/admin/reports/stats', [\Controllers\AdminController::class, 'reportStats'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->post('/admin/reports', [\Controllers\AdminController::class, 'createReport'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->get('/admin/reports/{id}', [\Controllers\AdminController::class, 'showReport'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/reports/{id}', [\Controllers\AdminController::class, 'updateReport'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

    // Swap Unlock Management
    $router->get('/admin/swap-unlock/owners', [\Controllers\AdminController::class, 'swapUnlockOwners'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/swap-unlock/owners/{id}/toggle', [\Controllers\AdminController::class, 'swapUnlockToggle'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->get('/admin/swap-unlock/codes', [\Controllers\AdminController::class, 'swapUnlockCodes'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->post('/admin/swap-unlock/codes', [\Controllers\AdminController::class, 'swapUnlockCreateCode'], [AuthMiddleware::class, new RoleMiddleware('admin')]);
    $router->patch('/admin/swap-unlock/codes/{id}/deactivate', [\Controllers\AdminController::class, 'swapUnlockDeactivateCode'], [AuthMiddleware::class, new RoleMiddleware('admin')]);

});