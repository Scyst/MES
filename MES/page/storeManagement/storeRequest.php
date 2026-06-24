<?php
// MES/page/storeManagement/storeRequest.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_warehouse');

if (!isset($_SESSION['user'])) { header("Location: ../../auth/login_form.php"); exit; }

$userRole = $_SESSION['user']['role'];
$isStore = in_array($userRole, ['admin', 'creator']); 

$pageTitle = "Scrap & Replacement"; 
$pageIcon = "fas fa-sync-alt"; 
$pageHeaderTitle = "Scrap & Replacement"; 
$pageHeaderSubtitle = "ระบบเบิกทดแทนของเสีย (Scrap Claim)"; 

// Fetch Distinct Lines and Teams
require_once __DIR__ . '/../db.php';

$productionLines = [];
$teamGroups = [];
try {
    $stmt = $pdo->query("SELECT DISTINCT production_line FROM dbo.LOCATIONS WHERE production_line IS NOT NULL AND production_line != '' ORDER BY production_line");
    $productionLines = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->query("SELECT DISTINCT team_group FROM dbo.USERS WHERE team_group IS NOT NULL AND team_group != '' ORDER BY team_group");
    $teamGroups = $stmt->fetchAll(PDO::FETCH_COLUMN);
} catch (Exception $e) {}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    <link rel="stylesheet" href="css/storeRequest.css?v=<?php echo filemtime(__DIR__ . '/css/storeRequest.css'); ?>">
</head>

