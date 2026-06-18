<?php
// =====================================================
// CSAP — search-attendees.php
// Search registrations by name for manual check-in.
// POST /php/events/search-attendees.php
// Access: admin, superuser
// POST params: event_id (int), query (string, min 2 chars)
// Returns: array of matching registrations
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

$eventId = (int) ($_POST['event_id'] ?? 0);
$query   = trim($_POST['query'] ?? '');

if ($eventId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid event_id is required.']);
    exit;
}

if (mb_strlen($query) < 2) {
    echo json_encode(['results' => []]);
    exit;
}

try {
    $db = getDB();

    // Search first_name, last_name, or puid — LIKE with wildcard
    $like = '%' . $query . '%';

    $stmt = $db->prepare(
        'SELECT id, puid, first_name, last_name, guests,
                entry_ticket, food_ticket,
                checked_in, checked_in_at
         FROM csap_registrations
         WHERE event_id = ?
           AND (
             first_name  LIKE ? OR
             last_name   LIKE ? OR
             CONCAT(first_name, \' \', last_name) LIKE ? OR
             puid        LIKE ?
           )
         ORDER BY last_name ASC, first_name ASC
         LIMIT 20'
    );
    $stmt->execute([$eventId, $like, $like, $like, $like]);
    $rows = $stmt->fetchAll();

    echo json_encode([
        'results' => array_map(fn($r) => [
            'id'           => (int) $r['id'],
            'puid'         => $r['puid'],
            'first_name'   => $r['first_name'],
            'last_name'    => $r['last_name'],
            'guests'       => (int) $r['guests'],
            'entry_ticket' => (int) $r['entry_ticket'],
            'food_ticket'  => (int) $r['food_ticket'],
            'checked_in'   => (int) $r['checked_in'],
            'checked_in_at'=> $r['checked_in_at'],
        ], $rows),
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Search failed. Please try again.']);
}
