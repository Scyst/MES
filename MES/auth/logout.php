<?php
// MES/auth/logout.php

session_start();

// 1. ล้างข้อมูล
$_SESSION = array();

// 2. ลบ Cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 3. ทำลาย Session
session_destroy();

// 4. แก้ไข: ส่งกลับไปหน้า Login Form โดยตรง (ไฟล์นี้อยู่ในโฟลเดอร์เดียวกัน)
header("Location: login_form.php");
exit;
?>