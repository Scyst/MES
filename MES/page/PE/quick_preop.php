<?php
// e:\MES\MES\MES\page\PE\quick_preop.php
$machineCode = $_GET['machine_code'] ?? '';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Pre-Op Safety Audit</title>
    <!-- Bootstrap CSS -->
    <link href="../../utils/libs/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <!-- SweetAlert2 -->
    <script src="../../utils/libs/sweetalert2.all.min.js"></script>
    
    <!-- Custom CSS from PE-Enterprise System -->
    <link rel="stylesheet" href="css/pe-enterprise.css?v=<?= time() ?>">
    <link rel="stylesheet" href="css/peRequest.css?v=<?= time() ?>">
    
    <style>
        .audit-banner {
            background: linear-gradient(135deg, var(--pe-primary), #1e3a8a);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 0 0 24px 24px;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
            margin-bottom: -25px;
            position: relative;
            z-index: 10;
        }
        .checklist-item {
            background: white;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid var(--pe-border-light);
            box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        }
        .checklist-question {
            font-weight: 600;
            color: var(--pe-text-primary);
            margin-bottom: 12px;
            font-size: 0.95rem;
        }
        .btn-check-custom:checked + .btn-outline-success {
            background-color: var(--pe-success);
            color: white;
            border-color: var(--pe-success);
        }
        .btn-check-custom:checked + .btn-outline-danger {
            background-color: var(--pe-danger);
            color: white;
            border-color: var(--pe-danger);
        }
        .camera-btn { 
            border: 2px dashed var(--pe-danger); 
            color: var(--pe-danger); 
            background: rgba(239, 68, 68, 0.05); 
            border-radius: 14px; 
            padding: 25px 10px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.2s ease; 
        }
        .preview-container { 
            position: relative; 
            display: none; 
            margin-top: 15px; 
        }
        .preview-container img { 
            width: 100%; 
            border-radius: 14px; 
            border: 2px solid var(--pe-danger); 
            box-shadow: var(--pe-shadow-sm); 
        }
        .remove-img-btn { 
            position: absolute; 
            top: -12px; 
            right: -12px; 
            background: var(--pe-danger); 
            color: white; 
            border: none; 
            border-radius: 50%; 
            width: 32px; 
            height: 32px; 
            font-size: 14px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.3); 
            z-index: 5; 
            display: flex;
            align-items: center;
            justify-content: center;
        }
        body { background-color: var(--pe-bg-body); }
        .pe-form-input[readonly] { opacity: 0.9; cursor: not-allowed; }
    </style>
</head>
<body>

