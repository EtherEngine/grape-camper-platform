<?php

declare(strict_types=1);

namespace Providers;

/**
 * Mock payment provider for local development & testing.
 *
 * Simulates the full payment lifecycle without any external calls.
 * All payments succeed immediately unless amount equals 0.01 (simulates failure).
 */
class MockPaymentProvider implements PaymentProviderInterface
{
    /** Amount that triggers a simulated failure. */
    private const FAIL_AMOUNT = 0.01;

    public function name(): string
    {
        return 'mock';
    }

    public function initiate(int $paymentId, float $amount, string $currency, array $meta = []): array
    {
        $reference = 'MOCK-' . strtoupper(bin2hex(random_bytes(8)));

        // Simulate failure for a magic amount
        if (abs($amount - self::FAIL_AMOUNT) < 0.001) {
            return [
                'provider_reference' => $reference,
                'payment_url' => null,
                'status' => 'failed',
                'raw' => [
                    'mock' => true,
                    'message' => 'Simulated payment failure (amount = 0.01)',
                    'ref' => $reference,
                ],
            ];
        }

        return [
            'provider_reference' => $reference,
            'payment_url' => "http://localhost/grape/mock-payment?ref={$reference}&amount={$amount}&currency={$currency}",
            'status' => 'pending',
            'raw' => [
                'mock' => true,
                'message' => 'Payment initiated successfully',
                'ref' => $reference,
                'payment_id' => $paymentId,
                'amount' => $amount,
                'currency' => $currency,
                'meta' => $meta,
            ],
        ];
    }

    public function capture(string $providerReference): array
    {
        return [
            'status' => 'paid',
            'raw' => [
                'mock' => true,
                'message' => 'Payment captured successfully',
                'ref' => $providerReference,
            ],
        ];
    }

    public function refund(string $providerReference, ?float $amount = null): array
    {
        $refundRef = 'MOCK-REF-' . strtoupper(bin2hex(random_bytes(6)));

        return [
            'status' => $amount === null ? 'refunded' : 'partially_refunded',
            'refund_reference' => $refundRef,
            'raw' => [
                'mock' => true,
                'message' => $amount === null ? 'Full refund processed' : "Partial refund of {$amount} processed",
                'ref' => $providerReference,
                'refund_reference' => $refundRef,
                'refund_amount' => $amount,
            ],
        ];
    }

    public function queryStatus(string $providerReference): array
    {
        // Mock always reports 'paid' for any existing reference
        return [
            'status' => 'paid',
            'raw' => [
                'mock' => true,
                'message' => 'Status query: paid',
                'ref' => $providerReference,
            ],
        ];
    }

    public function verifyWebhook(array $headers, string $body): ?array
    {
        // Mock accepts any webhook with a JSON body containing 'reference'
        $data = json_decode($body, true);

        if (!is_array($data) || empty($data['reference'])) {
            return null;
        }

        return [
            'event' => $data['event'] ?? 'payment.completed',
            'reference' => $data['reference'],
            'status' => $data['status'] ?? 'paid',
            'amount' => $data['amount'] ?? null,
            'raw' => $data,
        ];
    }
}
