<?php
// Path: MES/page/areaAccess/api/apiAreaAccess.php
error_reporting(0);
header('Content-Type: application/json; charset=utf-8');

$action = $_POST['action'] ?? '';
$isAutoSync = false;
if (isset($_SERVER['HTTP_X_MODE']) && $_SERVER['HTTP_X_MODE'] === 'auto_sync') {
    $isAutoSync = true;
    define('ALLOW_GUEST_ACCESS', true); 
}

require_once __DIR__ . '/../../components/init.php';
require_once __DIR__ . '/../../db.php';

$response = [
    'success' => false,
    'data' => null,
    'message' => ''
];

try {
    if (!isset($pdo)) throw new Exception('System Error: DB Connection failed.');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') throw new Exception('Invalid Request Method');

    $userId = $_SESSION['user']['id'] ?? 0;

    switch ($action) {
        case 'auto_clear_ghost':
            if (!$isAutoSync) {
                throw new Exception('Unauthorized Access: Auto-sync mode required.');
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_AreaAccess_AutoClearGhost");
            $stmt->execute();
            
            $response['success'] = true;
            $response['message'] = "System auto-cleared ghost sessions successfully.";
            break;

        case 'get_locations':
            $stmt = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WITH (NOLOCK) WHERE is_active = 1 ORDER BY location_name");
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['success'] = true;
            break;

        case 'get_history':
            $start_date = $_POST['start_date'] ?? date('Y-m-d');
            $end_date = $_POST['end_date'] ?? date('Y-m-d');
            $filter_loc = intval($_POST['filter_loc'] ?? 0);
            $search = trim($_POST['search'] ?? '');
            
            $page = max(1, intval($_POST['page'] ?? 1));
            $limit = max(10, intval($_POST['limit'] ?? 100)); // Default 100 แถวต่อหน้า
            $offset = ($page - 1) * $limit;

            $params = [];
            $whereClause = "CAST(A.scan_in_time AS DATE) BETWEEN ? AND ?";
            $params[] = $start_date;
            $params[] = $end_date;

            if ($filter_loc > 0) { 
                $whereClause .= " AND A.location_id = ?"; 
                $params[] = $filter_loc; 
            }

            if ($search !== '') {
                $whereClause .= " AND (A.emp_id LIKE ? OR E.name_th LIKE ? OR A.purpose LIKE ?)";
                $searchWildcard = "%{$search}%";
                $params[] = $searchWildcard;
                $params[] = $searchWildcard;
                $params[] = $searchWildcard;
            }

            $countSql = "SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK) 
                         LEFT JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON A.emp_id = E.emp_id 
                         WHERE {$whereClause}";
            $stmtCount = $pdo->prepare($countSql);
            $stmtCount->execute($params);
            $total_rows = $stmtCount->fetchColumn();
            $sql = "SELECT A.log_id, L.location_name, A.emp_id, ISNULL(E.name_th, 'Unknown') AS emp_name,
                           ISNULL(E.line, 'N/A') AS line_name,
                           ISNULL(E.department_api, '-') AS department_api,
                           CONVERT(VARCHAR(16), A.scan_in_time, 120) AS scan_in,
                           CONVERT(VARCHAR(16), A.scan_out_time, 120) AS scan_out,
                           A.purpose, CASE WHEN A.scan_out_time IS NULL THEN 'IN' ELSE 'OUT' END AS status,
                           DATEDIFF(MINUTE, A.scan_in_time, ISNULL(A.scan_out_time, GETDATE())) AS duration_mins
                    FROM dbo.AREA_ACCESS_LOGS A WITH (NOLOCK)
                    JOIN dbo.LOCATIONS L WITH (NOLOCK) ON A.location_id = L.location_id
                    LEFT JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON A.emp_id = E.emp_id
                    WHERE {$whereClause}
                    ORDER BY CASE WHEN A.scan_out_time IS NULL THEN 0 ELSE 1 END ASC, A.scan_in_time DESC
                    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
            
            $stmt = $pdo->prepare($sql);
            $paramIndex = 1;
            foreach ($params as $val) {
                $type = is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR;
                $stmt->bindValue($paramIndex++, $val, $type);
            }
            
            $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
            $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
            $stmt->execute(); 
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['total_rows'] = $total_rows;
            $kpiSql = "SELECT 
                        (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE CAST(scan_in_time AS DATE) = CAST(GETDATE() AS DATE)) AS total_trans,
                        (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE scan_out_time IS NULL) AS total_inside,
                        (SELECT COUNT(*) FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE scan_out_time IS NULL AND DATEDIFF(MINUTE, scan_in_time, GETDATE()) > 120) AS total_overdue";
            $kpiStmt = $pdo->query($kpiSql);
            $response['kpi'] = $kpiStmt->fetch(PDO::FETCH_ASSOC);

            $response['success'] = true;
            break;

        case 'record_access':
            $emp_id = trim($_POST['emp_id'] ?? '');
            $location_id = intval($_POST['location_id'] ?? 0);
            $purpose = trim($_POST['purpose'] ?? '');

            if (empty($emp_id) || $location_id <= 0) throw new Exception('ข้อมูลไม่ครบถ้วน');

            $stmt = $pdo->prepare("EXEC dbo.sp_RecordAreaAccess ?, ?, ?, ?");
            $stmt->execute([$emp_id, $location_id, $purpose, $userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            $response['success'] = true;
            $response['data'] = $result;
            if ($result['action_type'] === 'IN') $response['message'] = "บันทึกเข้าพื้นที่สำเร็จ";
            elseif ($result['action_type'] === 'OUT') $response['message'] = "บันทึกออกพื้นที่สำเร็จ";
            elseif ($result['action_type'] === 'IN_CHANGED') $response['message'] = "ย้ายสถานที่สำเร็จ (ปิดการเข้าคลังเก่าอัตโนมัติ)";
            break;

        case 'manual_edit':
            $log_id = intval($_POST['log_id'] ?? 0);
            $raw_scan_in = $_POST['scan_in'] ?? '';
            $raw_scan_out = $_POST['scan_out'] ?? '';
            $purpose = trim($_POST['purpose'] ?? '');
            $username = $_SESSION['user']['username'] ?? 'Unknown';

            if ($log_id <= 0 || empty($raw_scan_in)) {
                throw new Exception('ข้อมูลไม่ครบถ้วน (กรุณาระบุเวลาเข้า)');
            }

            $scan_in = str_replace('T', ' ', $raw_scan_in);
            if (strlen($scan_in) == 16) $scan_in .= ':00';

            $outParam = null;
            if (!empty($raw_scan_out) && $raw_scan_out !== 'null') {
                $scan_out = str_replace('T', ' ', $raw_scan_out);
                if (strlen($scan_out) == 16) $scan_out .= ':00';
                $outParam = $scan_out;
            }

            $stmt = $pdo->prepare("EXEC dbo.sp_ManualEditAreaAccess ?, ?, ?, ?, ?, ?");
            
            $stmt->bindValue(1, $log_id, PDO::PARAM_INT);
            $stmt->bindValue(2, $scan_in, PDO::PARAM_STR);
            
            if ($outParam === null) {
                $stmt->bindValue(3, null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(3, $outParam, PDO::PARAM_STR);
            }
            
            $stmt->bindValue(4, $purpose, PDO::PARAM_STR);
            $stmt->bindValue(5, $userId, PDO::PARAM_INT);
            $stmt->bindValue(6, $username, PDO::PARAM_STR);
            
            $stmt->execute();

            $response['success'] = true;
            $response['message'] = 'แก้ไขข้อมูลสำเร็จ';
            break;

        case 'verify_employee':
            $emp_id = trim($_POST['emp_id'] ?? '');
            if (empty($emp_id)) {
                throw new Exception('กรุณาระบุรหัสพนักงาน');
            }

            $stmt = $pdo->prepare("
                SELECT emp_id, name_th, position, is_active 
                FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) 
                WHERE emp_id = ?
            ");
            $stmt->execute([$emp_id]);
            $emp = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$emp) {
                throw new Exception('ไม่พบรหัสพนักงานนี้ในระบบ (Unknown ID)');
            }
            if ($emp['is_active'] == 0) {
                throw new Exception('พนักงานท่านนี้พ้นสภาพหรือถูกระงับการใช้งานแล้ว');
            }

            $stmtLog = $pdo->prepare("
                SELECT TOP 1 location_id 
                FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) 
                WHERE emp_id = ? AND scan_out_time IS NULL 
                ORDER BY scan_in_time DESC
            ");
            $stmtLog->execute([$emp_id]);
            $activeLog = $stmtLog->fetch(PDO::FETCH_ASSOC);

            $response['success'] = true;
            $response['data'] = [
                'emp_id' => $emp['emp_id'],
                'emp_name' => $emp['name_th'],
                'position' => $emp['position'],
                'next_action' => $activeLog ? 'OUT' : 'IN'
            ];
            break;

        case 'force_checkout':
            $log_id = intval($_POST['log_id'] ?? 0);
            if ($log_id <= 0) throw new Exception('ไม่พบข้อมูลอ้างอิง');

            $stmt = $pdo->prepare("SELECT scan_out_time FROM dbo.AREA_ACCESS_LOGS WITH (NOLOCK) WHERE log_id = ?");
            $stmt->execute([$log_id]);
            $log = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$log) throw new Exception('ไม่พบรายการบันทึกนี้ในระบบ');
            if ($log['scan_out_time'] !== null) throw new Exception('บุคคลนี้เช็คเอาท์ออกจากพื้นที่ไปแล้ว');

            $updateStmt = $pdo->prepare("UPDATE dbo.AREA_ACCESS_LOGS SET scan_out_time = GETDATE(), purpose = ISNULL(purpose, '') + ' [Force Checkout]' WHERE log_id = ?");
            $updateStmt->execute([$log_id]);

            $response['success'] = true;
            $response['message'] = 'เช็คเอาท์สำเร็จ';
            break;

        case 'get_autocomplete':
            $stmt = $pdo->query("
                SELECT emp_id, name_th 
                FROM dbo.MANPOWER_EMPLOYEES WITH (NOLOCK) 
                WHERE is_active = 1 
                ORDER BY CASE WHEN emp_id LIKE 'V-%' THEN 0 ELSE 1 END, emp_id ASC
            ");
            $response['data'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $response['success'] = true;
            break;

        default:
            throw new Exception('Unknown Action');
    }
} catch (Throwable $e) { 
    $error_msg = $e->getMessage();
    if (strpos($error_msg, '[SQL Server]') !== false) {
        $parts = explode('[SQL Server]', $error_msg);
        $error_msg = trim(end($parts));
    }
    
    $response['message'] = $error_msg;
}

echo json_encode($response);
exit;
?>