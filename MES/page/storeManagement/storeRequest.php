<?php
// MES/page/storeManagement/storeRequest.php
require_once __DIR__ . '/../components/init.php';

if (!isset($_SESSION['user'])) { header("Location: ../../auth/login_form.php"); exit; }

$userRole = $_SESSION['user']['role'];
$isStore = in_array($userRole, ['admin', 'creator']); 

$pageTitle = "Scrap & Replacement"; 
$pageIcon = "fas fa-sync-alt"; 
$pageHeaderTitle = "Scrap & Replacement"; 
$pageHeaderSubtitle = "ระบบเบิกทดแทนของเสีย (Scrap Claim)"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/storeRequest.css?v=<?php echo filemtime(__DIR__ . '/css/storeRequest.css'); ?>">
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
                <div class="card border-0 shadow-sm mb-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 300px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="filterSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search SAP, Part, Req ID...">
                                </div>
                                
                                <div class="input-group input-group-sm d-none d-md-flex" style="max-width: 180px;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">Status:</span>
                                    <select class="form-select border-secondary-subtle" id="filterStatus">
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING" <?php echo $isStore ? 'selected' : ''; ?>>Pending</option>
                                        <option value="COMPLETED">Completed</option>
                                        <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>

                                <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" 
                                        onclick="loadRequests()" title="Refresh Data" style="width: 32px; height: 32px;"> 
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                
                                <div class="input-group input-group-sm shadow-sm" style="width: auto;">
                                    <span class="input-group-text bg-white border-secondary-subtle text-secondary small">Range:</span>
                                    <input type="date" id="filterStartDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-01'); ?>">
                                    <span class="input-group-text bg-white border-secondary-subtle border-start-0 border-end-0">-</span>
                                    <input type="date" id="filterEndDate" class="form-control border-secondary-subtle" value="<?php echo date('Y-m-d'); ?>">
                                </div>

                                <div class="d-none d-xl-flex align-items-center border border-secondary-subtle rounded px-3 py-0 bg-body shadow-sm h-100" style="min-height: 31px;">
                                    <span class="badge bg-dark me-2" id="sumCount">
                                        <div class="spinner-border spinner-border-sm text-light" style="width:10px; height:10px;"></div>
                                    </span> 
                                    <span class="small text-muted fw-bold me-3">Items</span>
                                    
                                    <span class="badge bg-danger text-white me-2" id="sumQty">
                                        <div class="spinner-border spinner-border-sm text-light" style="width:10px; height:10px;"></div>
                                    </span> 
                                    <span class="small text-muted fw-bold me-3">Pcs</span>
                                    
                                    <div class="vr me-3 opacity-25"></div>
                                    <span class="fw-bold text-success font-monospace" id="sumCost">0.00</span>
                                    <span class="small text-muted ms-1">฿</span>
                                </div>

                                <button class="btn btn-light btn-sm border-secondary-subtle shadow-sm" onclick="exportData()" title="Export to Excel">
                                    <i class="fas fa-file-excel text-success me-1"></i> Export
                                </button>

                                <button class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" onclick="openRequestModal()">
                                    <i class="fas fa-plus me-1"></i> New Request
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
                                    <th style="width: 18%">Description</th>
                                    <th class="text-center" style="width: 8%">Qty</th>
                                    <th class="text-end" style="width: 10%">Est. Cost</th>
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
                const colorMap = {
                    'var(--bs-danger)': 'bg-danger',
                    'var(--bs-warning)': 'bg-warning',
                    'var(--bs-success)': 'bg-success'
                };
                toastEl.className = `toast align-items-center text-white border-0 ${colorMap[color] || 'bg-primary'}`;
                const toast = new bootstrap.Toast(toastEl);
                toast.show();
            }
        }
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
    </script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/storeRequest.js?v=<?php echo filemtime(__DIR__ . '/script/storeRequest.js'); ?>" defer></script>
</body>
</html>