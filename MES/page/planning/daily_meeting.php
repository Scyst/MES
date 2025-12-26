<?php
// FILE: MES/page/planning/daily_meeting.php
require_once __DIR__ . '/../components/init.php';

// --- HEADER CONFIGURATION ---
$pageTitle = "Daily Command Center";
$pageIcon = "fas fa-layer-group";   // ไอคอนหัวเว็บ
$pageHeaderTitle = "Daily Command Center";  // ชื่อระบบตัวใหญ่
$pageHeaderSubtitle = "ศูนย์สั่งการและติดตามสถานะการผลิตประจำวัน"; // คำอธิบายตัวเล็ก
$pageHelpId = "helpModal";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/daily_meeting.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header bg-dashboard">
    
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <div id="main-content" class="p-3">
        
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="d-flex align-items-center gap-3">
                <div class="input-group input-group-sm shadow-sm" style="width: 200px;">
                    <span class="input-group-text bg-white border-end-0"><i class="far fa-calendar-alt"></i></span>
                    <input type="date" class="form-control fw-bold border-start-0" id="cmdDate" value="<?php echo date('Y-m-d'); ?>">
                </div>
                
                <select id="shiftSelect" class="form-select form-select-sm shadow-sm fw-bold border-0 text-primary" style="width: 140px;">
                    <option value="ALL" selected>⚡ Shift: ALL</option>
                    <option value="DAY">☀ Shift: DAY</option>
                    <option value="NIGHT">🌙 Shift: NIGHT</option>
                </select>
            </div>

            <div>
                <button class="btn btn-white btn-sm shadow-sm me-2" id="btnHistory">
                    <i class="fas fa-history me-1"></i> History
                </button>
                <button class="btn btn-primary btn-sm shadow-sm fw-bold px-4" id="btnCommit">
                    <i class="fas fa-save me-1"></i> Save Plan
                </button>
            </div>
        </div>

        <div class="row g-3 h-100">
            
            <div class="col-xl-9 d-flex flex-column gap-3">
                
                <div class="card border-0 shadow-sm flex-fill" style="min-height: 500px;">
                    <div class="card-header bg-white py-2 border-bottom d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2">
                            <h6 class="fw-bold mb-0 text-dark">Production Master Plan</h6>
                            <span class="badge bg-light text-secondary border">Editable Mode</span>
                        </div>
                        
                        <div class="d-flex align-items-center gap-2">
                            <button class="btn btn-sm btn-outline-primary" data-bs-toggle="modal" data-bs-target="#addPlanModal">
                                <i class="fas fa-plus-circle me-1"></i> Add Plan
                            </button>
                            <div class="small text-muted ms-2 border-start ps-2">
                                <i class="fas fa-info-circle me-1"></i>Demand/Stock แก้ไขได้
                            </div>
                        </div>
                    </div>
                    
                    <div class="table-responsive flex-fill" style="max-height: 475px; overflow-y: auto;">
                        <table class="table table-hover align-middle mb-0 cmd-table">
                            <thead class="bg-light">
                                <tr>
                                    <th style="width: 40px;">STS</th>
                                    <th style="width: 120px;">Line</th>
                                    <th style="width: 180px;">FG Model</th>
                                    <th style="width: 120px;" class="text-center">Manpower (Act/Req)</th>
                                    <th style="width: 100px;" class="text-end">Demand (14 Days)</th> 
                                    <th style="width: 100px;" class="text-end">Stock</th>  
                                    <th style="width: 100px;" class="text-end">Plan Qty</th>
                                    <th>Feeder Jobs (Part Prep)</th>
                                </tr>
                            </thead>
                            <tbody id="productionTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>

                <div class="card border-0 shadow-sm" style="height: 220px;">
                    <div class="card-header bg-white py-2 border-bottom">
                        <h6 class="fw-bold mb-0 fs-7"><i class="fas fa-clipboard-list text-success me-2"></i>Daily Log & Action Plan</h6>
                    </div>
                    <div class="card-body p-0 d-flex">
                        <div class="flex-fill border-end p-2 d-flex flex-column" style="width: 33%;">
                            <label class="small text-muted fw-bold mb-1"><i class="fas fa-shield-alt text-danger me-1"></i>Safety & Environment</label>
                            <textarea id="noteSafety" class="form-control form-control-sm border-0 bg-light flex-fill" placeholder="- อุบัติเหตุ หรือ ความเสี่ยง..."></textarea>
                        </div>
                        
                        <div class="flex-fill border-end p-2 d-flex flex-column" style="width: 33%;">
                            <label class="small text-muted fw-bold mb-1"><i class="fas fa-cogs text-warning me-1"></i>Machine Breakdown</label>
                            <textarea id="noteMachine" class="form-control form-control-sm border-0 bg-light flex-fill" placeholder="- เครื่องจักรเสีย หรือ รอซ่อม..."></textarea>
                        </div>
                        
                        <div class="flex-fill p-2 d-flex flex-column" style="width: 33%;">
                            <label class="small text-muted fw-bold mb-1"><i class="fas fa-sticky-note text-primary me-1"></i>General Note / Memo</label>
                            <textarea id="noteGeneral" class="form-control form-control-sm border-0 bg-opacity-10 flex-fill" placeholder="- บันทึกทั่วไป (Free Text)..."></textarea>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-3 d-flex flex-column gap-3">
                
                <div class="card border-0 shadow-sm" style="flex: 1;">
                    <div class="card-header bg-white py-2 border-bottom d-flex justify-content-between align-items-center" style="height: 48px;">
                        <h6 class="fw-bold mb-0 text-dark fs-7"><i class="fas fa-truck-loading text-warning me-2"></i>Loading Plan</h6>
                    </div>
                    <div class="card-body p-0 overflow-auto" style="max-height: 400px;">
                        <div class="list-group list-group-flush" id="loadingList">
                            </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm" style="flex: 1;">
                    <div class="card-header bg-white py-2 border-bottom">
                        <h6 class="fw-bold mb-0 text-danger fs-7"><i class="fas fa-exclamation-triangle me-2"></i>Shortage Alert</h6>
                    </div>
                    <div class="card-body p-0 overflow-auto bg-white">
                        <div id="shortageAlertContainer" class="p-3 text-center text-muted small">
                            <i class="fas fa-spinner fa-spin"></i> Checking...
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div class="offcanvas offcanvas-end border-0 shadow-lg" tabindex="-1" id="historyOffcanvas" style="width: 320px;">
        <div class="offcanvas-header bg-light border-bottom py-2">
            <h6 class="offcanvas-title fw-bold text-dark">
                <i class="fas fa-history me-2 text-primary"></i>บันทึกย้อนหลัง
            </h6>
            <button type="button" class="btn-close text-reset small" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-0 bg-light">
            <div class="list-group list-group-flush" id="historyList">
                <div class="text-center py-5 text-muted small">
                    <i class="fas fa-spinner fa-spin mb-2"></i><br>Loading...
                </div>
            </div>
        </div>
    </div>

    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include_once('components/allDailyModal.php'); ?>
    <?php include_once('components/helpModal.php'); ?>

    <script src="script/daily_meeting.js?v=<?php echo time(); ?>"></script>
</body>
</html>