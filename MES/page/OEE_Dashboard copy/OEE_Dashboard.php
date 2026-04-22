<?php 
require_once __DIR__ . '/../components/init.php'; 

$pageTitle = 'OEE Real-time Dashboard';
$pageHeaderTitle = 'OEE & Cost Monitoring';
$pageIcon = 'fas fa-chart-pie';
$pageHeaderSubtitle = 'ติดตามประสิทธิภาพการผลิตและวิเคราะห์ต้นทุน (Executive View)';

$isLoggedIn = (isset($_SESSION['user']) && !empty($_SESSION['user'])) || (isset($_SESSION['username']) && !empty($_SESSION['username']));
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    <style>
        /* 🚀 Soft UI & PowerBI Style */
        html, body.layout-top-header { height: auto !important; min-height: 100vh; overflow-x: hidden; overflow-y: auto !important; background-color: #f8f9fa; }
        .page-container, #main-content { height: auto !important; min-height: 100%; overflow: visible !important; }
        
        .dashboard-toolbar { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .dashboard-toolbar select, .dashboard-toolbar input[type="date"] { font-family: 'Prompt', sans-serif; font-size: 0.85rem; border-radius: 6px; }
        .dashboard-toolbar select:hover, .dashboard-toolbar input[type="date"]:hover { background-color: #f1f5f9 !important; }
        
        .chart-card {
            background: #fff; border-radius: 12px; border: 1px solid #e2e8f0;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: all 0.3s ease; height: 100%; display: flex; flex-direction: column;
        }
        .chart-card:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.08); transform: translateY(-2px); }
        
        /* ล็อคขนาด Gauge Chart ให้พอดีเป๊ะ */
        .gauge-container { height: 110px !important; position: relative; width: 100%; display: flex; justify-content: center; }
        
        /* Data Bar in Table */
        .table-responsive { max-height: 400px; overflow-y: auto; }
        .table-responsive::-webkit-scrollbar { width: 6px; }
        .table-responsive::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .data-bar-cell { position: relative; z-index: 1; text-align: right; padding-right: 12px !important; vertical-align: middle; font-weight: 600; }
        .data-bar-bg { position: absolute; top: 20%; left: 0; height: 60%; background-color: #f1f5f9; z-index: -1; border-radius: 0 4px 4px 0; }
        .data-bar-fill { position: absolute; top: 20%; left: 0; height: 60%; z-index: -1; border-radius: 0 4px 4px 0; transition: width 0.8s ease-out; }
        .fill-fg { background-color: rgba(25, 135, 84, 0.2); border-right: 3px solid rgba(25, 135, 84, 0.9); }
        .fill-hold { background-color: rgba(253, 126, 20, 0.2); border-right: 3px solid rgba(253, 126, 20, 0.9); }
        .fill-scrap { background-color: rgba(220, 53, 69, 0.2); border-right: 3px solid rgba(220, 53, 69, 0.9); }
        
        /* สไตล์ Info ใต้ Gauge */
        .metric-mini-box { background: #f8f9fa; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; text-align: center; border: 1px solid #e9ecef; }
        .metric-mini-label { color: #6c757d; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;}
        .metric-mini-value { font-weight: 700; color: #212529; font-size: 0.85rem; }
        /* 🚀 Live Pulsing Dot */
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(25, 135, 84, 0); }
            100% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
        }
        .live-indicator {
            width: 10px; height: 10px; background-color: #198754; border-radius: 50%;
            display: inline-block; animation: pulse-green 2s infinite; margin-right: 8px;
        }
    </style>
</head>
<body class="layout-top-header">
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="page-container">
        <main id="main-content">
            <div class="content-wrapper p-3">
                
                <div class="d-flex flex-wrap justify-content-between align-items-center mb-1 gap-2">
                    <div class="d-flex align-items-center">
                        <div class="d-flex align-items-center bg-white px-3 py-1 rounded shadow-sm border dashboard-toolbar">
                            <span class="live-indicator"></span>
                            <span class="fw-bold text-success" style="font-size: 0.8rem; letter-spacing: 0.5px;">SYSTEM LIVE</span>
                            <div class="vr mx-3 text-muted" style="opacity: 0.2;"></div>
                            <i class="far fa-clock text-muted me-2" style="font-size: 0.85rem;"></i>
                            <span class="fw-bold text-dark" style="font-size: 0.95rem;" id="liveClock">--:--:--</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                        <div class="d-flex align-items-center px-2 border-end">
                            <select id="lineFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 120px;"><option value="">All Lines</option></select>
                        </div>
                        <div class="d-flex align-items-center px-2 border-end">
                            <select id="modelFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 120px;"><option value="">All Models</option></select>
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

                <?php if ($isLoggedIn): ?>
                <style>
                    .financial-col { padding: 1rem 0.5rem; text-align: center; height: 100%; }
                    @media (min-width: 1200px) { 
                        .financial-col:not(:last-child) { border-right: 1px solid #f1f5f9; } 
                    }
                    .fin-label { font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 0.5rem; }
                    .fin-value { font-size: 1.35rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem; line-height: 1; }
                    .fin-sub-row { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
                    .fin-sub-item { font-size: 0.7rem; color: #64748b; font-weight: 500; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #f1f5f9; }
                    .highlight-green { color: #16a34a !important; }
                    .highlight-red { color: #dc2626 !important; }
                    .text-main { color: #334155; }
                </style>

                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <div class="chart-card p-0 border-0 shadow-sm" style="background: #ffffff; border-radius: 12px; overflow: hidden;">
                            <div class="px-3 py-2 d-flex justify-content-between align-items-center border-bottom bg-light bg-opacity-50">
                                <span class="fw-bold text-dark" style="font-size: 0.85rem;">
                                    <i class="fas fa-file-invoice-dollar me-2 text-primary"></i>Executive Financial Summary
                                </span>
                                <small class="text-muted" style="font-size: 0.65rem;">Updated: <span id="lastUpdate">--:--</span></small>
                            </div>

                            <div class="row g-0">
                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Revenue</div>
                                    <div class="fin-value text-main" id="prodRevenueStd">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item">Total Value</span>
                                    </div>
                                </div>
                                
                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Total COGS</div>
                                    <div class="fin-value highlight-red" id="prodCostTotal">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item">CPU: <b id="valCPU">--</b></span>
                                    </div>
                                </div>

                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Material (RM)</div>
                                    <div class="fin-value text-main" id="prodCostMat">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item">RM: <b id="prodCostPercentRM">--%</b></span>
                                        <span class="fin-sub-item text-danger">Loss: <b id="valScrapCost">--</b></span>
                                    </div>
                                </div>

                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Labor (DL+OT)</div>
                                    <div class="fin-value text-main" id="prodCostDL">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item">DL: <b id="valDL">--</b> | OT: <b id="valOT">--</b></span>
                                        <span class="fin-sub-item text-primary">Eff: <b id="valLaborEff">--</b></span>
                                    </div>
                                </div>

                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Overhead</div>
                                    <div class="fin-value text-main" id="prodCostOH">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item">OH Ratio: <b id="prodCostPercentOH">--%</b></span>
                                    </div>
                                </div>

                                <div class="col-6 col-md-4 col-xl-2 financial-col">
                                    <div class="fin-label">Gross Profit</div>
                                    <div class="fin-value highlight-green" id="prodGPStd">--</div>
                                    <div class="fin-sub-row">
                                        <span class="fin-sub-item text-success" style="background: #f0fdf4;">Margin: <b id="prodPercentGPStd">--%</b></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <div class="row g-3 mb-3">
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-primary fw-bold mb-0 text-center"><i class="fas fa-tachometer-alt me-1"></i> OVERALL OEE</h6>
                            <div class="gauge-container mt-2"><canvas id="oeePieChart"></canvas></div>
                            <div id="oeeInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-success fw-bold mb-0 text-center"><i class="fas fa-check-circle me-1"></i> QUALITY</h6>
                            <div class="gauge-container mt-2"><canvas id="qualityPieChart"></canvas></div>
                            <div id="qualityInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-warning fw-bold mb-0 text-center"><i class="fas fa-bolt me-1"></i> PERFORMANCE</h6>
                            <div class="gauge-container mt-2"><canvas id="performancePieChart"></canvas></div>
                            <div id="performanceInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-info fw-bold mb-0 text-center"><i class="fas fa-clock me-1"></i> AVAILABILITY</h6>
                            <div class="gauge-container mt-2"><canvas id="availabilityPieChart"></canvas></div>
                            <div id="availabilityInfo" class="mt-2"></div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-xl-8">
                        <div class="chart-card p-3 h-100">
                            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 border-bottom pb-2 gap-2">
                                <h6 class="fw-bold mb-0"><i class="fas fa-chart-area me-2 text-primary"></i>OEE Trend</h6>
                                <div class="btn-group btn-group-sm shadow-sm" id="oeeTrendToggle">
                                    <button class="btn btn-outline-primary active" data-view="daily">Daily (30 Days)</button>
                                    <button class="btn btn-outline-primary" data-view="hourly">Hourly (Selected Date)</button>
                                </div>
                            </div>
                            <div style="height: 280px; position: relative;"><canvas id="oeeLineChart"></canvas></div>
                        </div>
                    </div>
                    <div class="col-xl-4">
                        <div class="chart-card p-3 h-100">
                            <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                                <h6 class="fw-bold mb-0"><i class="fas fa-tools me-2 text-danger"></i>Downtime Reasons</h6>
                                <div class="btn-group btn-group-sm" id="stopCauseToggle">
                                    <button class="btn btn-outline-secondary active" data-group="cause">Cause</button>
                                    <button class="btn btn-outline-secondary" data-group="line">Line</button>
                                </div>
                            </div>
                            <div id="downtimeEmptyState" class="text-center text-muted" style="display: none; padding-top: 80px;">
                                <i class="fas fa-check-circle fa-3x text-success opacity-25 mb-2"></i>
                                <h6>No Downtime Recorded</h6>
                                <small>All machines running smoothly</small>
                            </div>
                            <div id="downtimeChartWrapper" style="height: 280px; position: relative;"><canvas id="stopCauseBarChart"></canvas></div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <div class="chart-card p-3 h-100">
                            <h6 class="fw-bold mb-3 border-bottom pb-2"><i class="fas fa-boxes me-2 text-success"></i>Production Output by Part</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover align-middle mb-0" id="productionTable">
                                    <thead class="table-light sticky-top">
                                        <tr>
                                            <th>Part No.</th>
                                            <th>Line / Model</th>
                                            <th class="text-end" style="width: 16%;">FG (Good)</th>
                                            <th class="text-end" style="width: 16%;">Hold</th>
                                            <th class="text-end" style="width: 16%;">Scrap</th>
                                            <th class="text-end border-start pe-3" style="width: 22%;">Total Qty (Breakdown)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productionTableBody">
                                        <tr><td colspan="5" class="text-center text-muted py-4">Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <script>const isLoggedIn = <?php echo json_encode($isLoggedIn); ?>;</script>
    <script src="script/OEE_OEEchart.js?v=<?php echo filemtime('script/OEE_OEEchart.js'); ?>"></script>
    <script src="script/OEE_barchart.js?v=<?php echo filemtime('script/OEE_barchart.js'); ?>"></script>
    <script src="script/filterManager.js?v=<?php echo filemtime('script/filterManager.js'); ?>"></script>
</body>
</html>