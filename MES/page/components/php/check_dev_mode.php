<?php
// MES/page/components/php/check_dev_mode.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. ตรวจสอบว่าเปิดโหมด DEV อยู่หรือไม่
if (defined('IS_DEVELOPMENT') && IS_DEVELOPMENT === true) {

    // 2. คำนวณหา URL ของหน้า Production แบบอัตโนมัติ
    $currentUri = $_SERVER['REQUEST_URI'];
    $productionPath = str_replace('/Clone/MES/', '/MES/MES/', $currentUri); 
    $productionUrl = "https://oem.sncformer.com" . $productionPath;

    // ดึง Role
    $currentUserRole = $_SESSION['user']['role'] ?? 'guest';

    // =========================================================
    // CASE 1: Operator / Supervisor (Redirect แบบอบอุ่น)
    // =========================================================
    if (in_array($currentUserRole, ['operator', 'supervisor'])) {
        ?>
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Redirecting...</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            <style>
                body { 
                    font-family: 'Sarabun', sans-serif; 
                    background-color: #f8f9fa; 
                    display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;
                }
            </style>
        </head>
        <body>
            <script>
                document.addEventListener('DOMContentLoaded', function() {
                    let timerInterval;
                    Swal.fire({
                        icon: 'info',
                        title: 'แจ้งเตือนการย้ายระบบ',
                        html: `
                            <div style="text-align: left; font-size: 1rem; line-height: 1.8;">
                                ถ้าเห็นข้อความนี้แสดงว่าคุณเผลอเข้ามาใช้ <b>ระบบทดสอบ</b> ครับ<br>
                                ผมได้ทำการย้ายข้อมูลไปไว้บนระบบจริงให้เรียบร้อยแล้ว
                                ขอโทษในความสับสน และขอบคุณที่ช่วยทดสอบระบบครับ<br><br>
                                <span style="color: #6c757d; font-size: 0.9rem; text-align: center;">กำลังพาคุณไปยังลิ้งค์ใช้งานจริงใน <b></b> วินาที...</span>
                            </div>
                        `,
                        timer: 10000,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => {
                            Swal.showLoading();
                            const b = Swal.getHtmlContainer().querySelector('b:last-child');
                            timerInterval = setInterval(() => {
                                if(b) b.textContent = (Swal.getTimerLeft() / 1000).toFixed(0);
                            }, 100)
                        },
                        willClose: () => {
                            clearInterval(timerInterval);
                        }
                    }).then((result) => {
                        window.location.href = '<?php echo $productionUrl; ?>';
                    });
                });
            </script>
        </body>
        </html>
        <?php
        exit;
    } 
    
    // =========================================================
    // CASE 2: Admin / Creator (Overlay แท้จริง ไม่ดัน Layout)
    // =========================================================
    else {
        if (!function_exists('renderDevBanner')) {
            function renderDevBanner() { // เอา Argument ออก ให้มันคำนวณเอง
                
                // 1. คำนวณ URL ภายในฟังก์ชันเลย
                $currentUri = $_SERVER['REQUEST_URI'];
                $productionPath = str_replace('/Clone/MES/', '/MES/MES/', $currentUri);
                // ป้องกัน URL ซ้ำซ้อนกรณีอยู่นอก Clone (เผื่อไว้)
                if ($productionPath === $currentUri && strpos($currentUri, '/Clone/') === false) {
                    $productionUrl = "https://oem.sncformer.com" . $currentUri; 
                } else {
                    $productionUrl = "https://oem.sncformer.com" . $productionPath;
                }

                // 2. แสดงผล HTML
                echo '
                <div id="devModeBanner" class="alert alert-danger text-center shadow m-0 rounded-0 d-flex justify-content-between align-items-center px-3 py-2" 
                    style="position: fixed; top: 0; left: 0; width: 100%; z-index: 999999; border-bottom: 3px solid #dc3545; height: 60px;">
                    
                    <div class="flex-grow-1 text-center">
                        <i class="fas fa-tools me-2"></i> 
                        <strong>SYSTEM IN TEST MODE (DEV)</strong> 
                        <span class="d-none d-md-inline ms-2">| ข้อมูลจะบันทึกลงตาราง <code class="text-dark fw-bold">_TEST</code></span>
                        
                        <a href="'.$productionUrl.'" class="btn btn-sm btn-light text-danger fw-bold border-danger ms-3" style="font-size: 0.8rem;">
                            <i class="fas fa-external-link-alt me-1"></i> ไปหน้าจริง
                        </a>
                    </div>

                    <button type="button" class="btn-close" aria-label="Close" onclick="minimizeDevMode()"></button>
                </div>

                <div id="devModeBadge" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 999999;">
                    <button class="btn btn-danger shadow rounded-pill px-3 py-2 fw-bold border border-white" onclick="restoreDevMode()" title="คลิกเพื่อแสดงแถบแจ้งเตือน">
                        <i class="fas fa-tools me-2"></i> TEST MODE
                    </button>
                </div>

                <script>
                    function minimizeDevMode() {
                        document.getElementById("devModeBanner").style.setProperty("display", "none", "important");
                        document.getElementById("devModeBadge").style.display = "block";
                    }

                    function restoreDevMode() {
                        document.getElementById("devModeBanner").style.setProperty("display", "flex", "important");
                        document.getElementById("devModeBadge").style.display = "none";
                    }
                </script>
                ';
            }
        }
    }
}
?>