<?php
// MES/page/dailyLog/moodReport.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../auth/check_auth.php';

if (!in_array($_SESSION['user']['role'], ['admin', 'creator', 'supervisor'])) {
    header("Location: dailyLogUI.php");
    exit;
}

$pageTitle = "Mood Insight Report";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <title><?php echo $pageTitle; ?></title>
    <link rel="stylesheet" href="css/portal.css?v=<?php echo time(); ?>">
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <style>
        body.dashboard-page { 
            overflow-y: auto !important; 
            font-family: 'Sarabun', sans-serif; /* เปลี่ยนฟอนต์ให้ดูทันสมัย */
        }
        
        .report-header {
            background-color: var(--bs-secondary-bg);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--bs-border-color);
            position: sticky; top: 0; z-index: 1020;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        /* KPI Cards Style */
        .kpi-card {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 16px; /* โค้งมนขึ้น */
            padding: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .kpi-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px rgba(0,0,0,0.05); }
        
        /* ตกแต่งแถบสีข้างซ้าย KPI */
        .kpi-card::before {
            content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
        }
        .kpi-primary::before { background-color: #0d6efd; }
        .kpi-success::before { background-color: #198754; }
        .kpi-danger::before { background-color: #dc3545; }

        /* Chart Box Style */
        .chart-box {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }

        /* Loading Overlay */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9999;
            display: none; /* ซ่อนไว้ก่อน */
            flex-direction: column;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.7); }

        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 5px solid #e5e7eb;
            border-top-color: #0d6efd;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
    </style>
</head>
<body class="dashboard-page">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังประมวลผลข้อมูล...</h5>
    </div>

    <div class="report-header d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-3">
            <a href="dailyLogUI.php" class="btn btn-outline-secondary border-0 rounded-circle p-2" title="กลับหน้าหลัก">
                <i class="fas fa-arrow-left fa-lg"></i>
            </a>
            <div class="d-flex flex-column">
                <span class="fw-bold fs-5 text-body">
                    <span class="badge bg-primary bg-opacity-10 text-primary me-2"><i class="fas fa-heartbeat"></i></span>
                    Mood Insight Report
                </span>
                <span class="text-muted small ms-1">วิเคราะห์สุขภาพใจพนักงาน</span>
            </div>
        </div>

        <div class="d-flex align-items-center gap-2">
            <span class="d-none d-md-inline text-muted small me-3">
                <i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?>
            </span>
            
            <button class="btn btn-link text-secondary p-0 me-3" id="report-theme-btn" title="Switch Theme">
                <i class="fas fa-adjust fa-lg"></i>
            </button>

            <a href="../../auth/logout.php" class="btn btn-light text-danger fw-bold px-3 border btn-sm">
                <i class="fas fa-sign-out-alt"></i> <span class="d-none d-md-inline ms-2">Logout</span>
            </a>
        </div>
    </div>

    <div class="container-fluid p-4" style="max-width: 1400px;">
        
        <div class="card border-0 shadow-sm mb-4 bg-body" style="border-radius: 12px;">
            <div class="card-body py-3">
                <div class="row align-items-center g-3">
                    <div class="col-12 col-md-4">
                        <div class="input-group">
                            <span class="input-group-text bg-light border-0"><i class="far fa-calendar-alt text-muted"></i></span>
                            <div class="form-floating">
                                <input type="date" id="filterStartDate" class="form-control border-0 bg-light fw-bold">
                                <label for="filterStartDate">Start Date</label>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="input-group">
                            <span class="input-group-text bg-light border-0"><i class="far fa-calendar-check text-muted"></i></span>
                            <div class="form-floating">
                                <input type="date" id="filterEndDate" class="form-control border-0 bg-light fw-bold">
                                <label for="filterEndDate">End Date</label>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4">
                        <div class="input-group">
                            <span class="input-group-text bg-light border-0"><i class="fas fa-filter text-muted"></i></span>
                            <div class="form-floating">
                                <select id="filterLine" class="form-select border-0 bg-light fw-bold">
                                    <option value="All">All Lines</option>
                                    </select>
                                <label for="filterLine">Select Line</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4 g-4">
            <div class="col-md-4">
                <div class="kpi-card kpi-primary">
                    <div>
                        <h6 class="text-muted mb-1 text-uppercase small fw-bold">Average Mood</h6>
                        <h1 class="mb-0 fw-bold text-primary display-5" id="kpiAvgMood">-</h1>
                        <small class="text-muted"><i class="fas fa-star text-warning me-1"></i>คะแนนเฉลี่ย (เต็ม 5.0)</small>
                    </div>
                    <div class="p-3 bg-primary bg-opacity-10 rounded-circle text-primary">
                        <i class="far fa-smile fa-2x"></i>
                    </div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="kpi-card kpi-success" style="cursor: pointer;" onclick="openMissingModal()" title="คลิกเพื่อดูรายชื่อคนยังไม่ส่ง">
                    <div>
                        <h6 class="text-muted mb-1 text-uppercase small fw-bold">Missing / Total</h6>
                        <h1 class="mb-0 fw-bold text-success display-5" id="kpiResponseText">-</h1>
                        <small class="text-muted" id="kpiResponsePercent">Wait...</small>
                    </div>
                    <div class="p-3 bg-success bg-opacity-10 rounded-circle text-success position-relative">
                        <i class="fas fa-users fa-2x"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" id="kpiMissingCountBadge" style="display:none;">0</span>
                    </div>
                </div>
            </div>

            <div class="col-md-4">
                <div class="kpi-card kpi-danger" style="cursor: pointer;" onclick="openNegativeModal()" title="คลิกเพื่อดูรายชื่อคนอารมณ์เชิงลบ">
                    <div>
                        <h6 class="text-muted mb-1 text-uppercase small fw-bold">Negative Alert</h6>
                        <h1 class="mb-0 fw-bold text-danger display-5" id="kpiNegative">-</h1>
                        <small class="text-muted"><i class="fas fa-exclamation-circle me-1"></i>อารมณ์เชิงลบ (Score 1-2)</small>
                    </div>
                    <div class="p-3 bg-danger bg-opacity-10 rounded-circle text-danger position-relative">
                        <i class="fas fa-bell fa-2x"></i>
                        <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark border border-light" id="kpiNegativeBadge" style="display:none;">0</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="chart-box">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5 class="mb-0 fw-bold text-body"><i class="fas fa-chart-area me-2 text-primary"></i> Mood Trend Analysis</h5>
                        <span class="badge bg-light text-secondary border">Daily Average</span>
                    </div>
                    <div style="height: 320px;">
                        <canvas id="trendChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-md-8">
                <div class="chart-box h-100">
                    <h5 class="mb-4 fw-bold text-body"><i class="fas fa-industry me-2 text-info"></i> Average Mood by Line</h5>
                    <div style="height: 280px;">
                        <canvas id="lineBarChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="chart-box h-100">
                    <h5 class="mb-4 fw-bold text-body"><i class="fas fa-chart-pie me-2 text-warning"></i> Mood Distribution</h5>
                    <div style="height: 280px; position: relative;">
                        <canvas id="distPieChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="chart-box p-0 overflow-hidden">
            <div class="d-flex justify-content-between align-items-center bg-light px-3 pt-3 border-bottom">
                <ul class="nav nav-tabs card-header-tabs border-0" id="reportTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active fw-bold text-danger" id="tab-issues" data-bs-toggle="tab" data-bs-target="#content-issues" type="button">
                            <i class="fas fa-exclamation-circle me-2"></i>Issues & Low Scores
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link fw-bold text-secondary" id="tab-missing" data-bs-toggle="tab" data-bs-target="#content-missing" type="button">
                            <i class="fas fa-user-clock me-2"></i>Missing Submission <span class="badge bg-secondary ms-1" id="tabMissingCount">0</span>
                        </button>
                    </li>
                </ul>
                <button class="btn btn-outline-success btn-sm mb-2" onclick="exportTableToExcel()">
                    <i class="fas fa-file-excel me-2"></i>Export
                </button>
            </div>

            <div class="tab-content p-3">
                <div class="tab-pane fade show active" id="content-issues" role="tabpanel">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="issueTable">
                            <thead class="bg-white text-secondary border-bottom">
                                <tr class="text-uppercase small">
                                    <th class="py-2 ps-3">Date</th>
                                    <th>Line</th>
                                    <th>Employee</th>
                                    <th class="text-center">Period</th>
                                    <th class="text-center">Score</th>
                                    <th>Note / Issue</th>
                                </tr>
                            </thead>
                            <tbody id="issueTableBody" class="border-top-0"></tbody>
                        </table>
                    </div>
                </div>

                <div class="tab-pane fade" id="content-missing" role="tabpanel">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="missingTable">
                            <thead class="bg-white text-secondary border-bottom">
                                <tr class="text-uppercase small">
                                    <th class="py-2 ps-3">Line</th>
                                    <th>Employee ID</th>
                                    <th>Full Name</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="missingTableBody" class="border-top-0"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <div class="modal fade" id="missingModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold text-secondary"><i class="fas fa-user-clock me-2"></i>ยังไม่ส่งข้อมูล (Missing)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="list-group list-group-flush" id="missingModalList"></div>
                </div>
                <div class="modal-footer bg-light py-2">
                    <small class="text-muted me-auto">Showing missing staff for selected period</small>
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="negativeModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-fire-alt me-2"></i>Negative Alerts (Score 1-2)</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="list-group list-group-flush" id="negativeModalList"></div>
                </div>
                <div class="modal-footer bg-light py-2">
                    <small class="text-muted me-auto">คลิกที่ชื่อเพื่อดูประวัติย้อนหลัง</small>
                    <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="historyModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header border-0 pb-0">
                    <div>
                        <h5 class="modal-title fw-bold" id="historyModalTitle">User History</h5>
                        <small class="text-muted" id="historyModalSubtitle">Emp ID: -</small>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div style="height: 200px;">
                        <canvas id="historyChart"></canvas>
                    </div>
                    <div id="historyList" class="mt-3 small text-muted"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="script/moodReport.js?v=<?php echo time(); ?>"></script>
    
    <script>
        document.getElementById('report-theme-btn').addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-bs-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', next);
            localStorage.setItem('theme', next);
        });
    </script>
</body>
</html>