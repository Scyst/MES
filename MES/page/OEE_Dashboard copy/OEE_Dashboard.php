<?php 
require_once __DIR__ . '/../components/init.php'; 

$pageTitle = 'OEE Real-time Dashboard';
$pageHeaderTitle = 'OEE Monitoring';
$pageIcon = 'fas fa-chart-line';
$pageHeaderSubtitle = 'ติดตามประสิทธิภาพการผลิตและวิเคราะห์ข้อมูล (PowerBI Style)';

$isLoggedIn = (isset($_SESSION['user']) && !empty($_SESSION['user'])) || (isset($_SESSION['username']) && !empty($_SESSION['username']));
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    <style>
        /* Modern Toolbar */
        .dashboard-toolbar {
            height: 38px; border: 1px solid var(--bs-border-color);
            background-color: var(--bs-secondary-bg); padding: 2px;
            border-radius: 6px; gap: 5px;
        }
        .dashboard-toolbar select, .dashboard-toolbar input[type="date"] {
            font-family: 'Prompt', sans-serif; font-size: 0.85rem;
            color: var(--bs-body-color); cursor: pointer;
        }
        .dashboard-toolbar select:hover, .dashboard-toolbar input[type="date"]:hover {
            background-color: var(--bs-tertiary-bg) !important; border-radius: 4px;
        }
        /* Card UI */
        .chart-card {
            background: var(--bs-secondary-bg); border-radius: 8px;
            border: 1px solid var(--bs-border-color);
            box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: all 0.2s ease-in-out;
            height: 100%; display: flex; flex-direction: column; position: relative;
        }
        .chart-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: #b0b0b0; }
        
        /* KPI Gauge Container (ล็อกความสูงป้องกันกราฟทะลุ) */
        .gauge-container { height: 140px; position: relative; width: 100%; display: flex; justify-content: center; }
        
        /* Data Bar in Table */
        .data-bar-cell { position: relative; z-index: 1; text-align: right; padding-right: 12px !important; vertical-align: middle; font-weight: 600; }
        .data-bar-bg { position: absolute; top: 15%; left: 0; height: 70%; background-color: var(--bs-tertiary-bg); z-index: -1; border-radius: 0 4px 4px 0; }
        .data-bar-fill { position: absolute; top: 15%; left: 0; height: 70%; z-index: -1; border-radius: 0 4px 4px 0; transition: width 0.8s ease-out; }
        .fill-fg { background-color: rgba(25, 135, 84, 0.3); border-right: 3px solid rgba(25, 135, 84, 0.9); }
        .fill-hold { background-color: rgba(253, 126, 20, 0.3); border-right: 3px solid rgba(253, 126, 20, 0.9); }
        .fill-scrap { background-color: rgba(220, 53, 69, 0.3); border-right: 3px solid rgba(220, 53, 69, 0.9); }
        
        .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.1rem 0.5rem; font-size: 0.8rem; }
        .info-label { color: var(--bs-secondary-color); }
        .info-value { font-weight: 700; text-align: right; }
    </style>
