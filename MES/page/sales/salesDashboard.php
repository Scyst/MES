<?php
// page/sales/salesDashboard.php
require_once("../../auth/check_auth.php");
$pageTitle = "Sales Order Dashboard";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="../dailyLog/css/portal.css?v=<?php echo time(); ?>"> 
    <style>
        /* === [NEW LAYOUT SYSTEM] === */
        html, body.dashboard-page {
            height: 100vh;
            overflow: hidden; /* ห้าม Scroll ที่ Body */
            display: flex;
            flex-direction: column;
            font-family: 'Sarabun', sans-serif;
        }

        .page-container {
            flex: 1;
            display: flex;
            height: 100vh; /* เต็มจอ */
            overflow: hidden; /* ห้าม Scroll */
        }

        #main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden; /* ห้าม Scroll */
            background-color: var(--bs-body-bg);
        }

        /* Header: Fix Height */
        .report-header {
            flex-shrink: 0; /* ห้ามหด */
            background-color: var(--bs-secondary-bg);
            padding: 0.75rem 1.5rem;
            border-bottom: 1px solid var(--bs-border-color);
            z-index: 1020;
        }

        /* Content Area: ยืดเต็มพื้นที่ที่เหลือ */
        .content-fill {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0; /* สำคัญ! เพื่อให้ Nested Flex Scroll ทำงาน */
            padding: 1rem;
            overflow: hidden;
        }

        /* KPI & Search: ห้ามหด */
        .kpi-section, .search-section {
            flex-shrink: 0;
            margin-bottom: 1rem;
        }

        /* Table Card: ยืดจนสุดขอบล่าง */
        .table-card-fill {
            flex: 1; /* ยืดเต็มที่ */
            min-height: 0; /* สำคัญ! */
            display: flex;
            flex-direction: column;
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 12px;
            overflow: hidden;
        }

        /* Table Wrapper: Scroll ได้ทั้ง 2 แกน */
        .table-responsive-fill {
            flex: 1;
            width: 100%;
            height: 100%; /* ยืดเต็ม Card */
            overflow: auto; /* Scrollbar จะอยู่ที่นี่ */
            
            /* Scrollbar Style */
            scrollbar-width: thin;
            scrollbar-color: #adb5bd #f1f1f1;
        }
        
        /* Custom Scrollbar */
        .table-responsive-fill::-webkit-scrollbar { width: 12px; height: 12px; }
        .table-responsive-fill::-webkit-scrollbar-track { background: #f1f1f1; }
        .table-responsive-fill::-webkit-scrollbar-thumb { background-color: #adb5bd; border-radius: 10px; border: 3px solid #f1f1f1; }
        .table-responsive-fill::-webkit-scrollbar-thumb:hover { background-color: #6c757d; }

        /* Sticky Elements */
        thead.sticky-top { position: sticky; top: 0; z-index: 20; }
        .sticky-col { position: sticky; left: 0; z-index: 30; background-color: #fff !important; border-right: 2px solid #dee2e6; }
        
        /* Z-Index Fix for Intersection */
        thead.sticky-top th.sticky-col { z-index: 40; }

        /* Other Styles */
        .kpi-card { cursor: pointer; transition: all 0.2s ease; border: 1px solid transparent; }
        .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
        .kpi-card.active { border: 2px solid #0d6efd; background-color: #f0f8ff; }
        
        .table th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; vertical-align: middle; background-color: #f8f9fa; }
        .table td { font-size: 0.85rem; white-space: nowrap; vertical-align: middle; }
        
        tr.row-confirmed td, tr.row-confirmed th, tr.row-confirmed .sticky-col {
            background-color: #d1e7dd !important; color: #0f5132 !important;
        }
        
        td.editable:hover { background-color: #fff3cd !important; cursor: text; position: relative; }
        td.editable:hover::after {
            content: '\f303'; font-family: "Font Awesome 5 Free"; font-weight: 900;
            position: absolute; right: 5px; top: 50%; transform: translateY(-50%);
            font-size: 0.7rem; color: #888;
        }
        
        .text-purple { color: #6f42c1 !important; }
        .bg-purple.bg-opacity-10 { background-color: rgba(111, 66, 193, 0.1) !important; color: #6f42c1 !important; }
        .border-purple { border-color: rgba(111, 66, 193, 0.2) !important; }

        .form-check-input.status-check { width: 1.3em; height: 1.3em; cursor: pointer; border: 2px solid #adb5bd; }
        .form-check-input.status-check:checked { background-color: #198754; border-color: #198754; }

        .long-text-cell {
            max-width: 200px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* ปรับแต่ง Input ตอนแก้ไขไม่ให้ดันตาราง */
        td.editable input {
            width: 100%;
            min-width: 0; /* สำคัญ: ป้องกัน Flex/Grid ดัน */
        }
    </style>
</head>
<body class="dashboard-page">
    
    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <h5 class="fw-bold text-muted">Processing...</h5>
    </div>

    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>

    <div class="page-container">
        <main id="main-content">
            <div class="report-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-success bg-opacity-10 text-success me-3 p-2 fs-4 rounded-3 shadow-sm">
                            <i class="fas fa-shipping-fast"></i>
                        </span>
                        <div class="d-flex align-items-baseline flex-wrap">
                            <span class="fw-bold fs-4 text-body me-2">Sales Order Tracking</span>
                            <span class="text-muted small border-start ps-2" style="border-color: #dee2e6 !important;">
                                ติดตามสถานะการผลิตและการโหลดตู้
                            </span>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-link text-secondary p-0" data-bs-toggle="modal" data-bs-target="#helpModal" title="คู่มือการใช้งาน">
                        <i class="far fa-question-circle fa-lg"></i>
                    </button>
                    <button class="btn btn-primary fw-bold shadow-sm" onclick="document.getElementById('fileInput').click()">
                        <i class="fas fa-file-upload me-2"></i> Import Excel/CSV
                    </button>
                    <button class="btn btn-success fw-bold shadow-sm me-2" onclick="openCreateModal()">
                        <i class="fas fa-plus me-2"></i> New Order
                    </button>
                    <input type="file" id="fileInput" hidden accept=".csv, .xlsx, .xls">
                </div>
            </div>

            <div class="content-fill">
                
                <div class="row g-3 kpi-section">
                    <div class="col-md-3">
                        <div class="card shadow-sm kpi-card" onclick="filterData('WAIT_PROD')">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Wait Production</div><h2 class="text-warning fw-bold mb-0" id="kpi-wait-prod">0</h2></div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle"><i class="fas fa-industry fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm kpi-card" onclick="filterData('PROD_DONE')">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Production Done</div><h2 class="text-primary fw-bold mb-0" id="kpi-prod-done">0</h2></div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><i class="fas fa-check-circle fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm kpi-card" onclick="filterData('WAIT_LOAD')">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Ready to Load</div><h2 class="text-info fw-bold mb-0" id="kpi-wait-load">0</h2></div>
                                    <div class="bg-info bg-opacity-10 text-info p-3 rounded-circle"><i class="fas fa-dolly fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card shadow-sm kpi-card" onclick="filterData('LOADED')">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div><div class="text-uppercase text-muted small fw-bold mb-1">Loaded / Shipped</div><h2 class="text-success fw-bold mb-0" id="kpi-loaded">0</h2></div>
                                    <div class="bg-success bg-opacity-10 text-success p-3 rounded-circle"><i class="fas fa-ship fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card border-0 shadow-sm search-section">
                    <div class="card-body py-2">
                        <div class="row align-items-center">
                            <div class="col-md-4">
                                <div class="input-group">
                                    <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-start-0" placeholder="Search PO, SKU, Color, Status...">
                                </div>
                            </div>
                            <div class="col-md-8 text-end">
                                <div class="d-inline-flex align-items-center gap-2 bg-light px-3 py-2 rounded border">
                                    <span class="fw-bold text-secondary small text-uppercase">Summary:</span>
                                    <span class="badge bg-dark text-white" id="sum-containers">0 Containers</span>
                                    <span class="badge bg-primary" id="sum-qty">0 Pcs</span>
                                    <span class="border-start mx-2" style="height: 15px;"></span>
                                    <span class="fw-bold text-success" id="sum-amount" style="font-family: monospace; font-size: 1.1em;">$0.00</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="table-card-fill shadow-sm">
                    <div class="table-responsive-fill">
                        <table class="table table-bordered table-hover align-middle mb-0 text-nowrap">
                            <thead class="bg-light text-secondary sticky-top">
                                <tr class="text-center">
                                    <th class="sticky-col shadow-sm" style="min-width: 120px;">PO Number</th>
                                    <th class="ps-3 bg-white border-start" style="width: 50px; position: sticky; right: 0; z-index: 15;">Conf.</th>
                                    <th>Order Date</th>
                                    <th>SKU</th>
                                    <th>Description</th>
                                    <th>Color</th>
                                    <th class="text-center">Qty</th>
                                    
                                    <th>DC</th>
                                    <th>Load Wk</th>
                                    <th>Ship Wk</th>
                                    
                                    <th class="text-center bg-warning bg-opacity-10 border-start border-warning">Prod Date</th>
                                    <th class="text-center bg-warning bg-opacity-10" style="width: 60px;">Done?</th>
                                    
                                    <th class="text-center bg-info bg-opacity-10 border-start border-info">Load Date</th>
                                    <th class="text-center bg-info bg-opacity-10" style="width: 60px;">Loaded?</th>
                                    
                                    <th class="text-center bg-purple bg-opacity-10 border-start border-purple">Insp Date</th>
                                    <th class="text-center bg-purple bg-opacity-10" style="width: 60px;">Pass?</th>
                                    
                                    <th class="text-end">Price</th>
                                    <th>Ticket</th>
                                    <th>Remark</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold"><i class="fas fa-file-import me-2"></i>Import Results</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="text-center mb-3">
                        <h3 class="text-success fw-bold mb-0" id="importSuccessCount">0</h3>
                        <small class="text-muted">รายการที่นำเข้าสำเร็จ</small>
                    </div>
                    <div id="importErrorSection" class="d-none">
                        <div class="alert alert-warning d-flex align-items-center mb-2">
                            <i class="fas fa-exclamation-triangle me-2"></i>
                            <div>พบปัญหา <strong id="importSkipCount">0</strong> รายการ (ถูกข้าม)</div>
                        </div>
                        <textarea id="importErrorLog" class="form-control form-control-sm font-monospace bg-light text-danger border-0" rows="5" readonly style="font-size: 0.8rem;"></textarea>
                    </div>
                    <div id="importAllSuccess" class="text-center text-success py-2 d-none">
                        <i class="fas fa-check-circle fa-2x mb-2"></i><br>นำเข้าข้อมูลครบถ้วนสมบูรณ์
                    </div>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง (OK)</button>
                </div>
            </div>
        </div>
    </div>

    <?php
        include('components/createOrderModal.php');
        include 'components/helpModal.php';
    ?>

    <script src="https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js"></script>
    <script src="script/salesDashboard.js?v=<?php echo time(); ?>"></script>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script>
        function showToast(msg, color='#333') {
            const el = document.createElement('div');
            el.className = 'toast show position-fixed top-0 end-0 m-3 text-white border-0 shadow';
            el.style.backgroundColor = color;
            el.style.zIndex = 1060;
            el.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
            document.body.appendChild(el);
            setTimeout(()=>el.remove(), 3000);
        }
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
    </script>
</body>
</html>