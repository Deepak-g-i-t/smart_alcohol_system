CREATE DATABASE IF NOT EXISTS smart_alcohol_system;
USE smart_alcohol_system;

-- ─── Core Users table (all columns included — do not trim) ──────────────────
CREATE TABLE IF NOT EXISTS Users (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(255) NOT NULL,
    role             ENUM('authority', 'shop', 'buyer') NOT NULL,
    email            VARCHAR(255) UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    shop_location    VARCHAR(255) DEFAULT NULL,
    phone            VARCHAR(20)  DEFAULT NULL,
    address          TEXT         DEFAULT NULL,
    district         VARCHAR(100) DEFAULT NULL,
    age              INT          DEFAULT NULL,
    dept             VARCHAR(255) DEFAULT NULL,
    authority_code   VARCHAR(100) DEFAULT NULL,
    otp_hash         VARCHAR(255) DEFAULT NULL,
    otp_expires_at   TIMESTAMP    NULL DEFAULT NULL,
    created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─── Shops (must exist before BuyerProfiles for FK ordering) ─────────────────
CREATE TABLE IF NOT EXISTS Shops (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    shop_name       VARCHAR(255) NOT NULL,
    license_number  VARCHAR(100) NOT NULL,
    address         TEXT         DEFAULT NULL,
    district        VARCHAR(100) DEFAULT NULL,
    phone           VARCHAR(20)  DEFAULT NULL,
    status          ENUM('active','suspended','pending') DEFAULT 'pending',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- ─── Buyer profiles with extended columns ────────────────────────────────────
CREATE TABLE IF NOT EXISTS BuyerProfiles (
    buyer_id           INT PRIMARY KEY,
    buyer_code         VARCHAR(12) UNIQUE,
    daily_limit        INT DEFAULT 2,
    weekly_limit       INT DEFAULT 10,
    monthly_limit      INT DEFAULT 30,
    daily_remaining    INT DEFAULT 2,
    weekly_remaining   INT DEFAULT 10,
    monthly_remaining  INT DEFAULT 30,
    risk_score         INT DEFAULT 0,
    risk_factors       JSON DEFAULT NULL,                      -- multi-factor breakdown
    blacklist_status   BOOLEAN DEFAULT FALSE,
    blacklist_reason   VARCHAR(255) DEFAULT NULL,
    blacklisted_at     TIMESTAMP NULL DEFAULT NULL,
    blacklisted_by     INT DEFAULT NULL,
    FOREIGN KEY (buyer_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (blacklisted_by) REFERENCES Users(id) ON DELETE SET NULL
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Transactions (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id     INT NOT NULL,
    shop_id      INT NOT NULL,
    alcohol_type VARCHAR(100) NOT NULL,
    quantity     INT NOT NULL,
    status       ENUM('approved', 'rejected') NOT NULL,
    reason       VARCHAR(255) DEFAULT NULL,
    timestamp    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES Users(id),
    FOREIGN KEY (shop_id)  REFERENCES Users(id),
    INDEX idx_buyer_ts  (buyer_id, timestamp),
    INDEX idx_shop_ts   (shop_id,  timestamp),
    INDEX idx_status_ts (status,   timestamp)
);

-- ─── Policies (singleton pattern — only one active row) ──────────────────────
CREATE TABLE IF NOT EXISTS Policies (
    id                     INT AUTO_INCREMENT PRIMARY KEY,
    daily_limit            INT DEFAULT 2,
    weekly_limit           INT DEFAULT 10,
    monthly_limit          INT DEFAULT 30,
    time_restriction_start TIME DEFAULT '10:00:00',
    time_restriction_end   TIME DEFAULT '22:00:00',
    emergency_flag         BOOLEAN DEFAULT FALSE,
    updated_by             INT DEFAULT NULL,
    updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── Shop Inventory (Priority 2.6) ────────────────────────────────────────────
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

-- ─── Notifications (Priority 2.5) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS Notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    type        ENUM('quota_warning','risk_escalation','emergency','policy_change','inventory_low') NOT NULL,
    message     TEXT NOT NULL,
    read_status BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_status)
);

-- ─── Sessions (for future token revocation) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS Sessions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    ip_address  VARCHAR(45) DEFAULT NULL,
    user_agent  TEXT DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    INDEX idx_token    (token_hash),
    INDEX idx_user_exp (user_id, expires_at)
);

-- ─── Seed: default policy row ──────────────────────────────────────────────────
INSERT IGNORE INTO Policies (id, daily_limit, weekly_limit, monthly_limit,
                              time_restriction_start, time_restriction_end, emergency_flag)
VALUES (1, 3, 15, 30, '08:00:00', '23:00:00', FALSE);

-- ─── Seed: demo authority user (password: admin123) ────────────────────────────
INSERT IGNORE INTO Users (id, name, role, email, password_hash)
VALUES (1, 'Rajesh Kumar', 'authority', 'admin@slmrs.gov.in',
        '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
-- Note: above hash is bcrypt('admin123', 12) — change in production!
