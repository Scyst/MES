<?php
define('ALLOW_GUEST_ACCESS', true);
require_once __DIR__ . '/../components/init.php';

$isStaff = isset($_SESSION['user']) && ($_SESSION['user']['role'] !== 'CUSTOMER');
$isGuestAuth = isset($_SESSION['guest_access']) && $_SESSION['guest_access'] === true;
$isLocked = !isset($_SESSION['user']) && !$isGuestAuth; 
$isCustomer = (!$isStaff); 

$pageTitle = "ระบบจัดการคุณภาพ (iQMS)";
$pageHeaderTitle = "Integrated Quality Management";
$pageHeaderSubtitle = "ระบบแจ้งปัญหาและบริหารจัดการ NCR / CAR / Claim";
$pageIcon = "fas fa-shield-check"; 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/qmsDashboard.css?v=<?php echo filemtime(__DIR__ . '/css/qmsDashboard.css'); ?>">
    
    <?php if ($isLocked): ?>
    <style>
        body { overflow: hidden; }
        .page-container, header, .mobile-menu, .docking-sidebar { 
            filter: blur(8px); 
            pointer-events: none; 
            user-select: none;
        }
    </style>
    <?php endif; ?>
</head>
<body class="layout-top-header bg-body-tertiary">
    
    <?php if ($isLocked): ?>
    <div id="guestLockScreen" style="position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(255,255,255,0.7); z-index:9999; display:flex; justify-content:center; align-items:center;">
        <div class="card shadow-lg border-0 rounded-4" style="max-width:400px; width:90%;">
            <div class="card-body text-center p-5">
                <i class="fas fa-lock fa-4x text-primary mb-3"></i>
                <h4 class="fw-bold text-dark">Access Restricted</h4>
                <p class="text-muted small mb-4">กรุณาเข้าสู่ระบบเพื่อดูข้อมูล Quality Management</p>
                <a href="../../auth/login_form.php?redirect=<?php echo urlencode($_SERVER['REQUEST_URI']); ?>" class="btn btn-primary fw-bold w-100 py-2 rounded-3">
                    <i class="fas fa-sign-in-alt me-2"></i> เข้าสู่ระบบ (Login)
                </a>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php include_once '../components/php/top_header.php'; ?>
    <?php include_once '../components/php/mobile_menu.php'; ?>

    <div class="page-container">
        <div id="main-content">
            <div class="content-wrapper">
                
                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div class="input-group shadow-sm" style="max-width: 400px; border-radius: 6px; overflow: hidden;">
                        <span class="input-group-text bg-white border-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" id="searchInput" class="form-control border-0 bg-white" placeholder="ค้นหา CAR No, ลูกค้า, สินค้า..." style="font-size: 0.9rem;">
                    </div>
                    
                    <?php if ($isStaff): ?>
                    <button class="btn btn-primary fw-bold shadow-sm" onclick="openNCRModal()" style="font-size: 0.9rem;">
                        <i class="fas fa-plus-circle me-1"></i> แจ้งปัญหา (New NCR)
                    </button>
                    <?php endif; ?>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-lg-20-percent col-md-4 col-sm-6">
                        <div class="kpi-card active p-3 h-100" id="card-all" onclick="setFilter('ALL')">
                            <div class="text-secondary fw-bold small text-uppercase mb-1">Total Cases</div>
                            <h3 class="mb-0 fw-bold text-dark" id="stat-total">0</h3>
                        </div>
                    </div>
                    <div class="col-lg-20-percent col-md-4 col-sm-6">
                        <div class="kpi-card p-3 h-100" id="card-ncr" onclick="setFilter('NCR_CREATED')">
                            <div class="text-danger fw-bold small text-uppercase mb-1"><i class="fas fa-exclamation-circle me-1"></i> New NCR</div>
                            <h3 class="mb-0 fw-bold text-dark" id="stat-ncr">0</h3>
                        </div>
                    </div>
                    <div class="col-lg-20-percent col-md-4 col-sm-6">
                        <div class="kpi-card p-3 h-100" id="card-sent" onclick="setFilter('SENT_TO_CUSTOMER')">
                            <div class="text-warning text-dark fw-bold small text-uppercase mb-1"><i class="fas fa-paper-plane me-1"></i> Waiting CAR</div>
                            <h3 class="mb-0 fw-bold text-dark" id="stat-car">0</h3>
                        </div>
                    </div>
                    <div class="col-lg-20-percent col-md-4 col-sm-6">
                        <div class="kpi-card p-3 h-100" id="card-replied" onclick="setFilter('CUSTOMER_REPLIED')">
                            <div class="text-info text-dark fw-bold small text-uppercase mb-1"><i class="fas fa-reply-all me-1"></i> Replied</div>
                            <h3 class="mb-0 fw-bold text-dark" id="stat-reply">0</h3>
                        </div>
                    </div>
                    <div class="col-lg-20-percent col-md-4 col-sm-6">
                        <div class="kpi-card p-3 h-100" id="card-closed" onclick="setFilter('CLOSED')">
                            <div class="text-success fw-bold small text-uppercase mb-1"><i class="fas fa-check-circle me-1"></i> Closed</div>
                            <h3 class="mb-0 fw-bold text-dark" id="stat-closed">0</h3>
                        </div>
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
                                    <th class="text-start" style="width: 150px;">Issuer</th>
                                </tr>
                            </thead>
                            <tbody>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="mobile-view" id="mobileCaseContainer"></div>

            </div>
        </div>
    </div>

    <?php include_once './components/ncrFormModal.php'; ?>
    <?php include_once './components/caseDetailOffcanvas.php'; ?>

    <script src="./script/qms_core.js?v=<?php echo time(); ?>"></script>
</body>
</html>