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
                <!-- Sleek Segmented Control Navigation (Responsive & Overflow-Safe) -->
                <div class="iqs-segmented-bar mb-3">
                    <button class="iqs-segment-btn active" id="tab-active-btn" type="button" onclick="IQS.switchTab('active')">
                        <i class="fas fa-tasks me-1"></i>
                        <span>การทดสอบประจำรอบ</span>
                    </button>
                    <button class="iqs-segment-btn" id="tab-history-btn" type="button" onclick="IQS.switchTab('history')">
                        <i class="fas fa-history me-1"></i>
                        <span class="d-none d-sm-inline">ประวัติ & รายงานออดิท</span>
                        <span class="d-inline d-sm-none">ประวัติ & ออดิท</span>
                    </button>
                </div>

                <div class="tab-content" id="iqsTabContent">

                    <!-- ========================================== -->
                    <!-- TAB 1: INTERACTIVE MACHINE INSPECTION COCKPIT -->
                    <!-- ========================================== -->
                    <div class="tab-pane fade show active" id="tab-active" role="tabpanel">

                        <!-- Audit Missed Slot Notification Banner (Shown if any slot was missed) -->
                        <div id="auditMissedAlertBanner" class="mb-3" style="display: none;"></div>

                        <!-- Top Cockpit Control Strip -->
                        <div class="cockpit-header-strip mb-3">
                            <div class="cockpit-strip-inner">
                                <!-- Left: Slot Pill -->
                                <div class="cockpit-strip-left">
                                    <div class="cockpit-slot-pill" id="cockpitSlotPill">
                                        <span class="slot-live-dot"></span>
                                        <span id="cockpitSlotText">กำลังตรวจรอบปัจจุบัน (Auto-Round)</span>
                                    </div>
                                </div>

                                <!-- Right: Daily Progress & Action Buttons -->
                                <div class="cockpit-strip-right">
                                    <div class="cockpit-progress-box d-none d-lg-block">
                                        <div class="cockpit-progress-label">ความคืบหน้าการตรวจวันนี้</div>
                                        <strong class="cockpit-progress-val text-primary" id="cockpitProgressText">0 / 0 เครื่อง (0%)</strong>
                                    </div>
                                    <div class="cockpit-btn-group">
                                        <button type="button" class="btn btn-outline-secondary cockpit-action-btn" data-bs-toggle="modal" data-bs-target="#modalScheduleTimeline" title="ดูตารางรอบเวลา 7 รอบประจำวัน">
                                            <i class="fas fa-calendar-alt text-primary"></i>
                                            <span>ตารางรอบมาตรฐาน</span>
                                        </button>
                                        <button type="button" class="btn btn-outline-primary fw-bold cockpit-action-btn" id="btnQuickAuditSheet" onclick="IQS.openCurrentAuditSheet()" title="เปิดใบสรุปผลการตรวจสำหรับออดิท">
                                            <i class="fas fa-print"></i>
                                            <span>ใบตรวจออดิท</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Line Selector Tabs (Segmented Control for SPOT, BEND, PRESS) -->
                        <div class="line-selector-bar mb-3">
                            <div class="line-tabs-wrapper">
                                <button type="button" class="line-tab-btn active" data-line="SPOT" onclick="IQS.switchLine('SPOT', this)">
                                    <i class="fas fa-bolt text-warning"></i>
                                    <span class="d-none d-sm-inline">Spot Welding</span>
                                    <span class="d-inline d-sm-none">Spot</span>
                                    <span class="line-count-badge" id="countBadgeSpot">39</span>
                                </button>
                                <button type="button" class="line-tab-btn" data-line="BEND" onclick="IQS.switchLine('BEND', this)">
                                    <i class="fas fa-ruler-combined text-info"></i>
                                    <span class="d-none d-sm-inline">Bending</span>
                                    <span class="d-inline d-sm-none">Bend</span>
                                    <span class="line-count-badge" id="countBadgeBend">22</span>
                                </button>
                                <button type="button" class="line-tab-btn" data-line="PRESS" onclick="IQS.switchLine('PRESS', this)">
                                    <i class="fas fa-industry text-primary"></i>
                                    <span class="d-none d-sm-inline">Press Stamping</span>
                                    <span class="d-inline d-sm-none">Press</span>
                                    <span class="line-count-badge" id="countBadgePress">20</span>
                                </button>
                            </div>
                        </div>

                        <!-- Filter Chips & Search Toolbar -->
                        <div class="iqs-toolbar-card mb-3">
                            <div class="row g-2 align-items-center">
                                <div class="col-md-5 col-12">
                                    <div class="input-group">
                                        <span class="input-group-text bg-transparent border-end-0 text-muted">
                                            <i class="fas fa-search"></i>
                                        </span>
                                        <input type="text" class="form-control border-start-0 ps-0" id="machineSearchInput" 
                                               placeholder="ค้นหารหัสเครื่องจักร (เช่น ROB, 35K, BEND, PRESS)..." 
                                               oninput="IQS.filterMachinesBySearch(this.value)">
                                    </div>
                                </div>
                                <div class="col-md-7 col-12">
                                    <div class="iqs-filter-group mb-0 justify-content-md-end" id="filterGroup">
                                        <button type="button" class="iqs-filter-chip active" data-filter="all" onclick="IQS.filterByStatus('all', this)">
                                            ทั้งหมด (<span id="cntAll">0</span>)
                                        </button>
                                        <button type="button" class="iqs-filter-chip" data-filter="pending" onclick="IQS.filterByStatus('pending', this)">
                                            <i class="fas fa-hourglass-half text-warning"></i> รอตรวจ (<span id="cntPending">0</span>)
                                        </button>
                                        <button type="button" class="iqs-filter-chip" data-filter="ok" onclick="IQS.filterByStatus('ok', this)">
                                            <i class="fas fa-check-circle text-success"></i> ผ่าน OK (<span id="cntOk">0</span>)
                                        </button>
                                        <button type="button" class="iqs-filter-chip" data-filter="ng" onclick="IQS.filterByStatus('ng', this)">
                                            <i class="fas fa-times-circle text-danger"></i> ไม่ผ่าน NG (<span id="cntNg">0</span>)
                                        </button>
                                        <button type="button" class="iqs-filter-chip" data-filter="skip" onclick="IQS.filterByStatus('skip', this)">
                                            <i class="fas fa-forward text-secondary"></i> ข้าม (<span id="cntSkip">0</span>)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Interactive Machine Grid -->
                        <div class="interactive-machine-grid mb-4" id="interactiveMachineGrid">
                            <div class="text-center text-muted py-5 col-12">
                                <div class="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                กำลังโหลดข้อมูลเครื่องจักร...
                            </div>
                        </div>

                        <!-- Discreet Phase 2 Floor Map Notice -->
                        <div class="floor-map-subtle-hint p-3 rounded-4 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fas fa-map-marked-alt text-primary fa-lg"></i>
                                <span class="small text-muted">
                                    <strong>Phase 2 Ready:</strong> ผังจำลองโรงงานดิจิทัล (Digital Twin) และระบบสแกน QR Code ประจำเครื่องกำลังเชื่อมโยงข้อมูลพิกัด
                                </span>
                            </div>
                            <span class="badge bg-primary-subtle text-primary" style="font-size: 0.72rem;">Zone B9 Live</span>
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
                                <div class="col-md-3 col-7">
                                    <label class="form-label small fw-bold text-muted mb-1">สถานะ</label>
                                    <select class="form-select" id="histStatus">
                                        <option value="">ทั้งหมด (All Status)</option>
                                        <option value="SUBMITTED">SUBMITTED (ผ่านสมบูรณ์)</option>
                                        <option value="COMPLETED_WITH_NG">COMPLETED_WITH_NG (พบ NG)</option>
                                        <option value="OPEN">OPEN (ยังไม่ปิดรอบ)</option>
                                    </select>
                                </div>
                                <div class="col-md-3 col-5">
                                    <button type="submit" class="btn btn-primary w-100 fw-bold" id="btnSearchHistory">
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

    <!-- Modal: Line-Adaptive Machine Inspection -->
    <div class="modal fade" id="modalInspectMachine" tabindex="-1" aria-labelledby="modalInspectMachineLabel" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg" style="border-radius: 20px; overflow: hidden;">
                <div class="modal-header bg-primary text-white py-3 px-4">
                    <div class="d-flex align-items-center gap-2">
                        <div class="modal-machine-icon-box bg-white bg-opacity-20 text-white rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            <i class="fas fa-microchip fa-lg" id="modalLineIcon"></i>
                        </div>
                        <div>
                            <div class="d-flex align-items-center gap-2">
                                <h5 class="modal-title fw-bold mb-0 text-white" id="modalInspectMachineLabel">ROB-SPOT-001</h5>
                                <span class="badge bg-white text-primary fw-bold" id="modalLineBadge" style="font-size: 0.72rem;">SPOT</span>
                                <span class="badge bg-white bg-opacity-25 text-white" id="modalAreaBadge" style="font-size: 0.72rem;">Zone B9</span>
                            </div>
                            <span class="small text-white-50" id="modalMachineSubtext">Robot Spot Welding</span>
                        </div>
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <form id="formInspectMachine">
                    <input type="hidden" id="inspectMachineId" value="">
                    <input type="hidden" id="inspectRoundId" value="">
                    <input type="hidden" id="inspectLine" value="SPOT">

                    <div class="modal-body p-4">

                        <!-- Round & Auto-Slot Info Banner -->
                        <div class="alert alert-primary bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded-3 py-2 px-3 mb-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fas fa-history text-primary"></i>
                                <span class="small text-body">
                                    รอบเวลา: <strong class="text-primary" id="modalSlotTitle">รอบเช้า (08:30)</strong>
                                </span>
                            </div>
                            <span class="badge bg-success-subtle text-success border border-success-subtle" style="font-size: 0.72rem;">
                                <i class="fas fa-magic me-1"></i>ระบบผูกรอบอัตโนมัติ (Auto-Round)
                            </span>
                        </div>

                        <!-- Skip Switch Option -->
                        <div class="card p-3 mb-3 border-0 bg-light rounded-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong class="text-body d-block small">ข้ามการตรวจเครื่องจักรนี้ในรอบนี้ (Skip)</strong>
                                    <span class="text-muted" style="font-size: 0.75rem;">กรณีไม่มีคำสั่งผลิต / เครื่องหยุดซ่อมบำรุง</span>
                                </div>
                                <div class="form-check form-switch mb-0">
                                    <input class="form-check-input" type="checkbox" id="inspectIsSkipped" onchange="IQS.toggleInspectSkip(this.checked)">
                                </div>
                            </div>
                            <div id="inspectSkipBox" class="mt-2" style="display: none;">
                                <label class="form-label small text-muted fw-bold mb-1">เหตุผลที่ข้ามเครื่องจักร:</label>
                                <input type="text" class="form-control form-control-sm" id="inspectSkipReason" placeholder="เช่น ไม่มีคำสั่งผลิต / กำลังซ่อมบำรุง">
                            </div>
                        </div>

                        <!-- Inspection Form Content (Hidden if Skipped) -->
                        <div id="inspectFormBody">

                            <!-- Model / SKU / PO / Thickness Header Row -->
                            <div class="row g-2 mb-3">
                                <div class="col-md-4 col-12">
                                    <label class="form-label small fw-bold text-muted mb-1">โมเดลชิ้นงาน (SKU)</label>
                                    <input type="text" class="form-control" id="inspectSku" placeholder="เช่น 56 TC" required>
                                </div>
                                <div class="col-md-4 col-6">
                                    <label class="form-label small fw-bold text-muted mb-1">เลขที่คำสั่งซื้อ (PO No.)</label>
                                    <input type="text" class="form-control" id="inspectPoNo" placeholder="PO Number">
                                </div>
                                <div class="col-md-4 col-6">
                                    <label class="form-label small fw-bold text-muted mb-1">ความหนาชิ้นงาน T (mm)</label>
                                    <input type="number" step="0.01" class="form-control" id="inspectThickness" placeholder="1.20" value="1.20">
                                </div>
                            </div>

                            <!-- Adaptive Criteria Section (Dynamically injected per Line: SPOT, BEND, PRESS) -->
                            <div id="adaptiveCriteriaContainer" class="mb-3">
                                <!-- Populated dynamically by IQS.renderAdaptiveForm() -->
                            </div>

                            <!-- NG Remark Field (Shown when NG is selected) -->
                            <div id="inspectNgBox" class="mb-3" style="display: none;">
                                <div class="alert alert-danger p-3 border-danger-subtle rounded-3 mb-0">
                                    <label class="form-label small text-danger fw-bold mb-1">
                                        <i class="fas fa-exclamation-triangle me-1"></i>ระบุสาเหตุ / อาการที่ไม่ผ่านเกณฑ์ (NG Remark):
                                    </label>
                                    <input type="text" class="form-control border-danger" id="inspectNgRemark" placeholder="ระบุอาการชิ้นงานหลุด / องศาพับเอียง / ครีบเกินเกณฑ์">
                                </div>
                            </div>

                            <!-- Photo Proofs Section -->
                            <div class="card p-3 border-0 bg-light rounded-3 mb-2">
                                <label class="form-label small fw-bold text-muted mb-2">
                                    <i class="fas fa-camera text-primary me-1"></i>หลักฐานรูปถ่ายประกอบการตรวจสอบ (ตามมาตรฐาน Audit)
                                </label>
                                <div class="row g-2">
                                    <div class="col-6">
                                        <div class="photo-upload-tile" id="tilePullPhoto" onclick="document.getElementById('inspectPhotoPull').click()">
                                            <i class="fas fa-camera fa-lg text-primary mb-1"></i>
                                            <span class="photo-tile-label" id="labelPhoto1">รูปชิ้นงานทดสอบ</span>
                                            <input type="file" id="inspectPhotoPull" accept="image/*" capture="environment" style="display:none;" onchange="IQS.previewInspectPhoto(this, 'previewInspectPull')">
                                            <div id="previewInspectPull" class="mt-1"></div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="photo-upload-tile" id="tilePanelPhoto" onclick="document.getElementById('inspectPhotoPanel').click()">
                                            <i class="fas fa-sliders-h fa-lg text-info mb-1"></i>
                                            <span class="photo-tile-label" id="labelPhoto2">รูปหน้าตู้ / พารามิเตอร์</span>
                                            <input type="file" id="inspectPhotoPanel" accept="image/*" capture="environment" style="display:none;" onchange="IQS.previewInspectPhoto(this, 'previewInspectPanel')">
                                            <div id="previewInspectPanel" class="mt-1"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>

                    <div class="modal-footer bg-light px-4 py-3 d-flex justify-content-between">
                        <button type="button" class="btn btn-outline-secondary px-3" data-bs-dismiss="modal">ยกเลิก</button>
                        <button type="submit" class="btn btn-primary px-4 fw-bold" id="btnSaveInspectRecord">
                            <i class="fas fa-check-circle me-1"></i>บันทึกผลการตรวจสอบ
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Modal: Daily Standard 7-Slots Timeline Schedule -->
    <div class="modal fade" id="modalScheduleTimeline" tabindex="-1" aria-labelledby="modalScheduleTimelineLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content border-0 shadow" style="border-radius: 20px; overflow: hidden;">
                <div class="modal-header bg-light py-3 px-4">
                    <h5 class="modal-title fw-bold mb-0 text-body" id="modalScheduleTimelineLabel">
                        <i class="fas fa-clock text-primary me-2"></i>ตารางรอบเวลามาตรฐานประจำวัน (7 รอบ)
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body p-4">
                    <p class="text-muted small mb-3">
                        ระบบจัดเวลาการตรวจสอบคุณภาพตามช่วงเวลามาตรฐานของโรงงาน พร้อมตรวจจับรอบที่ขาด (Missed Slots) อัตโนมัติ
                    </p>
                    <div class="schedule-timeline-grid" id="scheduleTimelineGrid">
                        <!-- Populated dynamically -->
                    </div>
                </div>
                <div class="modal-footer bg-light px-4 py-3">
                    <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">ปิด</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal: Start Round (Legacy/Manual Option) -->
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
                            <select class="form-select" id="newRoundTemplate">
                                <option value="">กำลังโหลดแม่แบบ...</option>
                            </select>
                            <div id="modalSlotAlert" class="mt-2" style="display:none;"></div>
                            <small class="text-muted d-block mt-1">เลือกแม่แบบเพื่อระบุชื่อรอบและกะโดยอัตโนมัติ</small>
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
