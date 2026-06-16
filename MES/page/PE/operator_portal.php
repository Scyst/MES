<?php 
// e:\MES\MES\MES\page\PE\operator_portal.php
require_once __DIR__ . '/../components/init.php';

// Allow users with view_production or view_maintenance
requirePermission(['view_production', 'view_maintenance']);

$currentUserForJS = $_SESSION['user'] ?? null;

// Fetch Machines for Dropdowns
require_once __DIR__ . '/../db.php';
$machines = [];
$uniqueLines = [];
try {
    $stmt = $pdo->query("SELECT machine_id, machine_code, machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE is_active = 1 ORDER BY line, machine_code");
    $machines = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($machines as $m) {
        if (!empty($m['line']) && !in_array($m['line'], $uniqueLines)) {
            $uniqueLines[] = $m['line'];
        }
    }
} catch (Exception $e) {
    // Log error
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Operator Portal - Maintenance & Downtime</title>
    <?php include_once '../components/common_head.php'; ?>
    
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Cropper.js CSS -->
    <link rel="stylesheet" href="../../utils/libs/cropper.min.css">
    
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/operator_portal.css?v=<?php echo time(); ?>">
</head>
<body>
    <script>
        const VALID_LINES = <?= json_encode($uniqueLines) ?>;
    </script>
    <div class="container-app">
        <!-- Header -->
        <header class="app-header">
            <h1 class="app-title" id="appHeaderTitle"><i class="fas fa-tools text-primary"></i> แจ้งซ่อมเครื่องจักร</h1> 
            <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" onclick="window.location.href='../PE/index.php'" title="Back to Main">
                <i class="fas fa-times"></i>
            </button>
        </header>

        <!-- Section: Request Maintenance -->
        <div id="section-request" class="app-section active">
            <div class="app-card mb-3 text-center bg-primary bg-opacity-10 border-primary border-opacity-25">
                <h6 class="fw-bold text-primary mb-1"><i class="fas fa-info-circle me-1"></i> แจ้งซ่อม (Work Order)</h6>
                <small class="text-muted">กรุณาระบุข้อมูลให้ครบถ้วนเพื่อให้ช่างเข้าซ่อมได้รวดเร็ว</small>
            </div>

            <form id="formMaintenanceRequest" class="app-card">
                <input type="hidden" name="action" value="create_wo">
                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? '' ?>">
                
                <div class="mb-3">
                    <label class="form-label d-flex justify-content-between align-items-center w-100 m-0 pb-1">
                        <span>ชื่อผู้แจ้ง <span class="text-danger">*</span></span>
                        <span class="text-muted text-transform-none" style="letter-spacing: normal; font-weight: 500; font-size: 0.75rem;"><i class="far fa-clock"></i> <span id="req_requested_at_display"></span></span>
                    </label>
                    <input type="text" class="form-control" name="requested_by" value="<?= htmlspecialchars($currentUserForJS['fullname'] ?? $currentUserForJS['username']) ?>" required>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">ประเภทงาน <span class="text-danger">*</span></label>
                        <select class="form-select border-primary" id="req_wo_type" name="wo_type" required>
                            <option value="Corrective">ซ่อมแซม (Corrective)</option>
                            <option value="Preventive">ป้องกัน (Preventive)</option>
                            <option value="Improvement">พัฒนา/ปรับปรุง (Improvement)</option>
                            <option value="Inspection">ตรวจสอบ (Inspection)</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="form-label text-primary"><i class="fas fa-industry me-1"></i> เลือกจากระบบ</label>
                        <select class="form-select border-primary" id="req_machine_id" name="machine_id">
                            <option value="">-- ไม่ระบุ --</option>
                            <?php foreach($machines as $m): ?>
                                <option value="<?= $m['machine_id'] ?>" data-line="<?= htmlspecialchars($m['line']) ?>" data-name="<?= htmlspecialchars($m['machine_name']) ?>">
                                    <?= htmlspecialchars($m['line'] . ' - ' . $m['machine_code'] . ' (' . $m['machine_name'] . ')') ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">ชื่ออุปกรณ์/เครื่องจักร <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="req_machine_name" name="machine_name" placeholder="ระบุชื่ออุปกรณ์..." required>
                    </div>
                    <div class="col-6">
                        <label class="form-label">ไลน์ผลิต/แผนก <span class="text-danger">*</span></label>
                        <input list="lineOptions" class="form-control" id="req_line" name="line" placeholder="ระบุไลน์/แผนก..." required>
                        <datalist id="lineOptions">
                            <?php foreach($uniqueLines as $l): ?>
                                <option value="<?= htmlspecialchars($l) ?>"></option>
                            <?php endforeach; ?>
                        </datalist>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">อาการเสีย / หัวข้อปัญหา <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="req_issue_title" name="issue_title" placeholder="เช่น สว่านมือเสีย, ปลั๊กไฟช็อต..." required>
                </div>

                <div class="mb-3">
                    <label class="form-label">รายละเอียด</label>
                    <textarea class="form-control" id="req_issue_detail" name="issue_detail" placeholder="อธิบายอาการเพิ่มเติม..."></textarea>
                </div>

                <div class="mb-3">
                    <label class="form-label">ระดับความสำคัญ <span class="text-danger">*</span></label>
                    <select class="form-select bg-light" id="req_priority" name="priority" required>
                        <option value="Normal">🔴 Normal (รอได้)</option>
                        <option value="High">🟠 High (ด่วน)</option>
                        <option value="Critical">🔴 Critical (ฉุกเฉิน)</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label"><i class="fas fa-camera"></i> รูปถ่ายปัญหา (ถ้ามี)</label>
                    <input type="file" class="form-control" id="req_photo" name="image" accept="image/*">
                    <div id="photo_preview_container" class="mt-2 text-center" style="display: none;">
                        <img id="photo_preview" src="" alt="Preview" class="img-fluid rounded border shadow-sm" style="max-height: 200px;">
                        <div class="mt-1">
                            <small class="text-muted" id="photo_size_info"></small>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary btn-app-primary mt-2">
                    <i class="fas fa-paper-plane me-1"></i> ส่งเรื่องแจ้งซ่อม
                </button>
            </form>
        </div>

        <!-- Section: Record Downtime -->
        <div id="section-downtime" class="app-section">
            <div class="app-card mb-3 text-center bg-danger bg-opacity-10 border-danger border-opacity-25">
                <h6 class="fw-bold text-danger mb-1"><i class="fas fa-ban me-1"></i> แจ้งเครื่องหยุด (Downtime)</h6>
                <small class="text-muted">บันทึกเวลาที่เครื่องจักรหยุดทำงานเพื่อเก็บประวัติ</small>
            </div>

            <form id="formDowntimeRequest" class="app-card">
                <input type="hidden" name="action" value="add_downtime">
                <input type="hidden" name="csrf_token" value="<?= $_SESSION['csrf_token'] ?? '' ?>">
                
                <div class="row g-2 mb-3">
                    <div class="col-12">
                        <label class="form-label text-danger"><i class="fas fa-industry me-1"></i> เครื่องจักร</label>
                        <select class="form-select border-danger" id="dt_machine_id" name="machine_id">
                            <option value="">-- ไม่ระบุ --</option>
                            <?php foreach($machines as $m): ?>
                                <option value="<?= $m['machine_id'] ?>" data-line="<?= htmlspecialchars($m['line']) ?>" data-name="<?= htmlspecialchars($m['machine_name']) ?>">
                                    <?= htmlspecialchars($m['line'] . ' - ' . $m['machine_code'] . ' (' . $m['machine_name'] . ')') ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">ชื่ออุปกรณ์/เครื่องจักร <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="dt_machine_name" name="machine_name" placeholder="ระบุชื่อ..." required>
                    </div>
                    <div class="col-6">
                        <label class="form-label">ไลน์ผลิต/แผนก <span class="text-danger">*</span></label>
                        <input list="lineOptions" class="form-control" id="dt_line" name="line" placeholder="ระบุไลน์..." required>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">วันที่ <span class="text-danger">*</span></label>
                    <input type="date" class="form-control" id="dt_start_date" name="log_date" required>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">เริ่มหยุด <span class="text-danger">*</span></label>
                        <input type="time" class="form-control" id="dt_start_time" name="start_time" required>
                    </div>
                    <div class="col-6">
                        <label class="form-label">กลับมาเดิน <small class="text-muted fw-normal" style="font-size:0.75rem;">(เว้นว่างได้)</small></label>
                        <input type="time" class="form-control" id="dt_end_time" name="end_time">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="form-label">สาเหตุการหยุด <span class="text-danger">*</span></label>
                    <select class="form-select bg-light" id="dt_cause_category" name="cause_category" required>
                        <option value="">-- ระบุหมวดหมู่ --</option>
                        <option value="Mechanical">เครื่องกล (Mechanical)</option>
                        <option value="Electrical">ไฟฟ้า/คอนโทรล (Electrical)</option>
                        <option value="Tooling">แม่พิมพ์/อุปกรณ์ (Tooling)</option>
                        <option value="Setup">ตั้งเครื่อง/เปลี่ยนรุ่น (Setup / Changeover)</option>
                        <option value="Material">รอของ/วัตถุดิบ (Material Shortage)</option>
                        <option value="Quality">ปัญหาคุณภาพ (Quality Issue)</option>
                        <option value="Operator">พนักงาน (Operator)</option>
                        <option value="Planned">หยุดตามแผน (Planned)</option>
                        <option value="Other">อื่นๆ (Other)</option>
                    </select>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label">รายละเอียด/หมายเหตุ <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="dt_cause_detail" name="cause_detail" placeholder="ระบุสาเหตุการหยุด..." required>
                    </div>
                    <div class="col-6">
                        <label class="form-label">ผู้แก้ไข (ถ้ามี)</label>
                        <input type="text" class="form-control" id="dt_recovered_by" name="recovered_by" placeholder="ชื่อช่าง/พนักงาน...">
                    </div>
                </div>

                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input border-danger" id="dt_create_wo" name="create_wo" value="1">
                    <label class="form-check-label text-danger fw-bold" for="dt_create_wo">
                        สร้างใบแจ้งซ่อม (Work Order) ทันที
                    </label>
                    <div class="form-text" style="font-size: 0.75rem;">ติ๊กเลือกถ้าต้องการให้ช่างซ่อมบำรุงเข้ามาแก้ไขอาการนี้</div>
                </div>

                <button type="submit" class="btn btn-danger btn-app-primary mt-2">
                    <i class="fas fa-stop-circle me-1"></i> บันทึกเวลาหยุดเครื่อง
                </button>
            </form>
        </div>

        <!-- Section: History -->
        <div id="section-history" class="app-section">
            <div class="px-3 pt-3 pb-1">
                <ul class="nav nav-pills nav-fill bg-white rounded-pill p-1 shadow-sm border" id="historyTab" role="tablist">
                    <li class="nav-item">
                        <button class="nav-link active rounded-pill fw-bold" id="hist-wo-tab" data-bs-toggle="tab" type="button" style="font-size: 0.85rem;" onclick="loadHistory('wo')">
                            <i class="fas fa-tools"></i> งานซ่อม
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link rounded-pill fw-bold" id="hist-dt-tab" data-bs-toggle="tab" type="button" style="font-size: 0.85rem;" onclick="loadHistory('dt')">
                            <i class="fas fa-ban"></i> เครื่องหยุด
                        </button>
                    </li>
                </ul>
            </div>
            
            <div class="p-3">
                <div class="d-flex align-items-center justify-content-between mb-3 gap-2">
                    <div class="d-flex flex-grow-1 gap-1">
                        <input type="date" id="hist_start_date" class="form-control form-control-sm border-secondary text-secondary" style="font-size: 0.8rem;" onchange="loadCurrentHistory()">
                        <span class="text-muted d-flex align-items-center">-</span>
                        <input type="date" id="hist_end_date" class="form-control form-control-sm border-secondary text-secondary" style="font-size: 0.8rem;" onchange="loadCurrentHistory()">
                    </div>
                </div>
                <div id="history-container">
                    <!-- Cards will be rendered here -->
                    <div class="text-center py-5 text-muted">กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
            <button class="nav-item-btn text-muted" data-href="../dailyLog/dailyLogUI.php" title="กลับหน้าหลัก" data-icon="fa-home">
                <i class="fas fa-home"></i><span>หน้าหลัก</span>
            </button>
            <button class="nav-item-btn active" data-target="section-request" data-title="แจ้งซ่อมเครื่องจักร" data-icon="fa-tools" data-color="text-primary"> 
                <i class="fas fa-tools"></i><span>แจ้งซ่อม</span>
            </button>
            <button class="nav-item-btn" data-target="section-downtime" data-title="แจ้งเครื่องหยุด" data-icon="fa-ban" data-color="text-danger"> 
                <i class="fas fa-ban"></i><span>หยุดไลน์</span>
            </button>
            <button class="nav-item-btn" data-target="section-history" data-title="ประวัติและสถานะ" data-icon="fa-history" data-color="text-dark">
                <i class="fas fa-history"></i><span>ประวัติ</span>
            </button>
        </nav>
    </div>

    <!-- Cropper Modal -->
    <div class="modal fade" id="cropImageModal" tabindex="-1" aria-labelledby="cropImageModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-fullscreen-sm-down modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="cropImageModalLabel"><i class="fas fa-crop-alt"></i> จัดการรูปภาพ</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="btnCancelCrop"></button>
          </div>
          <div class="modal-body p-2 text-center" style="background-color: #000; overflow: hidden; max-height: 70vh;">
            <div style="max-height: 100%; max-width: 100%;">
                <img id="imageToCrop" src="" alt="Picture to crop" style="max-width: 100%; display: block;">
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

    <script src="../../utils/libs/cropper.min.js"></script>
    <script>
        const API_WORKORDER = 'api/workOrderAPI.php';
        const API_DOWNTIME = 'api/downtimeAPI.php';
        const CURRENT_USER = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="script/operator_portal.js?v=<?php echo time(); ?>"></script>
</body>
</html>
