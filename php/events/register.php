<?php
// =====================================================
// CSAP — register.php
// Public registration form submission.
// POST /php/events/register.php
// POST params: event_id, puid, first_name, last_name, guests
// Returns: registration row + event details (for PDF generation)
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../db-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

// ── Input ─────────────────────────────────────────────
$eventId   = (int)   ($_POST['event_id']   ?? 0);
$puid      = trim($_POST['puid']      ?? '');
$firstName = trim($_POST['first_name'] ?? '');
$lastName  = trim($_POST['last_name']  ?? '');
$guests    = (int)   ($_POST['guests']    ?? 0);

// ── Validation ────────────────────────────────────────
$errors = [];
if ($eventId <= 0)                          $errors[] = 'Invalid event.';
if (!preg_match('/^\d{10}$/', $puid))       $errors[] = 'PUID must be exactly 10 digits.';
if (empty($firstName))                      $errors[] = 'First name is required.';
if (empty($lastName))                       $errors[] = 'Last name is required.';
if ($guests < 0 || $guests > 5)            $errors[] = 'Guests must be between 0 and 5.';

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['error' => implode(' ', $errors)]);
    exit;
}

try {
    $db = getDB();

    // 1. Verify event exists, is active, and registration is still open
    $evStmt = $db->prepare(
        'SELECT id, title, description, category, location,
                DATE_FORMAT(event_date, "%a, %b %d, %Y") AS event_date_formatted,
                DATE_FORMAT(event_date, "%h:%i %p") AS event_time_formatted,
                has_entry_ticket, has_food_ticket,
                registration_closes_at, status
         FROM csap_events WHERE id = ? LIMIT 1'
    );
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch();

    if (!$event || $event['status'] !== 'active') {
        http_response_code(400);
        echo json_encode(['error' => 'This event is no longer accepting registrations.']);
        exit;
    }
    if (
        $event['registration_closes_at'] !== null &&
        strtotime($event['registration_closes_at']) < time()
    ) {
        http_response_code(400);
        echo json_encode(['error' => 'Registration for this event has closed.']);
        exit;
    }

    // 2. Insert registration (ticket types mirror event settings)
    $stmt = $db->prepare(
        'INSERT INTO csap_registrations
             (event_id, puid, first_name, last_name, guests, entry_ticket, food_ticket)
         VALUES (?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $eventId, $puid, $firstName, $lastName, $guests,
        (int) $event['has_entry_ticket'],
        (int) $event['has_food_ticket'],
    ]);
    $regId = (int) $db->lastInsertId();

    // 3. Return full data for client-side PDF generation
    echo json_encode([
        'success'  => true,
        'reg_id'   => $regId,
        'registration' => [
            'id'          => $regId,
            'puid'        => $puid,
            'first_name'  => $firstName,
            'last_name'   => $lastName,
            'guests'      => $guests,
            'entry_ticket'=> (int) $event['has_entry_ticket'],
            'food_ticket' => (int) $event['has_food_ticket'],
        ],
        'event' => $event,
    ]);

} catch (\PDOException $e) {
    if ($e->getCode() === '23000') {
        http_response_code(409);
        echo json_encode(['error' => 'This PUID is already registered for this event. Each person may only register once.']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Registration failed. Please try again.']);
    }
}
