<?php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "RM Receiving & Tagging";
$pageIcon = "fas fa-pallet"; 
$pageHeaderTitle = "Raw Material Receiving";
$pageHeaderSubtitle = "รับสินค้าเข้าสต็อก และสร้าง Tag สำหรับ FIFO";
$pageHelpId = ""; 
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/rmReceiving.css?v=<?php echo filemtime(__DIR__ . '/css/rmReceiving.css'); ?>">
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content">
            
            <div class="dashboard-header-sticky">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
                                <div class="input-group input-group-sm" style="max-width: 250px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="searchInput" class="form-control border-secondary-subtle ps-2" placeholder="Search Serial, Item, PO..." onkeyup="handleSearch()">
                                </div>
                                
                                <div class="input-group input-group-sm shadow-sm" style="width: auto;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">วันที่:</span>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-01'); ?>" onchange="loadHistory()">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-d'); ?>" onchange="loadHistory()">
                                </div>

                                <div class="input-group input-group-sm d-none d-md-flex" style="max-width: 150px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">Rows:</span>
                                    <select id="rowsPerPage" class="form-select border-secondary-subtle" onchange="changeRowsPerPage()">
                                        <option value="10">10</option>
                                        <option value="50" selected>50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>

                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" 
                                        onclick="loadHistory()" title="Refresh Data" style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                <button class="btn btn-dark btn-sm shadow-sm d-none" id="btnBatchPrint" onclick="printSelectedTags()">
                                    <i class="fas fa-print me-1"></i> Print Selected (<span id="selectedCount">0</span>)
                                </button>
                                
                                <button class="btn btn-danger btn-sm shadow-sm d-none" id="btnBatchDelete" onclick="deleteSelectedTags()">
                                    <i class="fas fa-trash me-1"></i> Delete Selected (<span id="selectedDeleteCount">0</span>)
                                </button>

                                <button class="btn btn-info btn-sm fw-bold px-3 shadow-sm text-white" onclick="openTraceModal()">
                                    <i class="fas fa-barcode me-1"></i> ตรวจสอบ Tag
                                </button>
                                
                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openImportModal()">
                                    <i class="fas fa-file-import me-1"></i> Import Excel
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper p-3">
                <div class="card shadow-sm border-0">
                    <div class="table-responsive-custom">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap" style="font-size: 0.9rem;">
                            <thead class="sticky-top">
                                <tr class="text-secondary small text-uppercase align-middle">
                                    <th class="text-center" style="width: 40px;">
                                        <input class="form-check-input" type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)">
                                    </th>
                                    <th style="min-width: 110px;">เพิ่มเข้าระบบ</th>
                                    <th style="min-width: 90px;">วันที่ (Tag)</th>
                                    <th class="text-center" style="min-width: 130px;">Serial No.</th>
                                    <th class="text-center" style="min-width: 100px;">Item No.</th>
                                    <th class="text-center" style="width:300px; max-width: 350px;">PO Number</th>
                                    <th class="text-center" style="width: 120px; max-width: 120px;">Invoice No.</th>
                                    <th class="text-center" style="min-width: 100px;">Pallet / CTN</th>
                                    <th class="text-center" style="min-width: 80px;">Week</th>
                                    <th class="text-center" style="min-width: 80px;">QTY</th>
                                    <th class="text-center" style="width: 200px; max-width: 250px;">Remark</th>
                                    <th class="text-center" style="min-width: 80px;">พิมพ์</th>
                                    <th class="text-center" style="min-width: 90px;">Status</th>
                                    <th class="text-center" style="width: 50px;"><i class="fas fa-cog"></i></th>
                                </tr>
                            </thead>
                            <tbody id="historyTbody">
                                <tr><td colspan="9" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-0 d-flex justify-content-between align-items-center pt-3 pb-3 rounded-bottom">
                        <small class="text-muted fw-bold" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0" id="paginationControls">
                                </ul>
                        </nav>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="modal fade" id="importModal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content h-100">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold" id="importModalLabel"><i class="fas fa-file-excel text-success me-2"></i> นำเข้าข้อมูล Shipping</h5>
                    <button type="button" class="btn btn-sm btn-outline-success ms-3 fw-bold" onclick="downloadTemplate()">
                        <i class="fas fa-file-download me-1"></i> โหลด Template
                    </button>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body d-flex flex-column p-3">
                    <div class="row g-3 mb-3 align-items-center">
                        <div class="col-md-8 d-flex gap-2">
                            <input type="file" id="excelFile" class="form-control" accept=".xlsx, .xls, .csv">
                            <button class="btn btn-dark text-nowrap" onclick="processExcel()">
                                <i class="fas fa-search"></i> แสดงตัวอย่าง
                            </button>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="text-primary fw-bold" id="previewCount">พบข้อมูล: 0 พาเลท</span>
                        </div>
                    </div>

                    <div class="table-responsive border rounded flex-fill" style="min-height: 300px;">
                        <table class="table table-sm table-hover table-bordered mb-0 text-nowrap" id="previewTable">
                            <thead class="table-secondary sticky-top">
                                <tr>
                                    <th>Item No.</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>PO Number</th>
                                    <th class="text-end">Qty/Pallet</th>
                                    <th class="text-end">Package QTY</th>
                                    <th>Invoice No.</th>
                                    <th>Remark</th> </tr>
                            </thead>
                            <tbody id="previewTbody">
                                <tr><td colspan="7" class="text-center text-muted py-5">กรุณาเลือกไฟล์และกดแสดงตัวอย่าง</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success d-none" id="btnSave" onclick="submitToDatabase()">
                        <i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="cropModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow-lg border-0">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-crop-alt me-2"></i> ครอบตัดเฉพาะ QR Code</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center bg-light p-3">
                    <p class="text-muted small mb-2">เลื่อนและขยายกรอบให้พอดีกับ QR Code</p>
                    <div style="max-height: 60vh; overflow: hidden; border: 1px dashed #ccc; background: #fff;">
                        <img id="imageToCrop" src="" style="max-width: 100%; display: block;">
                    </div>
                </div>
                <div class="modal-footer bg-light">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" id="btnConfirmCrop">
                        <i class="fas fa-check me-1"></i> ยืนยันและสแกน
                    </button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="traceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg bg-body-tertiary">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-search me-2"></i> ตรวจสอบประวัติแท็ก (Tag Traceability)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    
                    <div class="scanner-box mb-4 shadow-sm">
                        <ul class="nav nav-tabs nav-fill bg-white rounded-top pt-2 px-2 border-bottom-0" id="traceScanTab" role="tablist">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active fw-bold border-bottom-0" id="trace-camera-tab" data-bs-toggle="tab" data-bs-target="#trace-camera-pane" type="button" role="tab">
                                    <i class="fas fa-qrcode"></i> สแกน (กล้อง)
                                </button>
                            </li>
                            <li class="nav-item" role="presentation">
                                <button class="nav-link fw-bold border-bottom-0 text-secondary" id="trace-manual-tab" data-bs-toggle="tab" data-bs-target="#trace-manual-pane" type="button" role="tab">
                                    <i class="fas fa-keyboard"></i> พิมพ์รหัส
                                </button>
                            </li>
                        </ul>
                
                        <div class="tab-content bg-white p-3 border border-top-0 rounded-bottom" id="traceScanTabContent">
                            <div class="tab-pane fade show active" id="trace-camera-pane" role="tabpanel">
                                <div id="qr-reader-container-trace">
                                    <div id="qr-reader-trace"></div>
                                    <div class="qr-file-scanner-overlay">
                                        <label for="trace-image-file" class="btn btn-sm px-3 rounded-pill shadow-sm cursor-pointer">
                                            <i class="fas fa-image me-1"></i> อัปโหลดรูปภาพ
                                        </label>
                                        <input type="file" id="trace-image-file" accept="image/*" style="display: none;">
                                    </div>
                                </div>
                            </div>
                    
                            <div class="tab-pane fade" id="trace-manual-pane" role="tabpanel">
                                <div class="input-group input-group-lg">
                                    <span class="input-group-text bg-light text-primary border-end-0"><i class="fas fa-barcode"></i></span>
                                    <input type="text" id="scanInput" class="form-control border-start-0 ps-0" placeholder="กรอก Serial No. แล้วกด Enter..." onkeypress="handleScanInput(event)" autocomplete="off">
                                    <button class="btn btn-primary px-4 fw-bold" type="button" onclick="handleManualSearchBtn()">
                                        <i class="fas fa-search"></i> ค้นหา
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="traceLoading" class="text-center py-5 d-none">
                        <div class="spinner-border text-primary" role="status"></div>
                        <div class="mt-2 text-muted fw-bold">กำลังค้นหาข้อมูล...</div>
                    </div>

                    <div id="traceResult" class="d-none">
                        <div class="card border-0 shadow-sm mb-3">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                                    <div>
                                        <h4 class="fw-bold text-primary mb-1" id="traceSerial">-</h4>
                                        <span class="text-muted small">Serial Number</span>
                                    </div>
                                    <span id="traceStatus" class="badge bg-secondary fs-6">-</span>
                                </div>
                                
                                <div class="row g-3 text-sm">
                                    <div class="col-sm-6">
                                        <div class="text-muted small">Item No. / Description</div>
                                        <div class="fw-bold text-dark"><span id="traceItem"></span></div>
                                        <div class="text-truncate" style="max-width: 250px;" id="traceDesc"></div>
                                    </div>
                                    <div class="col-sm-6">
                                        <div class="row">
                                            <div class="col-6">
                                                <div class="text-muted small">PO Number</div>
                                                <div class="fw-bold" id="tracePO">-</div>
                                            </div>
                                            <div class="col-6">
                                                <div class="text-muted small">Invoice No.</div>
                                                <div class="fw-bold" id="traceInv">-</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-3 p-2 bg-light border rounded text-center">
                                    <span class="text-muted me-2">Qty (คงเหลือ / รับเข้า):</span>
                                    <span class="fw-bold fs-5 text-dark" id="traceQty">0 / 0</span>
                                </div>
                                <div class="mt-2 text-center">
                                    <span class="text-muted small">Remark:</span> 
                                    <span class="fw-bold text-danger small" id="traceRemark">-</span>
                                </div>
                            </div>
                        </div>

                        <h6 class="fw-bold text-secondary mb-2 mt-4"><i class="fas fa-history me-1"></i> ประวัติการเคลื่อนไหว (Transaction History)</h6>
                        <div class="card border-0 shadow-sm overflow-hidden">
                            <div class="table-responsive">
                                <table class="table table-hover mb-0 text-nowrap" style="font-size: 0.9rem;">
                                    <thead class="table-light">
                                        <tr>
                                            <th>วัน-เวลา</th>
                                            <th>ประเภท</th>
                                            <th class="text-end">จำนวน</th>
                                            <th>หมายเหตุ</th>
                                            <th>ผู้ทำรายการ</th>
                                        </tr>
                                    </thead>
                                    <tbody id="traceHistoryTbody">
                                        </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>

    <div id="printArea"></div>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/qrcode.min.js"></script> 
    <script src="script/rmReceiving.js?v=<?php echo filemtime(__DIR__ . '/script/rmReceiving.js'); ?>"></script>
</body>
</html>