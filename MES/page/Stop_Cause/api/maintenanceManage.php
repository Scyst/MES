<?php
// MES/page/Stop_Cause/api/maintenanceManage.php
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

// ปิดการใช้ PDF และ Mailer ชั่วคราวเพื่อเพิ่ม Performance
// require_once __DIR__ . '/../../../utils/libs/phpmailer/src/Exception.php';
// require_once __DIR__ . '/../../../utils/libs/phpmailer/src/PHPMailer.php';
// require_once __DIR__ . '/../../../utils/libs/phpmailer/src/SMTP.php';
// require_once __DIR__ . '/generate_job_pdf.php';

// use PHPMailer\PHPMailer\PHPMailer;
// use PHPMailer\PHPMailer\Exception;

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

/**
 * [DISABLED] ฟังก์ชันส่ง Email ถูกปิดใช้งานชั่วคราวเพื่อแก้ปัญหา Latency และ Network Firewall
 */
/*
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
*/

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
            if (!empty($_GET['startDate'])) { 
                $conditions[] = "request_date >= ?"; 
                $params[] = $_GET['startDate']; 
            }
            if (!empty($_GET['endDate'])) { 
                // ใช้ < วันถัดไป เพื่อเอาเวลาทั้งหมดของวันนั้น
                $conditions[] = "request_date < DATEADD(DAY, 1, CAST(? AS DATE))"; 
                $params[] = $_GET['endDate']; 
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            
            // ใช้ WITH (NOLOCK) เพื่อไม่ให้บล็อกการทำงานของระบบบันทึกข้อมูลหลัก
            $sql = "SELECT M.*, 
                           COALESCE(E1.name_th, U1.username, M.request_by) as requester_name,
                           COALESCE(E2.name_th, U2.username, M.resolved_by) as resolver_name
                    FROM " . MAINTENANCE_REQUESTS_TABLE . " M WITH (NOLOCK)
                    LEFT JOIN " . USERS_TABLE . " U1 WITH (NOLOCK) ON M.request_by = U1.username
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E1 WITH (NOLOCK) ON U1.emp_id = E1.emp_id
                    LEFT JOIN " . USERS_TABLE . " U2 WITH (NOLOCK) ON M.resolved_by = U2.username
                    LEFT JOIN " . MANPOWER_EMPLOYEES_TABLE . " E2 WITH (NOLOCK) ON U2.emp_id = E2.emp_id
                    $whereClause 
                    ORDER BY CASE WHEN M.status = 'Pending' THEN 1 WHEN M.status = 'In Progress' THEN 2 ELSE 3 END, M.request_date DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_maintenance_summary':
            $startDate = $_GET['startDate'] ?? date('Y-m-01');
            $endDate   = $_GET['endDate'] ?? date('Y-m-d');
            $lineFilter = !empty($_GET['line']) ? $_GET['line'] : null;

            // [FIXED] แปลง EndDate ให้ครอบคลุมถึงสิ้นวัน (23:59:59.999)
            // โดยการใช้เงื่อนไข: request_date >= Start AND request_date < (End + 1 วัน)
            $params = [$startDate, $endDate];
            
            $lineCondition = "";
            if ($lineFilter && $lineFilter !== 'All') { // ดัก 'All' เผื่อหลุดมา
                $lineCondition = "AND line = ?";
                $params[] = $lineFilter;
            }

            // 1. ภาพรวม (Total, Completed, Pending, Avg Time)
            // ใช้ DATEADD(DAY, 1, ?) เพื่อให้ครอบคลุมเวลาทั้งวันของวันสุดท้าย
            $sqlStats = "SELECT 
                            COUNT(*) as Total_Jobs,
                            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as Completed_Jobs,
                            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as Pending_Jobs,
                            -- คำนวณเวลาเฉลี่ย (นาที) -> แปลงเป็นทศนิยม 0 ตำแหน่ง (Int)
                            ISNULL(AVG(CASE WHEN status = 'Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN DATEDIFF(MINUTE, started_at, resolved_at) 
                                     ELSE NULL END), 0) as Avg_Repair_Time
                         FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                         WHERE request_date >= ? 
                           AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) 
                         $lineCondition";

            $stmtStats = $pdo->prepare($sqlStats);
            $stmtStats->execute($params);
            $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);

            // 2. แยกตาม Line (Top 5)
            $sqlByLine = "SELECT TOP 5 line, COUNT(*) as job_count
                          FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                          WHERE request_date >= ? 
                            AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) 
                          $lineCondition
                          GROUP BY line
                          ORDER BY job_count DESC";
            
            $stmtLine = $pdo->prepare($sqlByLine);
            $stmtLine->execute($params);
            $byLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

            // 3. แยกตาม Priority
            $sqlByPrio = "SELECT priority, COUNT(*) as job_count
                          FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                          WHERE request_date >= ? 
                            AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) 
                          $lineCondition
                          GROUP BY priority";
            $stmtPrio = $pdo->prepare($sqlByPrio);
            $stmtPrio->execute($params);
            $byPrio = $stmtPrio->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'summary' => $stats,
                'by_line' => $byLine,
                'by_prio' => $byPrio
            ]);
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

            $pdo->beginTransaction(); // เริ่ม Transaction
            try {
                $sql = "INSERT INTO " . MAINTENANCE_REQUESTS_TABLE . " (request_by, line, machine, issue_description, priority, photo_before_path) VALUES (?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $priority = $input['priority'] ?? 'Normal';
                $line = !empty($input['line']) ? $input['line'] : ($currentUser['line'] ?? 'Unknown');

                $stmt->execute([$currentUser['username'], $line, $input['machine'], $input['issue_description'], $priority, $photoPath]);
                
                logAction($pdo, $currentUser['username'], 'ADD_MT_REQ', $line, "Machine: {$input['machine']}, Issue: {$input['issue_description']}");
                
                $pdo->commit(); // บันทึกสำเร็จ
                echo json_encode(['success' => true, 'message' => 'Maintenance request submitted.']);
            } catch (Exception $e) {
                $pdo->rollBack(); // ยกเลิกหากมี Error
                throw $e;
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

            $pdo->beginTransaction(); // เริ่ม Transaction
            try {
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
                $stmt->execute($params);

                // [DISABLED] ปิดการส่ง Email เพื่อความเร็ว
                // if ($status === 'Completed') sendEmailReport($pdo, $id);
                
                $pdo->commit(); // บันทึกสำเร็จ
                echo json_encode(['success' => true, 'message' => 'Status updated successfully.']);
            } catch (Exception $e) {
                $pdo->rollBack(); // ยกเลิกหากมี Error
                throw $e;
            }
            break;

        case 'get_integrated_maintenance_analysis':
            $startDate = $_GET['startDate'] ?? date('Y-m-01');
            $endDate   = $_GET['endDate'] ?? date('Y-m-d');
            $lineFilter = !empty($_GET['line']) ? $_GET['line'] : null;

            // Prepare Params
            $params = [];
            $lineCondition = "";
            if ($lineFilter && $lineFilter !== 'All') {
                $lineCondition = "AND line = ?";
                $params[] = $lineFilter;
            }

            // --- 1. KPI CARDS ---
            $sqlKPI = "SELECT 
                            -- Card 1: Total Volume
                            COUNT(*) as Total_Req,
                            SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as Total_Critical,
                            SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as Total_High,
                            SUM(CASE WHEN priority = 'Normal' THEN 1 ELSE 0 END) as Total_Normal,

                            -- Card 2: Status Breakdown
                            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as Count_Completed,
                            SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as Count_WIP,
                            SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as Count_Pending,

                            -- Card 3: Repair Time (MTTR) - Only Completed Jobs
                            ISNULL(AVG(CASE WHEN status = 'Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN DATEDIFF(MINUTE, started_at, resolved_at) ELSE NULL END), 0) as Time_Avg,
                            ISNULL(MAX(CASE WHEN status = 'Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN DATEDIFF(MINUTE, started_at, resolved_at) ELSE NULL END), 0) as Time_Max,
                            ISNULL(MIN(CASE WHEN status = 'Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN DATEDIFF(MINUTE, started_at, resolved_at) ELSE NULL END), 0) as Time_Min,

                            -- Card 4: Pending Backlog (งานค้างแยกตามความด่วน)
                            SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) as Total_Backlog,
                            SUM(CASE WHEN status != 'Completed' AND priority = 'Critical' THEN 1 ELSE 0 END) as Backlog_Critical,
                            SUM(CASE WHEN status != 'Completed' AND priority = 'High' THEN 1 ELSE 0 END) as Backlog_High,
                            SUM(CASE WHEN status != 'Completed' AND priority = 'Normal' THEN 1 ELSE 0 END) as Backlog_Normal

                         FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                         WHERE request_date >= ? AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) 
                         $lineCondition";
            
            $stmtKPI = $pdo->prepare($sqlKPI);
            $kpiParams = [$startDate, $endDate];
            if ($lineFilter) $kpiParams[] = $lineFilter;
            $stmtKPI->execute($kpiParams);
            $kpiData = $stmtKPI->fetch(PDO::FETCH_ASSOC);

            // --- 2. TREND CHART (Incoming vs Completed) ---
            // สร้าง Date Range CTE เพื่อให้กราฟต่อเนื่อง
            $sqlTrend = "
            ;WITH DateRange(DateVal) AS (
                SELECT CAST(? AS DATE)
                UNION ALL
                SELECT DATEADD(DAY, 1, DateVal) FROM DateRange WHERE DateVal < CAST(? AS DATE)
            )
            SELECT 
                d.DateVal,
                (SELECT COUNT(*) FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK) 
                 WHERE CAST(request_date AS DATE) = d.DateVal $lineCondition) as Incoming,
                (SELECT COUNT(*) FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK) 
                 WHERE CAST(resolved_at AS DATE) = d.DateVal AND status = 'Completed' $lineCondition) as Completed
            FROM DateRange d
            OPTION (MAXRECURSION 366)
            ";
            
            $stmtTrend = $pdo->prepare($sqlTrend);
            $trendParams = [$startDate, $endDate];
            // ต้อง bind lineCondition ซ้ำ 2 รอบใน subquery
            if ($lineFilter) { $trendParams[] = $lineFilter; $trendParams[] = $lineFilter; } 
            $stmtTrend->execute($trendParams);
            $trendData = $stmtTrend->fetchAll(PDO::FETCH_ASSOC);

            // --- 3. DONUT: Status ---
            $sqlStatus = "SELECT status, COUNT(*) as val FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                          WHERE request_date >= ? AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition
                          GROUP BY status";
            $stmtStatus = $pdo->prepare($sqlStatus);
            $stmtStatus->execute($kpiParams); // ใช้ params ชุดเดียวกับ KPI
            $statusData = $stmtStatus->fetchAll(PDO::FETCH_ASSOC);

            // --- 4. DONUT: Priority ---
            $sqlPrio = "SELECT priority, COUNT(*) as val FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                        WHERE request_date >= ? AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition
                        GROUP BY priority";
            $stmtPrio = $pdo->prepare($sqlPrio);
            $stmtPrio->execute($kpiParams);
            $prioData = $stmtPrio->fetchAll(PDO::FETCH_ASSOC);

            // --- 5. BAR: Top 5 Machines ---
            $sqlTop = "SELECT TOP 5 line, COUNT(*) as val FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                       WHERE request_date >= ? AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition
                       GROUP BY line ORDER BY val DESC";
            $stmtTop = $pdo->prepare($sqlTop);
            $stmtTop->execute($kpiParams);
            $topData = $stmtTop->fetchAll(PDO::FETCH_ASSOC);

            // --- 6. TABLE: Analysis ---
            $sqlTable = "SELECT 
                            line, machine,
                            COUNT(*) as total_count,
                            SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed_count,
                            ISNULL(AVG(CASE WHEN status='Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN DATEDIFF(MINUTE, started_at, resolved_at) ELSE NULL END), 0) as avg_mttr
                         FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                         WHERE request_date >= ? AND request_date < DATEADD(DAY, 1, CAST(? AS DATE)) $lineCondition
                         GROUP BY line, machine
                         ORDER BY total_count DESC";
            $stmtTable = $pdo->prepare($sqlTable);
            $stmtTable->execute($kpiParams);
            $tableData = $stmtTable->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'kpi' => $kpiData,
                'trend' => $trendData,
                'status_dist' => $statusData,
                'prio_dist' => $prioData,
                'top_machines' => $topData,
                'analysis_table' => $tableData
            ]);
            break;

        case 'resend_email':
            // ปิดฟังก์ชันนี้เนื่องจากปิดระบบ Email
            echo json_encode(['success' => false, 'message' => 'Email system is currently disabled.']);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack(); // Safe Check
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>