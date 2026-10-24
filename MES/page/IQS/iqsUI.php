<?php
/**
 * iqsUI.php — In-process Quality System (IQS) Dashboard & Testing Station
 * Path: MES/MES/page/IQS/iqsUI.php
 */

require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../db.php';

$pageTitle          = 'IQS — Pull Test Inspection';
$pageIcon           = 'fas fa-clipboard-check';
$pageHeaderTitle    = 'IQS ระบบทดสอบแรงดึง';
$pageHeaderSubtitle = 'Spot Weld Pull Test (Audit-Ready)';

$canEdit = hasRole(['creator', 'admin', 'supervisor', 'operator', 'qa', 'qc']);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="css/iqs.css?v=<?php echo file_exists(__DIR__ . '/css/iqs.css') ? filemtime(__DIR__ . '/css/iqs.css') : time(); ?>">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-2 p-md-3">
            <div class="iqs-container">

                <!-- Offline Warning Banner -->
                <div id="offlineBanner" class="offline-banner">
                    <i class="fas fa-wifi-slash me-2"></i>
                    <span>ตรวจพบว่าคุณกำลังออฟไลน์ — ระบบล็อกการบันทึกข้อมูลเพื่อความถูกต้องของเวลา Audit กรุณาตรวจสอบสัญญาณ Wi-Fi</span>
                </div>

                <!-- Sleek Segmented Control Navigation -->
                <div class="iqs-segmented-bar mb-3">
                    <button class="iqs-segment-btn active" id="tab-active-btn" data-bs-toggle="pill" 
                            data-bs-target="#tab-active" type="button" role="tab">
                        <i class="fas fa-tasks me-2"></i><span>การทดสอบประจำรอบ</span>
                    </button>
                    <button class="iqs-segment-btn" id="tab-history-btn" data-bs-toggle="pill" 
                            data-bs-target="#tab-history" type="button" role="tab" onclick="IQS.loadHistory()">
                        <i class="fas fa-history me-2"></i><span>ประวัติ & รายงานออดิท</span>
                    </button>
                </div>

                <div class="tab-content" id="iqsTabContent">

                    <!-- ========================================== -->
                    <!-- TAB 1: ACTIVE INSPECTION ROUND             -->
                    <!-- ========================================== -->
                    <div class="tab-pane fade show active" id="tab-active" role="tabpanel">

                        <!-- Enhanced Empty State / Ready to Start Hero Card -->
                        <div id="noRoundSection" style="display:none;">
                            <div class="iqs-empty-hero">
                                <div class="iqs-pulse-pill">
                                    <span class="iqs-pulse-dot"></span>
                                    <span>พร้อมเริ่มรอบการทดสอบ</span>
                                </div>
                                <div class="iqs-glow-icon-wrap">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                                <h4 class="fw-bold mb-2 text-body">ยังไม่มีรอบการทดสอบที่เปิดอยู่</h4>
                                <p class="text-muted small mb-3">
                                    ระบบบันทึกผลการทดสอบแรงดึง พารามิเตอร์ และรูปถ่ายชิ้นงาน<br class="d-none d-sm-inline">
                                    แบบเรียลไทม์เพื่อรองรับการตรวจ Audit ตามมาตรฐาน
                                </p>

                                <div class="mb-3">
                                    <div class="small fw-bold text-muted mb-2">
                                        <i class="fas fa-clock me-1 text-primary"></i>รอบเวลามาตรฐาน (Standard Time Slots):
                                    </div>
                                    <div class="iqs-slot-chips">
                                        <span class="iqs-slot-chip">08:30 (เช้า)</span>
                                        <span class="iqs-slot-chip">10:30 (สาย)</span>
                                        <span class="iqs-slot-chip">13:00 (บ่าย)</span>
                                        <span class="iqs-slot-chip">15:30 (บ่ายแก่)</span>
                                        <span class="iqs-slot-chip">20:30 (OT ค่ำ)</span>
                                        <span class="iqs-slot-chip">22:30 (OT ดึก)</span>
                                        <span class="iqs-slot-chip">02:30 (กะดึก)</span>
                                    </div>
                                </div>

                                <button class="btn-iqs-primary-lg" data-bs-toggle="modal" data-bs-target="#modalStartRound">
                                    <i class="fas fa-play-circle fa-lg"></i>
                                    <span>เปิดรอบการทดสอบใหม่ (Start Round)</span>
                                </button>
                            </div>
                        </div>

                        <!-- Active Round State -->
                        <div id="activeRoundSection" style="display:none;">

                            <!-- Hero Info Card -->
                            <div class="round-hero-card">
                                <div class="row align-items-center">
                                    <div class="col-md-7">
                                        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                                            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                                                <i class="fas fa-dot-circle me-1"></i>กำลังดำเนินการ (OPEN)
                                            </span>
                                            <span class="hero-meta-badge" id="dispRoundNumber">-</span>
                                            <span class="hero-meta-badge">
                                                <i class="fas fa-sun text-warning me-1"></i>กะ <strong id="dispShift">-</strong>
                                            </span>
                                        </div>
                                        <h3 class="fw-bold mb-1 text-body" id="dispRoundName">-</h3>
                                        <div class="text-muted small mt-1 d-flex flex-wrap gap-3">
                                            <span><i class="fas fa-clock text-info me-1"></i>เริ่ม: <span id="dispStartedAt">-</span></span>
                                            <span><i class="fas fa-users text-primary me-1"></i>ผู้ทดสอบ: <strong id="dispTesters">-</strong></span>
                                        </div>
                                    </div>
                                    <div class="col-md-5 mt-3 mt-md-0 text-md-end">
                                        <div class="d-flex justify-content-between justify-content-md-end align-items-baseline gap-2 mb-1">
                                            <span class="small text-muted fw-bold">ความคืบหน้าการตรวจ</span>
                                            <h4 class="fw-bold text-primary mb-0" id="progressCount">0 / 0</h4>
                                        </div>
                                        <div class="progress-track">
                                            <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Quick Filter Chips -->
                            <div class="iqs-filter-group" id="filterGroup">
                                <button type="button" class="iqs-filter-chip active" data-filter="all" onclick="IQS.filterMachines('all', this)">
                                    <i class="fas fa-layer-group"></i> ทั้งหมด (<span id="cntAll">0</span>)
                                </button>
                                <button type="button" class="iqs-filter-chip" data-filter="pending" onclick="IQS.filterMachines('pending', this)">
                                    <i class="fas fa-hourglass-half text-warning"></i> ยังไม่ตรวจ (<span id="cntPending">0</span>)
                                </button>
                                <button type="button" class="iqs-filter-chip" data-filter="ok" onclick="IQS.filterMachines('ok', this)">
                                    <i class="fas fa-check-circle text-success"></i> ผ่าน OK (<span id="cntOk">0</span>)
                                </button>
                                <button type="button" class="iqs-filter-chip" data-filter="ng" onclick="IQS.filterMachines('ng', this)">
                                    <i class="fas fa-times-circle text-danger"></i> ไม่ผ่าน NG (<span id="cntNg">0</span>)
                                </button>
                                <button type="button" class="iqs-filter-chip" data-filter="skip" onclick="IQS.filterMachines('skip', this)">
                                    <i class="fas fa-forward text-secondary"></i> ข้าม (<span id="cntSkip">0</span>)
                                </button>
                            </div>

                            <!-- Machine Checklist Cards Grid -->
                            <div class="machine-grid" id="machineCardsGrid">
                                <!-- Populated dynamically by IQS.renderMachineCards() -->
                            </div>

                            <!-- Bottom Floating Action Bar -->
                            <div class="bottom-submit-bar" id="bottomSubmitBar" style="display:none;">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="badge bg-primary-subtle text-primary p-2 rounded-circle d-none d-sm-block">
                                        <i class="fas fa-tasks fa-lg"></i>
                                    </div>
                                    <div>
                                        <strong class="text-body d-block small" id="dockProgressText">ตรวจแล้ว 0/0 เครื่อง</strong>
                                        <span class="text-muted" style="font-size: 0.72rem;">พร้อมปิดรอบเพื่อบันทึกประวัติออดิท</span>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-submit-round" id="btnSubmitRound">
                                    <i class="fas fa-check-double me-1"></i> ปิดรอบการทดสอบ
                                </button>
                            </div>

                        </div>

                    </div>

                    <!-- ========================================== -->
                    <!-- TAB 2: HISTORY & AUDIT REPORT              -->
                    <!-- ========================================== -->
                    <div class="tab-pane fade" id="tab-history" role="tabpanel">

                        <div class="card p-3 mb-3 border-0 shadow-sm" style="border-radius: 16px;">
                            <form id="formHistoryFilter" class="row g-2 align-items-end">
                                <div class="col-md-3 col-6">
                                    <label class="form-label small fw-bold text-muted mb-1">ตั้งแต่วันที่</label>
                                    <input type="date" class="form-control" id="histStartDate" value="<?php echo date('Y-m-d', strtotime('-7 days')); ?>">
                                </div>
                                <div class="col-md-3 col-6">
                                    <label class="form-label small fw-bold text-muted mb-1">ถึงวันที่</label>
                                    <input type="date" class="form-control" id="histEndDate" value="<?php echo date('Y-m-d'); ?>">
                                </div>
                                <div class="col-md-3 col-8">
                                    <label class="form-label small fw-bold text-muted mb-1">สถานะ</label>
                                    <select class="form-select" id="histStatus">
                                        <option value="">ทั้งหมด (All Status)</option>
                                        <option value="SUBMITTED">SUBMITTED (ผ่านสมบูรณ์)</option>
                                        <option value="COMPLETED_WITH_NG">COMPLETED_WITH_NG (พบ NG)</option>
                                        <option value="OPEN">OPEN (ยังไม่ปิดรอบ)</option>
                                    </select>
                                </div>
                                <div class="col-md-3 col-4">
                                    <button type="submit" class="btn btn-primary w-100 fw-bold py-2">
                                        <i class="fas fa-search me-1"></i>ค้นหา
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Mobile History Cards Feed (< 768px) -->
                        <div class="d-md-none" id="historyFeedMobile">
                            <!-- Populated dynamically -->
                        </div>

                        <!-- Desktop Table View (>= 768px) -->
                        <div class="card border-0 shadow-sm d-none d-md-block" style="border-radius: 16px; overflow: hidden;">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle mb-0">
                                    <thead class="table-light">
                                        <tr>
                                            <th>เลขที่รอบ</th>
                                            <th>วันที่</th>
                                            <th>ชื่อรอบ / เวลา</th>
                                            <th>กะ</th>
                                            <th>ผู้ทดสอบหลัก</th>
                                            <th>ผลสรุป (เครื่อง)</th>
                                            <th>สถานะ</th>
                                            <th class="text-center">เอกสารออดิท</th>
                                        </tr>
                                    </thead>
                                    <tbody id="historyTableBody">
                                        <tr>
                                            <td colspan="8" class="text-center text-muted py-4">กำลังโหลดข้อมูล...</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    </div>

    <!-- Modal: Start Round -->
    <div class="modal fade" id="modalStartRound" tabindex="-1" aria-labelledby="modalStartRoundLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow" style="border-radius: 20px; overflow: hidden;">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title fw-bold" id="modalStartRoundLabel">
                        <i class="fas fa-play-circle me-2"></i>เปิดรอบการทดสอบใหม่ (Start Round)
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="formCreateRound">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">รอบเวลามาตรฐาน</label>
                            <select class="form-select form-select-lg" id="newRoundTemplate">
                                <option value="">กำลังโหลดแม่แบบ...</option>
                            </select>
                            <small class="text-muted">เลือกแม่แบบเพื่อระบุชื่อรอบและกะโดยอัตโนมัติ</small>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">ชื่อรอบการทดสอบ <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="newRoundName" placeholder="เช่น รอบเช้า (08:30)" required>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted">กะทำงาน</label>
                                <select class="form-select" id="newRoundShift">
                                    <option value="Day">กะกลางวัน (Day)</option>
                                    <option value="OT">กะโอที (OT)</option>
                                    <option value="Night">กะดึก (Night)</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted">ผู้ทดสอบหลัก</label>
                                <input type="text" class="form-control bg-light" value="<?php echo htmlspecialchars($_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'User'); ?>" readonly>
                            </div>
                        </div>

                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted">ผู้ร่วมทดสอบคนที่ 2</label>
                                <select class="form-select" id="coTester1">
                                    <option value="">-- ไม่มี --</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted">ผู้ร่วมทดสอบคนที่ 3</label>
                                <select class="form-select" id="coTester2">
                                    <option value="">-- ไม่มี --</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-2">
                            <label class="form-label fw-bold small text-muted">หมายเหตุเพิ่มเติม</label>
                            <input type="text" class="form-control" id="newRoundNotes" placeholder="บันทึกหมายเหตุหากมี">
                        </div>
                    </div>
                    <div class="modal-footer bg-light px-4 py-3">
                        <button type="button" class="btn btn-outline-secondary px-3" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold">
                            <i class="fas fa-check me-1"></i>เริ่มรอบทดสอบ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Global Loading Spinner Overlay -->
    <div id="iqsLoadingSpinner" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.45); z-index:9999; justify-content:center; align-items:center; backdrop-filter: blur(4px);">
        <div class="spinner-border text-light" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">กำลังประมวลผล...</span>
        </div>
    </div>

    <script src="script/iqs.js?v=<?php echo file_exists(__DIR__ . '/script/iqs.js') ? filemtime(__DIR__ . '/script/iqs.js') : time(); ?>"></script>
</body>
</html>
