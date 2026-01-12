<?php
// page/manpower/manpowerUI2.php
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

    <style>
        /* Custom Styles */
        .card-kpi {
            border: none;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            transition: transform 0.2s;
        }
        .card-kpi:hover { transform: translateY(-3px); }

        .table-responsive {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 0 10px rgba(0,0,0,0.02);
        }
        
        .cursor-pointer { cursor: pointer; transition: background-color 0.15s; }
        .cursor-pointer:hover { background-color: rgba(0,0,0,0.05) !important; }

        .chart-container-box {
            position: relative;
            height: 300px;
            width: 100%;
        }
    </style>
</head>

<body class="dashboard-page layout-top-header">

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid py-4" style="max-width: 1600px;">
            
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h4 class="mb-1 fw-bold text-primary"><i class="fas fa-users-cog me-2"></i><?php echo $pageHeaderTitle; ?></h4>
                    <p class="text-muted mb-0 small"><?php echo $pageHeaderSubtitle; ?></p>
                </div>
                
                <div class="d-flex gap-2 flex-wrap">
                    <input type="date" id="filterDate" class="form-control shadow-sm" value="<?php echo date('Y-m-d'); ?>" style="width: auto;">
                    
                    <button class="btn btn-white border shadow-sm text-primary" onclick="App.loadData()" title="โหลดข้อมูลใหม่">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    
                    <button class="btn btn-primary shadow-sm" onclick="App.syncNow()" title="ดึงข้อมูลจาก Cloud">
                        <i class="fas fa-cloud-download-alt me-1"></i> Sync Data
                    </button>

                    <button class="btn btn-success shadow-sm" onclick="Actions.exportExcel()" title="ส่งออกเป็น Excel">
                        <i class="fas fa-file-excel me-1"></i> Export
                    </button>

                    <?php if (hasRole(['admin', 'creator'])): ?>
                    <div class="vr mx-1 d-none d-md-block"></div>
                    
                    <button class="btn btn-outline-dark shadow-sm" onclick="Actions.openEmployeeManager()" title="จัดการรายชื่อพนักงาน">
                        <i class="fas fa-user-friends me-1"></i> Staff
                    </button>

                    <button class="btn btn-warning shadow-sm fw-bold text-dark" onclick="Actions.openShiftPlanner()" title="จัดการกะการทำงาน (Shift Rotation)">
                        <i class="fas fa-people-arrows me-1"></i> Shift
                    </button>
                    
                    <button class="btn btn-outline-danger shadow-sm" onclick="App.resetDailyData()" title="[Admin] ล้างและดึงใหม่">
                        <i class="fas fa-trash-restore-alt"></i>
                    </button>
                    <?php endif; ?>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-xl-3 col-md-6">
                    <div class="card card-kpi bg-white p-3 h-100 border-start border-4 border-primary">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="text-muted small mb-1 text-uppercase fw-bold">Total Plan (แผนรวม)</p>
                                <h2 class="fw-bold text-dark mb-0" id="kpi-plan">0</h2>
                                <small class="text-muted">Persons</small>
                            </div>
                            <div class="bg-primary bg-opacity-10 p-3 rounded-circle text-primary" style="height: fit-content;">
                                <i class="fas fa-clipboard-list fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card card-kpi bg-white p-3 h-100 border-start border-4 border-success">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="text-muted small mb-1 text-uppercase fw-bold">Actual Present (มาจริง)</p>
                                <h2 class="fw-bold text-success mb-0" id="kpi-actual">0</h2>
                                <small class="text-success fw-bold" id="kpi-rate">0% Attendance</small>
                            </div>
                            <div class="bg-success bg-opacity-10 p-3 rounded-circle text-success" style="height: fit-content;">
                                <i class="fas fa-user-check fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card card-kpi bg-white p-3 h-100 border-start border-4 border-warning">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="text-muted small mb-1 text-uppercase fw-bold">Est. Cost (ค่าแรง)</p>
                                <h2 class="fw-bold text-warning mb-0" id="kpi-cost">0</h2>
                                <small class="text-muted">THB (Estimated)</small>
                            </div>
                            <div class="bg-warning bg-opacity-10 p-3 rounded-circle text-warning text-dark" style="height: fit-content;">
                                <i class="fas fa-coins fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6">
                    <div class="card card-kpi bg-white p-3 h-100 border-start border-4 border-danger">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="text-muted small mb-1 text-uppercase fw-bold">Absent / Late (ขาด/สาย)</p>
                                <div class="d-flex align-items-baseline gap-2">
                                    <h2 class="fw-bold text-danger mb-0" id="kpi-absent">0</h2>
                                    <small class="text-muted">Absent</small>
                                </div>
                                <small class="text-warning text-dark fw-bold"><span id="kpi-late">0</span> Late</small>
                            </div>
                            <div class="bg-danger bg-opacity-10 p-3 rounded-circle text-danger" style="height: fit-content;">
                                <i class="fas fa-user-times fa-lg"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3">
                            <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-chart-bar me-2 text-primary"></i>Plan vs Actual by Line</h6>
                        </div>
                        <div class="card-body">
                            <div class="chart-container-box">
                                <canvas id="barChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3">
                            <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-chart-pie me-2 text-primary"></i>Status Distribution</h6>
                        </div>
                        <div class="card-body d-flex align-items-center justify-content-center">
                            <div style="height: 250px; width: 100%;">
                                <canvas id="pieChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-5">
                <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-table me-2 text-primary"></i>Detailed Manpower Status</h6>
                    
                    <div class="btn-group btn-group-sm" role="group">
                        <input type="radio" class="btn-check" name="viewMode" id="viewLine" autocomplete="off" checked onchange="App.setView('LINE')">
                        <label class="btn btn-outline-secondary" for="viewLine"><i class="fas fa-list me-1"></i>By Line</label>

                        <input type="radio" class="btn-check" name="viewMode" id="viewShift" autocomplete="off" onchange="App.setView('SHIFT')">
                        <label class="btn btn-outline-secondary" for="viewShift"><i class="fas fa-clock me-1"></i>By Shift</label>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="manpowerTable">
                            <thead class="table-light">
                                <tr class="text-uppercase small text-muted">
                                    <th class="ps-4" style="min-width: 200px;">Group / Line</th>
                                    <th class="text-center text-primary border-end" style="width: 8%;">Reg. HC</th>
                                    <th class="text-center" style="width: 8%;">Plan</th>
                                    <th class="text-center text-success" style="width: 8%;">Present</th>
                                    <th class="text-center text-warning text-dark" style="width: 8%;">Late</th>
                                    <th class="text-center text-danger" style="width: 8%;">Absent</th>
                                    <th class="text-center text-info text-dark" style="width: 8%;">Leave</th>
                                    <th class="text-center border-start border-end table-active fw-bold" style="width: 9%;">Actual</th>
                                    <th class="text-center fw-bold" style="width: 8%;">Diff</th>
                                    <th class="text-end pe-4" style="width: 10%;">Cost (THB)</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody">
                                <tr><td colspan="10" class="text-center py-5 text-muted">Connecting to database...</td></tr>
                            </tbody>
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