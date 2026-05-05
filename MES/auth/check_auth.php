<?php
// MES/auth/check_auth.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function isApiRequest() {
    return (stripos($_SERVER['REQUEST_URI'], '/api/') !== false) || 
           (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);
}

if (!defined('ALLOW_GUEST_ACCESS') && !isset($_SESSION['user'])) {
    if (isApiRequest()) {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Session expired. Please log in again.', 'is_expired' => true]);
        exit;
    } else {
        $current_url = $_SERVER['REQUEST_URI'];
        $loginUrl = defined('BASE_URL') ? BASE_URL . '/auth/login_form.php' : '../../auth/login_form.php'; 
        header("Location: " . $loginUrl . "?redirect=" . urlencode($current_url));
        exit;
    }
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); 
}

function hasRole($roles): bool {
    if (empty($_SESSION['user']['role'])) return false;
    $userRole = $_SESSION['user']['role'];
    if (is_array($roles)) {
        return in_array($userRole, $roles);
    }
    return $userRole === $roles;
}

function hasPermission($permissionCode): bool {
    if (hasRole('creator')) return true;
    if (empty($_SESSION['user']['permissions']) || !is_array($_SESSION['user']['permissions'])) {
        return false;
    }
    return in_array($permissionCode, $_SESSION['user']['permissions']);
}

