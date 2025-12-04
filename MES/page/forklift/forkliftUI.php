<?php
// MES/page/forklift/forkliftUI.php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../auth/check_auth.php';

$pageTitle = "Forklift Command Center";

function getThaiDate() {
    $thai_months = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน', 5 => 'พฤษภาคม', 6 => 'มิถุนายน',
        7 => 'กรกฎาคม', 8 => 'สิงหาคม', 9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    ];
    $day = date('j');
    $month = $thai_months[(int)date('n')];
    $year = date('Y') + 543;
    return "$day $month $year";
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <title><?php echo $pageTitle; ?></title>
    
    <link rel="stylesheet" href="css/forklift.css?v=<?php echo time(); ?>">
    
    <script>
        const CURRENT_USER_ID = <?php echo $_SESSION['user']['id']; ?>;
        const CURRENT_USER_NAME = "<?php echo $_SESSION['user']['fullname'] ?? $_SESSION['user']['username']; ?>";
        // เช็ค Role เพื่อแสดงปุ่ม Manage
        const IS_ADMIN = <?php echo in_array($_SESSION['user']['role'], ['admin', 'supervisor', 'creator']) ? 'true' : 'false'; ?>;
    </script>
</head>
<body class="dashboard-page layout-top-header">

    <header class="portal-top-header">
        
        <div class="d-flex align-items-center gap-3">
            <button class="btn btn-link text-secondary d-xl-none p-0 me-2" id="sidebar-toggle-mobile-top">
                <i class="fas fa-bars fa-lg"></i>
            </button>

            <div class="header-logo-box bg-warning bg-opacity-10 text-warning">
                <i class="fas fa-dolly-flatbed fa-lg"></i>
            </div>
            
            <div class="d-flex flex-column justify-content-center">
                <h5 class="fw-bold mb-0 text-body" style="line-height: 1.2;">Forklift Command Center</h5>
                <small class="text-muted" style="font-size: 0.75rem;">ระบบจองและติดตามสถานะรถโฟร์คลิฟ</small>
            </div>
        </div>

        <div class="d-flex align-items-center gap-2">
            <button class="btn btn-link text-secondary p-0 me-3" onclick="new bootstrap.Modal(document.getElementById('helpModal')).show()" title="คู่มือการใช้งาน">
                <i class="far fa-question-circle fa-lg"></i>
            </button>
            <span class="d-none d-lg-inline text-muted small me-3">
                <i class="far fa-clock me-1"></i> <?php echo getThaiDate(); ?>
            </span>
            <?php include_once('../components/php/nav_dropdown.php'); ?>
        </div>
    </header>

    <main id="main-content">
        <div class="container-fluid p-3 h-100 d-flex flex-column" style="max-width: 1600px;">
            
            <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                <div class="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center timeline-toolbar">
                    <h6 class="fw-bold mb-0"><i class="fas fa-stream text-primary me-2"></i>Schedule (24 Hours)</h6>
                    <div class="text-muted small legend-box">
                        <span class="badge me-1 ms-2" style="background-color: #8b0faa;">&nbsp;</span> Active (In Use)
                        <span class="badge bg-secondary me-1 ms-2">&nbsp;</span> Completed
                    </div>
                </div>
                
                <div class="card-body py-2">
                    <div id="timeline-chart" class="timeline-container"></div>
                </div>
            </div>

            <div class="d-flex justify-content-between align-items-end mb-2 px-1 border-bottom pb-2 fleet-toolbar">
                <div>
                    <h6 class="fw-bold mb-0"><i class="fas fa-th-large me-2"></i>Fleet Status</h6>
                    <small class="text-muted" style="font-size: 0.8rem;">คลิกที่การ์ดเพื่อจัดการ (จอง > เริ่มงาน > คืนรถ)</small>
                    <small class="text-muted" style="font-size: 0.75rem;">อัปเดตล่าสุด: <span id="last-update-time">-</span></small>
                </div>
                <div class="d-flex gap-2 w-100-mobile">
                    <button class="btn btn-sm btn-outline-secondary" onclick="openHistoryModal()">
                        <i class="fas fa-history me-1"></i> ประวัติ
                    </button>
                    
                    <?php if (in_array($_SESSION['user']['role'], ['admin', 'supervisor', 'creator'])): ?>
                    <button class="btn btn-sm btn-outline-secondary" onclick="openManageModal()">
                        <i class="fas fa-cog me-1"></i> จัดการ
                    </button>
                    <?php endif; ?>
                </div>
            </div>
            
            <div class="flex-grow-1 overflow-auto pb-3 px-1">
                <div id="forklift-grid" class="row g-3">
                    <div class="col-12 text-center py-5">
                        <div class="spinner-border text-primary"></div>
                        <p class="mt-2 text-muted">Loading Fleet Status...</p>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <?php include 'components/forkliftModals.php'; ?>
    <?php include 'components/helpModal.php'; ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>

    <script src="script/forklift.js?v=<?php echo time(); ?>"></script>
    
    <script>
        // [FIX] ลบ JS Listener ของ Theme Switcher เดิมออก
        // เพราะเราลบปุ่ม id="theme-btn" ไปแล้ว ถ้าไม่ลบ JS มันจะ Error ใน Console ว่า null

        // Mobile Toggle Linkage
        const mobileBtn = document.getElementById('sidebar-toggle-mobile-top');
        if(mobileBtn) {
            mobileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const menuElement = document.getElementById('globalMobileMenu');
                if (menuElement) {
                    const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(menuElement);
                    bsOffcanvas.toggle();
                }
            });
        }
    </script>
</body>
</html>