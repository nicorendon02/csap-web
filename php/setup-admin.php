<?php
// =====================================================
// CSAP — setup-admin.php
// ONE-TIME USE: Generates a real bcrypt hash and
// sets up the admin account in the database.
// DELETE THIS FILE immediately after running it.
// =====================================================
require_once __DIR__ . '/db-config.php';

$email    = 'admin@csap.purdue.edu';
$password = 'Admin1234!';
$hash     = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

$db = getDB();

// Try to update existing row first
$stmt = $db->prepare("UPDATE csap_users SET password_hash = ?, status = 'active' WHERE email = ?");
$stmt->execute([$hash, $email]);

if ($stmt->rowCount() === 0) {
    // Row didn't exist — insert fresh
    $stmt = $db->prepare(
        "INSERT INTO csap_users (name, email, password_hash, role, status)
         VALUES ('CSAP Admin', ?, ?, 'admin', 'active')"
    );
    $stmt->execute([$email, $hash]);
    echo "<p style='color:green;font-family:monospace;'>✅ Admin account <strong>created</strong>.</p>";
} else {
    echo "<p style='color:green;font-family:monospace;'>✅ Admin password <strong>updated</strong>.</p>";
}

echo "<p style='font-family:monospace;'>
    Email: <strong>{$email}</strong><br>
    Password: <strong>{$password}</strong>
</p>";
echo "<p style='color:red;font-family:monospace;font-weight:bold;'>
    ⚠️  DELETE this file from your server immediately after use!
</p>";
