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
            <a href="../dailyLog/dailyLogUI.php" class="text-white me-2 text-decoration-none">
                <i class="fas fa-arrow-left"></i>
            </a>
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

    <!-- Cropper Modal -->
    <div class="modal fade pe-modal" id="cropImageModal" tabindex="-1" aria-labelledby="cropImageModalLabel" aria-hidden="true" style="z-index: 1060;">
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

    <!-- Image Preview Modal -->
    <div class="modal fade" id="imagePreviewModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div class="modal-content bg-transparent border-0">
                <div class="modal-header border-0 d-flex justify-content-end p-2 position-absolute w-100" style="z-index: 1;">
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close" style="background-color: rgba(0,0,0,0.5); border-radius: 50%; padding: 0.5rem;"></button>
                </div>
                <div class="modal-body p-0 text-center d-flex align-items-center justify-content-center" style="min-height: 50vh;">
                    <img id="imagePreviewSrc" src="" alt="Preview" style="max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                </div>
            </div>
        </div>
    </div>

    <script>
        window.openImageViewer = function(src) {
            document.getElementById('imagePreviewSrc').src = src;
            const modal = new bootstrap.Modal(document.getElementById('imagePreviewModal'));
            modal.show();
        };
    </script>

    <script type="module" src="script/peApp.js?v=<?php echo time(); ?>"></script>
    <script type="module" src="script/peTechModule.js?v=<?php echo time(); ?>"></script>
</body>
</html>