function requirePermission($permissions) {
    if (!isset($_SESSION['user'])) {
        if (isApiRequest()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Session expired. Please log in again.', 'is_expired' => true]);
            exit;
        } else {
            $current_url = $_SERVER['REQUEST_URI'];
            $loginUrl = defined('BASE_URL') ? BASE_URL . '/auth/login_form.php' : '/MES/auth/login_form.php'; 
            header("Location: " . $loginUrl . "?redirect=" . urlencode($current_url));
            exit;
        }
    }

    $hasAccess = false;
    if (is_array($permissions)) {
        foreach ($permissions as $perm) {
            if (hasPermission($perm)) {
                $hasAccess = true;
                break;
            }
        }
    } else {
        $hasAccess = hasPermission($permissions);
    }

    if (!$hasAccess) {
        if (isApiRequest()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Access Denied: You lack the required permissions.']);
            exit;
        } else {
            $homeUrl = defined('BASE_URL') ? BASE_URL . '/page/dailyLog/dailyLogUI.php' : '/MES/page/dailyLog/dailyLogUI.php';
            die('
                <!DOCTYPE html>
                <html lang="th">
                <head>
                    <meta charset="UTF-8">
                    <title>Access Denied</title>
                    <style>
                        body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; margin: 0; }
                        .denied-card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; border-top: 5px solid #dc3545; }
                        .denied-icon { font-size: 60px; margin-bottom: 10px; }
                        .btn-back { display: inline-block; margin-top: 20px; padding: 10px 24px; background-color: #0d6efd; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; transition: 0.2s; }
                        .btn-back:hover { background-color: #0b5ed7; }
                    </style>
                </head>
                <body>
                    <div class="denied-card">
                        <div class="denied-icon">🚫</div>
                        <h2 style="color: #343a40; margin-top: 0;">Access Denied</h2>
                        <p style="color: #6c757d; line-height: 1.5; margin-bottom:0;">ขออภัย คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
                        <p style="font-size: 0.8rem; color: #adb5bd;">(Required: ' . (is_array($permissions) ? implode(' หรือ ', $permissions) : $permissions) . ')</p>
                        <a href="' . $homeUrl . '" class="btn-back">กลับสู่หน้าหลัก</a>
                    </div>
                </body>
                </html>
            ');
        }
    }
}

function checkLinePermission($requiredLine): bool {
    if (hasRole(['admin', 'creator'])) return true;
    if (hasRole('supervisor')) return isset($_SESSION['user']['line']) && ($_SESSION['user']['line'] === $requiredLine);
    return false;
}

function enforceLinePermission($requiredLine) {
    if (!checkLinePermission($requiredLine)) {
        http_response_code(403);
        throw new Exception("Permission Denied: Line access restricted.");
    }
}

function enforceRecordPermission($pdo, $tableName, $recordId, $idColumn, $ownerColumn) {
    $currentUser = $_SESSION['user'];
    if (hasRole(['admin', 'creator'])) return;

    $stmt = $pdo->prepare("SELECT line, {$ownerColumn} FROM {$tableName} WHERE {$idColumn} = ?");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) {
        http_response_code(404);
        throw new Exception("Record not found.");
    }

    if (hasRole('supervisor')) {
        if (isset($currentUser['line']) && $currentUser['line'] === $record['line']) return; 
    }
    
    if (hasRole('operator')) {
        $currentUserIdentifier = ($ownerColumn === 'operator_id') ? $currentUser['id'] : $currentUser['username'];
        if ($record[$ownerColumn] == $currentUserIdentifier) return;
    }

    http_response_code(403);
    throw new Exception("Permission Denied: Record access restricted.");
}

if (isset($_SESSION['user']) && defined('IS_DEVELOPMENT') && IS_DEVELOPMENT === true) {
    $currentUri = $_SERVER['REQUEST_URI'];
    
    if (!isApiRequest()) {
        $productionPath = str_replace('/Clone/MES/', '/MES/MES/', $currentUri);
        $productionUrl = ($productionPath === $currentUri && strpos($currentUri, '/Clone/') === false)
            ? "https://oem.sncformer.com" . $currentUri 
            : "https://oem.sncformer.com" . $productionPath;

        if (!hasRole(['admin', 'creator'])) {
            ?>
            <!DOCTYPE html>
            <html lang="th">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Redirecting to Production...</title>
                <script src="../../utils/libs/sweetalert2.all.min.js"></script>
                <style>body { font-family: 'Sarabun', sans-serif; background-color: #f8f9fa; }</style>
            </head>
            <body>
                <script>
                    document.addEventListener('DOMContentLoaded', function() {
                        if (typeof Swal !== 'undefined') {
                            Swal.fire({
                                icon: 'info',
                                title: 'แจ้งเตือนการย้ายระบบ',
                                text: 'คุณกำลังเข้าใช้ระบบทดสอบ ระบบจะพาไปยังหน้าใช้งานจริง...',
                                timer: 3000,
                                showConfirmButton: false,
                                allowOutsideClick: false
                            }).then(() => { window.location.href = '<?php echo $productionUrl; ?>'; });
                        } else {
                            window.location.href = '<?php echo $productionUrl; ?>';
                        }
                    });
                </script>
            </body>
            </html>
            <?php
            exit; 
        } else {
            define('DEV_PRODUCTION_URL', $productionUrl);
        }
    }
}

if (isset($_SESSION['user'])) {
    if (!defined('SYSTEM_INJECTION_LOADED')) {
        define('SYSTEM_INJECTION_LOADED', true);
        
        register_shutdown_function(function() {
            if (!isApiRequest()) {
                $autoLogoutPath = __DIR__ . '/auto_logout.php';
                if (file_exists($autoLogoutPath)) include_once $autoLogoutPath;

                if (defined('DEV_PRODUCTION_URL')) {
                    $prodUrl = DEV_PRODUCTION_URL;
                    echo <<<EOT
                    <script>
                    (function() {
                        document.addEventListener('DOMContentLoaded', function() {
                            if (document.getElementById('devModeBanner')) return;
                            const bannerHTML = `
                                <div id="devModeBanner" style="
                                    position: fixed; top: 0; left: 0; width: 100%; height: 50px;
                                    z-index: 999999; border-bottom: 3px solid #dc3545;
                                    display: flex; justify-content: space-between; align-items: center;
                                    padding: 0 1rem; background-color: #f8d7da; color: #842029;
                                    box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); box-sizing: border-box;
                                    font-family: system-ui, sans-serif;
                                ">
                                    <div style="flex-grow: 1; text-align: center;">
                                        <i class="fas fa-tools" style="margin-right: 8px;"></i> 
                                        <strong>SYSTEM IN TEST MODE (DEV)</strong> 
                                        <span style="display: inline-block; margin-left: 8px; font-size: 0.9em;">| ข้อมูลบันทึกลงตาราง <code style="color: #212529; font-weight: bold; background: rgba(255,255,255,0.5); padding: 2px 4px; border-radius: 4px;">_TEST</code></span>
                                        <a href="\$prodUrl" style="
                                            display: inline-block; margin-left: 15px; padding: 4px 10px;
                                            font-size: 0.8rem; font-weight: bold; color: #dc3545;
                                            background-color: #f8f9fa; border: 1px solid #dc3545;
                                            text-decoration: none; border-radius: 4px; transition: all 0.2s;
                                        " onmouseover="this.style.backgroundColor='#dc3545'; this.style.color='white';" 
                                          onmouseout="this.style.backgroundColor='#f8f9fa'; this.style.color='#dc3545';">
                                            <i class="fas fa-external-link-alt"></i> ไปหน้าจริง
                                        </a>
                                    </div>
                                    <button onclick="minimizeDevMode()" style="background: none; border: none; font-size: 1.25rem; color: inherit; cursor: pointer; opacity: 0.5;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">&times;</button>
                                </div>
                                <div id="devModeBadge" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 999999;">
                                    <button onclick="restoreDevMode()" style="background-color: #dc3545; color: white; border: 2px solid white; padding: 8px 16px; border-radius: 50px; font-weight: bold; box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); cursor: pointer; display: flex; align-items: center; gap: 8px;">
                                        <i class="fas fa-tools"></i> TEST MODE
                                    </button>
                                </div>
                            `;
                            document.body.insertAdjacentHTML('afterbegin', bannerHTML);
                        });
                        window.minimizeDevMode = function() {
                            document.getElementById("devModeBanner").style.setProperty("display", "none", "important");
                            document.getElementById("devModeBadge").style.display = "block";
                        };
                        window.restoreDevMode = function() {
                            document.getElementById("devModeBanner").style.setProperty("display", "flex", "important");
                            document.getElementById("devModeBadge").style.display = "none";
                        };
                    })();
                    </script>
EOT;
                }
            }
        });
    }
}
?>