<body class="layout-top-header bg-body-tertiary">

    <?php include('../components/php/top_header.php'); ?>

    <div class="page-container">
        <div id="main-content">
            
            <div class="dashboard-header-sticky px-3 pt-3">
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1 flex-wrap">
                                <div class="input-group input-group-sm" style="max-width: 300px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="filterSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search SAP, Part, Req ID...">
                                </div>
                                
                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" 
                                        onclick="loadRequests()" title="Refresh Data" style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                                
                                <button class="btn btn-outline-primary btn-sm shadow-sm fw-bold px-2 d-flex align-items-center justify-content-center" data-bs-toggle="modal" data-bs-target="#filterModal" style="height: 32px;">
                                    <i class="fas fa-filter"></i> <small class="d-none d-sm-inline ms-1">Filters</small>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">

                                <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded px-3 py-0 bg-body shadow-sm h-100" style="min-height: 31px;">
                                    <span class="badge bg-dark me-2" id="sumCount">
                                        <div class="spinner-border spinner-border-sm text-light" style="width:10px; height:10px;"></div>
                                    </span> 
                                    <span class="small text-muted fw-bold me-3">Items</span>
                                    
                                    <span class="badge bg-danger text-white me-2" id="sumQty">
                                        <div class="spinner-border spinner-border-sm text-light" style="width:10px; height:10px;"></div>
                                    </span> 
                                    <span class="small text-muted fw-bold me-3">Pcs</span>
                                    
                                    <div class="vr me-3 opacity-25"></div>
                                    <span class="fw-bold text-success font-monospace" id="sumCost">0.00</span>
                                    <span class="small text-muted ms-1">฿</span>
                                </div>

                                <button id="btnExportExcel" class="btn btn-light btn-sm border-secondary-subtle shadow-sm fw-bold" onclick="exportData()" title="Export to Excel">
                                    <i class="fas fa-file-excel text-success me-1"></i> Export
                                </button>

                                <button class="btn btn-outline-primary btn-sm fw-bold px-3 shadow-sm bg-white" type="button" data-bs-toggle="modal" data-bs-target="#dashboardModal">
                                    <i class="fas fa-chart-pie me-1"></i> Dashboard
                                </button>

                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openRequestModal()">
                                    <i class="fas fa-plus me-1"></i> New Request
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper p-3 d-flex flex-column h-100" style="overflow: hidden;">
                <!-- Dashboard Modal has been moved below -->

                <div class="card shadow-sm border-0 d-none d-md-flex flex-column flex-grow-1" style="min-height: 0;">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-striped table-hover align-middle mb-0 text-nowrap">
                            <thead class="sticky-top bg-light shadow-sm">
                                <tr class="text-secondary small text-uppercase">
                                    <th style="width: 10%">Date</th>
                                    <th style="width: 10%">SAP No.</th>
                                    <th style="width: 12%">Part No.</th>
                                    <th style="width: 18%">Description</th>
                                    <th class="text-center" style="width: 8%">Qty</th>
                                    <th class="text-end" style="width: 10%">Est. Cost</th>
                                    <th style="width: 15%">Reason</th>
                                    <th class="text-center" style="width: 12%">Requester</th>
                                    <th class="text-center" style="width: 8%">Status</th>
                                    <th class="text-center" style="width: 5%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="reqTableBody">
                                </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center pt-2 pb-2 rounded-bottom">
                        <small class="text-muted fw-bold" id="paginationInfo">แสดง 0 ถึง 0 จาก 0 รายการ</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>

                <div class="d-md-none" id="reqCardContainer"></div>
            </div>
        </div>
    </div>

    <div class="fab-container d-md-none">
        <button class="fab-btn" onclick="openRequestModal()">
            <i class="fas fa-plus"></i>
        </button>
    </div>

    <?php include 'components/requestModal.php'; ?>
    
    <div id="toast" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
        <div id="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body fw-bold" id="toastMessage">Action successful</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    </div> <!-- END toast-container -->

    <!-- Filter Modal -->
    <div class="modal fade" id="filterModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-light border-bottom-0 py-2">
                        <h5 class="modal-title fs-6 fw-bold text-dark"><i class="fas fa-filter text-primary me-2"></i> Advanced Filters</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">Date Range</label>
                            <div class="input-group input-group-sm shadow-sm">
                                <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-01'); ?>">
                                <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-d'); ?>">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">Status</label>
                            <select class="form-select form-select-sm border-secondary-subtle" id="filterStatus">
                                <option value="ALL">All Status</option>
                                <option value="PENDING" <?php echo $isStore ? 'selected' : ''; ?>>Pending</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">Production Line</label>
                            <select class="form-select form-select-sm border-secondary-subtle" id="filterLine">
                                <option value="">All Lines</option>
                                <?php foreach ($productionLines as $line): ?>
                                    <option value="<?php echo htmlspecialchars($line); ?>"><?php echo htmlspecialchars($line); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-secondary">Team Group</label>
                            <select class="form-select form-select-sm border-secondary-subtle" id="filterTeam">
                                <option value="">All Teams</option>
                                <?php foreach ($teamGroups as $team): ?>
                                    <option value="<?php echo htmlspecialchars($team); ?>"><?php echo htmlspecialchars($team); ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0 pt-0">
                        <button type="button" class="btn btn-primary btn-sm px-4" data-bs-dismiss="modal" onclick="loadRequests()">Apply</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dashboard Modal -->
        <!-- Dashboard Modal -->
        <div class="modal fade" id="dashboardModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-fullscreen">
                <div class="modal-content border-0 bg-body-tertiary">
                                        <div class="modal-header bg-dark text-white py-2 border-bottom-0 d-flex justify-content-between align-items-center">
                        <h5 class="modal-title small text-uppercase fw-bold mb-0">
                            <i class="fas fa-chart-pie me-2 text-primary"></i>Scrap Dashboard
                        </h5>
                        <div>
                            <button type="button" class="btn btn-sm btn-outline-success me-2 fw-bold" onclick="exportDashboardToExcel()">
                                <i class="fas fa-file-excel me-1"></i> Export Data
                            </button>
                            <button type="button" class="btn btn-sm btn-outline-light me-2 fw-bold" onclick="exportDashboardToImage()">
                                <i class="fas fa-camera-retro me-1 text-warning"></i> Save Image
                            </button>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                    </div>
                    
                    <div class="bg-light border-bottom p-3 shadow-sm z-index-1 position-relative">
                        <div class="row g-2 align-items-end">
                            <div class="col-md-3">
                                <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range Start</label>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-alt text-primary"></i></span>
                                    <input type="date" id="dash_startDate" class="form-control border-start-0 ps-0" value="<?php echo date('Y-m-01'); ?>">
                                </div>
                            </div>
                            <div class="col-md-3">
                                <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Range End</label>
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text bg-white border-end-0"><i class="fas fa-calendar-check text-primary"></i></span>
                                    <input type="date" id="dash_endDate" class="form-control border-start-0 ps-0" value="<?php echo date('Y-m-d'); ?>">
                                </div>
                            </div>
                            <div class="col-md-2">
                                <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Team / Group</label>
                                <select id="dash_teamSelect" class="form-select form-select-sm">
                                    <option value="">All Teams</option>
                                    <?php foreach ($teamGroups as $team): ?>
                                        <option value="<?php echo htmlspecialchars($team); ?>"><?php echo htmlspecialchars($team); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-3">
                                <label class="small fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Focus Line</label>
                                <select id="dash_lineSelect" class="form-select form-select-sm">
                                    <option value="">All Lines (Overview)</option>
                                    <?php foreach ($productionLines as $line): ?>
                                        <option value="<?php echo htmlspecialchars($line); ?>"><?php echo htmlspecialchars($line); ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-1">
                                <button type="button" class="btn btn-sm btn-primary w-100 fw-bold" onclick="syncDashboardFilters()">Apply</button>
                            </div>
                        </div>
                    </div>

                    <div class="modal-body p-3 bg-body-tertiary">
                        <!-- KPI Row -->
                        <div class="row g-3 mb-3">
                            <div class="col-md-3">
                                <div class="dashboard-kpi-card p-3 h-100 position-relative overflow-hidden border-start border-4 border-primary">
                                    <div class="text-uppercase fw-bold small text-muted mb-1">Total Tickets</div>
                                    <h3 id="kpiTotalTickets" class="mb-0 fw-bold text-dark">0</h3>
                                    <div class="small text-secondary mt-1">All Time Requests</div>
                                    <i class="fas fa-file-invoice position-absolute text-primary opacity-10" style="font-size: 3.5rem; right: -5px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="dashboard-kpi-card p-3 h-100 position-relative overflow-hidden border-start border-4 border-warning">
                                    <div class="text-uppercase fw-bold small text-muted mb-1">Total Scrap (Pcs)</div>
                                    <h3 id="kpiTotalPcs" class="mb-0 fw-bold text-dark">0</h3>
                                    <div class="small text-secondary mt-1">Pieces Destroyed</div>
                                    <i class="fas fa-boxes position-absolute text-warning opacity-10" style="font-size: 3.5rem; right: -5px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="dashboard-kpi-card p-3 h-100 position-relative overflow-hidden border-start border-4 border-danger">
                                    <div class="text-uppercase fw-bold small text-muted mb-1">Total Cost (฿)</div>
                                    <h3 id="kpiTotalCost" class="mb-0 fw-bold text-danger">0.00</h3>
                                    <div class="small text-secondary mt-1">
                                        <span class="me-2" title="Average per Ticket"><i class="fas fa-ticket-alt"></i> <span id="kpiAvgTkt">0</span>/Tkt</span>
                                        <span title="Average per Piece"><i class="fas fa-cube"></i> <span id="kpiAvgPc">0</span>/Pc</span>
                                    </div>
                                    <i class="fas fa-money-bill-wave position-absolute text-danger opacity-10" style="font-size: 3.5rem; right: -5px; bottom: -10px;"></i>
                                </div>
                            </div>
                            <div class="col-md-3">
                                <div class="dashboard-kpi-card p-3 h-100 position-relative overflow-hidden border-start border-4 border-info">
                                    <div class="text-uppercase fw-bold small text-muted mb-1">Top Defect Line</div>
                                    <h3 id="kpiTopLine" class="mb-0 fw-bold text-dark">-</h3>
                                    <div class="small text-secondary mt-1">Highest Cost Generator</div>
                                    <i class="fas fa-industry position-absolute text-info opacity-10" style="font-size: 3.5rem; right: -5px; bottom: -10px;"></i>
                                </div>
                            </div>
                        </div>

                        <!-- Charts Row 1: Trend and Top Parts -->
                        <div class="row g-3 mb-3">
                            <div class="col-xl-8">
                                <div class="dashboard-chart-card bg-white h-100">
                                    <div class="card-header bg-white border-0 pt-3 pb-0 px-3">
                                        <h6 class="fw-bold text-dark mb-0 text-uppercase"><i class="fas fa-chart-line text-primary me-2"></i>Scrap Trend (Cost ฿)</h6>
                                    </div>
                                    <div class="card-body px-3 pb-3" style="min-height: 300px; position: relative;">
                                        <canvas id="scrapTrendChart"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-4">
                                <div class="dashboard-chart-card bg-white h-100">
                                    <div class="card-header bg-white border-0 pt-3 pb-0 px-3">
                                        <h6 class="fw-bold text-dark mb-0 text-uppercase"><i class="fas fa-chart-pie text-warning me-2"></i>Top Parts Analysis</h6>
                                    </div>
                                    <div class="card-body px-3 pb-3" style="min-height: 300px; position: relative;">
                                        <canvas id="scrapTopPartsChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Charts Row 2: Team, Line, Defect Reasons -->
                        <div class="row g-3">
                            <div class="col-xl-4">
                                <div class="dashboard-chart-card bg-white h-100">
                                    <div class="card-header bg-white border-0 pt-3 pb-0 px-3">
                                        <h6 class="fw-bold text-dark mb-0 text-uppercase"><i class="fas fa-users text-secondary me-2"></i>Cost by Team</h6>
                                    </div>
                                    <div class="card-body px-3 pb-3" style="min-height: 300px; position: relative;">
                                        <canvas id="scrapTeamChart"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-4">
                                <div class="dashboard-chart-card bg-white h-100">
                                    <div class="card-header bg-white border-0 pt-3 pb-0 px-3">
                                        <h6 class="fw-bold text-dark mb-0 text-uppercase"><i class="fas fa-chart-bar text-info me-2"></i>Cost by Line</h6>
                                    </div>
                                    <div class="card-body px-3 pb-3" style="min-height: 300px; position: relative;">
                                        <canvas id="scrapLineChart"></canvas>
                                    </div>
                                </div>
                            </div>
                            <div class="col-xl-4">
                                <div class="dashboard-chart-card bg-white h-100">
                                    <div class="card-header bg-white border-0 pt-3 pb-0 px-3">
                                        <h6 class="fw-bold text-dark mb-0 text-uppercase"><i class="fas fa-list-ol text-danger me-2"></i>Top Defect Reasons</h6>
                                    </div>
                                    <div class="card-body px-3 pb-3" style="min-height: 300px; position: relative;">
                                        <canvas id="scrapReasonChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    <script>
        const CURRENT_USER_ID = <?php echo json_encode($_SESSION['user']['id'] ?? null); ?>;
        const IS_STORE_ROLE = <?php echo json_encode($isStore); ?>;
        const currentUser = <?php echo json_encode($_SESSION['user'] ?? null); ?>;
        const CAN_MANAGE_WH = <?php echo json_encode(hasPermission('manage_warehouse')); ?>;
        const CAN_MANAGE_RM = <?php echo json_encode(hasPermission('manage_rm_receiving')); ?>;
    </script>
    
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/storeRequest.js?v=<?php echo filemtime(__DIR__ . '/script/storeRequest.js'); ?>" defer></script>
</body>
</html>

