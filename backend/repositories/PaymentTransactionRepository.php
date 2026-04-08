<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class PaymentTransactionRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Create a new transaction log entry.
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO payment_transactions
                    (payment_id, transaction_type, external_transaction_id, status, amount, raw_payload)
                VALUES (?, ?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['payment_id'],
            $data['transaction_type'],
            $data['external_transaction_id'] ?? null,
            $data['status'],
            $data['amount'] ?? null,
            isset($data['raw_payload']) ? json_encode($data['raw_payload'], JSON_UNESCAPED_UNICODE) : null,
        ]);

        return $this->db->lastInsertId();
    }

    /**
     * Find a single transaction by ID.
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM payment_transactions WHERE id = ?";
        $row = $this->db->fetchOne($sql, [$id]);

        return $row ? $this->hydrate($row) : null;
    }

    /**
     * Get all transactions for a payment, newest first.
     */
    public function findByPaymentId(int $paymentId): array
    {
        $sql = "SELECT * FROM payment_transactions
                WHERE payment_id = ?
                ORDER BY created_at DESC";

        $rows = $this->db->fetchAll($sql, [$paymentId]);

        return array_map([$this, 'hydrate'], $rows);
    }

    /**
     * Find by external transaction ID (e.g. PayPal capture ID).
     */
    public function findByExternalId(string $externalId): ?array
    {
        $sql = "SELECT * FROM payment_transactions WHERE external_transaction_id = ?";
        $row = $this->db->fetchOne($sql, [$externalId]);

        return $row ? $this->hydrate($row) : null;
    }

    /**
     * Decode JSON payload for a row.
     */
    private function hydrate(array $row): array
    {
        if (isset($row['raw_payload']) && is_string($row['raw_payload'])) {
            $row['raw_payload'] = json_decode($row['raw_payload'], true);
        }
        return $row;
    }
}
