<?php
// MES/page/QMS/api/ncr_action.php

header('Content-Type: application/json');

// Include Config & DB (ถอยตามโครงสร้าง: api -> QMS -> page)
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
    exit;
}

// ฟังก์ชันย่อรูป (Essential for Production)
function compressImage($source, $destination, $quality) {
    $info = getimagesize($source);
    $image = null;
    if ($info['mime'] == 'image/jpeg') $image = imagecreatefromjpeg($source);
    elseif ($info['mime'] == 'image/gif') $image = imagecreatefromgif($source);
    elseif ($info['mime'] == 'image/png') $image = imagecreatefrompng($source);
    
    if (!$image) return false;

    if (function_exists('exif_read_data')) {
        $exif = @exif_read_data($source);
        if (!empty($exif['Orientation'])) {
            switch ($exif['Orientation']) {
                case 3: $image = imagerotate($image, 180, 0); break;
                case 6: $image = imagerotate($image, -90, 0); break;
                case 8: $image = imagerotate($image, 90, 0); break;
            }
        }
    }
    imagejpeg($image, $destination, $quality);
    imagedestroy($image);
    return true;
}

$action = $_POST['action'] ?? '';

if ($action === 'create_ncr') {
    try {
        $pdo->beginTransaction();

        // -----------------------------------------------------
        // 1. Generate CAR No. (Format: CAR-YYMM-XXX)
        // -----------------------------------------------------
        $yearMonth = date('ym'); 
        $prefix = "CAR-" . $yearMonth . "-";
        
        // หาเลขล่าสุดจากตาราง CASES
        $sqlLast = "SELECT TOP 1 car_no FROM " . QMS_CASES_TABLE . " WHERE car_no LIKE ? ORDER BY car_no DESC";
        $stmt = $pdo->prepare($sqlLast);
        $stmt->execute([$prefix . '%']);
        $lastCar = $stmt->fetchColumn();

        $runNo = $lastCar ? intval(substr($lastCar, -3)) + 1 : 1; // รันเลข 3 หลัก
        $newCarNo = $prefix . str_pad($runNo, 3, '0', STR_PAD_LEFT);

        // -----------------------------------------------------
        // 2. Insert into QMS_CASES (เปิดแฟ้มคดี)
        // -----------------------------------------------------
        $sqlCase = "INSERT INTO " . QMS_CASES_TABLE . " 
                    (car_no, customer_name, product_name, current_status, created_by) 
                    VALUES (?, ?, ?, 'NCR_CREATED', ?)";
        $stmtCase = $pdo->prepare($sqlCase);
        $stmtCase->execute([
            $newCarNo,
            $_POST['customer_name'],
            $_POST['product_name'],
            $_SESSION['user']['id']
        ]);
        
        $caseId = $pdo->lastInsertId(); // ได้ ID ของเคสมาใช้ต่อ

        // -----------------------------------------------------
        // 3. Insert into QMS_NCR (เก็บรายละเอียด NCR)
        // -----------------------------------------------------
        $sqlNCR = "INSERT INTO " . QMS_NCR_TABLE . " 
                   (case_id, found_date, found_shift, defect_type, defect_qty, defect_description, production_date, lot_no) 
                   VALUES (?, GETDATE(), ?, ?, ?, ?, ?, ?)";
        $stmtNCR = $pdo->prepare($sqlNCR);
        $stmtNCR->execute([
            $caseId,
            $_POST['found_shift'] ?? null,
            $_POST['defect_type'] ?? null,
            $_POST['defect_qty'] ?? 0,
            $_POST['defect_description'] ?? '',
            !empty($_POST['production_date']) ? $_POST['production_date'] : null,
            $_POST['lot_no'] ?? ''
        ]);

        // -----------------------------------------------------
        // 4. Handle Image Uploads (เก็บลง QMS_ATTACHMENTS)
        // -----------------------------------------------------
        if (!empty($_FILES['ncr_images']['name'][0])) {
            // เก็บที่ page/uploads/qms_files/
            $baseUploadDir = dirname(__DIR__, 2) . '/uploads/qms_files/';
            if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0777, true);

            foreach ($_FILES['ncr_images']['name'] as $key => $fileName) {
                if ($_FILES['ncr_images']['error'][$key] === 0) {
                    $tmpName = $_FILES['ncr_images']['tmp_name'][$key];
                    $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                    
                    // ตั้งชื่อไฟล์: car_CASEID_TIMESTAMP_INDEX.ext
                    $newFileName = "car_{$caseId}_" . time() . "_{$key}." . $ext;
                    $targetPath = $baseUploadDir . $newFileName;

                    // ย่อและบันทึก
                    $uploadOk = compressImage($tmpName, $targetPath, 70); 
                    if (!$uploadOk) $uploadOk = move_uploaded_file($tmpName, $targetPath);

                    if ($uploadOk) {
                        // DB Path (Relative for Web)
                        $dbPath = '../uploads/qms_files/' . $newFileName; 
                        
                        $sqlAtt = "INSERT INTO " . QMS_FILE_TABLE . " 
                                   (case_id, doc_stage, file_name, file_path, uploaded_by) 
                                   VALUES (?, 'NCR', ?, ?, ?)";
                        $stmtAtt = $pdo->prepare($sqlAtt);
                        $stmtAtt->execute([$caseId, $fileName, $dbPath, $_SESSION['user']['id']]);
                    }
                }
            }
        }

        $pdo->commit();
        echo json_encode([
            'status' => 'success', 
            'message' => 'แจ้งปัญหาเรียบร้อยแล้ว',
            'car_no' => $newCarNo
        ]);

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
}
?>