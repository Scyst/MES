<?php
// MES/page/storeManagement/scan_receive.php
require_once __DIR__ . '/../components/init.php';

// Check permissions
if (!hasPermission('manage_warehouse') && !hasPermission('manage_production')) {
    header("HTTP/1.0 403 Forbidden");
    echo "Access Denied: You do not have permission to access warehouse receiving.";
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;

$pageTitle = "Warehouse Receiving (Scan)";
$pageIcon = "fas fa-dolly"; 
$pageHeaderTitle = "FG Warehouse Receiving";
$pageHeaderSubtitle = "สแกนแท็กสินค้าสำเร็จรูปเพื่อรับเข้าคลัง";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/scan_receive.css?v=<?php echo time(); ?>">
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content" class="px-3 pt-3">
            
            <div class="scanner-container">
                <!-- Location Selector -->
                <div class="location-selector shadow-sm">
                    <label class="form-label fw-bold text-secondary mb-2"><i class="fas fa-map-marker-alt me-1"></i> เลือกคลังสินค้าปลายทาง (Destination Warehouse)</label>
                    <select id="to_location_id" class="form-select form-select-lg fw-bold text-primary border-primary" required>
                        <option value="">-- กำลังโหลดข้อมูลคลังสินค้า --</option>
                    </select>
                </div>

                <!-- Scanner Card -->
                <div class="glass-card text-center">
                    <h4 class="fw-bold mb-4 text-dark"><i class="fas fa-qrcode me-2 text-primary"></i>สแกนแท็กรับเข้าคลัง</h4>
                    
                    <div class="scan-input-wrapper pulse-animation" id="scanWrapper">
                        <i class="fas fa-barcode scan-icon"></i>
                        <input type="text" id="barcodeInput" class="scan-input" placeholder="ยิงบาร์โค้ดที่นี่ (Transfer UUID)..." autocomplete="off" autofocus>
                    </div>
                    
                    <div id="statusIndicator" class="status-indicator">
                        <i id="statusIcon" class="fas fa-check-circle"></i>
                        <span id="statusMessage">พร้อมรับเข้าสินค้า</span>
                    </div>

                    <div class="text-muted small">
                        <i class="fas fa-info-circle me-1"></i> โปรดตรวจสอบให้แน่ใจว่าเคอร์เซอร์อยู่ในช่องป้อนข้อมูลก่อนทำการสแกน
                    </div>
                </div>

                <!-- Last Scanned Details -->
                <div class="glass-card d-none" id="lastScanCard">
                    <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-box-open me-2"></i>รายละเอียดรายการล่าสุด</h6>
                    <div class="row g-3 text-start">
                        <div class="col-6 col-md-3">
                            <small class="text-muted d-block">Item / Part No</small>
                            <span class="fw-bold fs-5 text-dark" id="lsPartNo">-</span>
                        </div>
                        <div class="col-6 col-md-3">
                            <small class="text-muted d-block">จำนวน (QTY)</small>
                            <span class="fw-bold fs-5 text-primary" id="lsQty">-</span>
                        </div>
                        <div class="col-6 col-md-3">
                            <small class="text-muted d-block">UUID / Tag</small>
                            <span class="fw-bold text-dark" id="lsUUID">-</span>
                        </div>
                        <div class="col-6 col-md-3">
                            <small class="text-muted d-block">เวลา</small>
                            <span class="fw-bold text-secondary" id="lsTime">-</span>
                        </div>
                    </div>
                </div>

                <!-- History Table -->
                <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-history me-2"></i>ประวัติการรับเข้าวันนี้ (เซสชั่นปัจจุบัน)</h6>
                <div class="table-responsive">
                    <table class="history-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th>UUID</th>
                                <th>Item</th>
                                <th>จำนวน</th>
                                <th>สถานะ</th>
                            </tr>
                        </thead>
                        <tbody id="historyBody">
                            <tr>
                                <td colspan="5" class="text-center text-muted">ยังไม่มีประวัติการรับเข้า</td>
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

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="script/scan_receive.js?v=<?php echo time(); ?>"></script>
</body>
</html>
