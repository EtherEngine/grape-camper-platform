-- Migration: Add rental_contracts table + pending_contract booking status
-- Run: C:\xampp\mysql\bin\mysql.exe -u root grape < database/migrations/005_create_rental_contracts.sql

-- 1. Extend bookings.status ENUM to include 'pending_contract'
ALTER TABLE bookings
  MODIFY COLUMN status ENUM(
    'draft',
    'pending_owner_review',
    'pending_payment',
    'pending_contract',
    'confirmed',
    'rejected',
    'cancelled',
    'completed'
  ) NOT NULL DEFAULT 'draft';

-- 2. Create rental_contracts table
CREATE TABLE IF NOT EXISTS rental_contracts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,

    -- Contract status flow: pending_owner → pending_renter → pending_signatures → signed
    status ENUM('pending_owner', 'pending_renter', 'pending_signatures', 'signed', 'cancelled')
        NOT NULL DEFAULT 'pending_owner',

    -- Owner fills: contract body (pre-filled German template, editable)
    contract_text TEXT NOT NULL,

    -- Insurance
    insurance_type ENUM('private', 'commercial') NOT NULL DEFAULT 'private',
    insurance_details TEXT NULL,

    -- Special conditions
    special_conditions TEXT NULL,

    -- Pickup location (revealed to renter only after signing)
    pickup_address VARCHAR(500) NULL,
    pickup_lat DECIMAL(10,8) NULL,
    pickup_lng DECIMAL(11,8) NULL,
    pickup_notes TEXT NULL,

    -- Key handover
    key_handover_details TEXT NULL,

    -- Return location
    return_address VARCHAR(500) NULL,
    return_lat DECIMAL(10,8) NULL,
    return_lng DECIMAL(11,8) NULL,
    return_notes TEXT NULL,

    -- Renter fills: personal details
    renter_full_name VARCHAR(255) NULL,
    renter_address TEXT NULL,
    renter_phone VARCHAR(50) NULL,
    renter_license_number VARCHAR(100) NULL,
    renter_license_expiry DATE NULL,
    renter_id_number VARCHAR(100) NULL,

    -- Signatures (timestamps = confirmed)
    owner_signed_at DATETIME NULL,
    renter_signed_at DATETIME NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_rental_contracts_booking UNIQUE (booking_id),
    CONSTRAINT fk_rental_contracts_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    INDEX idx_rental_contracts_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
