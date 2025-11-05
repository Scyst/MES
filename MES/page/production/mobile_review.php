<?php 
    // 1. --- บังคับ Login ---
    include_once("../../auth/check_auth.php");
    
    // 2. --- โหลดข้อมูล User ---
    $currentUserForJS = $_SESSION['user'] ?? null;
    $canManage = hasRole(['supervisor', 'admin', 'creator']);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Mobile Review</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        body { padding-top: 20px; }
        .container { max-width: 600px; }
        .form-control, .form-select { margin-bottom: 15px; }

        /* 4. --- สไตล์ใหม่สำหรับ "การ์ด" ประวัติ --- */
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
            display: flex;
            justify-content: space-between;
            align-items: center;
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
        /* (สไตล์ Autocomplete จาก mobile_entry.php) */
        .autocomplete-results {
             background: #fff;
             color: #000; list-style: none; padding: 0; margin: 0;
             position: absolute; width: calc(100% - 2px);
             z-index: 1050; max-height: 250px; overflow-y: auto;
        }
        .autocomplete-item { padding: 8px; cursor: pointer; }
        .autocomplete-item:hover { background: #eee; }
        .autocomplete-item small { color: #555; }

        .footer-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
        }

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
    </style>
</head>
<body>
    <div class="container" id="review-container">
        <?php include_once('../components/php/spinner.php'); ?>
        <div id="toast"></div>

        <h3 class="text-center mb-4">ตรวจสอบ/แก้ไข ย้อนหลัง</h3>

        <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mb-3">
            <button type="button" class="btn btn-primary btn-lg active" id="btn-load-out">
                <i class="fas fa-upload"></i> ประวัติของออก (OUT)
            </button>
            <button type="button" class="btn btn-success btn-lg" id="btn-load-in">
                <i class="fas fa-download"></i> ประวัติของเข้า (IN)
            </button>
        </div>

        <div id="review-list-container"></div>
        
        <div class="footer-controls">
            <a href="mobile_entry.php" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left"></i> กลับไปหน้ากรอกข้อมูล</a>
            
            <div id="theme-switcher-btn" title="Toggle Theme">
                <i class="fas fa-moon" id="theme-icon-moon"></i>
                <i class="fas fa-sun" id="theme-icon-sun"></i>
            </div>
        </div>
    </div>

    <?php
        // เราจะใช้ Modal เดิมจาก productionUI.php
        if ($canManage) {
            // (ผมคาดว่าคุณมีไฟล์ editEntryModal.php อยู่ใน components/ ครับ)
            include('components/editEntryModal.php'); 
            include('components/editProductionModal.php');
        }
    ?>

    <script>
        // ส่งค่า PHP ไป JavaScript
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const g_EntryType = null; // ไม่จำเป็นในหน้านี้
        const g_LocationId = null; // ไม่จำเป็นในหน้านี้
    </script>
    <script src="script/mobile.js?v=<?php echo time(); ?>"></script>
</body>
</html>