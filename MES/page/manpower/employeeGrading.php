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
        
        /* Segmented Control Toggle */
        .btn-segmented {
            background-color: #f1f3f5;
            border-radius: 50rem;
            padding: 3px;
            display: inline-flex;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-segmented .btn-check:checked + .btn {
            background-color: #ffffff;
            color: #0d6efd;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            font-weight: 700;
        }
        .btn-segmented .btn:not(:checked) {
            color: #6c757d;
            border: none;
            font-weight: 600;
        }
        .btn-segmented .btn:not(:checked):hover {
            color: #495057;
            background-color: rgba(255,255,255,0.5);
        }
    </style>
</head>

<body class="dashboard-page layout-top-header">

    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <main id="main-content" class="d-flex flex-column" style="min-height: calc(100vh - 65px);">
        <div class="container-fluid p-3 d-flex flex-column flex-grow-1">
            
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <div class="d-flex align-items-center">
                    <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                        <span class="position-relative d-flex h-2 w-2">
                            <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping" style="animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
                            <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                        </span>
                        <span class="fw-bold text-dark">Live</span>
                        <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--:--</span>
                    </div>
                </div>

                <div class="d-flex align-items-center bg-white px-3 py-2 rounded-pill shadow-sm border dashboard-toolbar">
                    <div class="d-flex align-items-center">
                        <div class="btn-segmented me-3">
                            <input type="radio" class="btn-check" name="periodTypeToggle" id="btnPeriodMonthly" value="monthly" autocomplete="off" checked>
                            <label class="btn btn-sm rounded-pill px-3 mb-0 border-0" style="transition: all 0.2s;" for="btnPeriodMonthly">Month</label>
                          
                            <input type="radio" class="btn-check" name="periodTypeToggle" id="btnPeriodDaily" value="daily" autocomplete="off">
                            <label class="btn btn-sm rounded-pill px-3 mb-0 border-0" style="transition: all 0.2s;" for="btnPeriodDaily">Day</label>
                        </div>
                        <i class="far fa-calendar-alt text-primary opacity-50 me-2"></i>
                        <input type="month" id="filterPeriodMonth" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                               value="<?php echo date('Y-m'); ?>" 
                               style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" title="Select Month">
                        <input type="date" id="filterPeriodDate" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0 d-none" 
                               value="<?php echo date('Y-m-d'); ?>" 
                               style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" title="Select Date">
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <div class="d-flex align-items-center">
                        <i class="fas fa-users-cog text-primary opacity-50 me-2"></i>
                        <select id="filterHcGroup" class="form-select form-select-sm border-0 bg-transparent text-primary fw-bold p-0" style="width: 90px; cursor: pointer; box-shadow: none; outline: none;" title="Select Group">
                            <option value="TEAM 1">TEAM 1</option>
                            <option value="ALL">ALL GROUPS</option>
                        </select>
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                    <div class="d-flex align-items-center">
                        <i class="fas fa-industry text-primary opacity-50 me-2"></i>
                        <select id="filterLine" class="form-select form-select-sm border-0 bg-transparent text-primary fw-bold p-0" style="width: 100px; cursor: pointer; box-shadow: none; outline: none;" title="Select Line">
                            <option value="ALL">ALL LINES</option>
                        </select>
                        <button class="btn btn-light btn-sm text-secondary fw-bold rounded-circle shadow-sm ms-3 d-flex align-items-center justify-content-center" style="width: 28px; height: 28px; padding: 0;" onclick="App.loadData()" title="Reload Data">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>

                    <div class="vr mx-1 text-muted opacity-25 my-1"></div>
                    
                    <div class="d-flex align-items-center ms-auto">
                        <button class="btn btn-light btn-sm text-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; padding: 0;" id="btnCriteriaSettings" title="Criteria Settings">
                            <i class="fas fa-cog"></i>
                        </button>

                        <button class="btn btn-warning btn-sm fw-bold px-4 rounded-pill shadow-sm text-dark d-flex align-items-center justify-content-center" style="height: 32px;" onclick="App.autoGrade()" title="Apply System Grades">
                            <i class="fas fa-magic me-2"></i> Auto Grade
                        </button>
                    </div>
                </div>
            </div>

            <!-- KPI Row -->
            <div class="row g-2 mb-3"> 
                <div class="col-xl col-md-6">
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
                
                <div class="col-xl col-md-6">
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
                
                <div class="col-xl col-md-6">
                    <div class="card shadow-sm kpi-card border-info h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-info small fw-bold mb-1">Avg Ratio</div>
                                    <h2 class="text-info" id="kpi-avg-ratio">0.00</h2>
                                    <div class="small text-muted mt-1 pt-1">Multiplier</div>
                                </div>
                                <div class="icon-circle bg-info-soft">
                                    <i class="fas fa-balance-scale"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-xl col-md-6">
                    <div class="card shadow-sm kpi-card border-warning h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-warning small fw-bold mb-1">Total Income</div>
                                    <h2 class="text-dark" id="kpi-total-income">0</h2>
                                    <div class="small text-muted mt-1 pt-1">THB Generated</div>
                                </div>
                                <div class="icon-circle bg-warning-soft">
                                    <i class="fas fa-coins"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-xl col-md-6">
                    <div class="card shadow-sm kpi-card border-danger h-100">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center h-100">
                                <div>
                                    <div class="text-uppercase text-danger small fw-bold mb-1">Total Wage <i class="fas fa-eye-slash ms-1 text-muted" id="kpiWageEyeToggle" style="cursor: pointer;" onclick="App.toggleWageVisibility()" title="Show/Hide"></i></div>
                                    <h2 class="text-danger" id="kpi-total-wage">******</h2>
                                    <div class="small text-muted mt-1 pt-1" id="kpi-wage-subtitle">Base Wage (Hidden)</div>
                                </div>
                                <div class="icon-circle bg-danger-soft text-danger">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="card shadow-sm border-0 mb-3 flex-grow-1 d-flex flex-column" style="min-height: calc(100vh - 280px);">
                <div class="card-body p-0 d-flex flex-column h-100">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover table-striped mb-0 text-center align-middle" id="gradingTable">
                            <thead class="table-light sticky-top shadow-sm" style="z-index: 10;">
                                <tr>
                                    <th style="width: 10%;" class="sortable" data-sort="emp_id" role="button">Emp ID <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 20%;" class="sortable" data-sort="name_th" role="button">Name & Department <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 10%;" class="sortable" data-sort="position" role="button">Position <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 13%;" class="sortable" data-sort="ratio" role="button">Income & Ratio <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 12%;" class="sortable" data-sort="total_wage" role="button">
                                        Total Wage 
                                        <i class="fas fa-eye-slash ms-2 text-muted" id="thWageEyeToggle" style="cursor: pointer;" onclick="event.stopPropagation(); App.toggleWageVisibility()" title="Show/Hide Wage"></i>
                                        <i class="fas fa-sort text-muted ms-1"></i>
                                    </th>
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
    <div class="position-fixed bottom-0 end-0 p-4" style="z-index: 1000;">
        <button id="btnSaveGrades" class="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; font-size: 1.5rem;" title="Save Grades">
            <i class="fas fa-save"></i>
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
