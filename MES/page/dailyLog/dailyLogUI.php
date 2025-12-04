<?php
// MES/page/dailyLog/dailyLogUI.php
require_once __DIR__ . '/../../config/config.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$isLoggedIn = isset($_SESSION['user']);
$user = $isLoggedIn ? $_SESSION['user'] : null;
$userRole = $isLoggedIn ? $user['role'] : 'guest';
$fullName = $isLoggedIn ? ($user['fullname'] ?? $user['username']) : 'ผู้เยี่ยมชม (Guest)';
$pageTitle = "MES TOOLBOX";

// Helper Function
function renderServiceLink($title, $desc, $icon, $url, $allowedRoles, $userRole, $iconColorClass = '') {
    $hasPermission = in_array($userRole, $allowedRoles);
    $lockClass = $hasPermission ? '' : 'locked';
    $href = $hasPermission ? $url : 'javascript:void(0)';
    $onClick = $hasPermission ? '' : 'onclick="showLockedAlert(\'' . $title . '\')"';
    $lockIcon = $hasPermission ? '' : '<i class="fas fa-lock ms-auto text-secondary opacity-50"></i>';

    if (empty($iconColorClass)) {
        $iconColorClass = 'text-secondary bg-secondary bg-opacity-10';
    }

    echo "
    <a href=\"{$href}\" class=\"service-item {$lockClass}\" {$onClick}>
        <div class=\"service-icon {$iconColorClass}\">{$icon}</div>
        <div class=\"service-text\">
            <h4>{$title}</h4>
            <p>{$desc}</p>
        </div>
        {$lockIcon}
    </a>
    ";
}
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <title><?php echo $pageTitle; ?></title>
    <link rel="stylesheet" href="css/portal.css?v=<?php echo time(); ?>">
    <script>
        const IS_LOGGED_IN = <?php echo $isLoggedIn ? 'true' : 'false'; ?>;
        const USER_ROLE = '<?php echo $userRole; ?>';
    </script>
