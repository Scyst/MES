<?php
// MES/page/PE/index.php — PE Enterprise Portal
require_once __DIR__ . '/../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$canManage = hasPermission('manage_maintenance') || hasPermission('manage_production');
$currentUser = $_SESSION['user'];
$pageTitle = "PE Enterprise";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <meta name="description" content="PE Enterprise — Machine Management, Maintenance & Analytics Portal">

    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <script src="../../utils/libs/sweetalert2.all.min.js"></script>
    <script src="../../utils/libs/flatpickr.min.js"></script>

    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="../../utils/libs/flatpickr.min.css">
    <link rel="stylesheet" href="../../utils/libs/cropper.min.css">
    <link rel="stylesheet" href="../components/css/fonts.css?v=<?php echo filemtime(__DIR__ . '/../components/css/fonts.css'); ?>">
    <link rel="stylesheet" href="css/pe-enterprise.css?v=<?php echo time(); ?>">
</head>

<body>
<div class="pe-app" id="peApp">

    <!-- Sidebar Overlay (Mobile) -->
    <div class="pe-sidebar-overlay" id="sidebarOverlay" id="sidebarOverlayBtn"></div>

    <!-- Sidebar -->
    <aside class="pe-sidebar" id="peSidebar">
        <div class="pe-sidebar-brand">
            <div class="brand-icon"><i class="fas fa-cogs"></i></div>
            <div>
                <div class="brand-text">PE Enterprise</div>
                <div class="brand-sub">Maintenance Hub</div>
            </div>
        </div>

        <nav class="pe-sidebar-nav">
            <div class="pe-nav-section">
                <div class="pe-nav-section-label">Main</div>
                <button class="pe-nav-item" data-tab="machines">
                    <i class="fas fa-industry"></i>
                    <span class="nav-label">Machine Registry</span>
                </button>
                <button class="pe-nav-item active" data-tab="workorders">
                    <i class="fas fa-clipboard-list"></i>
                    <span class="nav-label">Work Orders</span>
                    <span class="nav-badge" id="woOpenBadge" style="display:none;">0</span>
                </button>
                <button class="pe-nav-item" data-tab="downtime">
                    <i class="fas fa-clock"></i>
                    <span class="nav-label">Downtime Tracker</span>
                </button>
                <button class="pe-nav-item" data-tab="spareparts">
                    <i class="fas fa-boxes"></i>
                    <span class="nav-label">Spare Parts</span>
                    <span class="nav-badge" id="lowStockBadge" style="display:none;">0</span>
                </button>
            </div>

            <div class="pe-nav-section">
                <div class="pe-nav-section-label">Analytics & IIoT</div>
                <button class="pe-nav-item" data-tab="machine_timeline">
                    <i class="fas fa-stream" style="color: #0ea5e9;"></i>
                    <span class="nav-label">Machine Timeline</span>
                </button>
                <button class="pe-nav-item" data-tab="iiot">
                    <i class="fas fa-satellite-dish" style="color: #38bdf8;"></i>
                    <span class="nav-label">Live IIoT Monitor</span>
                </button>

                <button class="pe-nav-item" data-tab="iiot_analytics">
                    <i class="fas fa-history" style="color: #a855f7;"></i>
                    <span class="nav-label">IIoT Historical Analytics</span>
                </button>
                <button class="pe-nav-item" data-tab="analytics">
                    <i class="fas fa-chart-line"></i>
                    <span class="nav-label">Maintenance Analytics</span>
                </button>
            </div>

            <div class="pe-nav-section">
                <div class="pe-nav-section-label">Quick Links</div>
                <a class="pe-nav-item" href="peTechMobile.php" target="_blank">
                    <i class="fas fa-mobile-alt"></i>
                    <span class="nav-label">Technician Portal</span>
                </a>
                <a class="pe-nav-item" href="peRequest.php">
                    <i class="fas fa-external-link-alt"></i>
                    <span class="nav-label">PE Request Portal</span>
                </a>
                <a class="pe-nav-item" href="../dailyLog/dailyLogUI.php" style="color: var(--pe-danger);">
                    <i class="fas fa-sign-out-alt"></i>
                    <span class="nav-label">Exit to Main System</span>
                </a>
            </div>
        </nav>

        <div class="pe-sidebar-footer">
            <button class="pe-sidebar-toggle" id="sidebarToggleBtn" title="Toggle Sidebar">
                <i class="fas fa-chevron-left" id="sidebarToggleIcon"></i>
            </button>
        </div>
    </aside>

    <!-- Main Content -->
    <div class="pe-main">

        <!-- Top Bar -->
        <header class="pe-topbar">
            <button class="pe-mobile-menu-btn" id="sidebarMobileToggleBtn">
                <i class="fas fa-bars"></i>
            </button>
            <div class="pe-topbar-title">
                <i class="fas fa-cogs"></i>
                <span id="topbarTitle">Machine Registry</span>
            </div>
            <div class="pe-topbar-breadcrumb">
                PE Enterprise <i class="fas fa-chevron-right" style="font-size:9px;"></i> <span id="topbarBreadcrumb">Machines</span>
            </div>
            <div class="pe-topbar-actions">
                <button class="pe-btn pe-btn-ghost pe-btn-sm" id="topbarRefreshBtn" title="Refresh">
                    <i class="fas fa-sync-alt"></i>
                </button>
                <span class="pe-text-sm pe-text-muted" style="margin-left:4px;">
                    <i class="fas fa-user-circle me-1"></i><?php echo htmlspecialchars($currentUser['fullname'] ?? $currentUser['username']); ?>
                </span>
            </div>
        </header>

        <!-- Tab Panels -->
        <div class="pe-content">

            <!-- Machines Tab -->
            <div class="pe-tab-panel" id="panel-machines">
                <?php include 'components/tab_machines.php'; ?>
            </div>

            <!-- Work Orders Tab -->
            <div class="pe-tab-panel active" id="panel-workorders">
                <?php include 'components/tab_workorders.php'; ?>
            </div>

            <!-- Downtime Tab -->
            <div class="pe-tab-panel" id="panel-downtime">
                <?php include 'components/tab_downtime.php'; ?>
            </div>

            <!-- Spare Parts Tab -->
            <div class="pe-tab-panel" id="panel-spareparts">
                <?php include 'components/tab_spareparts.php'; ?>
            </div>

            <!-- Maintenance Analytics Tab -->
            <div class="pe-tab-panel" id="panel-analytics">
                <?php include 'components/tab_analytics.php'; ?>
            </div>

            <!-- Live IIoT Monitor -->
            <div class="pe-tab-panel" id="panel-iiot">
                <?php include 'components/tab_iiot.php'; ?>
            </div>

            <!-- IIoT Historical Analytics Tab -->
            <div class="pe-tab-panel" id="panel-iiot_analytics">
                <?php include 'components/tab_iiot_analytics.php'; ?>
            </div>

            <!-- Machine Timeline Tab -->
            <div class="pe-tab-panel" id="panel-machine_timeline">
                <?php include 'components/tab_machine_timeline.php'; ?>
            </div>

        </div>
    </div>
