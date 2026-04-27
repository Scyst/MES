<nav class="sidebar" id="sidebar" data-state="collapsed">
    <?php 
        $userRole = $_SESSION['user']['role'] ?? null; 
        $fullName = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'Guest';
    ?>
    
    <ul class="custom-dropdown list-unstyled" id="desktopAccordionMenu">
        
        <li class="p-2 position-sticky top-0 bg-body" style="z-index: 10;">
            <div class="input-group input-group-sm">
                <span class="input-group-text bg-light border-end-0 border-0"><i class="fas fa-search text-dark"></i></span>
                <input type="text" id="desktopMenuSearch" class="form-control border-0 bg-light" placeholder="ค้นหาเมนู..." autocomplete="off">
            </div>
        </li>

        <li><a class="dropdown-item-icon" href="../dailyLog/dailyLogUI.php"><i class="fas fa-home fa-fw"></i><span>TOOLBOX OS (Home)</span></a></li>
        <li><a class="dropdown-item-icon" href="../OEE_Dashboard/OEE_Shopfloor.php"><i class="fas fa-chart-line fa-fw"></i><span>OEE Dashboard</span></a></li>
        <li><a class="dropdown-item-icon" href="../storeManagement/materialReq.php"><i class="fas fa-cart-plus fa-fw"></i><span>Material Request</span></a></li>
        <li><a class="dropdown-item-icon" href="../forklift/forkliftUI.php"><i class="fas fa-truck-pickup fa-fw"></i><span>Forklift Booking</span></a></li>
        <li><a class="dropdown-item-icon" href="../documentCenter/documentCenterUI.php"><i class="fas fa-folder-open fa-fw"></i><span>Document Center</span></a></li>
        <li><hr class="dropdown-divider"></li>

        <?php if ($userRole && in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" data-bs-toggle="collapse" href="#collapseProd" role="button">
                <i class="fas fa-industry fa-fw"></i>
                <span>PRODUCTION</span>
                <i class="fas fa-chevron-down ms-auto text-dark" style="font-size: 0.7em;"></i>
            </a>
            <div class="collapse" id="collapseProd" data-bs-parent="#desktopAccordionMenu">
                <ul class="list-unstyled ms-3 ps-2 border-start py-1">
                    <li><a class="dropdown-item-icon py-1" href="../production/productionUI.php"><i class="fas fa-boxes fa-fw"></i><span>Production & Inventory</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../production/mobile_entry.php"><i class="fas fa-mobile-alt fa-fw"></i><span>ลงยอดผลิต (Mobile)</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../Stop_Cause/Stop_Cause.php"><i class="fas fa-ban fa-fw"></i><span>Stop & Causes</span></a></li>
                </ul>
            </div>
        </li>

        <li>
            <a class="dropdown-item-icon" data-bs-toggle="collapse" href="#collapseWh" role="button">
                <i class="fas fa-pallet fa-fw"></i>
                <span>WAREHOUSE & LOGISTICS</span>
                <i class="fas fa-chevron-down ms-auto text-dark" style="font-size: 0.7em;"></i>
            </a>
            <div class="collapse" id="collapseWh" data-bs-parent="#desktopAccordionMenu">
                <ul class="list-unstyled ms-3 ps-2 border-start py-1">
                    <?php if (in_array($userRole, ['admin', 'creator', 'supervisor'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../storeManagement/storeDashboard.php"><i class="fas fa-store fa-fw"></i><span>Store Dashboard</span></a></li>
                    <?php endif; ?>
                    <li><a class="dropdown-item-icon py-1" href="../storeManagement/rmReceiving.php"><i class="fas fa-inbox fa-fw"></i><span>RM Receiving & Tag</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../storeManagement/storeRequest.php"><i class="fas fa-dolly-flatbed fa-fw"></i><span>Scrap & Replacement</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../loadingReport/loading_report.php"><i class="fas fa-truck-loading fa-fw"></i><span>Loading Toolbox</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../fleetLog/fleetLog.php"><i class="fas fa-truck-moving fa-fw"></i><span>Transport & Logistics</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../areaAccess/areaAccess.php"><i class="fas fa-user-shield fa-fw"></i><span>Area Access Log</span></a></li>
                </ul>
            </div>
        </li>

        <li>
            <a class="dropdown-item-icon" data-bs-toggle="collapse" href="#collapseQa" role="button">
                <i class="fas fa-shield-alt fa-fw"></i>
                <span>QUALITY & MT</span>
                <i class="fas fa-chevron-down ms-auto text-dark" style="font-size: 0.7em;"></i>
            </a>
            <div class="collapse" id="collapseQa" data-bs-parent="#desktopAccordionMenu">
                <ul class="list-unstyled ms-3 ps-2 border-start py-1">
                    <li><a class="dropdown-item-icon py-1" href="../QMS/qmsDashboard.php"><i class="fas fa-check-circle fa-fw"></i><span>iQMS (Quality)</span></a></li>
                    <?php if (in_array($userRole, ['admin', 'creator'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../maintenanceStock/maintenanceStockUI.php"><i class="fas fa-tools fa-fw"></i><span>Maintenance Stock</span></a></li>
                    <?php endif; ?>
                </ul>
            </div>
        </li>

        <li>
            <a class="dropdown-item-icon" data-bs-toggle="collapse" href="#collapseMgmt" role="button">
                <i class="fas fa-chart-pie fa-fw"></i>
                <span>MANAGEMENT</span>
                <i class="fas fa-chevron-down ms-auto text-dark" style="font-size: 0.7em;"></i>
            </a>
            <div class="collapse" id="collapseMgmt" data-bs-parent="#desktopAccordionMenu">
                <ul class="list-unstyled ms-3 ps-2 border-start py-1">
                    <?php if (in_array($userRole, ['admin', 'creator'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../management/managementDashboard.php"><i class="fas fa-tachometer-alt fa-fw"></i><span>Management Dashboard</span></a></li>
                    <?php endif; ?>
                    <?php if (in_array($userRole, ['admin', 'creator', 'planner', 'supervisor'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../planning/daily_meeting.php"><i class="fas fa-layer-group fa-fw"></i><span>Daily Command Center</span></a></li>
                    <?php endif; ?>
                    <li><a class="dropdown-item-icon py-1" href="../manpower/manpowerUI.php"><i class="fas fa-users-cog fa-fw"></i><span>Manpower Management</span></a></li>
                    <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../dailyPL/pl_entry.php"><i class="fas fa-donate fa-fw"></i><span>Daily P&L</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../autoInvoice/finance_dashboard.php"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>Invoice Management</span></a></li>
                    <?php endif; ?>
                    <li><a class="dropdown-item-icon py-1" href="../sales/salesDashboard.php"><i class="fas fa-shipping-fast fa-fw"></i><span>Sales Tracking</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../management/utilityDashboard.php"><i class="fas fa-bolt fa-fw"></i><span>Utility & Energy</span></a></li>
                    <li><a class="dropdown-item-icon py-1" href="../dailyLog/moodReport.php"><i class="fas fa-heartbeat fa-fw"></i><span>Mood Insight Report</span></a></li>
                </ul>
            </div>
        </li>
        <?php endif; ?>

        <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li>
            <a class="dropdown-item-icon" data-bs-toggle="collapse" href="#collapseSys" role="button">
                <i class="fas fa-cogs fa-fw"></i>
                <span>SYSTEM ADMIN</span>
                <i class="fas fa-chevron-down ms-auto text-dark" style="font-size: 0.7em;"></i>
            </a>
            <div class="collapse" id="collapseSys" data-bs-parent="#desktopAccordionMenu">
                <ul class="list-unstyled ms-3 ps-2 border-start py-1">
                    <li><a class="dropdown-item-icon py-1" href="../systemSettings/systemSettings.php"><i class="fas fa-server fa-fw"></i><span>System Settings</span></a></li>
                    <?php if (in_array($userRole, ['admin', 'creator'])): ?>
                    <li><a class="dropdown-item-icon py-1" href="../userManage/userManageUI.php"><i class="fas fa-users-cog fa-fw"></i><span>User Manager</span></a></li>
                    <?php endif; ?>
                </ul>
            </div>
        </li>
        <?php endif; ?>
    </ul>
</nav>

<div class="offcanvas offcanvas-start" tabindex="-1" id="globalMobileMenu">
    <div class="offcanvas-header border-bottom bg-light">
        <h6 class="offcanvas-title fw-bold d-flex align-items-center">
            <i class="fas fa-user-circle fa-2x text-dark me-2"></i>
            <div>
                <span class="d-block text-dark"><?php echo htmlspecialchars($fullName); ?></span>
                <span class="badge bg-dark" style="font-size: 0.6rem;"><?php echo htmlspecialchars($userRole); ?></span>
            </div>
        </h6>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button>
    </div>
    <div class="offcanvas-body p-0">
        
        <div class="p-3 bg-white border-bottom sticky-top" style="z-index: 10;">
            <div class="input-group">
                <span class="input-group-text bg-light border-0"><i class="fas fa-search text-dark"></i></span>
                <input type="text" id="mobileMenuSearch" class="form-control border-0 bg-light" placeholder="ค้นหาเมนู..." autocomplete="off">
            </div>
        </div>
        
        <div class="list-group list-group-flush" id="mobileAccordionMenu">
            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase">COMMON SERVICES</div>
            <a class="list-group-item list-group-item-action text-dark" href="../dailyLog/dailyLogUI.php"><i class="fas fa-home fa-fw me-3"></i> TOOLBOX OS (Home)</a>
            <a class="list-group-item list-group-item-action text-dark" href="../OEE_Dashboard/OEE_Shopfloor.php"><i class="fas fa-chart-line fa-fw me-3"></i> OEE Dashboard</a>
            <a class="list-group-item list-group-item-action text-dark" href="../storeManagement/materialReq.php"><i class="fas fa-cart-plus fa-fw me-3"></i> Material Request</a>
            <a class="list-group-item list-group-item-action text-dark" href="../forklift/forkliftUI.php"><i class="fas fa-truck-pickup fa-fw me-3"></i> Forklift Booking</a>
            <a class="list-group-item list-group-item-action text-dark" href="../documentCenter/documentCenterUI.php"><i class="fas fa-folder-open fa-fw me-3"></i> Document Center</a>

            <?php if ($userRole && in_array($userRole, ['operator', 'supervisor', 'admin', 'creator'])): ?>
            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase border-top">PRODUCTION</div>
            <a class="list-group-item list-group-item-action text-dark" href="../production/productionUI.php"><i class="fas fa-boxes fa-fw me-3"></i> Production & Inventory</a>
            <a class="list-group-item list-group-item-action text-dark" href="../production/mobile_entry.php"><i class="fas fa-mobile-alt fa-fw me-3"></i> ลงยอดผลิต (Mobile)</a>
            <a class="list-group-item list-group-item-action text-dark" href="../Stop_Cause/Stop_Cause.php"><i class="fas fa-ban fa-fw me-3"></i> Stop & Causes</a>

            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase border-top">WAREHOUSE & LOGISTICS</div>
            <?php if (in_array($userRole, ['admin', 'creator', 'supervisor'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../storeManagement/storeDashboard.php"><i class="fas fa-store fa-fw me-3"></i> Store Dashboard</a>
            <?php endif; ?>
            <a class="list-group-item list-group-item-action text-dark" href="../storeManagement/rmReceiving.php"><i class="fas fa-inbox fa-fw me-3"></i> RM Receiving & Tag</a>
            <a class="list-group-item list-group-item-action text-dark" href="../storeManagement/storeRequest.php"><i class="fas fa-dolly-flatbed fa-fw me-3"></i> Scrap & Replacement</a>
            <a class="list-group-item list-group-item-action text-dark" href="../loadingReport/loading_report.php"><i class="fas fa-truck-loading fa-fw me-3"></i> Loading Toolbox</a>
            <a class="list-group-item list-group-item-action text-dark" href="../fleetLog/fleetLog.php"><i class="fas fa-truck-moving fa-fw me-3"></i> Transport & Logistics</a>
            <a class="list-group-item list-group-item-action text-dark" href="../areaAccess/areaAccess.php"><i class="fas fa-user-shield fa-fw me-3"></i> Area Access Log</a>

            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase border-top">QUALITY & MAINTENANCE</div>
            <a class="list-group-item list-group-item-action text-dark" href="../QMS/qmsDashboard.php"><i class="fas fa-check-circle fa-fw me-3"></i> iQMS (Quality)</a>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../maintenanceStock/maintenanceStockUI.php"><i class="fas fa-tools fa-fw me-3"></i> Maintenance Stock</a>
            <?php endif; ?>

            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase border-top">EXECUTIVE & MANAGEMENT</div>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../management/managementDashboard.php"><i class="fas fa-tachometer-alt fa-fw me-3"></i> Management Dashboard</a>
            <?php endif; ?>
            <?php if (in_array($userRole, ['admin', 'creator', 'planner', 'supervisor'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../planning/daily_meeting.php"><i class="fas fa-layer-group fa-fw me-3"></i> Daily Command Center</a>
            <?php endif; ?>
            <a class="list-group-item list-group-item-action text-dark" href="../manpower/manpowerUI.php"><i class="fas fa-users-cog fa-fw me-3"></i> Manpower Management</a>
            <?php if (in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../dailyPL/pl_entry.php"><i class="fas fa-donate fa-fw me-3"></i> Daily P&L</a>
            <a class="list-group-item list-group-item-action text-dark" href="../autoInvoice/finance_dashboard.php"><i class="fas fa-file-invoice-dollar fa-fw me-3"></i> Invoice Management</a>
            <?php endif; ?>
            <a class="list-group-item list-group-item-action text-dark" href="../sales/salesDashboard.php"><i class="fas fa-shipping-fast fa-fw me-3"></i> Sales Tracking</a>
            <a class="list-group-item list-group-item-action text-dark" href="../management/utilityDashboard.php"><i class="fas fa-bolt fa-fw me-3"></i> Utility & Energy</a>
            <a class="list-group-item list-group-item-action text-dark" href="../dailyLog/moodReport.php"><i class="fas fa-heartbeat fa-fw me-3"></i> Mood Insight Report</a>
            <?php endif; ?>

            <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
            <div class="bg-light px-3 py-2 fw-bold small text-dark text-uppercase border-top">SYSTEM ADMIN</div>
            <a class="list-group-item list-group-item-action text-dark" href="../systemSettings/systemSettings.php"><i class="fas fa-server fa-fw me-3"></i> System Settings</a>
            <?php if (in_array($userRole, ['admin', 'creator'])): ?>
            <a class="list-group-item list-group-item-action text-dark" href="../userManage/userManageUI.php"><i class="fas fa-users-cog fa-fw me-3"></i> User Manager</a>
            <?php endif; ?>
            <?php endif; ?>

            <div class="p-3 mt-4 border-top">
                <a class="btn btn-outline-danger w-100 logout-action" href="../../auth/logout.php">
                    <i class="fas fa-sign-out-alt me-2"></i> ออกจากระบบ
                </a>
            </div>
        </div>
    </div>
</div>