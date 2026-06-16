<?php
// =====================================================
// CSAP — checkin.php
// QR scanner check-in: marks an attendee as checked in.
// POST /php/events/checkin.php
// Access: admin, superuser
// POST params: event_id, puid
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

$eventId = (int)  ($_POST['event_id'] ?? 0);
$puid    = trim($_POST['puid']    ?? '');

if ($eventId <= 0 || !preg_match('/^\d{10}$/', $puid)) {
    http_response_code(400);
    echo json_encode(['error' => 'Valid event_id and 10-digit PUID are required.']);
    exit;
}

try {
    $db = getDB();

    // Look up the registration
    $stmt = $db->prepare(
        'SELECT id, first_name, last_name, guests, entry_ticket, food_ticket, checked_in
         FROM csap_registrations
         WHERE event_id = ? AND puid = ?
         LIMIT 1'
    );
    $stmt->execute([$eventId, $puid]);
    $reg = $stmt->fetch();

    if (!$reg) {
        http_response_code(404);
        echo json_encode([
            'error'  => 'not_found',
            'message'=> 'No registration found for this PUID at this event.',
        ]);
        exit;
    }

    if ((int) $reg['checked_in'] === 1) {
        // Already checked in — return warning with info
        echo json_encode([
            'already_checked_in' => true,
            'first_name'         => $reg['first_name'],
            'last_name'          => $reg['last_name'],
            'guests'             => (int) $reg['guests'],
            'puid'               => $puid,
        ]);
        exit;
    }

    // Mark as checked in
    $db->prepare(
        'UPDATE csap_registrations
         SET checked_in = 1, checked_in_at = NOW()
         WHERE id = ?'
    )->execute([$reg['id']]);

    auditLog($db, 'event.checkin', $eventId, ['puid' => $puid]);

    echo json_encode([
        'success'    => true,
        'first_name' => $reg['first_name'],
        'last_name'  => $reg['last_name'],
        'guests'     => (int) $reg['guests'],
        'entry_ticket'=> (int) $reg['entry_ticket'],
        'food_ticket' => (int) $reg['food_ticket'],
        'puid'       => $puid,
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'server', 'message' => 'Server error. Please try again.']);
}
