<?php
// =====================================================
// CSAP — update-event.php
// POST /php/events/update-event.php
// Access: admin, superuser
// POST params: id (required) + same fields as create-event
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

$id          = (int) ($_POST['id'] ?? 0);
$title       = trim($_POST['title']       ?? '');
$description = trim($_POST['description'] ?? '');
$category    = $_POST['category']   ?? 'social';
$location    = trim($_POST['location']    ?? '');
$eventDate   = $_POST['event_date']  ?? null;
$closesAt    = $_POST['registration_closes_at'] ?? null;
$hasEntry    = isset($_POST['has_entry_ticket']) ? 1 : 0;
$hasFood     = isset($_POST['has_food_ticket'])  ? 1 : 0;
$status      = $_POST['status'] ?? 'active';

$validStatuses    = ['active','closed','cancelled'];
$validCategories  = ['social','cultural','academic','food','professional','fundraiser'];

if ($id <= 0 || empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid id and title are required.']);
    exit;
}
if (!in_array($category, $validCategories, true)) $category = 'social';
if (!in_array($status, $validStatuses, true))     $status   = 'active';

$eventDate = $eventDate ? date('Y-m-d H:i:s', strtotime($eventDate)) : null;
$closesAt  = $closesAt  ? date('Y-m-d H:i:s', strtotime($closesAt))  : null;

try {
    $db   = getDB();
    $stmt = $db->prepare(
        'UPDATE csap_events
         SET title=?, description=?, category=?, location=?, event_date=?,
             registration_closes_at=?, has_entry_ticket=?, has_food_ticket=?,
             status=?, updated_at=NOW()
         WHERE id=?'
    );
    $stmt->execute([
        $title, $description, $category, $location, $eventDate,
        $closesAt, $hasEntry, $hasFood, $status, $id,
    ]);
    auditLog($db, 'event.update', $id, ['title' => $title, 'status' => $status]);
    echo json_encode(['success' => true]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not update event.']);
}
