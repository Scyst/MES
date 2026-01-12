<?php
// page/manpower/manpowerUI.php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์
if (!isset($_SESSION['user'])) {
    header("Location: ../../login.php");
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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>

    <style>
        body { font-family: 'Sarabun', sans-serif; background-color: var(--bs-body-bg); }
        
        /* KPI Cards Animation */
        .card { transition: transform 0.2s ease-in-out; }
        .card:hover { transform: translateY(-2px); }
        
        /* Chart Container */
        .chart-container { position: relative; height: 100%; width: 100%; }
        
        /* Loading Overlay */
        #syncLoader {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); z-index: 10000; color: white; backdrop-filter: blur(8px);
        }
    </style>
</head>

<body class="dashboard-page layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        <div class="container-fluid py-4" style="max-width: 1600px;">
            
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 class="mb-1 fw-bold text-primary"><i class="fas fa-chart-line me-2"></i>Executive Dashboard</h4>
                    <p class="text-muted mb-0 small">ข้อมูลสรุปประจำวัน (อัปเดตล่าสุด: <span id="lastUpdateLabel">-</span>)</p>
                </div>
                
                <div class="d-flex gap-2">
                    <input type="date" id="filterDate" class="form-control shadow-sm" value="<?php echo date('Y-m-d'); ?>">
                    <button class="btn btn-primary shadow-sm" onclick="App.loadData()">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    <button class="btn btn-success shadow-sm" onclick="App.syncNow()">
                        <i class="fas fa-cloud-download-alt me-1"></i> Sync Cloud
                    </button>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100 border-start border-4 border-primary">
                        <div class="card-body">
                            <h6 class="text-uppercase text-muted mb-2 small fw-bold">Total Plan (แผนรวม)</h6>
                            <h2 class="mb-0 fw-bold" id="kpi-plan">0</h2>
                            <small class="text-muted">People</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100 border-start border-4 border-success">
                        <div class="card-body">
                            <h6 class="text-uppercase text-muted mb-2 small fw-bold">Actual Present (มาจริง)</h6>
                            <h2 class="mb-0 fw-bold text-success" id="kpi-actual">0</h2>
                            <small class="text-muted fw-bold" id="kpi-rate">0% Attendance</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100 border-start border-4 border-warning">
                        <div class="card-body">
                            <h6 class="text-uppercase text-muted mb-2 small fw-bold">Est. Labor Cost (ค่าแรงโดยประมาณ)</h6>
                            <h2 class="mb-0 fw-bold text-warning" id="kpi-cost">0</h2>
                            <small class="text-muted">THB (Based on Std Rate)</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card border-0 shadow-sm h-100 border-start border-4 border-danger">
                        <div class="card-body">
                            <h6 class="text-uppercase text-muted mb-2 small fw-bold">Absent / Late (ขาด/สาย)</h6>
                            <div class="d-flex align-items-baseline gap-2">
                                <h2 class="mb-0 fw-bold text-danger" id="kpi-absent">0</h2>
                                <small class="text-muted">Absent</small>
                            </div>
                            <small class="text-warning fw-bold"><i class="fas fa-exclamation-circle me-1"></i><span id="kpi-late">0</span> Late</small>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3">
                            <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-chart-bar me-2"></i>Plan vs Actual by Line</h6>
                        </div>
                        <div class="card-body">
                            <div style="height: 300px;">
                                <canvas id="barChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3">
                            <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-chart-pie me-2"></i>Status Distribution</h6>
                        </div>
                        <div class="card-body d-flex align-items-center justify-content-center">
                            <div style="height: 250px; width: 100%;">
                                <canvas id="pieChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                    <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-table me-2"></i>Detailed Summary</h6>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-secondary active" onclick="App.setView('LINE')">By Line</button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="App.setView('SHIFT')">By Shift</button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="manpowerTable">
                            <thead class="table-light">
                                <tr class="text-uppercase small text-muted">
                                    <th class="ps-4" style="min-width: 200px;">Group / Line</th>
                                    <th class="text-center">Shift</th>
                                    <th class="text-center">Plan</th>
                                    <th class="text-center text-success">Present</th>
                                    <th class="text-center text-warning">Late</th>
                                    <th class="text-center text-danger">Absent</th>
                                    <th class="text-center text-info">Leave</th>
                                    <th class="text-center fw-bold">Diff</th>
                                    <th class="text-end pe-4">Est. Cost</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody">
                                <tr><td colspan="9" class="text-center py-5 text-muted">Loading data...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include_once('components/manpower_modals_bundle.php'); ?>

    <div id="syncLoader">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; max-width: 400px;">
            <div class="spinner-border text-success" role="status" style="width: 4rem; height: 4rem; border-width: 0.25em;"></div>
            <h3 class="mt-4 fw-bold" style="letter-spacing: 1px;">Processing...</h3>
            <p class="text-light opacity-75">Syncing data with cloud server & calculating costs.</p>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <script src="script/manpower_api.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_ui.js?v=<?php echo time(); ?>"></script>
    <script src="script/manpower_main.js?v=<?php echo time(); ?>"></script>

</body>
</html>