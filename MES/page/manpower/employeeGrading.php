<?php
// page/manpower/employeeGrading.php
require_once __DIR__ . '/../components/init.php';

// Strictly restricted to Admin / Manager / Creator level (Confidential Evaluation & Bonus Data)
if (!hasRole(['creator', 'admin', 'manager']) || !hasPermission('manage_manpower')) {
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
    
    <!-- ApexCharts -->
    <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    
    <!-- Replace standard SheetJS with xlsx-js-style to support Excel cell alignment/styling -->
    <script src="https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
    
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
                            <input type="radio" class="btn-check" name="periodTypeToggle" id="btnPeriodDaily" value="daily" autocomplete="off" checked>
                            <label class="btn btn-sm rounded-pill px-3 mb-0 border-0" style="transition: all 0.2s;" for="btnPeriodDaily">Day</label>

                            <input type="radio" class="btn-check" name="periodTypeToggle" id="btnPeriodMonthly" value="monthly" autocomplete="off">
                            <label class="btn btn-sm rounded-pill px-3 mb-0 border-0" style="transition: all 0.2s;" for="btnPeriodMonthly">Month</label>
                          
                            <input type="radio" class="btn-check" name="periodTypeToggle" id="btnPeriodRange" value="range" autocomplete="off">
                            <label class="btn btn-sm rounded-pill px-3 mb-0 border-0" style="transition: all 0.2s;" for="btnPeriodRange">Range</label>
                        </div>
                        <i class="far fa-calendar-alt text-primary opacity-50 me-2"></i>
                        <input type="month" id="filterPeriodMonth" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0 d-none" 
                               value="<?php echo date('Y-m'); ?>" 
                               style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" title="Select Month">
                        <input type="date" id="filterPeriodDate" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                               value="<?php echo date('Y-m-d'); ?>" 
                               style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" title="Select Date">
                        <div id="filterPeriodRangeGroup" class="d-flex align-items-center d-none">
                            <input type="date" id="filterPeriodDateStart" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                                   style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" value="<?= date('Y-m-d', strtotime('-7 days')) ?>">
                            <span class="mx-1 text-primary fw-bold">-</span>
                            <input type="date" id="filterPeriodDateEnd" class="form-control form-control-sm border-0 bg-transparent text-primary fw-bold p-0" 
                                   style="width: 110px; cursor: pointer; outline: none; box-shadow: none;" value="<?= date('Y-m-d') ?>">
                        </div>
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
                        <button class="btn btn-light btn-sm text-primary fw-bold rounded-pill shadow-sm d-flex align-items-center justify-content-center px-3 me-2 border border-primary border-opacity-25" style="height: 32px; font-size: 0.8rem;" data-bs-toggle="modal" data-bs-target="#gradingFormulaModal" title="คู่มือสูตรการคำนวณและเกณฑ์การตัดเกรด 4 มิติ">
                            <i class="fas fa-calculator me-1"></i> สูตร & เกณฑ์ตัดเกรด
                        </button>

                        <button class="btn btn-light btn-sm text-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; padding: 0;" data-bs-toggle="modal" data-bs-target="#analyticsModal" title="Open Analytics">
                            <i class="fas fa-chart-pie"></i>
                        </button>
                        
                        <button class="btn btn-light btn-sm text-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; padding: 0;" id="btnWeightageSettings" title="Team Weightage Settings">
                            <i class="fas fa-balance-scale"></i>
                        </button>
                        
                        <button class="btn btn-light btn-sm text-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; padding: 0;" id="btnCriteriaSettings" title="Criteria Settings">
                            <i class="fas fa-cog"></i>
                        </button>

                        <button class="btn btn-light btn-sm text-success rounded-circle shadow-sm d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px; padding: 0;" data-bs-toggle="modal" data-bs-target="#audit5sModal" title="บันทึกและดูประวัติ 5S Audit">
                            <i class="fas fa-broom"></i>
                        </button>
                        <div class="dropdown me-2">
                            <button class="btn btn-light btn-sm text-secondary rounded-circle shadow-sm d-flex align-items-center justify-content-center" type="button" id="exportDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="width: 32px; height: 32px; padding: 0;" title="Export Data">
                                <i class="fas fa-file-export"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" aria-labelledby="exportDropdown" style="font-size: 0.9rem;">
                                <li><a class="dropdown-item" href="#" onclick="App.exportData('excel'); return false;"><i class="fas fa-file-excel text-success me-2"></i> Export to Excel</a></li>
                                <li><a class="dropdown-item" href="#" onclick="App.exportData('csv'); return false;"><i class="fas fa-file-csv text-info me-2"></i> Export to CSV</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item" href="#" onclick="App.exportData('pdf'); return false;"><i class="fas fa-file-pdf text-danger me-2"></i> Export Report (PDF)</a></li>
                            </ul>
                        </div>

                        <button class="btn btn-sm fw-bold px-4 rounded-pill shadow-sm text-white d-flex align-items-center justify-content-center" style="height: 32px; background: linear-gradient(135deg, #f59e0b, #ea580c); border: none; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='translateY(0)'" onclick="App.autoGrade()" title="Apply System Grades">
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
            <div class="card shadow-sm border-0 mb-3 flex-grow-1 d-flex flex-column" style="height: calc(100vh - 280px);">
                <div class="card-body p-0 d-flex flex-column h-100">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover table-striped mb-0 text-center align-middle" id="gradingTable">
                            <thead class="table-light sticky-top shadow-sm" style="z-index: 10;">
                                <tr>
                                    <th style="width: 8%;" class="sortable" data-sort="emp_id" role="button">Emp ID <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 13%;" class="sortable" data-sort="name_th" role="button">Name & Dept <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 9%;" class="sortable" data-sort="position" role="button">Position <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 9%;" class="sortable" data-sort="ratio" role="button">Income & Ratio <i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 11%;" class="sortable" data-sort="total_wage" role="button">
                                        Total Wage 
                                        <i class="fas fa-eye-slash ms-1 text-muted" id="thWageEyeToggle" style="cursor: pointer;" onclick="event.stopPropagation(); App.toggleWageVisibility()" title="Show/Hide Wage"></i>
                                    </th>
                                    <th style="width: 8%; text-align: center;" class="sortable" data-sort="grade_iph" role="button" title="มิติที่ 1: รายได้ต่อหัวเทียบค่าแรง (IPH Ratio = Income / Total Wage)">IPH <i class="fas fa-info-circle text-primary opacity-50 small ms-1"></i><i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 8%; text-align: center;" class="sortable" data-sort="grade_5s" role="button" title="มิติที่ 2: คะแนนตรวจ 5 ส ประจำสายการผลิต (A ≥ 85, B ≥ 70, C ≥ 55, D < 55)">5S <i class="fas fa-info-circle text-success opacity-50 small ms-1"></i><i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 8%; text-align: center;" class="sortable" data-sort="grade_attendance" role="button" title="มิติที่ 3: วินัยการมาทำงาน (ผลรวมวันมาสาย + วันขาดงาน)">Attd <i class="fas fa-info-circle text-info opacity-50 small ms-1"></i><i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 8%; text-align: center;" class="sortable" data-sort="grade_learning" role="button" title="มิติที่ 4: ทักษะและการเรียนรู้ 3 ระดับตำแหน่ง (ปฏิบัติการ A≥3, หัวหน้า/เทคนิค A≥5, บริหาร/วิศวกร A≥8)">Learn <i class="fas fa-info-circle text-warning opacity-75 small ms-1"></i><i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 8%; text-align: center;" class="sortable" data-sort="grade_overall" role="button" title="เกรดรวมถ่วงน้ำหนัก GPA 4.0 (A ≥ 3.50, B ≥ 2.50, C ≥ 1.50, D < 1.50)">Overall <i class="fas fa-info-circle text-danger opacity-50 small ms-1"></i><i class="fas fa-sort text-muted ms-1"></i></th>
                                    <th style="width: 10%;">Notes</th>
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

    <!-- 5S Audit Modal -->
    <div class="modal fade" id="audit5sModal" tabindex="-1" aria-labelledby="audit5sModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg overflow-hidden">

                <!-- Modal Header -->
                <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%);">
                    <h5 class="modal-title fw-bold text-white mb-0" id="audit5sModalLabel">
                        <i class="fas fa-broom opacity-75 me-2"></i>5S Audit
                    </h5>
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <!-- Tabs -->
                <ul class="nav nav-tabs px-4 pt-2 bg-white border-bottom" id="audit5sTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active fw-semibold" id="tab-record-btn" data-bs-toggle="tab" data-bs-target="#tab-record" type="button" role="tab" aria-selected="true">
                            <i class="fas fa-pen me-1 text-success"></i>บันทึก
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link fw-semibold" id="tab-history-btn" data-bs-toggle="tab" data-bs-target="#tab-history" type="button" role="tab" aria-selected="false">
                            <i class="fas fa-history me-1 text-info"></i>ประวัติการตรวจ
                        </button>
                    </li>
                </ul>

                <div class="modal-body p-0" style="background: #f8f9fc;">
                    <div class="tab-content">

                        <!-- ── Tab: Record ── -->
                        <div class="tab-pane fade show active p-4" id="tab-record" role="tabpanel">
                            <div class="row g-3 mb-3">
                                <div class="col-7">
                                    <label class="form-label fw-bold text-secondary small">Production Line</label>
                                    <select id="audit5sLine" class="form-select form-select-sm">
                                        <!-- Populated by JS on modal open -->
                                    </select>
                                </div>
                                <div class="col-5">
                                    <label class="form-label fw-bold text-secondary small">วันที่ตรวจ</label>
                                    <input type="date" id="audit5sDate" class="form-control form-control-sm">
                                </div>
                            </div>

                            <div class="table-responsive mb-3">
                                <table class="table table-sm table-bordered text-center mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th class="text-start">หมวด 5S</th>
                                            <th style="width:100px">คะแนน (0–20)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td class="text-start"><span class="fw-bold text-danger">S1</span> คัดแยก (Seiri)</td>
                                            <td><input type="number" id="scoreSeiri" class="form-control form-control-sm text-center audit-score" min="0" max="20" value="15"></td>
                                        </tr>
                                        <tr>
                                            <td class="text-start"><span class="fw-bold text-warning">S2</span> จัดเป็นระเบียบ (Seiton)</td>
                                            <td><input type="number" id="scoreSeiton" class="form-control form-control-sm text-center audit-score" min="0" max="20" value="15"></td>
                                        </tr>
                                        <tr>
                                            <td class="text-start"><span class="fw-bold text-primary">S3</span> ทำความสะอาด (Seiso)</td>
                                            <td><input type="number" id="scoreSeiso" class="form-control form-control-sm text-center audit-score" min="0" max="20" value="15"></td>
                                        </tr>
                                        <tr>
                                            <td class="text-start"><span class="fw-bold text-info">S4</span> รักษามาตรฐาน (Seiketsu)</td>
                                            <td><input type="number" id="scoreSeiketsu" class="form-control form-control-sm text-center audit-score" min="0" max="20" value="15"></td>
                                        </tr>
                                        <tr>
                                            <td class="text-start"><span class="fw-bold text-success">S5</span> สร้างวินัย (Shitsuke)</td>
                                            <td><input type="number" id="scoreShitsuke" class="form-control form-control-sm text-center audit-score" min="0" max="20" value="15"></td>
                                        </tr>
                                    </tbody>
                                    <tfoot class="table-light fw-bold">
                                        <tr>
                                            <td class="text-start">รวม / เกรด</td>
                                            <td><span id="audit5sTotal">75</span> → <span id="audit5sGrade" class="badge bg-primary">B</span></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div class="mb-2">
                                <label class="form-label fw-bold text-secondary small">หมายเหตุ (ไม่บังคับ)</label>
                                <textarea id="audit5sRemarks" class="form-control form-control-sm" rows="2" maxlength="500" placeholder="ระบุจุดที่ต้องปรับปรุง..."></textarea>
                            </div>
                            <p class="text-muted small mb-0"><i class="fas fa-info-circle me-1"></i>A=85+, B=70+, C=55+, D=&lt;55</p>

                            <div id="audit5sAlert" class="alert mt-3 py-2 small d-none" role="alert"></div>
                        </div>

                        <!-- ── Tab: History ── -->
                        <div class="tab-pane fade p-3" id="tab-history" role="tabpanel">
                            <!-- Filter bar -->
                            <div class="d-flex flex-wrap gap-2 mb-3 align-items-center">
                                <select id="historyLineFilter" class="form-select form-select-sm" style="max-width:160px;">
                                    <option value="ALL">ทุก Line</option>
                                    <!-- Populated by JS -->
                                </select>
                                <button class="btn btn-sm btn-outline-teal" id="btnRefreshHistory" style="color:#0d9488; border-color:#0d9488;">
                                    <i class="fas fa-sync-alt me-1"></i>โหลดใหม่
                                </button>
                                <small id="historyMeta" class="text-muted ms-auto"></small>
                            </div>

                            <!-- Table -->
                            <div class="table-responsive" style="max-height:380px; overflow-y:auto;">
                                <table class="table table-sm table-hover align-middle mb-0">
                                    <thead class="table-light sticky-top shadow-sm">
                                        <tr class="text-center" style="font-size:0.82rem;">
                                            <th class="text-start">วันที่</th>
                                            <th>Line</th>
                                            <th>S1</th><th>S2</th><th>S3</th><th>S4</th><th>S5</th>
                                            <th>รวม</th>
                                            <th>เกรด</th>
                                            <th class="text-start">หมายเหตุ</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historyTableBody">
                                        <tr><td colspan="10" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin me-1"></i>กรุณากดโหลดประวัติ</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- Pagination -->
                            <div id="historyPagination" class="d-flex justify-content-between align-items-center mt-2 small text-muted"></div>
                        </div>

                    </div><!-- /tab-content -->
                </div><!-- /modal-body -->

                <div class="modal-footer py-2 px-4 border-top bg-white" id="audit5sFooter">
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-sm btn-success px-4" id="btnSave5sAudit">
                        <i class="fas fa-save me-1"></i>บันทึกคะแนน
                    </button>
                </div>

            </div>
        </div>
    </div>

    <!-- Analytics Modal -->
    <div class="modal fade" id="analyticsModal" aria-labelledby="analyticsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg overflow-hidden">

                <!-- Modal Header with Gradient -->
                <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #1a1f5e 0%, #2d3561 50%, #1e4fa3 100%);">
                    <div class="d-flex align-items-center gap-3 flex-grow-1 flex-wrap">
                        <div>
                            <h5 class="modal-title fw-bold text-white mb-0" id="analyticsModalLabel">
                                <i class="fas fa-chart-line me-2 opacity-75"></i>Grading & Manpower Analytics
                            </h5>
                            <div class="text-white opacity-50 small mt-1" id="analytics-period-label">Loading...</div>
                        </div>
                        <!-- Mini Summary Stats -->
                        <div class="d-flex gap-3 ms-auto flex-wrap">
                            <div class="text-center px-3 py-1 rounded-3" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                <div class="text-white opacity-60 small" style="font-size:0.7rem;">EMPLOYEES</div>
                                <div class="text-white fw-bold" id="analytics-stat-emp">—</div>
                            </div>
                            <div class="text-center px-3 py-1 rounded-3" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                <div class="text-white opacity-60 small" style="font-size:0.7rem;">AVG RATIO</div>
                                <div class="text-white fw-bold" id="analytics-stat-ratio">—</div>
                            </div>
                            <div class="text-center px-3 py-1 rounded-3" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                <div class="text-white opacity-60 small" style="font-size:0.7rem;">TOTAL INCOME</div>
                                <div class="text-white fw-bold" id="analytics-stat-income">—</div>
                            </div>
                            <div class="text-center px-3 py-1 rounded-3" style="background: rgba(255,255,255,0.12);">
                                <div class="text-white opacity-60 small" style="font-size:0.7rem;">TOTAL WAGE</div>
                                <div class="text-white fw-bold" id="analytics-stat-wage">—</div>
                            </div>
                            
                            <!-- Save Picture Button (Icon Only) -->
                            <button type="button" class="btn border-0 text-white rounded-3 d-flex align-items-center justify-content-center shadow-sm align-self-stretch px-3" 
                                    style="background: rgba(255,255,255,0.15); backdrop-filter: blur(4px); transition: all 0.2s;" 
                                    onclick="App.saveAnalysisAsImage()" 
                                    onmouseover="this.style.background='rgba(255,255,255,0.25)'" 
                                    onmouseout="this.style.background='rgba(255,255,255,0.15)'"
                                    title="Save Picture">
                                <i class="fas fa-camera fa-lg opacity-75"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="btn-close btn-close-white ms-3" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <!-- Tab Nav -->
                <div class="px-4 pt-2 pb-0 bg-white border-bottom">
                    <ul class="nav nav-tabs border-0 gap-1" id="analyticsTabs">
                        <li class="nav-item">
                            <button class="nav-link active fw-semibold px-3 py-2 small" data-bs-toggle="tab" data-bs-target="#tab-overview" type="button">
                                <i class="fas fa-th-large me-1"></i> Overview
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link fw-semibold px-3 py-2 small" data-bs-toggle="tab" data-bs-target="#tab-performance" type="button">
                                <i class="fas fa-users me-1"></i> Performance
                            </button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link fw-semibold px-3 py-2 small" data-bs-toggle="tab" data-bs-target="#tab-wage" type="button">
                                <i class="fas fa-money-bill-wave me-1"></i> Wage Analysis
                                <span class="badge bg-danger-subtle text-danger ms-1 small" style="font-size:0.65rem;">🔒</span>
                            </button>
                        </li>
                    </ul>
                </div>

                <!-- Analytics Filter Bar -->
                <div class="px-4 py-2 bg-white border-bottom d-flex align-items-center gap-2 flex-wrap">
                    <i class="fas fa-filter text-muted" style="font-size:0.75rem;"></i>
                    <small class="text-muted fw-semibold">Filter Charts:</small>
                    <select id="analyticsLineFilter" class="form-select form-select-sm rounded-pill border" style="width: auto; min-width: 130px; font-size: 0.8rem;">
                        <option value="ALL">All Lines</option>
                    </select>
                    <div class="ms-auto d-flex align-items-center gap-3">
                        <span class="text-muted small" id="analytics-filter-count">Loading...</span>
                        <div class="vr text-muted opacity-25" style="height: 20px;"></div>
                        <button class="btn btn-sm border-0 rounded-pill d-flex align-items-center fw-bold px-3" id="btnGlobalWageToggle" onclick="App.toggleWageVisibility()" style="font-size: 0.75rem; min-width: 110px; justify-content: center; background-color: #fff3cd; color: #664d03;">
                            <i class="fas fa-lock me-1"></i> <span>Unlock Wage</span>
                        </button>
                    </div>
                </div>

                <div class="modal-body p-3" style="background: #f8f9fc;">
                    <div class="tab-content">

                        <!-- TAB 1: Overview -->
                        <div class="tab-pane fade show active" id="tab-overview">
                            <div class="row g-3">
                                <!-- Grade Distribution Donut -->
                                <div class="col-12 col-xl-5">
                                    <div class="card h-100 border-0 shadow-sm">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Grade Distribution</h6>
                                                <span class="badge bg-light text-secondary border small" id="analytics-grade-total-badge">0 graded</span>
                                            </div>
                                            <div id="chart-grade-dist" style="min-height: 260px;"></div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Grade by Line Heatmap -->
                                <div class="col-12 col-xl-7">
                                    <div class="card h-100 border-0 shadow-sm">
                                        <div class="card-body pb-1">
                                            <h6 class="card-title text-secondary fw-bold small text-uppercase mb-2">Grade by Line (Heatmap)</h6>
                                            <div id="chart-grade-heatmap" style="min-height: 260px;"></div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Profitability Ratio by Line -->
                                <div class="col-12">
                                    <div class="card border-0 shadow-sm">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Profitability: Avg Income vs Avg Wage & Ratio by Line</h6>
                                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle small">Breakeven at ratio = 1.0</span>
                                            </div>
                                            <div id="chart-profitability" style="min-height: 240px;" class="position-relative">
                                                <div id="overlay-profitability" class="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex flex-column align-items-center justify-content-center d-none rounded" style="backdrop-filter: blur(3px); z-index: 10;">
                                                    <i class="fas fa-lock fa-2x text-muted mb-2"></i>
                                                    <p class="text-muted small mb-2 text-center">Wage data is protected.</p>
                                                    <button class="btn btn-sm btn-primary rounded-pill shadow-sm px-3" onclick="App.toggleWageVisibility()">
                                                        <i class="fas fa-key me-1"></i> Unlock Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: Performance -->
                        <div class="tab-pane fade" id="tab-performance">
                            <div class="row g-3">
                                <!-- Top/Bottom Performers -->
                                <div class="col-12 col-xl-6">
                                    <div class="card h-100 border-0 shadow-sm">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Top 5 Performers</h6>
                                                <span class="badge bg-success-subtle text-success border border-success-subtle small">By Income</span>
                                            </div>
                                            <div id="chart-top-performers" style="min-height: 260px;"></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-xl-6">
                                    <div class="card h-100 border-0 shadow-sm">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Bottom 5 Performers</h6>
                                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle small">By Income</span>
                                            </div>
                                            <div id="chart-bottom-performers" style="min-height: 260px;"></div>
                                        </div>
                                    </div>
                                </div>
                                <!-- Scatter Performance Matrix -->
                                <div class="col-12">
                                    <div class="card border-0 shadow-sm position-relative">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Employee Performance Matrix (Wage vs Income)</h6>
                                                <span class="badge bg-warning-subtle text-warning border border-warning-subtle small">🔒 Wage Protected</span>
                                            </div>
                                            <div id="chart-performance" style="min-height: 260px;"></div>
                                            <div id="overlay-performance" class="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex flex-column align-items-center justify-content-center d-none rounded" style="backdrop-filter: blur(3px); z-index: 10;">
                                                <i class="fas fa-lock fa-2x text-muted mb-2"></i>
                                                <p class="text-muted small mb-2 text-center">Wage data is protected. Unlock to view the Performance Matrix.</p>
                                                <button class="btn btn-sm btn-primary rounded-pill shadow-sm px-3" onclick="App.toggleWageVisibility()">
                                                    <i class="fas fa-key me-1"></i> Unlock Data
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 3: Wage Analysis -->
                        <div class="tab-pane fade" id="tab-wage">
                            <div class="row g-3">
                                <!-- Labor Cost Breakdown -->
                                <div class="col-12 col-xl-6">
                                    <div class="card h-100 border-0 shadow-sm position-relative">
                                        <div class="card-body pb-1">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <h6 class="card-title text-secondary fw-bold small text-uppercase mb-0">Labor Cost Breakdown by Line (DL vs OT)</h6>
                                                <span class="badge bg-secondary-subtle text-secondary border small" id="wage-tab-total-badge">—</span>
                                            </div>
                                            <div id="chart-wage-breakdown" style="min-height: 270px;"></div>
                                        </div>
                                        <div id="overlay-wage-breakdown" class="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex flex-column align-items-center justify-content-center d-none rounded" style="backdrop-filter: blur(3px); z-index: 10;">
                                            <i class="fas fa-lock fa-2x text-muted mb-2"></i>
                                            <p class="text-muted small mb-2 text-center">Wage data is protected.</p>
                                            <button class="btn btn-sm btn-primary rounded-pill shadow-sm px-3" onclick="App.toggleWageVisibility()">
                                                <i class="fas fa-key me-1"></i> Unlock Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <!-- OT Ratio per Line -->
                                <div class="col-12 col-xl-6">
                                    <div class="card h-100 border-0 shadow-sm position-relative">
                                        <div class="card-body pb-1">
                                            <h6 class="card-title text-secondary fw-bold small text-uppercase mb-2">OT Cost Ratio per Line (%)</h6>
                                            <div id="chart-ot-ratio" style="min-height: 270px;"></div>
                                        </div>
                                        <div id="overlay-ot-ratio" class="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex flex-column align-items-center justify-content-center d-none rounded" style="backdrop-filter: blur(3px); z-index: 10;">
                                            <i class="fas fa-lock fa-2x text-muted mb-2"></i>
                                            <p class="text-muted small mb-2 text-center">Wage data is protected.</p>
                                            <button class="btn btn-sm btn-primary rounded-pill shadow-sm px-3" onclick="App.toggleWageVisibility()">
                                                <i class="fas fa-key me-1"></i> Unlock Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div><!-- end tab-content -->
                </div><!-- end modal-body -->

                <div class="modal-footer py-2 px-4 border-top bg-white">
                    <span class="text-muted small me-auto"><i class="fas fa-info-circle me-1"></i>Data reflects the currently selected filter period.</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill" data-bs-dismiss="modal">Close</button>
                </div>

            </div>
        </div>
    </div>
        
    <!-- Criteria Settings Modal -->
    <div class="modal fade" id="criteriaModal" tabindex="-1" aria-labelledby="criteriaModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #1a1f5e 0%, #2d3561 50%, #1e4fa3 100%);">
                    <h5 class="modal-title fw-bold text-white mb-0 w-100" id="criteriaModalLabel"><i class="fas fa-sliders-h opacity-75 me-2"></i> Grading Criteria (All Lines)</h5>
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-0">
                    <div class="table-responsive" style="max-height: 50vh;">
                        <table class="table table-hover table-striped mb-0 text-center align-middle">
                            <thead class="table-light sticky-top shadow-sm">
                                <tr>
                                    <th class="text-center" style="width: 16%;">LINE</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Ratio A (>=)</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Ratio B (>=)</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Ratio C (>=)</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Attd A (<= Lates)</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Attd B (<= Lates)</th>
                                    <th style="width: 14%; font-size: 0.85rem;">Attd C (<= Lates)</th>
                                </tr>
                            </thead>
                            <tbody id="criteriaTableBody">
                                <!-- Populated by JS -->
                            </tbody>
                        </table>
                    </div>
                    <div class="p-3 text-muted small bg-light border-top">
                        <i class="fas fa-info-circle me-1"></i> Below Grade C will automatically be marked as <strong class="text-danger">D</strong><br>
                        <i class="fas fa-lightbulb me-1 mt-1 text-warning"></i> <strong>Ratio</strong> = Total Income / Total Wage (e.g. 2.0 = earned twice their wage)<br>
                        <i class="fas fa-clock me-1 mt-1 text-primary"></i> <strong>Attendance (Attd)</strong> counts the total sum of Late + Absent days.
                    </div>
                </div>
                <div class="modal-footer border-top-0">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary btn-sm px-4" id="btnSaveCriteria">Save All Criteria</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Weightage Settings Modal -->
    <div class="modal fade" id="weightageModal" tabindex="-1" aria-labelledby="weightageModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%);">
                    <h5 class="modal-title fw-bold text-white mb-0 w-100" id="weightageModalLabel"><i class="fas fa-balance-scale opacity-75 me-2"></i> Team Weightage Settings</h5>
                    <button type="button" class="btn-close btn-close-white ms-auto" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    <p class="text-muted small mb-4">Set the percentage weight for each grading dimension. The total must equal 100%. This setting applies to the selected group.</p>
                    
                    <div class="mb-3">
                        <label class="form-label fw-bold text-secondary small">Department/Group</label>
                        <input type="text" class="form-control bg-light" id="weightageDepartment" readonly>
                    </div>
                    
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="form-label fw-bold text-secondary small"><i class="fas fa-coins text-warning me-1"></i> IPH (%)</label>
                            <input type="number" class="form-control weight-input" id="weightIph" min="0" max="100" value="25">
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-bold text-secondary small"><i class="fas fa-broom text-success me-1"></i> 5S (%)</label>
                            <input type="number" class="form-control weight-input" id="weight5s" min="0" max="100" value="25">
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-bold text-secondary small"><i class="fas fa-clock text-primary me-1"></i> Attendance (%)</label>
                            <input type="number" class="form-control weight-input" id="weightAtt" min="0" max="100" value="25">
                        </div>
                        <div class="col-6">
                            <label class="form-label fw-bold text-secondary small"><i class="fas fa-book-reader text-info me-1"></i> Learning (%)</label>
                            <input type="number" class="form-control weight-input" id="weightLrn" min="0" max="100" value="25">
                        </div>
                    </div>
                    
                    <div class="mt-4 p-3 rounded bg-light d-flex justify-content-between align-items-center">
                        <span class="fw-bold text-secondary">Total Weight:</span>
                        <h4 class="mb-0 fw-bold" id="weightTotalDisplay">100%</h4>
                    </div>
                </div>
                <div class="modal-footer border-top-0">
                    <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary btn-sm px-4" id="btnSaveWeightage">Save Weightage</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Executive Grading Formula & 3-Tier Criteria Guide Modal -->
    <div class="modal fade" id="gradingFormulaModal" tabindex="-1" aria-labelledby="gradingFormulaModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg overflow-hidden">
                <div class="modal-header border-0 py-3 px-4" style="background: linear-gradient(135deg, #1e293b 0%, #1e3a8a 60%, #2563eb 100%);">
                    <div class="d-flex align-items-center justify-content-between w-100">
                        <div>
                            <h5 class="modal-title fw-bold text-white mb-0" id="gradingFormulaModalLabel">
                                <i class="fas fa-calculator me-2 text-warning"></i>คู่มือสูตรการคำนวณและเกณฑ์การประเมินเกรดพนักงาน 4 มิติ (Executive Grading Guide)
                            </h5>
                            <div class="text-white opacity-75 small mt-1">
                                เอกสารอ้างอิงสำหรับผู้บริหารและผู้จัดการ (สิทธิ์เข้าถึงเฉพาะระดับ Admin / Manager ขึ้นไป)
                            </div>
                        </div>
                        <button type="button" class="btn-close btn-close-white ms-3" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                </div>

                <div class="modal-body p-4" style="background: #f8fafc;">
                    <div class="alert alert-warning border-warning d-flex align-items-center gap-3 mb-4 py-2 px-3 shadow-sm">
                        <i class="fas fa-user-shield fa-lg text-warning-emphasis"></i>
                        <div class="small text-dark">
                            <strong>ข้อมูลชั้นความลับสำหรับผู้บริหาร (Strictly Confidential):</strong>
                            ระบบการประเมินเกรด 4 มิติใช้ประกอบการพิจารณาปรับขึ้นเงินเดือนและโบนัสประจำปี จึงจำกัดสิทธิ์การเข้าชมเฉพาะผู้บริหารระดับ <strong>Admin / Manager / Creator</strong> เท่านั้น พนักงานทั่วไปจะไม่สามารถมองเห็นเกรดในหน้านี้หรือในพาสปอร์ตการเรียนรู้ได้
                        </div>
                    </div>

                    <div class="row g-3">
                        <div class="col-12 col-lg-6">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                    <span class="fw-bold text-primary"><i class="fas fa-coins me-2 text-warning"></i>1. มิติที่ 1: รายได้ต่อหัวเทียบค่าแรง (IPH Ratio)</span>
                                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle">ค่าเริ่มต้น 25%</span>
                                </div>
                                <div class="card-body small">
                                    <p class="text-secondary mb-2">วัดความคุ้มค่าของผลผลิตที่พนักงานสร้างได้เทียบกับต้นทุนค่าแรงจริง (DL + OT) ในช่วงเวลาที่เลือก:</p>
                                    <div class="p-2 rounded bg-light border font-monospace mb-2" style="font-size: 0.78rem;">
                                        <div><strong>1) รายได้ต่อหัว (Income):</strong> Σ [ สัดส่วนคน × จำนวนชิ้นงานที่ผลิต × (Cost_DL + Cost_OH) ]</div>
                                        <div class="mt-1"><strong>2) ต้นทุนค่าแรงรวม (Total Wage):</strong> ค่าแรงปกติ (DL) + ค่าล่วงเวลา (OT 1.5 เท่า)</div>
                                        <div class="mt-1 text-primary"><strong>3) สูตร IPH Ratio:</strong> <code>Ratio = Income / Total Wage</code> (จุดคุ้มทุน = 1.00x)</div>
                                    </div>
                                    <table class="table table-sm table-bordered text-center mb-1">
                                        <thead class="table-light">
                                            <tr>
                                                <th>เกรด A (ดีเยี่ยม)</th>
                                                <th>เกรด B (ดี)</th>
                                                <th>เกรด C (ผ่านเกณฑ์)</th>
                                                <th>เกรด D (ต่ำกว่าเกณฑ์)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="text-success fw-bold">Ratio ≥ 2.00x</td>
                                                <td class="text-primary fw-bold">1.50x – 1.99x</td>
                                                <td class="text-warning-emphasis fw-bold">1.00x – 1.49x</td>
                                                <td class="text-danger fw-bold">&lt; 1.00x</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div class="text-muted" style="font-size: 0.75rem;">* สามารถปรับเพดาน Ratio แยกตามแต่ละ Production Line ได้ที่ปุ่ม <i class="fas fa-cog"></i> Criteria Settings</div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 col-lg-6">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                    <span class="fw-bold text-success"><i class="fas fa-broom me-2"></i>2. มิติที่ 2: การตรวจประเมินพื้นที่ 5 ส (5S Audit)</span>
                                    <span class="badge bg-success-subtle text-success border border-success-subtle">ค่าเริ่มต้น 25%</span>
                                </div>
                                <div class="card-body small">
                                    <p class="text-secondary mb-2">ประเมินระเบียบวินัยและความปลอดภัยของสายการผลิต (Line) จากผลตรวจ 5 หมวด (หมวดละ 20 คะแนน):</p>
                                    <div class="p-2 rounded bg-light border font-monospace mb-2" style="font-size: 0.78rem;">
                                        <div><strong>สูตรคะแนน 5S (เต็ม 100):</strong> <code>S1 (สะสาง) + S2 (สะดวก) + S3 (สะอาด) + S4 (สุขลักษณะ) + S5 (สร้างนิสัย)</code></div>
                                        <div class="mt-1 text-success">ใช้ผลตรวจล่าสุดของ Production Line ในรอบเดือนนั้นเป็นเกรดประจำสายการผลิต</div>
                                    </div>
                                    <table class="table table-sm table-bordered text-center mb-1">
                                        <thead class="table-light">
                                            <tr>
                                                <th>เกรด A (ดีเยี่ยม)</th>
                                                <th>เกรด B (ดี)</th>
                                                <th>เกรด C (พอใช้)</th>
                                                <th>เกรด D (ต้องปรับปรุง)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="text-success fw-bold">85 – 100 คะแนน</td>
                                                <td class="text-primary fw-bold">70 – 84 คะแนน</td>
                                                <td class="text-warning-emphasis fw-bold">55 – 69 คะแนน</td>
                                                <td class="text-danger fw-bold">&lt; 55 คะแนน</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div class="text-muted" style="font-size: 0.75rem;">* บันทึกคะแนนและดูประวัติย้อนหลังได้ที่ปุ่ม <i class="fas fa-broom text-success"></i> 5S Audit บนแถบเครื่องมือ</div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 col-lg-5">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                    <span class="fw-bold text-info-emphasis"><i class="fas fa-clock me-2 text-primary"></i>3. มิติที่ 3: วินัยการมาทำงาน (Attendance)</span>
                                    <span class="badge bg-info-subtle text-info-emphasis border border-info-subtle">ค่าเริ่มต้น 25%</span>
                                </div>
                                <div class="card-body small">
                                    <p class="text-secondary mb-2">คำนวณจากบันทึกการลงเวลาจริงใน <code>MANPOWER_DAILY_LOGS</code>:</p>
                                    <div class="p-2 rounded bg-light border font-monospace mb-2" style="font-size: 0.78rem;">
                                        <strong>สูตรนับวันผิดวินัย:</strong><br>
                                        <code>Penalty Days = จำนวนวันมาสาย (LATE) + จำนวนวันขาดงาน (ABSENT)</code>
                                    </div>
                                    <table class="table table-sm table-bordered text-center mb-1">
                                        <thead class="table-light">
                                            <tr>
                                                <th>เกรด A</th>
                                                <th>เกรด B</th>
                                                <th>เกรด C</th>
                                                <th>เกรด D</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td class="text-success fw-bold">0 วัน</td>
                                                <td class="text-primary fw-bold">≤ 1 วัน</td>
                                                <td class="text-warning-emphasis fw-bold">2 – 3 วัน</td>
                                                <td class="text-danger fw-bold">&gt; 3 วัน</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div class="text-muted" style="font-size: 0.75rem;">* ปรับเกณฑ์จำนวนวันสาย/ขาดของแต่ละ Line ได้ที่ปุ่ม <i class="fas fa-cog"></i> Criteria Settings</div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12 col-lg-7">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-warning">
                                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                    <span class="fw-bold text-dark"><i class="fas fa-graduation-cap me-2 text-warning"></i>4. มิติที่ 4: ทักษะและการเรียนรู้ (เกณฑ์ 3 ระดับตามตำแหน่งงาน)</span>
                                    <span class="badge bg-warning-subtle text-dark border border-warning">Live Sync จาก Learning Hub</span>
                                </div>
                                <div class="card-body small">
                                    <p class="text-secondary mb-2">
                                        ซิงค์อัตโนมัติจากจำนวนหลักสูตรที่พนักงานสอบผ่านเกณฑ์ (Post-Test ≥ 80%) ใน <strong>MES Learning Hub</strong> และทักษะใน <code>EMP_SKILLS</code> (Level ≥ 2) โดย<strong>แบ่งเกณฑ์ตามระดับตำแหน่ง (3-Tier Criteria)</strong> เพื่อความเหมาะสมกับความรับผิดชอบ:
                                    </p>
                                    <div class="table-responsive">
                                        <table class="table table-sm table-bordered align-middle text-center mb-1">
                                            <thead class="table-light">
                                                <tr>
                                                    <th class="text-start">ระดับตำแหน่งงาน (Position Tier)</th>
                                                    <th class="text-success">เกรด A</th>
                                                    <th class="text-primary">เกรด B</th>
                                                    <th class="text-warning-emphasis">เกรด C</th>
                                                    <th class="text-danger">เกรด D</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td class="text-start">
                                                        <strong>Tier 1: ระดับปฏิบัติการทั่วไป</strong>
                                                        <div class="text-muted" style="font-size: 0.72rem;">พนักงาน, พนักงานสัญญาจ้าง, นักศึกษาฝึกงาน</div>
                                                    </td>
                                                    <td class="fw-bold text-success">≥ 3 ทักษะ</td>
                                                    <td class="fw-bold text-primary">2 ทักษะ</td>
                                                    <td class="fw-bold text-warning-emphasis">1 ทักษะ</td>
                                                    <td class="fw-bold text-danger">0 ทักษะ</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-start">
                                                        <strong>Tier 2: ระดับหัวหน้างาน &amp; เทคนิค</strong>
                                                        <div class="text-muted" style="font-size: 0.72rem;">หัวหน้าแผนก, Supervisor, ช่างเทคนิค, QC, Special List</div>
                                                    </td>
                                                    <td class="fw-bold text-success">≥ 5 ทักษะ</td>
                                                    <td class="fw-bold text-primary">3 – 4 ทักษะ</td>
                                                    <td class="fw-bold text-warning-emphasis">1 – 2 ทักษะ</td>
                                                    <td class="fw-bold text-danger">0 ทักษะ</td>
                                                </tr>
                                                <tr>
                                                    <td class="text-start">
                                                        <strong>Tier 3: ระดับบริหาร &amp; วิศวกร</strong>
                                                        <div class="text-muted" style="font-size: 0.72rem;">ผู้จัดการแผนก/ฝ่าย, Mini MD, วิศวกร, Admin</div>
                                                    </td>
                                                    <td class="fw-bold text-success">≥ 8 ทักษะ</td>
                                                    <td class="fw-bold text-primary">5 – 7 ทักษะ</td>
                                                    <td class="fw-bold text-warning-emphasis">2 – 4 ทักษะ</td>
                                                    <td class="fw-bold text-danger">0 – 1 ทักษะ</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-12">
                            <div class="card border-0 shadow-sm bg-white">
                                <div class="card-body p-3 small">
                                    <div class="row align-items-center g-3">
                                        <div class="col-12 col-lg-7">
                                            <h6 class="fw-bold text-dark mb-2">
                                                <i class="fas fa-award text-danger me-2"></i>5. สูตรการคำนวณเกรดรวม (Overall Grade — ระบบ GPA 4.0 ถ่วงน้ำหนัก)
                                            </h6>
                                            <p class="text-secondary mb-2">
                                                ระบบแปลงเกรดทั้ง 4 มิติเป็นแต้มคะแนน (<strong>A = 4.0</strong>, <strong>B = 3.0</strong>, <strong>C = 2.0</strong>, <strong>D = 1.0</strong>) แล้วคูณด้วยเปอร์เซ็นต์น้ำหนักของแต่ละมิติ (ปรับสัดส่วนได้ที่ปุ่ม <i class="fas fa-balance-scale"></i> Team Weightage Settings):
                                            </p>
                                            <div class="p-2 rounded bg-light border font-monospace text-dark">
                                                <code>Total GPA = [ (Score_IPH × W_IPH%) + (Score_5S × W_5S%) + (Score_Attd × W_Attd%) + (Score_Learn × W_Learn%) ] ÷ 100</code>
                                            </div>
                                        </div>
                                        <div class="col-12 col-lg-5">
                                            <table class="table table-sm table-bordered text-center mb-0">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th colspan="4">เกณฑ์ตัดสินเกรดรวม (Overall Grade)</th>
                                                    </tr>
                                                    <tr>
                                                        <th class="text-success">Grade A</th>
                                                        <th class="text-primary">Grade B</th>
                                                        <th class="text-warning-emphasis">Grade C</th>
                                                        <th class="text-danger">Grade D</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td class="fw-bold text-success">3.50 – 4.00</td>
                                                        <td class="fw-bold text-primary">2.50 – 3.49</td>
                                                        <td class="fw-bold text-warning-emphasis">1.50 – 2.49</td>
                                                        <td class="fw-bold text-danger">&lt; 1.50</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer py-2 px-4 border-top bg-white">
                    <span class="text-muted small me-auto">
                        <i class="fas fa-magic text-warning me-1"></i>กดปุ่ม <strong>Auto Grade</strong> บนแถบเครื่องมือเพื่อคำนวณและเติมเกรดทั้ง 4 มิติพร้อมเกรดรวมให้อัตโนมัติตามสูตรข้างต้น
                    </span>
                    <button type="button" class="btn btn-primary btn-sm rounded-pill px-4" data-bs-dismiss="modal">รับทราบ / ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/employeeGrading.js?v=<?php echo time(); ?>"></script>
</body>
</html>
