<?php
// =====================================================
// CSAP — me.php
// Returns the currently logged-in user as JSON.
// GET /php/me.php
// =====================================================
header('Content-Type: application/json');
require_once __DIR__ . '/auth.php';
requireLogin(true);  // Returns 401 JSON if not logged in

echo json_encode([
    'id'    => (int) $_SESSION['user_id'],
    'name'  => $_SESSION['user_name'],
    'email' => $_SESSION['user_email'],
    'role'  => $_SESSION['user_role'],
]);
