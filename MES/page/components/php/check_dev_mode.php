<?php
// MES/page/components/php/check_dev_mode.php

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// 1. ตรวจสอบว่าเปิดโหมด DEV อยู่หรือไม่
if (defined('IS_DEVELOPMENT') && IS_DEVELOPMENT === true) {

    // 2. คำนวณหา URL ของหน้า Production แบบอัตโนมัติ
    $currentUri = $_SERVER['REQUEST_URI'];
    // เปลี่ยน path จาก /Clone/MES/ เป็น /MES/MES/ (ปรับตาม path จริงของคุณ)
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
                        // เมื่อหมดเวลา หรือปิด Modal ให้ย้ายทันที
                        window.location.href = '<?php echo $productionUrl; ?>';
                    });
                });
            </script>
        </body>
        </html>
        <?php
        exit; // หยุดการทำงานทันที
    } 
    
    // =========================================================
    // CASE 2: Admin / Creator (แจ้งเตือน + ย่อเก็บได้)
    // =========================================================
    else {
        echo '
        <div id="devModeBanner" class="alert alert-danger text-center shadow-sm m-0 rounded-0 fixed-top d-flex justify-content-between align-items-center px-3 py-2" 
             style="z-index: 9999; border-bottom: 3px solid #dc3545;">
            
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

        <div id="devModeBadge" style="display: none; position: fixed; bottom: 20px; right: 20px; z-index: 10000;">
            <button class="btn btn-danger shadow rounded-pill px-3 py-2 fw-bold border border-white" onclick="restoreDevMode()" title="คลิกเพื่อแสดงแถบแจ้งเตือน">
                <i class="fas fa-tools me-2"></i> TEST MODE
            </button>
        </div>

        <style>
            /* ดันเนื้อหาลงมาเมื่อ Banner แสดงอยู่ */
            body.dev-mode-active { margin-top: 60px !important; }
            body.dev-mode-active .report-header, 
            body.dev-mode-active .navbar, 
            body.dev-mode-active header { top: 60px !important; transition: top 0.3s; }
        </style>

        <script>
            // เพิ่ม class ให้ body ทันทีที่โหลด
            document.body.classList.add("dev-mode-active");

            function minimizeDevMode() {
                // ซ่อน Banner
                document.getElementById("devModeBanner").style.setProperty("display", "none", "important");
                // แสดง Badge
                document.getElementById("devModeBadge").style.display = "block";
                // คืนค่า margin ของ body
                document.body.classList.remove("dev-mode-active");
            }

            function restoreDevMode() {
                // แสดง Banner
                document.getElementById("devModeBanner").style.setProperty("display", "flex", "important");
                // ซ่อน Badge
                document.getElementById("devModeBadge").style.display = "none";
                // ดัน margin ของ body ลงมาใหม่
                document.body.classList.add("dev-mode-active");
            }
        </script>
        ';
    }
}
?>