<?php

declare(strict_types=1);

namespace Services;

use Core\Database;
use Providers\MockPaymentProvider;
use Providers\PaymentProviderInterface;
use Repositories\BookingRepository;
use Repositories\PaymentRepository;
use Repositories\PaymentTransactionRepository;
use RuntimeException;

class PaymentService
{
    private PaymentRepository $paymentRepo;
    private PaymentTransactionRepository $txRepo;
    private BookingRepository $bookingRepo;
    private Database $db;
    private ?BookingService $bookingService = null;

    /** Provider key → class mapping. */
    private const PROVIDER_MAP = [
        'mock' => MockPaymentProvider::class,
        // 'paypal'       => \Providers\PayPalProvider::class,
        // 'stripe'       => \Providers\StripeProvider::class,
        // 'bank_transfer'=> \Providers\BankTransferProvider::class,
        // 'online_banking'=>\Providers\OnlineBankingProvider::class,
    ];

    /** Allowed payment_method values for bookings. */
    private const ALLOWED_METHODS = ['paypal', 'stripe', 'bank_transfer', 'online_banking'];

    /** Valid payment status transitions. */
    private const TRANSITIONS = [
        'initiated' => ['pending', 'paid', 'failed', 'cancelled'],
        'pending' => ['paid', 'failed', 'cancelled'],
        'paid' => ['refunded', 'partially_refunded'],
        'failed' => ['initiated'],                     // retry
        'cancelled' => [],
        'refunded' => [],
        'partially_refunded' => ['refunded'],
    ];

    public function __construct()
    {
        $this->paymentRepo = new PaymentRepository();
        $this->txRepo = new PaymentTransactionRepository();
        $this->bookingRepo = new BookingRepository();
        $this->db = Database::getInstance();
    }

    /** Lazy-load BookingService to avoid circular constructor dependency. */
    private function bookingService(): BookingService
    {
        if ($this->bookingService === null) {
            $this->bookingService = new BookingService();
        }
        return $this->bookingService;
    }

    // ── Provider resolution ────────────────────────────────

    /**
     * Resolve a provider adapter by key.
     * In dev mode or when the requested provider isn't implemented, fall back to mock.
     */
    private function resolveProvider(string $method): PaymentProviderInterface
    {
        // Map booking payment_method → provider key
        $key = $method;

        // If no real provider is registered yet, use mock
        if (!isset(self::PROVIDER_MAP[$key])) {
            $key = 'mock';
        }

        $class = self::PROVIDER_MAP[$key];
        return new $class();
    }

    // ── Public API ─────────────────────────────────────────

    /**
     * Initiate a payment for a booking.
     *
     * @param  int    $bookingId
     * @param  string $method      paypal|stripe|bank_transfer|online_banking
     * @param  int    $userId      Authenticated user (must be booking owner)
     * @return array  The payment record
     */
    public function initiate(int $bookingId, string $method, int $userId): array
    {
        // 1. Validate method
        if (!in_array($method, self::ALLOWED_METHODS, true)) {
            throw new RuntimeException('Ungültige Zahlungsmethode.', 422);
        }

        // 2. Load & validate booking
        $booking = $this->bookingRepo->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }
        if ((int) $booking['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung für diese Buchung.', 403);
        }
        if ($booking['status'] !== 'pending_payment') {
            throw new RuntimeException('Zahlung erst möglich, wenn der Vermieter die Buchung bestätigt hat.', 409);
        }

        // 3. Check for existing active payment
        $existing = $this->paymentRepo->findActiveByBookingId($bookingId);
        if ($existing && in_array($existing['status'], ['initiated', 'pending'], true)) {
            throw new RuntimeException('Es läuft bereits eine Zahlung für diese Buchung.', 409);
        }

        $amount = (float) $booking['total_price'];
        $currency = $booking['currency'] ?? 'EUR';

        $this->db->beginTransaction();

