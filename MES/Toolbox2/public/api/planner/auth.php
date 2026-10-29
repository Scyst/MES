<?php
require_once 'db_helper.php';

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'me') {
    // Return current session user
    sendJson(['success' => true, 'user' => $_SESSION['user']]);
} elseif ($action === 'logout') {
    // Destroy session and log out
    session_destroy();
    setcookie("PHPSESSID", "", time() - 3600, "/");
    sendJson(['success' => true]);
} else {
    sendJson(['error' => 'Invalid action'], 400);
}
?>
