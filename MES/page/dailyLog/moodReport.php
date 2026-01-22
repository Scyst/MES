<?php
// MES/page/dailyLog/moodReport.php
require_once __DIR__ . '/../components/init.php';

// --- Access Control ---
if (!in_array($_SESSION['user']['role'], ['admin', 'creator'])) {
    header("Location: dailyLogUI.php");
    exit;
}

// --- Page Configuration for Top Header ---
$pageTitle = "Mood Insight Report";
$pageIcon = "fas fa-heartbeat"; 
$pageHeaderTitle = "Mood Insight Report"; 
$pageHeaderSubtitle = "วิเคราะห์สุขภาพใจพนักงาน (Mental Health Analytics)";

?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">
    
    <style>
        body { 
            font-family: 'Sarabun', sans-serif;
        }

        /* KPI Cards Style */
        .kpi-card {
            background: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px rgba(0,0,0,0.02);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            height: 100%;
        }
        .kpi-card:hover { transform: translateY(-5px); box-shadow: 0 10px 15px rgba(0,0,0,0.05); }
        
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
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
            /*height: 100%;
            margin-bottom: 1.5rem;*/
        }

        /* Loading Overlay */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8);
            z-index: 10000;
            display: none;
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

        /* ปรับแต่ง Table Header ให้ดูดีขึ้น */
        .table thead th {
            font-weight: 600;
            color: var(--bs-secondary);
            background-color: var(--bs-body-bg); /* ให้หัวตารางกลืนไปกับพื้นหลัง */
            border-bottom: 2px solid var(--bs-border-color);
            vertical-align: middle;
        }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังประมวลผลข้อมูล...</h5>
    </div>
    
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <div class="container-fluid p-4">
                
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
                    <div class="col-lg-8 mb-4 mb-lg-0">
                        <div class="chart-box h-100">
                            <h5 class="mb-4 fw-bold text-body"><i class="fas fa-industry me-2 text-info"></i> Average Mood by Line</h5>
                            <div style="height: 280px;">
                                <canvas id="lineBarChart"></canvas>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="chart-box h-100">
                            <h5 class="mb-4 fw-bold text-body"><i class="fas fa-chart-pie me-2 text-warning"></i> Mood Distribution</h5>
                            <div style="height: 280px; position: relative;">
                                <canvas id="distPieChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="chart-box p-0 overflow-hidden">
                    <div class="d-flex justify-content-between align-items-center bg-light px-3 pt-3 border-bottom flex-wrap gap-2">
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
                        
                        <div class="d-flex gap-2 mb-2 mb-md-0">
                            <button class="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2" 
                                    id="privacyToggleBtn" onclick="togglePrivacyMode()">
                                <i class="fas fa-eye-slash"></i> <span id="privacyBtnText">Show Names</span>
                            </button>
                            
                            <button class="btn btn-outline-success btn-sm" onclick="exportTableToExcel()">
                                <i class="fas fa-file-excel me-2"></i>Export
                            </button>
                        </div>
                    </div>

                    <div class="tab-content p-3">
                        <div class="tab-pane fade show active" id="content-issues" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0" id="issueTable">
                                    <thead class="bg-white border-bottom">
                                        <tr class="text-uppercase small">
                                            <th style="width: 10%;" class="py-3 ps-3">Date</th>
                                            <th style="width: 10%;" class="text-center">Line</th>
                                            <th style="width: 25%;">Employee</th>
                                            <th style="width: 10%;" class="text-center">Period</th>
                                            <th style="width: 10%;" class="text-center">Score</th>
                                            <th style="width: 35%;">Note / Issue</th>
                                        </tr>
                                    </thead>
                                    <tbody id="issueTableBody" class="border-top-0"></tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                                <small class="text-muted" id="issuePaginationInfo">Showing 0-0 of 0</small>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="issuePagination"></ul>
                                </nav>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="content-missing" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0" id="missingTable">
                                    <thead class="bg-white border-bottom">
                                        <tr class="text-uppercase small">
                                            <th style="width: 15%;" class="py-3 ps-3">Line</th>
                                            <th style="width: 15%;">Employee ID</th>
                                            <th style="width: 40%;">Full Name</th>
                                            <th style="width: 30%;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody id="missingTableBody" class="border-top-0"></tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                                <small class="text-muted" id="missingPaginationInfo">Showing 0-0 of 0</small>
                                <nav>
                                    <ul class="pagination pagination-sm mb-0" id="missingPagination"></ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
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

    <div class="modal fade" id="passwordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content border-0 shadow">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fw-bold"><i class="fas fa-lock me-2"></i>ยืนยันตัวตน</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-2">กรุณากรอกรหัสผ่าน Login เพื่อแสดงข้อมูลพนักงาน</p>
                    <div class="form-floating mb-2">
                        <input type="password" class="form-control" id="confirmPasswordInput" placeholder="Password">
                        <label for="confirmPasswordInput">รหัสผ่านของคุณ</label>
                    </div>
                    <div id="passwordErrorMsg" class="text-danger small d-none">
                        <i class="fas fa-exclamation-circle me-1"></i>รหัสผ่านไม่ถูกต้อง
                    </div>
                </div>
                <div class="modal-footer border-0 pt-0">
                    <button type="button" class="btn btn-light btn-sm" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-danger btn-sm px-3" onclick="submitPasswordVerification()">ยืนยัน</button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/moodReport.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>