<!DOCTYPE html>
<html lang="th">
<head>
    <title>Manpower Management</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    
    <link rel="stylesheet" href="../components/css/style.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../components/css/mobile.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../components/css/fonts.css?v=<?php echo time(); ?>">

    <script src="../components/js/sidebar.js" defer></script>
    <script src="../components/js/theme-switcher.js" defer></script>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        body { font-family: 'Sarabun', sans-serif; }

        /* KPI Cards */
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

        .kpi-icon-box {
            width: 50px; height: 50px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%;
        }

        /* [NEW] Style สำหรับตารางสรุป 3 ช่อง */
        .summary-card-height {
            height: 380px;
            display: flex; flex-direction: column;
        }
        .summary-table-scroll {
            flex: 1; overflow-y: auto; overflow-x: hidden;
        }
        .summary-table-scroll::-webkit-scrollbar { width: 6px; }
        .summary-table-scroll::-webkit-scrollbar-track { background: #f1f1f1; }
        .summary-table-scroll::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
        
        .table-summary th { position: sticky; top: 0; background: #f8f9fa; z-index: 5; font-size: 0.85rem; }
        .table-summary td { font-size: 0.9rem; padding: 0.5rem 1rem !important; }

        /* Loading Overlay */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); z-index: 9999;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 4px solid var(--bs-border-color); border-top-color: var(--bs-primary);
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Transition สำหรับ Icon Expand */
        .expand-icon { transition: transform 0.3s ease; }
        tr[aria-expanded="true"] { background-color: var(--bs-primary-bg-subtle) !important; }
    </style>
</head>

<body class="dashboard-page layout-top-header">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>

    <header class="portal-top-header">
        <div class="d-flex align-items-center gap-3">
            <button class="btn btn-link text-secondary d-xl-none p-0 me-2" id="sidebar-toggle-mobile-top">
                <i class="fas fa-bars fa-lg"></i>
            </button>
            <div class="header-logo-box bg-primary bg-opacity-10 text-primary">
                <i class="fas fa-users-cog fa-lg"></i>
            </div>
            <div class="d-flex flex-column justify-content-center">
                <h5 class="fw-bold mb-0 text-body" style="line-height: 1.2;">Manpower Management</h5>
                <small class="text-muted" style="font-size: 0.75rem;">ติดตามสถานะพนักงานและการเข้ากะ (All Lines)</small>
            </div>
        </div>

        <div class="d-flex align-items-center gap-2">
            <span class="d-none d-lg-inline text-muted small me-3">
                <i class="far fa-clock me-1"></i> <?php echo date('j F Y'); ?>
            </span>
            <nav class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <button class="dropdown-toggle-btn" id="sidebar-toggle-btn">
                        <i class="fas fa-bars fa-fw" style="font-size: 1.5rem;"></i>
                    </button>
                </div>
                <ul class="custom-dropdown">
                    <?php include('../components/php/nav_dropdown.php'); ?>
                </ul>
            </nav>
        </div>
    </header>

    <main id="main-content">
        <div class="container-fluid p-3" style="max-width: 1600px;">
            
            <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                <div class="card-body py-3">
                    <div class="row align-items-end g-3">
                        <div class="col-md-2">
                            <label class="form-label small text-muted fw-bold mb-1">ตั้งแต่วันที่</label>
                            <input type="date" id="startDate" class="form-control form-control-sm fw-bold border-primary" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small text-muted fw-bold mb-1">ถึงวันที่</label>
                            <input type="date" id="endDate" class="form-control form-control-sm fw-bold border-primary" value="<?php echo date('Y-m-d'); ?>">
                        </div>
                        
                        <div class="col-md-8 d-flex gap-2 align-items-end justify-content-end flex-wrap">
                            <div class="text-end me-3 d-none d-lg-block">
                                <small class="text-muted d-block" style="font-size: 0.7rem;">Last Updated:</small>
                                <small class="fw-bold text-primary" id="lastUpdateLabel">-</small>
                            </div>
                            <button class="btn btn-sm btn-outline-warning text-dark fw-bold" onclick="openShiftPlanner()">
                                <i class="fas fa-exchange-alt me-2"></i>Rotation
                            </button>
                            <button class="btn btn-sm btn-outline-dark fw-bold" onclick="openMappingModal()">
                                <i class="fas fa-sitemap me-1"></i> Mapping
                            </button>
                            <button class="btn btn-sm btn-success fw-bold px-3" onclick="syncApiData(true)">
                                <i class="fas fa-sync-alt me-2"></i> Sync Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-3 g-3">
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-primary active" id="card-total" onclick="setFilter('TOTAL')">
                        <div><h6 class="text-muted mb-1 text-uppercase small fw-bold">Total</h6><h2 class="mb-0 fw-bold text-primary" id="kpi-total">0</h2></div>
                        <div class="kpi-icon-box bg-primary bg-opacity-10 text-primary"><i class="fas fa-users fa-lg"></i></div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-success" id="card-present" onclick="setFilter('PRESENT')">
                        <div><h6 class="text-muted mb-1 text-uppercase small fw-bold">Present</h6><h2 class="mb-0 fw-bold text-success" id="kpi-present">0</h2></div>
                        <div class="kpi-icon-box bg-success bg-opacity-10 text-success"><i class="fas fa-user-check fa-lg"></i></div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-warning" id="card-late" onclick="setFilter('LATE')">
                        <div><h6 class="text-muted mb-1 text-uppercase small fw-bold">Late</h6><h2 class="mb-0 fw-bold text-warning" id="kpi-late">0</h2></div>
                        <div class="kpi-icon-box bg-warning bg-opacity-10 text-warning"><i class="fas fa-user-clock fa-lg"></i></div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="kpi-card kpi-danger" id="card-absent" onclick="setFilter('ABSENT')">
                        <div><h6 class="text-muted mb-1 text-uppercase small fw-bold">Absent</h6><h2 class="mb-0 fw-bold text-danger" id="kpi-absent">0</h2></div>
                        <div class="kpi-icon-box bg-danger bg-opacity-10 text-danger"><i class="fas fa-user-times fa-lg"></i></div>
                    </div>
                </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-2 mt-4">
                <h6 class="fw-bold mb-0 text-primary"><i class="fas fa-chart-pie me-2"></i>Executive Summary (รายงานสรุป)</h6>
            </div>
            
            <div class="row g-4 mb-4" id="summarySection">
                <div class="col-md-4">
                    <div class="card h-100 border-0 shadow-sm summary-card-height">
                        <div class="card-header bg-white py-2 border-bottom fw-bold text-primary">
                            <i class="fas fa-industry me-2"></i>1. จำนวนคนแยกตาม Line
                        </div>
                        <div class="card-body p-0 summary-table-scroll">
                            <table class="table table-sm table-hover mb-0 table-summary" id="tableByLine">
                                <thead><tr><th class="ps-3">Line</th><th class="text-end pe-3">Count</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card h-100 border-0 shadow-sm summary-card-height">
                        <div class="card-header bg-white py-2 border-bottom fw-bold text-info">
                            <i class="fas fa-clock me-2"></i>2. สรุปกะ (Shift & Team)
                        </div>
                        <div class="card-body p-0 summary-table-scroll">
                            <table class="table table-sm table-hover mb-0 table-summary" id="tableByShift">
                                <thead><tr><th class="ps-3">Shift</th><th>Team</th><th class="text-end pe-3">Count</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card h-100 border-0 shadow-sm summary-card-height">
                        <div class="card-header bg-white py-2 border-bottom fw-bold text-success">
                            <i class="fas fa-id-badge me-2"></i>3. ประเภทพนักงาน
                        </div>
                        <div class="card-body p-0 summary-table-scroll">
                            <table class="table table-sm table-hover mb-0 table-summary" id="tableByType">
                                <thead><tr><th class="ps-3">Type</th><th class="text-end pe-3">Count</th></tr></thead>
                                <tbody></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0"><i class="fas fa-list-ul me-2"></i>Employee Status List</h6>
                    <a href="employeeListUI.php" class="btn btn-sm btn-outline-primary fw-bold px-3 shadow-sm">
                        <i class="fas fa-users-cog me-1"></i> Manage Employees
                    </a>
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
                                    <th class="py-3 text-center">Summary</th> </tr>
                            </thead>
                            <tbody id="manpowerTableBody" class="border-top-0"></tbody>
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

    <div class="docking-sidebar" id="docking-sidebar"></div>
    
    <div class="offcanvas offcanvas-start" tabindex="-1" id="globalMobileMenu">
        <div class="offcanvas-header">
            <h5 class="offcanvas-title"><i class="fas fa-user-alt fa-fw me-2"></i> Menu</h5>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div class="offcanvas-body p-0">
            <ul class="list-group list-group-flush" style="margin-top: 5px;">
                <?php include('../components/php/nav_dropdown.php'); ?>
            </ul>
        </div>
    </div>

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
    
    <script src="script/manpower.js?v=<?php echo time(); ?>"></script>
</body>
</html>