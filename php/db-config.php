<?php
// =====================================================
// CSAP — db-config.php
// Hostinger MariaDB configuration + PDO singleton
// =====================================================

// TODO: Replace with your actual Hostinger credentials before deploying.
// Tip: On Hostinger, find these in hPanel → Databases → MySQL Databases.
define('DB_HOST',    '127.0.0.1');
define('DB_NAME',    'u818548468_csap_events');
define('DB_USER',    'u818548468_admin');
define('DB_PASS',    'Csap26xd');
define('DB_CHARSET', 'utf8mb4');

// Timezone: Indianapolis, Indiana (Eastern Time, no DST switch)
date_default_timezone_set('America/Indiana/Indianapolis');

/**
 * Returns a singleton PDO connection.
 * On failure, emits a JSON error and exits (never exposes credentials).
 */
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
        http_response_code(500);
        echo json_encode(['error' => 'Database connection failed.']);
        exit;
    }
    return $pdo;
}

// ── Schema reference ─────────────────────────────────
// Full schema lives in /sql/csap_schema.sql.
// Quick summary:
//
// csap_users
//   id, name, email, password_hash (bcrypt), role ENUM('admin','superuser','user'),
//   status ENUM('active','pending','suspended'), created_at, updated_at, last_login
//
// csap_sessions  — optional DB-backed session store
//   token, user_id (FK→csap_users), ip_address, user_agent, created_at, expires_at
//
// csap_audit_log — immutable record of sensitive actions
//   id, actor_id (FK→csap_users), action, target_id, detail (JSON), created_at
//
// Default seed admin:
//   email    : admin@csap.purdue.edu
//   password : Admin1234!   ← CHANGE ON FIRST LOGIN
