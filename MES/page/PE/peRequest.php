<?php 
// e:\MES\MES\MES\page\PE\operator_portal.php
require_once __DIR__ . '/../components/init.php';

// Allow users with view_production or view_maintenance
requirePermission(['view_production', 'view_maintenance']);

$currentUserForJS = $_SESSION['user'] ?? null;
$loggedInUser = $_SESSION['user']['username'] ?? '';

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
    <link rel="stylesheet" href="css/pe-enterprise.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="css/peRequest.css?v=<?php echo time(); ?>">
    <?php if (isset($_GET['embedded']) && $_GET['embedded'] == '1'): ?>
    <style>
        .app-header { display: none !important; }
        .container-app { padding-top: 5px !important; margin-top: 0 !important; }
        body { background-color: transparent !important; }
        .app-section.active { margin-top: 0 !important; }
        form { margin-top: 0 !important; }
    </style>
    <?php endif; ?>

    <style>
        .checklist-item {
            background: white; border-radius: 12px; padding: 12px; margin-bottom: 5px;
            border: 1px solid var(--pe-border-light); box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .btn-check-custom:checked + .btn-outline-success {
            background-color: var(--pe-success) !important; color: white !important; border-color: var(--pe-success) !important;
        }
        .btn-check-custom:checked + .btn-outline-danger {
            background-color: var(--pe-danger) !important; color: white !important; border-color: var(--pe-danger) !important;
        }
        .camera-btn { 
            border: 2px dashed var(--pe-danger); color: var(--pe-danger); background: rgba(239, 68, 68, 0.05); 
            border-radius: 8px; padding: 15px 10px; text-align: center; cursor: pointer; 
        }
        .remove-img-btn { 
            position: absolute; top: -10px; right: -10px; background: var(--pe-danger); color: white; 
            border: none; border-radius: 50%; width: 28px; height: 28px; z-index: 5;
        }
    </style>

</head>
<body>
    <script>
        const VALID_LINES = <?= json_encode($uniqueLines) ?>;
    </script>
    <div class="container-app">
        <header class="app-header">
            <h1 class="app-title" id="appHeaderTitle"><i class="fas fa-tools text-primary"></i> แจ้งซ่อมเครื่องจักร</h1> 
            <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" onclick="window.location.href='../dailyLog/dailyLogUI.php'" title="Back to Main">
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
                    <label class="pe-form-label d-flex justify-content-between align-items-center w-100 m-0 pb-1">
                        <span>ชื่อผู้แจ้ง <span class="required">*</span></span>
                        <span class="text-muted text-transform-none" style="letter-spacing: normal; font-weight: 500; font-size: 0.75rem;"><i class="far fa-clock"></i> <span id="req_requested_at_display"></span></span>
                    </label>
                    <input type="text" class="pe-form-input" name="requested_by" value="<?= htmlspecialchars($currentUserForJS['fullname'] ?? $currentUserForJS['username']) ?>" required>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">ประเภทงาน <span class="required">*</span></label>
                        <select class="pe-form-select border-primary" id="req_wo_type" name="wo_type" required>
                            <option value="Corrective">ซ่อมแซม (Corrective)</option>
                            <option value="Preventive">ป้องกัน (Preventive)</option>
                            <option value="Improvement">พัฒนา/ปรับปรุง (Improvement)</option>
                            <option value="Inspection">ตรวจสอบ (Inspection)</option>
                            <option value="Setup">ตั้งเครื่อง/เปลี่ยนรุ่น (Setup)</option>
                            <option value="Safety/Hazard">ความปลอดภัย (Safety/Hazard)</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label text-primary"><i class="fas fa-industry me-1"></i> เลือกจากระบบ</label>
                        <select class="pe-form-select border-primary" id="req_machine_id" name="machine_id">
                            <option value="">-- ไม่ระบุ --</option>
                            <?php foreach($machines as $m): 
                                $selected = (isset($_GET['machine_code']) && strtolower($_GET['machine_code']) === strtolower($m['machine_code'])) ? 'selected' : '';
                            ?>
                                <option value="<?= $m['machine_id'] ?>" data-line="<?= htmlspecialchars($m['line']) ?>" data-name="<?= htmlspecialchars($m['machine_name']) ?>" <?= $selected ?>>
                                    <?= htmlspecialchars($m['line'] . ' - ' . $m['machine_code'] . ' (' . $m['machine_name'] . ')') ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">ชื่ออุปกรณ์/เครื่องจักร <span class="required">*</span></label>
                        <input type="text" class="pe-form-input" id="req_machine_name" name="machine_name" placeholder="ระบุชื่ออุปกรณ์..." required>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">ไลน์ผลิต/แผนก <span class="required">*</span></label>
                        <input list="lineOptions" class="pe-form-input" id="req_line" name="line" placeholder="ระบุไลน์/แผนก..." required>
                        <datalist id="lineOptions">
                            <?php foreach($uniqueLines as $l): ?>
                                <option value="<?= htmlspecialchars($l) ?>"></option>
                            <?php endforeach; ?>
                        </datalist>
                    </div>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label">อาการเสีย / หัวข้อปัญหา <span class="required">*</span></label>
                    <input type="text" class="pe-form-input" id="req_issue_title" name="issue_title" placeholder="เช่น สว่านมือเสีย, ปลั๊กไฟช็อต..." required>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label">รายละเอียด</label>
                    <textarea class="pe-form-textarea" id="req_issue_detail" name="issue_detail" placeholder="อธิบายอาการเพิ่มเติม..."></textarea>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label">ระดับความสำคัญ <span class="required">*</span></label>
                    <select class="pe-form-select bg-light" id="req_priority" name="priority" required>
                        <option value="Normal">🟢 Normal (รอได้)</option>
                        <option value="High">🟠 High (ด่วน)</option>
                        <option value="Critical">🔴 Critical (ฉุกเฉิน)</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label"><i class="fas fa-camera"></i> รูปถ่ายปัญหา (บังคับ)*</label>
                    <input type="file" class="pe-form-input" id="req_photo" name="image" accept="image/*" required>
                    <div id="photo_preview_container" class="mt-2 text-center" style="display: none;">
                        <img id="photo_preview" src="" alt="Preview" class="img-fluid rounded border shadow-sm" style="max-height: 200px;">
                        <div class="mt-1">
                            <small class="text-muted" id="photo_size_info"></small>
                        </div>
                    </div>
                </div>

                <button type="submit" class="pe-btn pe-btn-primary w-100 mt-2">
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
                        <label class="pe-form-label text-danger"><i class="fas fa-industry me-1"></i> เครื่องจักร</label>
                        <select class="pe-form-select border-danger" id="dt_machine_id" name="machine_id">
                            <option value="">-- ไม่ระบุ --</option>
                            <?php foreach($machines as $m): 
                                $selected = (isset($_GET['machine_code']) && strtolower($_GET['machine_code']) === strtolower($m['machine_code'])) ? 'selected' : '';
                            ?>
                                <option value="<?= $m['machine_id'] ?>" data-line="<?= htmlspecialchars($m['line']) ?>" data-name="<?= htmlspecialchars($m['machine_name']) ?>" <?= $selected ?>>
                                    <?= htmlspecialchars($m['line'] . ' - ' . $m['machine_code'] . ' (' . $m['machine_name'] . ')') ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">ชื่ออุปกรณ์/เครื่องจักร <span class="required">*</span></label>
                        <input type="text" class="pe-form-input" id="dt_machine_name" name="machine_name" placeholder="ระบุชื่อ..." required>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">ไลน์ผลิต/แผนก <span class="required">*</span></label>
                        <input list="lineOptions" class="pe-form-input" id="dt_line" name="line" placeholder="ระบุไลน์..." required>
                    </div>
                </div>

                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">วันที่เริ่ม <span class="required">*</span></label>
                        <input type="date" class="pe-form-input" id="dt_start_date" name="log_date" required>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">เวลาเริ่ม <span class="required">*</span></label>
                        <input type="time" class="pe-form-input" id="dt_start_time" name="start_time" required>
                    </div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">วันที่สิ้นสุด <small class="text-muted fw-normal" style="font-size:0.75rem;">(เว้นว่างได้)</small></label>
                        <input type="date" class="pe-form-input" id="dt_end_date" name="end_date">
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">เวลาสิ้นสุด <small class="text-muted fw-normal" style="font-size:0.75rem;">(เว้นว่างได้)</small></label>
                        <input type="time" class="pe-form-input" id="dt_end_time" name="end_time">
                    </div>
                </div>

                <div class="mb-3">
                    <label class="pe-form-label">สาเหตุการหยุด <span class="required">*</span></label>
                    <select class="pe-form-select bg-light" id="dt_cause_category" name="cause_category" required>
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
                        <label class="pe-form-label">รายละเอียด/หมายเหตุ <span class="required">*</span></label>
                        <input type="text" class="pe-form-input" id="dt_cause_detail" name="cause_detail" placeholder="ระบุสาเหตุการหยุด..." required>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">ผู้แก้ไข (ถ้ามี)</label>
                        <input type="text" class="pe-form-input" id="dt_recovered_by" name="recovered_by" placeholder="ชื่อช่าง/พนักงาน...">
                    </div>
                </div>

                <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input border-danger" id="dt_create_wo" name="create_wo" value="1">
                    <label class="form-check-label text-danger fw-bold" for="dt_create_wo">
                        สร้างใบแจ้งซ่อม (Work Order) ทันที
                    </label>
                    <div class="form-text" style="font-size: 0.75rem;">ติ๊กเลือกถ้าต้องการให้ช่างซ่อมบำรุงเข้ามาแก้ไขอาการนี้</div>
                </div>

                <button type="submit" class="pe-btn pe-btn-danger w-100 mt-2">
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
                        <input type="date" id="hist_start_date" class="pe-form-input form-control-sm border-secondary text-secondary" style="font-size: 0.8rem;" onchange="loadCurrentHistory()">
                        <span class="text-muted d-flex align-items-center">-</span>
                        <input type="date" id="hist_end_date" class="pe-form-input form-control-sm border-secondary text-secondary" style="font-size: 0.8rem;" onchange="loadCurrentHistory()">
                    </div>
                </div>
                <div id="history-container">
                    <!-- Cards will be rendered here -->
                    <div class="text-center py-5 text-muted">กำลังโหลดข้อมูล...</div>
                </div>
            </div>
        </div>

        
        <!-- Section: Pre-Op -->
        <div id="section-preop" class="app-section">
            <div class="app-card mb-3 text-center bg-success bg-opacity-10 border-success border-opacity-25">
                <h6 class="fw-bold text-success mb-1"><i class="fas fa-clipboard-check me-1"></i> Pre-Op Safety Audit</h6>
                <small class="text-muted">ตรวจสอบความพร้อมและเช็คลิสต์ก่อนเริ่มงาน</small>
            </div>
            <form id="preopForm" class="app-card">
                <div class="mb-3">
                    <label class="pe-form-label text-primary">รหัสเครื่องจักร <span class="required">*</span></label>
                    <input type="text" class="pe-form-input text-uppercase" name="machine_code" id="preop_machineCode" value="<?= htmlspecialchars($_GET['machine_code'] ?? '') ?>" placeholder="เช่น MC-01" required <?= !empty($_GET['machine_code']) ? 'readonly' : '' ?>>
                </div>
                <div class="row mb-3">
                    <div class="col-6">
                        <label class="pe-form-label">กะ (Shift) <span class="required">*</span></label>
                        <select class="pe-form-select" name="shift" required>
                            <option value="Day">กลางวัน</option>
                            <option value="Night">กลางคืน</option>
                        </select>
                    </div>
                    <div class="col-6">
                        <label class="pe-form-label">ผู้ตรวจ <span class="required">*</span></label>
                        <input type="text" class="pe-form-input" name="audited_by" id="auditedByInput" required placeholder="ชื่อ/รหัส" value="<?= htmlspecialchars($currentUserForJS['fullname'] ?? $currentUserForJS['username']) ?>">
                    </div>
                </div>
                <hr class="my-3">
                <h6 class="fw-bold mb-2 text-secondary"><i class="fas fa-list-ul me-2"></i> รายการตรวจสอบ</h6>
                <div id="checklistContainer">
                    <div class="text-center py-4 text-secondary" id="checklistLoading">
                        <i class="fas fa-spinner fa-spin fa-2x mb-2"></i><p class="mb-0">กำลังโหลด...</p>
                    </div>
                </div>
                <div id="failActionArea" style="display: none; margin-top: 15px; padding: 15px; border-radius: 12px; background-color: var(--pe-danger-light); border: 1px solid var(--pe-danger);">
                    <h6 class="text-danger fw-bold"><i class="fas fa-exclamation-triangle me-1"></i> พบปัญหา</h6>
                    <p class="small text-danger mb-2">ระบบจะสร้างใบแจ้งซ่อมฉุกเฉิน</p>
                    <div class="mb-2">
                        <textarea class="pe-form-input" id="failRemarks" name="remarks" rows="2" placeholder="อธิบายปัญหา..."></textarea>
                    </div>
                </div>
                <button type="submit" class="pe-btn pe-btn-primary w-100 mt-2" id="submitBtnPreop">
                    <i class="fas fa-save me-2"></i> บันทึกผล
                </button>
            </form>
        </div>

        <!-- Section: Hazard -->
        <div id="section-hazard" class="app-section">
            <div class="app-card mb-3 text-center bg-danger bg-opacity-10 border-danger border-opacity-25">
                <h6 class="fw-bold text-danger mb-1"><i class="fas fa-exclamation-triangle fa-fade text-warning me-1"></i> Safety Hazard</h6>
                <small class="text-muted">แจ้งเหตุฉุกเฉิน / พบปัญหาความปลอดภัย</small>
            </div>
            <form id="hazardForm" class="app-card" style="display: flex; flex-direction: column; min-height: calc(100vh - 180px);">
                <input type="hidden" name="action" value="submit_hazard_report">
                <input type="hidden" id="hazard_imageBase64" name="image_base64" value="">
                <div class="mb-3"><label class="pe-form-label text-danger">รหัสเครื่องจักร <span class="text-danger">*</span></label>
                    <input type="text" class="pe-form-input text-uppercase" name="machine_code" id="hazard_machineCode" value="<?= htmlspecialchars($_GET['machine_code'] ?? '') ?>" placeholder="MC-01" required <?= !empty($_GET['machine_code']) ? 'readonly' : '' ?>>
                </div>
                <div class="mb-3"><label class="pe-form-label">ปัญหา (Issue) <span class="text-danger">*</span></label>
                    <select class="pe-form-select" name="issue_title" required>
                        <option value="">-- เลือกหัวข้อ --</option>
                        <option value="ปุ่ม Emergency Stop พัง / ไม่ทำงาน">ปุ่ม Emergency Stop พัง / ไม่ทำงาน</option>
                        <option value="Safety Sensor ถูกปิด / ไม่ทำงาน">Safety Sensor ถูกปิด / ไม่ทำงาน</option>
                        <option value="สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ">สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ</option>
                        <option value="อุปกรณ์ป้องกัน / ฝาครอบ หลุดหาย">ฝาครอบ / อุปกรณ์ป้องกัน หลุดหาย</option>
                        <option value="พบความเสี่ยงอื่นๆ">พบความเสี่ยงอื่นๆ</option>
                    </select>
                </div>
                <div class="mb-3"><label class="pe-form-label">รายละเอียด</label>
                    <textarea class="pe-form-textarea" name="issue_detail" rows="2" placeholder="อธิบาย..."></textarea>
                </div>
                <div class="mb-3" style="flex-grow: 1; display: flex; flex-direction: column;">
                    <label class="pe-form-label text-danger">รูปหลักฐาน <span class="text-danger">*</span></label>
                    <input type="file" id="hazard_cameraInput" accept="image/*" capture="environment" style="display: none;">
                    
                    <div class="camera-btn shadow-sm" id="hazard_cameraBtn" style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 120px; transition: all 0.3s ease;">
                        <i class="fas fa-camera fa-2x mb-2"></i><h6 class="mb-0 fw-bold">แตะถ่ายรูป</h6>
                    </div>
                    
                    <div id="hazard_previewContainer" style="display: none; position: relative; margin-top: 15px; flex-grow: 1;">
                        <button type="button" id="hazard_removeImgBtn" style="position: absolute; top: -10px; right: -10px; background: #dc2626; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; z-index: 5;"><i class="fas fa-times"></i></button>
                        <img id="hazard_imagePreview" src="" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; border: 2px solid #ef4444;">
                    </div>
                </div>
                <button type="submit" class="pe-btn pe-btn-danger w-100 mt-3" style="margin-top: auto;">
                    <i class="fas fa-paper-plane me-2"></i> ส่งแจ้งเหตุ
                </button>
            </form>
        </div>

        <!-- Bottom Navigation -->
        <nav class="bottom-nav">
            <button class="nav-item-btn text-muted" data-href="../dailyLog/dailyLogUI.php" title="หน้าหลัก" data-icon="fa-home">
                <i class="fas fa-home"></i><span>หน้าหลัก</span>
            </button>
            <button class="nav-item-btn position-relative" data-target="section-preop" data-title="Pre-Op Safety Audit" data-icon="fa-clipboard-check" data-color="text-success"> 
                <i class="fas fa-clipboard-check"></i>
                <span class="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle" id="preop_status_badge" style="display: none; margin-top: 10px; margin-left: -20px;"><span class="visually-hidden">Audited</span></span>
                <span>Pre-Op</span>
            </button>
            <button class="nav-item-btn" data-target="section-hazard" data-title="Safety Hazard" data-icon="fa-exclamation-triangle" data-color="text-danger"> 
                <i class="fas fa-exclamation-triangle"></i><span>Hazard</span>
            </button>
            <button class="nav-item-btn active" data-target="section-request" data-title="แจ้งซ่อมเครื่องจักร" data-icon="fa-tools" data-color="text-primary"> 
                <i class="fas fa-tools"></i><span>แจ้งซ่อม</span>
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

    <script src="../../utils/libs/cropper.min.js"></script>
    <script>
        const API_WORKORDER = 'api/workOrderAPI.php';
        const API_DOWNTIME = 'api/downtimeAPI.php';
        const CURRENT_USER = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="script/peRequest.js?v=<?php echo time(); ?>"></script>
</body>
</html>
