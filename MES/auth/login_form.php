<?php
session_start();
if (isset($_SESSION['user'])) {
    header("Location: ../page/OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
    <link rel="stylesheet" href="../utils/libs/bootstrap.min.css">
    <style>
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
    </style>
</head>
<body>
    <div class="login-box">
        <h3 class="text-center mb-4">Login</h3>
        
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
                    window.location.href = '../page/OEE_Dashboard/OEE_Dashboard.php';
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