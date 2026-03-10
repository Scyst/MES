<?php
// MES/auth/check_auth.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!defined('ALLOW_GUEST_ACCESS') && !isset($_SESSION['user'])) {
    $current_url = $_SERVER['REQUEST_URI'];
    if (defined('BASE_URL')) {
        $loginUrl = BASE_URL . '/auth/login_form.php';
    } else {
        $loginUrl = '../../auth/login_form.php'; 
    }
    header("Location: " . $loginUrl . "?redirect=" . urlencode($current_url));
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32)); 
}

// ======================================================================
// 🛡️ 1. ROLE-BASED ACCESS CONTROL (LEGACY SUPPORT)
// ======================================================================
function hasRole($roles): bool {
    if (empty($_SESSION['user']['role'])) return false;
    $userRole = $_SESSION['user']['role'];
    if (is_array($roles)) {
        return in_array($userRole, $roles);
    }
    return $userRole === $roles;
}

// ======================================================================
// 🛡️ 2. PERMISSION-BASED ACCESS CONTROL (NEW STANDARD)
// ======================================================================
function hasPermission($permissionCode): bool {
    if (hasRole('creator')) return true; // System Owner bypass
    if (empty($_SESSION['user']['permissions']) || !is_array($_SESSION['user']['permissions'])) {
        return false;
    }
    return in_array($permissionCode, $_SESSION['user']['permissions']);
}

// ======================================================================
// 🛡️ 3. LINE & RECORD LEVEL SECURITY
// ======================================================================
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

// ======================================================================
// 🛡️ 4. ENVIRONMENT & DEV MODE CONTROL (IMMEDIATE CHECK)
// ======================================================================
if (isset($_SESSION['user']) && defined('IS_DEVELOPMENT') && IS_DEVELOPMENT === true) {
    $currentUri = $_SERVER['REQUEST_URI'];
    $isApiReq = (stripos($currentUri, '/api/') !== false) || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

    if (!$isApiReq) {
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
                <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
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

// ======================================================================
// 🛡️ 5. SYSTEM INJECTION (AUTO LOGOUT & DEV BANNER)
// ======================================================================
if (isset($_SESSION['user'])) {
    if (!defined('SYSTEM_INJECTION_LOADED')) {
        define('SYSTEM_INJECTION_LOADED', true);
        
        register_shutdown_function(function() {
            $isApiRequest = false;
            foreach (headers_list() as $header) {
                if (stripos($header, 'application/json') !== false) {
                    $isApiRequest = true; break;
                }
            }
            
            if (!$isApiRequest) {
                // 1. Inject Auto Logout Modal & JS
                $autoLogoutPath = __DIR__ . '/auto_logout.php';
                if (file_exists($autoLogoutPath)) include_once $autoLogoutPath;

                // 2. Inject Dev Mode Banner (Only if defined in Step 4)
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