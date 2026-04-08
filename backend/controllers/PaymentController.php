<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Services\PaymentService;
use RuntimeException;

class PaymentController
{
    private PaymentService $paymentService;

    public function __construct()
    {
        $this->paymentService = new PaymentService();
    }

    // ── Initiate ───────────────────────────────────────────

    /**
     * POST /api/payments/initiate — Start a payment for a booking.
     *
     * Body: { booking_id: int, method: "paypal"|"stripe"|"bank_transfer"|"online_banking" }
     */
    public function initiate(Request $request, Response $response): never
    {
        $data = $request->input();
        $bookingId = (int) ($data['booking_id'] ?? 0);
        $method = $data['method'] ?? '';

        if ($bookingId <= 0) {
            $response->error('booking_id ist erforderlich.', 422);
        }
        if ($method === '') {
            $response->error('method ist erforderlich.', 422);
        }

        try {
            $payment = $this->paymentService->initiate($bookingId, $method, Auth::id());
            $response->created($payment, 'Zahlung initiiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Confirm / capture ──────────────────────────────────

    /**
     * PATCH /api/payments/{id}/confirm — Confirm / capture a payment.
     */
    public function confirm(Request $request, Response $response): never
    {
        $paymentId = (int) $request->param('id');

        try {
            $payment = $this->paymentService->confirm($paymentId, Auth::id());
            $response->success($payment, 'Zahlung bestätigt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Refund ─────────────────────────────────────────────

    /**
     * POST /api/payments/{id}/refund — Refund a payment (full or partial).
     *
     * Body: { amount?: float }  (omit for full refund)
     */
    public function refund(Request $request, Response $response): never
    {
        $paymentId = (int) $request->param('id');
        $data = $request->input();
        $amount = isset($data['amount']) ? (float) $data['amount'] : null;

        try {
            $payment = $this->paymentService->refund($paymentId, $amount);
            $response->success($payment, 'Erstattung verarbeitet.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Status sync ────────────────────────────────────────

    /**
     * PATCH /api/payments/{id}/sync — Query provider and sync status.
     */
    public function sync(Request $request, Response $response): never
    {
        $paymentId = (int) $request->param('id');

        try {
            $payment = $this->paymentService->syncStatus($paymentId);
            $response->success($payment, 'Status synchronisiert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Detail ─────────────────────────────────────────────

    /**
     * GET /api/payments/{id} — Payment detail with transactions.
     */
    public function show(Request $request, Response $response): never
    {
        $paymentId = (int) $request->param('id');

        try {
            $payment = $this->paymentService->getPaymentDetail($paymentId, Auth::id());
            $response->success($payment);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Booking payments ───────────────────────────────────

    /**
     * GET /api/bookings/{id}/payments — List all payments for a booking.
     */
    public function bookingPayments(Request $request, Response $response): never
    {
        $bookingId = (int) $request->param('id');

        try {
            $payments = $this->paymentService->getBookingPayments($bookingId, Auth::id());
            $response->success($payments);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── My payments ────────────────────────────────────────

    /**
     * GET /api/payments — List own payments (paginated).
     */
    public function index(Request $request, Response $response): never
    {
        $query = $request->query();
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = min(50, max(1, (int) ($query['per_page'] ?? 20)));
        $status = $query['status'] ?? null;

        $result = $this->paymentService->getUserPayments(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $result['page'], $result['per_page'], $result['total']);
    }

    // ── Webhook ────────────────────────────────────────────

    /**
     * POST /api/webhooks/payment/{provider} — Handle incoming provider webhook.
     *
     * No auth middleware — webhooks come from external providers.
     */
    public function webhook(Request $request, Response $response): never
    {
        $providerKey = $request->param('provider');
        $headers = getallheaders() ?: [];
        $body = file_get_contents('php://input') ?: '';

        try {
            $result = $this->paymentService->handleWebhook($providerKey, $headers, $body);
            $response->success($result, 'Webhook verarbeitet.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}