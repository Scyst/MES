<?php
// MES/auth/logout.php

session_start();

// 1. [NEW] จำหน้าล่าสุดไว้ก่อนทำลาย Session
// เราจะใช้ HTTP_REFERER (หน้าที่กดปุ่ม Logout มา) เป็นเป้าหมายในการกลับไป
$redirectParam = "";
if (isset($_SERVER['HTTP_REFERER']) && !empty($_SERVER['HTTP_REFERER'])) {
    // ตรวจสอบเบื้องต้นว่าเป็นลิงก์ในระบบเราหรือไม่ (เพื่อความปลอดภัย ไม่ให้เด้งไปเว็บอื่น)
    // แต่ถ้าระบบภายใน (Intranet) ส่วนใหญ่เชื่อถือได้ ก็ส่งไปได้เลย
    $redirectParam = "?redirect=" . urlencode($_SERVER['HTTP_REFERER']);
}

// 2. ล้างข้อมูล Session
if (isset($_SESSION['user'])) {
    try {
        require_once __DIR__ . '/../page/db.php';
        $logStmt = $pdo->prepare("INSERT INTO dbo.SYSTEM_LOGS (username, role, action, module, ref_id, ip_address, user_agent, created_at) VALUES (?, ?, 'LOGOUT', 'AUTH', ?, ?, ?, GETDATE())");
        $logStmt->execute([$_SESSION['user']['username'], $_SESSION['user']['role'], $_SESSION['user']['id'], $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN', $_SERVER['HTTP_USER_AGENT'] ?? 'UNKNOWN']);
    } catch (Exception $e) {}
}
$_SESSION = array();

// 3. ลบ Cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// 4. ทำลาย Session
session_destroy();

// 5. [ADJUSTED] ส่งกลับไปหน้า Login Form พร้อมกับพารามิเตอร์ redirect (ถ้ามี)
header("Location: login_form.php" . $redirectParam);
exit;
?>