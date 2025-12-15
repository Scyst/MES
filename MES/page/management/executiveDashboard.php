<?php
// MES/page/management/executiveDashboard.php
include_once("../../auth/check_auth.php");

// Permission check
if (!hasRole(['admin', 'creator', 'planner', 'viewer'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

// =========================================================
// 1. CONFIG TOP HEADER (กำหนดค่าให้ top_header.php)
// =========================================================
$pageTitle = "Executive Dashboard";
$pageIcon = "fas fa-chart-pie"; 
$pageHeaderTitle = "Executive Overview"; // ชื่อที่จะไปโผล่บนแถบขาวด้านบน
$pageHeaderSubtitle = "Financial & Operational Performance"; // คำอธิบายตัวเล็กๆ
$pageHelpId = "execHelpModal"; // ID ของ Modal คู่มือที่จะเปิดเมื่อกดปุ่ม ?

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/executiveDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="content-wrapper">
                
                <div class="d-flex flex-wrap justify-content-between align-items-end mb-4 gap-3">
                    <div>
                        <h4 class="fw-bold text-dark mb-0">Executive Overview</h4>
                        <div class="d-flex align-items-center gap-2 text-muted small">
                            <span>Financial & Operational Performance</span>
                            <span class="text-secondary opacity-50">|</span>
                            <span id="last-update-time" class="badge bg-success bg-opacity-10 text-success fw-normal">
                                <i class="fas fa-circle me-1" style="font-size: 6px;"></i>Live
                            </span>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border" style="height: 42px;">
                        
                        <div class="input-group input-group-sm h-100" style="width: 130px;">
                            <span class="input-group-text bg-light border-0 fw-bold text-secondary">USD</span>
                            <input type="number" id="exchangeRate" class="form-control border-0 bg-light text-primary fw-bold text-end" value="34.0" step="0.1">
                        </div>
                        
                        <div class="vr mx-2 text-muted opacity-25"></div>
                        
                        <div class="input-group input-group-sm h-100" style="width: auto;">
                            <input type="date" id="startDate" class="form-control border-0">
                            <span class="input-group-text bg-white border-0 text-muted"><i class="fas fa-arrow-right small"></i></span>
                            <input type="date" id="endDate" class="form-control border-0">
                        </div>

                        <div class="vr mx-2 text-muted opacity-25"></div>

                        <button class="btn btn-primary btn-sm fw-bold px-3 h-100 rounded" onclick="loadDashboardData()" style="min-width: 90px;">
                            <i class="fas fa-sync-alt me-1"></i> Update
                        </button>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 border-start border-4 border-success position-relative cursor-pointer" onclick="openExplainerModal('sale')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">Sale</div>
                                <h4 class="fw-bolder text-dark mb-0" id="kpi-sale">-</h4>
                                <small class="text-success" id="kpi-sale-unit">THB</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 border-start border-4 border-danger position-relative cursor-pointer" onclick="openExplainerModal('cost')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">Cost</div>
                                <h4 class="fw-bolder text-dark mb-0" id="kpi-cost">-</h4>
                                <small class="text-danger">Total Cost</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 border-start border-4 border-primary position-relative cursor-pointer" onclick="openExplainerModal('gp')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">Gross Profit</div>
                                <h4 class="fw-bolder text-dark mb-0" id="kpi-gp">-</h4>
                                <small class="text-muted" id="kpi-gp-percent">0%</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 bg-white border position-relative cursor-pointer" onclick="openExplainerModal('rm')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">RM</div>
                                <h5 class="fw-bold text-secondary mb-0" id="kpi-rm">-</h5>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 bg-white border position-relative cursor-pointer" onclick="openExplainerModal('dlot')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">DLOT</div>
                                <h5 class="fw-bold text-secondary mb-0" id="kpi-dlot">-</h5>
                                <small class="text-muted" style="font-size: 0.7em;">Actual Labor</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-2">
                        <div class="exec-card h-100 bg-white border position-relative cursor-pointer" onclick="openExplainerModal('oh')">
                            <i class="fas fa-info-circle position-absolute top-0 end-0 m-2 text-muted opacity-25"></i>
                            <div class="card-body p-3 text-center">
                                <div class="text-uppercase text-muted small fw-bold mb-1">OH</div>
                                <h5 class="fw-bold text-secondary mb-0" id="kpi-oh">-</h5>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-lg-8">
                        <div class="exec-card h-100 p-3">
                            <div class="row h-100 align-items-center">
                                <div class="col-md-6 text-center border-end">
                                    <h6 class="fw-bold text-muted mb-3">Sale vs Cost</h6>
                                    <div style="height: 200px; position: relative;">
                                        <canvas id="saleCostPieChart"></canvas>
                                    </div>
                                    <div class="mt-2 small text-muted">
                                        Margin: <span id="chart-gp-percent" class="fw-bold text-success">0%</span>
                                    </div>
                                </div>
                                <div class="col-md-6 text-center">
                                    <h6 class="fw-bold text-muted mb-3">Cost Breakdown</h6>
                                    <div style="height: 200px; position: relative;">
                                        <canvas id="costBreakdownPieChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="exec-card h-100 p-0 overflow-hidden">
                            <div class="metric-grid">
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-primary" id="metric-units">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.7rem;">Total Units</small>
                                </div>
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-info" id="metric-headcount">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.7rem;">Employees</small>
                                </div>
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-warning" id="metric-lines">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.7rem;">Active Lines</small>
                                </div>
                                <div class="metric-box bg-light">
                                    <h5 class="mb-0 fw-bold" id="metric-sale-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">Sale / Unit</small>
                                </div>
                                <div class="metric-box bg-light">
                                    <h5 class="mb-0 fw-bold" id="metric-cost-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">Cost / Unit</small>
                                </div>
                                <div class="metric-box bg-light">
                                    <h5 class="mb-0 fw-bold text-success" id="metric-gp-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">GP / Unit</small>
                                </div>
                                <div class="metric-box">
                                    <h5 class="mb-0 fw-bold text-secondary" id="metric-rm-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">RM / Unit</small>
                                </div>
                                <div class="metric-box">
                                    <h5 class="mb-0 fw-bold text-secondary" id="metric-dlot-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">Labor / Unit</small>
                                </div>
                                <div class="metric-box">
                                    <h5 class="mb-0 fw-bold text-secondary" id="metric-oh-unit">-</h5>
                                    <small class="text-muted" style="font-size: 0.7rem;">OH / Unit</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center mb-3">
                    <h6 class="fw-bold text-dark mb-0"><i class="fas fa-layer-group me-2 text-primary"></i>Line Performance</h6>
                    <hr class="flex-grow-1 ms-3 my-0 border-secondary opacity-25">
                </div>
                <div class="row g-3" id="line-cards-container"></div>

            </div> <div class="modal fade" id="explainerModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-light py-2">
                            <h6 class="modal-title fw-bold text-dark" id="explainerTitle">Metric Detail</h6>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="small text-muted fw-bold text-uppercase">Formula</label>
                                <div class="alert alert-light border d-flex align-items-center p-2 mb-0">
                                    <i class="fas fa-calculator me-3 text-secondary"></i>
                                    <span id="explainerFormula" class="font-monospace fw-bold text-primary"></span>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="small text-muted fw-bold text-uppercase">Data Sources</label>
                                <ul class="list-group list-group-flush small" id="explainerSources"></ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <div class="modal fade" id="lineDetailModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white">
                    <div>
                        <h5 class="modal-title fw-bold" id="lineDetailTitle">Line Detail</h5>
                        <small class="opacity-75" id="lineDetailSubtitle">Production Analysis</small>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <ul class="nav nav-tabs nav-fill bg-light" id="lineTabs" role="tablist">
                        <li class="nav-item">
                            <button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#tabTrend">
                                <i class="fas fa-chart-bar me-2 text-primary"></i>Output
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabDowntime">
                                <i class="fas fa-exclamation-triangle me-2 text-warning"></i>Downtime
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabScrap">
                                <i class="fas fa-trash-alt me-2 text-danger"></i>Waste
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabManpower">
                                <i class="fas fa-users me-2 text-info"></i>People
                            </button>
                        </li>
                    </ul>

                    <div class="tab-content p-3" id="lineTabContent">
                        
                        <div class="tab-pane fade show active" id="tabTrend">
                            <div style="height: 300px; position: relative;">
                                <canvas id="lineHourlyChart"></canvas>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="tabDowntime">
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead class="table-light"><tr><th>Time</th><th>Machine</th><th>Issue</th><th class="text-end">Mins</th></tr></thead>
                                    <tbody id="tblDowntimeBody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="tabScrap">
                            <div class="table-responsive">
                                <table class="table table-sm table-hover mb-0">
                                    <thead class="table-light"><tr><th>Part No</th><th>Desc</th><th class="text-end">Qty</th><th class="text-end">Lost (฿)</th></tr></thead>
                                    <tbody id="tblScrapBody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="tabManpower">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-info text-dark">Staff List</span>
                                <small class="text-muted">Source: Scan In Log</small>
                            </div>
                            <div class="table-responsive" style="max-height: 300px;">
                                <table class="table table-sm table-striped mb-0">
                                    <thead class="table-light sticky-top"><tr><th>ID</th><th>Name</th><th>Position</th><th class="text-end">Time</th></tr></thead>
                                    <tbody id="tblManpowerBody"></tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="execHelpModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold"><i class="fas fa-info-circle me-2 text-primary"></i>Executive Dashboard Help</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-secondary">
                    <p class="mb-2"><strong>หน้าจอสรุปผลการดำเนินงาน (Actual Performance)</strong></p>
                    <ul class="small mb-0">
                        <li><strong>Sale:</strong> ยอดขายคำนวณจาก (ยอดผลิตจริง FG x ราคา USD x Rate)</li>
                        <li><strong>Cost:</strong> ต้นทุนรวม (RM + Labor + OH + Scrap)</li>
                        <li><strong>Gross Profit:</strong> กำไรขั้นต้น (Sale - Cost)</li>
                        <li><strong>DLOT:</strong> ค่าแรงและโอทีที่จ่ายจริง (Actual) จากระบบ Manpower</li>
                    </ul>
                    <div class="alert alert-info small mt-3 mb-0">
                        <i class="fas fa-lightbulb me-1"></i>
                        ข้อมูลหน้านี้เป็น <strong>Actual Data</strong> อาจไม่เท่ากับหน้า Planning ที่เป็นยอด Target
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/executiveDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>