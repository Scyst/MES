<?php
// MES/page/dailyLog/dailyLogUI.php
require_once __DIR__ . '/../components/init.php';

$isLoggedIn = isset($_SESSION['user']);
$user = $isLoggedIn ? $_SESSION['user'] : null;
$userRole = $isLoggedIn ? $user['role'] : 'guest';
$fullName = $isLoggedIn ? ($user['fullname'] ?? $user['username']) : 'ผู้เยี่ยมชม (Guest)';
$pageTitle = "TOOLBOX OS";

function renderServiceLink($title, $desc, $icon, $url, $requiredPermission, $iconColorClass = '') {
    $hasPermission = empty($requiredPermission) ? isset($_SESSION['user']) : hasPermission($requiredPermission);
    
    $lockClass = $hasPermission ? '' : 'locked';
    $href = $hasPermission ? $url : 'javascript:void(0)';
    $onClick = $hasPermission ? '' : 'onclick="showLockedAlert(\'' . htmlspecialchars($title, ENT_QUOTES) . '\')"';
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
    <link rel="stylesheet" href="css/portal.css?v=<?php echo filemtime(__DIR__ . '/css/portal.css'); ?>">
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
                    <span class="fw-bold" style="font-size: 1.25rem; letter-spacing: 0.5px;">TOOLBOX OS</span>
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
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
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

                        <div class="position-relative d-none" id="notificationWrapper">
                            <button class="btn btn-white shadow-sm border rounded-circle position-relative p-2" style="width: 45px; height: 45px;" onclick="openNotificationModal()">  
                                <i class="fas fa-bell text-secondary fa-lg"></i>
                                <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light" 
                                    id="notificationBadge" 
                                    style="font-size: 0.7rem;">
                                    0
                                </span>
                            </button>
                        </div>
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
                <div class="section-header">เว็บไซต์บริการ (Service Modules)</div>

                <div class="service-group">
                    <div class="service-group-title fw-bold text-dark border-bottom pb-1 mb-3">COMMON SERVICES (บริการส่วนกลาง & แจ้งเรื่อง)</div>
                    <div class="service-grid">
                        <?php 
                        $themeCommon = 'text-dark bg-light border';
                        renderServiceLink('OEE Dashboard', 'ดูประสิทธิภาพ (ภาพรวม)', '<i class="fas fa-chart-line"></i>', '../OEE_Dashboard/OEE_Shopfloor.php', '', $themeCommon);
                        renderServiceLink('Material Request', 'ระบบขอเบิกพัสดุ/อุปกรณ์', '<i class="fas fa-cart-plus"></i>', '../storeManagement/materialReq.php', '', $themeCommon);
                        renderServiceLink('Forklift Booking', 'จองรถและติดตามสถานะโฟร์คลิฟต์', '<i class="fas fa-truck-loading"></i>', '../forklift/forkliftUI.php', '', $themeCommon);
                        renderServiceLink('Document Center', 'คู่มือและเอกสาร', '<i class="fas fa-folder-open"></i>', '../documentCenter/documentCenterUI.php', 'view_documents', $themeCommon);
                        ?>
                    </div>
                </div>
                
                <div class="service-group">
                    <div class="service-group-title fw-bold text-primary">PRODUCTION (ปฏิบัติการผลิต)</div>
                    <div class="service-grid">
                        <?php 
                        $themeProd = 'text-primary bg-primary bg-opacity-10';
                        renderServiceLink('Production Entry', 'บันทึกผลผลิตประจำวัน', '<i class="fas fa-boxes"></i>', '../production/productionUI.php', 'view_production', $themeProd);
                        renderServiceLink('Mobile Entry', 'ลงยอดผ่านมือถือ', '<i class="fas fa-mobile-alt"></i>', '../production/mobile_entry.php', 'view_production', $themeProd);
                        renderServiceLink('Stop Causes', 'แจ้งซ่อม/บันทึกเครื่องจักรหยุด', '<i class="fas fa-ban"></i>', '../Stop_Cause/Stop_Cause.php', 'view_production', $themeProd);
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold text-warning">WAREHOUSE & LOGISTICS (คลังสินค้าและจัดส่ง)</div>
                    <div class="service-grid">
                        <?php 
                        $themeWh = 'text-warning bg-warning bg-opacity-10';
                        renderServiceLink('Store Dashboard', 'ศูนย์ควบคุมและคิวจ่ายสโตร์', '<i class="fas fa-store"></i>', '../storeManagement/storeDashboard.php', 'view_warehouse', $themeWh);
                        renderServiceLink('RM Receiving', 'รับวัตถุดิบเข้าคลัง', '<i class="fas fa-pallet"></i>', '../storeManagement/rmReceiving.php', 'view_warehouse', $themeWh);
                        renderServiceLink('Scrap & Replacement', 'เบิก/คืน วัตถุดิบ', '<i class="fas fa-dolly-flatbed"></i>', '../storeManagement/storeRequest.php', 'view_warehouse', $themeWh);
                        renderServiceLink('Loading Report', 'ตรวจสอบตู้สินค้า (C-TPAT)', '<i class="fas fa-truck-loading"></i>', '../loadingReport/loading_report.php', 'view_warehouse', $themeWh);
                        renderServiceLink('Transport & Logistics', 'บัญชีเที่ยวรถและค่าขนส่ง', '<i class="fas fa-truck-moving"></i>', '../fleetLog/fleetLog.php', 'view_sales', $themeWh);
                        renderServiceLink('Area Access', 'บันทึกเข้า-ออกพื้นที่หวงห้าม', '<i class="fas fa-user-shield"></i>', '../areaAccess/areaAccess.php', 'view_warehouse', $themeWh);
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold text-danger">QUALITY & MAINTENANCE (คุณภาพและซ่อมบำรุง)</div>
                    <div class="service-grid">
                        <?php 
                        $themeQa = 'text-danger bg-danger bg-opacity-10';
                        renderServiceLink('iQMS Dashboard', 'ระบบจัดการคุณภาพ (NCR/CAR)', '<i class="fas fa-shield-alt"></i>', '../QMS/qmsDashboard.php', 'view_qms', $themeQa);
                        renderServiceLink('MT Stock', 'จัดการคลังอะไหล่ซ่อมบำรุง', '<i class="fas fa-tools"></i>', '../maintenanceStock/maintenanceStockUI.php', 'view_maintenance', $themeQa);
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold text-success">EXECUTIVE & MANAGEMENT (บริหารจัดการ)</div>
                    <div class="service-grid">
                        <?php
                        $themeExec = 'text-success bg-success bg-opacity-10';
                        renderServiceLink('Management Dashboard', 'แดชบอร์ดผู้บริหารระดับสูง', '<i class="fas fa-tachometer-alt"></i>', '../management/managementDashboard.php', 'view_executive', $themeExec);
                        renderServiceLink('Daily Command Center', 'ศูนย์สั่งการและติดตามสถานะ', '<i class="fas fa-layer-group"></i>', '../planning/daily_meeting.php', 'view_dashboard', $themeExec);
                        renderServiceLink('Manpower', 'จัดการกำลังคนประจำวัน', '<i class="fas fa-users-cog"></i>', '../manpower/manpowerUI.php', 'view_manpower', $themeExec);
                        renderServiceLink('Daily P&L', 'บันทึกและวิเคราะห์งบกำไรขาดทุน', '<i class="fas fa-donate"></i>', '../dailyPL/pl_entry.php', 'view_pl', $themeExec);
                        renderServiceLink('Invoice Management', 'ระบบออกบิลและจัดการเวอร์ชัน', '<i class="fas fa-file-invoice-dollar"></i>', '../autoInvoice/finance_dashboard.php', 'manage_invoice', $themeExec);
                        renderServiceLink('Sales Tracking', 'ติดตามสถานะ PO', '<i class="fas fa-shipping-fast"></i>', '../sales/salesDashboard.php', 'view_sales', $themeExec);
                        renderServiceLink('Utility & Energy', 'ติดตามพลังงานและค่าไฟ', '<i class="fas fa-bolt"></i>', '../management/utilityDashboard.php', 'view_executive', $themeExec);
                        ?>
                    </div>
                </div>

                <div class="service-group">
                    <div class="service-group-title fw-bold text-secondary">SYSTEM ADMINISTRATION (จัดการระบบ)</div>
                    <div class="service-grid">
                        <?php
                        $themeSys = 'text-secondary bg-secondary bg-opacity-10';
                        renderServiceLink('System Settings', 'ตั้งค่าระบบหลัก', '<i class="fas fa-cogs"></i>', '../systemSettings/systemSettings.php', 'manage_settings', $themeSys);
                        renderServiceLink('User Manager', 'จัดการผู้ใช้งานและสิทธิ์', '<i class="fas fa-users-cog"></i>', '../userManage/userManageUI.php', 'manage_users', $themeSys);
                        ?>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <?php include __DIR__ . '/components/logModals.php'; ?>
    <?php include __DIR__ . '/components/avgMoodModal.php'; ?>
    <?php include __DIR__ . '/components/notificationModal.php'; ?>

    <script src="script/dailyLog.js?v=<?php echo filemtime(__DIR__ . '/script/dailyLog.js'); ?>"></script>
</body>
</html>