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
    <link rel="stylesheet" href="../components/css/mobile.css?v=<?php echo filemtime(__DIR__ . '/../components/css/mobile.css'); ?>">
</head>
<body>
    <div class="container" id="review-container">
        <?php include_once('../components/php/spinner.php'); ?>
        <div id="toast"></div>

        <h3 class="text-center mb-4">ตรวจสอบ/แก้ไข ย้อนหลัง</h3>

        <ul class="nav nav-tabs nav-fill mb-3" id="reviewTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="review-out-tab" data-bs-toggle="tab" type="button" role="tab" aria-selected="true">
                    <i class="fas fa-upload"></i> ประวัติ (OUT)
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="review-in-tab" data-bs-toggle="tab" type="button" role="tab" aria-selected="false">
                    <i class="fas fa-download"></i> ประวัติ (IN)
                </button>
            </li>
        </ul>
        <div id="review-list-container"></div>

        <div id="review-list-container"></div>
    </div>

    <?php
        // เราจะใช้ Modal เดิมจาก productionUI.php
        if ($canManage) {
            // (ผมคาดว่าคุณมีไฟล์ editEntryModal.php อยู่ใน components/ ครับ)
            include('components/editEntryModal.php'); 
            include('components/editProductionModal.php');
        }
    ?>

    <?php include_once('components/mobile_nav.php'); ?>

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