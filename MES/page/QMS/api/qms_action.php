<?php
// MES/page/QMS/api/qms_action.php

header('Content-Type: application/json; charset=utf-8');
require_once '../../../config/config.php';
require_once '../../db.php';

session_start();
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Unauthorized']);
    exit;
}

// ฟังก์ชันย่อรูป
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
$user_id = $_SESSION['user']['id'];

try {
    switch ($action) {
        
        // ==========================================
        // 1. CREATE NCR (สร้างเคสใหม่ + อัพโหลดรูป)
        // ==========================================
        case 'create_ncr':
            // เรียก SP จัดการ Lock และรันเลขให้ปลอดภัย
            $sql = "
                SET NOCOUNT ON;
                DECLARE @newId INT, @newCarNo VARCHAR(50);
                EXEC sp_QMS_CreateNCR 
                    @customer_name = ?, @product_name = ?, @defect_type = ?, 
                    @defect_qty = ?, @defect_description = ?, @production_date = ?, 
                    @lot_no = ?, @found_shift = ?, @product_model = ?, 
                    @production_line = ?, @created_by = ?, @issue_by_name = ?,
                    @NewCaseID = @newId OUTPUT, @GeneratedCarNo = @newCarNo OUTPUT;
                SELECT @newId AS case_id, @newCarNo AS car_no;
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $_POST['customer_name'] ?? '', $_POST['product_name'] ?? '',
                $_POST['defect_type'] ?? '', $_POST['defect_qty'] ?? 0,
                $_POST['defect_description'] ?? '', empty($_POST['production_date']) ? null : $_POST['production_date'],
                $_POST['lot_no'] ?? null, $_POST['found_shift'] ?? null,
                $_POST['product_model'] ?? null, $_POST['production_line'] ?? null, 
                $user_id, $_POST['issue_by_name'] ?? $_SESSION['user']['username']
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result || empty($result['case_id'])) throw new Exception("Database failed to generate NCR Case.");

            $caseId = $result['case_id'];
            $newCarNo = $result['car_no'];

            // จัดการรูปภาพ (ถ้ามี)
            if (!empty($_FILES['ncr_images']['name'][0])) {
                $baseUploadDir = __DIR__ . '/../../../uploads/qms_files/';
                if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0777, true);

                $pdo->beginTransaction();
                foreach ($_FILES['ncr_images']['tmp_name'] as $key => $tmpName) {
                    if ($_FILES['ncr_images']['error'][$key] === UPLOAD_ERR_OK) {
                        $fileName = basename($_FILES['ncr_images']['name'][$key]);
                        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                        $newFileName = "car_{$caseId}_" . time() . "_{$key}." . $ext;
                        $targetPath = $baseUploadDir . $newFileName;

                        if (!compressImage($tmpName, $targetPath, 70)) {
                            move_uploaded_file($tmpName, $targetPath);
                        }

                        $dbPath = '../../uploads/qms_files/' . $newFileName;
                        $stmtAtt = $pdo->prepare("INSERT INTO QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by) VALUES (?, 'NCR', ?, ?, ?)");
                        $stmtAtt->execute([$caseId, $fileName, $dbPath, $user_id]);
                    }
                }
                $pdo->commit();
            }

            echo json_encode(['success' => true, 'data' => ['car_no' => $newCarNo, 'case_id' => $caseId], 'message' => 'แจ้งปัญหาเรียบร้อยแล้ว']);
            break;

        // ==========================================
        // 2. ISSUE CAR (ส่งให้ลูกค้า)
        // ==========================================
        case 'issue_car':
            $case_id = $_POST['case_id'] ?? null;
            $qa_desc = $_POST['qa_issue_description'] ?? '';
            if (!$case_id) throw new Exception("Missing Case ID");

            $token = bin2hex(random_bytes(16));
            $expiry = date('Y-m-d H:i:s', strtotime('+7 days'));

            $pdo->beginTransaction();
            $sqlCAR = "
                MERGE INTO QMS_CAR AS target
                USING (SELECT ? AS case_id) AS source ON (target.case_id = source.case_id)
                WHEN MATCHED THEN UPDATE SET qa_issue_description = ?, access_token = ?, token_expiry = ?
                WHEN NOT MATCHED THEN INSERT (case_id, qa_issue_description, access_token, token_expiry) VALUES (?, ?, ?, ?);
            ";
            $stmt = $pdo->prepare($sqlCAR);
            $stmt->execute([$case_id, $qa_desc, $token, $expiry, $case_id, $qa_desc, $token, $expiry]);

            $stmtCase = $pdo->prepare("UPDATE QMS_CASES SET current_status = 'SENT_TO_CUSTOMER', updated_at = GETDATE() WHERE case_id = ?");
            $stmtCase->execute([$case_id]);
            $pdo->commit();

            echo json_encode(['success' => true, 'data' => ['token' => $token], 'message' => 'สร้าง CAR และลิงก์สำหรับลูกค้าสำเร็จ']);
            break;

        // ==========================================
        // 3. CLOSE CLAIM (ปิดงาน)
        // ==========================================
        case 'close_claim':
            $case_id = $_POST['case_id'] ?? null;
            $disposition = $_POST['disposition'] ?? null;
            $final_qty = $_POST['final_qty'] ?? 0;
            $cost = $_POST['cost_estimation'] ?? 0;
            
            if (!$case_id || !$disposition) throw new Exception("Missing required parameters: case_id or disposition");

            $pdo->beginTransaction();
            $sqlClaim = "
                MERGE INTO QMS_CLAIM AS target
                USING (SELECT ? AS case_id) AS source ON (target.case_id = source.case_id)
                WHEN MATCHED THEN UPDATE SET disposition = ?, final_qty = ?, cost_estimation = ?, approved_by = ?, closed_at = GETDATE()
                WHEN NOT MATCHED THEN INSERT (case_id, disposition, final_qty, cost_estimation, approved_by, closed_at) VALUES (?, ?, ?, ?, ?, GETDATE());
            ";
            $stmt = $pdo->prepare($sqlClaim);
            $stmt->execute([$case_id, $disposition, $final_qty, $cost, $user_id, $case_id, $disposition, $final_qty, $cost, $user_id]);

            $stmtCase = $pdo->prepare("UPDATE QMS_CASES SET current_status = 'CLOSED', updated_at = GETDATE() WHERE case_id = ?");
            $stmtCase->execute([$case_id]);
            $pdo->commit();

            echo json_encode(['success' => true, 'data' => ['case_id' => $case_id], 'message' => 'ปิดงานเคลมเรียบร้อยแล้ว']);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => $e->getMessage()]);
}
?>