-- Migration 006: Add owner_verified flag
-- Newly registered owners must be verified by admin before publishing vehicles.

ALTER TABLE users
    ADD COLUMN owner_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

-- Existing owners (role_id = 2) are auto-verified so nothing breaks.
UPDATE users SET owner_verified = 1 WHERE role_id = 2;
