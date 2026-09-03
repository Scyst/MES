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
    <div class="container-app">
        <!-- Header -->
        <header class="app-header">
            <h1 class="app-title" id="appHeaderTitle"><i class="fas fa-wrench text-primary"></i> Technician Portal</h1> 
            <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" onclick="window.location.href='../dailyLog/dailyLogUI.php'" title="Back to Main">
                <i class="fas fa-times"></i>
            </button>
        </header>

        <!-- Filter & Search Bar -->
        <div class="px-3 py-2 bg-white shadow-sm d-flex align-items-center" style="position: sticky; top: 70px; z-index: 1030; border-bottom: 1px solid var(--op-border); margin-bottom: 10px;">
            <div class="input-group input-group-sm me-2">
                <span class="input-group-text bg-light border-end-0 text-muted" style="border-radius: 20px 0 0 20px;"><i class="fas fa-search"></i></span>
                <input type="text" class="form-control border-start-0 bg-light" id="techSearchInput" placeholder="ค้นหาใบงาน, ปัญหา..." oninput="window.TechModule && window.TechModule.onSearchChange()" style="border-radius: 0 20px 20px 0;">
            </div>
            <button class="btn btn-sm btn-primary flex-shrink-0 shadow-sm d-flex align-items-center justify-content-center" onclick="window.TechModule && window.TechModule.openAdvancedFilter()" style="width: 34px; height: 34px; border-radius: 12px; padding: 0;">
                <i class="fas fa-filter"></i>
            </button>
        </div>

    

        <!-- Section: My Jobs -->
        <div id="section-myjobs" class="app-section active">
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
            <div class="tech-feed" id="woFeedContainer-all">
                <!-- Rendered via JS -->
                <div class="tech-empty">
                    <i class="fas fa-spinner fa-spin"></i>
                    <div>กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        </div>

        <!-- Floating Action Button -->
        <?php if (hasPermission(['create_maintenance'])): ?>
        <button class="tech-fab" onclick="TechModule.loadData()">
            <i class="fas fa-sync-alt"></i>
        </button>
        <?php endif; ?>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
            <div class="nav-item-btn active text-primary" data-target="section-myjobs" data-title="งานซ่อมของฉัน" data-icon="fa-user-cog" data-color="text-primary" onclick="TechModule.setFilter('my')">
                <i class="fas fa-user-cog"></i>
                <span>งานของฉัน</span>
            </div>
            <div class="nav-item-btn text-secondary" data-target="section-alljobs" data-title="งานซ่อมทั้งหมด" data-icon="fa-list" data-color="text-secondary" onclick="TechModule.setFilter('all')">
                <i class="fas fa-list"></i>
                <span>งานทั้งหมด</span>
            </div>
        </nav>

    <!-- Advanced Filter Modal -->
    <div class="modal fade pe-modal" id="techAdvancedFilterModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light border-bottom-0">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-filter text-primary me-2"></i> ตัวกรองขั้นสูง</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4 bg-white">
                    <div class="mb-3">
                        <label class="form-label text-muted" style="font-size:0.75rem; font-weight:700;"><i class="fas fa-tasks me-1"></i> สถานะงาน</label>
                        <select class="form-select" id="techFilterStatus">
                            <option value="all">ทั้งหมด</option>
                            <option value="Open">รอดำเนินการ (Open)</option>
                            <option value="Assigned">มอบหมายแล้ว (Assigned)</option>
                            <option value="In Progress">กำลังซ่อม (In Progress)</option>
                            <option value="Completed">เสร็จสิ้น (Completed)</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted" style="font-size:0.75rem; font-weight:700;"><i class="fas fa-grip-lines me-1"></i> ไลน์การผลิต</label>
                        <select class="form-select" id="techFilterLine">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                    <div class="mb-3">
                        <label class="form-label text-muted" style="font-size:0.75rem; font-weight:700;"><i class="fas fa-industry me-1"></i> เครื่องจักร</label>
                        <select class="form-select" id="techFilterMachine">
                            <option value="">ทั้งหมด</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer bg-light border-top-0 p-3 d-flex justify-content-between flex-row flex-nowrap gap-2">
                    <button type="button" class="btn btn-outline-secondary rounded-pill w-50" onclick="window.TechModule && window.TechModule.resetAdvancedFilter()">ล้างค่า</button>
                    <button type="button" class="btn btn-primary rounded-pill fw-bold w-50" onclick="window.TechModule && window.TechModule.applyAdvancedFilter()">ยืนยัน</button>
                </div>
            </div>
        </div>
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
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-light border-bottom-0">
                    <h5 class="modal-title fw-bold text-dark"><i class="fas fa-info-circle text-primary me-2"></i> รายละเอียดงานซ่อม</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-3 bg-light bg-opacity-50">
                    <div id="detailsModalImageContainer" class="mb-3 text-center shadow-sm" style="display:none; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid var(--op-border);">
                        <img id="detailsModalImage" src="" alt="Issue Image" style="width: 100%; max-height: 350px; object-fit: cover;">
                    </div>
                    
                    <div class="app-card mb-3 p-3 bg-white" style="box-shadow: var(--op-shadow-sm); margin:0;">
                        <h6 class="border-bottom pb-2 mb-3 fw-bold text-primary"><i class="fas fa-file-invoice me-1"></i> ข้อมูลแจ้งซ่อม</h6>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">เลขที่ใบงาน</div>
                                <div class="fw-bold text-dark" id="detailsModalWoNum" style="font-size: 0.95rem;">-</div>
                            </div>
                            <div class="col-6 text-end">
                                <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">สถานะ</div>
                                <div id="detailsModalStatus" style="font-size: 0.95rem;">-</div>
                            </div>
                            <div class="col-12 mt-2">
                                <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">เครื่องจักร</div>
                                <div class="text-dark fw-bold" id="detailsModalMachine" style="font-size: 0.95rem;">-</div>
                            </div>
                            <div class="col-6 mt-2">
                                <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">เวลาแจ้ง</div>
                                <div class="text-dark" id="detailsModalTime" style="font-size: 0.9rem;">-</div>
                            </div>
                            <div class="col-6 mt-2 text-end">
                                <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">ผู้แจ้ง</div>
                                <div class="text-dark" id="detailsModalRequester" style="font-size: 0.9rem;">-</div>
                            </div>
                        </div>
                        
                        <div class="text-muted mt-2" style="font-size: 0.75rem; text-transform:uppercase;">หัวข้อปัญหา</div>
                        <div class="fw-bold text-dark mb-2" id="detailsModalTitle" style="font-size: 1rem;">-</div>
                        
                        <div class="text-muted mt-2" style="font-size: 0.75rem; text-transform:uppercase;">รายละเอียดปัญหา</div>
                        <div class="p-2 bg-light rounded border mt-1" style="font-size: 0.95rem; white-space: pre-wrap; color: var(--op-text);" id="detailsModalIssue"></div>
                    </div>
                    
                    <div class="app-card mb-0 p-3 bg-white" style="box-shadow: var(--op-shadow-sm); margin:0;">
                        <h6 class="border-bottom pb-2 mb-3 fw-bold text-success"><i class="fas fa-tools me-1"></i> อัปเดตจากช่าง</h6>
                        <div class="mb-3">
                            <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">ช่างผู้รับผิดชอบ</div>
                            <div class="text-dark fw-bold" id="detailsModalTech" style="font-size: 0.95rem;">-</div>
                        </div>
                        <div class="mb-3">
                            <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">สาเหตุของปัญหา (Root Cause)</div>
                            <div class="p-2 bg-light rounded border mt-1" style="font-size: 0.95rem; white-space: pre-wrap; color: var(--op-text);" id="detailsModalRootCause">-</div>
                        </div>
                        <div>
                            <div class="text-muted" style="font-size: 0.75rem; text-transform:uppercase;">การแก้ไข (Action Taken)</div>
                            <div class="p-2 bg-light rounded border mt-1" style="font-size: 0.95rem; white-space: pre-wrap; color: var(--op-text);" id="detailsModalAction">-</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer bg-light border-top-0 p-3">
                    <button type="button" class="btn btn-secondary w-100 rounded-pill fw-bold" data-bs-dismiss="modal">ปิดหน้าต่าง</button>
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
            
            // Populate Data
            document.getElementById('detailsModalWoNum').innerText = wo.wo_number || '-';
            
            // Status Badge
            let statusClass = 'tech-status-Open';
            if (wo.status === 'Assigned') statusClass = 'tech-status-Assigned';
            else if (wo.status === 'In Progress') statusClass = 'tech-status-InProgress';
            else if (wo.status === 'Completed') statusClass = 'tech-status-Completed';
            else if (wo.status === 'Cancelled') statusClass = 'tech-status-Cancelled';
            
            document.getElementById('detailsModalStatus').innerHTML = `<span class="tech-status-badge ${statusClass}">${wo.status}</span>`;
            
            document.getElementById('detailsModalMachine').innerText = wo.machine_display_name || wo.machine_name || '-';
            document.getElementById('detailsModalTime').innerText = wo.requested_at ? wo.requested_at.substring(0, 16) : '-';
            document.getElementById('detailsModalRequester').innerText = wo.requested_by || '-';
            
            document.getElementById('detailsModalTitle').innerText = wo.issue_title || '-';
            document.getElementById('detailsModalIssue').innerText = wo.issue_detail || 'ไม่มีรายละเอียดเพิ่มเติม';
            
            document.getElementById('detailsModalTech').innerText = wo.assigned_to || '-';
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
