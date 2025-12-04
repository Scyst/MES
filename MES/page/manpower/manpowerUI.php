<?php
// page/manpower/manpowerUI.php
require_once("../../auth/check_auth.php");

// ตรวจสอบสิทธิ์
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

// 1. ตั้งค่า Header Variable
$currentUser = $_SESSION['user'];
$userLine = $currentUser['line'] ?? ''; 

$pageTitle = "Manpower Management";
$pageIcon = "fas fa-users-cog"; // ไอคอนหัวเว็บ
$pageHeaderTitle = "Manpower Management";
$pageHeaderSubtitle = "ติดตามสถานะพนักงานและการเข้ากะ (All Lines)";
$pageHelpId = ""; // ถ้ามี Modal คู่มือ ใส่ ID ตรงนี้
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        /* Override Font */
        body { font-family: 'Sarabun', sans-serif; }

        /* KPI Card Styling (เหมือนเดิมแต่ปรับให้ Clean ขึ้น) */
        .kpi-card {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 12px;
            padding: 1.5rem;
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: all 0.2s ease;
            position: relative; overflow: hidden; height: 100%;
            cursor: pointer;
        }
        .kpi-card:hover, .kpi-card.active { 
            transform: translateY(-3px); 
            box-shadow: 0 8px 15px rgba(0,0,0,0.08) !important;
            border-color: var(--bs-primary);
        }
        
        .kpi-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; }
        .kpi-primary::before { background-color: #0d6efd; }
        .kpi-success::before { background-color: #198754; }
        .kpi-warning::before { background-color: #ffc107; }
        .kpi-danger::before { background-color: #dc3545; }

        /* Icon Wrapper ใน KPI */
        .kpi-icon-box {
            width: 50px; height: 50px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
        }

        /* Loading Overlay */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); z-index: 9999;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.7); }

        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 4px solid var(--bs-border-color); border-top-color: var(--bs-primary);
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Transition สำหรับ Icon Expand ในตาราง */
        .expand-icon { transition: transform 0.3s ease; }
        tr[aria-expanded="true"] { background-color: var(--bs-primary-bg-subtle) !important; }
    </style>
</head>

<body class="dashboard-page layout-top-header">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        <div class="container-fluid p-3" style="max-width: 1600px;">
            
            <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                <div class="card-body py-3">
                    <div class="row align-items-end g-3">
                        <div class="col-md-3">
                            <label class="form-label small text-muted fw-bold mb-1">Start Date</label>
                            <input type="date" id="startDate" class="form-control form-control-sm fw-bold border" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small text-muted fw-bold mb-1">End Date</label>
                            <input type="date" id="endDate" class="form-control form-control-sm fw-bold border" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        
                        <div class="col-md-6 d-flex gap-2 align-items-end justify-content-end flex-wrap">
                            <div class="text-end me-3 d-none d-lg-block">
                                <small class="text-muted d-block" style="font-size: 0.7rem;">Last Updated:</small>
                                <small class="fw-bold text-primary" id="lastUpdateLabel">-</small>
                            </div>

                            <?php if (hasRole(['admin', 'creator', 'supervisor'])): ?>
                                <button class="btn btn-sm btn-outline-warning text-dark fw-bold" onclick="openShiftPlanner()">
                                    <i class="fas fa-exchange-alt me-2"></i>Rotation
                                </button>
                                
                                <button class="btn btn-sm btn-success fw-bold px-3" onclick="syncApiData(true)">
                                    <i class="fas fa-sync-alt me-2"></i>Sync Data
                                </button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-3 g-3">
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-primary active" id="card-total" onclick="setFilter('TOTAL')">
                        <div>
                            <h6 class="text-muted mb-1 text-uppercase small fw-bold">Total</h6>
                            <h2 class="mb-0 fw-bold text-primary" id="kpi-total">0</h2>
                        </div>
                        <div class="kpi-icon-box bg-primary bg-opacity-10 text-primary">
                            <i class="fas fa-users fa-lg"></i>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-success" id="card-present" onclick="setFilter('PRESENT')">
                        <div>
                            <h6 class="text-muted mb-1 text-uppercase small fw-bold">Present</h6>
                            <h2 class="mb-0 fw-bold text-success" id="kpi-present">0</h2>
                        </div>
                        <div class="kpi-icon-box bg-success bg-opacity-10 text-success">
                            <i class="fas fa-user-check fa-lg"></i>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-danger" id="card-absent" onclick="setFilter('ABSENT')">
                        <div>
                            <h6 class="text-muted mb-1 text-uppercase small fw-bold">Absent</h6>
                            <h2 class="mb-0 fw-bold text-danger" id="kpi-absent">0</h2>
                        </div>
                        <div class="kpi-icon-box bg-danger bg-opacity-10 text-danger">
                            <i class="fas fa-user-times fa-lg"></i>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-warning" id="card-other" onclick="setFilter('OTHER')">
                        <div>
                            <h6 class="text-muted mb-1 text-uppercase small fw-bold">Leave/Late</h6>
                            <h2 class="mb-0 fw-bold text-warning" id="kpi-other">0</h2>
                        </div>
                        <div class="kpi-icon-box bg-warning bg-opacity-10 text-warning">
                            <i class="fas fa-user-clock fa-lg"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                     <h6 class="fw-bold mb-0"><i class="fas fa-list-ul me-2"></i>Employee Status List</h6>
                     <?php if (hasRole(['admin', 'creator'])): ?>
                     <a href="employeeListUI.php" class="btn btn-sm btn-outline-primary fw-bold px-3 shadow-sm">
                        <i class="fas fa-users-cog me-1"></i> Manage Employees
                     </a>
                     <?php endif; ?>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive" style="min-height: 400px;">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light sticky-top" style="z-index: 5;">
                                <tr class="text-uppercase small text-muted">
                                    <th style="width: 50px;"></th> <th class="py-3 ps-3">Emp ID</th>
                                    <th class="py-3">Employee Detail</th>
                                    <th class="py-3 text-center">Line</th>
                                    <th class="py-3 text-center">Team</th>
                                    <th class="py-3 text-center">Shift</th>
                                    <th class="py-3 text-center">Summary</th>
                                </tr>
                            </thead>
                            <tbody id="manpowerTableBody" class="border-top-0">
                                </tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer bg-white border-top py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted" id="pageInfo">Showing 0 entries</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0 justify-content-end" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include_once('components/editLogModal.php'); ?>
    <?php include_once('components/shiftChangeModal.php'); ?>
    <?php include_once('components/editEmployeeModal.php'); ?>
    <?php include_once('components/syncConfirmModal.php'); ?>
    
    <script>
        // Override Spinner Functions (เผื่อ JS เดิมเรียกใช้)
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
    </script>

    <script src="script/manpower.js?v=<?php echo filemtime('script/manpower.js'); ?>"></script>
</body>
</html>