<div class="dropdown-menu-wrapper">
  <button class="dropdown-toggle-btn" id="sidebar-toggle-btn">
    <img src="../../icons/menu.png" alt="Menu" width="32" height="32">
  </button>
</div>

<div class="sidebar-overlay" id="sidebar-overlay"></div>

<nav class="sidebar" id="sidebar">
  <div class="sidebar-header">
      <button class="dropdown-toggle-btn" id="sidebar-toggle-btn">
          <img src="../../icons/menu.png" alt="Menu" width="32" height="32">
      </button>
  </div>
  <ul class="custom-dropdown">
    <?php if (isset($_SESSION['user']) && is_array($_SESSION['user'])): ?>
      <li class="dropdown-username" title="User">
        <img src="../../icons/user.png" alt="User">
        <div>
            <?= htmlspecialchars($_SESSION['user']['username']) ?>
            <small style="display:block; font-size: 0.75rem; color: #aaa;">
              <?= htmlspecialchars($_SESSION['user']['role'] ?? 'operator') ?>
            </small>
        </div>
      </li>
    <?php endif; ?>

    <li><a class="dropdown-item-icon" href="../OEE_Dashboard/OEE_Dashboard.php" title="OEE Dashboard"><img src="../../icons/dashboard.png" alt="OEE Dashboard"><span>OEE Dashboard</span></a></li>
    <li><a class="dropdown-item-icon" href="../inventoryUI/inventoryUI.php" title="Inventory Management"><img src="../../icons/stock.png" alt="Inventory Management"><span>Inventory Management</span></a></li>
    <li><a class="dropdown-item-icon" href="../pdTable/pdTable.php" title="Production & WIP (Legacy)"><img src="../../icons/db.png" alt="Production & WIP (Legacy)"><span>Production & WIP (Legacy)</span></a></li>
    <li><a class="dropdown-item-icon" href="../Stop_Cause/Stop_Cause.php" title="Stop Causes"><img src="../../icons/settings.png" alt="Stop Causes"><span>Stop & Causes</span></a></li>
    
    <li><hr class="dropdown-divider"></li>

    <?php 
      $userRole = $_SESSION['user']['role'] ?? null;
      if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): 
    ?>
    <li><a class="dropdown-item-icon" href="../performanceReport/performanceReportUI.php" title="Operator Performance"><img src="../../icons/reports-icon.png" alt="Operator Performance"><span>Operator Performance</span></a></li>
    <?php endif; ?>
    
    <?php if ($userRole && in_array($userRole, ['supervisor', 'admin', 'creator'])): ?>
    <li><a class="dropdown-item-icon" href="../paraManage/paraManageUI.php" title="Parameter Manager"><img src="../../icons/slider.png" alt="Parameter Manager"><span>Parameter Manager</span></a></li>
    <?php endif; ?>

    <?php if ($userRole && in_array($userRole, ['admin', 'creator'])): ?>
    <li><a class="dropdown-item-icon" href="../inventorySettings/inventorySettings.php" title="Inventory Settings"><img src="../../icons/settings.png" alt="Inventory Settings"><span>Inventory Settings</span></a></li>
    <li><a class="dropdown-item-icon" href="../userManageUI/userManageUI.php" title="User Manager"><img src="../../icons/admin.png" alt="User Manager"><span>User Manager</span></a></li>
    <?php endif; ?>
    
    <li><hr class="dropdown-divider"></li>
    <li>
        <a class="dropdown-item-icon" href="#" id="theme-switcher-btn" title="Toggle Theme">
            <img src="../../icons/theme.png" alt="Toggle Theme">
            <span>Toggle Theme</span>
        </a>
    </li>

    <?php if (isset($_SESSION['user'])): ?>
        <li>
            <a class="dropdown-item-icon" href="../../auth/logout.php" onclick="manualLogout(event)" title="Logout">
                <img src="../../icons/logout.png" alt="Logout">
                <span>Logout</span>
            </a>
        </li>
    <?php else: ?>
      <li>
        <a class="dropdown-item-icon" href="../../auth/login_form.php" title="Login">
            <img src="../../icons/user.png" alt="Login">
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
            console.log('Clearing filters from manual logout...');
            localStorage.removeItem('pdTableFilters');
            localStorage.removeItem('inventoryUIFilters');
            localStorage.removeItem('sidebarState');
            window.location.href = event.currentTarget.href;
        }
    }
</script>