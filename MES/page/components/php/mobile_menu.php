<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$userRole = $_SESSION['user']['role'] ?? null;
?>

<div class="offcanvas offcanvas-start" tabindex="-1" id="globalMobileMenu" aria-labelledby="globalMobileMenuLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title fw-bold" id="globalMobileMenuLabel">
            <i class="fas fa-user-circle text-primary me-2"></i>
            <?php echo htmlspecialchars($_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Guest'); ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body p-0">
        
        <ul class="list-group list-group-flush" style="margin-top: 5px;">

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block fw-bold" href="../dailyLog/dailyLogUI.php">
                    <i class="fas fa-home fa-fw me-3 text-primary"></i>
                    <span>TOOLBOX OS (Home)</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../OEE_Dashboard/OEE_Dashboard.php">
                    <i class="fas fa-chart-line fa-fw me-3"></i>
                    <span>OEE Dashboard</span>
                </a>
            </li>

            <?php if ($userRole && in_array($userRole, ['admin', 'creator', 'planner', 'supervisor'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../planning/daily_meeting.php">
                    <i class="fas fa-layer-group fa-fw me-3"></i>
                    <span>Daily Command Center</span>
                </a>
            </li>
            <?php endif; ?>

            <?php if ($userRole && in_array($userRole, ['admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../management/managementDashboard.php">
                    <i class="fas fa-tachometer-alt fa-fw me-3"></i>
                    <span>Management Dashboard</span>
                </a>
            </li>
            <?php endif; ?>

            <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../dailyPL/pl_entry.php">
                    <i class="fas fa-donate fa-fw me-3"></i>
                    <span>Daily P&L</span>
                </a>
            </li>
            <?php endif; ?>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../management/utilityDashboard.php">
                    <i class="fas fa-bolt fa-fw me-3"></i>
                    <span>Utility & Energy</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../manpower/manpowerUI.php">
                    <i class="fas fa-users-cog fa-fw me-3"></i>
                    <span>Manpower Management</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../dailyLog/moodReport.php">
                    <i class="fas fa-heartbeat fa-fw me-3"></i>
                    <span>Mood Insight Report</span>
                </a>
            </li>

            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>

            <?php if ($userRole && in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
            
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/productionUI.php">
                    <i class="fas fa-boxes fa-fw me-3"></i>
                    <span>Production & Inventory</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/mobile_entry.php">
                    <i class="fas fa-mobile-alt fa-fw me-3"></i>
                    <span>ลงยอดผลิต (Mobile)</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../Stop_Cause/Stop_Cause.php">
                    <i class="fas fa-ban fa-fw me-3"></i>
                    <span>Stop & Causes</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../sales/salesDashboard.php">
                    <i class="fas fa-shipping-fast fa-fw me-3"></i>
                    <span>Sales Tracking</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../fleetLog/fleetLog.php">
                    <i class="fas fa-truck-moving fa-fw me-3"></i>
                    <span>Transport & Logistics</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../loadingReport/loading_report.php">
                    <i class="fas fa-truck-loading fa-fw me-3"></i>
                    <span>Loading Toolbox</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../forklift/forkliftUI.php">
                    <i class="fas fa-truck-pickup fa-fw me-3"></i>
                    <span>Forklift Booking</span>
                </a>
            </li>

            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/rmReceiving.php">
                    <i class="fas fa-pallet fa-fw me-3"></i>
                    <span>RM Receiving & Tag</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/materialReq.php">
                    <i class="fas fa-cart-plus fa-fw me-3"></i>
                    <span>Material Request</span>
                </a>
            </li>

            <?php if (in_array($userRole, ['admin', 'creator', 'supervisor'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/storeDashboard.php">
                    <i class="fas fa-store fa-fw me-3"></i>
                    <span>Store Dashboard</span>
                </a>
            </li>
            <?php endif; ?>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/storeRequest.php">
                    <i class="fas fa-dolly-flatbed fa-fw me-3"></i>
                    <span>Scrap & Replacement</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../areaAccess/areaAccess.php">
                    <i class="fas fa-user-shield fa-fw me-3"></i>
                    <span>Area Access Log</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../QMS/qmsDashboard.php">
                    <i class="fas fa-shield-alt fa-fw me-3"></i>
                    <span>iQMS (Quality)</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../documentCenter/documentCenterUI.php">
                    <i class="fas fa-folder-open fa-fw me-3"></i>
                    <span>Document Center</span>
                </a>
            </li>
            
            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>
            <?php endif; ?>

            <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../systemSettings/systemSettings.php">
                        <i class="fas fa-cogs fa-fw me-3"></i>
                        <span>System Settings</span>
                    </a>
                </li>
            <?php endif; ?>

            <?php if ($userRole && in_array($userRole, ['admin', 'creator'])): ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../maintenanceStock/maintenanceStockUI.php">
                        <i class="fas fa-tools fa-fw me-3"></i>
                        <span>Maintenance Stock</span>
                    </a>
                </li>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../userManage/userManageUI.php">
                        <i class="fas fa-users-cog fa-fw me-3"></i>
                        <span>User Manager</span>
                    </a>
                </li>
            <?php endif; ?>
            
            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="#" id="theme-switcher-btn-mobile" title="Toggle Theme">
                    <i class="fas fa-adjust fa-fw me-3"></i>
                    <span>Toggle Theme</span>
                </a>
            </li>

            <?php if (isset($_SESSION['user'])): ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-danger d-block fw-bold logout-action" href="../../auth/logout.php" title="Logout">
                        <i class="fas fa-sign-out-alt fa-fw me-3"></i>
                        <span>Logout</span>
                    </a>
                </li>
            <?php else: ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-primary d-block fw-bold" href="../../auth/login_form.php" title="Login">
                        <i class="fas fa-sign-in-alt fa-fw me-3"></i>
                        <span>Login</span>
                    </a>
                </li>
            <?php endif; ?>

        </ul>
        
    </div>
</div>