<?php
// page/QMS/api/concession_api.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../db.php';
require_once '../../../auth/check_auth.php';
require_once '../../components/php/logger.php';

function handleConcessionUploads($request_no, $old_paths = []) {
    $upload_dir = '../../uploads/concessions/';
    if (!is_dir($upload_dir)) {
        mkdir($upload_dir, 0777, true);
    }
    
    $paths = [
        $old_paths[0] ?? null,
        $old_paths[1] ?? null,
        $old_paths[2] ?? null
    ];
    
    if (isset($_FILES['images'])) {
        $file_count = is_array($_FILES['images']['name']) ? count($_FILES['images']['name']) : 0;
        for ($i = 0; $i < min(3, $file_count); $i++) {
            if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                $tmp_name = $_FILES['images']['tmp_name'][$i];
                $name = $_FILES['images']['name'][$i];
                $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                if (in_array($ext, ['jpg', 'jpeg', 'png'])) {
                    $new_name = $request_no . '_' . time() . '_' . $i . '.' . $ext;
                    if (move_uploaded_file($tmp_name, $upload_dir . $new_name)) {
                        // If updating, delete the old file
                        if (!empty($paths[$i]) && file_exists('../../' . $paths[$i])) {
                            @unlink('../../' . $paths[$i]);
                        }
                        $paths[$i] = 'uploads/concessions/' . $new_name;
                    }
                }
            }
        }
    }
    return $paths;
}

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

        $paths = handleConcessionUploads($request_no);

        $sql = "INSERT INTO QMS_CONCESSION (
                    request_no, request_date, issued_by_dept, request_to, subject, person_name, 
                    part_name, part_no, order_no, qty, lot_no, model_name, serial_no, mfg_date, 
                    difference_detail, reason_for_adopt, root_cause, measure_tentative, measure_permanent, 
                    is_report_needed, status, attached_image_1, attached_image_2, attached_image_3
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', ?, ?, ?)";
        
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
            isset($_POST['is_report_needed']) && $_POST['is_report_needed'] == '1' ? 1 : 0,
            $paths[0],
            $paths[1],
            $paths[2]
        ];

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Concession Request Created Successfully', 'request_no' => $request_no]);
    }
    elseif ($action === 'update') {
        $id = $_POST['id'] ?? '';
        if (!$id) throw new Exception("Missing ID for update");

        // Get old data for audit log
        $stmtOld = $pdo->prepare("SELECT * FROM QMS_CONCESSION WHERE id = ?");
        $stmtOld->execute([$id]);
        $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
        if (!$oldData) throw new Exception("Concession not found");

        $old_paths = [
            $oldData['attached_image_1'],
            $oldData['attached_image_2'],
            $oldData['attached_image_3']
        ];
        $paths = handleConcessionUploads($oldData['request_no'], $old_paths);

        $sql = "UPDATE QMS_CONCESSION SET 
                    issued_by_dept = ?, request_to = ?, subject = ?, person_name = ?, 
                    part_name = ?, part_no = ?, order_no = ?, qty = ?, lot_no = ?, 
                    model_name = ?, serial_no = ?, mfg_date = ?, difference_detail = ?, 
                    reason_for_adopt = ?, root_cause = ?, measure_tentative = ?, 
                    measure_permanent = ?, is_report_needed = ?, updated_at = GETDATE(),
                    attached_image_1 = ?, attached_image_2 = ?, attached_image_3 = ?
                WHERE id = ?";
        
        $params = [
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
            isset($_POST['is_report_needed']) && $_POST['is_report_needed'] == '1' ? 1 : 0,
            $paths[0],
            $paths[1],
            $paths[2],
            $id
        ];

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Get new data for log
        $stmtNew = $pdo->prepare("SELECT * FROM QMS_CONCESSION WHERE id = ?");
        $stmtNew->execute([$id]);
        $newData = $stmtNew->fetch(PDO::FETCH_ASSOC);

        if (function_exists('writeLog')) {
            writeLog($pdo, 'UPDATE', 'QMS_CONCESSION', $id, $oldData, $newData, "User edited concession {$oldData['request_no']}");
        }

        echo json_encode(['success' => true, 'message' => 'Concession Updated Successfully']);
    }
    elseif ($action === 'get') {
        $id = $_GET['id'] ?? '';
        if (!$id) throw new Exception("Missing ID");

        $sql = "
            SELECT c.*,
                   COALESCE(m1.name_th, u1.fullname, c.approver_1_name) as approver_1_realname,
                   COALESCE(m2.name_th, u2.fullname, c.approver_2_name) as approver_2_realname,
                   COALESCE(m3.name_th, u3.fullname, c.approver_3_name) as approver_3_realname,
                   COALESCE(m4.name_th, u4.fullname, c.approver_4_name) as approver_4_realname
            FROM QMS_CONCESSION c WITH (NOLOCK)
            LEFT JOIN USERS u1 ON c.approver_1_name = u1.username
            LEFT JOIN MANPOWER_EMPLOYEES m1 ON u1.username = m1.emp_id
            LEFT JOIN USERS u2 ON c.approver_2_name = u2.username
            LEFT JOIN MANPOWER_EMPLOYEES m2 ON u2.username = m2.emp_id
            LEFT JOIN USERS u3 ON c.approver_3_name = u3.username
            LEFT JOIN MANPOWER_EMPLOYEES m3 ON u3.username = m3.emp_id
            LEFT JOIN USERS u4 ON c.approver_4_name = u4.username
            LEFT JOIN MANPOWER_EMPLOYEES m4 ON u4.username = m4.emp_id
            WHERE c.id = ?
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $data = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$data) throw new Exception("Request not found");

        // Override the names with realnames
        $data['approver_1_name'] = $data['approver_1_realname'] ?? $data['approver_1_name'];
        $data['approver_2_name'] = $data['approver_2_realname'] ?? $data['approver_2_name'];
        $data['approver_3_name'] = $data['approver_3_realname'] ?? $data['approver_3_name'];
        $data['approver_4_name'] = $data['approver_4_realname'] ?? $data['approver_4_name'];

        echo json_encode(['success' => true, 'data' => $data]);
    }
    elseif ($action === 'approve') {
        $id = $_POST['id'] ?? '';
        $approver_level = $_POST['level'] ?? 1; // 1 to 4
        $status = $_POST['status'] ?? 'Approve';
        
        if (!$id) throw new Exception("Missing ID");
        
        $u_id = $_SESSION['user']['id'] ?? 0;
        $stmt_name = $pdo->prepare("SELECT COALESCE(m.name_th, u.fullname, u.username) as real_name FROM USERS u LEFT JOIN MANPOWER_EMPLOYEES m ON u.username = m.emp_id WHERE u.id = ?");
        $stmt_name->execute([$u_id]);
        $real_name_row = $stmt_name->fetch();
        $approver_name = $real_name_row ? $real_name_row['real_name'] : ($_SESSION['user']['fullname'] ?? $_SESSION['user']['username'] ?? 'System');

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
