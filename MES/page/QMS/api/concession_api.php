<?php
// page/QMS/api/concession_api.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';

$action = $_REQUEST['action'] ?? '';

try {
    if ($action === 'list') {
        $sql = "SELECT id, request_no, request_date, subject, part_name, qty, status, created_at 
                FROM QMS_CONCESSION WITH (NOLOCK)
                ORDER BY id DESC";
        $stmt = $pdo->query($sql);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['success' => true, 'data' => $data]);
    }
    elseif ($action === 'create') {
        // Generate new running number CCR-YYMM-XXX
        $prefix = 'CCR-' . date('ym') . '-';
        $sqlMax = "SELECT MAX(request_no) as max_no FROM QMS_CONCESSION WITH (NOLOCK) WHERE request_no LIKE ?";
        $stmtMax = $pdo->prepare($sqlMax);
        $stmtMax->execute([$prefix . '%']);
        $row = $stmtMax->fetch(PDO::FETCH_ASSOC);
        $next_num = 1;
        if ($row && $row['max_no']) {
            $last_num = (int)substr($row['max_no'], -3);
            $next_num = $last_num + 1;
        }
        $request_no = $prefix . str_pad($next_num, 3, '0', STR_PAD_LEFT);

        $sql = "INSERT INTO QMS_CONCESSION (
                    request_no, request_date, issued_by_dept, request_to, subject, person_name, 
                    part_name, part_no, order_no, qty, lot_no, model_name, serial_no, mfg_date, 
                    difference_detail, reason_for_adopt, root_cause, measure_tentative, measure_permanent, 
                    is_report_needed, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL')";
        
        $params = [
            $request_no,
            $_POST['request_date'] ?? date('Y-m-d'),
            $_POST['issued_by_dept'] ?? '',
            $_POST['request_to'] ?? '',
            $_POST['subject'] ?? '',
            $_POST['person_name'] ?? '',
            $_POST['part_name'] ?? '',
            $_POST['part_no'] ?? '',
            $_POST['order_no'] ?? '',
            $_POST['qty'] ?? 0,
            $_POST['lot_no'] ?? '',
            $_POST['model_name'] ?? '',
            $_POST['serial_no'] ?? '',
            !empty($_POST['mfg_date']) ? $_POST['mfg_date'] : null,
            $_POST['difference_detail'] ?? '',
            $_POST['reason_for_adopt'] ?? '',
            $_POST['root_cause'] ?? '',
            $_POST['measure_tentative'] ?? '',
            $_POST['measure_permanent'] ?? '',
            isset($_POST['is_report_needed']) && $_POST['is_report_needed'] == '1' ? 1 : 0
        ];

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Concession Request Created Successfully', 'request_no' => $request_no]);
    }
    elseif ($action === 'get') {
        $id = $_GET['id'] ?? '';
        if (!$id) throw new Exception("Missing ID");

        $sql = "SELECT * FROM QMS_CONCESSION WITH (NOLOCK) WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) throw new Exception("Request not found");

        echo json_encode(['success' => true, 'data' => $data]);
    }
    elseif ($action === 'approve') {
        $id = $_POST['id'] ?? '';
        $approver_level = $_POST['level'] ?? 1; // 1 to 4
        $status = $_POST['status'] ?? 'Approve';
        
        if (!$id) throw new Exception("Missing ID");
        
        $approver_name = $_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'System';

        $field_name = "approver_{$approver_level}_name";
        $field_status = "approver_{$approver_level}_status";
        $field_date = "approver_{$approver_level}_date";

        $sql = "UPDATE QMS_CONCESSION 
                SET $field_name = ?, $field_status = ?, $field_date = GETDATE(), updated_at = GETDATE()
                WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$approver_name, $status, $id]);

        // Check if all 4 approved to change main status to APPROVED
        $sqlCheck = "SELECT approver_1_status, approver_2_status, approver_3_status, approver_4_status FROM QMS_CONCESSION WHERE id = ?";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute([$id]);
        $row = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($row['approver_1_status'] == 'Approve' && 
            $row['approver_2_status'] == 'Approve' && 
            $row['approver_3_status'] == 'Approve' && 
            $row['approver_4_status'] == 'Approve') {
            $pdo->prepare("UPDATE QMS_CONCESSION SET status = 'APPROVED' WHERE id = ?")->execute([$id]);
        } elseif ($status == 'Not Approve') {
            $pdo->prepare("UPDATE QMS_CONCESSION SET status = 'REJECTED' WHERE id = ?")->execute([$id]);
        }

        echo json_encode(['success' => true, 'message' => 'Approval updated']);
    }
    else {
        throw new Exception("Invalid action.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