</div>

<!-- Modals -->
<?php
    include __DIR__ . '/components/modals/modal_machine.php';
    include __DIR__ . '/components/modals/modal_downtime.php';
    include __DIR__ . '/components/modals/modal_discovery.php';
    include __DIR__ . '/components/modals/modal_workorder.php';
    include __DIR__ . '/components/modals/modal_wo_issue_part.php';
    include __DIR__ . '/components/modals/modal_sparepart_tx.php';
    include __DIR__ . '/components/modals/modal_mt_item.php';
    include __DIR__ . '/components/modals/modal_quick_close.php';
    include __DIR__ . '/components/modals/modal_wo_filters.php';
?>

<!-- Cropper Modal -->
<div class="modal fade" id="cropImageModal" tabindex="-1" aria-labelledby="cropImageModalLabel" aria-hidden="true" style="z-index: 1060;">
    <div class="modal-dialog modal-fullscreen-sm-down modal-dialog-centered">
    <div class="modal-content">
        <div class="modal-header">
        <h5 class="modal-title" id="cropImageModalLabel"><i class="fas fa-crop-alt"></i> จัดการรูปภาพ</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="btnCancelCrop"></button>
        </div>
        <div class="modal-body p-2 text-center d-flex flex-column" style="background-color: #000; overflow: hidden; max-height: 70vh;">
          <div style="flex-grow: 1; max-height: calc(100% - 40px); max-width: 100%; display: flex; align-items: center; justify-content: center;">
              <img id="imageToCrop" src="" alt="Picture to crop" style="max-width: 100%; max-height: 100%; display: block;">
          </div>
          <div class="mt-2">
              <div class="btn-group" role="group" aria-label="Aspect Ratio">
                  <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="1">1:1</button>
                  <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="1.3333333333333333">4:3</button>
                  <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="0.75">3:4</button>
                  <button type="button" class="btn btn-outline-light btn-sm btn-aspect active" data-ratio="NaN">อิสระ</button>
              </div>
          </div>
        </div>
        <div class="modal-footer d-flex justify-content-between bg-light">
        <div>
            <button type="button" class="btn btn-secondary me-1" id="btnRotateLeft" title="หมุนซ้าย"><i class="fas fa-undo"></i></button>
            <button type="button" class="btn btn-secondary" id="btnRotateRight" title="หมุนขวา"><i class="fas fa-redo"></i></button>
        </div>
        <button type="button" class="btn btn-primary" id="btnConfirmCrop"><i class="fas fa-check"></i> ยืนยันรูปภาพ</button>
        </div>
    </div>
    </div>
