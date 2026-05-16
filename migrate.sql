USE smart_alcohol_system;

DROP PROCEDURE IF EXISTS add_column_if_missing;

DELIMITER //
CREATE PROCEDURE add_column_if_missing(
  IN tbl VARCHAR(100),
  IN col VARCHAR(100),
  IN col_def VARCHAR(500)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', col_def);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //
DELIMITER ;

CALL add_column_if_missing('Users', 'phone',          'VARCHAR(20) DEFAULT NULL');
CALL add_column_if_missing('Users', 'address',        'TEXT DEFAULT NULL');
CALL add_column_if_missing('Users', 'district',       'VARCHAR(100) DEFAULT NULL');
CALL add_column_if_missing('Users', 'age',            'INT DEFAULT NULL');
CALL add_column_if_missing('Users', 'dept',           'VARCHAR(255) DEFAULT NULL');
CALL add_column_if_missing('Users', 'authority_code', 'VARCHAR(100) DEFAULT NULL');
CALL add_column_if_missing('BuyerProfiles', 'blacklist_status', 'BOOLEAN DEFAULT FALSE');

DROP PROCEDURE IF EXISTS add_column_if_missing;

CREATE TABLE IF NOT EXISTS Shops (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL UNIQUE,
  shop_name      VARCHAR(255) NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  address        TEXT         DEFAULT NULL,
  district       VARCHAR(100) DEFAULT NULL,
  phone          VARCHAR(20)  DEFAULT NULL,
  status         ENUM('active','suspended','pending') DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

SELECT 'Migration complete' AS status;
