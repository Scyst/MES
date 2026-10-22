<?php
/**
 * iqsUI.php — In-process Quality System (IQS) Dashboard & Testing Station
 * Path: MES/MES/page/IQS/iqsUI.php
 */

require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../db.php';

$pageTitle          = 'In-process Quality System (IQS)';
$pageIcon           = 'fas fa-clipboard-check';
$pageHeaderTitle    = 'IQS — บันทึกการทดสอบแรงดึง & จุดเชื่อม Spot';
$pageHeaderSubtitle = '<span style="opacity:0.65;font-size:0.75rem">Pull Test & Parameter Verification (Audit-Ready)</span>';

$canEdit = hasRole(['creator', 'admin', 'supervisor', 'operator', 'qa', 'qc']);
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <link rel="stylesheet" href="css/iqs.css?v=<?php echo file_exists(__DIR__ . '/css/iqs.css') ? filemtime(__DIR__ . '/css/iqs.css') : '1'; ?>">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body class="layout-top-header bg-body-tertiary">

    <?php include '../components/php/top_header.php'; ?>

    <div class="page-container">
        <div id="main-content" class="p-3">
            <div class="iqs-container">

                <!-- Offline Warning Banner -->
                <div id="offlineBanner" class="offline-banner">
                    <i class="fas fa-wifi-slash me-2"></i>
                    <span>ตรวจพบว่าคุณกำลังออฟไลน์ — ระบบล็อกการบันทึกข้อมูลเพื่อความถูกต้องของเวลา Audit กรุณาตรวจสอบสัญญาณ Wi-Fi</span>
                </div>

                <!-- Navigation Tabs -->
                <ul class="nav nav-pills mb-3" id="iqsTabs" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active px-4 py-2 fw-bold" id="tab-active-btn" data-bs-toggle="pill" 
                                data-bs-target="#tab-active" type="button" role="tab">
                            <i class="fas fa-tasks me-2"></i>การทดสอบประจำรอบ
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link px-4 py-2 fw-bold" id="tab-history-btn" data-bs-toggle="pill" 
                                data-bs-target="#tab-history" type="button" role="tab" onclick="IQS.loadHistory()">
                            <i class="fas fa-history me-2"></i>ประวัติ & รายงานออดิท
                        </button>
                    </li>
                </ul>

                <div class="tab-content" id="iqsTabContent">

                    <!-- ========================================== -->
                    <!-- TAB 1: ACTIVE INSPECTION ROUND             -->
                    <!-- ========================================== -->
                    <div class="tab-pane fade show active" id="tab-active" role="tabpanel">

                        <!-- No Active Round State -->
                        <div id="noRoundSection" style="display:none;" class="text-center py-5">
                            <div class="card p-5 border-0 shadow-sm mx-auto" style="max-width: 520px; border-radius: 16px;">
                                <div class="mb-3">
                                    <i class="fas fa-clipboard-list text-primary" style="font-size: 3.5rem;"></i>
                                </div>
                                <h4 class="fw-bold mb-2">ยังไม่มีรอบการทดสอบที่เปิดอยู่</h4>
                                <p class="text-muted mb-4">
                                    เริ่มต้นการทดสอบแรงดึงประจำช่วงเวลาตามมาตรฐาน เพื่อบันทึกพารามิเตอร์และรูปถ่ายเข้าสู่ระบบ
                                </p>
                                <button class="btn btn-primary btn-lg fw-bold py-3 px-4 shadow-sm" 
                                        data-bs-toggle="modal" data-bs-target="#modalStartRound" style="border-radius: 10px;">
                                    <i class="fas fa-plus-circle me-2"></i>เริ่มรอบการทดสอบใหม่
                                </button>
                            </div>
                        </div>

                        <!-- Active Round State -->
                        <div id="activeRoundSection" style="display:none;">

                            <!-- Hero Info Card -->
                            <div class="round-hero-card">
                                <div class="row align-items-center">
                                    <div class="col-md-7">
                                        <div class="d-flex align-items-center gap-2 mb-1">
                                            <span class="badge bg-success px-2 py-1">กำลังดำเนินการ (OPEN)</span>
                                            <span class="fw-bold text-secondary" id="dispRoundNumber">-</span>
                                        </div>
                                        <h3 class="fw-bold text-dark mb-1" id="dispRoundName">-</h3>
                                        <div class="text-muted small">
                                            <span><i class="fas fa-sun me-1 text-warning"></i>กะ: <strong id="dispShift">-</strong></span>
                                            <span class="ms-3"><i class="fas fa-clock me-1 text-info"></i>เริ่ม: <span id="dispStartedAt">-</span></span>
                                        </div>
                                        <div class="text-muted small mt-1">
                                            <i class="fas fa-users me-1 text-primary"></i>ผู้ทดสอบ: <strong id="dispTesters">-</strong>
                                        </div>
                                    </div>
                                    <div class="col-md-5 mt-3 mt-md-0 text-md-end">
                                        <div class="fw-bold text-muted small mb-1">ความคืบหน้าการทดสอบ</div>
                                        <h4 class="fw-bold text-primary mb-0" id="progressCount">0 / 0</h4>
                                        <div class="progress-track">
                                            <div class="progress-fill" id="progressFill" style="width: 0%;"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Machine Checklist Cards Grid -->
                            <div class="machine-grid" id="machineCardsGrid">
                                <!-- Populated dynamically by IQS.renderMachineCards() -->
                            </div>

                            <!-- Bottom Floating Submit Bar -->
                            <div class="bottom-submit-bar" id="bottomSubmitBar" style="display:none;">
                                <div>
                                    <strong class="text-dark d-block">ตรวจสอบผลการทดสอบให้ครบทุกเครื่อง</strong>
                                    <span class="text-muted small">เครื่องที่ไม่มีงานกรุณาเปิดสวิตช์ "ข้าม" พร้อมระบุเหตุผล</span>
                                </div>
                                <button type="button" class="btn btn-success btn-lg px-4 fw-bold shadow-sm" id="btnSubmitRound">
                                    <i class="fas fa-check-double me-2"></i>ปิดรอบการทดสอบ (Submit Round)
                                </button>
                            </div>

                        </div>

                    </div>

                    <!-- ========================================== -->
                    <!-- TAB 2: HISTORY & AUDIT REPORT              -->
                    <!-- ========================================== -->
                    <div class="tab-pane fade" id="tab-history" role="tabpanel">

                        <div class="card p-3 mb-3 border-0 shadow-sm" style="border-radius: 12px;">
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
                                    <button type="submit" class="btn btn-primary w-100 fw-bold">
                                        <i class="fas fa-search me-1"></i>ค้นหา
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
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
            <div class="modal-content border-0 shadow" style="border-radius: 16px;">
                <div class="modal-header bg-primary text-white" style="border-top-left-radius: 16px; border-top-right-radius: 16px;">
                    <h5 class="modal-title fw-bold" id="modalStartRoundLabel">
                        <i class="fas fa-play-circle me-2"></i>เปิดรอบการทดสอบใหม่ (Start Round)
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <form id="formCreateRound">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">รอบเวลามาตรฐาน</label>
                            <select class="form-select" id="newRoundTemplate">
                                <option value="">กำลังโหลดแม่แบบ...</option>
                            </select>
                            <small class="text-muted">เลือกแม่แบบเพื่อระบุชื่อรอบและกะโดยอัตโนมัติ</small>
                        </div>

                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">ชื่อรอบการทดสอบ <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="newRoundName" placeholder="เช่น รอบเช้า (08:30) หรือ รอบพิเศษหลังปรับจิ๊ก" required>
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
                                <select class="form-select form-select-sm" id="coTester1">
                                    <option value="">-- ไม่มี --</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label fw-bold small text-muted">ผู้ร่วมทดสอบคนที่ 3</label>
                                <select class="form-select form-select-sm" id="coTester2">
                                    <option value="">-- ไม่มี --</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-2">
                            <label class="form-label fw-bold small text-muted">หมายเหตุเพิ่มเติม</label>
                            <input type="text" class="form-control form-control-sm" id="newRoundNotes" placeholder="บันทึกหมายเหตุหากมี">
                        </div>
                    </div>
                    <div class="modal-footer bg-light px-4 py-3" style="border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold">
                            <i class="fas fa-check me-1"></i>เริ่มรอบทดสอบ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Global Loading Spinner Overlay -->
    <div id="iqsLoadingSpinner" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.3); z-index:9999; justify-content:center; align-items:center;">
        <div class="spinner-border text-light" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">กำลังประมวลผล...</span>
        </div>
    </div>

    <script src="script/iqs.js?v=<?php echo file_exists(__DIR__ . '/script/iqs.js') ? filemtime(__DIR__ . '/script/iqs.js') : '1'; ?>"></script>
</body>
</html>
