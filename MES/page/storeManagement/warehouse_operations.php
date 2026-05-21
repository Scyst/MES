<?php
// e:\MES\MES\MES\page\storeManagement\warehouse_operations.php
require_once '../db.php';
require_once '../components/init.php';

if (!hasPermission('add_production') && !hasPermission('manage_production')) {
    header('Location: /MES/MES/page/error/403.php');
    exit;
}

$currentUserForJS = $_SESSION['user'] ?? null;

$pageTitle = "Warehouse Operations";
$pageIcon = "fas fa-warehouse"; 
$pageHeaderTitle = "Warehouse Operations";
$pageHeaderSubtitle = "ระบบจัดการคลังสินค้า (รับเข้าและโหลดขาย)";

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Fetch Locations
$stmt = $pdo->query("SELECT location_id, location_name FROM " . LOCATIONS_TABLE . " WHERE is_active = 1 ORDER BY location_name ASC");
$locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <?php include_once '../components/common_head.php'; ?>
    <link href="../../utils/libs/cropper.min.css" rel="stylesheet">
    <style>
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .content-wrapper { height: calc(100vh - 140px); overflow-y: auto; overflow-x: hidden; }
        
        /* Scanner input pulse animation */
        .scanner-input:focus { box-shadow: 0 0 0 0.2rem rgba(25,135,84,0.35) !important; }
        .scan-flash { animation: flashSuccess 0.6s ease; }
        @keyframes flashSuccess {
            0% { background-color: rgba(25,135,84,0.2); }
            100% { background-color: transparent; }
        }
        .scan-flash-error { animation: flashError 0.6s ease; }
        @keyframes flashError {
            0% { background-color: rgba(220,53,69,0.2); }
            100% { background-color: transparent; }
        }

        /* QR Scanner Modal */
        #qr-reader-wh__dashboard_section { display: none !important; }
        #html5-qrcode-button-camera-stop { display: none !important; }
        #html5-qrcode-anchor-scan-type-change { display: none !important; }
        #qr-reader-wh video {
            width: 100% !important;
            height: auto !important;
            min-height: 250px;
            object-fit: cover;
            border-radius: 8px;
        }
        #qrScanResult {
            transition: all 0.3s ease;
        }
        #qrScanResult.flash-success {
            animation: qrFlashSuccess 0.8s ease;
        }
        #qrScanResult.flash-error {
            animation: qrFlashError 0.8s ease;
        }
        @keyframes qrFlashSuccess {
            0% { transform: scale(1.05); box-shadow: 0 0 20px rgba(25,135,84,0.5); }
            100% { transform: scale(1); box-shadow: none; }
        }
        @keyframes qrFlashError {
            0% { transform: scale(1.05); box-shadow: 0 0 20px rgba(220,53,69,0.5); }
            100% { transform: scale(1); box-shadow: none; }
        }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content" class="content-wrapper px-3 pt-3">

            <!-- Sticky Toolbar -->
            <div class="dashboard-header-sticky px-0 pt-0 mb-2">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2 w-100">
                            
                            <!-- Left: Searchbox > Location Filter > Number Pagination > Refresh -->
                            <div class="d-flex flex-wrap align-items-center gap-2 flex-grow-1">
                                <!-- Searchbox -->
                                <div class="input-group input-group-sm shadow-sm" style="flex: 1 1 180px; max-width: 280px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="listSearchInput" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="ค้นหา Tag, SAP, Part No...">
                                </div>

                                <!-- Location Filter (always shown) -->
                                <div class="input-group input-group-sm shadow-sm" style="flex: 0 1 160px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-filter"></i></span>
                                    <select class="form-select border-secondary-subtle fw-bold text-secondary" id="filterLocationId" onchange="onLocationChange()">
                                        <option value="">-- กรองสถานที่ --</option>
                                        <?php foreach ($locations as $loc): ?>
                                            <option value="<?php echo htmlspecialchars($loc['location_id']); ?>"><?php echo htmlspecialchars($loc['location_name']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <!-- Number Pagination (Rows Per Page) -->
                                <div class="input-group input-group-sm shadow-sm d-none d-md-flex" style="width: 75px;">
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle px-2" onchange="changeRowsPerPage()">
                                        <option value="50">50</option>
                                        <option value="100" selected>100</option>
                                        <option value="500">500</option>
                                    </select>
                                </div>

                                <!-- Refresh -->
                                <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="loadTableData()" title="Refresh" style="width: 32px; height: 32px;">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <!-- Right: Scan Box > Location Scan > Switch Receive/Load Sell -->
                            <div class="d-flex flex-wrap align-items-center gap-2">
                                <!-- Scanner Box -->
                                <div class="input-group input-group-sm shadow-sm" style="flex: 1 1 200px; max-width: 350px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-barcode"></i></span>
                                    <input type="text" class="form-control border-secondary-subtle border-start-0 ps-0 fw-bold scanner-input" id="barcodeInput" placeholder="สแกนแท็กรับเข้าที่นี่..." autofocus autocomplete="off">
                                    <button class="btn btn-outline-success border-secondary-subtle" type="button" id="btnOpenQRScanner" onclick="openQRScannerModal()" title="เปิดกล้องสแกน QR Code">
                                        <i class="fas fa-qrcode"></i>
                                    </button>
                                </div>

                                <!-- Location Scan (Destination) -->
                                <div class="input-group input-group-sm shadow-sm" id="destinationSelectorDiv" style="flex: 0 1 180px;">
                                    <span class="input-group-text bg-white border-success text-success"><i class="fas fa-map-marker-alt"></i></span>
                                    <select class="form-select border-success fw-bold text-success" id="receiveLocationId">
                                        <option value="">-- เลือกปลายทาง --</option>
                                        <?php foreach ($locations as $loc): ?>
                                            <option value="<?php echo htmlspecialchars($loc['location_id']); ?>"><?php echo htmlspecialchars($loc['location_name']); ?></option>
                                        <?php endforeach; ?>
                                    </select>
                                </div>

                                <!-- Switch Mode (Receive/Load Sell) -->
                                <div class="btn-group btn-group-sm shadow-sm" role="group">
                                    <button type="button" class="btn btn-success fw-bold" id="btnModeReceive" onclick="switchMode('receive')">
                                        <i class="fas fa-box-open"></i> <span class="d-none d-sm-inline">รับเข้า</span>
                                    </button>
                                    <button type="button" class="btn btn-outline-primary fw-bold" id="btnModeSell" onclick="switchMode('sell')">
                                        <i class="fas fa-truck-loading"></i> <span class="d-none d-sm-inline">โหลดขาย</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <!-- Scan Feedback (inline toast) -->
            <div id="scanFeedback" class="alert alert-success fw-bold py-2 px-3 mb-2 d-flex align-items-center" style="display: none !important; font-size: 0.85rem;">
                <i class="fas fa-check-circle me-2" id="scanFeedbackIcon"></i>
                <span id="scanFeedbackText"></span>
                <button type="button" class="btn-close ms-auto btn-sm" onclick="$('#scanFeedback').attr('style','display:none !important')"></button>
            </div>

            <!-- Table Card -->
            <div class="card shadow-sm border-0 d-flex flex-column" style="height: calc(100% - 80px);">

                <!-- Bulk Action Bar (hidden until selection) -->
                <div id="bulkActionBar" class="card-header bg-body-tertiary border-bottom py-2 d-flex align-items-center justify-content-between" style="display: none !important;">
                    <span class="fw-bold text-dark small" id="selectedCountText">เลือกแล้ว 0 รายการ</span>
                    <button class="btn btn-success btn-sm fw-bold" id="btnBulkAction" onclick="processBulkAction()">
                        <i class="fas fa-check-double"></i> <span id="btnBulkActionText">ยืนยันรับเข้าที่เลือก</span>
                    </button>
                </div>

                <!-- Table -->
                <div class="table-responsive flex-grow-1" style="overflow-y: auto;">
                    <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.85rem;" id="tagsTable">
                        <thead class="table-light sticky-top shadow-sm">
                            <tr class="text-secondary small text-uppercase align-middle">
                                <th class="text-center" width="50"><input type="checkbox" class="form-check-input" id="selectAllCheckbox" onchange="toggleAllCheckboxes(this)"></th>
                                <th style="min-width: 180px;">แท็กบาร์โค้ด</th>
                                <th style="min-width: 100px;">SAP No.</th>
                                <th style="min-width: 120px;">Part No.</th>
                                <th style="min-width: 200px;">รายละเอียด</th>
                                <th class="text-end" style="width: 80px;">จำนวน</th>
                                <th style="min-width: 140px;">วันที่สร้าง</th>
                            </tr>
                        </thead>
                        <tbody id="tagsTableBody">
                            <tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-2"></i>กำลังโหลดข้อมูล...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Sticky Pagination Footer -->
                <div class="card-footer bg-white border-top d-flex justify-content-center justify-content-md-between align-items-center px-3 rounded-bottom w-100" style="min-height: 54px; position: sticky; bottom: 0; z-index: 10;">
                    <div class="d-flex align-items-center h-100">
                        <small class="text-muted fw-bold text-nowrap d-none d-md-block m-0 mt-1" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                    </div>
                    <nav class="overflow-auto hide-scrollbar d-flex align-items-center h-100 m-0" style="-webkit-overflow-scrolling: touch; max-width: 100%;">
                        <ul class="pagination pagination-sm mb-0 justify-content-center justify-content-md-end mt-1" id="paginationControls"></ul>
                    </nav>
                </div>

            </div>

        </div>
    </div>

    <!-- QR Scanner Modal -->
    <div class="modal fade" id="qrScannerModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white py-2 px-3 border-bottom-0">
                    <h6 class="modal-title fw-bold mb-0"><i class="fas fa-qrcode me-2"></i> สแกน QR Code</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" style="font-size: 0.8rem;"></button>
                </div>
                <div class="modal-body p-2 p-md-3 bg-body-tertiary d-flex flex-column gap-2">
                    
                    <div class="bg-white border rounded shadow-sm p-2">
                        <!-- Controls: Continuous Toggle + Upload -->
                        <div class="d-flex justify-content-between align-items-center mb-2 px-1">
                            <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
                                <input class="form-check-input mt-0" type="checkbox" id="qrContinuousScan" style="cursor: pointer; transform: scale(1.1);">
                                <label class="form-check-label fw-bold text-primary small" for="qrContinuousScan" style="cursor: pointer;">สแกนต่อเนื่อง</label>
                            </div>
                            <label for="qr-image-file" class="btn btn-sm btn-light border shadow-sm py-1 px-2 rounded cursor-pointer fw-bold text-dark" style="font-size: 0.75rem;">
                                <i class="fas fa-image text-primary me-1"></i> อัปโหลดรูป
                            </label>
                            <input type="file" id="qr-image-file" accept="image/*" class="d-none">
                        </div>

                        <!-- Camera Preview -->
                        <div class="position-relative bg-dark rounded-3 overflow-hidden shadow-sm" style="min-height: 250px; display: flex; align-items: center; justify-content: center;">
                            <div id="qr-reader-wh" class="w-100"></div>
                            <!-- Resume Overlay -->
                            <div id="qrResumeOverlay" class="position-absolute top-0 start-0 w-100 h-100 d-none flex-column align-items-center justify-content-center bg-dark bg-opacity-75" style="z-index: 10;">
                                <button class="btn btn-outline-light rounded-circle shadow mb-2 d-flex align-items-center justify-content-center" onclick="resumeQRScanning()" style="width: 60px; height: 60px;">
                                    <i class="fas fa-qrcode fa-2x"></i>
                                </button>
                                <span class="text-white fw-bold small">แตะเพื่อสแกน QR ถัดไป</span>
                            </div>
                        </div>

                        <!-- Manual Input -->
                        <div class="input-group input-group-sm mt-3 shadow-sm">
                            <span class="input-group-text bg-light text-primary border-secondary-subtle"><i class="fas fa-keyboard"></i></span>
                            <input type="text" id="qrManualInput" class="form-control border-secondary-subtle fw-bold" placeholder="พิมพ์รหัสแท็กด้วยมือ..." autocomplete="off">
                            <button class="btn btn-primary fw-bold px-3" type="button" onclick="submitQRManualInput()">
                                <i class="fas fa-paper-plane me-1"></i> ส่ง
                            </button>
                        </div>
                    </div>

                    <!-- Scan Result Area -->
                    <div id="qrScanResult" class="d-none">
                        <div class="alert mb-0 py-2 px-3 d-flex align-items-center" id="qrScanResultAlert">
                            <i class="me-2 fs-5" id="qrScanResultIcon"></i>
                            <div>
                                <div class="fw-bold small" id="qrScanResultTitle"></div>
                                <div class="small" id="qrScanResultMsg"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Scan Counter -->
                    <div class="d-flex justify-content-between align-items-center px-1">
                        <small class="text-muted"><i class="fas fa-check-double me-1"></i> สแกนสำเร็จ: <strong id="qrScanCount">0</strong> รายการ</small>
                        <button class="btn btn-sm btn-outline-secondary" onclick="resetQRScanCount()" title="รีเซ็ตตัวนับ"><i class="fas fa-undo"></i></button>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <!-- Crop Modal (for image upload) -->
    <div class="modal fade" id="qrCropModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-crop-alt me-2"></i> ครอบตัดเฉพาะ QR Code</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center bg-light p-3">
                    <p class="text-muted small mb-2">เลื่อนและขยายกรอบให้พอดีกับ QR Code</p>
                    <div style="max-height: 60vh; overflow: hidden; border: 1px dashed #ccc; background: #fff;">
                        <img id="qrImageToCrop" src="" style="max-width: 100%; display: block;">
                    </div>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" id="btnQrConfirmCrop">
                        <i class="fas fa-check me-1"></i> ยืนยันและสแกน
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Audio feedback -->
    <audio id="successSound" src="../../assets/sounds/success.mp3" preload="auto"></audio>
    <audio id="errorSound" src="../../assets/sounds/error.mp3" preload="auto"></audio>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="../../utils/libs/jquery-3.6.0.min.js"></script>
    <script src="../../utils/libs/html5-qrcode.min.js"></script>
    <script src="../../utils/libs/cropper.min.js"></script>
    <script src="script/warehouse_ops.js?v=<?php echo time(); ?>"></script>
</body>
</html>
