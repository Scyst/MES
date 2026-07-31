<?php
// page/QMS/api/qa_schedule_api.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';

$action = $_REQUEST['action'] ?? '';

try {
    if ($action === 'get_schedule') {
        $date = $_GET['date'] ?? date('Y-m-d');
        $range = $_GET['range'] ?? '';
        
        try {
            $pdo->exec("ALTER TABLE SALES_ORDERS ADD inspection_remark NVARCHAR(MAX) NULL");
        } catch(Exception $e) {}

        $sql = "SELECT id, po_number, sku, description, color, quantity, dc_location, loading_date, inspection_date, inspection_status, inspection_result, is_confirmed, inspection_remark, qa_inspector 
                FROM SALES_ORDERS WITH (NOLOCK) ";
                
        if ($range === 'this_week') {
            $start = date('Y-m-d', strtotime('monday this week'));
            $end = date('Y-m-d', strtotime('sunday this week'));
            $sql .= "WHERE CAST(inspection_date AS DATE) >= ? AND CAST(inspection_date AS DATE) <= ? ORDER BY inspection_date ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
        } else if ($range === 'this_month') {
            $start = date('Y-m-01');
            $end = date('Y-m-t');
            $sql .= "WHERE CAST(inspection_date AS DATE) >= ? AND CAST(inspection_date AS DATE) <= ? ORDER BY inspection_date ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
        } else if ($range === 'last_month') {
            $start = date('Y-m-01', strtotime('last month'));
            $end = date('Y-m-t', strtotime('last month'));
            $sql .= "WHERE CAST(inspection_date AS DATE) >= ? AND CAST(inspection_date AS DATE) <= ? ORDER BY inspection_date ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
        } else {
            $sql .= "WHERE CAST(inspection_date AS DATE) = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$date]);
        }
        
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stats = [
            'total' => count($data),
            'waiting' => 0,
            'in_progress' => 0,
            'passed' => 0,
            'failed' => 0
        ];

        foreach ($data as $row) {
            if ($row['inspection_result'] === 'PASS') {
                $stats['passed']++;
            } elseif ($row['inspection_result'] === 'FAIL') {
                $stats['failed']++;
            } else {
                if ($row['inspection_status'] === 'IN_PROGRESS') {
                    $stats['in_progress']++;
                } else {
                    $stats['waiting']++;
                }
            }
        }

        echo json_encode(['success' => true, 'data' => $data, 'stats' => $stats]);
    }
    elseif ($action === 'search_po') {
        $search = $_GET['search'] ?? '';
        if (empty($search)) {
            echo json_encode(['success' => true, 'data' => []]);
            exit;
        }

        $sql = "SELECT id, po_number, sku, description, quantity, loading_date, inspection_date 
                FROM SALES_ORDERS WITH (NOLOCK)
                WHERE po_number LIKE ? 
                ORDER BY loading_date DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(["%$search%"]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }
    elseif ($action === 'schedule_po') {
        $po_id = $_POST['id'] ?? '';
        $schedule_date = $_POST['schedule_date'] ?? '';

        if (empty($po_id) || empty($schedule_date)) {
            throw new Exception("Missing parameters.");
        }

        $sql = "UPDATE SALES_ORDERS SET inspection_date = ?, updated_at = GETDATE() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$schedule_date, $po_id]);

        echo json_encode(['success' => true, 'message' => 'Scheduled successfully.']);
    }
    elseif ($action === 'update_result') {
        $po_id = $_POST['id'] ?? '';
        $inspection_status = $_POST['inspection_status'] ?? '';
        $inspection_result = $_POST['inspection_result'] ?? '';
        $remark = $_POST['remark'] ?? '';

        if (empty($po_id) || empty($inspection_status)) {
            throw new Exception("Missing required fields.");
        }

        $sql = "UPDATE SALES_ORDERS 
                SET inspection_status = ?, inspection_result = ?, inspection_remark = ?, is_confirmed = 1, updated_at = GETDATE() 
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$inspection_status, $inspection_result, $remark, $po_id]);

        echo json_encode(['success' => true, 'message' => 'Inspection updated successfully.']);
    }
    elseif ($action === 'remove_schedule') {
        $po_id = $_POST['id'] ?? '';
        if (empty($po_id)) throw new Exception("Missing PO ID.");
        
        $sql = "UPDATE SALES_ORDERS SET inspection_date = NULL, updated_at = GETDATE() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$po_id]);

        echo json_encode(['success' => true, 'message' => 'Removed from schedule.']);
    }
    elseif ($action === 'assign_inspector') {
        $po_id = $_POST['id'] ?? '';
        $inspector = $_POST['qa_inspector'] ?? '';
        if (empty($po_id)) throw new Exception("Missing PO ID.");

        $sql = "UPDATE SALES_ORDERS SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$inspector, $po_id]);

        echo json_encode(['success' => true, 'message' => 'Inspector assigned successfully.']);
    }
    else {
        throw new Exception("Invalid action.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
