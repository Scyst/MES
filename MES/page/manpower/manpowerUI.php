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
$pageHeaderTitle = "Manpower Dashboard"; 
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
    
    <style>
        /* เพิ่ม Style สำหรับปุ่ม Toggle กราฟให้ดู Modern ขึ้น */
        .chart-toggle-btn {
            font-size: 0.8rem;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
        }
    </style>
</head>

<body class="dashboard-page layout-top-header">

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid p-3">
            
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div class="d-flex align-items-center">
                    <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                        <span class="position-relative d-flex h-2 w-2">
                            <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping"></span>
                            <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                        </span>
                        <span class="fw-bold text-dark">Manpower Live</span>
                        <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--:--</span>
                    </div>
                </div>

                <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="far fa-calendar-alt"></i> Date:</span>
                        <input type="date" id="filterDate" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                               value="<?php echo date('Y-m-d'); ?>" 
                               style="width: 125px; cursor: pointer;">
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <button class="btn btn-light btn-sm text-secondary fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="App.loadData()" title="Reload Data">
                        <i class="fas fa-sync-alt"></i>
                    </button>

                    <button class="btn btn-primary btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm" onclick="App.syncNow()" title="Sync from Cloud">
                        <i class="fas fa-cloud-download-alt me-1"></i> Sync
                    </button>

                    <button class="btn btn-outline-primary btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm" onclick="Actions.openEmployeeManager()" title="จัดการพนักงาน">
                        <i class="fas fa-users-cog me-1"></i> Staff
                    </button>

                    <div class="dropdown ms-1">
                        <button class="btn btn-outline-secondary btn-sm fw-bold px-2 py-1 rounded shadow-sm" type="button" data-bs-toggle="dropdown" title="More Actions">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 mt-1" style="font-size: 0.85rem;">
                            <li><h6 class="dropdown-header">Export</h6></li>
                            
                            <li><a class="dropdown-item" href="#" onclick="Actions.exportDailyRaw()"><i class="fas fa-file-excel text-success me-2"></i>Export to Excel</a></li>
                            
                            <?php if (hasRole(['admin', 'creator'])): ?>
                                <li><hr class="dropdown-divider"></li>
                                <li><h6 class="dropdown-header">Management</h6></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openEmployeeManager()">Staff Manager</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openShiftPlanner()">Shift Planner</a></li>
                                <li><a class="dropdown-item" href="#" onclick="Actions.openMappingManager()">Maps Config</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="App.resetDailyData()">Reset Daily Data</a></li>
                            <?php endif; ?>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="row g-2 mb-3"> 
                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-primary h-100" id="card-plan" style="cursor: pointer;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-primary small fw-bold mb-1">Total Plan</div>
                                    <h2 class="text-dark" id="kpi-plan">0</h2>
                                    <div class="small text-muted mt-1 pt-1">Persons Target</div>
                                </div>
                                <div class="icon-circle bg-primary-soft">
                                    <i class="fas fa-clipboard-list"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-success h-100" id="card-actual" style="cursor: pointer;">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-success small fw-bold mb-1">Present</div>
                                    <h2 class="text-success" id="kpi-actual">0</h2>
                                    <div class="mt-1 pt-1">
                                        <span class="badge bg-success-soft border border-success border-opacity-25 text-success" id="kpi-rate" style="font-size: 0.80rem;">0% Rate</span>
                                    </div>
                                </div>
                                <div class="icon-circle bg-success-soft">
                                    <i class="fas fa-user-check"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-warning h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-warning small fw-bold mb-1" style="color: #d39e00 !important;">Est. Cost</div>
                                    <h2 class="text-warning" style="color: #d39e00 !important;" id="kpi-cost">0</h2>
                                    <div class="small text-muted mt-1 pt-1">THB (Estimated)</div>
                                </div>
                                <div class="icon-circle bg-warning-soft">
                                    <i class="fas fa-coins"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-danger h-100" id="card-absent">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <div class="text-uppercase text-danger small fw-bold mb-1">Abnormalities</div>
                                    <h2 class="text-danger" id="kpi-absent">0</h2>
                                </div>
                                <div class="icon-circle bg-danger-soft">
                                    <i class="fas fa-user-clock"></i>
                                </div>
                            </div>
                            
                            <div class="d-flex gap-2 mt-1 pt-1 border-top border-light">
                                <div id="card-late" class="btn-kpi-action bg-warning-soft w-50 text-center text-truncate text-dark" title="Click to view Late">
                                    <i class="fas fa-clock me-1"></i> Late: <span id="kpi-late" class="fw-bold">0</span>
                                </div>
                                <div id="card-leave" class="btn-kpi-action bg-info-soft w-50 text-center text-truncate text-dark" title="Click to view Leave">
                                    <i class="fas fa-bed me-1"></i> Leave: <span id="kpi-leave" class="fw-bold">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-3">
    
                <div class="col-lg-8">
                    <div class="chart-card h-100 d-flex flex-column"> 
                        
                        <div class="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
                            <h4 id="chart-title"><i class="fas fa-chart-line text-primary me-2"></i>Manpower Analytics</h4>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-outline-primary chart-toggle-btn active" id="btn-chart-daily" onclick="UI.switchChartView('daily')">Daily</button>
                                <button type="button" class="btn btn-outline-primary chart-toggle-btn" id="btn-chart-trend" onclick="UI.switchChartView('trend')">Trend</button>
                            </div>
                        </div>
                        
                        <div style="height: 250px; position: relative; width: 100%;" class="flex-shrink-0">
                            
                            <div id="view-chart-daily" style="height: 100%; width: 100%;">
                                <div class="chart-scroll-container" style="height: 100%; overflow-x: auto; overflow-y: hidden;">
                                    <div id="barChartInnerWrapper" style="height: 100%; position: relative; width: 100%;">
                                        <canvas id="barChart"></canvas>
                                    </div>
                                </div>
                            </div>

                            <div id="view-chart-trend" style="height: 100%; width: 100%; display: none;">
                                <canvas id="trendChart"></canvas>
                            </div>
                        </div>

                        <div class="mt-2 w-100 d-flex align-items-center" style="height: 40px;">
                            
                            <div id="footer-daily" class="w-100 text-end">
                                <small class="text-muted" style="font-size: 0.7rem;">* Scroll horizontal to view all lines</small>
                            </div>

                            <div id="footer-trend" class="w-100 d-flex justify-content-between align-items-center" style="display: none !important;">
                                <div>
                                     <button class="btn btn-xs btn-success text-white shadow-sm" style="font-size: 0.65rem;" onclick="exportCurrentTrend()">
                                        <i class="fas fa-file-excel me-1"></i> Export Data
                                    </button>
                                </div>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-xs btn-outline-secondary" style="font-size: 0.65rem;" onclick="App.loadTrend(7)">7 Days</button>
                                    <button class="btn btn-xs btn-outline-secondary" style="font-size: 0.65rem;" onclick="App.loadTrend(14)">14 Days</button>
                                    <button class="btn btn-xs btn-outline-secondary" style="font-size: 0.65rem;" onclick="App.loadTrend(30)">30 Days</button>
                                </div>
                            </div>

                        </div>
                    </div>
                    <script>
                        function exportCurrentTrend() {
                            const activeBtn = document.querySelector('#footer-trend .btn-group button.active') || document.querySelector('#view-chart-trend .btn-group button.active'); // เผื่อหาไม่เจอ
                            let days = 7;
                            if (activeBtn) days = parseInt(activeBtn.innerText) || 7;
                            Actions.exportTrendExcel(days);
                        }
                    </script>
                </div>

                <div class="col-lg-4">
                    <div class="chart-card h-100 d-flex flex-column">
                        <div class="mb-2">
                            <h4><i class="fas fa-chart-pie text-primary me-2"></i>Distribution</h4>
                        </div>
                        <div class="chart-container-box d-flex justify-content-center align-items-center flex-grow-1">
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

                        <input type="radio" class="btn-check" name="viewMode" id="viewPayment" onchange="App.setView('PAYMENT')">
                        <label class="btn btn-outline-secondary" for="viewPayment">Payment</label>
                    </div>
                </div>
                
                <div class="card-body p-0">
                    <div class="table-responsive border-0" style="max-height: 500px;">
                        <table class="table table-hover mb-0 w-100" id="manpowerTable">
                            <thead class="sticky-top" style="z-index: 5;">
                                <tr>
                                    <th class="ps-3">Group / Line</th>
                                    <th class="text-center">HC</th>
                                    <th class="text-center" style="display: none;">Plan</th>
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

    <script src="script/manpower_api.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_ui.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_main.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>