<?php
// e:\MES\MES\MES\page\PE\quick_hazard_report.php
$machineCode = $_GET['machine_code'] ?? '';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Quick Hazard Report</title>
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- SweetAlert2 -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    
    <!-- Custom CSS from PE-Enterprise System -->
    <link rel="stylesheet" href="css/pe-enterprise.css?v=<?= time() ?>">
    <link rel="stylesheet" href="css/peRequest.css?v=<?= time() ?>">
    
    <style>
        .hazard-banner {
            background: linear-gradient(135deg, var(--pe-danger), #991b1b);
            color: white;
            padding: 30px 20px;
            text-align: center;
            border-radius: 0 0 24px 24px;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
            margin-bottom: -25px;
            position: relative;
            z-index: 10;
        }
        .camera-btn { 
            border: 2px dashed var(--pe-danger); 
            color: var(--pe-danger); 
            background: rgba(239, 68, 68, 0.05); 
            border-radius: 14px; 
            padding: 35px 10px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.2s ease; 
        }
        .camera-btn:active { 
            transform: scale(0.97); 
            background: rgba(239, 68, 68, 0.1); 
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
        /* Mobile Specific Tweaks */
        body { background-color: var(--pe-bg-body); }
        .pe-form-input[readonly] { opacity: 0.9; cursor: not-allowed; }
    </style>
</head>
<body>

<div class="container-app">
    <div class="hazard-banner">
        <h3 class="mb-1 fw-bold" style="letter-spacing: 0.5px;">
            <i class="fas fa-exclamation-triangle fa-fade text-warning me-2"></i> แจ้งเหตุอันตรายด่วน
        </h3>
        <p class="mb-0 opacity-75 small text-uppercase" style="letter-spacing: 1px;">Safety Hazard Reporting</p>
    </div>

    <div class="app-section active mt-4 px-2 pb-5">
        <form id="hazardForm" class="app-card" style="margin-top: 15px; border-top: 4px solid var(--pe-danger);">
            <input type="hidden" name="action" value="submit_hazard_report">
            <input type="hidden" id="imageBase64" name="image_base64" value="">

            <div class="mb-3">
                <label class="pe-form-label text-danger">รหัสเครื่องจักร (Machine Code) <span class="required">*</span></label>
                <input type="text" class="pe-form-input border-danger text-danger fw-bold text-uppercase" 
                       style="background-color: var(--pe-danger-light); font-size: 1.1rem;" 
                       name="machine_code" id="machineCode" 
                       value="<?= htmlspecialchars($machineCode) ?>" 
                       placeholder="เช่น MC-01" required <?= !empty($machineCode) ? 'readonly' : '' ?>>
                <?php if(empty($machineCode)): ?>
                    <div class="form-text text-danger small mt-1 fw-bold"><i class="fas fa-info-circle"></i> กรุณาระบุรหัสเครื่องจักร</div>
                <?php endif; ?>
            </div>

            <div class="mb-3">
                <label class="pe-form-label">หัวข้อปัญหา (Issue) <span class="required">*</span></label>
                <select class="pe-form-select" name="issue_title" required>
                    <option value="">-- เลือกหัวข้อ --</option>
                    <option value="ปุ่ม Emergency Stop พัง / ไม่ทำงาน">ปุ่ม Emergency Stop พัง / ไม่ทำงาน</option>
                    <option value="Safety Sensor ถูกปิด / ไม่ทำงาน">Safety Sensor ถูกปิด / ไม่ทำงาน</option>
                    <option value="สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ">สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ</option>
                    <option value="อุปกรณ์ป้องกัน / ฝาครอบ หลุดหาย">ฝาครอบ / อุปกรณ์ป้องกัน หลุดหาย</option>
                    <option value="พบความเสี่ยงอื่นๆ">พบความเสี่ยงอื่นๆ (ระบุในรายละเอียด)</option>
                </select>
            </div>

            <div class="mb-3">
                <label class="pe-form-label">รายละเอียดเพิ่มเติม (Detail)</label>
                <textarea class="pe-form-input" name="issue_detail" rows="3" placeholder="อธิบายปัญหาที่พบ... (ถ้ามี)"></textarea>
            </div>

            <div class="mb-4">
                <label class="pe-form-label text-primary">ถ่ายรูปหลักฐาน (Photo Evidence) <span class="required text-danger">*</span></label>
                <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;">
                
                <div class="camera-btn shadow-sm" id="cameraBtn">
                    <i class="fas fa-camera fa-3x mb-2"></i>
                    <h5 class="mb-0 fw-bold">แตะเพื่อถ่ายรูป</h5>
                </div>

                <div class="preview-container" id="previewContainer">
                    <button type="button" class="remove-img-btn" id="removeImgBtn"><i class="fas fa-times"></i></button>
                    <img id="imagePreview" src="" alt="Preview">
                </div>
            </div>

            <button type="submit" class="btn-app-danger mt-3 w-100">
                <i class="fas fa-paper-plane me-2"></i> แจ้งเหตุฉุกเฉิน (ส่งข้อมูลทันที)
            </button>
            
            <div class="text-center mt-3 text-muted fw-bold" style="font-size: 0.75rem;">
                <i class="fas fa-shield-alt text-success me-1"></i> ข้อมูลจะถูกส่งตรงไปที่ทีม PE และ จป. ทันที
            </div>
        </form>
    </div>
</div>

<script src="script/quick_hazard.js?v=<?= time() ?>"></script>
</body>
</html>
