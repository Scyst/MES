<?php
// 1. --- โหลดไฟล์ที่จำเป็น ---
include_once("../../auth/check_auth.php");
include_once("../components/common_head.php");

// 2. --- ตรวจสอบสิทธิ์ ---
if (!hasRole(['admin', 'creator'])) {
    die("Access Denied. You must be an Administrator to print QR codes.");
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>QR Code Print Builder</title>
    <style>
        /* (เราไม่ต้องการ CSS @media print ที่นี่อีกต่อไป) */
        
        body { background-color: #f4f4f4; }
        #main-content { padding-bottom: 20px !important; }
        .qr-page-container {
            max-width: 900px; margin: 20px auto;
            padding: 20px; background-color: #fff;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .print-button-container {
            text-align: center; padding: 20px;
            border-bottom: 2px solid #eee;
        }
        
        /* 3. --- สไตล์ใหม่สำหรับ "รายการ" --- */
        .location-list-item {
            display: flex;
            align-items: center;
            padding: 15px 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        .location-list-item:last-child { border-bottom: none; }
        .location-name {
            font-weight: bold;
            flex-grow: 1;
        }
        .location-inputs {
            display: flex;
            gap: 15px;
            flex-shrink: 0;
            align-items: center;
        }
        .location-inputs .form-group {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .location-inputs label {
            font-size: 0.9rem;
            font-weight: 500;
        }
        .location-inputs input[type="number"] {
            width: 80px;
            text-align: center;
        }
    </style>
</head>
<body class="page-with-table">
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#globalMobileMenu" 
            aria-controls="globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <div class="qr-page-container">
                <div class="print-button-container no-print">
                    <h2>QR Code Print Builder</h2>
                    <p>ระบุจำนวน QR Code ที่คุณต้องการพิมพ์สำหรับแต่ละ Location</p>
                    <button id="generate-print-btn" class="btn btn-primary btn-lg">
                        <i class="fas fa-print"></i> สร้างหน้าพิมพ์ (Generate)
                    </button>
                </div>

                <div id="location-list-container">
                    <div class="text-center p-5">
                         <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading Locations...</span>
                        </div>
                        <p>Loading Locations...</p>
                    </div>
                </div>
                
            </div>
        </main>
    </div>

    <script> const INVENTORY_API_URL = 'api/inventoryManage.php'; </script>
    
    <script src="script/print_qr.js?v=<?php echo time(); ?>"></script>
</body>
</html>