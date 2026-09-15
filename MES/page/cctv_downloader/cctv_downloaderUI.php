<?php
//arp -a | findstr /i "58-50-ed-41-08-74"

// ดึงไฟล์ init.php ซึ่งรวม config, auth, logger, i18n และ cache-control พื้นฐานไว้แล้ว
require_once __DIR__ . '/../components/init.php';

// ตั้งค่า Timezone ให้เป็นประเทศไทย (แก้ปัญหาเวลาเริ่มโหลดเพี้ยน - เฉพาะหน้านี้)
date_default_timezone_set('Asia/Bangkok');

$pageTitle          = 'CCTV Downloader';
$pageIcon           = 'fas fa-video';
$pageHeaderTitle    = 'CCTV Downloader';
$pageHeaderSubtitle = '<span style="opacity:0.55;font-size:0.7rem">v1.0</span>';

$message = $_SESSION['cctv_msg'] ?? '';
$messageType = $_SESSION['cctv_msg_type'] ?? '';
unset($_SESSION['cctv_msg'], $_SESSION['cctv_msg_type']);


?>
<!DOCTYPE html>
<html lang="th">
<head>
    <!-- เรียกใช้ CSS/JS กลางของระบบ -->
    <?php include_once '../components/common_head.php'; ?>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/cctv_downloader_v3.css?v=<?php echo filemtime(__DIR__ . '/css/cctv_downloader_v3.css'); ?>">
    <link rel="stylesheet" href="css/link_loading.css?v=<?php echo filemtime(__DIR__ . '/css/link_loading.css'); ?>">
