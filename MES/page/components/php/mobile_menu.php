<?php
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
                    <i class="fas fa-chart-line fa-fw me-3"></i>
                    <span>OEE Dashboard</span>
                </a>
            </li>

            <?php
              if ($userRole && in_array($userRole, ['admin', 'creator'])):
            ?>
            <li class="list-group-item list-group-item-action disabled">
                <a class="text-decoration-none text-body d-block" 
                    href="../management/managementDashboard.php"
                    tabindex="-1" 
                    aria-disabled="true">
                    <i class="fas fa-tachometer-alt fa-fw me-3"></i>
                    <span style="text-decoration: line-through;">Management Dashboard <small>(ยังไม่รองรับ)</small></span>
                </a>
            </li>
            <?php endif; ?>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/productionUI.php">
                    <i class="fas fa-boxes fa-fw me-3"></i>
                    <span>Production & Inventory</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/mobile_entry.php">
                    <i class="fas fa-mobile-alt fa-fw me-3"></i>
                    <span>ลงยอด (Mobile)</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/storeRequest.php">
                    <i class="fas fa-dolly-flatbed fa-fw me-3"></i>
                    <span>Store Request & Scrap</span>
                </a>
            </li>

            <li class="list-group-item list-group-item-action disabled">
                <a class="text-decoration-none text-body d-block" 
                    href="../management/managementDashboard.php" 
                    tabindex="-1" 
                    aria-disabled="true">
                    <i class="fas fa-ban fa-fw me-3"></i>
                    <span style="text-decoration: line-through;">Stop & Causes <small>(ยังไม่รองรับ)</small></span>
                </a>
            </li>
            
            <?php
              if ($userRole && in_array($userRole, ['operator','supervisor', 'admin', 'creator'])):
            ?>
            <li class="list-group-item list-group-item-action disabled">
                <a class="text-decoration-none text-body d-block" 
                    href="../documentCenter/documentCenterUI.php"
                    tabindex="-1"
                    aria-disabled="true">
                    <i class="fas fa-folder-open fa-fw me-3"></i>
                    <span style="text-decoration: line-through;">Document Center <small>(ยังไม่รองรับ)</small></span>
                </a>
            </li>
            <li class="list-group-item" style="background-color: var(--bs-tertiary-bg);"></li>
            <?php endif; ?>

            <?php
              if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])):
            ?>
                <li class="list-group-item list-group-item-action disabled">
                    <a class="text-decoration-none text-body d-block"
                        href="../inventorySettings/inventorySettings.php"
                        tabindex="-1"
                        aria-disabled="true">
                        <i class="fas fa-cogs fa-fw me-3"></i>
                        <span style="text-decoration: line-through;">System Settings <small>(ยังไม่รองรับ)</small></span>
                    </a>
                </li>
            <?php endif; ?>

            <?php
              if ($userRole && in_array($userRole, ['admin', 'creator'])):
            ?>
                <!--li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../production/print_location_qr.php">
                        <i class="fas fa-map-marked-alt fa-fw me-3"></i>
                        <span>Location QR Printer</span>
                    </a>
                </li-->
                <li class="list-group-item list-group-item-action disabled">
                    <a class="text-decoration-none text-body d-block"
                        href="../maintenanceStock/maintenanceStockUI.php"
                        tabindex="-1"
                        aria-disabled="true">
                        <i class="fas fa-tools fa-fw me-3"></i>
                        <span style="text-decoration: line-through;">Maintenance Stock <small>(ยังไม่รองรับ)</small></span>
                    </a>
                </li>
                <li class="list-group-item list-group-item-action disabled">
                    <a class="text-decoration-none text-body d-block"
                        href="../userManage/userManageUI.php"
                        tabindex="-1"
                        aria-disabled="true">
                        <i class="fas fa-users-cog fa-fw me-3"></i>
                        <span style="text-decoration: line-through;">User Manager <small>(ยังไม่รองรับ)</small></span>
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
                    <a class="text-decoration-none text-body d-block logout-action" href="../../auth/logout.php" title="Logout">
                        <i class="fas fa-sign-out-alt fa-fw me-3"></i>
                        <span>Logout</span>
                    </a>
                </li>
            <?php else: ?>
                <li class="list-group-item list-group-item-action">
                    <a class="text-decoration-none text-body d-block" href="../../auth/login_form.php" title="Login">
                        <i class="fas fa-sign-in-alt fa-fw me-3"></i>
                        <span>Login</span>
                    </a>
                </li>
            <?php endif; ?>

        </ul>
        
    </div>
</div>