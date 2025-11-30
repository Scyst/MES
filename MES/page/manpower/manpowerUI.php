<?php
// page/manpower/manpowerUI.php
require_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

$currentUser = $_SESSION['user'];
$userLine = $currentUser['line'] ?? ''; 
$pageTitle = "Manpower Management";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link rel="stylesheet" href="../dailyLog/css/portal.css?v=<?php echo time(); ?>"> 
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        /* === 🔧 CSS FIXES: แก้ไขปัญหเลย์เอาต์ === */
        
        /* 1. บังคับให้ Body เลื่อนได้ */
        html, body.dashboard-page { 
            font-family: 'Sarabun', sans-serif;
            height: auto !important; 
            min-height: 100vh;
            overflow-y: auto !important; 
        }

        /* 2. จัดการ Main Content ให้ถูกต้อง */
        #main-content {
            margin-left: 70px !important;
            width: calc(100% - 70px) !important;
            height: auto !important; /* สำคัญมาก */
            min-height: 100vh;
            overflow: visible !important;
            display: block !important; /* เลิกใช้ flex เพื่อให้ scroll ปกติ */
            padding-bottom: 50px;
        }

        .page-container {
            height: auto !important;      /* ปล่อยความสูงอิสระ */
            overflow: visible !important; /* เปิดให้ Scroll ได้ */
            display: block !important;    /* เลิกใช้ Flex ที่ดึงจนตึง */
        }

        /* 3. คืนชีพปุ่ม Hamburger */
        #sidebar-toggle-btn { display: inline-flex !important; }

        /* 4. Header Style */
        .report-header {
            background-color: var(--bs-secondary-bg);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--bs-border-color);
            position: sticky; top: 0; z-index: 1020;
        }

        /* 5. Table Container (สำคัญที่สุดสำหรับการ Scroll ตาราง) */
        .chart-box {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 16px;
            overflow: hidden; /* ซ่อนส่วนเกิน */
            display: flex; flex-direction: column;
            /* ไม่ต้อง Fix min-height ปล่อยให้ยืดตามตาราง */
            height: auto; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        /* บังคับให้ตารางมี Scrollbar ของตัวเองถ้ามันยาวเกินไป */
        .table-responsive {
            overflow-x: auto;
            overflow-y: visible; /* ให้ Scroll ตามหน้าเว็บหลัก */
        }

        /* ... (ส่วน KPI และ Loading เหมือนเดิม) ... */
        .kpi-card {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex; align-items: center; justify-content: space-between;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            transition: all 0.3s ease;
            position: relative; overflow: hidden; height: 100%;
        }
        .kpi-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px rgba(0,0,0,0.05); }
        .kpi-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
        
        .kpi-primary::before { background-color: #0d6efd; }
        .kpi-success::before { background-color: #198754; }
        .kpi-warning::before { background-color: #ffc107; }
        .kpi-danger::before { background-color: #dc3545; }

        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); z-index: 9999;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.7); }

        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 5px solid #e5e7eb; border-top-color: #0d6efd;
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .status-badge { min-width: 90px; }
    </style>
</head>

<body class="dashboard-page">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>

    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>

    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>
        
        <main id="main-content">
            
            <div class="report-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex flex-column">
                        <span class="fw-bold fs-5 text-body">
                            <span class="badge bg-primary bg-opacity-10 text-primary me-2"><i class="fas fa-users-cog"></i></span>
                            Manpower Management
                        </span>
                        <span class="text-muted small ms-1">
                            <?php echo htmlspecialchars($currentUser['role']); ?> 
                            <?php echo $userLine ? " | Line: $userLine" : " | All Lines"; ?>
                        </span>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <span class="d-none d-md-inline text-muted small me-3">
                        <i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?>
                    </span>
                    
                    <button class="btn btn-link text-secondary p-0 me-3" id="page-theme-btn" title="Switch Theme">
                        <i class="fas fa-adjust fa-lg"></i>
                    </button>
                    
                    <?php if (hasRole(['admin', 'creator'])): ?>
                    <a href="employeeListUI.php" class="btn btn-outline-secondary btn-sm fw-bold">
                        <i class="fas fa-id-card me-1"></i> Employees
                    </a>
                    <?php endif; ?>
                </div>
            </div>

            <div class="container-fluid p-4" style="max-width: 1600px;">
                
                <div class="card border-0 shadow-sm mb-4 bg-body" style="border-radius: 12px;">
                    <div class="card-body py-3">
                        <div class="row align-items-end g-3">
                            <div class="col-md-3">
                                <label class="form-label small text-muted fw-bold">Start Date</label>
                                <input type="date" id="startDate" class="form-control bg-light border-0 fw-bold" value="<?php echo date('Y-m-d'); ?>">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small text-muted fw-bold">End Date</label>
                                <input type="date" id="endDate" class="form-control bg-light border-0 fw-bold" value="<?php echo date('Y-m-d'); ?>">
                            </div>
                            <div class="col-md-6 d-flex gap-2 align-items-end justify-content-end flex-wrap">
                                <div class="text-end me-2 d-none d-lg-block">
                                    <small class="text-muted d-block" style="font-size: 0.7rem;">Last Updated:</small>
                                    <small class="fw-bold text-primary" id="lastUpdateLabel">-</small>
                                </div>

                                <?php if (hasRole(['admin', 'creator', 'supervisor'])): ?>
                                <button class="btn btn-warning text-dark px-3 fw-bold" onclick="openShiftPlanner()">
                                    <i class="fas fa-exchange-alt me-2"></i>Rotation
                                </button>
                                
                                <button class="btn btn-success px-4 fw-bold" onclick="syncApiData(true)">
                                    <i class="fas fa-sync-alt me-2"></i>Sync
                                </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row mb-4 g-3">
                    <div class="col-6 col-lg-3">
                        <div class="kpi-card kpi-primary">
                            <div>
                                <h6 class="text-muted mb-1 text-uppercase small fw-bold">Total</h6>
                                <h2 class="mb-0 fw-bold text-primary" id="kpi-total">0</h2>
                            </div>
                            <div class="p-3 bg-primary bg-opacity-10 rounded-circle text-primary">
                                <i class="fas fa-users fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="kpi-card kpi-success">
                            <div>
                                <h6 class="text-muted mb-1 text-uppercase small fw-bold">Present</h6>
                                <h2 class="mb-0 fw-bold text-success" id="kpi-present">0</h2>
                            </div>
                            <div class="p-3 bg-success bg-opacity-10 rounded-circle text-success">
                                <i class="fas fa-user-check fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="kpi-card kpi-danger">
                            <div>
                                <h6 class="text-muted mb-1 text-uppercase small fw-bold">Absent</h6>
                                <h2 class="mb-0 fw-bold text-danger" id="kpi-absent">0</h2>
                            </div>
                            <div class="p-3 bg-danger bg-opacity-10 rounded-circle text-danger">
                                <i class="fas fa-user-times fa-2x"></i>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="kpi-card kpi-warning">
                            <div>
                                <h6 class="text-muted mb-1 text-uppercase small fw-bold">Leave/Late</h6>
                                <h2 class="mb-0 fw-bold text-warning" id="kpi-other">0</h2>
                            </div>
                            <div class="p-3 bg-warning bg-opacity-10 rounded-circle text-warning">
                                <i class="fas fa-user-clock fa-2x"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chart-box">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light sticky-top" style="z-index: 5;">
                                <tr class="text-uppercase small text-muted">
                                    <th class="py-3 ps-4">Date</th>
                                    <th class="py-3">Emp ID</th>
                                    <th class="py-3">Name</th>
                                    <th class="py-3">Position</th>
                                    <th class="py-3">Line</th>
                                    <th class="py-3 text-center">Scan Time</th>
                                    <th class="py-3 text-center">Status</th>
                                    <th class="py-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody id="manpowerTableBody" class="border-top-0">
                                </tbody>
                        </table>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center p-3 border-top bg-white rounded-bottom">
                        <small class="text-muted" id="pageInfo">Showing 0 entries</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0 justify-content-end" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include_once('components/editLogModal.php'); ?>
    <?php include_once('components/shiftChangeModal.php'); ?>
    
    <script>
        // Override Spinner Functions
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
        
        // Theme Switcher (ใช้ ID ใหม่ page-theme-btn)
        document.getElementById('page-theme-btn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-bs-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('theme', next);
        });
    </script>

    <script src="script/manpower.js?v=<?php echo filemtime('script/manpower.js'); ?>"></script>
</body>
</html>