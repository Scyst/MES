<?php
// MES/auth/login_form.php

session_start();

// กำหนดหน้า Home Default (กรณีเข้า Login มาตรงๆ โดยไม่มีเป้าหมาย)
$defaultHome = '../page/dailyLog/dailyLogUI.php';

// 1. รับค่า Redirect จาก URL (ที่ส่งมาจาก check_auth.php)
// ถ้าไม่มีค่าส่งมา ให้ใช้หน้า Default
$redirectTarget = isset($_GET['redirect']) && !empty($_GET['redirect']) 
    ? $_GET['redirect'] 
    : $defaultHome;

// ป้องกัน Open Redirect Vulnerability (เบื้องต้น): เช็คว่าเป็นลิงก์ภายในหรือไม่
// (ถ้าเป็นลิงก์ที่เริ่มด้วย http/https แต่อยู่คนละโดเมน อาจจะไม่ปลอดภัย แต่ในระบบภายในถือว่ายอมรับได้)

// 2. ถ้ามี Session อยู่แล้ว ให้ดีดไปหน้าที่ตั้งใจไว้เลย (ไม่ต้องกรอกรหัสซ้ำ)
if (isset($_SESSION['user'])) {
    header("Location: " . $redirectTarget);
    exit;
}
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
        html, body { height: 100%; }
        body {
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: var(--bs-tertiary-bg); 
        }
        .login-container { max-width: 400px; width: 100%; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="card shadow border-0">
            <div class="card-body p-4">
                <div class="text-center mb-4">
                    <h3 class="fw-bold text-primary"><i class="fas fa-cube me-2"></i>MES System</h3>
                    <p class="text-muted small">Please sign in to continue</p>
                </div>

                <div id="error-alert" class="alert alert-danger d-none text-center p-2 small"></div>

                <form id="loginForm">
                    <div class="mb-3">
                        <label for="username" class="form-label small fw-bold">Username</label>
                        <input type="text" class="form-control" id="username" name="username" required autofocus>
                    </div>
                    <div class="mb-4">
                        <label for="password" class="form-label small fw-bold">Password</label>
                        <input type="password" class="form-control" id="password" name="password" required>
                    </div>
                    <div class="d-grid">
                        <button type="submit" class="btn btn-primary fw-bold">
                            Sign In <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </div>
                </form>
            </div>
            
            <?php if ($redirectTarget !== $defaultHome): ?>
            <div class="card-footer bg-light text-center py-2">
                <small class="text-muted">
                    คุณกำลังจะไปที่: <br>
                    <span class="text-primary fw-bold text-break"><?php echo htmlspecialchars($redirectTarget); ?></span>
                </small>
            </div>
            <?php endif; ?>
        </div>
    </div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            
            const form = e.target;
            const username = form.username.value;
            const password = form.password.value;
            const btn = form.querySelector('button[type="submit"]');
            const errorAlert = document.getElementById('error-alert');

            // UI Loading State
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';
            errorAlert.classList.add('d-none');

            try {
                const response = await fetch('login.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                // ตรวจสอบว่าเป็น JSON หรือไม่ (ป้องกันกรณี Error 500 แล้วคืนค่าเป็น HTML)
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Server response is not JSON");
                }

                const result = await response.json();
                
                if (result.success) {
                    // ✅ SUCCESS: เปลี่ยนหน้าไปตามตัวแปร PHP $redirectTarget
                    window.location.href = '<?php echo $redirectTarget; ?>';
                } else {
                    throw new Error(result.message || 'Login failed');
                }
            } catch (error) {
                console.error(error);
                errorAlert.textContent = error.message || 'Connection failed. Please try again.';
                errorAlert.classList.remove('d-none');
                btn.disabled = false;
                btn.innerHTML = 'Sign In <i class="fas fa-arrow-right ms-2"></i>';
            }
        });
    </script>
</body>
</html>