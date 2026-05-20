<?php
// MES/page/sales/scan_loading.php
require_once __DIR__ . '/../components/init.php';

// Check permissions
if (!hasPermission('manage_sales') && !hasPermission('view_sales')) {
    header("HTTP/1.0 403 Forbidden");
    echo "Access Denied: You do not have permission to access sales loading.";
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;

$pageTitle = "Sales Loading (Scan)";
$pageIcon = "fas fa-truck-loading"; 
$pageHeaderTitle = "Sales Loading Scanner";
$pageHeaderSubtitle = "สแกนแท็กสินค้าเพื่อตัดสต็อกโหลดขาย";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="../storeManagement/css/scan_receive.css?v=<?php echo time(); ?>">
    <style>
        .glass-card { border-top: 4px solid var(--warning); }
        .scan-icon { color: var(--warning); }
        .scan-input:focus { border-color: var(--warning); box-shadow: 0 0 0 4px rgba(255, 159, 28, 0.15); }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content" class="px-3 pt-3">
            
            <div class="scanner-container">
                <!-- Scanner Card -->
                <div class="glass-card text-center">
                    <h4 class="fw-bold mb-4 text-dark"><i class="fas fa-barcode me-2 text-warning"></i>สแกนแท็กโหลดขาย (ตัดสต็อก)</h4>
                    
                    <div class="scan-input-wrapper pulse-animation" id="scanWrapper" style="animation-name: pulseWarning;">
                        <i class="fas fa-barcode scan-icon"></i>
                        <input type="text" id="barcodeInput" class="scan-input" placeholder="ยิงบาร์โค้ดที่นี่ (Transfer UUID)..." autocomplete="off" autofocus>
                    </div>
                    
                    <div id="statusIndicator" class="status-indicator">
                        <i id="statusIcon" class="fas fa-check-circle"></i>
                        <span id="statusMessage">พร้อมโหลดสินค้า</span>
                    </div>

                    <div class="text-muted small mt-3">
                        <i class="fas fa-info-circle me-1"></i> สินค้าจะถูกหักออกจากสต็อก (ตัดจ่าย) ทันทีที่สแกน
                    </div>
                </div>

                <!-- History Table -->
                <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-history me-2"></i>ประวัติการตัดสต็อกวันนี้ (เซสชั่นปัจจุบัน)</h6>
                <div class="table-responsive">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th>UUID</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody id="historyBody">
                            <tr>
                                <td colspan="3" class="text-center text-muted">ยังไม่มีประวัติการสแกน</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    </div>

    <!-- Audio feedback for scanner -->
    <audio id="successSound" src="../../assets/sounds/success.mp3" preload="auto"></audio>
    <audio id="errorSound" src="../../assets/sounds/error.mp3" preload="auto"></audio>

    <style>
        @keyframes pulseWarning {
            0% { box-shadow: 0 0 0 0 rgba(255, 159, 28, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(255, 159, 28, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 159, 28, 0); }
        }
    </style>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="script/scan_loading.js?v=<?php echo time(); ?>"></script>
</body>
</html>
