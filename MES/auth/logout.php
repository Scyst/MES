<?php

session_start();

$_SESSION = array();

if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

session_destroy();

$redirect_url = 'login_form.php';

if (isset($_GET['return_to']) && $_GET['return_to'] === 'dashboard') {
    $redirect_url = '../page/OEE_Dashboard/OEE_Dashboard.php';
}

header("Location: " . $redirect_url);
exit;
?>