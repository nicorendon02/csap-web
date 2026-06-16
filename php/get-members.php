<?php
// =====================================================
// CSAP — get-members.php
// Returns the full user list as JSON.
// GET /php/get-members.php
//
// Access: admin, superuser, user  (all authenticated users)
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db-config.php';

// All authenticated roles may list users
requireLogin(true);

try {
    $db   = getDB();
    $stmt = $db->query(
        'SELECT
             id,
             name,
             email,
             role,
             status,
             DATE_FORMAT(created_at, "%Y-%m-%d") AS joined,
             DATE_FORMAT(last_login,  "%d %b %Y")  AS last_login
         FROM csap_users
         ORDER BY created_at DESC'
    );
    echo json_encode($stmt->fetchAll());
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not fetch users.']);
}
