<?php 
// MES/page/production/jobQueueUI.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('view_production') && !hasPermission('manage_production')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$canManage = hasPermission('manage_production');
$canAdd = hasPermission('add_production') || hasPermission('manage_production');
$currentUserForJS = $_SESSION['user'] ?? null;

$pageTitle = "Live Job Queue | MES TOOLBOX";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* สไตล์สำหรับ Card */
        .job-card {
            transition: all 0.2s ease;
            border-radius: 12px;
            background-color: #ffffff;
        }
        .job-card:hover {
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-3px);
        }
        .row-running { background-color: #f4fdf8 !important; }
        .progress-compact { height: 10px; border-radius: 6px; background-color: #e9ecef; }
        
        /* สไตล์สำหรับ Drag & Drop */
        .drag-item.dragging { opacity: 0.5; transform: scale(0.95); }
        .drag-over-highlight .job-card { border: 2px dashed #0d6efd !important; background-color: #f8f9fa; }
        .cursor-grab { cursor: grab; }
        .cursor-grab:active { cursor: grabbing; }

        /* Style สำหรับ Autocomplete */
        .autocomplete-items {
            position: absolute; border: 1px solid #d4d4d4; border-bottom: none; border-top: none;
            z-index: 1050; top: 100%; left: 0; right: 0; max-height: 200px; overflow-y: auto;
            background-color: #fff; border-radius: 0 0 6px 6px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .autocomplete-items li { padding: 10px; cursor: pointer; border-bottom: 1px solid #d4d4d4; list-style: none; font-size: 0.9rem; }
        .autocomplete-items li:hover { background-color: #f8f9fa; }

        /* 🚀 Sticky Header CSS ตามระบบเดิม */
        .dashboard-header-sticky {
            position: sticky;
            top: 0;
            z-index: 1000;
            background-color: var(--bs-body-bg);
            padding: 1rem;
            padding-bottom: 0.5rem;
            transition: background-color 0.3s;
        }
        @media (max-width: 575.98px) {
            .dashboard-header-sticky { padding: 0.75rem; }
        }
        @media (max-width: 767.98px) {
            .dashboard-header-sticky {
                bottom: 0;
                border-top: 1px solid var(--bs-border-color);
                border-bottom: none;
            }
        }
        @media (max-width: 1199.98px) {
            .dashboard-header-sticky { padding: 0.5rem 1rem; }
        }
        .dashboard-header-sticky { padding: 1rem 2rem; }
        .dashboard-header-sticky, .sticky-bar {
            position: sticky;
            top: 0;
            padding: 1rem 1.5rem;
            background-color: var(--bs-secondary-bg);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            z-index: 1030;
            border-bottom: 1px solid var(--bs-border-color);
            flex-shrink: 0;
        }
    </style>
</head>
<body class="layout-top-header bg-body-tertiary">
    <?php include_once('../components/php/top_header.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="dashboard-header-sticky px-3 pt-3">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        
                        <div class="d-flex flex-column flex-xl-row gap-2 justify-content-between align-items-xl-center w-100">
                            
                            <div class="d-flex flex-column flex-md-row gap-2 flex-grow-1">
                                
                                <div class="d-flex gap-2 align-items-center flex-grow-1" style="max-width: 500px;">
                                    <div class="input-group input-group-sm shadow-sm flex-grow-1">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                        <input type="text" id="searchInput" class="form-control border-secondary-subtle border-start-0 ps-0" placeholder="Search Job, Part No..." onkeyup="renderJobBoard()">
                                    </div>
                                    <button class="btn btn-outline-secondary btn-sm shadow-sm flex-shrink-0" onclick="fetchJobs(true)" title="Refresh Data" style="width: 32px; height: 32px; padding: 0;"> 
                                        <i class="fas fa-sync-alt"></i>
                                    </button>
                                    
                                    <div class="dropdown flex-shrink-0 d-xl-none">
                                        <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm" type="button" data-bs-toggle="dropdown" title="เมนูเพิ่มเติม" style="height: 32px;">
                                            <i class="fas fa-ellipsis-v fa-fw"></i>
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem; min-width: 230px;">
                                            <li><h6 class="dropdown-header text-success fw-bold"><i class="fas fa-tasks me-1"></i> จัดการคิวงาน</h6></li>
                                            <?php if ($canAdd): ?>
                                            <li><a class="dropdown-item py-2 fw-bold text-primary" href="#" onclick="openCreateJobModal()"><i class="fas fa-plus fa-fw me-2"></i> สร้างคิวงานใหม่</a></li>
                                            <?php endif; ?>
                                            <li><a class="dropdown-item py-2 fw-bold text-dark" href="#" onclick="openJobHistory()"><i class="fas fa-history fa-fw me-2 text-secondary"></i> ประวัติย้อนหลัง</a></li>
                                        </ul>
                                    </div>
                                </div>
                                
                                <div class="d-flex gap-2 align-items-center flex-grow-1">
                                    <div class="input-group input-group-sm shadow-sm flex-grow-1" style="min-width: 180px; max-width: 280px;">
                                        <span class="input-group-text bg-white border-secondary-subtle text-secondary px-2"><i class="fas fa-map-marker-alt"></i></span>
                                        <select id="locationSelect" class="form-select border-secondary-subtle fw-bold text-dark px-1">
                                            <option value="">-- แสดงทุกไลน์ผลิต --</option>
                                        </select>
                                    </div>
                                    
                                    <div class="input-group input-group-sm shadow-sm d-none d-xl-flex flex-shrink-0" style="width: auto;">
                                        <span class="input-group-text bg-white border-secondary-subtle text-warning px-2"><i class="fas fa-clock"></i></span>
                                        <span class="input-group-text bg-white border-secondary-subtle fw-bold text-secondary px-2 sync-time-display">-</span>
                                    </div>
                                </div>

                            </div>

                            <div id="actionWrapper" class="d-flex gap-2 align-items-center justify-content-between justify-content-xl-end flex-shrink-0 mt-2 mt-xl-0 d-none d-xl-flex">
                                <button class="btn btn-outline-dark btn-sm shadow-sm fw-bold px-3 py-1 rounded" onclick="openJobHistory()">
                                    <i class="fas fa-history me-1"></i> ประวัติย้อนหลัง
                                </button>
                                <?php if ($canAdd): ?>
                                <button class="btn btn-primary btn-sm shadow-sm fw-bold px-3 py-1 rounded" onclick="openCreateJobModal()">
                                    <i class="fas fa-plus me-1"></i> สร้างคิวงาน
                                </button>
                                <?php endif; ?>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            <div class="px-3">
                <div class="row g-3" id="jobBoardContainer">
                    <div class="col-12 text-center text-muted py-5" id="emptyState">
                        <i class="fas fa-tv fa-4x mb-3 text-secondary opacity-50"></i>
                        <h5>กรุณาเลือกไลน์ผลิตเพื่อแสดงคิวงาน</h5>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <?php include('components/allProductionModals.php'); ?> 

    <div class="modal fade" id="createJobModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                <div class="modal-header bg-white border-bottom pb-2">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-plus-circle me-2 text-primary"></i>สร้างคิวงานใหม่</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="createJobForm">
                    <div class="modal-body bg-white">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">สถานที่ / ไลน์ผลิต <span class="text-danger">*</span></label>
                            <select id="modal_location" class="form-select bg-light" required>
                                <option value="">-- เลือกสถานที่ --</option>
                            </select>
                        </div>
                        <div class="mb-3 position-relative">
                            <label class="form-label fw-bold small text-secondary">สินค้า (Product/Item) <span class="text-danger">*</span></label>
                            <div class="input-group">
                                <span class="input-group-text bg-light"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" id="modal_item_search" class="form-control" placeholder="พิมพ์ชื่อ, Part No, หรือ SAP No" required autocomplete="off">
                            </div>
                            <input type="hidden" id="modal_item" required>
                            <ul id="item_autocomplete_list" class="autocomplete-items d-none m-0 p-0"></ul>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">เลขที่ล็อต (Lot No.)</label>
                            <input type="text" id="modal_lot_no" class="form-control bg-light" placeholder="ระบุเลขที่ล็อต (ถ้ามี)">
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">เป้าหมาย (Target Qty) <span class="text-danger">*</span></label>
                            <input type="number" id="modal_target_qty" class="form-control bg-light" min="1" step="1" required>
                        </div>
                    </div>
                    <div class="modal-footer bg-light border-top-0 justify-content-center">
                        <button type="button" class="btn btn-outline-secondary px-4 rounded-pill" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary px-4 rounded-pill fw-bold"><i class="fas fa-save me-1"></i> ยืนยันสร้างคิว</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="recordOutputModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered" style="max-width: 450px;"> 
            <div class="modal-content border-0 shadow-lg" style="border-radius: 15px;">
                <div class="modal-header bg-white border-bottom-0 pb-0">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-edit me-2 text-primary"></i>บันทึกผลผลิต</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body pt-2">
                    <input type="hidden" id="record_job_id">
                    <div class="text-center mb-4">
                        <span class="badge bg-light text-primary border border-primary px-3 py-2 fs-6 rounded-pill" id="record_job_no"></span>
                    </div>
                    
                    <div class="mb-3 p-3 rounded-3" style="background-color: #f0fdf4; border: 1px solid #c3e6cb;">
                        <label class="form-label fw-bold text-success mb-1"><i class="fas fa-check-circle me-1"></i> ยอดงานดี (FG)</label>
                        <input type="number" id="input_actual_qty" class="form-control form-control-lg text-center fw-bold text-success border-success" min="0" step="any" placeholder="0">
                    </div>
                    
                    <div class="mb-3 p-3 rounded-3" style="background-color: #fff8e6; border: 1px solid #ffeeba;" id="hold_container">
                        <label class="form-label fw-bold text-warning mb-1" style="color: #d39e00 !important;"><i class="fas fa-pause-circle me-1"></i> ยอดรอตรวจสอบ (Hold)</label>
                        <input type="number" id="input_hold_qty" class="form-control form-control-lg text-center fw-bold border-warning" style="color: #d39e00 !important;" min="0" step="any" placeholder="0">
                    </div>

                    <div class="mb-3 p-3 rounded-3" style="background-color: #fcf0f0; border: 1px solid #f5c6cb;">
                        <label class="form-label fw-bold text-danger mb-1"><i class="fas fa-times-circle me-1"></i> ยอดของเสีย (Scrap)</label>
                        <input type="number" id="input_scrap_qty" class="form-control form-control-lg text-center fw-bold text-danger border-danger" min="0" step="any" placeholder="0">
                    </div>
                </div>
                <div class="modal-footer bg-white border-top-0 pt-0 justify-content-center">
                    <button type="button" class="btn btn-light px-4 rounded-pill shadow-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary px-4 rounded-pill shadow-sm fw-bold" onclick="submitRecordOutput()"><i class="fas fa-save me-1"></i> บันทึกยอด</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="jobLogsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 12px;">
                <div class="modal-header bg-white border-bottom pb-2">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-history me-2 text-info"></i>ประวัติการลงยอด</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="m-0" style="max-height: 50vh; overflow-y: auto;">
                        <table class="table table-hover align-middle mb-0 text-nowrap table-sm">
                            <thead class="table-light text-secondary small sticky-top" style="z-index: 2;">
                                <tr>
                                    <th class="ps-4 py-2">เวลา (Time)</th>
                                    <th class="py-2">ประเภท</th>
                                    <th class="text-end py-2">จำนวน</th>
                                    <th class="text-center pe-4 py-2" width="120">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="jobLogsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="offcanvas offcanvas-end" tabindex="-1" id="historyOffcanvas" style="width: 800px;">
        <div class="offcanvas-header bg-white border-bottom">
            <h5 class="offcanvas-title fw-bold text-dark"><i class="fas fa-clipboard-list me-2 text-secondary"></i>ประวัติคิวงาน (History)</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body bg-light p-0">
            <div class="table-responsive h-100">
                <table class="table table-hover align-middle mb-0 text-nowrap table-sm bg-white">
                    <thead class="table-light small text-secondary sticky-top" style="z-index: 2;">
                        <tr>
                            <th class="ps-3 py-2">Job No<br><span class="text-muted small fw-normal">Lot No.</span></th>
                            <th class="py-2">Part No</th>
                            <th class="text-end py-2">Target</th>
                            <th class="text-end py-2">FG</th>
                            <th class="text-end py-2">Hold</th>
                            <th class="text-end py-2">Scrap</th>
                            <th class="text-center py-2">Status</th>
                            <th class="text-center pe-3 py-2">Time</th>
                        </tr>
                    </thead>
                    <tbody id="historyTableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="script/jobQueue.js?v=<?php echo time(); ?>"></script>
</body>
</html>