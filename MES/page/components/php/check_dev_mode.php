<?php
// MES/page/components/php/check_dev_mode.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// เช็ค API
$isApiRequest = (stripos($_SERVER['REQUEST_URI'], '/api/') !== false) 
             || (isset($_SERVER['HTTP_ACCEPT']) && stripos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false);

if (defined('IS_DEVELOPMENT') && IS_DEVELOPMENT === true && !$isApiRequest) {

    $currentUri = $_SERVER['REQUEST_URI'];
    $productionPath = str_replace('/Clone/MES/', '/MES/MES/', $currentUri);
    
    if ($productionPath === $currentUri && strpos($currentUri, '/Clone/') === false) {
         $productionUrl = "https://oem.sncformer.com" . $currentUri; 
    } else {
         $productionUrl = "https://oem.sncformer.com" . $productionPath;
    }

    $currentUserRole = $_SESSION['user']['role'] ?? 'guest';

    // CASE 1: Operator (Redirect)
    if (in_array($currentUserRole, ['operator', 'supervisor'])) {
        ?>
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>body { font-family: 'Sarabun', sans-serif; background-color: #f8f9fa; }</style>
        </head>
        <body>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    Swal.fire({
                        icon: 'info',
                        title: 'แจ้งเตือนการย้ายระบบ',
                        text: 'ระบบกำลังพาคุณไปยังหน้าใช้งานจริง...',
                        timer: 5000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = '<?php echo $productionUrl; ?>';
                    });
                });
            </script>
        </body>
        </html>
        <?php
        exit;
    } 
    
    // CASE 2: Admin (JS Auto-Inject แบบปลอดภัยต่อ Layout)
    else {
        // [FIXED] ใช้ register_shutdown_function เพื่อรอให้ PHP รันโค้ดหน้าเว็บจนจบก่อน
        // แล้วค่อยแปะ Script ต่อท้ายสุด เพื่อไม่ให้ DOCTYPE ขยับ
        register_shutdown_function(function() use ($productionUrl) {
            echo <<<EOT
            <script>
            (function() {
                document.addEventListener('DOMContentLoaded', function() {
                    if (document.getElementById('devModeBanner')) return;

                    const bannerHTML = `
                        <div id="devModeBanner" style="
                            position: fixed; top: 0; left: 0; width: 100%; height: 60px;
                            z-index: 999999; border-bottom: 3px solid #dc3545;
                            display: flex; justify-content: space-between; align-items: center;
                            padding: 0 1rem; background-color: #f8d7da; color: #842029;
                            box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); box-sizing: border-box;
                            font-family: system-ui, sans-serif;
                        ">
                            <div style="flex-grow: 1; text-align: center;">
                                <i class="fas fa-tools" style="margin-right: 8px;"></i> 
                                <strong>SYSTEM IN TEST MODE (DEV)</strong> 
                                <span style="display: inline-block; margin-left: 8px; font-size: 0.9em;">| ข้อมูลจะบันทึกลงตาราง <code style="color: #212529; font-weight: bold; background: rgba(255,255,255,0.5); padding: 2px 4px; border-radius: 4px;">_TEST</code></span>
                                
                                <a href="$productionUrl" style="
                                    display: inline-block; margin-left: 15px; padding: 4px 10px;
                                    font-size: 0.8rem; font-weight: bold; color: #dc3545;
                                    background-color: #f8f9fa; border: 1px solid #dc3545;
                                    text-decoration: none; border-radius: 4px; transition: all 0.2s;
                                " onmouseover="this.style.backgroundColor='#dc3545'; this.style.color='white';" 
                                  onmouseout="this.style.backgroundColor='#f8f9fa'; this.style.color='#dc3545';">
                                    <i class="fas fa-external-link-alt"></i> ไปหน้าจริง
                                </a>
                            </div>

                            <button onclick="minimizeDevMode()" style="
                                background: none; border: none; font-size: 1.25rem; color: inherit; cursor: pointer; opacity: 0.5;
                            " onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">
                                &times;
                            </button>
                        </div>

                        <div id="devModeBadge" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 999999;">
                            <button onclick="restoreDevMode()" style="
                                background-color: #dc3545; color: white; border: 2px solid white;
                                padding: 8px 16px; border-radius: 50px; font-weight: bold;
                                box-shadow: 0 .5rem 1rem rgba(0,0,0,.15); cursor: pointer;
                                display: flex; align-items: center; gap: 8px;
                            ">
                                <i class="fas fa-tools"></i> TEST MODE
                            </button>
                        </div>
                    `;

                    document.body.insertAdjacentHTML('afterbegin', bannerHTML);
                });

                window.minimizeDevMode = function() {
                    const banner = document.getElementById("devModeBanner");
                    const badge = document.getElementById("devModeBadge");
                    if(banner) banner.style.setProperty("display", "none", "important");
                    if(badge) badge.style.display = "block";
                };

                window.restoreDevMode = function() {
                    const banner = document.getElementById("devModeBanner");
                    const badge = document.getElementById("devModeBadge");
                    if(banner) banner.style.setProperty("display", "flex", "important");
                    if(badge) badge.style.display = "none";
                };
            })();
            </script>
EOT;
        });
    }
}
?>