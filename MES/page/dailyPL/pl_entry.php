<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "Daily P&L Entry";
$pageHeaderTitle = "Daily P&L Entry";
$pageHeaderSubtitle = "บันทึกและตรวจสอบค่าใช้จ่ายรายวัน";

$v = filemtime(__DIR__ . '/script/pl_entry.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap" rel="stylesheet">
    
    <style>
        /* =========================================
           1. APP-LIKE LAYOUT (เลียนแบบ SalesDashboard)
           ========================================= */
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden; /* ล็อคไม่ให้ Scroll ที่ Body */
            font-family: 'Sarabun', sans-serif;
            background-color: #f8f9fa;
        }

        .page-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        #main-content {
            flex: 1;
            height: 100%; /* สำคัญมาก */
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }

        .content-wrapper {
            flex: 1;
            overflow-y: auto; /* Scroll เฉพาะตรงนี้ */
            overflow-x: hidden;
            padding: 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        /* =========================================
           2. METRIC CARDS (สไตล์ Executive)
           ========================================= */
        .metric-card {
            background: #fff;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.05);
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            padding: 1rem 1.25rem;
            height: 100%;
            transition: transform 0.2s, box-shadow 0.2s;
            position: relative;
            overflow: hidden;
        }
        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .metric-label {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6c757d;
            margin-bottom: 0.5rem;
        }
        .metric-value {
            font-size: 1.6rem;
            font-weight: 700;
            line-height: 1.2;
            color: #2c3e50;
        }
        .metric-icon-bg {
            position: absolute;
            right: -10px;
            bottom: -10px;
            font-size: 4rem;
            opacity: 0.05;
            transform: rotate(-15deg);
        }

        /* =========================================
           3. TABLE DESIGN (สไตล์ SalesDashboard)
           ========================================= */
        .card-table {
            background: #fff;
            border-radius: 12px;
            border: 1px solid rgba(0,0,0,0.05);
            box-shadow: 0 4px 12px rgba(0,0,0,0.03);
            display: flex;
            flex-direction: column;
            flex: 1; /* ยืดให้เต็มพื้นที่ที่เหลือ */
            min-height: 0; /* ป้องกัน Flex item ล้น */
            overflow: hidden;
        }

        .table-custom {
            margin-bottom: 0;
        }
        
        .table-custom thead th {
            background-color: #f1f3f5; /* เทาอ่อนสะอาดตา */
            color: #495057;
            font-weight: 600;
            font-size: 0.85rem;
            text-transform: uppercase;
            padding: 12px 16px;
            border-bottom: 1px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
            white-space: nowrap;
        }

        .table-custom tbody td {
            padding: 8px 16px;
            vertical-align: middle;
            border-bottom: 1px solid #f0f0f0;
            font-size: 0.95rem;
            color: #333;
        }

        /* Row Styling */
        .row-section {
            background-color: #f8f9fa;
        }
        .row-section td {
            font-weight: 700;
            color: #495057;
            padding-top: 15px;
            padding-bottom: 15px;
        }

        /* Connector Line Effect */
        .child-item {
            position: relative;
            padding-left: 2.5rem !important;
        }
        .child-item::before {
            content: '';
            position: absolute;
            left: 1.2rem;
            top: -12px;
            height: 35px;
            width: 15px;
            border-left: 2px solid #dee2e6;
            border-bottom: 2px solid #dee2e6;
            border-bottom-left-radius: 8px;
        }

        /* =========================================
           4. SOFT BADGES & INPUTS
           ========================================= */
        .badge-soft-success { background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
        .badge-soft-warning { background-color: #fff3cd; color: #664d03; border: 1px solid #ffecb5; }
        .badge-soft-danger  { background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7; }
        .badge-soft-info    { background-color: #cff4fc; color: #055160; border: 1px solid #b6effb; }
        .badge-soft-secondary { background-color: #e2e3e5; color: #41464b; border: 1px solid #d3d6d8; }

        /* Modern Input: ดูเหมือน Text ธรรมดาจนกว่าจะ Focus */
        .input-seamless {
            border: 1px solid transparent;
            background: transparent;
            border-radius: 6px;
            padding: 4px 8px;
            font-weight: 600;
            color: #212529;
            width: 100%;
            transition: all 0.2s;
        }
        .input-seamless:hover:not([readonly]) {
            background-color: #f8f9fa;
            border-color: #e9ecef;
        }
        .input-seamless:focus {
            background-color: #fff;
            border-color: #86b7fe;
            box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.15);
            outline: 0;
        }
        .input-seamless[readonly] {
            color: #6c757d;
            background-color: transparent;
            cursor: default;
        }
        .input-seamless.is-valid {
            background-color: #d1e7dd !important;
            color: #0f5132 !important;
        }

        /* Toolbar Styling */
        .toolbar-container {
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
            padding: 0.75rem 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0; /* ห้ามหด */
        }
    </style>
</head>
<body class="layout-top-header">
    
    <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>

        <div id="main-content">
            
            <div class="toolbar-container shadow-sm z-2">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center bg-light rounded px-2 py-1 border">
                        <i class="far fa-calendar-alt text-secondary me-2"></i>
                        <input type="date" id="targetDate" class="form-control form-control-sm border-0 bg-transparent p-0 fw-bold text-dark" style="width: 130px;">
                    </div>
                    
                    <div class="vr mx-1"></div>

                    <div class="d-flex align-items-center bg-light rounded px-2 py-1 border">
                        <i class="fas fa-industry text-secondary me-2"></i>
                        <select id="sectionFilter" class="form-select form-select-sm border-0 bg-transparent p-0 fw-bold text-dark" style="width: 150px; box-shadow: none;">
                            <option value="Team 1">Team 1</option>
                            <option value="Team 2">Team 2</option>
                        </select>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadEntryData()">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-success">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-success">Total Revenue</div>
                                    <div class="metric-value text-dark" id="estRevenue">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-success">Auto</span>
                                </div>
                            </div>
                            <i class="fas fa-coins metric-icon-bg text-success"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-warning">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-warning">Total Cost & Exp.</div>
                                    <div class="metric-value text-dark" id="estCost">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-warning">Mixed</span>
                                </div>
                            </div>
                            <i class="fas fa-wallet metric-icon-bg text-warning"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-primary">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-primary">Est. Net Profit</div>
                                    <div class="metric-value text-primary" id="estGP">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-primary">Live</span>
                                </div>
                            </div>
                            <i class="fas fa-chart-pie metric-icon-bg text-primary"></i>
                        </div>
                    </div>
                </div>

                <div class="card-table">
                    <div class="overflow-auto custom-scrollbar h-100"> <table class="table table-custom table-hover w-100">
                            <thead>
                                <tr>
                                    <th style="width: 80px;" class="text-center">Code</th>
                                    <th style="width: 40%;">Account Item</th>
                                    <th style="width: 100px;" class="text-center">Type</th>
                                    <th style="width: 100px;" class="text-center">Source</th>
                                    <th class="text-end pe-4">Amount (THB)</th>
                                </tr>
                            </thead>
                            <tbody id="entryTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>

            </div> </div> </div>

    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>