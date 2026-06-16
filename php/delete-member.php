<?php
// =====================================================
// CSAP — delete-member.php
// Removes (or suspends) a user account.
// POST /php/delete-member.php
//
// Access: admin, superuser only
// POST params:
//   id   (required) — user to delete
//   hard (optional) — if "1", permanently deletes; otherwise sets status = 'suspended'
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

$id   = (int) ($_POST['id']   ?? 0);
$hard = ($_POST['hard'] ?? '0') === '1';

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid user id is required.']);
    exit;
}

// Prevent self-deletion
if ($id === currentUserId()) {
    http_response_code(400);
    echo json_encode(['error' => 'You cannot delete your own account.']);
    exit;
}

try {
    $db = getDB();

    // Fetch name for audit log before deletion
    $fetch = $db->prepare('SELECT name, email, role FROM csap_users WHERE id = ? LIMIT 1');
    $fetch->execute([$id]);
    $target = $fetch->fetch();

    if (!$target) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found.']);
        exit;
    }

    if ($hard) {
        // Hard delete — permanently removes the row
        $db->prepare('DELETE FROM csap_users WHERE id = ?')->execute([$id]);
        $action = 'user.delete_hard';
    } else {
        // Soft delete — suspend the account (preserves history)
        $db->prepare("UPDATE csap_users SET status = 'suspended', updated_at = NOW() WHERE id = ?")
           ->execute([$id]);
        $action = 'user.suspend';
    }

    auditLog($db, $action, $id, $target);
    echo json_encode(['success' => true]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not delete user.']);
}
