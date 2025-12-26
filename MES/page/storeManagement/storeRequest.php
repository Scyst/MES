<?php
// MES/page/storeManagement/storeRequest.php
require_once __DIR__ . '/../components/init.php';

if (!isset($_SESSION['user'])) { header("Location: ../../auth/login_form.php"); exit; }

$userRole = $_SESSION['user']['role'];
$isStore = in_array($userRole, ['admin', 'creator']); 

// 1. [CONFIG] กำหนดตัวแปร Header ตรงนี้ เพื่อให้ Top Header ดึงไปแสดง
$pageTitle = "Scrap & Replacement"; 
$pageIcon = "fas fa-sync-alt"; // ไอคอนที่จะโชว์คู่กับชื่อหน้าด้านบน
$pageHeaderTitle = "Scrap & Replacement"; 
$pageHeaderSubtitle = "ระบบเบิกทดแทนของเสีย (Scrap Claim)"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/storeRequest.css?v=<?php echo time(); ?>">
</head>

<body class="layout-top-header">

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <h5 class="fw-bold text-muted">Processing...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            
            <div class="dashboard-header-sticky">
                
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-body p-2">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">

                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 300px;">
                                    <span class="input-group-text bg-white border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                    <input type="text" id="filterSearch" class="form-control border-start-0 ps-0" placeholder="Search Part No, SAP...">
                                </div>
                                
                                <select id="filterStatus" class="form-select form-select-sm" style="max-width: 150px;" onchange="loadRequests()">
                                    <option value="ALL">Status: All</option>
                                    <option value="PENDING">Status: Pending</option>
                                    <option value="COMPLETED">Status: Completed</option>
                                    <option value="REJECTED">Status: Rejected</option>
                                </select>
                            </div>

                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-light border text-secondary btn-sm d-none d-md-inline-block" onclick="loadRequests()" data-bs-toggle="tooltip" title="Refresh">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                                
                                <button class="btn btn-success btn-sm fw-bold px-3 shadow-sm d-none d-md-inline-block" onclick="openRequestModal()">
                                    <i class="fas fa-plus-circle me-1"></i> แจ้งของเสีย / เบิก
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper p-3">
                <div class="card shadow-sm border-0 d-none d-md-block">
                    <div class="table-responsive-custom">
                        <table class="table table-striped table-hover align-middle mb-0">
                            <thead class="sticky-top bg-light shadow-sm">
                                <tr class="text-secondary small text-uppercase">
                                    <th style="width: 10%">Date</th>
                                    <th style="width: 10%">SAP No.</th>
                                    <th style="width: 12%">Part No.</th>
                                    <th style="width: 20%">Description</th>
                                    <th class="text-center" style="width: 8%">Qty</th>
                                    <th style="width: 15%">Reason</th>
                                    <th class="text-center" style="width: 12%">Requester</th>
                                    <th class="text-center" style="width: 8%">Status</th>
                                    <th class="text-center" style="width: 5%">Action</th>
                                </tr>
                            </thead>
                            <tbody id="reqTableBody"></tbody>
                        </table>
                    </div>
                </div>

                <div class="d-md-none" id="reqCardContainer"></div>
            </div>
        </div>
    </div>

    <div class="fab-container d-md-none">
        <button class="fab-btn" onclick="openRequestModal()">
            <i class="fas fa-plus"></i>
        </button>
    </div>

    <?php include 'components/requestModal.php'; ?>
    
    <div id="toast" class="toast-container position-fixed bottom-0 end-0 p-3" style="z-index: 1100;">
        <div id="liveToast" class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body" id="toastMessage">Action successful</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'api/scrapManage.php'; 
        const IS_STORE_ROLE = <?php echo json_encode($isStore); ?>;
        
        function showToast(msg, color) {
            const toastEl = document.getElementById('liveToast');
            const toastBody = document.getElementById('toastMessage');
            if(toastEl && toastBody) {
                toastBody.innerText = msg;
                toastEl.className = `toast align-items-center text-white border-0 bg-${color === 'var(--bs-danger)' ? 'danger' : (color === 'var(--bs-warning)' ? 'warning' : 'success')}`;
                const toast = new bootstrap.Toast(toastEl);
                toast.show();
            }
        }
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
    </script>
    <script src="script/storeRequest.js?v=<?php echo time(); ?>"></script>
</body>
</html>