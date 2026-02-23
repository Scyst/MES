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

// ==========================================
// SECURITY GUARD: ตรวจสอบ CSRF Token
// ==========================================
$client_token = $_POST['csrf_token'] ?? '';
$server_token = $_SESSION['csrf_token'] ?? '';

if (empty($client_token) || empty($server_token) || !hash_equals($server_token, $client_token)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'data' => null, 'message' => 'Security Error: CSRF Token Validation Failed. Please refresh the page.']);
    exit;
}
// ==========================================

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
            $sql = "
                SET NOCOUNT ON;
                DECLARE @newId INT, @newCarNo VARCHAR(50);
                EXEC sp_QMS_CreateNCR 
                    @customer_name = ?, @product_name = ?, @defect_type = ?, 
                    @defect_qty = ?, @defect_description = ?, @production_date = ?, 
                    @lot_no = ?, @found_shift = ?, @product_model = ?, 
                    @production_line = ?, @created_by = ?, @issue_by_name = ?,
                    @invoice_no = ?, @issuer_position = ?, @found_by_type = ?,
                    @NewCaseID = @newId OUTPUT, @GeneratedCarNo = @newCarNo OUTPUT;
                SELECT @newId AS case_id, @newCarNo AS car_no;
            ";
            
            $raw_defect_qty = trim($_POST['defect_qty'] ?? '');
            $defect_qty = ($raw_defect_qty !== '') ? floatval($raw_defect_qty) : 0;

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $_POST['customer_name'] ?? '', 
                $_POST['product_name'] ?? '',
                $_POST['defect_type'] ?? '', 
                $defect_qty, 
                $_POST['defect_description'] ?? '', 
                empty($_POST['production_date']) ? null : $_POST['production_date'],
                $_POST['lot_no'] ?? null, 
                $_POST['found_shift'] ?? null,
                $_POST['product_model'] ?? null, 
                $_POST['production_line'] ?? null, 
                $user_id, 
                $_POST['issue_by_name'] ?? $_SESSION['user']['username'],
                empty(trim($_POST['invoice_no'] ?? '')) ? null : trim($_POST['invoice_no']),
                empty(trim($_POST['issuer_position'] ?? '')) ? null : trim($_POST['issuer_position']),
                empty(trim($_POST['found_by_type'] ?? '')) ? null : trim($_POST['found_by_type'])
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$result || empty($result['case_id'])) throw new Exception("Database failed to generate NCR Case.");

            $caseId = $result['case_id'];
            $newCarNo = $result['car_no'];

            // จัดการรูปภาพ (ทำนอก Database Transaction เพื่อป้องกัน Table Lock)
            if (!empty($_FILES['ncr_images']['name'][0])) {
                $baseUploadDir = __DIR__ . '/../../../uploads/qms_files/';
                if (!is_dir($baseUploadDir)) mkdir($baseUploadDir, 0777, true);

                $uploadedFiles = []; // ตัวแปรเก็บไฟล์ที่ทำการย่อและย้ายสำเร็จ

                foreach ($_FILES['ncr_images']['tmp_name'] as $key => $tmpName) {
                    if ($_FILES['ncr_images']['error'][$key] === UPLOAD_ERR_OK) {
                        $fileName = basename($_FILES['ncr_images']['name'][$key]);
                        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                        $newFileName = "car_{$caseId}_" . time() . "_{$key}." . $ext;
                        $targetPath = $baseUploadDir . $newFileName;

                        // ประมวลผลไฟล์ลง Disk (อาจใช้เวลาหลายวินาที)
                        if (!compressImage($tmpName, $targetPath, 70)) {
                            move_uploaded_file($tmpName, $targetPath);
                        }

                        // บันทึก Path เป็นแบบ Relative ต่อ Root Project เพื่อไม่ให้พังเวลาย้ายโฟลเดอร์
                        $dbPath = 'uploads/qms_files/' . $newFileName;
                        $uploadedFiles[] = ['name' => $fileName, 'path' => $dbPath];
                    }
                }

                // เปิด Transaction สั้นๆ เพื่อ INSERT ข้อมูลลงตาราง QMS_FILE ทีเดียว
                if (!empty($uploadedFiles)) {
                    $pdo->beginTransaction();
                    $stmtAtt = $pdo->prepare("INSERT INTO QMS_FILE (case_id, doc_stage, file_name, file_path, uploaded_by) VALUES (?, 'NCR', ?, ?, ?)");
                    foreach ($uploadedFiles as $file) {
                        $stmtAtt->execute([$caseId, $file['name'], $file['path'], $user_id]);
                    }
                    $pdo->commit();
                }
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

            // เรียกใช้ Stored Procedure (ไม่ต้องเปิด Transaction ใน PHP)
            $stmt = $pdo->prepare("EXEC sp_QMS_IssueCAR ?, ?, ?, ?");
            $stmt->execute([$case_id, $qa_desc, $token, $expiry]);

            echo json_encode(['success' => true, 'data' => ['token' => $token], 'message' => 'สร้าง CAR และลิงก์สำหรับลูกค้าสำเร็จ']);
            break;

        // ==========================================
        // 3. CLOSE CLAIM (ปิดงาน)
        // ==========================================
        case 'close_claim':
            $case_id = $_POST['case_id'] ?? null;
            $disposition = $_POST['disposition'] ?? null;
            
            if (!$case_id || !$disposition) throw new Exception("Missing required parameters");

            $raw_actual_qty = trim($_POST['actual_received_qty'] ?? '');
            $actual_qty = ($raw_actual_qty !== '') ? floatval($raw_actual_qty) : 0;

            $raw_cost = trim($_POST['cost_estimation'] ?? '');
            $cost = ($raw_cost !== '') ? floatval($raw_cost) : 0;

            // [NEW] รับค่า Checkbox และวันที่ประเมิน
            $std_fmea = isset($_POST['std_fmea']) ? 1 : 0;
            $std_cp   = isset($_POST['std_control_plan']) ? 1 : 0;
            $std_wi   = isset($_POST['std_wi']) ? 1 : 0;
            $std_oth  = empty(trim($_POST['std_others'] ?? '')) ? null : trim($_POST['std_others']);

            $v1_date = empty($_POST['verify_date_1']) ? null : $_POST['verify_date_1'];
            $v1_res  = ($_POST['verify_result_1'] ?? '') !== '' ? (int)$_POST['verify_result_1'] : null;
            
            $v2_date = empty($_POST['verify_date_2']) ? null : $_POST['verify_date_2'];
            $v2_res  = ($_POST['verify_result_2'] ?? '') !== '' ? (int)$_POST['verify_result_2'] : null;
            
            $v3_date = empty($_POST['verify_date_3']) ? null : $_POST['verify_date_3'];
            $v3_res  = ($_POST['verify_result_3'] ?? '') !== '' ? (int)$_POST['verify_result_3'] : null;

            // เรียกใช้ Stored Procedure ด้วย Parameter ใหม่ 15 ตัว (ตามที่อัปเดตใน DB)
            $stmt = $pdo->prepare("EXEC sp_QMS_CloseClaim ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?");
            $stmt->execute([
                $case_id, $disposition, $actual_qty, $cost, $user_id,
                $std_fmea, $std_cp, $std_wi, $std_oth,
                $v1_date, $v1_res, $v2_date, $v2_res, $v3_date, $v3_res
            ]);

            echo json_encode(['success' => true, 'data' => ['case_id' => $case_id], 'message' => 'ตรวจสอบและปิดงานเคลมเรียบร้อยแล้ว']);
            break;

        // ==========================================
        // 4. REJECT CAR (ตีกลับให้ลูกค้าทำมาใหม่ / เติมข้อมูล)
        // ==========================================
        case 'reject_car':
            $case_id = $_POST['case_id'] ?? null;
            if (!$case_id) throw new Exception("Missing Case ID");

            $pdo->beginTransaction();
            
            // 1. ถอยสถานะกลับเป็น SENT_TO_CUSTOMER
            $stmtCase = $pdo->prepare("UPDATE QMS_CASES SET current_status = 'SENT_TO_CUSTOMER', updated_at = GETDATE() WHERE case_id = ?");
            $stmtCase->execute([$case_id]);
            
            // 2. เคลียร์วันที่ตอบกลับ และ ยืดอายุ Token ออกไปอีก 7 วัน เพื่อให้ลูกค้ามีเวลาแก้
            $stmtCar = $pdo->prepare("UPDATE QMS_CAR SET customer_respond_date = NULL, token_expiry = DATEADD(DAY, 7, GETDATE()) WHERE case_id = ?");
            $stmtCar->execute([$case_id]);
            
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'ตีกลับ CAR ไปให้ลูกค้าเรียบร้อยแล้ว']);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'data' => null, 'message' => $e->getMessage()]);
}
?>