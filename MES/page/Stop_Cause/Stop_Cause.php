<?php 
    include_once("../../auth/check_auth.php"); 
    
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Production Events & Maintenance</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* ปรับแต่งสีแท็บให้เหมือนหน้าอื่นๆ */
        .nav-tabs .nav-link {
            color: var(--bs-primary); /* สีน้ำเงินสำหรับแท็บที่ไม่ได้เลือก */
            font-weight: 500;
        }
        
        .nav-tabs .nav-link:hover {
            color: var(--bs-primary-hover);
            border-color: transparent;
            background-color: rgba(var(--bs-primary-rgb), 0.05);
        }

        .nav-tabs .nav-link.active {
            color: var(--bs-body-color); /* สีดำ/เข้ม สำหรับแท็บที่เลือก */
            border-color: transparent;
            border-bottom: 3px solid var(--bs-primary);
            background-color: transparent;
            font-weight: bold;
        }
        
        /* CSS สำหรับปุ่ม FAB (Floating Action Button) บนมือถือ */
        @media (max-width: 991.98px) {
            .fab-container {
                position: fixed; 
                bottom: 25px; 
                right: 25px; 
                z-index: 1060;
            }
            .fab-btn {
                width: 60px; 
                height: 60px; 
                font-size: 1.5rem;
                border: none; 
                border-radius: 50%;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                display: flex; 
                align-items: center; 
                justify-content: center;
                cursor: pointer;
                transition: transform 0.2s, background-color 0.3s;
            }
            .fab-btn:active { 
                transform: scale(0.9); 
            }
            .content-wrapper {
                padding-bottom: 80px; 
            }
        }
    </style>
</head>

