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

    <!-- Audio feedback -->
    <audio id="successSound" src="../../assets/sounds/success.mp3" preload="auto"></audio>
    <audio id="errorSound" src="../../assets/sounds/error.mp3" preload="auto"></audio>

    <script>
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="../../utils/libs/jquery-3.6.0.min.js"></script>
    <script src="script/warehouse_ops.js?v=<?php echo time(); ?>"></script>
</body>
</html>
