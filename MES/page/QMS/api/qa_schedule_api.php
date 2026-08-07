<?php
// page/QMS/api/qa_schedule_api.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
require_once __DIR__ . '/../../components/php/logger.php';

$action = $_REQUEST['action'] ?? '';

try {
    if ($action === 'get_schedule') {
        $date = $_GET['date'] ?? date('Y-m-d');
        $start_date = $_GET['start_date'] ?? date('Y-m-d');
        $end_date = $_GET['end_date'] ?? date('Y-m-d');
        $range = $_GET['range'] ?? '';
        
        try {
            $pdo->exec("ALTER TABLE SALES_ORDERS ADD inspection_remark NVARCHAR(MAX) NULL");
        } catch(Exception $e) {}

        $sql = "SELECT id, po_number, sku, description, color, quantity, dc_location, loading_date, loading_week, inspection_date, actual_inspection_date, inspection_status, inspection_result, is_confirmed, inspection_remark, qa_inspector, ticket_number, inspect_type 
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
        } else if ($range === 'custom_range') {
            $sql .= "WHERE CAST(inspection_date AS DATE) >= ? AND CAST(inspection_date AS DATE) <= ? ORDER BY inspection_date ASC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start_date, $end_date]);
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
    elseif ($action === 'get_pending_jobs') {
        $search = $_GET['search'] ?? '';
        $sql = "SELECT TOP 100 id, po_number, sku, description, quantity, loading_date, inspection_date 
                FROM SALES_ORDERS WITH (NOLOCK)
                WHERE (inspection_date IS NULL OR inspection_status = 'WAITING' OR inspection_status IS NULL)";
        $params = [];
        if (!empty($search)) {
            $sql .= " AND po_number LIKE ?";
            $params[] = "%$search%";
        }
        $sql .= " ORDER BY loading_date DESC, id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
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
        $ticket_number = $_POST['ticket_number'] ?? null;
        $qa_inspector = $_POST['qa_inspector'] ?? null;
        $inspect_type = $_POST['inspect_type'] ?? null;
        $actual_inspection_date = $_POST['actual_inspection_date'] ?? null;
        if ($actual_inspection_date === '') $actual_inspection_date = null;

        if (empty($po_id) || empty($inspection_status)) {
            throw new Exception("Missing required fields.");
        }

        $sql = "UPDATE SALES_ORDERS 
                SET inspection_status = ?, inspection_result = ?, inspection_remark = ?, ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, is_confirmed = 1, updated_at = GETDATE() 
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$inspection_status, $inspection_result, $remark, $ticket_number, $qa_inspector, $inspect_type, $actual_inspection_date, $po_id]);

        echo json_encode(['success' => true, 'message' => 'Inspection updated successfully.']);
    }
    elseif ($action === 'remove_schedule') {
        $po_id = $_POST['id'] ?? '';
        if (empty($po_id)) throw new Exception("Missing PO ID.");
        
        $checkSql = "SELECT inspection_status FROM SALES_ORDERS WITH (NOLOCK) WHERE id = ?";
        $checkStmt = $pdo->prepare($checkSql);
        $checkStmt->execute([$po_id]);
        $row = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) throw new Exception("PO not found.");

        $status = $row['inspection_status'] ?? 'WAITING';
        $force = $_POST['force'] ?? '0';

        if (($status === 'IN_PROGRESS' || $status === 'DONE') && $force === '0') {
            echo json_encode(['success' => false, 'require_force' => true, 'message' => 'Confirmation required.']);
            exit;
        }

        $sql = "UPDATE SALES_ORDERS SET 
                inspection_date = NULL, 
                inspection_status = 'WAITING',
                inspection_result = NULL,
                inspection_remark = NULL,
                qa_inspector = NULL,
                is_confirmed = 0,
                updated_at = GETDATE() 
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$po_id]);

        echo json_encode(['success' => true, 'message' => 'Removed from schedule and reset.']);
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
    elseif ($action === 'get_qc_users') {
        $sql = "SELECT id, fullname, username, aka FROM USERS WITH (NOLOCK) WHERE role = 'qc' AND is_active = 1 AND fullname IS NOT NULL AND fullname != '' ORDER BY fullname ASC";
        $stmt = $pdo->query($sql);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $users]);
    }
    elseif ($action === 'bulk_update_ticket') {
        $po_ids = json_decode($_POST['po_ids'] ?? '[]');
        $ticket_number = $_POST['ticket_number'] ?? '';
        $qa_inspector = $_POST['qa_inspector'] ?? '';
        $inspect_type = $_POST['inspect_type'] ?? '';
        $inspection_date = $_POST['inspection_date'] ?? '';

        if (empty($po_ids) || !is_array($po_ids)) {
            throw new Exception("No POs selected.");
        }

        $placeholders = implode(',', array_fill(0, count($po_ids), '?'));
        $params = [$ticket_number, $qa_inspector, $inspect_type];
        
        $sql = "UPDATE SALES_ORDERS 
                SET ticket_number = ?, qa_inspector = ?, inspect_type = ?";
                
        if (!empty($inspection_date)) {
            $sql .= ", inspection_date = ?";
            $params[] = $inspection_date;
        }
        
        $sql .= ", updated_at = GETDATE() WHERE id IN ($placeholders)";
        $params = array_merge($params, $po_ids);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => count($po_ids) . ' PO(s) updated successfully.']);
    }
    elseif ($action === 'update_po_details') {
        $po_id = $_POST['po_id'] ?? '';
        if (empty($po_id)) throw new Exception("Missing PO ID.");
        
        $po_number = $_POST['po_number'] ?? '';
        $sku = $_POST['sku'] ?? '';
        $description = $_POST['description'] ?? '';
        $color = $_POST['color'] ?? '';
        $quantity = $_POST['quantity'] ?? null;
        $dc_location = $_POST['dc_location'] ?? '';
        $loading_date = $_POST['loading_date'] ?? null;
        if ($loading_date === '') $loading_date = null;
        $loading_week = $_POST['loading_week'] ?? '';
        
        // Fetch old data for logging
        $oldStmt = $pdo->prepare("SELECT po_number, sku, description, color, quantity, dc_location, loading_date, loading_week FROM SALES_ORDERS WITH (NOLOCK) WHERE id = ?");
        $oldStmt->execute([$po_id]);
        $oldData = $oldStmt->fetch(PDO::FETCH_ASSOC);
        if (!$oldData) throw new Exception("PO not found.");
        
        $newData = [
            'po_number' => $po_number,
            'sku' => $sku,
            'description' => $description,
            'color' => $color,
            'quantity' => $quantity,
            'dc_location' => $dc_location,
            'loading_date' => $loading_date,
            'loading_week' => $loading_week
        ];
        
        $sql = "UPDATE SALES_ORDERS SET 
                po_number = ?, sku = ?, description = ?, color = ?, quantity = ?, dc_location = ?, loading_date = ?, loading_week = ?, updated_at = GETDATE()
                WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $po_number, $sku, $description, $color, $quantity, $dc_location, $loading_date, $loading_week, $po_id
        ]);
        
        if (function_exists('writeLog')) {
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $po_id, json_encode($oldData, JSON_UNESCAPED_UNICODE), json_encode($newData, JSON_UNESCAPED_UNICODE), 'User edited PO details');
        }
        
        echo json_encode(['success' => true, 'message' => 'PO Details updated successfully.']);
    }
    else {
        throw new Exception("Invalid action specified.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
