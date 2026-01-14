<?php
// page/manpower/manpowerUI.php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์
if (!isset($_SESSION['user'])) {
    header("Location: ../../auth/login_form.php");
    exit;
}

// 1. ตั้งค่า Header Variable
$currentUser = $_SESSION['user'];
$pageTitle = "Manpower Management";
$pageHeaderTitle = "Manpower Dashboard"; // ค่านี้จะไปโชว์ที่ Top Header
$pageHeaderSubtitle = "ติดตามสถานะพนักงานและการเข้ากะ (Real-time)";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    
    <link href="css/manpowerUI.css?v=<?php echo time(); ?>" rel="stylesheet">

    <script src="../../utils/libs/xlsx.full.min.js"></script>
</head>

<body class="dashboard-page layout-top-header">

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid p-3"> <div class="d-flex justify-content-between align-items-center mb-3 bg-white p-2 rounded border shadow-sm">
                <div class="d-flex align-items-center gap-2">
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-white border-end-0 text-muted"><i class="far fa-calendar-alt"></i></span>
                        <input type="date" id="filterDate" class="form-control border-start-0 ps-0 fw-bold text-dark" 
                            value="<?php echo date('Y-m-d'); ?>" 
                            style="max-width: 120px; font-family: 'Prompt'; font-size: 0.9rem;">
                    </div>
                </div>

                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-light border text-secondary" onclick="App.loadData()"><i class="fas fa-sync-alt"></i></button>
                    <button class="btn btn-sm btn-primary px-3 fw-bold" onclick="App.syncNow()"><i class="fas fa-cloud-download-alt me-1"></i> Sync</button>
                    <div class="dropdown">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle px-2" type="button" data-bs-toggle="dropdown">Actions</button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem;">
                            <li><a class="dropdown-item" href="#" onclick="Actions.exportExcel()"><i class="fas fa-file-excel text-success me-2"></i>Export Excel</a></li>
                            <?php if (hasRole(['admin', 'creator'])): ?>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmployeeManager()">Staff Manager</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openShiftPlanner()">Shift Planner</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openMappingManager()">Maps Config</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="App.resetDailyData()">Reset Data</a></li>
                            <?php endif; ?>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-3"> <div class="col-xl-3 col-md-6">
                    <div class="card-kpi border-start-4 border-primary" id="card-plan">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="text-label">Total Plan</div>
                                <div class="display-value" id="kpi-plan">0</div>
                                <div class="unit-label"><i class="fas fa-user me-1"></i>Persons</div>
                            </div>
                            <div class="icon-shape bg-soft-primary text-primary">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6">
                    <div class="card-kpi border-start-4 border-success" id="card-actual">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="text-label">Present</div>
                                <div class="display-value text-success" id="kpi-actual">0</div>
                                <span class="badge badge-soft-success mt-1 fw-normal" id="kpi-rate" style="font-size: 0.75rem;">0%</span>
                            </div>
                            <div class="icon-shape bg-soft-success text-success">
                                <i class="fas fa-user-check"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card-kpi border-start-4 border-warning">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <div class="text-label">Est. Cost</div>
                                <div class="display-value text-warning" id="kpi-cost">0</div>
                                <div class="unit-label">THB (Approx.)</div>
                            </div>
                            <div class="icon-shape bg-soft-warning text-warning">
                                <i class="fas fa-coins"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card-kpi border-start-4 border-danger" id="card-absent">
                        <div class="d-flex justify-content-between">
                            <div>
                                <div class="text-label">Abnormalities</div>
                                <div class="display-value text-danger" id="kpi-absent">0</div>
                            </div>
                            <div class="icon-shape bg-soft-danger text-danger">
                                <i class="fas fa-user-clock"></i>
                            </div>
                        </div>
                        <div class="d-flex gap-2 mt-2 pt-2 border-top border-light">
                            <div id="card-late" class="kpi-action-badge badge-soft-warning w-100 cursor-pointer">
                                Late: <span id="kpi-late" class="fw-bold">0</span>
                            </div>
                            <div id="card-leave" class="kpi-action-badge badge-soft-info w-100 cursor-pointer">
                                Leave: <span id="kpi-leave" class="fw-bold">0</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-3">
                <div class="col-lg-8">
                    <div class="chart-card">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h4><i class="fas fa-chart-bar text-primary me-2"></i>Plan vs Actual</h4>
                            <small class="text-muted" style="font-size: 0.7rem;">Scroll to view more</small>
                        </div>
                        <div class="chart-scroll-container" style="height: 240px; overflow-x: auto; overflow-y: hidden;">
                            <div id="barChartInnerWrapper" style="height: 100%; position: relative; width: 100%;">
                                <canvas id="barChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="chart-card">
                        <div class="mb-2">
                            <h4><i class="fas fa-chart-pie text-primary me-2"></i>Distribution</h4>
                        </div>
                        <div class="chart-container-box d-flex justify-content-center">
                            <canvas id="pieChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white py-2 d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-dark small text-uppercase"><i class="fas fa-list-alt text-primary me-2"></i>Status Detail</h6>
                    
                    <div class="btn-group btn-group-sm">
                        <input type="radio" class="btn-check" name="viewMode" id="viewLine" checked onchange="App.setView('LINE')">
                        <label class="btn btn-outline-secondary" for="viewLine">Line</label>

                        <input type="radio" class="btn-check" name="viewMode" id="viewShift" onchange="App.setView('SHIFT')">
                        <label class="btn btn-outline-secondary" for="viewShift">Shift</label>

                        <input type="radio" class="btn-check" name="viewMode" id="viewType" onchange="App.setView('TYPE')">
                        <label class="btn btn-outline-secondary" for="viewType">Type</label>
                    </div>
                </div>
                
                <div class="card-body p-0">
                    <div class="table-responsive border-0" style="max-height: 500px;">
                        <table class="table table-hover mb-0 w-100" id="manpowerTable">
                            <thead class="sticky-top" style="z-index: 5;">
                                <tr>
                                    <th class="ps-3">Group / Line</th>
                                    <th class="text-center">HC</th>
                                    <th class="text-center">Plan</th>
                                    <th class="text-center text-success">Present</th>
                                    <th class="text-center text-warning">Late</th>
                                    <th class="text-center text-danger">Absent</th>
                                    <th class="text-center text-info">Leave</th>
                                    <th class="text-center border-start bg-light">Actual</th>
                                    <th class="text-center">Diff</th>
                                    <th class="text-end pe-3">Cost</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <?php include_once __DIR__ . '/../components/php/docking_sidebar.php'; ?>
    <?php include_once __DIR__ . '/../components/php/mobile_menu.php'; ?>
    
    <?php include_once 'components/manpower_modals_bundle.php'; ?>

    <div id="syncLoader" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:9999; backdrop-filter: blur(2px);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
            <div class="spinner-border text-white mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
            <h5 class="text-white">Processing...</h5>
            <p class="text-white-50 small">Syncing data with cloud server...</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="script/manpower_api.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_ui.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_main.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>