</div>

<!-- Libraries -->
<script src="../../utils/libs/xlsx.full.min.js"></script>
<script src="../../utils/libs/cropper.min.js"></script>
<script src="../../utils/libs/fabric.min.js"></script>
<script src="../../utils/libs/simpleheat.js"></script>
<?php include_once '../components/chart_head.php'; ?>

<!-- App Scripts -->
<script>
    const PE_CONFIG = {
        canManage: <?php echo json_encode($canManage); ?>,
        currentUser: <?php echo json_encode([
            'username' => $currentUser['username'],
            'fullname' => $currentUser['fullname'] ?? $currentUser['username'],
            'role' => $currentUser['role'],
            'line' => $currentUser['line'] ?? ''
        ]); ?>,
        csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || '',
        apiBase: 'api/'
    };
</script>

<script type="module" src="script/peApp.js?v=<?php echo filemtime(__DIR__ . '/script/peApp.js'); ?>"></script>
<script type="module" src="script/machineModule.js?v=<?php echo filemtime(__DIR__ . '/script/machineModule.js'); ?>"></script>
<script type="module" src="script/workOrderModule.js?v=<?php echo time(); ?>"></script>
<script type="module" src="script/downtimeModule.js?v=<?php echo filemtime(__DIR__ . '/script/downtimeModule.js'); ?>"></script>
<script type="module" src="script/sparePartsModule.js?v=<?php echo filemtime(__DIR__ . '/script/sparePartsModule.js'); ?>"></script>
<script type="module" src="script/analyticsModule.js?v=<?php echo filemtime(__DIR__ . '/script/analyticsModule.js'); ?>"></script>
<script type="module" src="script/mapBuilderModule.js?v=<?php echo time(); ?>"></script>
<script type="module" src="script/iiotModule.js?v=<?php echo filemtime(__DIR__ . '/script/iiotModule.js'); ?>"></script>
<script type="module" src="script/iiotAnalyticsModule.js?v=<?php echo filemtime(__DIR__ . '/script/iiotAnalyticsModule.js'); ?>"></script>

<script type="module" src="script/machineTimelineModule.js?v=<?php echo filemtime(__DIR__ . '/script/machineTimelineModule.js'); ?>"></script>

</body>
</html>
