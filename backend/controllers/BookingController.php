<?php

declare(strict_types=1);

namespace Controllers;

use Core\Auth;
use Core\Request;
use Core\Response;
use Core\Validator;
use Services\AvailabilityService;
use Services\BookingService;
use Services\PricingService;
use RuntimeException;

class BookingController
{
    private AvailabilityService $availability;
    private BookingService $bookingService;
    private PricingService $pricing;

    public function __construct()
    {
        $this->availability = new AvailabilityService();
        $this->bookingService = new BookingService();
        $this->pricing = new PricingService();
    }

    // ── Availability & Pricing (public) ────────────────────

    /**
     * GET /api/vehicles/{id}/availability?start_date=...&end_date=...
     */
    public function calendar(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');

        $validator = new Validator();
        if (
            !$validator->validate([
                'start_date' => $request->query('start_date', ''),
                'end_date' => $request->query('end_date', ''),
            ], [
                'start_date' => 'required|date:Y-m-d',
                'end_date' => 'required|date:Y-m-d|dateAfterOrEqual:start_date',
            ])
        ) {
            $response->validationError($validator->errors());
        }

        try {
            $result = $this->availability->getCalendar(
                $vehicleId,
                $request->query('start_date'),
                $request->query('end_date')
            );
            $response->success($result);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/vehicles/{id}/check-availability
     */
    public function checkAvailability(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $data = $request->input();

        $validator = new Validator();
        if (
            !$validator->validate($data, [
                'start_date' => 'required|date:Y-m-d',
                'end_date' => 'required|date:Y-m-d|dateAfter:start_date',
            ])
        ) {
            $response->validationError($validator->errors());
        }

        $excludeBookingId = isset($data['exclude_booking_id'])
            ? (int) $data['exclude_booking_id']
            : null;

        try {
            $result = $this->availability->checkAvailability(
                $vehicleId,
                $data['start_date'],
                $data['end_date'],
                $excludeBookingId
            );
            $response->success($result);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * POST /api/vehicles/{id}/price-preview
     */
    public function pricePreview(Request $request, Response $response): never
    {
        $vehicleId = (int) $request->param('id');
        $data = $request->input();

        $validator = new Validator();
        if (
            !$validator->validate($data, [
                'start_date' => 'required|date:Y-m-d',
                'end_date' => 'required|date:Y-m-d|dateAfter:start_date',
            ])
        ) {
            $response->validationError($validator->errors());
        }

        try {
            $result = $this->pricing->calculate($vehicleId, $data['start_date'], $data['end_date']);
            $response->success($result, 'Preisvorschau berechnet.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    // ── Booking CRUD ───────────────────────────────────────

    /**
     * POST /api/bookings — Create a new booking.
     * Body: { "vehicle_id": int, "start_date": "...", "end_date": "...", "customer_notes"?: "..." }
     */
    public function store(Request $request, Response $response): never
    {
        $data = $request->input();

        $validator = new Validator();
        $rules = [
            'vehicle_id' => 'required|integer|minValue:1',
            'start_date' => 'required|date:Y-m-d',
            'end_date' => 'required|date:Y-m-d|dateAfter:start_date',
            'customer_notes' => 'nullable|string|max:1000',
            'payment_method' => 'nullable|string|in:paypal,stripe,bank_transfer,online_banking,none',
        ];

        if (!$validator->validate($data, $rules)) {
            $response->validationError($validator->errors());
        }

        // Validate swap_offer sub-object if present
        $swapOffer = null;
        if (!empty($data['swap_offer']) && is_array($data['swap_offer'])) {
            $swapValidator = new Validator();
            if (
                !$swapValidator->validate($data['swap_offer'], [
                    'type' => 'required|string|in:vehicle,property,other',
                    'title' => 'required|string|max:150',
                    'description' => 'required|string',
                    'estimated_value' => 'required|numeric|minValue:0.01',
                    'available_from' => 'nullable|string',
                    'available_to' => 'nullable|string',
                ])
            ) {
                $response->validationError($swapValidator->errors());
            }
            $swapOffer = $data['swap_offer'];
        }

        try {
            $booking = $this->bookingService->createBooking(
                (int) $data['vehicle_id'],
                Auth::id(),
                $data['start_date'],
                $data['end_date'],
                $data['customer_notes'] ?? null,
                $swapOffer,
                $data['payment_method'] ?? null
            );
            $response->created($booking, 'Buchung erfolgreich erstellt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/bookings/{id} — Get booking detail.
     */
    public function show(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $booking = $this->bookingService->getBookingForUser($id, Auth::id());
            $response->success($booking);
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * GET /api/bookings — List bookings for the current renter.
     */
    public function myBookings(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 20))));

        $result = $this->bookingService->listForRenter(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    /**
     * GET /api/owner/bookings — List bookings on owner's vehicles.
     */
    public function ownerBookings(Request $request, Response $response): never
    {
        $status = $request->query('status');
        $page = max(1, (int) ($request->query('page', 1)));
        $perPage = max(1, min(100, (int) ($request->query('per_page', 20))));

        $result = $this->bookingService->listForOwner(Auth::id(), $status, $page, $perPage);

        $response->paginated($result['items'], $page, $perPage, $result['total']);
    }

    // ── Status transitions ─────────────────────────────────

    /**
     * PATCH /api/owner/bookings/{id}/approve — Owner approves.
     */
    public function approve(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $booking = $this->bookingService->approve($id, Auth::id());
            $response->success($booking, 'Buchung bestätigt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/bookings/{id}/reject — Owner rejects.
     * Body: { "reason"?: "..." }
     */
    public function reject(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();
        $reason = $data['reason'] ?? null;

        try {
            $booking = $this->bookingService->reject($id, Auth::id(), $reason);
            $response->success($booking, 'Buchung abgelehnt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/bookings/{id}/confirm — Confirm (payment received).
     */
    public function confirm(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $booking = $this->bookingService->confirm($id, Auth::id());
            $response->success($booking, 'Buchung bestätigt.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/bookings/{id}/cancel — Cancel booking.
     * Body: { "comment"?: "..." }
     */
    public function cancel(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');
        $data = $request->input();
        $comment = $data['comment'] ?? null;

        try {
            $booking = $this->bookingService->cancel($id, Auth::id(), $comment);
            $response->success($booking, 'Buchung storniert.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }

    /**
     * PATCH /api/owner/bookings/{id}/complete — Mark as completed.
     */
    public function complete(Request $request, Response $response): never
    {
        $id = (int) $request->param('id');

        try {
            $booking = $this->bookingService->complete($id, Auth::id());
            $response->success($booking, 'Buchung abgeschlossen.');
        } catch (RuntimeException $e) {
            $response->error($e->getMessage(), $e->getCode() ?: 400);
        }
    }
}