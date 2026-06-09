<?php
// =====================================================
// CSAP — add-member.php
// Adds a new member to the database
// =====================================================
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db-config.php';

if ($_SESSION['member_role'] !== 'board') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

$name   = trim($_POST['name']   ?? '');
$email  = trim($_POST['email']  ?? '');
$role   = $_POST['role']   ?? 'member';
$status = $_POST['status'] ?? 'pending';
// A temporary random password — board should send reset link
$tmpPass = password_hash(bin2hex(random_bytes(8)), PASSWORD_BCRYPT);

try {
    $db   = getDB();
    $stmt = $db->prepare('INSERT INTO csap_members (name, email, role, status, password) VALUES (?,?,?,?,?)');
    $stmt->execute([$name, $email, $role, $status, $tmpPass]);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not add member.']);
}
