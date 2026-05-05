<?php
// api/forkliftManage.php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../components/init.php';

if (session_status() === PHP_SESSION_NONE) session_start();

if (!isset($_SESSION['user'])) { 
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Session expired.']); 
    exit; 
}

// ตรวจสอบ HTTP Method ป้องกันการยิง GET เข้ามารัน Action
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

$action = $_POST['action'] ?? '';
$response = ['success' => false, 'message' => 'Invalid action requested.'];

try {
    switch ($action) {
        case 'get_dashboard':
            // ดึงข้อมูลหลัก (NOLOCK ถูกใช้ใน SP หรือ View อยู่แล้ว แต่ถ้า Query สดต้องใส่เสมอ)
            $stmt = $pdo->query("SELECT *, CASE WHEN DATEDIFF(MINUTE, last_updated, GETDATE()) > 3 THEN 1 ELSE 0 END as is_offline 
                                 FROM " . FORKLIFTS_TABLE . " WITH (NOLOCK) ORDER BY code ASC");
            $forklifts = $stmt->fetchAll();

            $stmt2 = $pdo->query("SELECT forklift_id, booking_id, user_name, start_time, end_time_est, usage_details 
                                  FROM " . FORKLIFT_BOOKINGS_TABLE . " WITH (NOLOCK) WHERE status = 'ACTIVE'");
            $active_bookings = $stmt2->fetchAll(PDO::FETCH_GROUP | PDO::FETCH_UNIQUE); 

            foreach ($forklifts as &$fl) {
                $fid = $fl['id'];
                $fl['current_driver'] = '-';
                if (isset($active_bookings[$fid])) {
                    $fl['status'] = 'IN_USE'; 
                    $fl['current_driver'] = $active_bookings[$fid]['user_name'];
                    $fl['active_booking_id'] = $active_bookings[$fid]['booking_id'];
                    $fl['usage_details'] = $active_bookings[$fid]['usage_details'];
                }
                if(empty($fl['status'])) $fl['status'] = 'AVAILABLE';
            }
            $response = ['success' => true, 'data' => $forklifts, 'message' => 'Success'];
            break;

        case 'book_forklift':
        case 'start_job':
        case 'return_forklift':
            $dbAction = match($action) {
                'book_forklift' => 'BOOK',
                'start_job' => 'START',
                'return_forklift' => 'RETURN',
            };

            $stmt = $pdo->prepare("EXEC dbo.sp_Forklift_ManageBooking 
                @Action = ?, @ForkliftID = ?, @UserID = ?, @UserName = ?, 
                @BookingType = ?, @StartTime = ?, @EndTimeEst = ?, @UsageDetails = ?, 
                @Location = ?, @BatteryLevel = ?, @BookingID = ?");
                
            $stmt->execute([
                $dbAction,
                $_POST['forklift_id'] ?? null,
                $_SESSION['user']['id'],
                $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'],
                $_POST['booking_type'] ?? 'RESERVE',
                isset($_POST['start_time']) ? date('Y-m-d H:i:s', strtotime($_POST['start_time'])) : null,
                isset($_POST['end_time_est']) ? date('Y-m-d H:i:s', strtotime($_POST['end_time_est'])) : null,
                $_POST['usage_details'] ?? null,
                $_POST['location'] ?? null,
                $_POST['start_battery'] ?? $_POST['end_battery'] ?? null,
                $_POST['booking_id'] ?? null
            ]);
            $response = ['success' => true, 'data' => null, 'message' => 'ดำเนินการสำเร็จ'];
            break;

        case 'get_timeline':
            $stmt = $pdo->query("SELECT b.*, f.code as forklift_code FROM " . FORKLIFT_BOOKINGS_TABLE . " b WITH (NOLOCK) 
                                 JOIN " . FORKLIFTS_TABLE . " f WITH (NOLOCK) ON b.forklift_id = f.id 
                                 WHERE b.end_time_est >= DATEADD(HOUR, -24, GETDATE()) OR b.status = 'ACTIVE'
                                 ORDER BY b.start_time ASC");
            $response = ['success' => true, 'data' => $stmt->fetchAll(), 'message' => 'Success'];
            break;

        case 'get_history':
            $stmt = $pdo->query("SELECT TOP 200 b.*, f.code as forklift_code 
                                 FROM " . FORKLIFT_BOOKINGS_TABLE . " b WITH (NOLOCK)
                                 JOIN " . FORKLIFTS_TABLE . " f WITH (NOLOCK) ON b.forklift_id = f.id
                                 WHERE b.status IN ('ACTIVE', 'BOOKED', 'COMPLETED')
                                 ORDER BY 
                                    CASE WHEN b.status = 'ACTIVE' THEN 1 
                                         WHEN b.status = 'BOOKED' THEN 2 
                                         ELSE 3 END ASC, 
                                    b.start_time DESC");
            $response = ['success' => true, 'data' => $stmt->fetchAll(), 'message' => 'History loaded'];
            break;

        case 'update_forklift':
            $stmt = $pdo->prepare("UPDATE " . FORKLIFTS_TABLE . " SET code = ?, name = ?, status = ?, last_location = ? WHERE id = ?");
            $stmt->execute([$_POST['code'], $_POST['name'], $_POST['status'], $_POST['last_location'], $_POST['id']]);
            $response = ['success' => true, 'data' => null, 'message' => 'Updated successfully'];
            break;

        case 'get_alerts':
            $stmt = $pdo->query("SELECT a.*, f.code as forklift_code FROM dbo.FORKLIFT_ALERTS a WITH (NOLOCK)
                                 JOIN dbo.FORKLIFTS f WITH (NOLOCK) ON a.forklift_id = f.id 
                                 WHERE a.is_resolved = 0 ORDER BY a.created_at DESC");
            $response = ['success' => true, 'data' => $stmt->fetchAll(), 'message' => 'Success'];
            break;

        case 'get_utilization':
            $days = isset($_POST['days']) ? (int)$_POST['days'] : 1;
            // Parameterized Query สำหรับ Dynamic Days
            $sql = "DECLARE @Days INT = ?;
                    DECLARE @TotalMinutes FLOAT = @Days * 1440.0;
                    SELECT f.id as forklift_id, f.code, f.name, f.status as current_status,
                        ISNULL(SUM(DATEDIFF(MINUTE, 
                            CASE WHEN b.start_time < DATEADD(DAY, -@Days, GETDATE()) THEN DATEADD(DAY, -@Days, GETDATE()) ELSE b.start_time END,
                            CASE WHEN b.end_time_actual IS NULL THEN GETDATE() ELSE b.end_time_actual END
                        )), 0) as run_time_minutes
                    FROM dbo.FORKLIFTS f WITH (NOLOCK)
                    LEFT JOIN dbo.FORKLIFT_BOOKINGS b WITH (NOLOCK) ON f.id = b.forklift_id 
                        AND (b.end_time_actual >= DATEADD(DAY, -@Days, GETDATE()) OR b.end_time_actual IS NULL)
                        AND b.status IN ('ACTIVE', 'COMPLETED')
                    WHERE f.is_active = 1
                    GROUP BY f.id, f.code, f.name, f.status";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$days]);
            $rows = $stmt->fetchAll();
            
            foreach($rows as &$r) {
                $totalMins = $days * 1440.0;
                $r['utilization_percent'] = round(($r['run_time_minutes'] / $totalMins) * 100, 2);
                $r['machine_state'] = ($r['current_status'] === 'MAINTENANCE') ? 'DOWN' : 'READY';
            }
            $response = ['success' => true, 'data' => $rows, 'message' => 'Success'];
            break;
            
        default:
            $response = ['success' => false, 'message' => 'Invalid action requested.'];
            break;
    }
} catch (PDOException $e) {
    writeErrorLog($pdo, 'FORKLIFT_API', $e->getMessage(), $_POST);
    http_response_code(500);
    $response = ['success' => false, 'message' => 'System error occurred while processing your request.'];
} catch (Exception $e) {
    http_response_code(400);
    $response = ['success' => false, 'message' => $e->getMessage()];
}

echo json_encode($response);
exit;
?>