<?php
// =====================================================
// CSAP — create-event.php
// POST /php/events/create-event.php
// Access: admin, superuser
// POST params: title, description, category, location,
//              event_date, registration_closes_at,
//              has_entry_ticket, has_food_ticket
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

// ── Input ─────────────────────────────────────────────
$title       = trim($_POST['title']       ?? '');
$description = trim($_POST['description'] ?? '');
$category    = $_POST['category']   ?? 'social';
$location    = trim($_POST['location']    ?? '');
$eventDate   = $_POST['event_date']  ?? null;
$closesAt    = $_POST['registration_closes_at'] ?? null;
$hasEntry    = isset($_POST['has_entry_ticket']) ? 1 : 0;
$hasFood     = isset($_POST['has_food_ticket'])  ? 1 : 0;

$validCategories = ['social','cultural','academic','food','professional','fundraiser'];

if (empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Event title is required.']);
    exit;
}
if (!in_array($category, $validCategories, true)) {
    $category = 'social';
}
// Normalise datetime-local format to MySQL DATETIME
$eventDate = $eventDate ? date('Y-m-d H:i:s', strtotime($eventDate)) : null;
$closesAt  = $closesAt  ? date('Y-m-d H:i:s', strtotime($closesAt))  : null;

try {
    $db   = getDB();
    $stmt = $db->prepare(
        'INSERT INTO csap_events
             (title, description, category, location, event_date,
              registration_closes_at, has_entry_ticket, has_food_ticket,
              status, created_by)
         VALUES (?,?,?,?,?,?,?,?,\'active\',?)'
    );
    $stmt->execute([
        $title, $description, $category, $location, $eventDate,
        $closesAt, $hasEntry, $hasFood, currentUserId(),
    ]);
    $newId = (int) $db->lastInsertId();
    auditLog($db, 'event.create', $newId, ['title' => $title]);
    echo json_encode(['success' => true, 'id' => $newId]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not create event.']);
}
