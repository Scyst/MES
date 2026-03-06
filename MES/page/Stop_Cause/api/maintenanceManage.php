<?php
// MES/page/Stop_Cause/api/maintenanceManage.php
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

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
 * ฟังก์ชันตรวจสอบและอัปโหลดรูปภาพ (Security & Validation)
 */
function validateAndUploadImage($fileInput, $prefix, $id = '') {
    if (!isset($fileInput['error']) || is_array($fileInput['error'])) {
        throw new Exception("Invalid file upload parameters.");
    }
    if ($fileInput['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("File upload error code: " . $fileInput['error']);
    }

    if ($fileInput['size'] > (5 * 1024 * 1024)) {
        throw new Exception("ขนาดไฟล์รูปภาพใหญ่เกินไป (สูงสุด 5MB)");
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($fileInput['tmp_name']);
    $allowedTypes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/jpg' => 'jpg'
    ];

    if (!array_key_exists($mimeType, $allowedTypes)) {
        throw new Exception("ระบบรองรับเฉพาะไฟล์รูปภาพ (JPG, PNG) เท่านั้น");
    }

    $ext = $allowedTypes[$mimeType];
    $uploadDir = __DIR__ . '/../../uploads/maintenance/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $newFilename = $prefix . ($id ? "_{$id}_" : "_") . time() . "_" . rand(100,999) . "." . $ext; 
    
    if (!move_uploaded_file($fileInput['tmp_name'], $uploadDir . $newFilename)) {
        throw new Exception("Failed to move uploaded file to destination.");
    }

    return '../uploads/maintenance/' . $newFilename;
}

try {
    switch ($action) {
        case 'get_requests':
            $conditions = [];
            $params = [];
            
            $allowedDateTypes = ['request_date', 'started_at', 'resolved_at'];
            $dateType = (isset($_GET['dateType']) && in_array($_GET['dateType'], $allowedDateTypes)) ? $_GET['dateType'] : 'request_date';
            
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
                $conditions[] = "$dateType >= ?"; 
                $params[] = $_GET['startDate']; 
            }
            if (!empty($_GET['endDate'])) { 
                $conditions[] = "$dateType < DATEADD(DAY, 1, CAST(? AS DATE))"; 
                $params[] = $_GET['endDate']; 
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";
            
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
            $lineFilter = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
            
            $allowedDateTypes = ['request_date', 'started_at', 'resolved_at'];
            $dateType = (isset($_GET['dateType']) && in_array($_GET['dateType'], $allowedDateTypes)) ? $_GET['dateType'] : 'request_date';

            $params = [$startDate, $endDate];
            $lineCondition = "";
            if ($lineFilter) {
                $lineCondition = "AND line = ?";
                $params[] = $lineFilter;
            }

            $dateFilterSql = "($dateType >= ? AND $dateType < DATEADD(DAY, 1, CAST(? AS DATE)))";

            // 💡 [UPDATED] อัปเดตให้รองรับคอลัมน์ actual_repair_minutes ในส่วนของหน้า Summary 
            $sqlStats = "SELECT 
                            COUNT(*) as Total_Jobs,
                            SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as Completed_Jobs,
                            SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as Pending_Jobs,
                            ISNULL(AVG(CASE WHEN status = 'Completed' AND started_at IS NOT NULL AND resolved_at IS NOT NULL 
                                     THEN COALESCE(actual_repair_minutes, DATEDIFF(MINUTE, started_at, resolved_at)) 
                                     ELSE NULL END), 0) as Avg_Repair_Time
                         FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                         WHERE $dateFilterSql $lineCondition";
                         
            $stmtStats = $pdo->prepare($sqlStats);
            $stmtStats->execute($params);
            $stats = $stmtStats->fetch(PDO::FETCH_ASSOC);

            $sqlByLine = "SELECT TOP 5 line, COUNT(*) as job_count
                          FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                          WHERE $dateFilterSql $lineCondition
                          GROUP BY line ORDER BY job_count DESC";
            
            $stmtLine = $pdo->prepare($sqlByLine);
            $stmtLine->execute($params);
            $byLine = $stmtLine->fetchAll(PDO::FETCH_ASSOC);

            $sqlByPrio = "SELECT priority, COUNT(*) as job_count
                          FROM " . MAINTENANCE_REQUESTS_TABLE . " WITH (NOLOCK)
                          WHERE $dateFilterSql $lineCondition
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

            $requestDate = !empty($_POST['request_date']) ? str_replace('T', ' ', $_POST['request_date']) : date('Y-m-d H:i:s');
            
            $photoPath = null;
            if (!empty($_FILES['photo_before']['name'])) {
                $photoPath = validateAndUploadImage($_FILES['photo_before'], 'before');
            }

            $pdo->beginTransaction();
            try {
                $sql = "INSERT INTO " . MAINTENANCE_REQUESTS_TABLE . " 
                        (request_date, request_by, line, machine, issue_description, priority, photo_before_path, job_type, created_at) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())";
                $stmt = $pdo->prepare($sql);
                
                $priority = $input['priority'] ?? 'Normal';
                $line = !empty($input['line']) ? $input['line'] : ($currentUser['line'] ?? 'Unknown');
                $jobType = $input['job_type'] ?? 'Repair';
                
                $stmt->execute([$requestDate, $currentUser['username'], $line, $input['machine'], $input['issue_description'], $priority, $photoPath, $jobType]);
                
                logAction($pdo, $currentUser['username'], 'ADD_MT_REQ', $line, "Type: {$jobType}, Machine: {$input['machine']}");
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Maintenance request submitted.']);
            } catch (Exception $e) {
                $pdo->rollBack();
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

            // 💡 [NEW] รับค่า actual_repair_minutes
            $actualMinutes = isset($_POST['actual_repair_minutes']) && $_POST['actual_repair_minutes'] !== '' ? (int)$_POST['actual_repair_minutes'] : null;

            if (!$id) throw new Exception("Invalid ID.");

            $pdo->beginTransaction();
            try {
                $updateFields = ["status = ?"];
                $params = [$status];

                if ($techNote !== null) { $updateFields[] = "technician_note = ?"; $params[] = $techNote; }
                if ($spareParts !== null) { $updateFields[] = "spare_parts_list = ?"; $params[] = $spareParts; }
                if (!empty($startedAt)) { $updateFields[] = "started_at = ?"; $params[] = str_replace('T', ' ', $startedAt); }
                
                // 💡 [NEW] อัปเดตเวลาซ่อมจริง
                if ($actualMinutes !== null) { 
                    $updateFields[] = "actual_repair_minutes = ?"; 
                    $params[] = $actualMinutes; 
                }
                
                if ($status === 'Completed') {
                    $updateFields[] = "resolved_by = ?";
                    $params[] = $currentUser['username'];
                    $updateFields[] = "resolved_at = ?";
                    $params[] = !empty($resolvedAt) ? str_replace('T', ' ', $resolvedAt) : date('Y-m-d H:i:s');
                }
                
                if (!empty($_FILES['photo_after']['name'])) {
                    $updateFields[] = "photo_after_path = ?";
                    $params[] = validateAndUploadImage($_FILES['photo_after'], 'after', $id);
                }

                $sql = "UPDATE " . MAINTENANCE_REQUESTS_TABLE . " SET " . implode(", ", $updateFields) . " WHERE id = ?";
                $params[] = $id;

                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Status updated successfully.']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_integrated_maintenance_analysis':
            $startDate = $_GET['startDate'] ?? date('Y-m-01');
            $endDate   = $_GET['endDate'] ?? date('Y-m-d');
            $lineFilter = (!empty($_GET['line']) && $_GET['line'] !== 'All') ? $_GET['line'] : null;
            
            $allowedDateTypes = ['request_date', 'started_at', 'resolved_at'];
            $dateType = (isset($_GET['dateType']) && in_array($_GET['dateType'], $allowedDateTypes)) ? $_GET['dateType'] : 'request_date';

            $stmt = $pdo->prepare("EXEC sp_GetMaintenanceDashboardAnalysis @StartDate = ?, @EndDate = ?, @Line = ?, @DateType = ?");
            $stmt->execute([$startDate, $endDate, $lineFilter, $dateType]);

            $kpiResult = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $kpiData = !empty($kpiResult) ? $kpiResult[0] : null;
            
            $trendData = [];
            if ($stmt->nextRowset()) $trendData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $statusData = [];
            if ($stmt->nextRowset()) $statusData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $prioData = [];
            if ($stmt->nextRowset()) $prioData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $topData = [];
            if ($stmt->nextRowset()) $topData = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $tableData = [];
            if ($stmt->nextRowset()) $tableData = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

        case 'edit_request':
            $id = $input['id'] ?? $_POST['id'] ?? null;
            if (!$id) throw new Exception("Invalid ID.");

            $line = $input['line'] ?? $_POST['line'] ?? '';
            $machine = $input['machine'] ?? $_POST['machine'] ?? '';
            $jobType = $input['job_type'] ?? $_POST['job_type'] ?? 'Repair';
            $priority = $input['priority'] ?? $_POST['priority'] ?? 'Normal';
            $issue = $input['issue_description'] ?? $_POST['issue_description'] ?? '';

            // [NEW] รับค่า Note และอะไหล่
            $techNote = $input['technician_note'] ?? $_POST['technician_note'] ?? null;
            $spareParts = $input['spare_parts_list'] ?? $_POST['spare_parts_list'] ?? null;

            $requestDate = !empty($_POST['request_date']) ? str_replace('T', ' ', $_POST['request_date']) : null;
            $startedAt = !empty($_POST['started_at']) ? str_replace('T', ' ', $_POST['started_at']) : null;
            $resolvedAt = !empty($_POST['resolved_at']) ? str_replace('T', ' ', $_POST['resolved_at']) : null;
            
            $actualMinutes = isset($_POST['actual_repair_minutes']) && $_POST['actual_repair_minutes'] !== '' ? (int)$_POST['actual_repair_minutes'] : null;

            $stmtCheck = $pdo->prepare("SELECT request_by, resolved_by FROM " . MAINTENANCE_REQUESTS_TABLE . " WHERE id = ?");
            $stmtCheck->execute([$id]);
            $currentRecord = $stmtCheck->fetch(PDO::FETCH_ASSOC);
            
            if (!$currentRecord) throw new Exception("ไม่พบข้อมูลใบแจ้งซ่อมนี้");

            $requestBy = trim($_POST['request_by'] ?? '');
            if ($requestBy === '') $requestBy = $currentRecord['request_by']; 

            $resolvedBy = trim($_POST['resolved_by'] ?? '');
            if ($resolvedBy === '') $resolvedBy = $currentRecord['resolved_by'];

            $pdo->beginTransaction();
            try {
                // [FIXED] เพิ่ม technician_note และ spare_parts_list ลงใน SQL
                $sql = "UPDATE " . MAINTENANCE_REQUESTS_TABLE . " 
                        SET line = ?, machine = ?, job_type = ?, priority = ?, issue_description = ?, 
                            request_by = ?, resolved_by = ?, 
                            request_date = COALESCE(?, request_date), 
                            started_at = ?, 
                            resolved_at = ?,
                            actual_repair_minutes = ?,
                            technician_note = ?,
                            spare_parts_list = ?
                        WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $line, $machine, $jobType, $priority, $issue, 
                    $requestBy, $resolvedBy, 
                    $requestDate, $startedAt, $resolvedAt, 
                    $actualMinutes, 
                    $techNote, $spareParts,
                    $id
                ]);

                logAction($pdo, $currentUser['username'], 'EDIT_MT_REQ', $line, "Updated ID: {$id}");
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'อัปเดตข้อมูลสำเร็จ']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'resend_email':
            echo json_encode(['success' => false, 'message' => 'Email system is currently disabled.']);
            break;

        case 'get_standard_lines':
            $sql = "SELECT DISTINCT line 
                    FROM " . MANPOWER_EMPLOYEES_TABLE . " WITH (NOLOCK) 
                    WHERE is_active = 1 
                    AND line IS NOT NULL 
                    AND RTRIM(LTRIM(line)) <> '' 
                    ORDER BY line ASC";
            $stmt = $pdo->query($sql);
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        default:
            throw new Exception("Invalid Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>