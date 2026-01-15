<?php
// page/loading/loading_report.php
define('ALLOW_GUEST_ACCESS', true);
require_once __DIR__ . '/../components/init.php';

// 1. กำหนดค่าสำหรับ Top Header
$pageTitle = "Loading Inspection";
$pageIcon = "fas fa-truck-loading"; // ไอคอนหน้า
$pageHeaderTitle = "Loading Toolbox"; // ชื่อระบบตัวใหญ่
$pageHeaderSubtitle = "ใบตรวจสอบสภาพตู้สินค้า (6-Point & C-TPAT)"; // คำอธิบายตัวเล็ก

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    <style>
        /* Mobile First CSS */
        body { background-color: #f5f6f8; } /* ปรับสีพื้นหลังให้เหมือนหน้าอื่น */
        
        .camera-box {
            border: 2px dashed #ced4da;
            border-radius: 10px;
            background-color: #fff; /* พื้นขาว */
            height: 180px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            overflow: hidden;
            position: relative;
            transition: all 0.2s;
        }
        .camera-box.has-image { border-style: solid; border-color: #198754; }
        .camera-box:active { background-color: #e9ecef; transform: scale(0.98); }
        .camera-label { font-weight: bold; color: #6c757d; margin-top: 10px; font-size: 0.9rem; text-align: center;}
        .preview-img { width: 100%; height: 100%; object-fit: cover; position: absolute; top:0; left:0; }
        
        /* ปรับแต่ง Card ให้เข้ากับ Layout ใหม่ */
        .job-card { cursor: pointer; transition: transform 0.2s; border: none; border-left: 5px solid #0d6efd; }
        .job-card:active { transform: scale(0.98); }
        .job-card.draft { border-left-color: #ffc107; }
        .job-card.done { border-left-color: #198754; }
    </style>
</head>
<body>

    <?php include_once __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="container-fluid py-3"> <div id="view-job-list">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="text-muted fw-bold mb-0"><i class="far fa-calendar-alt me-2"></i>PLAN TODAY (<?php echo date('d/m/Y'); ?>)</h6>
                <button class="btn btn-sm btn-outline-secondary" onclick="loadJobList()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
            
            <div id="jobListContainer" class="row g-2">
                <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
            </div>
        </div>

        <div id="view-report-form" style="display:none;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <button class="btn btn-outline-secondary rounded-pill px-3" onclick="switchView('list')">
                    <i class="fas fa-arrow-left me-1"></i> กลับ
                </button>
                <div class="fw-bold text-primary" id="disp_po_head">PO: XXXXX</div>
            </div>

            <ul class="nav nav-pills nav-fill mb-3 bg-white p-1 rounded shadow-sm">
                <li class="nav-item">
                    <button class="nav-link active" data-bs-toggle="pill" data-bs-target="#tab-photos">
                        <i class="fas fa-camera me-1"></i> รูปถ่าย & ซีล
                    </button>
                </li>
                <li class="nav-item">
                    <button class="nav-link text-muted" onclick="alert('Phase 2 Coming Soon!')">
                        <i class="fas fa-tasks me-1"></i> ตรวจ 10 จุด
                    </button>
                </li>
            </ul>

            <div class="tab-content">
                <div class="tab-pane fade show active" id="tab-photos">
                    <div class="card shadow-sm border-0 mb-3">
                        <div class="card-body bg-white rounded">
                            <div class="d-flex justify-content-between">
                                <h5 class="fw-bold text-primary mb-1" id="disp_po">PO: -</h5>
                            </div>
                            <p class="text-muted small mb-2" id="disp_desc">Description...</p>
                            
                            <div class="row g-2 small">
                                <div class="col-6"><span class="text-muted">Booking:</span> <span class="fw-bold" id="disp_booking">-</span></div>
                                <div class="col-6"><span class="text-muted">Invoice:</span> <span class="fw-bold" id="disp_invoice">-</span></div>
                                <div class="col-6"><span class="text-muted">Qty:</span> <span class="fw-bold" id="disp_qty">0</span></div>
                                <div class="col-6"><span class="text-muted">Container:</span> <span class="fw-bold text-dark" id="disp_container">-</span></div>
                            </div>

                            <hr class="my-2">
                            
                            <div class="row g-2">
                                <div class="col-6">
                                    <label class="form-label small fw-bold">Seal No.</label>
                                    <input type="text" id="input_seal" class="form-control form-control-sm text-center fw-bold text-primary" placeholder="Enter Seal No.">
                                </div>
                                <div class="col-6">
                                    <label class="form-label small fw-bold">Cable Seal</label>
                                    <input type="text" id="input_cable" class="form-control form-control-sm text-center fw-bold text-primary" placeholder="Enter Cable Seal">
                                </div>
                                <div class="col-12 text-end"><small class="text-muted fst-italic" style="font-size:0.7rem;">Auto-saving...</small></div>
                            </div>
                        </div>
                    </div>

                    <h6 class="text-muted fw-bold mb-2">PHOTO EVIDENCE (6 รูป)</h6>
                    <div class="row g-2 mb-5">
                        <?php 
                        $photos = [
                            'EMPTY' => '1. Empty Container',
                            'STUFF50' => '2. Stuffing 50%',
                            'STUFF100' => '3. Stuffing 100%',
                            'DOOR50' => '4. Door (Left Closed)',
                            'DOOR100' => '5. Door (Fully Closed)',
                            'SEAL' => '6. Seal Lock'
                        ];
                        foreach ($photos as $key => $label): 
                        ?>
                        <div class="col-6 col-md-4">
                            <div class="camera-box shadow-sm" id="box_<?php echo $key; ?>" onclick="triggerCamera('<?php echo $key; ?>')">
                                <i class="fas fa-camera fa-2x text-muted mb-2" id="icon_<?php echo $key; ?>"></i>
                                <span class="camera-label"><?php echo $label; ?></span>
                            </div>
                            <input type="file" id="file_<?php echo $key; ?>" accept="image/*" capture="environment" style="display:none;" onchange="handleFileSelect(this, '<?php echo $key; ?>')">
                        </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <input type="hidden" id="current_so_id">
    <input type="hidden" id="current_report_id">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:2000; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2"></div>
        <div class="fw-bold text-dark">Processing...</div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="script/loading_report.js?v=<?php echo time(); ?>"></script>
</body>
</html>