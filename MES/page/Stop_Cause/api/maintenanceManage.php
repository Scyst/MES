<?php
// MES/page/Stop_Cause/api/maintenanceManage.php
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

require_once __DIR__ . '/../../../utils/libs/phpmailer/src/Exception.php';
require_once __DIR__ . '/../../../utils/libs/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/../../../utils/libs/phpmailer/src/SMTP.php';
require_once __DIR__ . '/generate_job_pdf.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$currentUser = $_SESSION['user'];

function sendEmailReport($pdo, $jobId) {
    $mail = new PHPMailer(true); 
    try {
        // 1. ข้อมูล
        $stmt = $pdo->prepare("SELECT * FROM " . MAINTENANCE_REQUESTS_TABLE . " WHERE id = ?");
        $stmt->execute([$jobId]);
        $job = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$job) return false;

        // 2. ตั้งค่า Server
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = SMTP_SECURE;
        $mail->Port       = SMTP_PORT;
        $mail->CharSet    = 'UTF-8';

        // 3. ผู้รับ
        $mail->setFrom(EMAIL_FROM, EMAIL_FROM_NAME);
        $mail->addAddress(EMAIL_TO_REPORT); 

        if (defined('EMAIL_CC_REPORT') && EMAIL_CC_REPORT !== '') {
            $cleanCC = str_replace(' ', '', EMAIL_CC_REPORT);
            $ccList = explode(',', $cleanCC);
            
            foreach ($ccList as $email) {
                if (!empty($email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    if (strcasecmp($email, EMAIL_TO_REPORT) !== 0) {
                        $mail->addCC($email);
                    }
                }
            }
        }

        // 4. สร้าง PDF (String)
        $pdfContent = generateJobOrderPDF($pdo, $jobId, true);

        // 5. Attach PDF
        if ($pdfContent) {
            $mail->addStringAttachment($pdfContent, 'JobOrder_MT-' . $jobId . '.pdf');
        }

        // 6. Attach Images
        $uploadDir = __DIR__ . '/../../uploads/maintenance/'; 
        
        if (!empty($job['photo_after_path'])) {
             $fName = basename($job['photo_after_path']);
             if (file_exists($uploadDir . $fName)) {
                 $mail->addAttachment($uploadDir . $fName, 'After_Photo.jpg');
             }
        }

        // 7. เนื้อหาเมล
        $webLink = BASE_URL . "/page/Stop_Cause/print_job_order.php?id=" . $jobId;

        $mail->isHTML(true);
        $mail->Subject = 'Job Completed: ' . $job['machine'] . ' (Line: ' . $job['line'] . ')';
        
        $body = "<h2>Maintenance Job Completed</h2>";
        $body .= "<p><b>ID:</b> #{$jobId}</p>";
        $body .= "<p><b>Machine:</b> {$job['machine']} ({$job['line']})</p>";
        $body .= "<p><b>Issue:</b> {$job['issue_description']}</p>";
        $body .= "<p><b>Solution:</b> " . ($job['technician_note'] ?? '-') . "</p>";
        $body .= "<p><b>By:</b> " . ($job['resolved_by'] ?? '-') . "</p>";
        
        $body .= "<hr>";
        $body .= "<p>หากไฟล์แนบแสดงผลไม่ถูกต้อง สามารถคลิกเพื่อดูเอกสารฉบับเต็มได้ที่ลิงก์ด้านล่าง:</p>";
        $body .= "<p><a href='{$webLink}' target='_blank' style='background-color:#0d6efd; color:white; padding:10px 15px; text-decoration:none; border-radius:5px;'>📄 เปิดดูใบงาน (Web Version)</a></p>";
        $body .= "<p><small>Link: <a href='{$webLink}'>{$webLink}</a></small></p>";

        $mail->Body = $body;
        $mail->AltBody = strip_tags($body);

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Mail Error: {$mail->ErrorInfo}");
        return false;
    }
}

