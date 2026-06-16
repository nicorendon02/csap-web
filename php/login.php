<?php
// =====================================================
// CSAP — login.php
// Authenticates a user and starts a PHP session.
// POST params: username (email), password
// =====================================================
require_once __DIR__ . '/db-config.php';

// Start session (auth.php also calls session_start, so we do it here manually
// since this is the login endpoint that creates the session).
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Already logged in? Send straight to dashboard.
if (!empty($_SESSION['user_id'])) {
    header('Location: ../members.html');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../login.html');
    exit;
}

$email    = trim($_POST['username'] ?? '');   // field is named "username" in the form
$password = $_POST['password'] ?? '';

// ── Basic validation ──────────────────────────────────
if (empty($email) || empty($password)) {
    header('Location: ../login.html?error=empty');
    exit;
}

// ── Look up user ──────────────────────────────────────
try {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT id, name, email, password_hash, role, status
         FROM csap_users
         WHERE email = ?
         LIMIT 1'
    );
    $stmt->execute([$email]);
    $user = $stmt->fetch();
} catch (\Exception $e) {
    header('Location: ../login.html?error=server');
    exit;
}

// ── Verify credentials ────────────────────────────────
if (!$user || !password_verify($password, $user['password_hash'])) {
    // Generic message — don't reveal whether the email exists
    header('Location: ../login.html?error=invalid');
    exit;
}

// ── Check account status ──────────────────────────────
if ($user['status'] !== 'active') {
    header('Location: ../login.html?error=inactive');
    exit;
}

// ── Establish session ─────────────────────────────────
// Regenerate ID to prevent session-fixation attacks.
session_regenerate_id(true);

$_SESSION['user_id']   = (int) $user['id'];
$_SESSION['user_name'] = $user['name'];
$_SESSION['user_email']= $user['email'];
$_SESSION['user_role'] = $user['role'];   // 'admin' | 'superuser' | 'user'

// ── Update last_login timestamp ───────────────────────
try {
    $db->prepare('UPDATE csap_users SET last_login = NOW() WHERE id = ?')
       ->execute([$user['id']]);
} catch (\Exception $e) { /* non-critical — continue */ }

// ── Redirect to dashboard ─────────────────────────────
header('Location: ../members.html');
exit;
