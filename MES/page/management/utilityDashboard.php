<?php
// MES/page/management/utilityDashboard.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('view_executive')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$pageTitle = "Energy & Cost Dashboard";
$pageIcon = "fas fa-bolt"; 
$pageHeaderTitle = "Utility Monitoring & Cost"; 
$pageHeaderSubtitle = "Real-time Power, LPG Consumption & Cost Analysis"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    <link rel="stylesheet" href="css/executiveDashboard.css?v=<?php echo time(); ?>">
    <style>
        .icon-watermark {
            position: absolute;
            right: 15px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 3.5rem;
            opacity: 0.05;
            z-index: 0;
        }
    </style>
</head>
<body class="layout-top-header">
    <?php include('../components/php/top_header.php'); ?>

    <div class="page-container">
        <main id="main-content" class="content-wrapper">
            
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div class="d-flex align-items-center">
                    <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                        <span class="position-relative d-flex h-2 w-2">
                            <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping"></span>
                            <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                        </span>
                        <span class="fw-bold">Live Data</span>
                        <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--</span>
                    </div>
                </div>

                <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                    <div class="d-flex align-items-center px-2">
                        <input type="date" id="startDate" class="form-control form-control-sm border-0 bg-transparent text-dark fw-bold" style="width: 125px; cursor: pointer;">
                        <span class="mx-1 text-muted small"><i class="fas fa-arrow-right"></i></span>
                        <input type="date" id="endDate" class="form-control form-control-sm border-0 bg-transparent text-dark fw-bold" style="width: 125px; cursor: pointer;">
                    </div>
                    
                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>
                    
                    <button class="btn btn-outline-success btn-sm fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="exportToCSV()" title="Export CSV" style="height: 30px;">
                        <i class="fas fa-file-excel"></i>
                    </button>
                    
                    <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="openTOUSettings()" title="Settings (TOU)" style="height: 30px;">
                        <i class="fas fa-cog"></i>
                    </button>

                    <button class="btn btn-primary btn-sm fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="loadUtilityData()" style="height: 30px;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-success p-3 h-100">
                        <i class="fas fa-bolt text-success icon-watermark"></i>
                        <div class="kpi-card-content position-relative z-1">
                            <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Elec Cost Today</small>
                            <h3 class="fw-bold text-dark mb-0 mt-1">฿ <span id="kpi-cost">-</span></h3>
                            <small class="text-success fw-semibold mt-1" style="font-size: 0.75rem;">Usage: <span id="kpi-kwh">-</span> kWh</small>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-danger p-3 h-100">
                        <i class="fas fa-fire text-danger icon-watermark"></i>
                        <div class="kpi-card-content position-relative z-1">
                            <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">LPG Cost Today</small>
                            <h3 class="fw-bold text-danger mb-0 mt-1">฿ <span id="kpi-lpg-cost">-</span></h3>
                            <small class="text-danger fw-semibold mt-1" style="font-size: 0.75rem;">Usage: <span id="kpi-lpg-usage">-</span> m³</small>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-warning p-3 h-100">
                        <div class="kpi-card-content position-relative">
                            <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Real-time Power (kW)</small>
                            <h3 class="fw-bold text-dark mb-0 mt-1" id="kpi-kw">-</h3>
                        </div>
                    </div>
                </div>

                <div class="col-6 col-md-3">
                    <div class="exec-card border-start border-4 border-info p-3 h-100">
                        <div class="kpi-card-content position-relative">
                            <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Avg Power Factor</small>
                            <h3 class="fw-bold text-dark mb-0 mt-1" id="kpi-pf">-</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-12">
                    <div class="exec-card p-3">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-dark mb-0">
                                <i class="fas fa-chart-area me-2 text-primary"></i>Hourly Utility Cost Profile (฿)
                            </h6>
                            <span class="badge bg-light text-secondary border">Peak / Off-Peak Highlighted</span>
                        </div>
                        <div style="height: 300px;"><canvas id="energyTrendChart"></canvas></div>
                    </div>
                </div>
            </div>

            <div class="d-flex align-items-center mb-3 mt-4">
                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-sitemap me-2 text-secondary"></i>Sub-Meter Details</h6>
                <hr class="flex-grow-1 ms-3 my-0 border-secondary opacity-10">
            </div>
            
            <div class="row g-3 pb-5" id="meter-cards-container">
                </div>

        </main>
    </div>

    <div class="modal fade" id="touModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light border-bottom-0">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-sliders-h text-secondary me-2"></i>Utility Rates Configuration</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4 bg-light bg-opacity-50">
                    
                    <ul class="nav nav-pills mb-3" id="touTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold" id="tab-elec" data-bs-toggle="pill" data-bs-target="#content-elec" type="button"><i class="fas fa-bolt me-1"></i> Electricity</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold" id="tab-lpg" data-bs-toggle="pill" data-bs-target="#content-lpg" type="button"><i class="fas fa-fire me-1"></i> LPG Gas</button>
                        </li>
                    </ul>

                    <div class="tab-content" id="touTabContent">
                        <div class="tab-pane fade show active" id="content-elec" role="tabpanel">
                            <div id="elec-rates-container"></div>
                        </div>
                        <div class="tab-pane fade" id="content-lpg" role="tabpanel">
                            <div id="lpg-rates-container"></div>
                        </div>
                    </div>

                </div>
                <div class="modal-footer bg-white border-top py-2 d-flex justify-content-between">
                    <small class="text-danger fw-bold" id="tou-error-msg"></small>
                    <div>
                        <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-sm btn-primary fw-bold px-3" onclick="saveAllTOURates()"><i class="fas fa-save me-1"></i> Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="script/utilityDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>