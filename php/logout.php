<?php
// =====================================================
// CSAP — logout.php
// Destroys the PHP session and redirects to login page.
// =====================================================
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
// Clear all session variables first
$_SESSION = [];
// Delete the session cookie
if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(
        session_name(), '', time() - 42000,
        $p['path'], $p['domain'], $p['secure'], $p['httponly']
    );
}
session_destroy();
header('Location: ../login.html');
exit;
