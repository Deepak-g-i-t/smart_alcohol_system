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

-- ─── Add buyer_code + blacklist columns to BuyerProfiles ─────
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS buyer_code        VARCHAR(12)  UNIQUE;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklist_status  BOOLEAN      DEFAULT FALSE;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklist_reason  VARCHAR(255) DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklisted_at   TIMESTAMP    NULL DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS blacklisted_by   INT          DEFAULT NULL;
ALTER TABLE BuyerProfiles ADD COLUMN IF NOT EXISTS risk_factors     JSON          DEFAULT NULL;

-- ─── Unique index on buyer_code ──────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_code ON BuyerProfiles (buyer_code);

-- ─── Shops table (if not already created) ────────────────────
CREATE TABLE IF NOT EXISTS Shops (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    shop_name       VARCHAR(255) NOT NULL,
    license_number  VARCHAR(100) NOT NULL,
    address         TEXT          DEFAULT NULL,
    district        VARCHAR(100)  DEFAULT NULL,
    phone           VARCHAR(20)   DEFAULT NULL,
    status          ENUM('active','suspended','pending') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ─── Shop Inventory (if not already in schema.sql) ───────────
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

-- ─── Notifications ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        ENUM('quota_warning','risk_escalation','emergency',
                     'policy_change','inventory_low') NOT NULL,
    message     TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_status)
);

-- ─── Performance indexes (idempotent) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_ts ON Transactions (buyer_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_transactions_status   ON Transactions (status);
