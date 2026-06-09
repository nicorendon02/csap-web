<?php
// =====================================================
// CSAP — db-config.php
// Hostinger MySQL database configuration
// =====================================================

// TODO: Replace with your actual Hostinger credentials
define('DB_HOST', 'localhost');
define('DB_NAME', 'csap_db');       // Your Hostinger DB name
define('DB_USER', 'csap_user');     // Your Hostinger DB username
define('DB_PASS', 'YOUR_PASSWORD'); // Your Hostinger DB password
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST, DB_NAME, DB_CHARSET
    );
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (\PDOException $e) {
        // In production, log the error — never expose DB credentials
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed.']);
        exit;
    }
    return $pdo;
}

// ── SQL Schema Reference ──────────────────────────────
/*
CREATE TABLE IF NOT EXISTS csap_members (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(120)  NOT NULL,
    email       VARCHAR(180)  NOT NULL UNIQUE,
    role        ENUM('member','board','alumni') DEFAULT 'member',
    status      ENUM('active','pending','suspended') DEFAULT 'pending',
    password    VARCHAR(255)  NOT NULL,   -- bcrypt hash
    joined_at   DATETIME      DEFAULT CURRENT_TIMESTAMP,
    is_active   TINYINT(1)    DEFAULT 0,
    created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS csap_sessions (
    id          VARCHAR(64)   PRIMARY KEY,
    member_id   INT           NOT NULL,
    created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME      NOT NULL,
    FOREIGN KEY (member_id) REFERENCES csap_members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS csap_events (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(200)  NOT NULL,
    description TEXT,
    location    VARCHAR(200),
    event_date  DATETIME,
    type        ENUM('social','cultural','academic','food','professional','fundraiser') DEFAULT 'social',
    created_at  DATETIME      DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
