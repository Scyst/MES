<?php
// MES/page/PE/peTechMobile.php
require_once __DIR__ . '/../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$currentUser = $_SESSION['user'];
$pageTitle = "Technician Portal";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <script src="../../utils/libs/sweetalert2.all.min.js"></script>
    <script src="../../utils/libs/cropper.min.js"></script>

    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <link rel="stylesheet" href="../../utils/libs/cropper.min.css">
    <link rel="stylesheet" href="../components/css/fonts.css">
    <link rel="stylesheet" href="css/pe-enterprise.css">
    <link rel="stylesheet" href="css/peTechMobile.css?v=<?php echo time(); ?>">
    
    <script>
        const CURRENT_USER = <?php echo json_encode($currentUser); ?>;
        const PE_CONFIG = {
            canManage: false,
            currentUser: CURRENT_USER,
            csrfToken: document.querySelector('meta[name="csrf-token"]')?.content || '',
            apiBase: 'api/'
        };
    </script>
</head>
<body>

    <!-- Header -->
    <header class="tech-header">
        <div class="tech-header-title">
            <i class="fas fa-wrench"></i>
            Technician Portal
        </div>
        <div class="tech-user-info">
            <i class="fas fa-user-circle"></i> 
            <?php echo htmlspecialchars($currentUser['fullname'] ?? $currentUser['username']); ?>
        </div>
    </header>

    <!-- Tabs -->
    <div class="tech-tabs">
        <button class="tech-tab-btn active" id="tabMyJobs" onclick="TechModule.setFilter('my')">งานของฉัน</button>
        <button class="tech-tab-btn" id="tabAllJobs" onclick="TechModule.setFilter('all')">งานทั้งหมด</button>
    </div>

    <!-- Feed Container -->
    <div class="tech-feed" id="woFeedContainer">
        <!-- Rendered via JS -->
        <div class="tech-empty">
            <i class="fas fa-spinner fa-spin"></i>
            <div>กำลังโหลดข้อมูล...</div>
        </div>
    </div>

    <!-- Floating Action Button -->
    <button class="tech-fab" onclick="TechModule.loadData()" title="รีเฟรชข้อมูล">
        <i class="fas fa-sync-alt"></i>
    </button>

    <!-- Quick Close Modal (Reused from Main System) -->
    <?php include 'components/modals/modal_quick_close.php'; ?>
    
    <!-- Issue Spare Part Modal (Reused from Main System) -->
    <?php include 'components/modals/modal_wo_issue_part.php'; ?>

    <script src="script/peApp.js?v=<?php echo time(); ?>"></script>
    <script src="script/peTechModule.js?v=<?php echo time(); ?>"></script>
</body>
</html>
