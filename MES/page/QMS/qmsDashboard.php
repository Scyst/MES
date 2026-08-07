<?php
// page/QMS/qmsDashboard.php
require_once __DIR__ . '/../components/init.php';
requirePermission('view_qms');

$pageTitle = "iQMS Dashboard";
$pageHeaderTitle = "iQMS Dashboard";
$pageHeaderSubtitle = "ระบบจัดการคุณภาพ NCR / CAR / Claim";
// เปลี่ยนไอคอนเป็นตัวที่รองรับใน Free Version
$pageIcon = "fas fa-shield-alt"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/qmsDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header bg-body-tertiary">
    
    <?php include_once '../components/php/top_header.php'; ?>
    <div class="page-container">
        <main id="main-content">
            
            <div id="loadingOverlay">
                <div class="spinner-border text-primary" role="status"></div>
            </div>

            <!-- Sub Navbar for QMS Modules (Compact) -->
            <div class="bg-white border-bottom shadow-sm mb-1">
                <div class="container-fluid px-3 pt-2 d-flex justify-content-between align-items-center">
                    <ul class="nav nav-tabs border-0 qms-subnav" id="qmsTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active fw-bold border-0" id="cases-tab" data-bs-toggle="tab" data-bs-target="#cases" type="button" role="tab">
                                <i class="fas fa-list-alt me-1 text-primary"></i> NCR / CAR
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold border-0" id="concession-tab" data-bs-toggle="tab" data-bs-target="#concession" type="button" role="tab">
                                <i class="fas fa-file-signature me-1 text-primary"></i> Concession
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold border-0" id="qa_planner-tab" data-bs-toggle="tab" data-bs-target="#qa_planner" type="button" role="tab">
                                <i class="fas fa-calendar-check me-1 text-primary"></i> QA/QC Planner
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link fw-bold border-0" id="schedule-tab" data-bs-toggle="tab" data-bs-target="#schedule" type="button" role="tab">
                                <i class="fas fa-calendar-alt me-1 text-primary"></i> QA/QC Schedule
                            </button>
                        </li>
                    </ul>
                </div>
            </div>

            <div class="content-wrapper container-fluid p-3 pt-2">
                <div class="tab-content" id="qmsTabsContent">
                    <!-- Tab 1: NCR / CAR Cases -->
                    <div class="tab-pane fade show active" id="cases" role="tabpanel">
                        <div class="mobile-swipe-row mb-3">
                            <div class="swipe-card-wrapper">
                                <div class="kpi-card active p-3 h-100" id="card-all" onclick="setFilter('ALL')">
                                    <div class="text-secondary fw-bold small text-uppercase mb-1"><i class="fas fa-clipboard-list me-1"></i> Total</div>
                                    <h3 class="mb-0 fw-bold text-dark" id="stat-total">0</h3>
                                </div>
                            </div>
                            <div class="swipe-card-wrapper">
                                <div class="kpi-card p-3 h-100" id="card-ncr" onclick="setFilter('NCR_CREATED')">
                                    <div class="text-danger fw-bold small text-uppercase mb-1"><i class="fas fa-exclamation-circle me-1"></i> New NCR</div>
                                    <h3 class="mb-0 fw-bold text-dark" id="stat-ncr">0</h3>
                                </div>
                            </div>
                            <div class="swipe-card-wrapper">
                                <div class="kpi-card p-3 h-100" id="card-sent" onclick="setFilter('SENT_TO_CUSTOMER')">
                                    <div class="text-warning text-dark fw-bold small text-uppercase mb-1"><i class="fas fa-paper-plane me-1"></i> Wait CAR</div>
                                    <h3 class="mb-0 fw-bold text-dark" id="stat-car">0</h3>
                                </div>
                            </div>
                            <div class="swipe-card-wrapper">
                                <div class="kpi-card p-3 h-100" id="card-replied" onclick="setFilter('CUSTOMER_REPLIED')">
                                    <div class="text-info text-dark fw-bold small text-uppercase mb-1"><i class="fas fa-reply-all me-1"></i> Replied</div>
                                    <h3 class="mb-0 fw-bold text-dark" id="stat-reply">0</h3>
                                </div>
                            </div>
                            <div class="swipe-card-wrapper">
                                <div class="kpi-card p-3 h-100" id="card-closed" onclick="setFilter('CLOSED')">
                                    <div class="text-success fw-bold small text-uppercase mb-1"><i class="fas fa-check-circle me-1"></i> Closed</div>
                                    <h3 class="mb-0 fw-bold text-dark" id="stat-closed">0</h3>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                            <div class="input-group shadow-sm" style="max-width: 400px; border-radius: 6px; overflow: hidden; flex: 1; min-width: 250px;">
                                <span class="input-group-text bg-white border-0"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" id="searchInput" class="form-control border-0 bg-white" placeholder="ค้นหา CAR No, ลูกค้า, สินค้า..." style="font-size: 0.95rem;">
                            </div>
                            <div class="d-flex gap-2">
                                <div class="dropdown d-none d-lg-block">
                                    <button class="btn btn-sm btn-outline-secondary fw-bold shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" title="Print Blank">
                                        <i class="fas fa-print me-1"></i> Print Blank
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow" style="z-index: 1050;">
                                        <li><a class="dropdown-item fw-bold text-secondary" href="print_ncr.php?mode=blank" target="_blank"><i class="fas fa-file-alt me-2 text-danger"></i> Blank NCR</a></li>
                                        <li><a class="dropdown-item fw-bold text-secondary" href="print_car.php?mode=blank" target="_blank"><i class="fas fa-file-signature me-2 text-warning"></i> Blank CAR</a></li>
                                        <li><a class="dropdown-item fw-bold text-secondary" href="print_claim.php?mode=blank" target="_blank"><i class="fas fa-clipboard-check me-2 text-success"></i> Blank Claim</a></li>
                                    </ul>
                                </div>
                                <button class="btn btn-sm btn-primary fw-bold shadow-sm d-none d-lg-block" onclick="openNCRModal()">
                                    <i class="fas fa-plus-circle me-1"></i> New NCR
                                </button>
                            </div>
                        </div>

                <div class="card table-card shadow-sm border-0 desktop-view">
                    <div class="table-responsive-custom">
                        <table class="table table-hover align-middle mb-0" id="caseTable">
                            <thead class="sticky-top">
                                <tr>
                                    <th class="text-center" style="width: 130px;">CAR No.</th>
                                    <th class="text-center" style="width: 100px;">Date</th>
                                    <th class="text-start">Customer / Product</th>
                                    <th class="text-start">Defect Details</th>
                                    <th class="text-center" style="width: 160px;">Status</th>
                                    <th class="text-center" style="width: 150px;">Issuer</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="mobile-view" id="mobileCaseContainer"></div>

                    </div> <!-- End cases tab -->

                    <!-- Tab 2: QA/QC Schedule -->
                    <div class="tab-pane fade" id="schedule" role="tabpanel">
                        <?php include_once './components/qa_schedule.php'; ?>
                    </div>

                    <!-- Tab 3: Concession Request -->
                    <div class="tab-pane fade" id="concession" role="tabpanel">
                        <?php include_once './components/concession_list.php'; ?>
                    </div>

                    <!-- Tab 4: QA/QC Planner -->
                    <div class="tab-pane fade" id="qa_planner" role="tabpanel" style="height: calc(100vh - 170px);">
                        <?php include_once './components/qa_calendar.php'; ?>
                    </div>
                </div> <!-- End tab-content -->

            </div>
        </main>
    </div>

    <div class="fab-container d-lg-none" onclick="openNCRModal()">
        <button class="fab-btn bg-danger text-white shadow"><i class="fas fa-plus"></i></button>
    </div>

    <?php include_once './components/ncrFormModal.php'; ?>
    <?php include_once './components/caseDetailOffcanvas.php'; ?>
    <?php include_once './components/qa_schedule_modals.php'; ?>

    <script src="../../utils/libs/fullcalendar.global.min.js"></script>
    <script src="./script/qms_core.js?v=<?php echo time(); ?>"></script>
    <?php include_once './components/qa_schedule_script.php'; ?>
    <?php include_once './components/concession_script.php'; ?>
    
    <script>
        // ผูก overlay เข้ากับการโหลดข้อมูลเดิมที่มีอยู่
        const originalFetchCases = fetchCasesData;
        fetchCasesData = function() {
            document.getElementById('loadingOverlay').style.display = 'flex';
            originalFetchCases();
            setTimeout(() => { document.getElementById('loadingOverlay').style.display = 'none'; }, 600); // ซ่อนหลังจากเรียก API เสร็จ (เผื่อเวลา Render นิดนึง)
        };
    </script>
</body>
</html>