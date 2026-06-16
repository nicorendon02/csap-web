<?php
// =====================================================
// CSAP — auth.php
// Shared authentication & authorization guards.
// Include this at the top of every protected endpoint.
// =====================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Abort with 401 and redirect to login if no session exists.
 * For JSON endpoints, pass $json = true to get a JSON error instead.
 */
function requireLogin(bool $json = false): void {
    if (empty($_SESSION['user_id'])) {
        if ($json) {
            http_response_code(401);
            echo json_encode(['error' => 'Authentication required.']);
            exit;
        }
        header('Location: ../login.html?error=session');
        exit;
    }
}

/**
 * Abort with 403 if the logged-in user's role is not in $allowed.
 *
 * Usage:
 *   requireRole(['admin', 'superuser']);   // admin OR superuser may proceed
 *   requireRole(['admin']);                // admin only
 */
function requireRole(array $allowed, bool $json = true): void {
    requireLogin($json);
    $role = $_SESSION['user_role'] ?? '';
    if (!in_array($role, $allowed, true)) {
        if ($json) {
            http_response_code(403);
            echo json_encode(['error' => 'Insufficient permissions.']);
        } else {
            http_response_code(403);
            echo 'Access denied.';
        }
        exit;
    }
}

/**
 * Return current user's role from session (empty string if not logged in).
 */
function currentRole(): string {
    return $_SESSION['user_role'] ?? '';
}

/**
 * Return current user's ID (null if not logged in).
 */
function currentUserId(): ?int {
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

/**
 * Write an entry to csap_audit_log.
 * Call this after any sensitive operation (create / update / delete / promote).
 */
function auditLog(PDO $db, string $action, ?int $targetId = null, ?array $detail = null): void {
    try {
        $stmt = $db->prepare(
            'INSERT INTO csap_audit_log (actor_id, action, target_id, detail)
             VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            currentUserId(),
            $action,
            $targetId,
            $detail ? json_encode($detail) : null,
        ]);
    } catch (\Exception $e) {
        // Audit failure must not block the main operation
    }
}
