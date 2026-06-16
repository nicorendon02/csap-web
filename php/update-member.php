<?php
// =====================================================
// CSAP — update-member.php
// Updates an existing user's profile or role.
// POST /php/update-member.php
//
// Access:
//   admin     — may update name, email, status, AND role
//   superuser — may update name, email, status only (not role)
//   user      — no access (403)
// POST params: id (required), name, email, status, role (admin only)
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
$id     = (int) ($_POST['id'] ?? 0);
$name   = trim($_POST['name']  ?? '');
$email  = trim($_POST['email'] ?? '');
$status = $_POST['status'] ?? '';

if ($id <= 0 || empty($name) || empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid id, name, and email are required.']);
    exit;
}

$validStatuses = ['active', 'pending', 'suspended'];
if (!in_array($status, $validStatuses, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid status value.']);
    exit;
}

// ── Role change (admin only) ──────────────────────────
$roleChange = false;
$newRole    = null;
$validRoles = ['admin', 'superuser', 'user'];
if (currentRole() === 'admin' && isset($_POST['role'])) {
    if (!in_array($_POST['role'], $validRoles, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid role value.']);
        exit;
    }
    $newRole    = $_POST['role'];
    $roleChange = true;
}

// ── Fetch current state for audit diff ────────────────
try {
    $db   = getDB();
    $curr = $db->prepare('SELECT name, email, status, role FROM csap_users WHERE id = ? LIMIT 1');
    $curr->execute([$id]);
    $before = $curr->fetch();

    if (!$before) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    // ── Build UPDATE query dynamically ────────────────
    if ($roleChange) {
        $stmt = $db->prepare(
            'UPDATE csap_users SET name = ?, email = ?, status = ?, role = ?, updated_at = NOW()
             WHERE id = ?'
        );
        $stmt->execute([$name, $email, $status, $newRole, $id]);
    } else {
        $stmt = $db->prepare(
            'UPDATE csap_users SET name = ?, email = ?, status = ?, updated_at = NOW()
             WHERE id = ?'
        );
        $stmt->execute([$name, $email, $status, $id]);
    }

    // ── Audit log ─────────────────────────────────────
    $after = ['name' => $name, 'email' => $email, 'status' => $status];
    if ($roleChange) $after['role'] = $newRole;

    $action = $roleChange ? 'user.role_change' : 'user.update';
    auditLog($db, $action, $id, ['before' => $before, 'after' => $after]);

    echo json_encode(['success' => true]);
} catch (\PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'That email is already in use by another account.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Could not update user.']);
    }
}
