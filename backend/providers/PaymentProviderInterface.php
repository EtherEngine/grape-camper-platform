<?php

declare(strict_types=1);

namespace Providers;

/**
 * Contract for all payment provider adapters.
 *
 * Every provider (PayPal, Stripe, bank_transfer, mock, …) must
 * implement this interface so the PaymentService can swap them
 * transparently.
 */
interface PaymentProviderInterface
{
    /**
     * Return the provider key stored in the DB (e.g. 'paypal', 'stripe').
     */
    public function name(): string;

    /**
     * Initiate a payment. Returns an associative array:
     *
     *  [
     *      'provider_reference' => string,  // external transaction / order ID
     *      'payment_url'        => ?string, // redirect URL for the user (null for server-side)
     *      'status'             => string,  // initial status (e.g. 'initiated', 'pending')
     *      'raw'                => array,   // raw provider response for logging
     *  ]
     *
     * @param  int    $paymentId  Internal payment record ID
     * @param  float  $amount     Amount in cents / base unit
     * @param  string $currency   ISO 4217 (EUR, USD, …)
     * @param  array  $meta       Extra data (booking_id, description, return urls…)
     * @return array
     */
    public function initiate(int $paymentId, float $amount, string $currency, array $meta = []): array;

    /**
     * Capture / confirm a payment that was previously authorized.
     *
     * @param  string $providerReference  External ID from initiate()
     * @return array  ['status' => string, 'raw' => array]
     */
    public function capture(string $providerReference): array;

    /**
     * Refund a captured payment (full or partial).
     *
     * @param  string     $providerReference
     * @param  float|null $amount  null = full refund
     * @return array  ['status' => string, 'refund_reference' => ?string, 'raw' => array]
     */
    public function refund(string $providerReference, ?float $amount = null): array;

    /**
     * Query the current status of a payment at the provider.
     *
     * @param  string $providerReference
     * @return array  ['status' => string, 'raw' => array]
     */
    public function queryStatus(string $providerReference): array;

    /**
     * Verify & parse an incoming webhook payload from the provider.
     * Returns null if the signature is invalid.
     *
     * @param  array  $headers  HTTP headers
     * @param  string $body     Raw request body
     * @return array|null  Parsed event data or null on failure
     */
    public function verifyWebhook(array $headers, string $body): ?array;
}