</head>
<body class="layout-top-header">
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="page-container">
        <main id="main-content">
            <div class="content-wrapper p-3">
                
                <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                    <h5 class="fw-bold mb-0 text-dark"><i class="fas fa-industry me-2 text-primary"></i> Line Performance</h5>
                    <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                        <div class="d-flex align-items-center px-2 border-end">
                            <select id="lineFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 130px;"><option value="">All Lines</option></select>
                        </div>
                        <div class="d-flex align-items-center px-2 border-end">
                            <select id="modelFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 130px;"><option value="">All Models</option></select>
                        </div>
                        <div class="d-flex align-items-center px-2">
                            <input type="date" id="startDate" class="form-control form-control-sm border-0 bg-transparent fw-bold" style="width: 110px;">
                            <span class="text-muted mx-1"><i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i></span>
                            <input type="date" id="endDate" class="form-control form-control-sm border-0 bg-transparent fw-bold" style="width: 110px;">
                        </div>
                        <button class="btn btn-primary btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm" onclick="handleFilterChange()">
                            <i class="fas fa-sync-alt me-1"></i> Update
                        </button>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3" style="border-top: 4px solid var(--bs-primary);">
                            <h6 class="text-uppercase text-primary fw-bold mb-0 text-center">OVERALL OEE</h6>
                            <div class="gauge-container mt-2"><canvas id="oeePieChart"></canvas></div>
                            <div class="mt-2 px-2" id="oeeInfo"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3" style="border-top: 4px solid var(--bs-success);">
                            <h6 class="text-uppercase text-success fw-bold mb-0 text-center">QUALITY</h6>
                            <div class="gauge-container mt-2"><canvas id="qualityPieChart"></canvas></div>
                            <div class="mt-2 px-2" id="qualityInfo"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3" style="border-top: 4px solid var(--bs-warning);">
                            <h6 class="text-uppercase text-warning fw-bold mb-0 text-center">PERFORMANCE</h6>
                            <div class="gauge-container mt-2"><canvas id="performancePieChart"></canvas></div>
                            <div class="mt-2 px-2" id="performanceInfo"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3" style="border-top: 4px solid var(--bs-info);">
                            <h6 class="text-uppercase text-info fw-bold mb-0 text-center">AVAILABILITY</h6>
                            <div class="gauge-container mt-2"><canvas id="availabilityPieChart"></canvas></div>
                            <div class="mt-2 px-2" id="availabilityInfo"></div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-xl-8">
                        <div class="chart-card p-3 h-100">
                            <h6 class="fw-bold mb-3"><i class="fas fa-chart-area me-2 text-primary"></i>OEE Trend (Last 30 Days)</h6>
                            <div style="height: 300px; position: relative;"><canvas id="oeeLineChart"></canvas></div>
                        </div>
                    </div>
                    <div class="col-xl-4">
                        <div class="chart-card p-3 h-100">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold mb-0"><i class="fas fa-exclamation-triangle me-2 text-danger"></i>Downtime Reasons</h6>
                                <div class="btn-group btn-group-sm" id="stopCauseToggle">
                                    <button class="btn btn-outline-secondary active" data-group="cause">Cause</button>
                                    <button class="btn btn-outline-secondary" data-group="line">Line</button>
                                </div>
                            </div>
                            <div style="height: 300px; position: relative;"><canvas id="stopCauseBarChart"></canvas></div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <div class="chart-card p-3 h-100">
                            <h6 class="fw-bold mb-3"><i class="fas fa-table me-2 text-success"></i>Production Output (Data Bars)</h6>
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                                <table class="table table-sm table-hover align-middle mb-0" id="productionTable">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th>Part No.</th>
                                            <th>Line / Model</th>
                                            <th class="text-end" style="width: 20%;">FG (Good)</th>
                                            <th class="text-end" style="width: 20%;">Hold</th>
                                            <th class="text-end" style="width: 20%;">Scrap</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productionTableBody">
                                        <tr><td colspan="5" class="text-center text-muted py-3">Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <?php if ($isLoggedIn): ?>
                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <div class="chart-card p-4">
                            <h6 class="fw-bold border-bottom pb-2 mb-3 text-primary">
                                <i class="fas fa-file-invoice-dollar me-2"></i> Cost Analysis
                            </h6>
                            <div class="row text-center g-3 align-items-center">
                                <div class="col-6 col-md-3 border-end">
                                    <small class="text-muted text-uppercase d-block mb-1">Est. Revenue</small>
                                    <h4 class="fw-bold mb-0" id="prodRevenueStd">--</h4>
                                </div>
                                <div class="col-6 col-md-3 border-end">
                                    <small class="text-muted text-uppercase d-block mb-1">Total Cost</small>
                                    <h4 class="fw-bold text-danger mb-0" id="prodCostTotal">--</h4>
                                </div>
                                <div class="col-6 col-md-2 border-end">
                                    <small class="text-muted text-uppercase d-block mb-1">Material (RM)</small>
                                    <h6 class="fw-bold mb-0" id="prodCostMat">--</h6>
                                    <small class="text-muted" id="prodCostPercentRM">--%</small>
                                </div>
                                <div class="col-6 col-md-2 border-end">
                                    <small class="text-muted text-uppercase d-block mb-1">Labor (DL)</small>
                                    <h6 class="fw-bold mb-0" id="prodCostDL">--</h6>
                                    <small class="text-muted">DL: <span id="valDL">--</span> | OT: <span id="valOT">--</span></small>
                                </div>
                                <div class="col-12 col-md-2">
                                    <small class="text-primary text-uppercase d-block mb-1 fw-bold">Gross Profit</small>
                                    <h5 class="fw-bold text-success mb-0" id="prodPercentGPStd">--%</h5>
                                    <small class="text-success" id="prodGPStd">--</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

            </div>
        </main>
    </div>

    <script>const isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;</script>
    <script src="script/OEE_OEEchart.js?v=<?php echo filemtime('script/OEE_OEEchart.js'); ?>"></script>
    <script src="script/OEE_barchart.js?v=<?php echo filemtime('script/OEE_barchart.js'); ?>"></script>
    <script src="script/filterManager.js?v=<?php echo filemtime('script/filterManager.js'); ?>"></script>
</body>
</html>