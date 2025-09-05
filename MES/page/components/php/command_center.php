<?php if (isset($_SESSION['user'])): ?>

<div class="command-center-container">
    <div class="dropdown">
        <button class="command-center-btn" type="button" id="commandCenterBtn" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="fas fa-th-large"></i> 
            <span class="badge bg-danger badge-number" id="command-center-badge"></span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end command-center-dropdown" id="command-center-menu">
            <li class="dropdown-header">Command Center</li>
            <li><hr class="dropdown-divider"></li>
            <li class="px-3 text-muted">Loading...</li>
        </ul>
    </div>
</div>

<?php endif; ?>