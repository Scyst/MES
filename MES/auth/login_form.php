<?php
//-- เริ่ม Session และตรวจสอบว่าผู้ใช้ล็อกอินอยู่แล้วหรือไม่ --
session_start();
if (isset($_SESSION['user'])) {
    //-- ถ้าล็อกอินอยู่แล้ว ให้ Redirect ไปยังหน้า Dashboard ทันที --
    header("Location: ../page/OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <link rel="stylesheet" href="../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        /* CSS สำหรับจัดหน้าและตกแต่งให้เป็น Dark Theme */
        body {
            background-color: #111;
            color: white;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-box {
            background: #222;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 0 10px #000;
            width: 100%;
            max-width: 400px;
        }
        /* ลบ CSS ของปุ่มมุมบนขวาที่ไม่ได้ใช้ออกไป */
    </style>
</head>
<body>
    <div class="login-box">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="mb-0">Login</h3>
            <a href="../page/OEE_Dashboard/OEE_Dashboard.php" class="text-white-50" title="Back to Dashboard">
                <i class="fas fa-home fs-5"></i>
            </a>
        </div>
        <div id="error-alert" class="alert alert-danger d-none"></div>

        <?php if (isset($_GET['timeout'])): ?>
            <div class="alert alert-warning">Session expired due to inactivity.</div>
        <?php endif; ?>

        <form id="loginForm">
            <div class="mb-3">
                <label class="form-label">Username</label>
                <input type="text" name="username" class="form-control" required autofocus autocomplete="username">
            </div>
            <div class="mb-3">
                <label class="form-label">Password</label>
                <input type="password" name="password" class="form-control" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary w-100">Login</button>
        </form>
    </div>

    <script>
        //-- เพิ่ม Event Listener เพื่อจัดการการล็อกอินแบบ Asynchronous (โดยไม่โหลดหน้าใหม่) --
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault(); //-- ป้องกันการ submit ฟอร์มแบบปกติ --
            const form = e.target;
            const username = form.username.value;
            const password = form.password.value;
            const errorAlert = document.getElementById('error-alert');
            errorAlert.classList.add('d-none'); //-- ซ่อน Error เดิมก่อน --

            try {
                //-- ส่งข้อมูลไปยัง login.php ผ่าน Fetch API --
                const response = await fetch('login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();
                
                //-- ตรวจสอบผลลัพธ์ที่ได้จาก Server --
                if (result.success) {
                    //-- หากสำเร็จ: Redirect ไปยังหน้า Dashboard --
                    window.location.href = '../page/OEE_Dashboard/OEE_Dashboard.php';
                } else {
                    //-- หากไม่สำเร็จ: แสดงข้อความ Error --
                    errorAlert.textContent = result.message || 'An unknown error occurred.';
                    errorAlert.classList.remove('d-none');
                }
            } catch (error) {
                //-- จัดการกรณีที่เกิดข้อผิดพลาดในการเชื่อมต่อกับ Server --
                errorAlert.textContent = 'Failed to connect to the server.';
                errorAlert.classList.remove('d-none');
            }
        });
    </script>
</body>