        try {
            // 4. Create payment record
            $paymentId = $this->paymentRepo->create([
                'booking_id' => $bookingId,
                'provider' => $this->mapMethodToProvider($method),
                'amount' => $amount,
                'currency' => $currency,
                'status' => 'initiated',
            ]);

            // 5. Call provider adapter
            $provider = $this->resolveProvider($method);
            $result = $provider->initiate($paymentId, $amount, $currency, [
                'booking_id' => $bookingId,
                'description' => "Buchung #{$bookingId}",
            ]);

            // 6. Update payment with provider data
            if (!empty($result['provider_reference'])) {
                $this->paymentRepo->setProviderReference($paymentId, $result['provider_reference']);
            }
            if (!empty($result['payment_url'])) {
                $this->paymentRepo->setPaymentUrl($paymentId, $result['payment_url']);
            }

            $providerStatus = $result['status'] ?? 'initiated';
            if ($providerStatus !== 'initiated') {
                $this->paymentRepo->updateStatus($paymentId, $providerStatus);
            }

            // 7. Log transaction
            $this->txRepo->create([
                'payment_id' => $paymentId,
                'transaction_type' => 'init',
                'external_transaction_id' => $result['provider_reference'] ?? null,
                'status' => $providerStatus,
                'amount' => $amount,
                'raw_payload' => $result['raw'] ?? [],
            ]);

            // 8. Update booking
            $this->bookingRepo->updatePaymentMethod($bookingId, $method);
            if ($booking['payment_status'] === 'unpaid') {
                $this->bookingRepo->updatePaymentStatus($bookingId, 'initiated');
            }

            // If provider already reports failure
            if ($providerStatus === 'failed') {
                $this->bookingRepo->updatePaymentStatus($bookingId, 'failed');
            }

            $this->db->commit();

            return $this->paymentRepo->findById($paymentId);
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Confirm / capture a payment (e.g. after redirect back from provider).
     */
    public function confirm(int $paymentId, int $userId): array
    {
        $payment = $this->paymentRepo->findById($paymentId);
        if (!$payment) {
            throw new RuntimeException('Zahlung nicht gefunden.', 404);
        }
        if ((int) $payment['user_id'] !== $userId) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }
        if (!in_array($payment['status'], ['initiated', 'pending'], true)) {
            throw new RuntimeException('Zahlung kann in diesem Status nicht bestätigt werden.', 409);
        }

        $provider = $this->resolveProvider($payment['provider']);

        $this->db->beginTransaction();

        try {
            $result = $provider->capture($payment['provider_reference'] ?? '');

            $newStatus = $result['status'] ?? 'paid';
            $this->assertTransition($payment['status'], $newStatus);

            $this->paymentRepo->updateStatus($paymentId, $newStatus);

            $this->txRepo->create([
                'payment_id' => $paymentId,
                'transaction_type' => 'capture',
                'external_transaction_id' => $payment['provider_reference'],
                'status' => $newStatus,
                'amount' => (float) $payment['amount'],
                'raw_payload' => $result['raw'] ?? [],
            ]);

            // Sync booking payment_status
            if ($newStatus === 'paid') {
                $this->bookingRepo->updatePaymentStatus((int) $payment['booking_id'], 'paid');

                // Delegate confirmation decision to BookingService
                $this->bookingService()->tryConfirmBooking((int) $payment['booking_id']);
            } elseif ($newStatus === 'failed') {
                $this->bookingRepo->updatePaymentStatus((int) $payment['booking_id'], 'failed');
            }

            $this->db->commit();

            return $this->paymentRepo->findById($paymentId);
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Refund a payment (full or partial).
     */
    public function refund(int $paymentId, ?float $amount = null): array
    {
        $payment = $this->paymentRepo->findById($paymentId);
        if (!$payment) {
            throw new RuntimeException('Zahlung nicht gefunden.', 404);
        }
        if (!in_array($payment['status'], ['paid', 'partially_refunded'], true)) {
            throw new RuntimeException('Nur bezahlte Zahlungen können erstattet werden.', 409);
        }
        if ($amount !== null && $amount > (float) $payment['amount']) {
            throw new RuntimeException('Erstattungsbetrag übersteigt den Zahlungsbetrag.', 422);
        }

        $provider = $this->resolveProvider($payment['provider']);

        $this->db->beginTransaction();

        try {
            $result = $provider->refund($payment['provider_reference'] ?? '', $amount);

            $newStatus = $result['status'] ?? 'refunded';
            $this->assertTransition($payment['status'], $newStatus);

            $this->paymentRepo->updateStatus($paymentId, $newStatus);

            $this->txRepo->create([
                'payment_id' => $paymentId,
                'transaction_type' => 'refund',
                'external_transaction_id' => $result['refund_reference'] ?? null,
                'status' => $newStatus,
                'amount' => $amount ?? (float) $payment['amount'],
                'raw_payload' => $result['raw'] ?? [],
            ]);

            // Sync booking
            $this->bookingRepo->updatePaymentStatus(
                (int) $payment['booking_id'],
                $newStatus === 'refunded' ? 'refunded' : 'partially_paid'
            );

            $this->db->commit();

            return $this->paymentRepo->findById($paymentId);
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Handle an incoming webhook from a provider.
     */
    public function handleWebhook(string $providerKey, array $headers, string $body): array
    {
        $provider = $this->resolveProvider($providerKey);

        $event = $provider->verifyWebhook($headers, $body);
        if ($event === null) {
            throw new RuntimeException('Webhook-Signatur ungültig.', 400);
        }

        $reference = $event['reference'] ?? null;
        if (!$reference) {
            throw new RuntimeException('Kein Referenz-Feld im Webhook.', 400);
        }

        $payment = $this->paymentRepo->findByProviderReference($reference);
        if (!$payment) {
            throw new RuntimeException('Zahlung für Referenz nicht gefunden.', 404);
        }

        $newStatus = $this->mapWebhookStatus($event['status'] ?? '');

        $this->db->beginTransaction();

        try {
            if ($newStatus && $newStatus !== $payment['status']) {
                $this->assertTransition($payment['status'], $newStatus);
                $this->paymentRepo->updateStatus((int) $payment['id'], $newStatus);

                // Sync booking
                $bookingPaymentStatus = match ($newStatus) {
                    'paid' => 'paid',
                    'failed' => 'failed',
                    'refunded' => 'refunded',
                    'partially_refunded' => 'partially_paid',
                    default => null,
                };
                if ($bookingPaymentStatus) {
                    $this->bookingRepo->updatePaymentStatus((int) $payment['booking_id'], $bookingPaymentStatus);
                }

                // If payment is now paid, evaluate booking confirmation
                if ($newStatus === 'paid') {
                    $this->bookingService()->tryConfirmBooking((int) $payment['booking_id']);
                }
            }

            $this->txRepo->create([
                'payment_id' => (int) $payment['id'],
                'transaction_type' => 'webhook',
                'external_transaction_id' => $reference,
                'status' => $newStatus ?: ($event['status'] ?? 'unknown'),
                'amount' => $event['amount'] ?? null,
                'raw_payload' => $event['raw'] ?? [],
            ]);

            $this->db->commit();

            return ['processed' => true, 'payment_id' => $payment['id'], 'new_status' => $newStatus];
        } catch (\Throwable $e) {
            $this->db->rollback();
            throw $e;
        }
    }

    /**
     * Query payment status at the provider and sync.
     */
    public function syncStatus(int $paymentId): array
    {
        $payment = $this->paymentRepo->findById($paymentId);
        if (!$payment) {
            throw new RuntimeException('Zahlung nicht gefunden.', 404);
        }
        if (in_array($payment['status'], ['refunded', 'cancelled'], true)) {
            return $payment; // terminal states
        }

        $provider = $this->resolveProvider($payment['provider']);
        $result = $provider->queryStatus($payment['provider_reference'] ?? '');

        $newStatus = $this->mapWebhookStatus($result['status'] ?? '');

        if ($newStatus && $newStatus !== $payment['status']) {
            $this->assertTransition($payment['status'], $newStatus);
            $this->paymentRepo->updateStatus($paymentId, $newStatus);

            $this->txRepo->create([
                'payment_id' => $paymentId,
                'transaction_type' => 'manual_update',
                'external_transaction_id' => $payment['provider_reference'],
                'status' => $newStatus,
                'raw_payload' => $result['raw'] ?? [],
            ]);

            // Sync booking payment_status and evaluate confirmation
            $bookingPaymentStatus = match ($newStatus) {
                'paid' => 'paid',
                'failed' => 'failed',
                'refunded' => 'refunded',
                'partially_refunded' => 'partially_paid',
                default => null,
            };
            if ($bookingPaymentStatus) {
                $this->bookingRepo->updatePaymentStatus((int) $payment['booking_id'], $bookingPaymentStatus);
            }
            if ($newStatus === 'paid') {
                $this->bookingService()->tryConfirmBooking((int) $payment['booking_id']);
            }
        }

        return $this->paymentRepo->findById($paymentId);
    }

    // ── Read operations ────────────────────────────────────

    /**
     * Get payment details with transactions.
     */
    public function getPaymentDetail(int $paymentId, int $userId): array
    {
        $payment = $this->paymentRepo->findById($paymentId);
        if (!$payment) {
            throw new RuntimeException('Zahlung nicht gefunden.', 404);
        }

        // Access: booking renter, vehicle owner, or admin
        $booking = $this->bookingRepo->findById((int) $payment['booking_id']);
        $isRenter = (int) $payment['user_id'] === $userId;
        $isOwner = $booking && (int) $booking['owner_id'] === $userId;
        $isAdmin = \Core\Auth::is('admin');

        if (!$isRenter && !$isOwner && !$isAdmin) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        $payment['transactions'] = $this->txRepo->findByPaymentId($paymentId);

        return $payment;
    }

    /**
     * List payments for a booking.
     */
    public function getBookingPayments(int $bookingId, int $userId): array
    {
        $booking = $this->bookingRepo->findById($bookingId);
        if (!$booking) {
            throw new RuntimeException('Buchung nicht gefunden.', 404);
        }

        $isRenter = (int) $booking['user_id'] === $userId;
        $isOwner = (int) $booking['owner_id'] === $userId;
        $isAdmin = \Core\Auth::is('admin');

        if (!$isRenter && !$isOwner && !$isAdmin) {
            throw new RuntimeException('Keine Berechtigung.', 403);
        }

        return $this->paymentRepo->findByBookingId($bookingId);
    }

    /**
     * List payments for a user, paginated.
     */
    public function getUserPayments(int $userId, ?string $status, int $page, int $perPage): array
    {
        $result = $this->paymentRepo->findByUserId($userId, $status, $page, $perPage);

        return [
            'items' => $result['items'],
            'total' => $result['total'],
            'page' => $page,
            'per_page' => $perPage,
        ];
    }

    // ── Helpers ────────────────────────────────────────────

    /**
     * Map booking payment_method → provider enum for DB.
     */
    private function mapMethodToProvider(string $method): string
    {
        return match ($method) {
            'paypal' => 'paypal',
            'stripe' => 'stripe',
            'bank_transfer' => 'bank_transfer',
            'online_banking' => 'online_banking',
            default => 'manual',
        };
    }

    /**
     * Map webhook/provider status strings to our internal status enum.
     */
    private function mapWebhookStatus(string $providerStatus): ?string
    {
        return match (strtolower($providerStatus)) {
            'paid', 'completed', 'captured', 'succeeded' => 'paid',
            'failed', 'denied', 'expired' => 'failed',
            'pending', 'processing' => 'pending',
            'refunded' => 'refunded',
            'partially_refunded' => 'partially_refunded',
            'cancelled', 'canceled', 'voided' => 'cancelled',
            default => null,
        };
    }

    /**
     * Assert a valid status transition.
     */
    private function assertTransition(string $from, string $to): void
    {
        $allowed = self::TRANSITIONS[$from] ?? [];
        if (!in_array($to, $allowed, true)) {
            throw new RuntimeException(
                "Ungültiger Statusübergang: {$from} → {$to}",
                409
            );
        }
    }
}