<?php
// page/QMS/qmsDashboard.php
require_once __DIR__ . '/../components/init.php';

// 1. ดักจับคนที่ยังไม่ล็อกอิน ให้เด้งไปหน้า Login
if (!isset($_SESSION['user'])) {
    header("Location: ../../auth/login_form.php?redirect=" . urlencode($_SERVER['REQUEST_URI']));
    exit;
}

// 2. ดักจับ Account ลูกค้า (ถ้าเผลอเข้ามา ให้หยุดการทำงาน)
if ($_SESSION['user']['role'] === 'CUSTOMER') {
    die('<div style="padding:50px; text-align:center; font-family:sans-serif;">
            <h2 style="color:red;">Access Denied</h2>
            <p>Customers are not allowed to view the internal QMS Dashboard.<br>Please use the portal link provided in your email.</p>
         </div>');
}

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
    <?php include_once '../components/php/mobile_menu.php'; ?>

    <div class="page-container">
        <main id="main-content">
            
            <div id="loadingOverlay">
                <div class="spinner-border text-primary" role="status"></div>
            </div>

            <div class="content-wrapper container-fluid p-3">
                
                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <div class="input-group shadow-sm" style="max-width: 400px; border-radius: 6px; overflow: hidden;">
                        <span class="input-group-text bg-white border-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" id="searchInput" class="form-control border-0 bg-white" placeholder="ค้นหา CAR No, ลูกค้า, สินค้า..." style="font-size: 0.95rem;">
                    </div>
                    
                    <button class="btn btn-danger fw-bold shadow-sm d-none d-lg-block" onclick="openNCRModal()">
                        <i class="fas fa-plus-circle me-1"></i> แจ้งปัญหา (New NCR)
                    </button>
                </div>

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
        </main>
    </div>

    <div class="fab-container d-lg-none" onclick="openNCRModal()">
        <button class="fab-btn bg-danger text-white shadow"><i class="fas fa-plus"></i></button>
    </div>

    <?php include_once './components/ncrFormModal.php'; ?>
    <?php include_once './components/caseDetailOffcanvas.php'; ?>

    <script src="./script/qms_core.js?v=<?php echo time(); ?>"></script>
    
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