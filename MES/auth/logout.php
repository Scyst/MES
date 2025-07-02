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

//-- กำหนด URL สำหรับ Redirect หลังจาก Logout --
$redirect_url = 'login_form.php'; // ค่าเริ่มต้นคือหน้า Login

//-- ตรวจสอบว่าต้องการให้กลับไปที่ Dashboard หรือไม่ --
if (isset($_GET['return_to']) && $_GET['return_to'] === 'dashboard') {
    $redirect_url = '../page/OEE_Dashboard/OEE_Dashboard.php';
}

//-- ส่งผู้ใช้ไปยังหน้าเว็บที่กำหนด --
header("Location: " . $redirect_url);
exit;
?>