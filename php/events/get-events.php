<?php
// =====================================================
// CSAP — get-events.php
// Returns event list. Public returns active events only.
// With ?admin=1 (+ valid session) returns ALL events
// with registration counts for the dashboard.
// GET /php/events/get-events.php
// GET /php/events/get-events.php?admin=1
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../db-config.php';
require_once __DIR__ . '/../auth.php';

$db        = getDB();
$adminMode = false;

if (
    isset($_GET['admin']) &&
    !empty($_SESSION['user_role']) &&
    in_array($_SESSION['user_role'], ['admin', 'superuser'], true)
) {
    $adminMode = true;
}

try {
    // Current time in Indianapolis (PHP timezone is already set to America/Indiana/Indianapolis).
    // We pass this as a parameter instead of using MySQL NOW(), which runs in UTC on Hostinger
    // and would cause a ~4-hour mismatch against locally-stored Indianapolis datetimes.
    $nowIndy = date('Y-m-d H:i:s');

    if ($adminMode) {
        // Admin view: all events + registration + check-in counts
        $stmt = $db->prepare(
            'SELECT e.*,
                    DATE_FORMAT(e.event_date, "%a, %b %d, %Y") AS event_date_formatted,
                    DATE_FORMAT(e.event_date, "%h:%i %p")      AS event_time_formatted,
                    COUNT(r.id)            AS registration_count,
                    SUM(r.checked_in)      AS checked_in_count,
                    u.name                 AS created_by_name,
                    CASE WHEN e.registration_closes_at IS NULL
                              OR e.registration_closes_at > ?
                         THEN 1 ELSE 0 END AS registration_open
             FROM csap_events e
             LEFT JOIN csap_registrations r ON r.event_id = e.id
             LEFT JOIN csap_users u ON u.id = e.created_by
             GROUP BY e.id
             ORDER BY e.event_date DESC'
        );
        $stmt->execute([$nowIndy]);
    } else {
        // Public view: active events with open registration flag
        $stmt = $db->prepare(
            'SELECT id, title, description, category, location,
                    DATE_FORMAT(event_date, "%a, %b %d, %Y") AS event_date_formatted,
                    DATE_FORMAT(event_date, "%h:%i %p")      AS event_time_formatted,
                    event_date,
                    has_entry_ticket, has_food_ticket,
                    registration_closes_at,
                    CASE WHEN registration_closes_at IS NULL
                              OR registration_closes_at > ?
                         THEN 1 ELSE 0 END AS registration_open,
                    status
             FROM csap_events
             WHERE status = "active"
             ORDER BY event_date ASC'
        );
        $stmt->execute([$nowIndy]);
    }

    echo json_encode($stmt->fetchAll());
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not fetch events.']);
}
