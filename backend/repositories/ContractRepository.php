<?php

declare(strict_types=1);

namespace Repositories;

use Core\Database;

class ContractRepository
{
    private Database $db;

    public function __construct()
    {
        $this->db = Database::getInstance();
    }

    /**
     * Find contract by booking ID.
     */
    public function findByBookingId(int $bookingId): ?array
    {
        $sql = "SELECT rc.*,
                       b.start_date, b.end_date, b.days_count,
                       b.total_price, b.currency, b.swap_discount_value,
                       b.user_id AS renter_id,
                       v.title AS vehicle_title, v.brand AS vehicle_brand,
                       v.model AS vehicle_model, v.license_plate,
                       v.year_of_manufacture, v.vehicle_type,
                       v.owner_id,
                       renter.first_name AS renter_first_name,
                       renter.last_name AS renter_last_name,
                       renter.email AS renter_email,
                       owner.first_name AS owner_first_name,
                       owner.last_name AS owner_last_name,
                       owner.email AS owner_email,
                       owner.phone AS owner_phone,
                       owner.street AS owner_street,
                       owner.house_number AS owner_house_number,
                       owner.postal_code AS owner_postal_code,
                       owner.city AS owner_city,
                       owner.country AS owner_country
                FROM rental_contracts rc
                JOIN bookings b ON b.id = rc.booking_id
                JOIN vehicles v ON v.id = b.vehicle_id
                JOIN users renter ON renter.id = b.user_id
                JOIN users owner ON owner.id = v.owner_id
                WHERE rc.booking_id = ?";

        return $this->db->fetchOne($sql, [$bookingId]);
    }

    /**
     * Find contract by ID.
     */
    public function findById(int $id): ?array
    {
        $sql = "SELECT * FROM rental_contracts WHERE id = ?";
        return $this->db->fetchOne($sql, [$id]);
    }

    /**
     * Create a new contract.
     */
    public function create(array $data): int
    {
        $sql = "INSERT INTO rental_contracts
                    (booking_id, status, contract_text, insurance_type, insurance_details)
                VALUES (?, ?, ?, ?, ?)";

        $this->db->execute($sql, [
            $data['booking_id'],
            $data['status'] ?? 'pending_owner',
            $data['contract_text'],
            $data['insurance_type'] ?? 'private',
            $data['insurance_details'] ?? null,
        ]);

        return (int) $this->db->lastInsertId();
    }

    /**
     * Owner updates contract (text, insurance, locations).
     */
    public function updateOwnerFields(int $bookingId, array $data): int
    {
        $sql = "UPDATE rental_contracts SET
                    contract_text = ?,
                    insurance_type = ?,
                    insurance_details = ?,
                    special_conditions = ?,
                    pickup_address = ?,
                    pickup_lat = ?,
                    pickup_lng = ?,
                    pickup_notes = ?,
                    key_handover_details = ?,
                    return_address = ?,
                    return_lat = ?,
                    return_lng = ?,
                    return_notes = ?
                WHERE booking_id = ?";

        return $this->db->execute($sql, [
            $data['contract_text'],
            $data['insurance_type'] ?? 'private',
            $data['insurance_details'] ?? null,
            $data['special_conditions'] ?? null,
            $data['pickup_address'] ?? null,
            $data['pickup_lat'] ?? null,
            $data['pickup_lng'] ?? null,
            $data['pickup_notes'] ?? null,
            $data['key_handover_details'] ?? null,
            $data['return_address'] ?? null,
            $data['return_lat'] ?? null,
            $data['return_lng'] ?? null,
            $data['return_notes'] ?? null,
            $bookingId,
        ]);
    }

    /**
     * Renter fills personal details.
     */
    public function updateRenterFields(int $bookingId, array $data): int
    {
        $sql = "UPDATE rental_contracts SET
                    renter_full_name = ?,
                    renter_address = ?,
                    renter_phone = ?,
                    renter_license_number = ?,
                    renter_license_expiry = ?,
                    renter_id_number = ?
                WHERE booking_id = ?";

        return $this->db->execute($sql, [
            $data['renter_full_name'],
            $data['renter_address'],
            $data['renter_phone'],
            $data['renter_license_number'],
            $data['renter_license_expiry'],
            $data['renter_id_number'] ?? null,
            $bookingId,
        ]);
    }

    /**
     * Update contract status.
     */
    public function updateStatus(int $bookingId, string $newStatus, string $expectedStatus): int
    {
        $sql = "UPDATE rental_contracts SET status = ? WHERE booking_id = ? AND status = ?";
        return $this->db->execute($sql, [$newStatus, $bookingId, $expectedStatus]);
    }

    /**
     * Record owner signature.
     */
    public function signOwner(int $bookingId): int
    {
        $sql = "UPDATE rental_contracts SET owner_signed_at = NOW() WHERE booking_id = ? AND owner_signed_at IS NULL";
        return $this->db->execute($sql, [$bookingId]);
    }

    /**
     * Record renter signature.
     */
    public function signRenter(int $bookingId): int
    {
        $sql = "UPDATE rental_contracts SET renter_signed_at = NOW() WHERE booking_id = ? AND renter_signed_at IS NULL";
        return $this->db->execute($sql, [$bookingId]);
    }
}
