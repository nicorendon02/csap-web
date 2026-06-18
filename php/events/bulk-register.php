<?php
// =====================================================
// CSAP — bulk-register.php
// Bulk-register attendees from a CSV upload.
// POST /php/events/bulk-register.php
// Form fields:
//   event_id  (int)  — target event
//   csv_file  (file) — CSV with header: PUID, FIRST NAME, LAST NAME
// Returns JSON:
//   { success, event, inserted[], skipped[], invalid[] }
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/../db-config.php';
require_once __DIR__ . '/../auth.php';

// ── Auth guard ────────────────────────────────────────
requireRole(['admin', 'superuser']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

// ── Input ─────────────────────────────────────────────
$eventId = (int) ($_POST['event_id'] ?? 0);

if ($eventId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid event must be selected.']);
    exit;
}

if (
    !isset($_FILES['csv_file']) ||
    $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK
) {
    http_response_code(400);
    echo json_encode(['error' => 'CSV file upload failed or was not provided.']);
    exit;
}

// Basic MIME / extension check
$fileTmp  = $_FILES['csv_file']['tmp_name'];
$fileName = $_FILES['csv_file']['name'];
$fileExt  = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
if (!in_array($fileExt, ['csv', 'txt'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Only .csv files are accepted.']);
    exit;
}

// ── Load & parse CSV ──────────────────────────────────
$csvContent = file_get_contents($fileTmp);
if ($csvContent === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not read uploaded file.']);
    exit;
}

// Normalise line endings
$csvContent = str_replace(["\r\n", "\r"], "\n", $csvContent);
$lines      = explode("\n", trim($csvContent));

if (count($lines) < 2) {
    http_response_code(400);
    echo json_encode(['error' => 'CSV file is empty or has no data rows.']);
    exit;
}

// Skip header row (first line)
array_shift($lines);

// ── DB: verify event ──────────────────────────────────
try {
    $db = getDB();

    $evStmt = $db->prepare(
        'SELECT id, title, description, category, location,
                DATE_FORMAT(event_date, "%a, %b %d, %Y") AS event_date_formatted,
                DATE_FORMAT(event_date, "%h:%i %p")      AS event_time_formatted,
                has_entry_ticket, has_food_ticket, status
         FROM csap_events WHERE id = ? LIMIT 1'
    );
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch();

    if (!$event) {
        http_response_code(404);
        echo json_encode(['error' => 'Event not found.']);
        exit;
    }

    // ── Prepare insert statement ───────────────────────
    // INSERT IGNORE silently skips rows that violate the
    // UNIQUE KEY uq_event_puid (event_id, puid).
    $insStmt = $db->prepare(
        'INSERT IGNORE INTO csap_registrations
             (event_id, puid, first_name, last_name, guests, entry_ticket, food_ticket)
         VALUES (?, ?, ?, ?, 0, ?, ?)'
    );

    $entryTicket = (int) $event['has_entry_ticket'];
    $foodTicket  = (int) $event['has_food_ticket'];

    // ── Process rows ──────────────────────────────────
    $inserted = [];
    $skipped  = [];
    $invalid  = [];
    $rowNum   = 1; // 1-indexed (header was row 1, data starts at 2)

    foreach ($lines as $line) {
        $rowNum++;
        $line = trim($line);
        if ($line === '') continue; // blank trailing lines

        // RFC-4180 aware split (handles quoted fields)
        $fields = str_getcsv($line);

        // Pad missing columns gracefully
        while (count($fields) < 3) $fields[] = '';

        $puid      = trim($fields[0]);
        $firstName = trim($fields[1]);
        $lastName  = trim($fields[2]);

        // ── Validate ───────────────────────────────────
        $rowErrors = [];
        if (!preg_match('/^\d{10}$/', $puid))  $rowErrors[] = 'PUID must be exactly 10 digits';
        if ($firstName === '')                  $rowErrors[] = 'First name is required';
        if ($lastName  === '')                  $rowErrors[] = 'Last name is required';

        if (!empty($rowErrors)) {
            $invalid[] = [
                'row'    => $rowNum,
                'puid'   => $puid,
                'reason' => implode('; ', $rowErrors),
            ];
            continue;
        }

        // ── Insert ─────────────────────────────────────
        $insStmt->execute([$eventId, $puid, $firstName, $lastName, $entryTicket, $foodTicket]);
        $affected = $insStmt->rowCount();

        if ($affected === 0) {
            // INSERT IGNORE suppressed a duplicate
            $skipped[] = [
                'row'    => $rowNum,
                'puid'   => $puid,
                'name'   => "$firstName $lastName",
                'reason' => 'Already registered for this event',
            ];
        } else {
            $inserted[] = [
                'id'          => (int) $db->lastInsertId(),
                'puid'        => $puid,
                'first_name'  => $firstName,
                'last_name'   => $lastName,
                'guests'      => 0,
                'entry_ticket'=> $entryTicket,
                'food_ticket' => $foodTicket,
            ];
        }
    }

    // ── Audit log ──────────────────────────────────────
    auditLog($db, 'event.bulk_register', $eventId, [
        'inserted' => count($inserted),
        'skipped'  => count($skipped),
        'invalid'  => count($invalid),
    ]);

    // ── Response ───────────────────────────────────────
    echo json_encode([
        'success'  => true,
        'event'    => [
            'id'                   => (int) $event['id'],
            'title'                => $event['title'],
            'description'          => $event['description'],
            'category'             => $event['category'],
            'location'             => $event['location'],
            'event_date_formatted' => $event['event_date_formatted'],
            'event_time_formatted' => $event['event_time_formatted'],
        ],
        'inserted' => $inserted,
        'skipped'  => $skipped,
        'invalid'  => $invalid,
    ]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Bulk registration failed. Please try again.']);
}