<body class="page-with-table">
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#globalMobileMenu" 
            aria-controls="globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0 fw-bold">Production Events</h2>
                </div>

                <ul class="nav nav-tabs" id="myTab" role="tablist">
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
            </div>

            <div class="content-wrapper">
                <div class="tab-content" id="myTabContent">
                    
                    <div class="tab-pane fade show active" id="maintenance-tab-pane" role="tabpanel">
                        <div class="sticky-bar">
                            <div class="row my-3 align-items-center">
                                <div class="col-md-8">
                                    <div class="filter-controls-wrapper">
                                        <select id="mtFilterStatus" class="form-select" style="max-width: 200px;" onchange="fetchMaintenanceData()">
                                            <option value="">All Status</option>
                                            <option value="Pending" selected>Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                        <button class="btn btn-light border" onclick="fetchMaintenanceData()" title="Refresh">
                                            <i class="fas fa-sync-alt text-secondary"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-md-4 text-end d-none d-lg-block">
                                    <button class="btn btn-warning text-dark" onclick="showBootstrapModal('addMaintenanceModal')">
                                        <i class="fas fa-plus-circle me-1"></i> Request Maintenance
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div class="table-responsive">
                            <table class="table table-striped table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th style="width: 10%;">Status</th>
                                        <th style="width: 15%;">Date/Time</th>
                                        <th style="width: 20%;">Line / Machine</th>
                                        <th style="width: 20%;">Issue</th>
                                        <th style="width: 10%;">Priority</th>
                                        <th style="width: 10%;">Requester</th>
                                        <th style="width: 15%;">Tech Note</th>
                                        <th class="text-end" style="width: 10%;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="maintenanceTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="stop-tab-pane" role="tabpanel">
                        <div class="sticky-bar">
                            <div class="row my-3 align-items-center">
                                <div class="col-lg-9">
                                    <div class="filter-controls-wrapper">
                                        <input list="causeListFilter" id="filterCause" class="form-control" placeholder="Cause" style="max-width: 180px;">
                                        <datalist id="causeListFilter"></datalist>
                                        
                                        <input list="lineListFilter" id="filterLine" class="form-control" placeholder="Line" style="max-width: 100px;">
                                        <datalist id="lineListFilter"></datalist>
                                        
                                        <input list="machineListFilter" id="filterMachine" class="form-control" placeholder="Machine" style="max-width: 150px;">
                                        <datalist id="machineListFilter"></datalist>
                                        
                                        <div class="d-flex align-items-center gap-1 bg-white border rounded px-2 py-1">
                                            <input type="date" id="filterStartDate" class="form-control border-0 p-1" style="max-width: 130px;">
                                            <span class="text-muted">-</span>
                                            <input type="date" id="filterEndDate" class="form-control border-0 p-1" style="max-width: 130px;">
                                        </div>
                                    </div>
                                </div>

                                <div class="col-lg-3 text-end d-none d-lg-block">
                                    <div class="d-flex justify-content-end gap-2">
                                        <button class="btn btn-primary" onclick="exportToExcel()">
                                            <i class="fas fa-file-export me-1"></i> Export
                                        </button>
                                        <?php if ($canManage): ?>
                                            <button class="btn btn-success" onclick="openAddStopModal()">
                                                <i class="fas fa-plus me-1"></i> Add Stop
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>
                            <div id="causeSummary" class="summary-grand-total py-2 border-top"></div>
                        </div>

                        <div class="table-responsive">
                            <table id="stopTable" class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Start</th>
                                        <th>End</th>
                                        <th>Duration</th>
                                        <th>Line</th>
                                        <th>Machine</th>
                                        <th>Cause</th>
                                        <th>Recoverer</th>
                                        <th>Note</th>
                                        <?php if ($canManage): ?><th>Actions</th><?php endif; ?>
                                    </tr>
                                </thead>
                                <tbody id="stopTableBody"></tbody>
                            </table>
                        </div>
                        <nav class="pagination-footer">
                            <ul class="pagination justify-content-center" id="paginationControls"></ul>
                        </nav>
                    </div>

                </div>
            </div>

            <div class="fab-container d-lg-none" id="mobileFabContainer" style="display: none;">
                <button class="fab-btn" id="mobileFabBtn">
                    <i class="fas fa-plus"></i>
                </button>
            </div>

            <?php 
                if ($canManage) {
                    include('components/addStopModal.php');
                    include('components/editStopModal.php');
                }
                include('components/addMaintenanceModal.php');
                include('components/completeMaintenanceModal.php');
                include('components/viewMaintenanceModal.php');
                include('../components/php/autoLogoutUI.php');
            ?>

            <script>
                const canManage = <?php echo json_encode($canManage); ?>;
                
                // ฟังก์ชันจัดการ FAB Button ตามแท็บที่เลือก
                function updateMobileFab(activeTabId) {
                    const fabContainer = document.getElementById('mobileFabContainer');
                    const fabBtn = document.getElementById('mobileFabBtn');
                    
                    if (!fabContainer || !fabBtn) return;

                    // Clone เพื่อลบ Event Listener เก่าออก
                    const newFabBtn = fabBtn.cloneNode(true);
                    fabBtn.parentNode.replaceChild(newFabBtn, fabBtn);

                    if (activeTabId === 'maintenance-tab') {
                        fabContainer.style.display = 'block';
                        newFabBtn.style.backgroundColor = '#ffc107'; // Warning Color
                        newFabBtn.style.color = '#212529'; // Dark Text
                        newFabBtn.innerHTML = '<i class="fas fa-tools"></i>';
                        newFabBtn.onclick = () => showBootstrapModal('addMaintenanceModal');
                        
                    } else if (activeTabId === 'stop-tab') {
                        if (canManage) {
                            fabContainer.style.display = 'block';
                            newFabBtn.style.backgroundColor = '#198754'; // Success Color
                            newFabBtn.style.color = '#fff'; // White Text
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
                    const startDateEl = document.getElementById("filterStartDate");
                    const endDateEl = document.getElementById("filterEndDate");
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0];

                    if (startDateEl) startDateEl.value = dateStr;
                    if (endDateEl) endDateEl.value = dateStr;

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
        </main>
    </div>
    
    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    

    <script src="script/paginationTable.js?v=<?php echo filemtime('script/paginationTable.js'); ?>"></script>
    <script src="script/export_data.js?v=<?php echo filemtime('script/export_data.js'); ?>"></script>
    <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
    <script src="script/maintenance_handler.js?v=<?php echo time(); ?>"></script>
    
</body>
</html>