<?php
// ../components/php/global_mobile_menu.php
// (ไฟล์นี้ดึง Logic มาจาก nav_dropdown.php)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$userRole = $_SESSION['user']['role'] ?? null;
?>

<div class="offcanvas offcanvas-start" tabindex="-1" id="globalMobileMenu" aria-labelledby="globalMobileMenuLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="globalMobileMenuLabel">
            <i class="fas fa-user-alt fa-fw me-2"></i>
            <?php echo htmlspecialchars($_SESSION['user']['username'] ?? 'Menu'); ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body p-0">
        
        <ul class="list-group list-group-flush">

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../OEE_Dashboard/OEE_Dashboard.php">
                    <i class="fas fa-chart-line fa-fw me-3"></i><span>OEE Dashboard</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../management/managementDashboard.php">
                    <i class="fas fa-tachometer-alt fa-fw me-3"></i> <span>Management Dashboard</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/productionUI.php">
                    <i class="fas fa-boxes fa-fw me-3"></i><span>Production & Inventory</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../Stop_Cause/Stop_Cause.php">
                    <i class="fas fa-ban fa-fw me-3"></i><span>Stop & Causes</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../documentCenter/documentCenterUI.php">
                    <i class="fas fa-folder-open fa-fw me-3"></i><span>Document Center</span>
                </a>
            </li>

            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>

            <?php
              // --- Section for Supervisor, Admin, Creator ---
              if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])):
            ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../inventorySettings/inventorySettings.php">
                        <i class="fas fa-cogs fa-fw me-3"></i><span>System Settings</span>
                    </a>
                </li>
            <?php endif; ?>

            <?php
              // --- Section for Admin, Creator Only ---
              if ($userRole && in_array($userRole, ['admin', 'creator'])):
            ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../production/print_location_qr.php">
                        <i class="fas fa-map-marked-alt fa-fw me-3"></i><span>Location QR Printer</span>
                    </a>
                </li>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../maintenanceStock/maintenanceStockUI.php">
                        <i class="fas fa-tools fa-fw me-3"></i><span>Maintenance Stock</span>
                    </a>
                </li>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../userManage/userManageUI.php">
                        <i class="fas fa-users-cog fa-fw me-3"></i><span>User Manager</span>
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

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../../auth/logout.php" onclick="manualLogout(event)" title="Logout">
                    <i class="fas fa-sign-out-alt fa-fw me-3"></i>
                    <span>Logout</span>
                </a>
            </li>
        </ul>
        
    </div>
</div>