</head>
<body class="layout-top-header">

    <!-- เรียกใช้แถบเมนูด้านบนของระบบ -->
    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-4">
            
            <div id="appContainer">
                <div class="glass-card mb-4">
                    <div class="card-title">
                        <i class="fas fa-video"></i> ระบบดาวน์โหลดวิดีโอ CCTV
                    </div>
                    <div class="card-body px-0 py-2">
                    <?php if ($message): ?>
                        <div class="alert alert-<?php echo $messageType; ?> alert-dismissible fade show" role="alert">
                            <?php echo $message; ?>
                            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                        </div>
                    <?php endif; ?>

                    <form id="downloadForm">
                        <div class="row">
                            <div class="col-12 mb-4">
                                <label for="camera_ip" class="form-label fw-bold">IP Address ของกล้อง <span id="camStatusBadge" class="badge bg-secondary ms-2" style="font-weight:normal;"><i class="fas fa-circle-notch fa-spin me-1" style="display:none;" id="camStatusSpinner"></i><span id="camStatusText">รอรับ IP...</span></span></label>
                                <div class="input-group flex-nowrap">
                                    <span class="input-group-text"><i class="fas fa-network-wired"></i></span>
                                    <input type="text" class="form-control" id="camera_ip" name="camera_ip" placeholder="10.1.48.131" required>
                                    <button type="button" class="btn btn-outline-info flex-shrink-0" id="btnPreview" title="ทดสอบภาพ"><i class="fas fa-eye"></i><span class="d-none d-sm-inline ms-1">ทดสอบภาพ</span></button>
                                </div>
                            </div>
                        </div>

                        <!-- พื้นที่แสดงผล Preview -->
                        <div id="previewContainer" class="mb-4 text-center position-relative bg-light p-3 rounded" style="display: none; border: 1px dashed #ccc;">
                            <button type="button" class="btn-close position-absolute top-0 end-0 m-2" id="btnClosePreview" aria-label="Close"></button>
                            <div><span id="previewStatus" class="badge bg-secondary mb-3"><i class="fas fa-spinner fa-spin"></i> กำลังรอสัญญาณ...</span></div>
                            <img id="previewImage" src="" alt="Live Preview" class="img-fluid rounded shadow-sm" style="display: none; max-height: 400px; width: auto; margin: 0 auto;">
                            <div id="previewLog" class="small mt-3" style="display: none; text-align: left; white-space: pre-wrap; font-family: monospace;"></div>
                        </div>
                        
                        <div id="batchContainer">
                            <div class="row batch-row align-items-end mb-3 pb-3 border-bottom">
                                <div class="col-12 mb-2">
                                    <span class="row-num-label badge bg-secondary" style="font-size: 0.75rem; font-weight: 600; letter-spacing: 0.3px;">รายการที่ <span class="row-num">1</span></span>
                                </div>
                                <div class="col-md-3 mb-2">
                                    <label class="form-label fw-bold">เวลาเริ่มต้น</label>
                                    <input type="datetime-local" class="form-control start-time-input" required>
                                </div>
                                <div class="col-md-3 mb-2">
                                    <label class="form-label fw-bold">เวลาสิ้นสุด</label>
                                    <input type="datetime-local" class="form-control end-time-input" required>
                                </div>
                                <div class="col-md-4 mb-2">
                                    <label class="form-label fw-bold">ชื่อไฟล์ที่จะบันทึก</label>
                                    <div class="input-group">
                                        <input type="text" class="form-control filename-input" placeholder="เช่น evidence_01" required>
                                        <span class="input-group-text">.mp4</span>
                                    </div>
                                </div>
                                <div class="col-md-2 mb-2 text-end">
                                    <button type="button" class="btn btn-outline-danger btn-remove-row w-100" style="display: none;"><i class="fas fa-times"></i> ลบ</button>
                                    <button type="button" class="btn btn-outline-secondary btn-clear-row w-100 mt-1"><i class="fas fa-eraser"></i> เคลีย</button>
                                </div>
                                
                                <!-- พื้นที่แสดงการคำนวณเวลา (แยกแต่ละแถว) -->
                                <div class="col-12 mt-2 est-time-container" style="display: none; font-size: 0.90rem; font-weight: 500;">
                                    <i class="fas fa-clock me-1 text-primary"></i> <span class="est-time-text text-primary"></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-4">
                            <button type="button" id="btnAddRow" class="btn btn-outline-secondary btn-sm"><i class="fas fa-plus"></i> เพิ่มรายการดาวน์โหลด</button>
                            <button type="button" id="btnLinkLoading" class="btn btn-outline-primary btn-sm ms-2" data-bs-toggle="modal" data-bs-target="#linkLoadingModal"><i class="fas fa-link me-1"></i>Link Loading Report <span class="badge bg-primary ms-1" id="linkBadgeCount" style="display: none;">0</span></button>
                        </div>
                        <!-- พื้นที่แสดงสถานะโหลดผ่าน AJAX -->
                        <div id="downloadStatusContainer" class="alert alert-info mt-3" style="display: none;">
                            <i class="fas fa-spinner fa-spin me-2" id="downloadSpinner"></i> <span id="downloadStatusText">กำลังดำเนินการ...</span>
                        </div>

                        <div class="d-grid mt-2">
                            <button type="submit" class="btn btn-primary btn-lg" id="btnDownload"><i class="fas fa-download me-2"></i> สั่งดาวน์โหลดวิดีโอ</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- รายการไฟล์ที่ดาวน์โหลดแล้ว -->
            <div class="glass-card mt-4">
                <div class="card-title d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-3">
                    <div class="fw-bold" style="font-size: 1.1rem;">
                        <i class="fas fa-server text-info"></i> ไฟล์วิดีโอในระบบ (Server Storage)
                    </div>
                    <div class="d-flex flex-column flex-sm-row gap-2 flex-grow-1 ms-lg-3 justify-content-lg-end">
                        <input type="text" id="searchInput" class="form-control form-control-sm flex-grow-1" placeholder="ค้นหาชื่อวิดีโอ..." style="max-width: 500px;">
                        <div class="input-group input-group-sm flex-shrink-0" style="width: auto;">
                            <span class="input-group-text bg-white"><i class="fas fa-calendar-alt text-muted"></i></span>
                            <input type="date" id="dateFilterInput" class="form-control" title="กรองจากเวลาเริ่มต้นวิดีโอ">
                            <button class="btn btn-outline-secondary" type="button" id="btnClearDateFilter" title="ล้างวันที่" style="border-color: #ced4da;"><i class="fas fa-times"></i></button>
                        </div>
                        <select id="sortSelect" class="form-select form-select-sm flex-shrink-0" style="width: auto; min-width: 220px;">
                            <option value="date_dl_desc">เรียงตาม: วันที่ดาวน์โหลด (ใหม่ล่าสุด)</option>
                            <option value="date_dl_asc">เรียงตาม: วันที่ดาวน์โหลด (เก่าสุด)</option>
                            <option value="name_asc">เรียงตาม: ชื่อไฟล์ (A-Z)</option>
                            <option value="name_desc">เรียงตาม: ชื่อไฟล์ (Z-A)</option>
                            <option value="date_start_desc">เรียงตาม: เวลาเริ่มต้นวิดีโอ (ใหม่ล่าสุด)</option>
                            <option value="date_start_asc">เรียงตาม: เวลาเริ่มต้นวิดีโอ (เก่าสุด)</option>
                                    </select>
                                </div>
                            </div>
                <div class="card-body px-0 py-2" style="overflow-x: auto;">
                    <ul class="list-group list-group-flush" id="file-list-container" style="min-width: 700px;">
                        <div class="text-center p-4">
                            <i class="fas fa-spinner fa-spin text-primary fs-3"></i>
                            <div class="mt-2 text-muted">กำลังโหลดข้อมูล...</div>
                        </div>
                    </ul>
                </div>
            </div>

            </div> <!-- End appContainer -->
        </div>
    </div>

    <script src="script/cctv_downloader.js?v=<?php echo filemtime(__DIR__ . '/script/cctv_downloader.js'); ?>"></script>

    <!-- Link Loading Report Modal -->
    <div class="modal fade" id="linkLoadingModal" tabindex="-1" aria-labelledby="linkLoadingModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content link-modal-content">
                <div class="modal-header link-modal-header">
                    <h5 class="modal-title" id="linkLoadingModalLabel">
                        <i class="fas fa-link me-2"></i>Link Loading Report
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body link-modal-body">
                    <div class="link-search-area d-flex gap-2 mb-3 align-items-end">
                        <div class="flex-grow-1">
                            <label for="linkDateInput" class="form-label fw-bold mb-1">เลือกวันที่</label>
                            <input type="date" class="form-control" id="linkDateInput">
                        </div>
                        <button type="button" class="btn btn-primary" id="btnFetchLoading">
                            <i class="fas fa-search me-1"></i> ค้นหา
                        </button>
                    </div>

                    <div id="linkResultInfo" class="mb-3" style="display: none;">
                        <span class="badge link-result-badge bg-info"><i class="fas fa-list me-1"></i> พบ <span id="linkResultCount">0</span> รายการ</span>
                    </div>

                    <div id="linkLoadingState" class="link-loading-state" style="display: none;">
                        <i class="fas fa-spinner fa-spin text-primary fs-3"></i>
                        <div class="mt-2 text-muted">กำลังโหลดข้อมูลจาก Database...</div>
                    </div>

                    <div id="linkEmptyState" class="link-empty-state" style="display: none;">
                        <i class="fas fa-inbox text-muted" style="font-size: 2.5rem;"></i>
                        <div class="text-muted mt-2">ไม่พบรายการ Loading Report ที่ COMPLETED ในวันที่เลือก</div>
                    </div>

                    <div id="linkTableContainer" style="display: none;">
                        <div class="link-table-wrap">
                            <table class="table table-hover link-table mb-0">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;"><input type="checkbox" class="form-check-input" id="linkSelectAll" title="เลือกทั้งหมด"></th>
                                        <th style="width: 35px;">#</th>
                                        <th style="width: 60px;">ID</th>
                                        <th>PO Number</th>
                                        <th>Container</th>
                                        <th>เวลาเริ่ม</th>
                                        <th>เวลาจบ</th>
                                        <th>สถานะ</th>
                                    </tr>
                                </thead>
                                <tbody id="linkTableBody"></tbody>
                            </table>
                        </div>
                    </div>

                    <div id="linkInlineMsg" class="mt-2" style="display: none;"></div>
                </div>
                <div class="modal-footer link-modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">ปิด</button>
                    <button type="button" class="btn btn-primary" id="btnApplyLink" disabled>
                        <i class="fas fa-plus-circle me-1"></i> เติมลงฟอร์ม (<span id="linkSelectedCount">0</span> รายการ)
                    </button>
                </div>
            </div>
        </div>
    </div>

    <script src="script/link_loading.js?v=<?php echo filemtime(__DIR__ . '/script/link_loading.js'); ?>"></script>
</body>
</html>
