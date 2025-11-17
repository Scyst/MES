<?php 
    include_once("../../auth/check_auth.php");
    $currentUserForJS = $_SESSION['user'] ?? null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Settings</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* --- 1. Layout พื้นฐาน --- */
        body {
            padding-top: 20px;
            padding-bottom: 80px !important; 
        }

        .container {
            max-width: 600px;
        }

        .form-control, .form-select {
            margin-bottom: 15px;
        }

        /* --- 2. แก้ปัญหาปุ่มใน Input Group ไม่เท่ากัน --- */
        .input-group .form-control {
            margin-bottom: 0;
        }

        /* --- 3. Mobile Nav Bar (เมนูล่าง) --- */
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 60px;
            background-color: var(--bs-body-bg);
            border-top: 1px solid var(--bs-border-color);
            z-index: 1030;
        }

        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--bs-secondary-color);
            font-size: 0.7rem;
            height: 100%;
        }

        /* (สำหรับ 4 ปุ่ม) */
        .mobile-nav.four-items .mobile-nav-item {
            width: 25%;
        }

        .mobile-nav-item i {
            font-size: 1.2rem;
            margin-bottom: 4px;
        }

        .mobile-nav-item.active {
            color: var(--bs-primary);
            font-weight: bold;
        }

        /* --- 4. Scanner Box (กล่องแท็บ สแกน/พิมพ์) --- */
        .scanner-box {
            margin-bottom: 0.5rem;
        }

        .scanner-box .nav-tabs {
            border-bottom: 1px solid var(--bs-border-color);
        }

        .scanner-box .nav-link {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
        }

        /* (ทำให้แท็บที่ไม่ Active โปร่งใส) */
        .scanner-box .nav-link:not(.active) {
            background-color: transparent;
            border-color: transparent;
            color: var(--bs-secondary-color);
        }

        /* (ทำให้เนื้อหาแท็บมีสีพื้นหลังเดียวกับแท็บที่ Active) */
        .scanner-box .tab-content {
            padding: 1rem;
            background-color: var(--bs-body-bg); 
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-top: 1px solid var(--bs-border-color);
        }

        /* --- 5. สไตล์อื่นๆ ของ Mobile (จาก mobile_entry.php/mobile_review.php) --- */
        .autocomplete-results {
            background: #fff;
            color: #000; list-style: none; padding: 0; margin: 0;
            position: absolute; width: calc(100% - 2px);
            z-index: 1050; max-height: 250px; overflow-y: auto;
        }
        .autocomplete-item { padding: 8px; cursor: pointer; }
        .autocomplete-item:hover { background: #eee; }
        .autocomplete-item small { color: #555; }

        #theme-switcher-btn { 
            font-size: 1.2rem;
            cursor: pointer;
            color: var(--bs-secondary-color);
        }
        #theme-switcher-btn:hover {
            color: var(--bs-primary);
        }
        [data-bs-theme="light"] #theme-icon-sun { display: none; }
        [data-bs-theme="dark"] #theme-icon-moon { display: none; }

        #status-overlay {
            display: none; position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.85);
            z-index: 1045;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
        }
        .status-box {
            background-color: var(--bs-secondary-bg);
            padding: 30px;
            border-radius: 8px;
            border: 1px solid var(--bs-border-color);
        }
        .status-box i { font-size: 3rem; color: var(--bs-warning); }
        .status-box h4 { margin-top: 15px; margin-bottom: 10px; }

        #qr-reader-container {
            display: none; 
            padding: 0;
            border: none;
            background: none;
            margin-bottom: 0;
            margin-top: 0;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
        }

        #qr-reader {
            width: 100%;
            border: 1px solid #555;
            border-radius: 8px;
            z-index: 1;
        }

        .qr-file-scanner-overlay {
            position: absolute;
            bottom: 12px;
            left: 0;
            right: 0;
            text-align: center;
            z-index: 10;
        }

        .qr-file-scanner-overlay .btn {
            background-color: rgba(0, 0, 0, 0.4); 
            border-color: rgba(255, 255, 255, 0.5);
            color: #fff;
            backdrop-filter: blur(2px);
        }

        .qr-file-scanner-overlay .btn:hover {
            background-color: rgba(0, 0, 0, 0.6);
            border-color: rgba(255, 255, 255, 0.8);
        }

        .review-card {
            background-color: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 0.5rem;
            padding: 10px 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .review-card:hover { background-color: #495057; }
        .card-header {
            font-size: 1.1rem;
            font-weight: bold;
        }
        .card-body {
            font-size: 0.9rem;
            color: #adb5bd;
        }
        .card-body .item { color: #fff; }
        .card-footer {
            font-size: 0.8rem;
            color: #6c757d;
            text-align: right;
            padding-top: 5px;
            border-top: 1px solid var(--bs-border-color);
            margin-top: 8px;
        }
        .header-controls {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
        }

        /* --- 6. (ใหม่) ซ่อนปุ่ม UI ที่ไม่ต้องการของ Library --- */

        /* (ซ่อนกล่อง Dashboard ที่หุ้มปุ่ม Stop) */
        #qr-reader__dashboard {
            display: none !important;
        }

        /* ซ่อนปุ่ม "Stop Scanning" ที่ติดมากับกล้อง */
        #html5-qrcode-button-camera-stop {
            display: none !important;
        }

        /* ซ่อนลิงก์ "Scan an Image File" (เพราะเรามีปุ่มของเราเองแล้ว) */
        #html5-qrcode-anchor-scan-type-change {
            display: none !important;
        }

        /* (เผื่อไว้) ซ่อนส่วนเลือกกล้อง ถ้ามีหลายกล้อง */
        #html5-qrcode-select-camera {
            display: none !important;
        }
    </style>
</head>
<body>
    <div class="container">
        <h3 class="text-center mb-4">ตั้งค่า</h3>

        <div class="list-group">
            <div class="list-group-item d-flex justify-content-between align-items-center" 
                 id="theme-switcher-btn" title="Toggle Theme" style="cursor: pointer;">
                
                <span>เปลี่ยนธีม (สว่าง/มืด)</span>
                
                <div> 
                    <i class="fas fa-moon" id="theme-icon-moon"></i>
                    <i class="fas fa-sun" id="theme-icon-sun"></i>
                </div>
            </div>
            
            </div>


        <div class="mt-5">
            <a href="../../auth/logout.php" class="btn btn-outline-danger w-100">
                <i class="fas fa-sign-out-alt me-2"></i>
                ออกจากระบบ (<?php echo htmlspecialchars($currentUserForJS['username']); ?>)
            </a>
        </div>
        
    </div>

    <?php include_once('components/mobile_nav.php'); ?>

    <script>
        // (ส่งค่าว่างๆ ไปก่อน ถ้าหน้านี้ไม่ต้องการ API)
        const INVENTORY_API_URL = ''; 
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    </body>
</html>