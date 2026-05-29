USE smart_alcohol_system;

DROP PROCEDURE IF EXISTS _slmrs_add_col;

DELIMITER //
CREATE PROCEDURE _slmrs_add_col(
  IN p_table VARCHAR(100),
  IN p_col   VARCHAR(100),
  IN p_def   VARCHAR(500)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = p_table
      AND COLUMN_NAME  = p_col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `',
                      p_col, '` ', p_def);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

-- Users: add all missing columns
CALL _slmrs_add_col('Users', 'phone',          'VARCHAR(20) DEFAULT NULL');
CALL _slmrs_add_col('Users', 'address',        'TEXT DEFAULT NULL');
CALL _slmrs_add_col('Users', 'district',       'VARCHAR(100) DEFAULT NULL');
CALL _slmrs_add_col('Users', 'age',            'INT DEFAULT NULL');
CALL _slmrs_add_col('Users', 'dept',           'VARCHAR(255) DEFAULT NULL');
CALL _slmrs_add_col('Users', 'authority_code', 'VARCHAR(100) DEFAULT NULL');

-- BuyerProfiles: add buyer_code and blacklist columns
CALL _slmrs_add_col('BuyerProfiles', 'buyer_code',
  'VARCHAR(12) NULL');
CALL _slmrs_add_col('BuyerProfiles', 'blacklist_status',
  'BOOLEAN DEFAULT FALSE');
CALL _slmrs_add_col('BuyerProfiles', 'blacklist_reason',
  'VARCHAR(255) DEFAULT NULL');
CALL _slmrs_add_col('BuyerProfiles', 'blacklisted_at',
  'TIMESTAMP NULL DEFAULT NULL');
CALL _slmrs_add_col('BuyerProfiles', 'blacklisted_by',
  'INT DEFAULT NULL');
CALL _slmrs_add_col('BuyerProfiles', 'risk_factors',
  'JSON DEFAULT NULL');

DROP PROCEDURE IF EXISTS _slmrs_add_col;

-- Add unique index on buyer_code only if it doesn't already exist
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'BuyerProfiles'
    AND INDEX_NAME   = 'idx_buyer_code'
);
SET @add_idx = IF(
  @idx_exists = 0,
  'ALTER TABLE BuyerProfiles ADD UNIQUE INDEX idx_buyer_code (buyer_code)',
  'SELECT "index already exists" AS info'
);
PREPARE stmt FROM @add_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create Shops table if missing
CREATE TABLE IF NOT EXISTS Shops (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE,
  shop_name       VARCHAR(255) NOT NULL,
  license_number  VARCHAR(100) NOT NULL,
  address         TEXT DEFAULT NULL,
  district        VARCHAR(100) DEFAULT NULL,
  phone           VARCHAR(20) DEFAULT NULL,
  status          ENUM('active','suspended','pending') DEFAULT 'pending',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

SELECT 'Migration complete - all columns and tables verified' AS status;
