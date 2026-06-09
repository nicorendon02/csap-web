<?php
// =====================================================
// CSAP — get-members.php
// JSON endpoint: returns member list for admin table
// =====================================================
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/db-config.php';

// Auth check — only board members can access
if (empty($_SESSION['member_id']) || $_SESSION['member_role'] !== 'board') {
    http_response_code(403);
    echo json_encode(['error' => 'Unauthorized.']);
    exit;
}

try {
    $db   = getDB();
    $stmt = $db->query('
        SELECT id, name, email, role, status, is_active as `active`,
               DATE_FORMAT(joined_at, "%Y-%m-%d") as joined
        FROM csap_members
        ORDER BY joined_at DESC
    ');
    $members = $stmt->fetchAll();
    echo json_encode($members);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not fetch members.']);
}
