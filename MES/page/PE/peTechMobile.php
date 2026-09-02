<?php
// MES/page/PE/peTechMobile.php
require_once __DIR__ . '/../components/init.php';

requirePermission(['view_maintenance', 'view_production', 'view_dashboard']);

$currentUser = $_SESSION['user'];
$pageTitle = "Technician Portal";

// Check if user has photo
$empId = $currentUser['emp_id'] ?? '';
$photoPath = !empty($empId) ? "../../assets/img/employees/{$empId}.jpg" : "";
$hasPhoto = !empty($empId) && file_exists(__DIR__ . '/../../' . $photoPath);
$profileUrl = $hasPhoto ? $photoPath . "?v=" . time() : "";
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
    <div class="container-app">
        <!-- Header -->
        <header class="app-header">
            <h1 class="app-title" id="appHeaderTitle"><i class="fas fa-wrench text-primary"></i> Technician Portal</h1> 
            <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" onclick="window.location.href='../dailyLog/dailyLogUI.php'" title="Back to Main">
                <i class="fas fa-times"></i>
            </button>
        </header>

        <!-- Section: My Jobs -->
        <div id="section-myjobs" class="app-section active">
            <div class="app-card mb-3 text-center bg-primary bg-opacity-10 border-primary border-opacity-25" style="padding: 10px; margin-top: 10px;">
                <h6 class="fw-bold text-primary mb-1"><i class="fas fa-user-cog me-1"></i> งานซ่อมของฉัน</h6>
                <small class="text-muted">รายการใบแจ้งซ่อมที่มอบหมายให้คุณ</small>
            </div>
            
            <div class="tech-feed" id="woFeedContainer-my">
                <!-- Rendered via JS -->
                <div class="tech-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <div>กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        </div>

        <!-- Section: All Jobs -->
        <div id="section-alljobs" class="app-section">
            <div class="app-card mb-3 text-center bg-secondary bg-opacity-10 border-secondary border-opacity-25" style="padding: 10px; margin-top: 10px;">
                <h6 class="fw-bold text-secondary mb-1"><i class="fas fa-list me-1"></i> งานซ่อมทั้งหมด</h6>
                <small class="text-muted">รายการใบแจ้งซ่อมในระบบทั้งหมด</small>
            </div>
            
            <div class="tech-feed" id="woFeedContainer-all">
                <!-- Rendered via JS -->
                <div class="tech-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <div>กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        </div>

        <!-- Section: Profile -->
        <div id="section-profile" class="app-section">
            <div class="app-card text-center mt-3">
                <h5 class="fw-bold mb-4 text-primary"><i class="fas fa-id-badge me-2"></i> โปรไฟล์พนักงาน</h5>
                
                <div class="profile-photo-container mb-3" onclick="document.getElementById('profileImageUpload').click()">
                    <img id="profileDisplay" src="<?php echo $profileUrl; ?>" style="display: <?php echo $hasPhoto ? 'block' : 'none'; ?>;">
                    <i id="profileIconPlaceholder" class="fas fa-user" style="font-size: 5rem; color: #94a3b8; display: <?php echo $hasPhoto ? 'none' : 'block'; ?>;"></i>
                    <div class="profile-photo-overlay">
                        <i class="fas fa-camera"></i> แตะเพื่อเปลี่ยนรูป
                    </div>
                </div>
                
                <input type="file" id="profileImageUpload" accept="image/*" style="display: none;">
                
                <h4 class="mb-1 text-dark"><?php echo htmlspecialchars($currentUser['fullname'] ?? $currentUser['username']); ?></h4>
                <p class="text-muted mb-1"><i class="fas fa-id-card"></i> รหัสพนักงาน: <?php echo htmlspecialchars($empId ?: 'ไม่ได้ระบุ'); ?></p>
                <p class="text-muted mb-3"><i class="fas fa-user-tag"></i> ตำแหน่ง: <?php echo htmlspecialchars($currentUser['position'] ?? $currentUser['role']); ?></p>
                
                <hr class="border-secondary opacity-25">
                
                <p class="text-start text-muted" style="font-size: 0.85rem;">
                    <strong>คำแนะนำ:</strong> รูปภาพโปรไฟล์จะถูกนำไปใช้ใน LOTO Operator Cards (การ์ดความปลอดภัยช่าง) กรุณาใช้ภาพถ่ายหน้าตรงที่เห็นใบหน้าชัดเจน
                </p>
                
                <button class="pe-btn pe-btn-danger w-100 mt-3" onclick="window.location.href='../../auth/logout.php'">
                    <i class="fas fa-sign-out-alt me-1"></i> ออกจากระบบ
                </button>
            </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
            <button class="nav-item-btn active" data-target="section-myjobs" onclick="TechModule.setFilter('my')" data-title="งานของฉัน" data-icon="fa-user-cog" data-color="text-primary"> 
                <i class="fas fa-user-cog"></i><span>งานของฉัน</span>
            </button>
            <button class="nav-item-btn" data-target="section-alljobs" onclick="TechModule.setFilter('all')" data-title="งานทั้งหมด" data-icon="fa-list" data-color="text-secondary"> 
                <i class="fas fa-list"></i><span>งานทั้งหมด</span>
            </button>
            <button class="nav-item-btn" data-target="section-profile" data-title="โปรไฟล์" data-icon="fa-user-circle" data-color="text-dark">
                <i class="fas fa-user-circle"></i><span>โปรไฟล์</span>
            </button>
        </nav>
    </div>

    <!-- Modals -->
    <?php include 'components/modals/modal_quick_close.php'; ?>
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
            <!-- Action buttons moved to bottom to enforce 1:1 ratio for profiles if needed, but we keep flexible here -->
            <div class="mt-2" id="cropRatioButtons">
                <div class="btn-group" role="group" aria-label="Aspect Ratio">
                    <button type="button" class="btn btn-outline-light btn-sm btn-aspect active" data-ratio="1">1:1</button>
                    <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="1.3333333333333333">4:3</button>
                    <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="0.75">3:4</button>
                    <button type="button" class="btn btn-outline-light btn-sm btn-aspect" data-ratio="NaN">อิสระ</button>
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
