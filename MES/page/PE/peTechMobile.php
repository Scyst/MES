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

    <!-- Issue Details Modal -->
    <div class="modal fade pe-modal" id="issueDetailsModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-info-circle text-primary me-2"></i> รายละเอียดงานซ่อม</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-3">
                    <div id="detailsModalImageContainer" class="mb-3 text-center" style="display:none; background: #000; border-radius: 8px; overflow: hidden; padding: 10px;">
                        <img id="detailsModalImage" src="" alt="Issue Image" style="max-width: 100%; max-height: 40vh; object-fit: contain;">
                    </div>
                    
                    <h6 class="border-bottom pb-2 mb-2 text-primary"><i class="fas fa-user-edit me-1"></i> ข้อมูลจากผู้แจ้ง</h6>
                    <div class="mb-3" style="font-size: 0.9rem; white-space: pre-wrap; color: var(--pe-text-color);" id="detailsModalIssue"></div>
                    
                    <h6 class="border-bottom pb-2 mb-2 text-success"><i class="fas fa-tools me-1"></i> อัปเดตจากช่าง</h6>
                    <div class="mb-2">
                        <strong style="font-size: 0.85rem; color: var(--pe-text-muted);">สาเหตุของปัญหา (Root Cause):</strong>
                        <div style="font-size: 0.9rem; white-space: pre-wrap; color: var(--pe-text-color);" id="detailsModalRootCause">-</div>
                    </div>
                    <div>
                        <strong style="font-size: 0.85rem; color: var(--pe-text-muted);">การแก้ไข (Action Taken):</strong>
                        <div style="font-size: 0.9rem; white-space: pre-wrap; color: var(--pe-text-color);" id="detailsModalAction">-</div>
                    </div>
                </div>
                <div class="modal-footer bg-light p-2">
                    <button type="button" class="btn btn-secondary w-100" data-bs-dismiss="modal">ปิด</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        window.openIssueDetails = function(woId) {
            if (!window.TechModule) return;
            const wo = window.TechModule.getWorkOrder(woId);
            if (!wo) return;
            
            const imgContainer = document.getElementById('detailsModalImageContainer');
            const img = document.getElementById('detailsModalImage');
            
            if (wo.image_path) {
                img.src = '../../' + wo.image_path;
                imgContainer.style.display = 'block';
            } else {
                img.src = '';
                imgContainer.style.display = 'none';
            }
            
            document.getElementById('detailsModalIssue').innerText = wo.issue_detail || 'ไม่มีรายละเอียดเพิ่มเติม';
            document.getElementById('detailsModalRootCause').innerText = wo.root_cause || '-';
            document.getElementById('detailsModalAction').innerText = wo.action_taken || '-';
            
            const modal = new bootstrap.Modal(document.getElementById('issueDetailsModal'));
            modal.show();
        };
    </script>

    <script type="module" src="script/peApp.js?v=<?php echo time(); ?>"></script>
    <script type="module" src="script/peTechModule.js?v=<?php echo time(); ?>"></script>
</body>
</html>