<div class="container-app">
    <div class="audit-banner">
        <h3 class="mb-1 fw-bold" style="letter-spacing: 0.5px;">
            <i class="fas fa-clipboard-check text-success me-2"></i> Pre-Op Safety Audit
        </h3>
        <p class="mb-0 opacity-75 small text-uppercase" style="letter-spacing: 1px;">เช็คลิสต์ก่อนเริ่มงาน</p>
    </div>

    <div class="app-section active mt-4 px-2 pb-5">
        <form id="preopForm" class="app-card" style="margin-top: 15px; border-top: 4px solid var(--pe-primary);">
            <div class="mb-3">
                <label class="pe-form-label text-primary">รหัสเครื่องจักร (Machine Code) <span class="required">*</span></label>
                <input type="text" class="pe-form-input border-primary text-primary fw-bold text-uppercase" 
                       style="background-color: var(--pe-primary-light); font-size: 1.1rem;" 
                       name="machine_code" id="machineCode" 
                       value="<?= htmlspecialchars($machineCode) ?>" 
                       placeholder="เช่น MC-01" required <?= !empty($machineCode) ? 'readonly' : '' ?>>
                <?php if(empty($machineCode)): ?>
                    <div class="form-text text-danger small mt-1 fw-bold"><i class="fas fa-info-circle"></i> กรุณาระบุรหัสเครื่องจักร</div>
                <?php endif; ?>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <label class="pe-form-label">กะการทำงาน (Shift) <span class="required">*</span></label>
                    <select class="pe-form-select" name="shift" required>
                        <option value="Day">กลางวัน (Day)</option>
                        <option value="Night">กลางคืน (Night)</option>
                    </select>
                </div>
                <div class="col-6">
                    <label class="pe-form-label">ผู้ตรวจ (Audited By) <span class="required">*</span></label>
                    <input type="text" class="pe-form-input" name="audited_by" required placeholder="ชื่อ/รหัส">
                </div>
            </div>

            <hr class="my-4">
            <h6 class="fw-bold mb-3 text-secondary"><i class="fas fa-list-ul me-2"></i> ตรวจสอบรายการต่อไปนี้</h6>

            <!-- Checklist Items -->
            <div id="checklistContainer">
                <div class="text-center py-4 text-secondary" id="checklistLoading">
                    <i class="fas fa-spinner fa-spin fa-2x mb-2"></i>
                    <p class="mb-0">กำลังโหลดรายการตรวจสอบ...</p>
                </div>
            </div>

            <!-- Failure Action Area (Shown only if any answer is NO) -->
            <div id="failActionArea" style="display: none; margin-top: 20px; padding: 15px; border-radius: 12px; background-color: var(--pe-danger-light); border: 1px solid var(--pe-danger);">
                <h6 class="text-danger fw-bold"><i class="fas fa-exclamation-triangle me-1"></i> พบปัญหาความปลอดภัย</h6>
                <p class="small text-danger mb-2">ระบบจะสร้างใบแจ้งซ่อมฉุกเฉิน (Hazard Report) อัตโนมัติ กรุณาถ่ายรูปและระบุรายละเอียด</p>
                
                <div class="mb-3">
                    <label class="pe-form-label text-danger">รายละเอียด (Remarks) <span class="required">*</span></label>
                    <textarea class="pe-form-input" id="failRemarks" name="remarks" rows="2" placeholder="อธิบายปัญหาที่พบ..."></textarea>
                </div>
                
                <div class="mb-2">
                    <label class="pe-form-label text-danger">ถ่ายรูปหลักฐาน (Photo Evidence) <span class="required">*</span></label>
                    <input type="hidden" id="imageBase64" name="image_base64" value="">
                    <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;">
                    
                    <div class="camera-btn shadow-sm" id="cameraBtn">
                        <i class="fas fa-camera fa-2x mb-1"></i>
                        <h6 class="mb-0 fw-bold">แตะเพื่อถ่ายรูป</h6>
                    </div>

                    <div class="preview-container" id="previewContainer">
                        <button type="button" class="remove-img-btn" id="removeImgBtn"><i class="fas fa-times"></i></button>
                        <img id="imagePreview" src="" alt="Preview">
                    </div>
                </div>
            </div>

            <button type="submit" class="btn-app-primary mt-4 w-100" id="submitBtn">
                <i class="fas fa-save me-2"></i> บันทึกผลการตรวจสอบ
            </button>
        </form>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const failActionArea = document.getElementById('failActionArea');
    const submitBtn = document.getElementById('submitBtn');
    
    // Auto-fill audited_by if previously saved
    const savedName = localStorage.getItem('preop_audited_by');
    if(savedName) {
        document.querySelector('input[name="audited_by"]').value = savedName;
    }
    
    // Check if any "no" is selected
    function checkFailures() {
        let hasFailure = false;
        const noRadios = document.querySelectorAll('input[type="radio"][value="no"]');
        noRadios.forEach(radio => {
            if (radio.checked) hasFailure = true;
        });
        
        if (hasFailure) {
            failActionArea.style.display = 'block';
            submitBtn.className = 'btn-app-danger mt-4 w-100';
            submitBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-2"></i> แจ้งเหตุฉุกเฉิน (เครื่องจักรมีปัญหา)';
            document.getElementById('failRemarks').required = true;
        } else {
            failActionArea.style.display = 'none';
            submitBtn.className = 'btn-app-primary mt-4 w-100';
            submitBtn.innerHTML = '<i class="fas fa-save me-2"></i> บันทึกผลการตรวจสอบ (ปกติ)';
            document.getElementById('failRemarks').required = false;
        }
    }
    
    // Load dynamic checklist
    async function loadChecklist(machineCode) {
        const container = document.getElementById('checklistContainer');
        if (!machineCode) {
            container.innerHTML = '<div class="alert alert-warning">กรุณาระบุรหัสเครื่องจักร</div>';
            return;
        }
        
        try {
            const response = await fetch('api/preopAPI.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_checklist', machine_code: machineCode })
            });
            const result = await response.json();
            
            if (result.success && result.data && result.data.length > 0) {
                container.innerHTML = ''; 
                
                result.data.forEach((item, index) => {
                    const i = index + 1;
                    const html = `
                        <div class="checklist-item" id="item${i}">
                            <div class="checklist-question">${i}. ${item.item_text}</div>
                            <div class="d-flex w-100" style="gap: 10px;">
                                <input type="radio" class="btn-check btn-check-custom checklist-radio" 
                                    name="q${item.item_id}" id="q${item.item_id}_yes" value="yes" 
                                    data-item-id="${item.item_id}" data-item-text="${item.item_text}" required>
                                <label class="btn btn-outline-success w-50 fw-bold" for="q${item.item_id}_yes"><i class="fas fa-check me-1"></i> YES</label>
                                
                                <input type="radio" class="btn-check btn-check-custom checklist-radio" 
                                    name="q${item.item_id}" id="q${item.item_id}_no" value="no" 
                                    data-item-id="${item.item_id}" data-item-text="${item.item_text}" required>
                                <label class="btn btn-outline-danger w-50 fw-bold" for="q${item.item_id}_no"><i class="fas fa-times me-1"></i> NO</label>
                            </div>
                        </div>
                    `;
                    container.insertAdjacentHTML('beforeend', html);
                });
                
                document.querySelectorAll('.checklist-radio').forEach(input => {
                    input.addEventListener('change', checkFailures);
                });
            } else {
                container.innerHTML = '<div class="alert alert-danger">ไม่พบแบบฟอร์ม หรือรหัสเครื่องจักรไม่ถูกต้อง</div>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="alert alert-danger">เกิดข้อผิดพลาดในการโหลดแบบฟอร์ม</div>';
        }
    }
    
    // Load immediately if machineCode exists
    const initialMachineCode = document.getElementById('machineCode').value.trim();
    if (initialMachineCode) {
        loadChecklist(initialMachineCode);
    }
    
    // Allow reloading if user types machine code manually
    document.getElementById('machineCode').addEventListener('blur', function(e) {
        if(e.target.value.trim() !== '') {
            document.getElementById('checklistContainer').innerHTML = '<div class="text-center py-4 text-secondary"><i class="fas fa-spinner fa-spin fa-2x mb-2"></i><p class="mb-0">กำลังโหลดรายการตรวจสอบ...</p></div>';
            loadChecklist(e.target.value.trim());
        }
    });

    // Camera logic
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraInput = document.getElementById('cameraInput');
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    const removeImgBtn = document.getElementById('removeImgBtn');
    const imageBase64 = document.getElementById('imageBase64');

    cameraBtn.addEventListener('click', () => { cameraInput.click(); });

    cameraInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Validate size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                Swal.fire('ขนาดไฟล์เกิน', 'กรุณาอัปโหลดรูปภาพขนาดไม่เกิน 5MB', 'warning');
                cameraInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(evt) {
                // Compression logic (very basic resize for canvas)
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1200;
                    const MAX_HEIGHT = 1200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    imagePreview.src = dataUrl;
                    imageBase64.value = dataUrl;
                    
                    cameraBtn.style.display = 'none';
                    previewContainer.style.display = 'block';
                }
                img.src = evt.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener('click', () => {
        cameraInput.value = '';
        imageBase64.value = '';
        imagePreview.src = '';
        previewContainer.style.display = 'none';
        cameraBtn.style.display = 'block';
    });

    // Form Submission
    document.getElementById('preopForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const machineCode = document.getElementById('machineCode').value.trim();
        if(!machineCode) {
            Swal.fire('Error', 'กรุณาระบุรหัสเครื่องจักร', 'error');
            return;
        }

        const failAreaVisible = failActionArea.style.display === 'block';
        if (failAreaVisible && !imageBase64.value) {
            Swal.fire('ถ่ายรูปหลักฐาน', 'กรุณาถ่ายรูปปัญหาที่พบเพื่อเป็นหลักฐาน', 'warning');
            return;
        }

        submitBtn.disabled = true;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังส่งข้อมูล...';

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Extract checklist data dynamically
        const checklistData = [];
        document.querySelectorAll('.checklist-item').forEach(itemDiv => {
            const radio = itemDiv.querySelector('input[type="radio"]:checked');
            if (radio) {
                checklistData.push({
                    item_id: radio.dataset.itemId,
                    text: radio.dataset.itemText,
                    answer: radio.value
                });
            }
        });
        
        data.checklist_data = checklistData;

        try {
            const response = await fetch('api/preopAPI.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'submit_preop', ...data })
            });

            const result = await response.json();
            
            if (result.success) {
                // Save audited_by to local storage for future auto-fill
                localStorage.setItem('preop_audited_by', data.audited_by);
                
                Swal.fire({
                    title: 'บันทึกสำเร็จ!',
                    text: result.message,
                    icon: 'success',
                    confirmButtonColor: '#3b82f6',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    // Reset form but keep machine code and user name
                    const mc = machineCode;
                    const auditedBy = data.audited_by;
                    document.getElementById('preopForm').reset();
                    document.getElementById('machineCode').value = mc;
                    document.querySelector('input[name="audited_by"]').value = auditedBy;
                    removeImgBtn.click();
                    checkFailures();
                    
                    // Reload checklist just in case
                    loadChecklist(mc);
                });
            } else {
                Swal.fire('เกิดข้อผิดพลาด', result.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        } catch (err) {
            console.error(err);
            Swal.fire('Network Error', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
</script>

</body>
</html>
