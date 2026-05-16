-- ============================================================
-- SLMRS Schema Migration — Run this ONCE against the live DB
-- Safe: all statements use IF NOT EXISTS / IF EXISTS guards
-- ============================================================
USE smart_alcohol_system;

-- ─── Add missing columns to Users ────────────────────────────
ALTER TABLE Users ADD COLUMN IF NOT EXISTS phone          VARCHAR(20)   DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS address        TEXT          DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS district       VARCHAR(100)  DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS age            INT           DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS dept           VARCHAR(255)  DEFAULT NULL;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS authority_code VARCHAR(100)  DEFAULT NULL;

-- ─── Add missing column to BuyerProfiles ─────────────────────
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklist_status BOOLEAN DEFAULT FALSE;

-- ─── Shops table (if not already created) ────────────────────
CREATE TABLE IF NOT EXISTS Shops (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    shop_name       VARCHAR(255) NOT NULL,
    license_number  VARCHAR(100) NOT NULL UNIQUE,
    address         TEXT          DEFAULT NULL,
    district        VARCHAR(100)  DEFAULT NULL,
    phone           VARCHAR(20)   DEFAULT NULL,
    status          ENUM('active','suspended','pending') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ─── Performance indexes (idempotent) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_ts ON Transactions (buyer_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_status   ON Transactions (status);
