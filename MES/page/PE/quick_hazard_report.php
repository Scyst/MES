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
    <style>
        body { background-color: #f8f9fa; }
        .hazard-header { background: linear-gradient(135deg, #dc3545 0%, #a71d2a 100%); color: white; padding: 20px; text-align: center; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .hazard-card { background: white; border-radius: 15px; padding: 20px; margin-top: -20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .camera-btn { border: 2px dashed #dc3545; color: #dc3545; background: #fff5f5; border-radius: 10px; padding: 30px 10px; text-align: center; cursor: pointer; transition: 0.3s; }
        .camera-btn:active { background: #ffebeb; }
        .preview-container { position: relative; display: none; margin-top: 15px; }
        .preview-container img { width: 100%; border-radius: 10px; border: 2px solid #dc3545; }
        .remove-img-btn { position: absolute; top: -10px; right: -10px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    </style>
</head>
<body>

<div class="hazard-header">
    <h3 class="mb-1"><i class="fas fa-exclamation-triangle"></i> แจ้งเหตุอันตรายด่วน</h3>
    <p class="mb-0 opacity-75 small">Safety Hazard Reporting</p>
</div>

<div class="container mt-4 mb-5">
    <div class="hazard-card">
        <form id="hazardForm">
            <input type="hidden" name="action" value="submit_hazard_report">
            <input type="hidden" id="imageBase64" name="image_base64" value="">

            <div class="mb-3">
                <label class="form-label fw-bold text-danger"><i class="fas fa-industry"></i> รหัสเครื่องจักร / Machine Code <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-lg border-danger text-uppercase" name="machine_code" id="machineCode" value="<?= htmlspecialchars($machineCode) ?>" placeholder="เช่น MC-01" required <?= !empty($machineCode) ? 'readonly' : '' ?>>
                <?php if(empty($machineCode)): ?>
                    <div class="form-text text-muted">กรุณาระบุรหัสเครื่องจักรให้ถูกต้อง</div>
                <?php endif; ?>
            </div>

            <div class="mb-3">
                <label class="form-label fw-bold text-dark"><i class="fas fa-exclamation-circle text-warning"></i> หัวข้อปัญหา <span class="text-danger">*</span></label>
                <select class="form-select form-select-lg" name="issue_title" required>
                    <option value="">-- เลือกหัวข้อ --</option>
                    <option value="ปุ่ม Emergency Stop พัง / ไม่ทำงาน">ปุ่ม Emergency Stop พัง / ไม่ทำงาน</option>
                    <option value="Safety Sensor ถูกปิด / ไม่ทำงาน">Safety Sensor ถูกปิด / ไม่ทำงาน</option>
                    <option value="สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ">สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ</option>
                    <option value="อุปกรณ์ป้องกัน / ฝาครอบ หลุดหาย">ฝาครอบ / อุปกรณ์ป้องกัน หลุดหาย</option>
                    <option value="พบความเสี่ยงอื่นๆ">พบความเสี่ยงอื่นๆ (ระบุในรายละเอียด)</option>
                </select>
            </div>

            <div class="mb-3">
                <label class="form-label fw-bold text-dark"><i class="fas fa-align-left text-muted"></i> รายละเอียดเพิ่มเติม</label>
                <textarea class="form-control" name="issue_detail" rows="3" placeholder="อธิบายปัญหาที่พบ... (ถ้ามี)"></textarea>
            </div>

            <div class="mb-4">
                <label class="form-label fw-bold text-dark"><i class="fas fa-camera text-primary"></i> ถ่ายรูปหลักฐาน <span class="text-danger">*</span></label>
                
                <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;">
                
                <div class="camera-btn" id="cameraBtn">
                    <i class="fas fa-camera fa-3x mb-2"></i>
                    <h5 class="mb-0">แตะเพื่อถ่ายรูป</h5>
                </div>

                <div class="preview-container" id="previewContainer">
                    <button type="button" class="remove-img-btn" id="removeImgBtn"><i class="fas fa-times"></i></button>
                    <img id="imagePreview" src="" alt="Preview">
                </div>
            </div>

            <button type="submit" class="btn btn-danger btn-lg w-100 py-3 shadow-sm fw-bold">
                <i class="fas fa-paper-plane me-2"></i> แจ้งซ่อมฉุกเฉิน (ด่วนที่สุด)
            </button>
            <div class="text-center mt-3 text-muted small">
                ข้อมูลจะถูกส่งไปยังทีมวิศวกร (PE) และ จป. ทันที
            </div>
        </form>
    </div>
</div>

<script src="script/quick_hazard.js?v=<?= time() ?>"></script>
</body>
</html>
