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
$pageIcon = "fas fa-tv";
$pageHeaderTitle = "Live Job Queue Board";
$pageHeaderSubtitle = "ระบบแสดงคิวงานและใบสั่งผลิต (Shop Floor KDS)";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* 🌟 KFC Board Card Styles */
        .job-card {
            border: 1px solid var(--bs-border-color);
            border-radius: 12px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
            background-color: #ffffff;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }
        .job-card:hover { transform: translateY(-5px); box-shadow: 0 8px 15px rgba(0,0,0,0.15); }
        .job-header { padding: 12px 15px; color: #fff; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
        .status-pending .job-header { background-color: #6c757d; } 
        .status-running .job-header { background-color: #198754; } 
        .status-warning .job-header { background-color: #ffc107; color: #000; } 
        .status-danger .job-header { background-color: #dc3545; } 
        .job-body { padding: 15px; flex-grow: 1; display: flex; flex-direction: column; }
        .job-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 2px; color: #333; }
        .job-details { font-size: 0.9rem; color: #666; margin-bottom: 15px; }
        .job-target-box { background: var(--bs-light); border-radius: 8px; padding: 10px; text-align: center; border: 1px solid var(--bs-border-color); margin-bottom: 15px; }
        .job-target-label { font-size: 0.8rem; font-weight: 600; color: #6c757d; text-transform: uppercase;}
        .job-target-value { font-size: 1.8rem; font-weight: 900; color: #0d6efd; line-height: 1; margin-top: 5px;}
        .timer-display { font-size: 1.8rem; font-weight: bold; font-family: 'Courier New', Courier, monospace; text-align: center; margin-top: auto; }
        .job-footer { padding: 12px 15px; background-color: #f8f9fa; border-top: 1px solid #eee; }
        .btn-action { width: 100%; padding: 10px; font-size: 1.1rem; font-weight: 700; border-radius: 8px; }

        @media (max-width: 767.98px) {
            #dynamic-button-group { width: 100%; }
            #dynamic-button-group .btn { flex: 1; width: 100%; justify-content: center; }
        }

        /* 🌟 Native Autocomplete Styles (จากระบบเดิมของคุณ) */
        .autocomplete-results {
            background: var(--bs-body-bg); color: var(--bs-body-color); 
            list-style: none; padding: 0; margin: 0; border: 1px solid var(--bs-border-color);
            position: absolute; width: 100%; z-index: 1050; max-height: 200px; overflow-y: auto;
            border-top: none; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .autocomplete-results li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid var(--bs-border-color); font-size: 0.95rem; }
        .autocomplete-results li:hover, .autocomplete-results li.active { background-color: var(--bs-primary); color: #fff; }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include_once('../components/php/top_header.php'); ?>

    <div class="page-container">
        <main id="main-content" class="px-3 pt-3">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="bg-white border rounded-3 shadow-sm p-3 mb-3">
                
                <div class="row g-2 align-items-center mb-4 pb-3 border-bottom">
                    <div class="col-12 col-md-4">
                        <div class="input-group input-group-sm shadow-sm flex-grow-1">
                            <span class="input-group-text bg-white"><i class="fas fa-filter text-muted"></i></span>
                            <select id="locationSelect" class="form-select border-start-0 fw-bold text-primary">
                                <option value="">-- เลือกไลน์ผลิตเพื่อดูคิวงาน --</option>
                            </select>
                        </div>
                    </div>

                    <div class="col-12 col-md-8 d-flex justify-content-start justify-content-md-end gap-2" id="dynamic-button-group">
                        <?php if ($canAdd): ?>
                        <button class="btn btn-sm btn-primary shadow-sm px-3" onclick="openCreateJobModal()">
                            <i class="fas fa-plus-circle me-1"></i> <b>เปิด Job ใหม่</b>
                        </button>
                        <?php endif; ?>
                        
                        <button class="btn btn-sm btn-info text-white shadow-sm px-3" onclick="openJobHistory()">
                            <i class="fas fa-history me-1"></i> <b>ประวัติ (History)</b>
                        </button>
                        
                        <button class="btn btn-sm btn-outline-secondary shadow-sm" onclick="fetchJobs()">
                            <i class="fas fa-sync-alt me-1"></i> <span class="d-none d-sm-inline">รีเฟรช</span>
                        </button>
                    </div>
                </div>

                <div class="row g-4" id="jobBoardContainer">
                    <div class="col-12 text-center text-muted py-5" id="emptyState">
                        <i class="fas fa-tv fa-4x mb-3 text-secondary opacity-50"></i>
                        <h5>กรุณาเลือกไลน์ผลิตเพื่อแสดงคิวงาน</h5>
                    </div>
                </div>
            </div>
        </main>    
    </div>

    <div class="modal fade" id="createJobModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <form id="createJobForm">
                    <div class="modal-header bg-dark text-white py-3">
                        <h5 class="modal-title fw-bold"><i class="fas fa-plus-circle me-2"></i>เปิดใบสั่งผลิตใหม่</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4 bg-light">
                        <div class="mb-3">
                            <label class="form-label fw-bold">ไลน์ผลิต (Target Line)</label>
                            <select id="modal_location" class="form-select border-primary shadow-sm" required>
                                <option value="">-- โหลดข้อมูล... --</option>
                            </select>
                        </div>
                        
                        <div class="mb-3 position-relative">
                            <label class="form-label fw-bold">เลือกสินค้า (Item / Part No.)</label>
                            <input type="text" id="modal_item_search" class="form-control text-primary fw-bold border-primary shadow-sm" placeholder="พิมพ์เพื่อค้นหา..." autocomplete="off" required>
                            <input type="hidden" id="modal_item" required>
                            <ul id="item_autocomplete_list" class="autocomplete-results d-none"></ul>
                        </div>
                        
                        <div class="mb-0">
                            <label class="form-label fw-bold">เป้าหมายการผลิต (Target Quantity)</label>
                            <input type="number" id="modal_target_qty" class="form-control form-control-lg text-center fw-bold text-primary shadow-sm" placeholder="ระบุจำนวน" required min="1" step="any">
                        </div>
                    </div>
                    <div class="modal-footer bg-white border-top-0">
                        <button type="button" class="btn btn-light border btn-lg w-100 mb-2" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-dark btn-lg w-100 fw-bold shadow-sm">บันทึกและส่งเข้าคิว</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="offcanvas offcanvas-end shadow" tabindex="-1" id="historyOffcanvas" style="width: 800px; max-width: 100vw;">
        <div class="offcanvas-header bg-dark text-white">
            <h5 class="offcanvas-title fw-bold"><i class="fas fa-history me-2"></i>ประวัติใบสั่งผลิต (Job History)</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body bg-light p-0">
            <div class="table-responsive h-100">
                <table class="table table-sm table-hover table-bordered mb-0 text-nowrap table-settings bg-white">
                    <thead class="table-light text-center sticky-top">
                        <tr class="text-secondary">
                            <th class="py-2">Job No.</th>
                            <th class="py-2">Part No.</th>
                            <th class="py-2 text-end">Target</th>
                            <th class="py-2 text-end text-success">FG</th>
                            <th class="py-2 text-end text-warning">Hold</th>
                            <th class="py-2 text-end text-danger">Scrap</th>
                            <th class="py-2">Status</th>
                            <th class="py-2">Time (Start - End)</th>
                        </tr>
                    </thead>
                    <tbody id="historyTableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="modal fade" id="recordOutputModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-success text-white py-3">
                    <h5 class="modal-title fw-bold"><i class="fas fa-edit me-2"></i>บันทึกยอดผลิต (Record Output)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-light">
                    <input type="hidden" id="record_job_id">
                    <h4 id="record_job_no" class="text-center text-success fw-bold mb-3 bg-white p-2 rounded border shadow-sm">JOB-XXX</h4>
                    <div class="alert alert-info py-2 text-center small fw-bold">
                        <i class="fas fa-info-circle me-1"></i> กรอกเฉพาะยอดที่ผลิตได้ในรอบนี้ (ระบบจะนำไปบวกสะสมให้)
                    </div>
                    
                    <div class="bg-white p-3 rounded border shadow-sm mb-3">
                        <label class="form-label fw-bold text-success"><i class="fas fa-box me-1"></i> ยอดงานดีเพิ่ม (FG)</label>
                        <input type="number" class="form-control form-control-lg text-center fw-bold text-success border-success" id="input_actual_qty" style="font-size: 2rem;" placeholder="0" min="0" step="any">
                    </div>
                    
                    <div class="bg-white p-3 rounded border shadow-sm mb-3">
                        <label class="form-label fw-bold text-warning"><i class="fas fa-hand-paper me-1"></i> ยอดรอตรวจสอบเพิ่ม (Hold)</label>
                        <input type="number" class="form-control form-control-lg text-center fw-bold text-warning border-warning" id="input_hold_qty" style="font-size: 2rem;" placeholder="0" min="0" step="any">
                    </div>

                    <div class="bg-white p-3 rounded border shadow-sm">
                        <label class="form-label fw-bold text-danger"><i class="fas fa-trash-alt me-1"></i> ยอดของเสียเพิ่ม (Scrap)</label>
                        <input type="number" class="form-control form-control-lg text-center fw-bold text-danger border-danger" id="input_scrap_qty" style="font-size: 2rem;" placeholder="0" min="0" step="any">
                    </div>
                </div>
                <div class="modal-footer bg-white border-top-0">
                    <button type="button" class="btn btn-light border btn-lg w-100 mb-2" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-success btn-lg w-100 fw-bold shadow-sm" onclick="submitRecordOutput()">บวกทบยอดผลิต</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const canAdd = <?php echo json_encode($canAdd); ?>;
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    
    <?php include_once '../components/common_scripts.php'; ?>
    <script src="script/jobQueue.js?v=<?php echo time(); ?>"></script>
</body>
</html>