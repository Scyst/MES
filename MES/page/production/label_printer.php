<?php 
    include_once("../../auth/check_auth.php");
    $currentUserForJS = $_SESSION['user'] ?? null;
    $canAdd = hasPermission('print_label');
    
    if (!$canAdd) {
        header("HTTP/1.0 403 Forbidden");
        echo "Access Denied: You do not have permission to print production tags.";
        exit;
    }

    // 🌟 เปลี่ยนชื่อระบบให้ตรงกับบริบทหน้างานจริง
    $pageTitle = "Production Tag Printer";
    $pageIcon = "fas fa-tags";
    $pageHeaderTitle = "Production Tag Printer";
    $pageHeaderSubtitle = "ระบบสร้างแท็กส่งงาน (WIP / FG)";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .content-wrapper { height: calc(100vh - 140px); overflow-y: auto; overflow-x: hidden; }
        .autocomplete-results {
             background: var(--bs-body-bg); color: var(--bs-body-color); 
             list-style: none; padding: 0; margin: 0; border: 1px solid var(--bs-border-color);
             position: absolute; width: calc(100% - 2px); z-index: 1050; max-height: 250px; overflow-y: auto;
        }
        .autocomplete-item { padding: 10px; cursor: pointer; border-bottom: 1px solid var(--bs-border-color); }
        .autocomplete-item:hover { background: var(--bs-tertiary-bg); }
        .table-scrollable { max-height: calc(100vh - 350px); overflow-y: auto; }
        
        /* Form Grouping Style */
        .form-section { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .form-section-title { font-size: 0.85rem; font-weight: bold; color: #6c757d; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }

        /* KPI Card Micro Style */
        .kpi-micro { border-radius: 8px; padding: 10px 15px; display: flex; align-items: center; justify-content: space-between; border-left: 4px solid transparent; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .kpi-micro .kpi-title { font-size: 0.75rem; font-weight: bold; color: #6c757d; margin: 0; }
        .kpi-micro .kpi-value { font-size: 1.25rem; font-weight: bold; margin: 0; line-height: 1; }

        /* 🖨️ Print CSS */
        @media print {
            @page { font-family: 'Arial', 'Tahoma', sans-serif !important; size: 4in 2in landscape; margin: 0; }
            body * { visibility: hidden !important; }
            body, html { margin: 0; padding: 0; background: #fff; }
            body.desktop-only-page::before, body.desktop-only-page::after { display: none !important; }
            .portal-top-header, .sidebar, .page-container, .modal-backdrop, .modal, .toast-container { display: none !important; }
            
            #printArea, #printArea * { visibility: visible !important; }
            #printArea { display: block !important; position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
            
            .tag-card { width: 4in; height: 2in; box-sizing: border-box; padding: 2mm 2mm 2mm 6mm; page-break-after: always; font-family: 'Arial', sans-serif; color: #000; background-color: #fff; display: flex; flex-direction: row; align-items: center; overflow: hidden; }
            .tag-card:last-child { page-break-after: auto; }
            .tag-details { width: 75%; padding-right: 4px; display: flex; flex-direction: column; justify-content: center; height: 100%; }
            .t-title { font-size: 18px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; }
            .t-sub { font-size: 11px; font-weight: bold; line-height: 1.2; margin-bottom: 2px; }
            .t-desc { font-size: 11px; line-height: 1.2; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; white-space: normal; }
            .t-table { width: 100%; font-size: 11px; line-height: 1.15; }
            .t-table td { padding: 2px 0 2px 0; vertical-align: middle; }
            .t-hl { font-size: 16px; font-weight: bold; line-height: 0.8; display: inline-block; }
            .tag-qr { width: 26%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            .tag-qr canvas, .tag-qr img { width: 85px !important; height: 85px !important; }
            .t-serial { font-size: 11px; font-weight: bold; margin-top: 5px; text-align: center; word-break: break-all; }
        }
    </style>
</head>
<body class="layout-top-header bg-body-tertiary" id="printer-container"> 
    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="content-wrapper px-3 pt-3">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="row g-3">
                <div class="col-lg-4">
                    <div class="card shadow-sm border-0 h-100">
                        <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold text-primary"><i class="fas fa-tags me-2"></i> สร้างแท็กส่งงาน</h5>
                            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="clearPrinterForm()" title="ล้างค่าทั้งหมด">
                                <i class="fas fa-broom"></i> ล้าง
                            </button>
                        </div>
                        <div class="card-body">
                            <form id="label-generator-form">
                                
                                <div class="form-section">
                                    <div class="form-section-title"><i class="fas fa-map-marker-alt me-1"></i> ข้อมูลแหล่งที่มา</div>
                                    <div class="mb-3">
                                        <label class="form-label fw-bold small text-secondary mb-1">สถานีต้นทาง / คลัง (Source)</label>
                                        <select id="from_location_id" name="from_location_id" class="form-select form-select-sm fw-bold text-primary" required></select>
                                    </div>
                                    <div>
                                        <label class="form-label fw-bold small text-secondary mb-1">วันที่ผลิต (MFG Date)</label>
                                        <input type="date" id="prod_date" name="prod_date" class="form-control form-control-sm fw-bold" required>
                                    </div>
                                </div>

                                <div class="form-section">
                                    <div class="form-section-title"><i class="fas fa-box me-1"></i> ข้อมูลสินค้า</div>
                                    <div class="mb-3 position-relative">
                                        <label class="form-label fw-bold small text-secondary mb-1">ค้นหา Item (Part / SAP)</label>
                                        <div class="input-group input-group-sm">
                                            <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                            <input type="text" id="item_search" class="form-control fw-bold text-primary" placeholder="พิมพ์ชื่อเพื่อค้นหา..." autocomplete="off" required>
                                        </div>
                                        <div id="item_search-results" class="autocomplete-results shadow"></div>
                                        <input type="hidden" id="item_id" name="item_id" required>
                                    </div>
                                    <div class="mb-2">
                                        <label class="form-label fw-bold small text-secondary mb-1">เลข Lot / Master Pallet</label>
                                        <input type="text" id="lot_no" name="lot_no" class="form-control form-control-sm text-uppercase fw-bold" required placeholder="เช่น L-202604">
                                    </div>
                                    <div>
                                        <label class="form-label fw-bold small text-secondary mb-1">หมายเหตุ (Remark)</label>
                                        <input type="text" id="notes" name="notes" class="form-control form-control-sm" placeholder="ใส่หมายเหตุถ้ามี...">
                                    </div>
                                </div>

                                <div class="form-section border-primary border-opacity-25 bg-primary bg-opacity-10 mb-4">
                                    <div class="form-section-title text-primary"><i class="fas fa-print me-1"></i> ตั้งค่าการพิมพ์</div>
                                    <div class="row g-2">
                                        <div class="col-6">
                                            <label class="form-label fw-bold small text-secondary mb-1">จำนวนต่อกล่อง (QTY)</label>
                                            <input type="number" id="quantity" name="quantity" class="form-control form-control-sm text-center fw-bold text-dark" min="1" value="1" required>
                                        </div>
                                        <div class="col-6">
                                            <label class="form-label fw-bold small text-primary mb-1">พิมพ์กี่ดวง (Tags)</label>
                                            <input type="number" id="print_count" name="print_count" class="form-control form-control-sm text-center border-primary fw-bold" min="1" max="500" value="1" required>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" id="generate-label-btn" class="btn btn-primary w-100 fw-bold py-2 shadow-sm fs-6">
                                    <i class="fas fa-print me-2"></i> สร้างและพิมพ์แท็ก
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-8">
                    <div class="row g-2 mb-3">
                        <div class="col-md-4">
                            <div class="kpi-micro border-primary">
                                <div>
                                    <p class="kpi-title">แท็กทั้งหมด (30 วัน)</p>
                                    <h4 class="kpi-value text-primary" id="kpi_total">0</h4>
                                </div>
                                <div class="bg-primary bg-opacity-10 p-2 rounded text-primary"><i class="fas fa-tags fa-lg"></i></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="kpi-micro border-warning">
                                <div>
                                    <p class="kpi-title">รอรับเข้า (PENDING)</p>
                                    <h4 class="kpi-value text-warning" id="kpi_pending">0</h4>
                                </div>
                                <div class="bg-warning bg-opacity-10 p-2 rounded text-warning"><i class="fas fa-clock fa-lg"></i></div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="kpi-micro border-success">
                                <div>
                                    <p class="kpi-title">รับเข้าแล้ว (COMPLETED)</p>
                                    <h4 class="kpi-value text-success" id="kpi_completed">0</h4>
                                </div>
                                <div class="bg-success bg-opacity-10 p-2 rounded text-success"><i class="fas fa-check-circle fa-lg"></i></div>
                            </div>
                        </div>
                    </div>

                    <div class="card shadow-sm border-0 flex-column" style="height: calc(100% - 75px);">
                        <div class="card-header bg-white border-bottom py-2">
                            <div class="d-flex justify-content-between align-items-center mb-2 mt-1">
                                <h6 class="mb-0 fw-bold text-secondary"><i class="fas fa-history me-2"></i> ประวัติการสร้างแท็กล่าสุด</h6>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary me-1 fw-bold d-none" id="btnBatchPrint" onclick="reprintSelectedLabels()">
                                        <i class="fas fa-check-square me-1"></i>ที่เลือก (<span id="batchPrintCount">0</span>)
                                    </button>
                                    
                                    <button class="btn btn-sm btn-primary me-1 fw-bold" data-bs-toggle="modal" data-bs-target="#bulkPrintModal">
                                        <i class="fas fa-print me-1"></i>พิมพ์กลุ่ม
                                    </button>
                                    
                                    <button class="btn btn-sm btn-outline-danger me-1 fw-bold" data-bs-toggle="modal" data-bs-target="#bulkCancelModal">
                                        <i class="fas fa-eraser me-1"></i>ลบกลุ่ม
                                    </button>
                                    <button class="btn btn-sm btn-outline-secondary" id="btnRefreshHistory" onclick="loadLabelHistory(1)">
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="input-group input-group-sm mb-1 shadow-sm">
                                <select id="historyStatusFilter" class="form-select bg-light fw-bold text-secondary border-end-0" style="max-width: 140px;" onchange="loadLabelHistory(1)">
                                    <option value="ACTIVE" selected>ซ่อนที่ยกเลิก</option>
                                    <option value="ALL">แสดงทั้งหมด</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                </select>
                                <span class="input-group-text bg-white text-muted border-start-0"><i class="fas fa-search"></i></span>
                                <input type="text" id="historySearch" class="form-control border-start-0 ps-0" placeholder="ค้นหาจาก UUID, Lot, SAP, Part No..." autocomplete="off">
                            </div>
                        </div>
                        <div class="card-body p-0 flex-grow-1">
                            <div class="table-responsive table-scrollable" style="height: 100%;">
                                <table class="table table-sm table-hover align-middle mb-0 text-nowrap">
                                    <thead class="table-light sticky-top">
                                        <tr class="text-secondary">
                                            <th class="text-center px-2" style="width: 40px;">
                                                <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleAllCheckboxes()" style="transform: scale(1.2); cursor: pointer;">
                                            </th>
                                            <th class="px-2">วันเวลา (Date/Time)</th>
                                            <th>UUID</th>
                                            <th>Item / Part</th>
                                            <th class="text-end">Qty</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center px-3">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="labelHistoryBody">
                                        <tr><td colspan="7" class="text-center text-muted p-4">กำลังโหลดข้อมูล...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer bg-light py-2 d-flex justify-content-between align-items-center">
                            <small id="historyPageInfo" class="text-muted fw-bold">หน้า 1 / 1 (รวม 0 รายการ)</small>
                            <div class="btn-group">
                                <button class="btn btn-sm btn-secondary" id="btnPrevPage" onclick="changeHistoryPage(-1)"><i class="fas fa-chevron-left"></i> ก่อนหน้า</button>
                                <button class="btn btn-sm btn-secondary" id="btnNextPage" onclick="changeHistoryPage(1)">ถัดไป <i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="bulkCancelModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white py-3">
                    <h5 class="modal-title fw-bold"><i class="fas fa-eraser me-2"></i> ยกเลิกสติ๊กเกอร์แบบกลุ่ม</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-light">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-secondary">เลข Lot / Master Pallet <span class="text-danger">*</span></label>
                        <input type="text" id="bc_lot_no" class="form-control text-uppercase fw-bold" placeholder="เช่น L-202604">
                    </div>
                    <div class="form-check form-switch mb-3">
                        <input class="form-check-input" type="checkbox" id="bc_is_range" onchange="toggleBcRange()">
                        <label class="form-check-label fw-bold text-dark" for="bc_is_range">ระบุช่วงเลขรัน (ลบเฉพาะดวงที่ปริ้นเสีย)</label>
                    </div>
                    <div class="row g-2 d-none" id="bc_range_div">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary">ตั้งแต่ดวงที่</label>
                            <input type="number" id="bc_start_no" class="form-control fw-bold text-danger text-center" min="1" placeholder="เช่น 1">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary">ถึงดวงที่</label>
                            <input type="number" id="bc_end_no" class="form-control fw-bold text-danger text-center" min="1" placeholder="เช่น 800">
                        </div>
                    </div>
                    <div class="alert alert-warning mt-4 mb-0 small border-warning border-opacity-50">
                        <i class="fas fa-exclamation-triangle text-danger me-1"></i> <strong>ข้อควรระวัง:</strong> รายการ <b>PENDING</b> ที่อยู่ในเงื่อนไข จะถูกลบ (CANCELLED) ทันที!
                    </div>
                </div>
                <div class="modal-footer bg-white">
                    <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-danger fw-bold px-4" id="btnConfirmBulkCancel" onclick="executeAdvancedBulkCancel()">
                        <i class="fas fa-trash me-1"></i> ยืนยันการยกเลิก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="bulkPrintModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title fw-bold"><i class="fas fa-print me-2"></i> พิมพ์สติ๊กเกอร์แบบกลุ่ม (ระบุช่วง)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body bg-light">
                    <div class="mb-3">
                        <label class="form-label fw-bold text-secondary">เลข Lot / Master Pallet <span class="text-danger">*</span></label>
                        <input type="text" id="bp_lot_no" class="form-control text-uppercase fw-bold" placeholder="เช่น L-202604">
                    </div>
                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary">ตั้งแต่ดวงที่</label>
                            <input type="number" id="bp_start_no" class="form-control fw-bold text-primary text-center" min="1" placeholder="เช่น 1" required>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-secondary">ถึงดวงที่</label>
                            <input type="number" id="bp_end_no" class="form-control fw-bold text-primary text-center" min="1" placeholder="เช่น 500" required>
                        </div>
                    </div>
                    <div class="alert alert-info mt-3 mb-0 small border-info border-opacity-50">
                        <i class="fas fa-info-circle text-info me-1"></i> ระบบจะดึงข้อมูลตามช่วงตัวเลขที่ระบุและสั่งพิมพ์ออกมาทันที
                    </div>
                </div>
                <div class="modal-footer bg-white">
                    <button type="button" class="btn btn-secondary px-3" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" id="btnConfirmBulkPrint" onclick="executeAdvancedBulkPrint()">
                        <i class="fas fa-print me-1"></i> สั่งพิมพ์
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div id="printArea" class="d-none"></div>

    <script>
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        
        // ตั้งค่าวันที่ผลิตเริ่มต้นเป็นวันนี้
        document.getElementById('prod_date').valueAsDate = new Date();
    </script>
    <script src="../../utils/libs/qrcode.min.js"></script>
    <script src="script/label_printer.js?v=<?php echo time(); ?>" defer></script>
</body>
</html>