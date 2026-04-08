-- Migration: Swap unlock gamification
-- Adds swap_unlocked flag to users and creates unlock_codes table

ALTER TABLE users
  ADD COLUMN swap_unlocked TINYINT(1) NOT NULL DEFAULT 0 AFTER owner_verified,
  ADD COLUMN swap_unlocked_at DATETIME NULL AFTER swap_unlocked,
  ADD COLUMN swap_unlock_method VARCHAR(30) NULL AFTER swap_unlocked_at;

CREATE TABLE IF NOT EXISTS swap_unlock_codes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL,
    created_by INT UNSIGNED NOT NULL,
    redeemed_by INT UNSIGNED NULL,
    redeemed_at DATETIME NULL,
    expires_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unlock_code_creator FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_unlock_code_redeemer FOREIGN KEY (redeemed_by) REFERENCES users(id),
    INDEX idx_unlock_code (code),
    INDEX idx_unlock_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
