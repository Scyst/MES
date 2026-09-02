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
    <link href="../../utils/libs/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="../../utils/libs/fontawesome/css/all.min.css">
    <!-- SweetAlert2 -->
    <script src="../../utils/libs/sweetalert2.all.min.js"></script>
    
    <!-- Custom CSS from PE-Enterprise System -->
    <link rel="stylesheet" href="css/pe-enterprise.css?v=<?= time() ?>">
    <link rel="stylesheet" href="css/peRequest.css?v=<?= time() ?>">
    
    <style>
        .app-header-hazard {
            background: linear-gradient(135deg, #dc2626, #991b1b);
            color: white;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 1040;
            border-radius: 0 0 20px 20px;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        }
        .app-header-hazard h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin: 0;
        }
        
        .hazard-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            border: 1px solid rgba(220, 38, 38, 0.2);
            box-shadow: 0 8px 32px rgba(220, 38, 38, 0.08);
            padding: 25px;
            margin-top: 15px;
        }
        
        .hazard-card-title {
            font-size: 1.1rem;
            font-weight: 800;
            color: #dc2626;
            margin-bottom: 20px;
            text-align: center;
            letter-spacing: 0.5px;
        }

        .camera-btn { 
            border: 2px dashed #f87171; 
            color: #dc2626; 
            background: rgba(254, 226, 226, 0.5); 
            border-radius: 16px; 
            padding: 30px 10px; 
            text-align: center; 
            cursor: pointer; 
            transition: all 0.2s ease; 
        }
        .camera-btn:active { 
            transform: scale(0.97); 
            background: rgba(254, 226, 226, 0.8); 
        }
        .preview-container { 
            position: relative; 
            display: none; 
            margin-top: 15px; 
        }
        .preview-container img { 
            width: 100%; 
            border-radius: 16px; 
            border: 2px solid #ef4444; 
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2); 
        }
        .remove-img-btn { 
            position: absolute; 
            top: -12px; 
            right: -12px; 
            background: #dc2626; 
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

        /* Input specific for hazard */
        .hazard-input {
            border: 1px solid rgba(220, 38, 38, 0.3) !important;
            border-radius: 12px;
            padding: 12px 15px;
            font-size: 1rem;
            background-color: #fff;
            transition: all 0.3s ease;
        }
        .hazard-input:focus {
            border-color: #dc2626 !important;
            box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.2) !important;
        }
        
        .hazard-input[readonly] { 
            background-color: #fee2e2;
            color: #991b1b;
            font-weight: 700;
            opacity: 1; 
        }

        .btn-hazard-submit {
            background: linear-gradient(135deg, #ef4444, #b91c1c);
            color: white;
            border: none;
            border-radius: 14px;
            padding: 14px;
            font-size: 1.1rem;
            font-weight: 700;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
            transition: all 0.2s ease;
        }
        .btn-hazard-submit:active {
            transform: scale(0.97);
            box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        body { 
            background-color: var(--pe-bg-body);
            padding-bottom: 0 !important;
        }
    </style>
</head>
<body>

<div class="container-app">
    <header class="app-header-hazard">
        <h1><i class="fas fa-exclamation-triangle fa-fade text-warning me-2"></i> Safety Hazard</h1> 
    </header>

    <div class="app-section active mt-2 px-3 pb-3">
        <form id="hazardForm" class="hazard-card">
            <input type="hidden" name="action" value="submit_hazard_report">
            <input type="hidden" id="imageBase64" name="image_base64" value="">

            <div class="hazard-card-title">
                แบบฟอร์มแจ้งเหตุอันตรายด่วน
            </div>

            <div class="mb-4">
                <label class="pe-form-label text-danger">รหัสเครื่องจักร (Machine Code) <span class="text-danger">*</span></label>
                <input type="text" class="form-control hazard-input text-uppercase" 
                       name="machine_code" id="machineCode" 
                       value="<?= htmlspecialchars($machineCode) ?>" 
                       placeholder="เช่น MC-01" required <?= !empty($machineCode) ? 'readonly' : '' ?>>
                <?php if(empty($machineCode)): ?>
                    <div class="form-text text-danger small mt-1 fw-bold"><i class="fas fa-info-circle"></i> กรุณาระบุรหัสเครื่องจักร</div>
                <?php endif; ?>
            </div>

            <div class="mb-4">
                <label class="pe-form-label">หัวข้อปัญหา (Issue) <span class="text-danger">*</span></label>
                <select class="form-select hazard-input" name="issue_title" required>
                    <option value="">-- เลือกหัวข้อ --</option>
                    <option value="ปุ่ม Emergency Stop พัง / ไม่ทำงาน">ปุ่ม Emergency Stop พัง / ไม่ทำงาน</option>
                    <option value="Safety Sensor ถูกปิด / ไม่ทำงาน">Safety Sensor ถูกปิด / ไม่ทำงาน</option>
                    <option value="สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ">สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ</option>
                    <option value="อุปกรณ์ป้องกัน / ฝาครอบ หลุดหาย">ฝาครอบ / อุปกรณ์ป้องกัน หลุดหาย</option>
                    <option value="พบความเสี่ยงอื่นๆ">พบความเสี่ยงอื่นๆ (ระบุในรายละเอียด)</option>
                </select>
            </div>

            <div class="mb-4">
                <label class="pe-form-label">รายละเอียดเพิ่มเติม (Detail)</label>
                <textarea class="form-control hazard-input" name="issue_detail" rows="3" placeholder="อธิบายปัญหาที่พบ... (ถ้ามี)"></textarea>
            </div>

            <div class="mb-4">
                <label class="pe-form-label text-danger">ถ่ายรูปหลักฐาน (Photo Evidence) <span class="text-danger">*</span></label>
                <input type="file" id="cameraInput" accept="image/*" capture="environment" style="display: none;">
                
                <div class="camera-btn shadow-sm" id="cameraBtn">
                    <i class="fas fa-camera fa-3x mb-2 opacity-75"></i>
                    <h6 class="mb-0 fw-bold">แตะเพื่อถ่ายรูป</h6>
                </div>

                <div class="preview-container" id="previewContainer">
                    <button type="button" class="remove-img-btn" id="removeImgBtn"><i class="fas fa-times"></i></button>
                    <img id="imagePreview" src="" alt="Preview">
                </div>
            </div>

            <button type="submit" class="btn btn-hazard-submit w-100">
                <i class="fas fa-paper-plane me-2"></i> ส่งข้อมูลแจ้งเหตุทันที
            </button>
        </form>
    </div>
</div>

<script src="../../utils/libs/bootstrap.bundle.min.js"></script>
<script src="script/quick_hazard.js?v=<?= time() ?>"></script>
</body>
</html>
