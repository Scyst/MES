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
                    <h5 class="m-0 fw-bold text-dark"><i class="fas fa-star text-warning me-2"></i> Employee Evaluation</h5>
                </div>

                <div class="d-flex align-items-center bg-white p-2 rounded shadow-sm border dashboard-toolbar">
                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="far fa-calendar-alt"></i> Period:</span>
                        <input type="month" id="filterPeriod" class="form-control form-control-sm border-1 text-primary fw-bold" 
                               value="<?php echo date('Y-m'); ?>" 
                               style="width: 150px; cursor: pointer;">
                    </div>

                    <div class="vr mx-2 text-muted opacity-25 my-1"></div>

                    <div class="d-flex align-items-center px-2">
                        <span class="text-muted small text-uppercase fw-bold me-2"><i class="fas fa-industry"></i> Line:</span>
                        <select id="filterLine" class="form-select form-select-sm border-1 text-primary fw-bold" style="width: 150px; cursor: pointer;">
                            <option value="ALL">ALL LINES</option>
                        </select>
                    </div>

                    <div class="vr mx-2 text-muted opacity-25 my-1"></div>

                    <button class="btn btn-light btn-sm text-secondary fw-bold px-3 py-1 rounded shadow-sm" onclick="App.loadData()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    
                    <button class="btn btn-success btn-sm fw-bold px-4 py-1 rounded ms-2 shadow-sm" onclick="App.saveGrades()" title="Save All Grades">
                        <i class="fas fa-save me-1"></i> Save Grades
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
                    <div class="card shadow-sm border-info h-100">
                        <div class="card-body p-3 d-flex flex-column justify-content-center">
                            <h6 class="text-info fw-bold mb-2">Grade Distribution</h6>
                            <div class="progress" style="height: 25px; font-weight: bold; font-size: 1rem;">
                                <div class="progress-bar bg-success" id="dist-A" style="width: 0%;" title="Grade A">0%</div>
                                <div class="progress-bar bg-primary" id="dist-B" style="width: 0%;" title="Grade B">0%</div>
                                <div class="progress-bar bg-warning text-dark" id="dist-C" style="width: 0%;" title="Grade C">0%</div>
                                <div class="progress-bar bg-danger" id="dist-D" style="width: 0%;" title="Grade D">0%</div>
                            </div>
                            <div class="d-flex justify-content-between mt-2 small text-muted">
                                <span><span class="badge bg-success">A</span> Excellent</span>
                                <span><span class="badge bg-primary">B</span> Good</span>
                                <span><span class="badge bg-warning text-dark">C</span> Fair</span>
                                <span><span class="badge bg-danger">D</span> Needs Improvement</span>
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
                            <thead class="table-dark sticky-top">
                                <tr>
                                    <th width="10%">Emp ID</th>
                                    <th width="20%" class="text-start">Name</th>
                                    <th width="15%">Position</th>
                                    <th width="10%">Line</th>
                                    <th width="15%" class="text-end pe-4">Income Per Head (THB)</th>
                                    <th width="15%">Grade</th>
                                    <th width="15%">Notes</th>
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

    <script src="script/employeeGrading.js?v=<?php echo time(); ?>"></script>
</body>
</html>
