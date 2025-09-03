<nav class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <button class="dropdown-toggle-btn" id="sidebar-toggle-btn">
            <i class="fas fa-bars fa-fw" style="font-size: 1.5rem;"></i>
        </button>
    </div>

    <ul class="custom-dropdown">
        <?php if (isset($_SESSION['user']) && is_array($_SESSION['user'])): ?>
          <li class="dropdown-username" title="User">
            <i class="fas fa-user-alt fa-fw" style="margin-right: 24px;"></i>
            <div>
                <?= htmlspecialchars($_SESSION['user']['username']) ?>
                <small style="display:block; font-size: 0.75rem; color: #aaa;">
                  <?= htmlspecialchars($_SESSION['user']['role'] ?? 'operator') ?>
                </small>
            </div>
          </li>
        <?php endif; ?>

        <li><a class="dropdown-item-icon" href="../OEE_Dashboard/OEE_Dashboard.php" title="OEE Dashboard"><i class="fas fa-chart-line fa-fw"></i><span>OEE Dashboard</span></a></li>
        <li><a class="dropdown-item-icon" href="../inventoryUI/inventoryUI.php" title="Inventory Management"><i class="fas fa-boxes fa-fw"></i><span>Production & Inventory</span></a></li>
        <li style="display:none"><a class="dropdown-item-icon" href="../pdTable/pdTable.php" title="Production & WIP (Legacy)"><i class="fas fa-table fa-fw"></i><span>Production & WIP (Old)</span></a></li>
        <li><a class="dropdown-item-icon" href="../Stop_Cause/Stop_Cause.php" title="Stop Causes"><i class="fas fa-ban fa-fw"></i><span>Stop & Causes</span></a></li>

        <li><hr class="dropdown-divider"></li>

        <?php 
          $userRole = $_SESSION['user']['role'] ?? null;
          if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): 
        ?>
        <li style="display:none"><a class="dropdown-item-icon" href="../performanceReport/performanceReportUI.php" title="Operator Performance"><i class="fas fa-user-check fa-fw"></i><span>Operator Performance</span></a></li>
        <?php endif; ?>

        <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li style="display:none"><a class="dropdown-item-icon" href="../paraManage/paraManageUI.php" title="Parameter Manager"><i class="fas fa-sliders-h fa-fw"></i><span>Parameter Manager</span></a></li>
        <?php endif; ?>

        <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
        <li><a class="dropdown-item-icon" href="../inventorySettings/inventorySettings.php" title="Inventory Settings"><i class="fas fa-dolly fa-fw"></i><span>Inventory Settings</span></a></li>
        <?php endif; ?>

        <?php if ($userRole && in_array($userRole, ['admin', 'creator'])): ?>
            <li>
            <a class="dropdown-item-icon" href="../maintenanceStock/maintenanceStockUI.php" title="Maintenance Stock">
                <i class="fas fa-tools fa-fw"></i>
                <span>Maintenance Stock</span>
            </a>
        </li>
        <li>
            <a class="dropdown-item-icon" href="../userManageUI/userManageUI.php" title="User Manager">
                <i class="fas fa-users-cog fa-fw"></i>
                <span>User Manager</span>
            </a>
        </li>
        <?php endif; ?>

        <li><hr class="dropdown-divider"></li>
        <li>
            <a class="dropdown-item-icon" href="#" id="theme-switcher-btn" title="Toggle Theme">
                <i class="fas fa-adjust fa-fw"></i>
                <span>Toggle Theme</span>
            </a>
        </li>

        <?php if (isset($_SESSION['user'])): ?>
            <li>
                <a class="dropdown-item-icon" href="../../auth/logout.php" onclick="manualLogout(event)" title="Logout">
                    <i class="fas fa-sign-out-alt fa-fw"></i>
                    <span>Logout</span>
                </a>
            </li>
        <?php else: ?>
          <li>
            <a class="dropdown-item-icon" href="../../auth/login_form.php" title="Login">
                <i class="fas fa-sign-in-alt fa-fw"></i>
                <span>Login</span>
            </a>
          </li>
        <?php endif; ?>
    </ul>
</nav>

<script>
    if (typeof manualLogout !== 'function') {
        function manualLogout(event) {
            event.preventDefault(); 
            localStorage.removeItem('pdTableFilters');
            localStorage.removeItem('inventoryUIFilters');
            localStorage.removeItem('sidebarState');
            window.location.href = event.currentTarget.href;
        }
    }
</script>