try {
    switch ($action) {
        case 'get_requests':
            $conditions = [];
            $params = [];
            
            if (!empty($_GET['status'])) { 
                if ($_GET['status'] === 'Active') {
                    $conditions[] = "M.status IN ('Pending', 'In Progress')";
                } else {
                    $conditions[] = "M.status = ?"; 
                    $params[] = $_GET['status']; 
                }
            }
            if (!empty($_GET['line'])) {
                $conditions[] = "M.line = ?"; 
                $params[] = $_GET['line'];
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            
            $sql = "SELECT M.*, 
                           COALESCE(E1.name_th, U1.username, M.request_by) as requester_name,
                           COALESCE(E2.name_th, U2.username, M.resolved_by) as resolver_name
                    FROM " . MAINTENANCE_REQUESTS_TABLE . " M
                    LEFT JOIN " . USERS_TABLE . " U1 ON M.request_by = U1.username
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E1 ON U1.emp_id = E1.emp_id
                    LEFT JOIN " . USERS_TABLE . " U2 ON M.resolved_by = U2.username
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E2 ON U2.emp_id = E2.emp_id
                    $whereClause 
                    ORDER BY CASE WHEN M.status = 'Pending' THEN 1 WHEN M.status = 'In Progress' THEN 2 ELSE 3 END, M.request_date DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'add_request':
            if (empty($input['machine']) || empty($input['issue_description'])) {
                throw new Exception("Please fill in all required fields.");
            }

            $photoPath = null;
            if (!empty($_FILES['photo_before']['name'])) {
                $uploadDir = __DIR__ . '/../../uploads/maintenance/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                
                $ext = pathinfo($_FILES['photo_before']['name'], PATHINFO_EXTENSION);
                $newFilename = "before_" . time() . "_" . rand(100,999) . "." . $ext; 
                
                if (move_uploaded_file($_FILES['photo_before']['tmp_name'], $uploadDir . $newFilename)) {
                    $photoPath = '../uploads/maintenance/' . $newFilename;
                }
            }

            $sql = "INSERT INTO " . MAINTENANCE_REQUESTS_TABLE . " (request_by, line, machine, issue_description, priority, photo_before_path) VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $priority = $input['priority'] ?? 'Normal';
            $line = !empty($input['line']) ? $input['line'] : ($currentUser['line'] ?? 'Unknown');

            if ($stmt->execute([$currentUser['username'], $line, $input['machine'], $input['issue_description'], $priority, $photoPath])) {
                logAction($pdo, $currentUser['username'], 'ADD_MT_REQ', $line, "Machine: {$input['machine']}, Issue: {$input['issue_description']}");
                echo json_encode(['success' => true, 'message' => 'Maintenance request submitted.']);
            } else {
                throw new Exception("Failed to save request.");
            }
            break;

        case 'complete_job':
        case 'update_status':
            $id = $input['id'] ?? $_POST['id'] ?? null;
            $status = $input['status'] ?? $_POST['status'] ?? 'Completed';
            $techNote = $input['technician_note'] ?? $_POST['technician_note'] ?? null;
            $spareParts = $input['spare_parts_list'] ?? $_POST['spare_parts_list'] ?? null;
            $startedAt = $input['started_at'] ?? $_POST['started_at'] ?? null;
            $resolvedAt = $input['resolved_at'] ?? $_POST['resolved_at'] ?? null;

            if (!$id) throw new Exception("Invalid ID.");

            $updateFields = [];
            $params = [];
            $uploadDir = __DIR__ . '/../../uploads/maintenance/';

            $updateFields[] = "status = ?";
            $params[] = $status;

            if ($techNote !== null) { $updateFields[] = "technician_note = ?"; $params[] = $techNote; }
            if ($spareParts !== null) { $updateFields[] = "spare_parts_list = ?"; $params[] = $spareParts; }
            if (!empty($startedAt)) { $updateFields[] = "started_at = ?"; $params[] = str_replace('T', ' ', $startedAt); }
            
            if ($status === 'Completed') {
                $updateFields[] = "resolved_by = ?";
                $params[] = $currentUser['username'];
                $updateFields[] = "resolved_at = ?";
                $params[] = !empty($resolvedAt) ? str_replace('T', ' ', $resolvedAt) : date('Y-m-d H:i:s');
            }
            
            if (!empty($_FILES['photo_after']['name'])) {
                $ext = pathinfo($_FILES['photo_after']['name'], PATHINFO_EXTENSION);
                $newFilename = "after_{$id}_" . time() . "." . $ext;
                if (move_uploaded_file($_FILES['photo_after']['tmp_name'], $uploadDir . $newFilename)) {
                    $updateFields[] = "photo_after_path = ?";
                    $params[] = '../uploads/maintenance/' . $newFilename;
                }
            }

            $sql = "UPDATE " . MAINTENANCE_REQUESTS_TABLE . " SET " . implode(", ", $updateFields) . " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            if ($stmt->execute($params)) {
                if ($status === 'Completed') sendEmailReport($pdo, $id);
                echo json_encode(['success' => true, 'message' => 'Status updated successfully.']);
            } else {
                throw new Exception("Database update failed.");
            }
            break;

        case 'resend_email':
             $id = $input['id'] ?? null;
             if(sendEmailReport($pdo, $id)) echo json_encode(['success'=>true]);
             else echo json_encode(['success'=>false]);
             break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>