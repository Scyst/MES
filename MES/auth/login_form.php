<?php
//-- เริ่ม Session และตรวจสอบว่าผู้ใช้ล็อกอินอยู่แล้วหรือไม่ --
session_start();
if (isset($_SESSION['user'])) {
    //-- ถ้าล็อกอินอยู่แล้ว ให้ Redirect ไปยังหน้า Dashboard ทันที --
    header("Location: ../page/OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
//-- รับค่า URL ที่จะ Redirect กลับไปหลัง Login สำเร็จ --
$redirect = $_GET['redirect'] ?? '../page/OEE_Dashboard/OEE_Dashboard.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - MES Toolbox</title>
    
    <link rel="stylesheet" href="../utils/libs/bootstrap.min.css">
    
    <script src="../page/components/js/theme-switcher.js"></script>

    <style>
        html, body {
            height: 100%;
        }
        /* 3. เปลี่ยน CSS ให้รองรับการสลับธีม */
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            /* ใช้ตัวแปร CSS ของ Bootstrap แทน Hardcode */
            background-color: var(--bs-tertiary-bg); 
        }
        .login-container {
            max-width: 400px;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="login-container p-4">
        <div class="card shadow-sm">
            <div class="card-body p-4">
                <h2 class="card-title text-center mb-4">MES Toolbox Login</h2>
                
                <div id="error-alert" class="alert alert-danger d-none" role="alert"></div>

                <?php if (isset($_GET['timeout'])): ?>
                    <div class="alert alert-warning">Session expired due to inactivity.</div>
                <?php endif; ?>

                <form id="loginForm">
                    <div class="mb-3">
                        <label for="username" class="form-label">Username</label>
                        <input type="text" id="username" name="username" class="form-control" required autofocus autocomplete="username">
                    </div>
                    <div class="mb-3">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" id="password" name="password" class="form-control" required autocomplete="current-password">
                    </div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary w-100">Login</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            const form = e.target;
            const username = form.username.value;
            const password = form.password.value;
            const errorAlert = document.getElementById('error-alert');
            errorAlert.classList.add('d-none');

            try {
                const response = await fetch('login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();
                
                if (result.success) {
                    // 4. ทำให้ Redirect ทำงานตามตัวแปร $redirect
                    window.location.href = '<?php echo htmlspecialchars($redirect, ENT_QUOTES, 'UTF-8'); ?>';
                } else {
                    errorAlert.textContent = result.message || 'An unknown error occurred.';
                    errorAlert.classList.remove('d-none');
                }
            } catch (error) {
                errorAlert.textContent = 'Failed to connect to the server.';
                errorAlert.classList.remove('d-none');
            }
        });
    </script>
</body>
</html>