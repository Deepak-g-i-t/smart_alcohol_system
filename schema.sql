CREATE DATABASE IF NOT EXISTS smart_alcohol_system;
USE smart_alcohol_system;

CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role ENUM('authority', 'shop', 'buyer') NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    shop_location VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE BuyerProfiles (
    buyer_id INT PRIMARY KEY,
    daily_limit INT DEFAULT 2,
    weekly_limit INT DEFAULT 10,
    monthly_limit INT DEFAULT 30,
    daily_remaining INT DEFAULT 2,
    weekly_remaining INT DEFAULT 10,
    monthly_remaining INT DEFAULT 30,
    risk_score INT DEFAULT 0,
    FOREIGN KEY (buyer_id) REFERENCES Users(id) ON DELETE CASCADE
);

CREATE TABLE Transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    shop_id INT NOT NULL,
    alcohol_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    status ENUM('approved', 'rejected') NOT NULL,
    reason VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES Users(id),
    FOREIGN KEY (shop_id) REFERENCES Users(id)
);

CREATE TABLE Policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_limit INT DEFAULT 2,
    weekly_limit INT DEFAULT 10,
    monthly_limit INT DEFAULT 30,
    time_restriction_start TIME DEFAULT '10:00:00',
    time_restriction_end TIME DEFAULT '22:00:00',
    emergency_flag BOOLEAN DEFAULT FALSE,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a default policy to act as initial
INSERT INTO Policies (daily_limit, weekly_limit, monthly_limit, time_restriction_start, time_restriction_end, emergency_flag)
VALUES (3, 15, 30, '08:00:00', '23:00:00', FALSE);
