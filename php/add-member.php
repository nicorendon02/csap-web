<?php
// =====================================================
// CSAP — add-member.php
// Creates a new user account.
// POST /php/add-member.php
//
// Access: admin, superuser only
// POST params: name, email, role (admin-only field), status
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db-config.php';

requireRole(['admin', 'superuser']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

// ── Input ─────────────────────────────────────────────
$name   = trim($_POST['name']   ?? '');
$email  = trim($_POST['email']  ?? '');
$status = in_array($_POST['status'] ?? '', ['active', 'pending', 'suspended'])
          ? $_POST['status']
          : 'pending';

// Only admins may set a non-default role on creation
$requestedRole = $_POST['role'] ?? 'user';
$validRoles    = ['admin', 'superuser', 'user'];
if (currentRole() === 'admin' && in_array($requestedRole, $validRoles, true)) {
    $role = $requestedRole;
} else {
    $role = 'user';  // superusers always create plain users
}

// ── Validation ────────────────────────────────────────
if (empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid name and email are required.']);
    exit;
}

// Generate a secure temporary password (16 hex chars)
$tmpPassword = bin2hex(random_bytes(8));
$passwordHash = password_hash($tmpPassword, PASSWORD_BCRYPT, ['cost' => 12]);

// ── Insert ────────────────────────────────────────────
try {
    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO csap_users (name, email, password_hash, role, status)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$name, $email, $passwordHash, $role, $status]);
    $newId = (int) $db->lastInsertId();

    auditLog($db, 'user.create', $newId, [
        'name'  => $name,
        'email' => $email,
        'role'  => $role,
    ]);

    echo json_encode([
        'success'      => true,
        'id'           => $newId,
        // Return temp password so admin can relay it to the new user.
        // In production, send this via email instead.
        'temp_password'=> $tmpPassword,
    ]);
} catch (\PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'A user with that email already exists.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Could not create user.']);
    }
}
