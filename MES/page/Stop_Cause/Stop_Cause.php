<?php 
    // MES/page/Stop_Cause/Stop_Cause.php
    include_once("../../auth/check_auth.php"); 
    
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
    
    <style>
        /* [FIX 4] Mobile Tabs Scrolling */
        .nav-tabs {
            border-bottom: none;
            gap: 0.5rem;
            flex-wrap: nowrap; /* ห้ามขึ้นบรรทัดใหม่ */
            overflow-x: auto;  /* ให้เลื่อนแนวนอนได้ */
            overflow-y: hidden;
            white-space: nowrap;
            -webkit-overflow-scrolling: touch; /* ลื่นไหลบน iOS */
            padding-bottom: 5px; /* เผื่อที่ให้ Scrollbar นิดนึง */
            scrollbar-width: none; /* ซ่อน Scrollbar (Firefox) */
        }
        .nav-tabs::-webkit-scrollbar { display: none; } /* ซ่อน Scrollbar (Chrome/Safari) */

        .nav-tabs .nav-link {
            border: 1px solid transparent;
            border-radius: 0.5rem;
            color: var(--bs-secondary);
            font-weight: 500;
            padding: 0.5rem 1rem;
            transition: all 0.2s;
            background-color: rgba(var(--bs-secondary-bg-rgb), 0.5);
        }
        .nav-tabs .nav-link:hover {
            color: var(--bs-primary);
            background-color: var(--bs-secondary-bg);
        }
        .nav-tabs .nav-link.active {
            color: var(--bs-primary);
            background-color: var(--bs-body-bg);
            border-color: var(--bs-border-color);
            border-bottom-color: transparent; 
            box-shadow: 0 -2px 5px rgba(0,0,0,0.02);
            font-weight: bold;
        }
        .nav-link i { font-size: 0.9rem; }

        .note-truncate {
            max-width: 150px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* [FIX] ปรับ Spinner ให้ลอยเหนือ Modal */
        #loadingOverlay {
            display: none; 
            position: fixed; /* เปลี่ยนกลับเป็น fixed เพื่อให้ครอบทั้งจอรวมถึง Modal */
            top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(255,255,255,0.7); /* พื้นหลังโปร่งแสง เห็นเนื้อหาเดิมจางๆ ไม่กระพริบหาย */
            z-index: 9999; /* [สำคัญ] ต้องสูงกว่า 1060 เพื่อให้ลอยเหนือ Modal */
            align-items: center; justify-content: center;
            backdrop-filter: blur(1px); /* เบลอฉากหลังนิดหน่อยให้รู้ว่าโหลด */
        }
        /* ต้องให้ Parent ของ Overlay มี position relative */
        #main-content { position: relative; }

        @media (max-width: 991.98px) {
            .fab-container {
                position: fixed; bottom: 25px; right: 25px; z-index: 1060;
            }
            .fab-btn {
                width: 56px; height: 56px;
                font-size: 1.2rem; border: none; border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                transition: transform 0.2s;
            }
            .fab-btn:active { transform: scale(0.95); }
            .table-responsive { font-size: 0.85rem; }
        }
    </style>
</head>

<body class="dashboard-page layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        
        <div id="loadingOverlay">
            <div class="spinner-border text-primary" role="status"></div>
        </div>

        <div class="container-fluid p-3" style="max-width: 1600px;">

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
                                <div class="col-md-8 d-flex flex-wrap align-items-center gap-2">
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

                                    <button class="btn btn-sm btn-light border shadow-sm" onclick="fetchMaintenanceData()" title="Refresh">
                                        <i class="fas fa-sync-alt text-secondary"></i>
                                    </button>
                                </div>
                                <div class="col-md-4 text-end d-none d-lg-block">
                                    <button class="btn btn-sm btn-warning text-dark fw-bold shadow-sm px-3" onclick="showBootstrapModal('addMaintenanceModal')">
                                        <i class="fas fa-plus-circle me-1"></i> Request Maintenance
                                    </button>
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
                                            <th class="ps-3" style="width: 10%;">Status</th>
                                            <th style="width: 15%;">Date/Time</th>
                                            <th style="width: 20%;">Line / Machine</th>
                                            <th style="width: 20%;">Issue</th>
                                            <th style="width: 8%;">Priority</th>
                                            <th style="width: 10%;">Requester</th>
                                            <th>Tech Note</th> 
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
            include('components/addStopModal.php');
            include('components/editStopModal.php');
        }
        include('components/addMaintenanceModal.php');
        include('components/completeMaintenanceModal.php');
        include('components/viewMaintenanceModal.php');
    ?>
    
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script src="script/paginationTable.js?v=<?php echo filemtime('script/paginationTable.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>"></script>
    <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
    <script src="script/maintenance_handler.js?v=<?php echo time(); ?>"></script>
    
    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        
        // [FIX 6] Override Spinner Functions ให้ใช้ Overlay ภายใน Main Content
        function showSpinner() { 
            const el = document.getElementById('loadingOverlay');
            if(el) el.style.display = 'flex'; 
        }
        function hideSpinner() { 
            const el = document.getElementById('loadingOverlay');
            if(el) el.style.display = 'none'; 
        }

        // FAB Logic
        function updateMobileFab(activeTabId) {
            const fabContainer = document.getElementById('mobileFabContainer');
            const fabBtn = document.getElementById('mobileFabBtn');
            if (!fabContainer || !fabBtn) return;
            
            // Clone node to reset listeners
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
            // Init Date Filters
            const startDateEl = document.getElementById("filterStartDate");
            const endDateEl = document.getElementById("filterEndDate");
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            if (startDateEl && !startDateEl.value) startDateEl.value = dateStr;
            if (endDateEl && !endDateEl.value) endDateEl.value = dateStr;

            // Init Data
            if (typeof fetchMaintenanceData === 'function') fetchMaintenanceData();
            if (typeof fetchStopData === 'function') fetchStopData(1);

            // Tab Change Listener
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