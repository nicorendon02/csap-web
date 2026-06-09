<?php
// =====================================================
// CSAP — login.php
// Session-based login handler for Hostinger
// =====================================================
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$username = trim($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';

if (empty($username) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password are required.']);
    exit;
}

try {
    $db  = getDB();
    $stmt = $db->prepare('SELECT * FROM csap_members WHERE email = ? AND status = "active" LIMIT 1');
    $stmt->execute([$username]);
    $member = $stmt->fetch();

    if ($member && password_verify($password, $member['password'])) {
        // Regenerate session to prevent fixation
        session_regenerate_id(true);
        $_SESSION['member_id']   = $member['id'];
        $_SESSION['member_name'] = $member['name'];
        $_SESSION['member_role'] = $member['role'];

        // Redirect to admin dashboard
        header('Content-Type: text/html');
        header('Location: ../members.html');
        exit;
    } else {
        http_response_code(401);
        // Redirect back with error flag
        header('Content-Type: text/html');
        header('Location: ../login.html?error=1');
        exit;
    }
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error. Please try again later.']);
    exit;
}
