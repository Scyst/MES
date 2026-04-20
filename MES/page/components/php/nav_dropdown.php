<nav class="sidebar" id="sidebar" data-state="collapsed">
    <?php 
        $userRole = $_SESSION['user']['role'] ?? null; 
    ?>
    
    <?php if (isset($_SESSION['user']) && is_array($_SESSION['user'])): ?>
      <div class="dropdown-username" title="User" style="width: 100%; flex-shrink: 0; cursor: default;">
        <i class="fas fa-user-circle fa-fw text-primary" style="margin-right: 24px; font-size: 1.2rem;"></i>
        <div>
            <span class="fw-bold text-dark"><?= htmlspecialchars($_SESSION['user']['fullname'] ?? $_SESSION['user']['username']) ?></span>
            <small style="display:block; font-size: 0.75rem; color: #6c757d;">
                <?= htmlspecialchars($userRole ?? 'operator') ?>
            </small>
        </div>
      </div>
    <?php endif; ?>
    
    <ul class="custom-dropdown">
        
        <li>
            <a class="dropdown-item-icon" href="../dailyLog/dailyLogUI.php" title="TOOLBOX OS (Home)">
                <i class="fas fa-home fa-fw text-primary"></i><span class="fw-bold">TOOLBOX OS</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../OEE_Dashboard/OEE_Dashboard.php" title="OEE Dashboard">
                <i class="fas fa-chart-line fa-fw"></i><span>OEE Dashboard</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../storeManagement/materialReq.php" title="Material Request (ขอเบิกพัสดุ)">
                <i class="fas fa-cart-plus fa-fw"></i><span>Material Request</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../forklift/forkliftUI.php" title="Forklift Booking">
                <i class="fas fa-truck-pickup fa-fw"></i><span>Forklift Booking</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../documentCenter/documentCenterUI.php" title="Document Center">
                <i class="fas fa-folder-open fa-fw"></i><span>Document Center</span>
            </a>
        </li>
        <li><hr class="dropdown-divider"></li>

        <?php if ($userRole && in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
        
        <li>
            <a class="dropdown-item-icon" href="../production/productionUI.php" title="Production & Inventory">
                <i class="fas fa-boxes fa-fw"></i><span>Production & Inventory</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../production/mobile_entry.php" title="ลงยอด (Mobile)">
                <i class="fas fa-mobile-alt fa-fw"></i><span>ลงยอดผลิต (Mobile)</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../Stop_Cause/Stop_Cause.php" title="Stop Causes">
                <i class="fas fa-ban fa-fw"></i><span>Stop & Causes</span>
            </a>
        </li>
        <li><hr class="dropdown-divider"></li>

        <?php if (in_array($userRole, ['admin', 'creator', 'supervisor'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../storeManagement/storeDashboard.php" title="Store Dashboard">
                <i class="fas fa-store fa-fw"></i><span>Store Dashboard</span>
            </a>
        </li>
        <?php endif; ?>
        <li>
            <a class="dropdown-item-icon" href="../storeManagement/rmReceiving.php" title="RM Receiving & Tagging">
                <i class="fas fa-pallet fa-fw"></i><span>RM Receiving & Tag</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../storeManagement/storeRequest.php" title="Scrap & Replacement">
                <i class="fas fa-dolly-flatbed fa-fw"></i><span>Scrap & Replacement</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../loadingReport/loading_report.php" title="Loading Toolbox">
                <i class="fas fa-truck-loading fa-fw"></i><span>Loading Report</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../fleetLog/fleetLog.php" title="Fleet & Logistics Log">
                <i class="fas fa-truck-moving fa-fw"></i><span>Transport & Logistics</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../areaAccess/areaAccess.php" title="Area Access Log">
                <i class="fas fa-user-shield fa-fw"></i><span>Area Access Log</span>
            </a>
        </li>
        <li><hr class="dropdown-divider"></li>

        <li>
            <a class="dropdown-item-icon" href="../QMS/qmsDashboard.php" title="iQMS Dashboard">
                <i class="fas fa-shield-alt fa-fw"></i><span>iQMS (Quality)</span>
            </a>
        </li>
        <?php if (in_array($userRole, ['admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../maintenanceStock/maintenanceStockUI.php" title="Maintenance Stock">
                <i class="fas fa-tools fa-fw"></i><span>Maintenance Stock</span>
            </a>
        </li>
        <?php endif; ?>
        <li><hr class="dropdown-divider"></li>

        <?php if (in_array($userRole, ['admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../management/managementDashboard.php" title="Management Dashboard">
                <i class="fas fa-tachometer-alt fa-fw"></i> <span>Management Dashboard</span>
            </a>
        </li>
        <?php endif; ?>
        <?php if (in_array($userRole, ['admin', 'creator', 'planner', 'supervisor'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../planning/daily_meeting.php" title="Daily Command Center">
                <i class="fas fa-layer-group fa-fw"></i><span>Daily Command Center</span>
            </a>
        </li>
        <?php endif; ?>
        <li>
            <a class="dropdown-item-icon" href="../manpower/manpowerUI.php" title="Manpower Management">
                <i class="fas fa-users-cog fa-fw"></i><span>Manpower</span>
            </a>
        </li>
        <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../dailyPL/pl_entry.php" title="Daily P&L">
                <i class="fas fa-donate fa-fw"></i><span>Daily P&L</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../autoInvoice/finance_dashboard.php" title="Invoice Management">
                <i class="fas fa-file-invoice-dollar fa-fw"></i><span>Invoice Management</span>
            </a>
        </li>
        <?php endif; ?>
        <li>
            <a class="dropdown-item-icon" href="../sales/salesDashboard.php" title="Sales Tracking">
                <i class="fas fa-shipping-fast fa-fw"></i><span>Sales Tracking</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../management/utilityDashboard.php" title="Utility & Energy Dashboard">
                <i class="fas fa-bolt fa-fw"></i><span>Utility & Energy</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../dailyLog/moodReport.php" title="Mood Insight Report">
                <i class="fas fa-heartbeat fa-fw"></i><span>Mood Insight</span>
            </a>
        </li>
        <li><hr class="dropdown-divider"></li>
        <?php endif; ?>

        <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../systemSettings/systemSettings.php" title="System Settings">
                <i class="fas fa-cogs fa-fw"></i><span>System Settings</span>
            </a>
        </li>
        <?php endif; ?>
        <?php if ($userRole && in_array($userRole, ['admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../userManage/userManageUI.php" title="User Manager">
                <i class="fas fa-users-cog fa-fw"></i><span>User Manager</span>
            </a>
        </li>
        <?php endif; ?>
        
        <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li><hr class="dropdown-divider"></li>
        <?php endif; ?>
        
        <li>
            <a class="dropdown-item-icon" href="#" id="theme-switcher-btn" title="Toggle Theme">
                <i class="fas fa-adjust fa-fw"></i><span>Toggle Theme</span>
            </a>
        </li>

        <?php if (isset($_SESSION['user'])): ?>
            <li>
                <a class="dropdown-item-icon logout-action text-danger" href="../../auth/logout.php" title="Logout">
                    <i class="fas fa-sign-out-alt fa-fw"></i><span class="fw-bold">Logout</span>
                </a>
            </li>
        <?php else: ?>
          <li>
            <a class="dropdown-item-icon text-primary" href="../../auth/login_form.php" title="Login">
                <i class="fas fa-sign-in-alt fa-fw"></i><span class="fw-bold">Login</span>
            </a>
          </li>
        <?php endif; ?>
    </ul>
</nav>

<div class="offcanvas offcanvas-start" tabindex="-1" id="globalMobileMenu" aria-labelledby="globalMobileMenuLabel">
    <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title fw-bold" id="globalMobileMenuLabel">
            <i class="fas fa-user-circle text-primary me-2"></i>
            <?php echo htmlspecialchars($_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Guest'); ?>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body p-0">
        <ul class="list-group list-group-flush">

            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">COMMON SERVICES</li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block fw-bold" href="../dailyLog/dailyLogUI.php">
                    <i class="fas fa-home fa-fw me-3 text-primary"></i><span>TOOLBOX OS (Home)</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../OEE_Dashboard/OEE_Dashboard.php">
                    <i class="fas fa-chart-line fa-fw me-3"></i><span>OEE Dashboard</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/materialReq.php">
                    <i class="fas fa-cart-plus fa-fw me-3"></i><span>Material Request</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../forklift/forkliftUI.php">
                    <i class="fas fa-truck-pickup fa-fw me-3"></i><span>Forklift Booking</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../documentCenter/documentCenterUI.php">
                    <i class="fas fa-folder-open fa-fw me-3"></i><span>Document Center</span>
                </a>
            </li>

            <?php if ($userRole && in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
            
            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">PRODUCTION</li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/productionUI.php">
                    <i class="fas fa-boxes fa-fw me-3"></i><span>Production & Inventory</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../production/mobile_entry.php">
                    <i class="fas fa-mobile-alt fa-fw me-3"></i><span>ลงยอดผลิต (Mobile)</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../Stop_Cause/Stop_Cause.php">
                    <i class="fas fa-ban fa-fw me-3"></i><span>Stop & Causes</span>
                </a>
            </li>

            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">WAREHOUSE & LOGISTICS</li>
            <?php if (in_array($userRole, ['admin', 'creator', 'supervisor'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/storeDashboard.php">
                    <i class="fas fa-store fa-fw me-3"></i><span>Store Dashboard</span>
                </a>
            </li>
            <?php endif; ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/rmReceiving.php">
                    <i class="fas fa-pallet fa-fw me-3"></i><span>RM Receiving & Tag</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../storeManagement/storeRequest.php">
                    <i class="fas fa-dolly-flatbed fa-fw me-3"></i><span>Scrap & Replacement</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../loadingReport/loading_report.php">
                    <i class="fas fa-truck-loading fa-fw me-3"></i><span>Loading Toolbox</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../fleetLog/fleetLog.php">
                    <i class="fas fa-truck-moving fa-fw me-3"></i><span>Transport & Logistics</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../areaAccess/areaAccess.php">
                    <i class="fas fa-user-shield fa-fw me-3"></i><span>Area Access Log</span>
                </a>
            </li>

            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">QUALITY & MAINTENANCE</li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../QMS/qmsDashboard.php">
                    <i class="fas fa-shield-alt fa-fw me-3"></i><span>iQMS (Quality)</span>
                </a>
            </li>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../maintenanceStock/maintenanceStockUI.php">
                    <i class="fas fa-tools fa-fw me-3"></i><span>Maintenance Stock</span>
                </a>
            </li>
            <?php endif; ?>

            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">EXECUTIVE & MANAGEMENT</li>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../management/managementDashboard.php">
                    <i class="fas fa-tachometer-alt fa-fw me-3"></i><span>Management Dashboard</span>
                </a>
            </li>
            <?php endif; ?>
            <?php if (in_array($userRole, ['admin', 'creator', 'planner', 'supervisor'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../planning/daily_meeting.php">
                    <i class="fas fa-layer-group fa-fw me-3"></i><span>Daily Command Center</span>
                </a>
            </li>
            <?php endif; ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../manpower/manpowerUI.php">
                    <i class="fas fa-users-cog fa-fw me-3"></i><span>Manpower Management</span>
                </a>
            </li>
            <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../dailyPL/pl_entry.php">
                    <i class="fas fa-donate fa-fw me-3"></i><span>Daily P&L</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../autoInvoice/finance_dashboard.php">
                    <i class="fas fa-file-invoice-dollar fa-fw me-3"></i><span>Invoice Management</span>
                </a>
            </li>
            <?php endif; ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../sales/salesDashboard.php">
                    <i class="fas fa-shipping-fast fa-fw me-3"></i><span>Sales Tracking</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../management/utilityDashboard.php">
                    <i class="fas fa-bolt fa-fw me-3"></i><span>Utility & Energy</span>
                </a>
            </li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../dailyLog/moodReport.php">
                    <i class="fas fa-heartbeat fa-fw me-3"></i><span>Mood Insight Report</span>
                </a>
            </li>
            <?php endif; ?>

            <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
            <li class="list-group-item bg-light text-secondary fw-bold border-bottom-0 py-2" style="font-size: 0.8rem;">SYSTEM ADMINISTRATION</li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../systemSettings/systemSettings.php">
                    <i class="fas fa-cogs fa-fw me-3"></i><span>System Settings</span>
                </a>
            </li>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="../userManage/userManageUI.php">
                    <i class="fas fa-users-cog fa-fw me-3"></i><span>User Manager</span>
                </a>
            </li>
            <?php endif; ?>
            <?php endif; ?>

            <li class="list-group-item bg-light border-bottom-0 py-1"></li>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-body d-block" href="#" id="theme-switcher-btn-mobile" title="Toggle Theme">
                    <i class="fas fa-adjust fa-fw me-3"></i><span>Toggle Theme</span>
                </a>
            </li>
            <?php if (isset($_SESSION['user'])): ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-danger d-block fw-bold logout-action" href="../../auth/logout.php" title="Logout">
                    <i class="fas fa-sign-out-alt fa-fw me-3"></i><span>Logout</span>
                </a>
            </li>
            <?php else: ?>
            <li class="list-group-item list-group-item-action">
                <a class="text-decoration-none text-primary d-block fw-bold" href="../../auth/login_form.php" title="Login">
                    <i class="fas fa-sign-in-alt fa-fw me-3"></i><span>Login</span>
                </a>
            </li>
            <?php endif; ?>

        </ul>
    </div>
</div>