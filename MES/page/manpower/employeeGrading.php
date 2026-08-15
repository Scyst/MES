<?php
// page/manpower/employeeGrading.php
require_once __DIR__ . '/../components/init.php';

// Only Admin/Executive or Manpower Manager can view this
if (!hasPermission('manage_manpower')) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$currentUser = $_SESSION['user'];
$pageTitle = "Employee Grading";
$pageHeaderTitle = "Income Per Head & Grading"; 
$pageHeaderSubtitle = "ระบบตัดเกรดพนักงานและวิเคราะห์รายได้ต่อหัว";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/manpowerUI.css?v=<?php echo filemtime(__DIR__ . '/css/manpowerUI.css'); ?>">
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <style>
        .grade-select {
            width: 100px;
            text-align: center;
            font-weight: bold;
        }
        .grade-A { color: #198754; background-color: #d1e7dd; border-color: #badbcc; }
        .grade-B { color: #0d6efd; background-color: #cfe2ff; border-color: #b6d4fe; }
        .grade-C { color: #ffc107; background-color: #fff3cd; border-color: #ffecb5; }
        .grade-D { color: #dc3545; background-color: #f8d7da; border-color: #f5c2c7; }
        .grade-empty { color: #6c757d; }
    </style>
</head>

<body class="dashboard-page layout-top-header">

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid p-3">
            
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div class="d-flex align-items-center">
                    <h5 class="m-0 fw-bold text-dark d-none d-md-block me-3"><i class="fas fa-star text-warning me-2"></i> Grading</h5>
                    <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                        <span class="position-relative d-flex h-2 w-2">
                            <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping" style="animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                            <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                        </span>
                        <span class="fw-bold text-dark">Live</span>
                        <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--:--</span>
                    </div>
                </div>

                <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="far fa-calendar-alt"></i> Period:</span>
                        <input type="month" id="filterPeriod" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                               value="<?php echo date('Y-m'); ?>" 
                               style="width: 130px; cursor: pointer;">
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="fas fa-users-cog"></i> Group:</span>
                        <select id="filterHcGroup" class="form-select form-select-sm border-0 bg-transparent text-primary fw-bold p-0 ps-1" style="width: 100px; cursor: pointer; box-shadow: none;">
                            <option value="TEAM 1">TEAM 1</option>
                            <option value="ALL">ALL GROUPS</option>
                        </select>
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="fas fa-industry"></i> Line:</span>
                        <select id="filterLine" class="form-select form-select-sm border-0 bg-transparent text-primary fw-bold p-0 ps-1" style="width: 120px; cursor: pointer; box-shadow: none;">
                            <option value="ALL">ALL LINES</option>
                        </select>
                        <button class="btn btn-sm btn-outline-secondary ms-2 rounded-circle" style="width: 28px; height: 28px; padding: 0;" id="btnCriteriaSettings" title="Criteria Settings">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <button class="btn btn-light btn-sm text-secondary fw-bold px-2 py-1 rounded shadow-sm ms-1" onclick="App.loadData()" title="Reload Data">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    
                    <button class="btn btn-success btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm" onclick="App.saveGrades()" title="Save All Grades">
                        <i class="fas fa-save me-1"></i> Save
                    </button>
                </div>
            </div>

            <!-- KPI Row -->
            <div class="row g-2 mb-3"> 
                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-primary h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-primary small fw-bold mb-1">Total Employees</div>
                                    <h2 class="text-dark" id="kpi-total-emp">0</h2>
                                    <div class="small text-muted mt-1 pt-1">Headcount</div>
                                </div>
                                <div class="icon-circle bg-primary-soft">
                                    <i class="fas fa-users"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-3 col-md-6">
                    <div class="card shadow-sm kpi-card border-success h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-success small fw-bold mb-1">Avg Income Per Head</div>
                                    <h2 class="text-success" id="kpi-avg-income">0</h2>
                                    <div class="small text-muted mt-1 pt-1">THB / Person</div>
                                </div>
                                <div class="icon-circle bg-success-soft">
                                    <i class="fas fa-hand-holding-usd"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl-6 col-md-12">
                    <div class="card shadow-sm kpi-card border-info h-100">
                        <div class="card-body p-3 d-flex flex-column justify-content-center">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <div class="text-uppercase text-info small fw-bold mb-1">Grade Distribution</div>
                                </div>
                                <div class="icon-circle bg-info-soft" style="width: 32px; height: 32px; font-size: 0.9rem;">
                                    <i class="fas fa-chart-bar"></i>
                                </div>
                            </div>
                            <div class="progress shadow-sm" style="height: 25px; font-weight: bold; font-size: 1rem; border-radius: 6px;">
                                <div class="progress-bar bg-success" id="dist-A" style="width: 0%;" title="Grade A">0%</div>
                                <div class="progress-bar bg-primary" id="dist-B" style="width: 0%;" title="Grade B">0%</div>
                                <div class="progress-bar bg-warning text-dark" id="dist-C" style="width: 0%;" title="Grade C">0%</div>
                                <div class="progress-bar bg-danger" id="dist-D" style="width: 0%;" title="Grade D">0%</div>
                            </div>
                            <div class="d-flex justify-content-between mt-2 small text-muted px-1">
                                <span><span class="badge bg-success-soft text-success border border-success-subtle">A</span> <span class="d-none d-md-inline">Excellent</span></span>
                                <span><span class="badge bg-primary-soft text-primary border border-primary-subtle">B</span> <span class="d-none d-md-inline">Good</span></span>
                                <span><span class="badge bg-warning-soft text-warning border border-warning-subtle">C</span> <span class="d-none d-md-inline">Fair</span></span>
                                <span><span class="badge bg-danger-soft text-danger border border-danger-subtle">D</span> <span class="d-none d-md-inline">Improve</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="card shadow-sm border-0">
                <div class="card-body p-0">
                    <div class="table-responsive" style="max-height: 60vh;">
                        <table class="table table-hover table-striped mb-0 text-center align-middle" id="gradingTable">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 15%;" class="sortable" data-sort="emp_id" role="button">Emp ID <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 20%;" class="sortable" data-sort="name_th" role="button">Name <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 15%;" class="sortable" data-sort="position" role="button">Position <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 15%;" class="sortable" data-sort="ratio" role="button">Income & Ratio <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 15%; text-align: center;">Executive Grade</th>
                                    <th style="width: 20%;">Notes</th>
                                </tr>
                            </thead>
                            <tbody id="gradingTableBody">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <!-- Save Button Container (Sticky Bottom) -->
    <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 1000;">
        <button id="btnSaveGrades" class="btn btn-primary btn-lg rounded-pill shadow-lg px-4 fw-bold">
            <i class="fas fa-save me-2"></i> Save Grades
        </button>
    </div>

    <!-- Criteria Settings Modal -->
    <div class="modal fade" id="criteriaModal" tabindex="-1" aria-labelledby="criteriaModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-light border-bottom-0">
                    <h5 class="modal-title fw-bold text-dark" id="criteriaModalLabel"><i class="fas fa-sliders-h text-primary me-2"></i> Grading Criteria (All Lines)</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive" style="max-height: 50vh;">
                        <table class="table table-hover table-striped mb-0 text-center align-middle">
                            <thead class="table-dark sticky-top">
                                <tr>
                                    <th style="width: 25%;">Line</th>
                                    <th style="width: 25%;">Ratio A (>=)</th>
                                    <th style="width: 25%;">Ratio B (>=)</th>
                                    <th style="width: 25%;">Ratio C (>=)</th>
                                </tr>
                            </thead>
                            <tbody id="criteriaTableBody">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>
                    <div class="p-3 text-muted small bg-light border-top">
                        <i class="fas fa-info-circle me-1"></i> Below Grade C will automatically be marked as <strong class="text-danger">D</strong><br>
                        <i class="fas fa-lightbulb me-1 mt-1 text-warning"></i> <strong>Ratio</strong> = Total Income / Total Wage (e.g. 2.0 = earned twice their wage)
                    </div>
                </div>
                <div class="modal-footer border-top-0">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary btn-sm px-4" id="btnSaveCriteria">Save All Criteria</button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/employeeGrading.js?v=<?php echo time(); ?>"></script>
</body>
</html>
