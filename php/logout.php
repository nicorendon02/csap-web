<?php
// =====================================================
// CSAP — logout.php
// Destroys session and redirects to login
// =====================================================
session_start();
session_destroy();
header('Location: ../login.html');
exit;
