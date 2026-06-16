<?php
// =====================================================
// CSAP — get-ticket.php
// Fetch an existing registration by PUID + event_id
// for client-side PDF re-generation (ticket download page).
// POST /php/events/get-ticket.php
// POST params: event_id, puid
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../db-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$eventId = (int)  ($_POST['event_id'] ?? 0);
$puid    = trim($_POST['puid']    ?? '');

if ($eventId <= 0 || !preg_match('/^\d{10}$/', $puid)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid event and 10-digit PUID are required.']);
    exit;
}

try {
    $db   = getDB();
    $stmt = $db->prepare(
        'SELECT r.*,
                e.title             AS event_title,
                e.description       AS event_description,
                e.category          AS event_category,
                e.location          AS event_location,
                DATE_FORMAT(e.event_date, "%a, %b %d, %Y") AS event_date_formatted,
                DATE_FORMAT(e.event_date, "%h:%i %p")      AS event_time_formatted
         FROM csap_registrations r
         JOIN csap_events e ON e.id = r.event_id
         WHERE r.event_id = ? AND r.puid = ?
         LIMIT 1'
    );
    $stmt->execute([$eventId, $puid]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        echo json_encode(['error' => 'No ticket found for that PUID and event. Please check your details and try again.']);
        exit;
    }

    echo json_encode([
        'success'      => true,
        'registration' => [
            'id'          => (int) $row['id'],
            'puid'        => $row['puid'],
            'first_name'  => $row['first_name'],
            'last_name'   => $row['last_name'],
            'guests'      => (int) $row['guests'],
            'entry_ticket'=> (int) $row['entry_ticket'],
            'food_ticket' => (int) $row['food_ticket'],
        ],
        'event' => [
            'id'                   => (int) $row['event_id'],
            'title'                => $row['event_title'],
            'description'          => $row['event_description'],
            'category'             => $row['event_category'],
            'location'             => $row['event_location'],
            'event_date_formatted' => $row['event_date_formatted'],
            'event_time_formatted' => $row['event_time_formatted'],
        ],
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not retrieve ticket. Please try again.']);
}
