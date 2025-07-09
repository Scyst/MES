<?php
//-- เริ่ม Session เพื่อเข้าถึงและจัดการ Session ปัจจุบัน --
session_start();

//-- 1. ล้างข้อมูลทั้งหมดใน $_SESSION --
$_SESSION = array();

//-- 2. ลบ Session Cookie ออกจากเบราว์เซอร์ของผู้ใช้ --
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

//-- 3. ทำลาย Session บนเซิร์ฟเวอร์อย่างสมบูรณ์ --
session_destroy();

//-- 4. ส่งผู้ใช้กลับไปยังหน้า Dashboard เสมอ --
header("Location: ../page/OEE_Dashboard/OEE_Dashboard.php");
exit;
?>