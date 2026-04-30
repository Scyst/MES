<?php
// MES/page/fleetLog/api/apiFleetLog.php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../logger.php';

if (!isset($_SESSION['user'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$user_id = $_SESSION['user']['id'] ?? 0;

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        case 'get_logs':
            $start_date = $_POST['start_date'] ?? date('Y-m-d');
            $end_date = $_POST['end_date'] ?? date('Y-m-d');
            $end_date_full = $end_date . ' 23:59:59';

            $sql = "SELECT f.*, 
                           ISNULL(u.fullname, u.username) AS admin_name
                    FROM dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK)
                    LEFT JOIN dbo.USERS u WITH (NOLOCK) ON f.created_by_user_id = u.id
                    WHERE f.log_timestamp >= ? AND f.log_timestamp <= ?
                    ORDER BY f.log_timestamp DESC, f.log_id DESC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start_date, $end_date_full]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $kpi = [
                'total' => count($logs), 'vendor' => 0, 'snc' => 0, 'total_cost' => 0,
                'breakdown' => [ 'total' => [], 'vendor' => [], 'snc' => [] ],
                'cost_breakdown' => [ 'INBOUND' => 0, 'OUTBOUND' => 0, 'OTHER' => 0 ]
            ];
            
            foreach ($logs as $log) {
                $provider = $log['provider_type'];
                $vType = $log['vehicle_type'] ?: 'UNKNOWN';
                $tType = $log['trans_type'];
                $cost = (float)$log['transport_cost'];
                $kpi['total_cost'] += $cost;

                if (isset($kpi['cost_breakdown'][$tType])) {
                    $kpi['cost_breakdown'][$tType] += $cost;
                } else {
                    $kpi['cost_breakdown']['OTHER'] += $cost;
                }

                if (!isset($kpi['breakdown']['total'][$vType])) $kpi['breakdown']['total'][$vType] = 0;
                $kpi['breakdown']['total'][$vType]++;

                if ($provider === 'VENDOR') {
                    $kpi['vendor']++;
                    if (!isset($kpi['breakdown']['vendor'][$vType])) $kpi['breakdown']['vendor'][$vType] = 0;
                    $kpi['breakdown']['vendor'][$vType]++;
                } else if ($provider === 'SNC') {
                    $kpi['snc']++;
                    if (!isset($kpi['breakdown']['snc'][$vType])) $kpi['breakdown']['snc'][$vType] = 0;
                    $kpi['breakdown']['snc'][$vType]++;
                }
            }

            arsort($kpi['breakdown']['total']);
            arsort($kpi['breakdown']['vendor']);
            arsort($kpi['breakdown']['snc']);

            echo json_encode(['success' => true, 'data' => $logs, 'kpi' => $kpi]);
            break;

        case 'save_manual_log':
            $log_time = $_POST['log_timestamp'] ? str_replace('T', ' ', $_POST['log_timestamp']) : date('Y-m-d H:i:s');
            $trans_type = $_POST['trans_type'] ?? 'INBOUND';
            $provider = $_POST['provider_type'] ?? 'VENDOR';
            $vehicle = $_POST['vehicle_type'] ?? 'OTHER';
            $car_license = trim($_POST['car_license'] ?? '');
            $remark = trim($_POST['remark'] ?? '');
            $transportCost = floatval($_POST['transport_cost'] ?? 0);

            $sql = "INSERT INTO dbo.LOGISTICS_FLEET_LOGS 
                    (log_timestamp, trans_type, provider_type, vehicle_type, car_license, remark, transport_cost, created_by_user_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            $pdo->prepare($sql)->execute([$log_time, $trans_type, $provider, $vehicle, $car_license, $remark, $transportCost, $user_id]);

            echo json_encode(['success' => true, 'message' => 'บันทึกข้อมูลสำเร็จ']);
            break;

        case 'get_pending_loading':
            $sql = "SELECT l.id, s.po_number, l.car_license, l.container_no, l.container_type, 
                           l.seal_no, s.invoice_no, s.snc_ci_no
                    FROM dbo.LOADING_REPORTS l WITH (NOLOCK)
                    LEFT JOIN dbo.SALES_ORDERS s WITH (NOLOCK) ON l.sales_order_id = s.id
                    LEFT JOIN dbo.LOGISTICS_FLEET_LOGS f WITH (NOLOCK) ON l.id = f.loading_report_id
                    WHERE l.status = 'COMPLETED' AND f.log_id IS NULL
                    ORDER BY l.updated_at DESC";
            
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'sync_outbound':
            $loading_id = $_POST['loading_report_id'] ?? 0;
            $stmt = $pdo->prepare("SELECT r.*, s.po_number FROM dbo.LOADING_REPORTS r WITH (NOLOCK) LEFT JOIN dbo.SALES_ORDERS s WITH (NOLOCK) ON r.sales_order_id = s.id WHERE r.id = ?");
            $stmt->execute([$loading_id]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$report) throw new Exception("ไม่พบใบโหลด C-TPAT หรือข้อมูลถูกลบไปแล้ว");

            $log_time = $report['loading_end_time'] ?: date('Y-m-d H:i:s');   
            $provider = 'VENDOR';
            $vehicle_type = $report['container_type'] ?: 'UNKNOWN';
            $ref_doc = $report['po_number'] ?: 'C-TPAT ID: ' . $loading_id;

            $sql = "INSERT INTO dbo.LOGISTICS_FLEET_LOGS 
                    (log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, created_by_user_id)
                    VALUES (?, 'OUTBOUND', ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $pdo->prepare($sql)->execute([
                $log_time, 
                $provider, 
                $vehicle_type, 
                $report['car_license'], 
                $report['container_no'], 
                $report['seal_no'], 
                $ref_doc, 
                $loading_id, 
                $user_id
            ]);

            echo json_encode(['success' => true, 'message' => 'ซิงค์ข้อมูลรถออกสำเร็จ!']);
            break;

        case 'get_log_detail':
            $log_id = $_POST['log_id'] ?? 0;
            $stmt = $pdo->prepare("SELECT * FROM dbo.LOGISTICS_FLEET_LOGS WITH (NOLOCK) WHERE log_id = ?");
            $stmt->execute([$log_id]);
            $data = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$data) throw new Exception("ไม่พบข้อมูล");
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'update_manual_log':
            $log_id = $_POST['log_id'] ?? 0;
            $log_time = $_POST['log_timestamp'] ? str_replace('T', ' ', $_POST['log_timestamp']) : date('Y-m-d H:i:s');
            $trans_type = $_POST['trans_type'] ?? 'INBOUND';
            $provider = $_POST['provider_type'] ?? 'VENDOR';
            $vehicle = $_POST['vehicle_type'] ?? 'OTHER';
            $car_license = trim($_POST['car_license'] ?? '');
            $remark = trim($_POST['remark'] ?? '');
            $transportCost = floatval($_POST['transport_cost'] ?? 0);

            $sql = "UPDATE dbo.LOGISTICS_FLEET_LOGS 
                    SET log_timestamp = ?, trans_type = ?, provider_type = ?, vehicle_type = ?, car_license = ?, remark = ?, transport_cost = ?, updated_at = GETDATE()
                    WHERE log_id = ? AND loading_report_id IS NULL";
            $pdo->prepare($sql)->execute([$log_time, $trans_type, $provider, $vehicle, $car_license, $remark, $transportCost, $log_id]);

            echo json_encode(['success' => true, 'message' => 'แก้ไขข้อมูลสำเร็จ']);
            break;

        case 'delete_log':
            $log_id = $_POST['log_id'] ?? 0;
            $sql = "DELETE FROM dbo.LOGISTICS_FLEET_LOGS WHERE log_id = ? AND loading_report_id IS NULL";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$log_id]);
            
            if ($stmt->rowCount() > 0) {
                echo json_encode(['success' => true, 'message' => 'ลบข้อมูลสำเร็จ']);
            } else {
                throw new Exception("ปฏิเสธการลบ: รายการนี้ถูกดึงมาจากระบบ C-TPAT อัตโนมัติ (กรุณายกเลิกใบโหลดที่ต้นทาง)");
            }
            break;

        case 'update_quick_cost':
            $log_id = $_POST['log_id'] ?? 0;
            $transportCost = floatval($_POST['transport_cost'] ?? 0);
            $remark = trim($_POST['remark'] ?? '');
            $sql = "UPDATE dbo.LOGISTICS_FLEET_LOGS 
                    SET transport_cost = ?, remark = ?, updated_at = GETDATE()
                    WHERE log_id = ?";
            $pdo->prepare($sql)->execute([$transportCost, $remark, $log_id]);

            echo json_encode(['success' => true, 'message' => 'อัปเดตค่าขนส่งสำเร็จ']);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>