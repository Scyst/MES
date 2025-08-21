<div class="dropdown-menu-wrapper">
  <button class="dropdown-toggle-btn" id="sidebar-toggle-btn">
    <img src="../../icons/menu.png" alt="Menu" width="32" height="32">
  </button>
</div>

<div class="sidebar-overlay" id="sidebar-overlay"></div>

<nav class="sidebar" id="sidebar">
  <ul class="custom-dropdown">
    <?php if (isset($_SESSION['user']) && is_array($_SESSION['user'])): ?>
      <li class="dropdown-username" title="User">
        <img src="../../icons/user.png" alt="User">
        <div> <?= htmlspecialchars($_SESSION['user']['username']) ?>
            <small style="display:block; font-size: 0.75rem; color: #aaa;">
              <?= htmlspecialchars($_SESSION['user']['role'] ?? 'operator') ?>
            </small>
        </div>
      </li>
    <?php endif; ?>

    <li><a class="dropdown-item-icon" href="../OEE_Dashboard/OEE_Dashboard.php" title="OEE Dashboard"><img src="../../icons/dashboard.png" alt="OEE Dashboard"><span>OEE Dashboard</span></a></li>
    <li><a class="dropdown-item-icon" href="../inventoryUI/inventoryUI.php" title="Inventory Management"><img src="../../icons/stock.png" alt="Inventory Management"><span>Inventory Management</span></a></li>
    <li><hr class="dropdown-divider"></li>
    <li><a class="dropdown-item-icon" href="#" id="theme-switcher-btn" title="Toggle Theme"><img src="../../icons/theme.png" alt="Toggle Theme"><span>Toggle Theme</span></a></li>

    <?php if (isset($_SESSION['user'])): ?>
        <li><a class="dropdown-item-icon" href="../../auth/logout.php" onclick="manualLogout(event)" title="Logout"><img src="../../icons/logout.png" alt="Logout"><span>Logout</span></a></li>
    <?php else: ?>
      <li><a class="dropdown-item-icon" href="../../auth/login_form.php" title="Login"><img src="../../icons/user.png" alt="Login"><span>Login</span></a></li>
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
            window.location.href = event.currentTarget.href;
        }
    }
</script>