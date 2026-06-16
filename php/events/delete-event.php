<?php
// =====================================================
// CSAP — delete-event.php
// POST /php/events/delete-event.php
// Access: admin, superuser
// POST params: id
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../auth.php';
require_once __DIR__ . '/../db-config.php';

requireRole(['admin', 'superuser']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$id = (int) ($_POST['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid event id is required.']);
    exit;
}

try {
    $db = getDB();
    // Fetch title for audit before deleting
    $row = $db->prepare('SELECT title FROM csap_events WHERE id = ? LIMIT 1');
    $row->execute([$id]);
    $event = $row->fetch();

    if (!$event) {
        http_response_code(404);
        echo json_encode(['error' => 'Event not found.']);
        exit;
    }

    // Cascades delete registrations via FK
    $db->prepare('DELETE FROM csap_events WHERE id = ?')->execute([$id]);
    auditLog($db, 'event.delete', $id, ['title' => $event['title']]);
    echo json_encode(['success' => true]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not delete event.']);
}
