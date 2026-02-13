<?php 
    require_once __DIR__ . '/../components/init.php';
    
    if (!hasRole(['operator', 'supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);

    $pageTitle = "Production Events";
    $pageIcon = "fas fa-tools"; 
    $pageHeaderTitle = "Production Events & Maintenance";
    $pageHeaderSubtitle = "บันทึกการหยุดเครื่องจักรและแจ้งซ่อม";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    
    <link rel="stylesheet" href="css/stopCause.css?v=<?php echo filemtime(__DIR__ . '/css/stopCause.css'); ?>">
</head>

<body class="dashboard-page layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        
        <div id="loadingOverlay">
            <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div class="container-fluid p-3">

            <ul class="nav nav-tabs mb-3" id="myTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="maintenance-tab" data-bs-toggle="tab" data-bs-target="#maintenance-tab-pane" type="button" role="tab">
                        <i class="fas fa-tools me-2"></i>Maintenance Requests
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="stop-tab" data-bs-toggle="tab" data-bs-target="#stop-tab-pane" type="button" role="tab">
                        <i class="fas fa-ban me-2"></i>Stop Causes History
                    </button>
                </li>
            </ul>

            <div class="tab-content" id="myTabContent">
                
                <div class="tab-pane fade show active" id="maintenance-tab-pane" role="tabpanel">
                    
                    <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                        <div class="card-body py-3">
                            <div class="row align-items-center g-2">
                                <div class="col-md-7 d-flex flex-wrap align-items-center gap-2">
                                    <label class="small fw-bold text-muted me-1">Status:</label>
                                    <select id="mtFilterStatus" class="form-select form-select-sm fw-bold border-primary text-primary" style="max-width: 200px;" onchange="fetchMaintenanceData()">
                                        <option value="Active" selected>Pending + In Progress</option>
                                        <option value="">All Status</option>
                                        <option value="Pending">Pending Only</option>
                                        <option value="In Progress">In Progress Only</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                    
                                    <div class="vr mx-2 d-none d-md-block"></div>
                                    
                                    <input list="lineListFilter" id="filterLineMt" class="form-control form-control-sm" placeholder="Filter Line..." style="max-width: 120px;" onchange="fetchMaintenanceData()">

                                    <div class="d-flex align-items-center gap-1 bg-white border rounded px-2" style="height: 31px;">
                                        <input type="date" id="mtStartDate" class="form-control form-control-sm border-0 p-0" style="max-width: 110px;" onchange="fetchMaintenanceData()">
                                        <span class="text-muted small">-</span>
                                        <input type="date" id="mtEndDate" class="form-control form-control-sm border-0 p-0" style="max-width: 110px;" onchange="fetchMaintenanceData()">
                                    </div>

                                    <button class="btn btn-sm btn-light border shadow-sm" onclick="fetchMaintenanceData()" title="Refresh">
                                        <i class="fas fa-sync-alt text-secondary"></i>
                                    </button>
                                </div>
                                <div class="col-md-5 text-end d-none d-lg-block">
                                    <button class="btn btn-sm btn-outline-success fw-bold shadow-sm px-3 me-1" onclick="exportMaintenanceExcel()">
                                        <i class="fas fa-file-excel me-1"></i> Export
                                    </button>
                                    
                                    <button class="btn btn-sm btn-outline-info fw-bold shadow-sm px-3 me-1" onclick="showBootstrapModal('maintenanceAnalysisModal')">
                                        <i class="fas fa-chart-pie me-1"></i> Dashboard
                                    </button>

                                    <button class="btn btn-sm btn-warning text-dark fw-bold shadow-sm px-3" onclick="showBootstrapModal('addMaintenanceModal')">
                                        <i class="fas fa-plus-circle me-1"></i> Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="mtSummaryPanel" class="row g-3 mb-3">
                        <div class="col-md-3 col-6">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-primary">
                                <div class="card-body py-3">
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div class="text-muted small fw-bold text-uppercase">Total Requests</div>
                                            <div class="h3 mb-0 fw-bold text-primary" id="sumTotal">0</div>
                                        </div>
                                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                            <i class="fas fa-clipboard-list"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3 col-6">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-success">
                                <div class="card-body py-3">
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div class="text-muted small fw-bold text-uppercase">Completed</div>
                                            <div class="h3 mb-0 fw-bold text-success" id="sumCompleted">0</div>
                                        </div>
                                        <div class="bg-success bg-opacity-10 text-success rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                            <i class="fas fa-check"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3 col-6">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-warning">
                                <div class="card-body py-3">
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div class="text-muted small fw-bold text-uppercase">Pending / WIP</div>
                                            <div class="h3 mb-0 fw-bold text-warning" id="sumPending">0</div>
                                        </div>
                                        <div class="bg-warning bg-opacity-10 text-warning rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                            <i class="fas fa-clock"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-3 col-6">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-info">
                                <div class="card-body py-3">
                                    <div class="d-flex align-items-center justify-content-between">
                                        <div>
                                            <div class="text-muted small fw-bold text-uppercase">Avg Repair Time</div>
                                            <div class="h4 mb-0 fw-bold text-info" id="sumAvgTime">0 <span class="fs-6 text-muted">min</span></div>
                                        </div>
                                        <div class="bg-info bg-opacity-10 text-info rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                            <i class="fas fa-stopwatch"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0"><i class="fas fa-list-alt me-2"></i>Request List</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="min-height: 300px;">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="bg-light">
                                        <tr class="text-muted small text-uppercase">
                                            <th class="ps-3 text-center" style="width: 10%;">Status</th>
                                            <th class="text-center" style="width: 10%;">Date/Time</th>
                                            <th class="text-center" style="width: 10%;">Line / Machine</th>
                                            <th class="text-center" style="width: 10%;">Priority</th>
                                            <th class="text-center" style="width: 10%;">Requester</th>
                                            <th class="text-center" style="width: 25%;">Issue</th>
                                            <th class="text-center" style="width: 25%;">Tech Note</th> 
                                        </tr>
                                    </thead>
                                    <tbody id="maintenanceTableBody" class="border-top-0"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="tab-pane fade" id="stop-tab-pane" role="tabpanel">
                    <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                        <div class="card-body py-3">
                            <div class="row g-2 align-items-end">
                                <div class="col-12 col-md-10">
                                    <div class="d-flex flex-wrap gap-2 align-items-center">
                                        <div style="min-width: 140px; flex-grow:1;">
                                            <input list="causeListFilter" id="filterCause" class="form-control form-control-sm" placeholder="Cause...">
                                            <datalist id="causeListFilter"></datalist>
                                        </div>
                                        <div style="min-width: 80px; width: 100px;">
                                            <input list="lineListFilter" id="filterLine" class="form-control form-control-sm text-center" placeholder="Line">
                                            <datalist id="lineListFilter"></datalist>
                                        </div>
                                        <div style="min-width: 120px; flex-grow:1;">
                                            <input list="machineListFilter" id="filterMachine" class="form-control form-control-sm" placeholder="Machine...">
                                            <datalist id="machineListFilter"></datalist>
                                        </div>
                                        <div class="d-flex align-items-center gap-1 bg-white border rounded px-2" style="height: 31px;">
                                            <input type="date" id="filterStartDate" class="form-control form-control-sm border-0 p-0" style="max-width: 110px;">
                                            <span class="text-muted small">-</span>
                                            <input type="date" id="filterEndDate" class="form-control form-control-sm border-0 p-0" style="max-width: 110px;">
                                        </div>
                                    </div>
                                </div>
                                <div class="col-12 col-md-2 text-end d-none d-lg-block">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button class="btn btn-sm btn-outline-primary fw-bold" onclick="exportToExcel()">
                                            <i class="fas fa-file-export"></i>
                                        </button>
                                        <?php if ($canManage): ?>
                                            <button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="openAddStopModal()">
                                                <i class="fas fa-plus me-1"></i> Add Stop
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                            <div id="causeSummary" class="mt-2 pt-2 border-top text-muted small"></div>
                        </div>
                    </div>

                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-transparent border-0 pt-3 pb-2">
                            <h6 class="fw-bold mb-0"><i class="fas fa-history me-2"></i>Stop History</h6>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive" style="min-height: 300px;">
                                <table id="stopTable" class="table table-hover align-middle mb-0">
                                    <thead class="bg-light sticky-top" style="top: 0; z-index: 5;">
                                        <tr class="text-muted small text-uppercase">
                                            <th class="ps-3">Date</th>
                                            <th>Start</th>
                                            <th>End</th>
                                            <th>Duration</th>
                                            <th>Line</th>
                                            <th>Machine</th>
                                            <th>Cause</th>
                                            <th>Recoverer</th>
                                            <th>Note</th>
                                            <?php if ($canManage): ?><th class="text-end pe-3">Actions</th><?php endif; ?>
                                        </tr>
                                    </thead>
                                    <tbody id="stopTableBody" class="border-top-0"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="card-footer bg-white border-top py-2">
                            <nav>
                                <ul class="pagination pagination-sm justify-content-end mb-0" id="paginationControls"></ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <div class="fab-container d-lg-none" id="mobileFabContainer" style="display: none;">
        <button class="fab-btn text-white" id="mobileFabBtn"><i class="fas fa-plus"></i></button>
    </div>

    <?php 
        if ($canManage) {
            include('components/stop_cause_modals.php'); 
        }
        include('components/maintenance_modals.php'); 
        include('components/maintenance_analysis_modal.php');
    ?>
    
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/paginationTable.js?v=<?php echo filemtime('script/paginationTable.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>"></script>
    <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
    <script src="script/maintenance_handler.js?v=<?php echo time(); ?>"></script>
    <script src="script/maintenance_analysis.js?v=<?php echo time(); ?>"></script> <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        
        function showSpinner() { 
            const el = document.getElementById('loadingOverlay');
            if(el) el.style.display = 'flex'; 
        }
        function hideSpinner() { 
            const el = document.getElementById('loadingOverlay');
            if(el) el.style.display = 'none'; 
        }

        function updateMobileFab(activeTabId) {
            const fabContainer = document.getElementById('mobileFabContainer');
            const fabBtn = document.getElementById('mobileFabBtn');
            if (!fabContainer || !fabBtn) return;
            
            const newFabBtn = fabBtn.cloneNode(true);
            fabBtn.parentNode.replaceChild(newFabBtn, fabBtn);

            if (activeTabId === 'maintenance-tab') {
                fabContainer.style.display = 'block';
                newFabBtn.style.backgroundColor = '#ffc107'; 
                newFabBtn.style.color = '#212529'; 
                newFabBtn.innerHTML = '<i class="fas fa-tools"></i>';
                newFabBtn.onclick = () => showBootstrapModal('addMaintenanceModal');
            } else if (activeTabId === 'stop-tab') {
                if (canManage) {
                    fabContainer.style.display = 'block';
                    newFabBtn.style.backgroundColor = '#198754'; 
                    newFabBtn.style.color = '#fff';
                    newFabBtn.innerHTML = '<i class="fas fa-plus"></i>';
                    newFabBtn.onclick = () => openAddStopModal();
                } else {
                    fabContainer.style.display = 'none';
                }
            } else {
                fabContainer.style.display = 'none';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            
            const todayStr = `${year}-${month}-${day}`;     // วันนี้
            const firstDayStr = `${year}-${month}-01`;      // วันที่ 1 ของเดือน

            // --- 1. Filter ของ Stop Cause (อันนี้แล้วแต่คุณว่าอยากได้แบบไหน ถ้าเอาเหมือนกันก็แก้ตามนี้) ---
            const startDateEl = document.getElementById("filterStartDate");
            const endDateEl = document.getElementById("filterEndDate");
            if (startDateEl && !startDateEl.value) startDateEl.value = todayStr; // หรือ firstDayStr ถ้าต้องการ
            if (endDateEl && !endDateEl.value) endDateEl.value = todayStr;

            // --- 2. [FIXED] Filter ของ Maintenance (ตั้งเป็น วันที่ 1 - วันนี้) ---
            const mtStartEl = document.getElementById("mtStartDate");
            const mtEndEl = document.getElementById("mtEndDate");
            
            // ถ้ายังไม่มีค่า ให้ใส่ค่า Default
            if (mtStartEl && !mtStartEl.value) mtStartEl.value = firstDayStr; // <--- แก้เป็นวันที่ 1
            if (mtEndEl && !mtEndEl.value) mtEndEl.value = todayStr;          // <--- ถึงวันนี้

            // Load Data
            if (typeof fetchMaintenanceData === 'function') fetchMaintenanceData();
            if (typeof fetchStopData === 'function') fetchStopData(1);

            const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
            tabEls.forEach(tab => {
                tab.addEventListener('shown.bs.tab', event => {
                    updateMobileFab(event.target.id);
                });
            });
            const activeTab = document.querySelector('.nav-link.active');
            if (activeTab) updateMobileFab(activeTab.id);
        });
    </script>
</body>
</html>