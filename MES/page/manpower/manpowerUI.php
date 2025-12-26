<?php
// page/manpower/manpowerUI.php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์
if (!isset($_SESSION['user'])) {
    header("Location: ../../login.php");
    exit;
}

// 1. ตั้งค่า Header Variable (สำหรับ top_header.php)
$currentUser = $_SESSION['user'];
$pageTitle = "Manpower Management";
$pageHeaderTitle = "Manpower Management";
$pageHeaderSubtitle = "ติดตามสถานะพนักงานและการเข้ากะ (All Lines)";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>

    <style>
        body { font-family: 'Sarabun', sans-serif; }

        html, body {
            height: 100%;
            overflow: hidden;
            margin: 0;
        }
        /* =========================================
        1. TABLE STYLING (THEME AWARE)
        ========================================= */
        .table-summary th { 
            position: sticky; 
            top: 0; 
            /* ใช้สีพื้นหลังจาก Theme Variable (รองรับ Dark Mode อัตโนมัติ) */
            background-color: var(--bs-tertiary-bg); 
            color: var(--bs-body-color);
            z-index: 10; /* ให้ Header ลอยเหนือข้อมูล */
            font-size: 0.85rem; 
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 1px 0 var(--bs-border-color); /* เส้นขอบล่างแบบ Sticky */
            vertical-align: middle;
        }

        .table-summary td { 
            font-size: 0.9rem; 
            padding: 0.6rem 1rem !important; 
            vertical-align: middle;
            border-color: var(--bs-border-color); /* ใช้สีเส้นขอบตามธีม */
        }

        /* เส้นแบ่งคอลัมน์สำคัญ (Actual) */
        .border-start-custom {
            border-left: 2px solid var(--bs-border-color) !important;
        }
        .border-end-custom {
            border-right: 2px solid var(--bs-border-color) !important;
        }

        /* แถวที่ถูกเลือก (Active Filter) */
        .table-warning {
            /* เปลี่ยนจากสีเหลือง เป็นสี Primary (สีเดียวกับปุ่ม/ธีมหลัก) แบบจางๆ */
            background-color: rgba(var(--bs-primary-rgb), 0.1) !important; 
            
            /* เพิ่มลูกเล่น: เส้นขอบซ้ายสีเข้ม เพื่อให้รู้ชัดเจนว่าแถวนี้ถูกเลือกอยู่ */
            box-shadow: inset 4px 0 0 var(--bs-primary) !important;
        }

        [data-bs-theme="dark"] .table-warning {
            /* Dark Mode: เพิ่มความเข้มเล็กน้อยให้อ่านง่ายบนพื้นดำ */
            background-color: rgba(var(--bs-primary-rgb), 0.25) !important;
            
            /* ปรับสีตัวอักษรให้สว่างขึ้นเพื่อให้ตัดกับพื้นหลัง (เผื่อกรณีสีเดิมจม) */
            color: var(--bs-primary-text-emphasis) !important; 
        }
        
        /* เสริม: ถ้าใน Dark Mode ตัวเลขในแถวที่เลือกมองยาก ให้ปรับสีพวก text-* ให้สว่างขึ้น */
        [data-bs-theme="dark"] .table-warning td {
            color: #e0e0e0;
        }

        /* =========================================
        2. UTILITIES & ANIMATIONS
        ========================================= */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); z-index: 9999;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.8); }

        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 4px solid var(--bs-border-color); border-top-color: var(--bs-primary);
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        .cursor-pointer { cursor: pointer; }
        .transition-icon { transition: transform 0.2s ease; }
        .fa-rotate-90 { transform: rotate(90deg); }

        /* 1. สำหรับแถวตาราง (Summary Table) ต้องเป็น table-row เท่านั้น */
        tr.collapse.show {
            display: table-row !important;
        }

        /* 2. สำหรับกล่องรายละเอียด (Employee List) ต้องเป็น block */
        div.collapse.show {
            display: block !important;
        }

        /* 3. ลบ Animation ที่ทำให้กระพริบทิ้ง */
        tr.collapse {
            transition: background-color 0.3s ease;
        }

        @keyframes fadeInRow {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Tabs Custom Style */
        .nav-tabs .nav-link { 
            border: none; 
            color: var(--bs-secondary); 
            font-weight: 500; 
            border-bottom: 3px solid transparent; 
            transition: all 0.2s;
        }
        .nav-tabs .nav-link:hover { color: var(--bs-body-color); }
        .nav-tabs .nav-link.active { 
            color: var(--bs-primary); 
            background: transparent; 
            border-bottom-color: var(--bs-primary); 
            font-weight: 700;
        }
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
                        <div class="col-auto">
                            <div class="form-check form-switch mb-1">
                                <input class="form-check-input cursor-pointer" type="checkbox" id="dateRangeToggle">
                                <label class="form-check-label small text-muted cursor-pointer" for="dateRangeToggle">เลือกช่วงเวลา (Range)</label>
                            </div>
                            <div class="d-flex gap-2">
                                <div>
                                    <input type="date" id="startDate" class="form-control form-control-sm fw-bold border-primary" value="<?php echo date('Y-m-d'); ?>">
                                </div>
                                <div id="endDateWrapper" class="d-none"> <div class="d-flex align-items-center gap-2">
                                        <span class="text-muted small">ถึง</span>
                                        <input type="date" id="endDate" class="form-control form-control-sm fw-bold border-primary" value="<?php echo date('Y-m-d'); ?>">
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col d-flex gap-2 align-items-end justify-content-end flex-wrap">
                            <div class="text-end me-3 d-none d-lg-block">
                                <small class="text-muted d-block" style="font-size: 0.7rem;">Last Updated:</small>
                                <small class="fw-bold text-primary" id="lastUpdateLabel">-</small>
                            </div>
                            <div class="btn-group">
                                <button type="button" class="btn btn-sm btn-primary fw-bold px-3 dropdown-toggle shadow-sm" data-bs-toggle="dropdown" aria-expanded="false">
                                    <i class="fas fa-file-export me-2"></i>Export
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end shadow">
                                    <li>
                                        <button class="dropdown-item py-2" onclick="exportPivotExcel()">
                                            <i class="fas fa-file-excel me-2 text-success"></i>Executive Summary (Pivot)
                                        </button>
                                    </li>
                                    <li>
                                        <button class="dropdown-item py-2" onclick="exportDetailsCSV()">
                                            <i class="fas fa-users me-2 text-success"></i>Employee List
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <button class="btn btn-sm btn-outline-dark fw-bold d-none" onclick="openMappingModal()">
                                <i class="fas fa-sitemap me-1"></i> Mapping
                            </button>
                            <button class="btn btn-sm btn-success fw-bold px-3" onclick="syncApiData(true)">
                                <i class="fas fa-sync-alt me-2"></i> Sync Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3 mt-4">
                <h6 class="fw-bold mb-0 text-primary"><i class="fas fa-chart-pie me-2"></i>Executive Summary (รายงานสรุป)</h6>
                <div id="summaryViewControls"></div>
            </div>

            <div class="card shadow-sm border-0 mb-4">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="mainSummaryTable">
                            <thead class="table-summary"></thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="d-flex align-items-center gap-3">
                <h5 class="fw-bold text-body m-0"><i class="fas fa-users me-2"></i>Employee List</h5>
                
                <span id="activeFilterBadge" class="badge bg-warning text-body d-none align-items-center shadow-sm px-3 py-2 cursor-pointer" onclick="resetTableFilter()" title="Click to clear filter" style="font-size: 0.85rem;">
                    <i class="fas fa-filter me-2"></i> 
                    <span id="activeFilterText">Filtered</span>
                    <i class="fas fa-times ms-2 opacity-50"></i>
                </span>
            </div>

            <div class="d-flex justify-content-between align-items-end mb-2 mt-4">
                <ul class="nav nav-tabs mb-0 border-bottom-0" id="statusTabs">
                    <li class="nav-item">
                        <button class="nav-link active" onclick="setFilter('TOTAL'); document.querySelectorAll('#statusTabs .nav-link').forEach(b=>b.classList.remove('active')); this.classList.add('active');">
                            TOTAL
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link text-success" onclick="setFilter('PRESENT'); document.querySelectorAll('#statusTabs .nav-link').forEach(b=>b.classList.remove('active')); this.classList.add('active');">
                            PRESENT
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link text-info" onclick="setFilter('LEAVE'); document.querySelectorAll('#statusTabs .nav-link').forEach(b=>b.classList.remove('active')); this.classList.add('active');">
                            LEAVE
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link text-warning" onclick="setFilter('LATE'); document.querySelectorAll('#statusTabs .nav-link').forEach(b=>b.classList.remove('active')); this.classList.add('active');">
                            LATE
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link text-danger" onclick="setFilter('ABSENT'); document.querySelectorAll('#statusTabs .nav-link').forEach(b=>b.classList.remove('active')); this.classList.add('active');">
                            ABSENT
                        </button>
                    </li>
                </ul>
                <div class="col d-flex gap-2 align-items-end justify-content-end flex-wrap">
                    <button class="btn btn-sm btn-outline-warning text-body fw-bold" onclick="openShiftPlanner()">
                        <i class="fas fa-exchange-alt me-2"></i>Rotation
                    </button>
                    <a href="employeeListUI.php" class="btn btn-sm btn-outline-primary fw-bold px-3 shadow-sm">
                        <i class="fas fa-users-cog me-1"></i> Manage Employees
                    </a>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
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
                            <tbody id="manpowerTableBody" class="border-top-0"></tbody>
                        </table>
                    </div>
                </div>
                <div class="card-footer bg-body border-top py-3">
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
    <?php include_once('components/manpower_modals_bundle.php'); ?>

    <div id="syncLoader" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; color:white; backdrop-filter: blur(8px);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; max-width: 400px;">
            <div class="spinner-border text-success" role="status" style="width: 4rem; height: 4rem; border-width: 0.25em;"></div>
            <h3 style="margin-top:25px; font-weight: 700; letter-spacing: 1px;" id="syncStatusText">กำลังประมวลผล...</h3>
            <div class="mt-3 p-3 rounded" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
                <p id="syncProgressDetailText" class="mb-0" style="font-size: 0.95rem; color: #adffad;">กำลังดึงข้อมูลและคำนวณค่าแรง...</p>
            </div>
            <p class="mt-4 text-muted small"><i class="fas fa-exclamation-triangle me-2"></i>กรุณาอย่าปิดหน้าต่างนี้จนกว่าระบบจะทำงานเสร็จสิ้น</p>
        </div>
    </div>
    
    <script>
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
    </script>
    
    <script src="script/manpower.js?v=<?php echo time(); ?>"></script>ฃ
</body>
</html>