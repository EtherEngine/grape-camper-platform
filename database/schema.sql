SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS payment_transactions;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS booking_status_history;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS swap_offer_images;
DROP TABLE IF EXISTS swap_offers;
DROP TABLE IF EXISTS availability_rules;
DROP TABLE IF EXISTS vehicle_images;
DROP TABLE IF EXISTS vehicle_features;
DROP TABLE IF EXISTS vehicles;
DROP TABLE IF EXISTS system_reports;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NULL,
    date_of_birth DATE NULL,
    street VARCHAR(150) NULL,
    house_number VARCHAR(20) NULL,
    postal_code VARCHAR(20) NULL,
    city VARCHAR(100) NULL,
    country VARCHAR(100) NULL,
    profile_image_path VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    owner_verified TINYINT(1) NOT NULL DEFAULT 0,
    email_verified_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    INDEX idx_users_role_id (role_id),
    INDEX idx_users_active (is_active),
    INDEX idx_users_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    session_token CHAR(64) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(500) NULL,
    expires_at DATETIME NOT NULL,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_user_sessions_user_id (user_id),
    INDEX idx_user_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    owner_id INT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    vehicle_type ENUM('campervan', 'motorhome', 'caravan', 'offroad', 'other') NOT NULL DEFAULT 'campervan',
    brand VARCHAR(100) NULL,
    model VARCHAR(100) NULL,
    year_of_manufacture SMALLINT UNSIGNED NULL,
    license_plate VARCHAR(30) NULL,
    location_city VARCHAR(100) NOT NULL,
    location_country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    seats TINYINT UNSIGNED NOT NULL DEFAULT 1,
    sleeping_places TINYINT UNSIGNED NOT NULL DEFAULT 1,
    transmission ENUM('manual', 'automatic', 'other') NOT NULL DEFAULT 'manual',
    fuel_type ENUM('diesel', 'petrol', 'electric', 'hybrid', 'gas', 'other') NOT NULL DEFAULT 'diesel',
    pets_allowed TINYINT(1) NOT NULL DEFAULT 0,
    smoking_allowed TINYINT(1) NOT NULL DEFAULT 0,
    minimum_rental_days SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    maximum_rental_days SMALLINT UNSIGNED NULL,
    daily_price DECIMAL(10,2) NOT NULL,
    weekly_price DECIMAL(10,2) NULL,
    monthly_price DECIMAL(10,2) NULL,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cleaning_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    instant_booking_enabled TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('draft', 'active', 'inactive', 'archived') NOT NULL DEFAULT 'draft',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicles_owner
        FOREIGN KEY (owner_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_vehicles_owner_id (owner_id),
    INDEX idx_vehicles_status (status),
    INDEX idx_vehicles_location (location_city, location_country),
    INDEX idx_vehicles_price (daily_price),
    INDEX idx_vehicles_type (vehicle_type),
    INDEX idx_vehicles_featured (is_featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_cover TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_images_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_vehicle_images_vehicle_id (vehicle_id),
    INDEX idx_vehicle_images_sort (vehicle_id, sort_order),
    INDEX idx_vehicle_images_cover (vehicle_id, is_cover)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vehicle_features (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    feature_key VARCHAR(100) NOT NULL,
    feature_value VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_features_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    UNIQUE KEY uq_vehicle_feature (vehicle_id, feature_key),
    INDEX idx_vehicle_features_vehicle_id (vehicle_id),
    INDEX idx_vehicle_features_key (feature_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE availability_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rule_type ENUM('available', 'blocked', 'maintenance', 'owner_reserved') NOT NULL DEFAULT 'blocked',
    reason VARCHAR(255) NULL,
    created_by INT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_availability_rules_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_availability_rules_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_availability_rules_dates CHECK (start_date <= end_date),
    INDEX idx_availability_rules_vehicle_dates (vehicle_id, start_date, end_date),
    INDEX idx_availability_rules_rule_type (rule_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE swap_offers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    booking_id BIGINT UNSIGNED NULL,
    type ENUM('vehicle', 'property', 'other') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    estimated_value DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    available_from DATE NULL,
    available_to DATE NULL,
    status ENUM('pending', 'under_review', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    owner_comment TEXT NULL,
    admin_comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_swap_offers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT chk_swap_offers_dates CHECK (
        available_from IS NULL
        OR available_to IS NULL
        OR available_from <= available_to
    ),
    INDEX idx_swap_offers_user_id (user_id),
    INDEX idx_swap_offers_booking_id (booking_id),
    INDEX idx_swap_offers_status (status),
    INDEX idx_swap_offers_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE swap_offer_images (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    swap_offer_id BIGINT UNSIGNED NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    alt_text VARCHAR(255) NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_swap_offer_images_offer
        FOREIGN KEY (swap_offer_id) REFERENCES swap_offers(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_swap_offer_images_offer_id (swap_offer_id),
    INDEX idx_swap_offer_images_sort (swap_offer_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bookings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    swap_offer_id BIGINT UNSIGNED NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_count INT UNSIGNED NOT NULL,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cleaning_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    swap_discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    payment_method ENUM('paypal', 'stripe', 'bank_transfer', 'online_banking', 'cash', 'none') NOT NULL DEFAULT 'none',
    status ENUM(
        'draft',
        'pending_owner_review',
        'pending_payment',
        'pending_contract',
        'confirmed',
        'rejected',
        'cancelled',
        'completed'
    ) NOT NULL DEFAULT 'draft',
    payment_status ENUM(
        'unpaid',
        'initiated',
        'pending',
        'paid',
        'failed',
        'refunded',
        'partially_paid'
    ) NOT NULL DEFAULT 'unpaid',
    customer_notes TEXT NULL,
    owner_notes TEXT NULL,
    rejection_reason TEXT NULL,
    confirmed_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_swap_offer
        FOREIGN KEY (swap_offer_id) REFERENCES swap_offers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_bookings_dates CHECK (start_date < end_date),
    CONSTRAINT chk_bookings_days CHECK (days_count > 0),
    INDEX idx_bookings_vehicle_dates (vehicle_id, start_date, end_date),
    INDEX idx_bookings_user_id (user_id),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_payment_status (payment_status),
    INDEX idx_bookings_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE swap_offers
ADD CONSTRAINT fk_swap_offers_booking
FOREIGN KEY (booking_id) REFERENCES bookings(id)
ON UPDATE CASCADE
ON DELETE SET NULL;

CREATE TABLE booking_status_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    changed_by INT UNSIGNED NULL,
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_status_history_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_booking_status_history_changed_by
        FOREIGN KEY (changed_by) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_booking_status_history_booking_id (booking_id),
    INDEX idx_booking_status_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    provider ENUM('paypal', 'stripe', 'bank_transfer', 'online_banking', 'manual') NOT NULL,
    provider_reference VARCHAR(190) NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'EUR',
    status ENUM('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'initiated',
    payment_url VARCHAR(500) NULL,
    paid_at DATETIME NULL,
    failed_at DATETIME NULL,
    refunded_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_payments_booking_id (booking_id),
    INDEX idx_payments_provider_reference (provider_reference),
    INDEX idx_payments_status (status),
    INDEX idx_payments_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM('init', 'authorize', 'capture', 'refund', 'webhook', 'manual_update') NOT NULL,
    external_transaction_id VARCHAR(190) NULL,
    status VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NULL,
    raw_payload JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_transactions_payment
        FOREIGN KEY (payment_id) REFERENCES payments(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    INDEX idx_payment_transactions_payment_id (payment_id),
    INDEX idx_payment_transactions_external_id (external_transaction_id),
    INDEX idx_payment_transactions_type (transaction_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    booking_id BIGINT UNSIGNED NULL,
    vehicle_id INT UNSIGNED NULL,
    report_type ENUM('error', 'content', 'abuse', 'payment', 'technical', 'other') NOT NULL DEFAULT 'other',
    title VARCHAR(190) NOT NULL,
    description TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'low',
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    admin_comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_system_reports_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_system_reports_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT fk_system_reports_vehicle
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    INDEX idx_system_reports_status (status),
    INDEX idx_system_reports_type (report_type),
    INDEX idx_system_reports_severity (severity),
    INDEX idx_system_reports_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rental_contracts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT UNSIGNED NOT NULL,
    status ENUM('pending_owner', 'pending_renter', 'pending_signatures', 'signed', 'cancelled')
        NOT NULL DEFAULT 'pending_owner',
    contract_text TEXT NOT NULL,
    insurance_type ENUM('private', 'commercial') NOT NULL DEFAULT 'private',
    insurance_details TEXT NULL,
    special_conditions TEXT NULL,
    pickup_address VARCHAR(500) NULL,
    pickup_lat DECIMAL(10,8) NULL,
    pickup_lng DECIMAL(11,8) NULL,
    pickup_notes TEXT NULL,
    key_handover_details TEXT NULL,
    return_address VARCHAR(500) NULL,
    return_lat DECIMAL(10,8) NULL,
    return_lng DECIMAL(11,8) NULL,
    return_notes TEXT NULL,
    renter_full_name VARCHAR(255) NULL,
    renter_address TEXT NULL,
    renter_phone VARCHAR(50) NULL,
    renter_license_number VARCHAR(100) NULL,
    renter_license_expiry DATE NULL,
    renter_id_number VARCHAR(100) NULL,
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