</head>
<body class="dashboard-page">

    <div id="main-content">
        <div class="portal-header">
            <div class="d-flex align-items-center">
                <div class="flex-shrink-0 d-none d-md-block">
                    <img src="../components/images/logo.webp" alt="SNC Logo" style="height: 35px; width: auto; object-fit: contain;">
                </div>

                <div class="border-start border-secondary mx-2 d-none d-md-block" style="height: 35px; opacity: 0.2;"></div>

                <div class="d-flex flex-column justify-content-center" style="line-height: 1.2;">
                    <span class="fw-bold" style="font-size: 1.25rem; letter-spacing: 0.5px;">MES TOOLBOX</span>
                    <span class="text-muted" style="font-size: 0.75rem;">บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน)</span>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="d-none d-md-inline text-muted small me-3"><i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?></span>
                <button class="btn btn-link text-secondary p-0 me-3" id="portal-theme-btn" type="button" title="Switch Theme">
                    <i class="fas fa-adjust fa-lg"></i>
                </button>
                <?php if ($isLoggedIn): ?>
                    <a href="../../auth/logout.php" class="btn btn-light text-danger fw-bold px-3 border">
                        <i class="fas fa-sign-out-alt"></i> <span class="d-none d-md-inline ms-2">Logout</span>
                    </a>
                <?php else: ?>
                    <a href="../../auth/login_form.php?redirect=<?php echo urlencode($_SERVER['REQUEST_URI']); ?>" class="btn btn-primary fw-bold px-3">
                        <i class="fas fa-sign-in-alt"></i> <span class="d-none d-md-inline ms-2">Login</span>
                    </a>
                <?php endif; ?>
            </div>
        </div>

        <div class="portal-container">
            <div class="portal-col">
                <div class="welcome-box">
                    <h1>สวัสดี คุณ <?php echo htmlspecialchars($fullName); ?> 👋</h1>
                    <div class="welcome-info mt-2">
                        <?php if ($isLoggedIn): ?>
                            <span class="badge bg-light text-secondary border me-1 fw-normal">
                                <i class="fas fa-id-badge me-1"></i> <?php echo htmlspecialchars($user['emp_id'] ?? '-'); ?>
                            </span>
                            <span class="badge bg-light text-secondary border me-1 fw-normal">
                                <i class="fas fa-industry me-1"></i> Line: <?php echo htmlspecialchars($user['line'] ?? '-'); ?>
                            </span>
                            <span class="badge bg-primary bg-opacity-10 text-primary border">
                                <?php echo htmlspecialchars($user['position'] ?? $user['role']); ?>
                            </span>
                        <?php else: ?>
                            <span class="text-muted"><i class="fas fa-info-circle me-1"></i> กรุณาเข้าสู่ระบบเพื่อใช้งานฟังก์ชันพนักงาน</span>
                        <?php endif; ?>
                    </div>
                </div>

                <button id="btnOpenAdminDash" class="btn w-100 mb-4 d-none shadow-sm" style="background: linear-gradient(to right, #667eea, #764ba2); color: white; border: none; padding: 12px; border-radius: 10px;" onclick="adminDashboardModal.show()">
                    <div class="d-flex align-items-center justify-content-between">
                        <span><i class="fas fa-chart-pie me-2"></i> ภาพรวมทีมงาน (Dashboard)</span>
                        <i class="fas fa-chevron-right opacity-50"></i>
                    </div>
                </button>

                <div class="section-header"><i class="fas fa-heartbeat text-danger"></i> DAILY PULSE (บันทึกประจำวัน)</div>
                <div id="todayCardsContainer" class="pulse-grid">
                    <div class="text-center w-100 py-4 text-muted col-span-3"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
                </div>

                <div class="calendar-wrapper">
                    <div class="section-header d-flex justify-content-between border-0 pb-2">
                        <span><i class="far fa-calendar-alt"></i> ปฏิทินงาน (<?php echo date('M Y'); ?>)</span>
                    </div>
                    <div class="snc-calendar">
                        <div class="snc-cal-head text-danger">อา</div>
                        <div class="snc-cal-head">จ</div>
                        <div class="snc-cal-head">อ</div>
                        <div class="snc-cal-head">พ</div>
                        <div class="snc-cal-head">พฤ</div>
                        <div class="snc-cal-head">ศ</div>
                        <div class="snc-cal-head text-primary">ส</div>
                        <div id="calendarGrid" style="display: contents;"></div>
                    </div>
                </div>
            </div>

            <div class="portal-col">
                <div class="section-header">เว็บไซต์บริการ (Service Desk)</div>
                
                <div class="service-group">
                    <div class="service-group-title fw-bold">OPERATIONS (ฝ่ายผลิต)</div>
                    <div class="service-grid">
                        <?php 
                        $themeOps = 'text-primary bg-primary bg-opacity-10';

                        renderServiceLink('Production Entry', 'บันทึกผลผลิตประจำวัน', '<i class="fas fa-boxes"></i>', '../production/productionUI.php', ['operator', 'supervisor', 'admin', 'creator'], $userRole, $themeOps);
                        renderServiceLink('Mobile Entry', 'ลงยอดผ่านมือถือ (QR)', '<i class="fas fa-mobile-alt"></i>', '../production/mobile_entry.php', ['operator', 'supervisor', 'admin', 'creator'], $userRole, $themeOps);
                        renderServiceLink('Stop Causes', 'บันทึกเครื่องจักรหยุด', '<i class="fas fa-ban"></i>', '../Stop_Cause/Stop_Cause.php', ['operator', 'supervisor', 'admin', 'creator'], $userRole, $themeOps);
                        renderServiceLink('Store Request', 'เบิก/คืน วัตถุดิบ', '<i class="fas fa-dolly-flatbed"></i>', '../storeManagement/storeRequest.php', ['operator', 'supervisor', 'admin', 'creator'], $userRole, $themeOps);
                        
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold">MONITORING (ติดตามผล)</div>
                    <div class="service-grid">
                        <?php
                        $themeMon = 'text-success bg-success bg-opacity-10';

                        renderServiceLink('OEE Dashboard', 'ประสิทธิภาพเครื่องจักร', '<i class="fas fa-chart-line"></i>', '../OEE_Dashboard/OEE_Dashboard.php', ['guest', 'operator', 'supervisor', 'admin', 'creator'], $userRole, $themeMon);
                        renderServiceLink('Management', 'แดชบอร์ดผู้บริหาร', '<i class="fas fa-tachometer-alt"></i>', '../management/managementDashboard.php', ['admin', 'creator'], $userRole, $themeMon);
                        renderServiceLink('Manpower', 'จัดการกำลังคน', '<i class="fas fa-users-cog"></i>', '../manpower/manpowerUI.php', ['supervisor', 'admin', 'creator'], $userRole, $themeMon);
                        renderServiceLink('Sales Tracking', 'ติดตามสถานะ PO และการโหลดตู้', '<i class="fas fa-shipping-fast"></i>', '../sales/salesDashboard.php', ['supervisor', 'admin', 'creator'], $userRole, $themeMon);
                        renderServiceLink('Forklift Booking', 'จองรถโฟร์คลิฟ และติดตามสถานะ', '<i class="fas fa-truck-loading"></i>', '../forklift/forkliftUI.php', ['operator', 'supervisor', 'admin', 'creator'], $userRole, $themeMon);
                        renderServiceLink('Mood Insight', 'รายงานสุขภาพใจทีมงาน', '<i class="fas fa-heartbeat"></i>', 'moodReport.php', ['admin', 'creator', 'supervisor'], $userRole, $themeMon);
                        renderServiceLink('Document Center', 'คู่มือและเอกสาร', '<i class="fas fa-folder-open"></i>', '../documentCenter/documentCenterUI.php', ['guest', 'operator', 'supervisor', 'admin', 'creator'], $userRole, $themeMon);
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold">SYSTEM TOOLS (ผู้ดูแล)</div>
                    <div class="service-grid">
                        <?php
                        $themeSys = 'text-secondary bg-secondary bg-opacity-10';

                        renderServiceLink('System Settings', 'ตั้งค่าระบบ', '<i class="fas fa-cogs"></i>', '../inventorySettings/inventorySettings.php', ['supervisor', 'admin', 'creator'], $userRole, $themeSys);
                        renderServiceLink('QR Printer', 'พิมพ์ Location Tag', '<i class="fas fa-qrcode"></i>', '../production/print_location_qr.php', ['admin', 'creator'], $userRole, $themeSys);
                        renderServiceLink('MT Stock', 'คลังอะไหล่ซ่อมบำรุง', '<i class="fas fa-tools"></i>', '../maintenanceStock/maintenanceStockUI.php', ['admin', 'creator'], $userRole, $themeSys);
                        renderServiceLink('User Manager', 'จัดการผู้ใช้งาน', '<i class="fas fa-users-cog"></i>', '../userManage/userManageUI.php', ['admin', 'creator'], $userRole, $themeSys);
                        ?>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <?php include __DIR__ . '/components/logModals.php'; ?>
    <?php include __DIR__ . '/components/avgMoodModal.php'; ?>

    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="script/dailyLog.js?v=<?php echo time(); ?>"></script>
</body>
</html>