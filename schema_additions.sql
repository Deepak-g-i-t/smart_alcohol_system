-- ============================================================
-- SLMRS Schema Additions (Task 5 / Task 7)
-- Safe to re-run: all use IF NOT EXISTS / IF EXISTS guards
-- Run after initial schema.sql
-- ============================================================

USE smart_alcohol_system;

-- ─── Add new columns to Users (IF NOT EXISTS via IGNORE trick) ──────────────
ALTER TABLE Users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS district VARCHAR(100) DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS age INT DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS dept VARCHAR(255) DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS authority_code VARCHAR(100) DEFAULT NULL;

-- ─── Add new columns to BuyerProfiles ────────────────────────────────────────
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklist_status BOOLEAN DEFAULT FALSE;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS risk_factors JSON DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklist_reason VARCHAR(255) DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklisted_by INT DEFAULT NULL;

-- ─── Shops table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Shops (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    shop_name       VARCHAR(255) NOT NULL,
    license_number  VARCHAR(100) NOT NULL UNIQUE,
    address         TEXT,
    district        VARCHAR(100),
    phone           VARCHAR(20),
    status          ENUM('active', 'suspended', 'pending') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ─── ShopInventory ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ShopInventory (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    shop_id       INT NOT NULL,
    alcohol_type  VARCHAR(100) NOT NULL,
    stock_qty     INT NOT NULL DEFAULT 0,
    low_threshold INT NOT NULL DEFAULT 10,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE KEY shop_type_unique (shop_id, alcohol_type)
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        ENUM('quota_warning', 'risk_escalation', 'emergency', 'policy_change', 'inventory_low') NOT NULL,
    message     TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_status)
);

-- ─── Performance indexes ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_ts ON Transactions (buyer_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON Transactions (status);
CREATE INDEX IF NOT EXISTS idx_transactions_shop_ts   ON Transactions (shop_id, timestamp);

-- ─── Seed: demo authority user (password: Admin@1234) ────────────────────────
-- bcrypt hash of 'Admin@1234' with 12 rounds
INSERT IGNORE INTO Users (id, name, role, email, password_hash)
VALUES (1, 'Rajesh Kumar', 'authority', 'admin@slmrs.gov.in',
        '$2a$12$8InIgZMTgCvtPH5RUJXj7eFvfNZ1JvZYBiZ7zXiL5C2bM1a9e3.oS');

-- NOTE: Change this password immediately in production.
-- To generate a new hash: node -e "const b=require('bcryptjs');b.hash('YourPassword',12).then(console.log)"
