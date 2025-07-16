<?php
require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../../auth/check_auth.php';
require_once __DIR__ . '/../logger.php';

//-- ป้องกัน CSRF สำหรับ Request ที่ไม่ใช่ GET --
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (
        !isset($_SERVER['HTTP_X_CSRF_TOKEN']) ||
        !isset($_SESSION['csrf_token']) ||
        !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])
    ) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed. Request rejected.']);
        exit;
    }
}

//-- รับค่า Action และข้อมูล Input --
$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
if (empty($input) && !empty($_POST)) {
    $input = $_POST;
}

//-- ตรวจสอบสิทธิ์การเข้าถึงระดับไฟล์ (ต้องเป็น admin หรือ creator) --
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    //-- กำหนดผู้ใช้งานปัจจุบันสำหรับตรวจสอบสิทธิ์และบันทึก Log --
    $currentUser = $_SESSION['user'];

    //-- แยกการทำงานตาม Action ที่ได้รับ --
    switch ($action) {
        case 'read':
            $stmt = $pdo->query("SELECT id, username, role, created_at, line FROM USERS WHERE role != 'creator' ORDER BY id ASC");
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($users as &$user) {
                if ($user['created_at']) $user['created_at'] = (new DateTime($user['created_at']))->format('Y-m-d H:i:s');
            }
            echo json_encode(['success' => true, 'data' => $users]);
            break;

        case 'create':
            if (!hasRole(['admin', 'creator'])) {
                throw new Exception("Permission denied.");
            }
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');
            $role = trim($input['role'] ?? '');
            $line = ($role === 'supervisor') ? strtoupper(trim($input['line'] ?? '')) : null;

            if (empty($username) || empty($password) || empty($role)) {
                throw new Exception("Username, password, and role are required.");
            }
            if ($role === 'supervisor' && empty($line)) {
                throw new Exception("Line is required for supervisor role.");
            }
            if ($role === 'creator') {
                throw new Exception("Cannot create a user with the 'creator' role.");
            }
            if ($role === 'admin' && !hasRole('creator')) {
                throw new Exception("Only creators can create admin users.");
            }

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            $sql = "INSERT INTO USERS (username, password, role, line) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            
            // ===== จุดที่แก้ไข =====
            $stmt->execute([$username, $hashedPassword, $role, $line]);

            logAction($pdo, $currentUser['username'], 'CREATE USER', $username, "Role: $role, Line: $line");
            echo json_encode(['success' => true, 'message' => 'User created successfully.']);
            break;

        case 'update':
            $targetId = (int)($input['id'] ?? 0);
            if (!$targetId) throw new Exception("Target user ID is required.");

            $stmt = $pdo->prepare("SELECT id, username, role FROM USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("Target user not found.");

            if ($targetUser['role'] === 'creator') throw new Exception("Creator accounts cannot be modified.");
            
            $isEditingSelf = ($targetId === (int)$currentUser['id']);
            
            if (hasRole('admin') && !hasRole('creator')) {
                if (!$isEditingSelf && $targetUser['role'] === 'admin') {
                    throw new Exception("Admins cannot modify other admins.");
                }
            }

            $updateFields = [];
            $params = [];
            $logDetails = [];

            if (!$isEditingSelf || hasRole('creator')) {
                if (isset($input['username']) && $input['username'] !== $targetUser['username']) {
                    $updateFields[] = "username = ?";
                    $params[] = trim($input['username']);
                    $logDetails[] = "username to " . trim($input['username']);
                }
                if (isset($input['role']) && $input['role'] !== $targetUser['role']) {
                    if ($input['role'] === 'admin' && !hasRole('creator')) {
                         throw new Exception("Only creators can promote users to admin.");
                    }
                    $updateFields[] = "role = ?";
                    $params[] = trim($input['role']);
                    $logDetails[] = "role to " . trim($input['role']);
                }
            }

            if (isset($input['role']) && $input['role'] === 'supervisor') {
                $line = strtoupper(trim($input['line'] ?? ''));
                 if (empty($line)) {
                     throw new Exception("Line is required for supervisor role.");
                 }
                $updateFields[] = "line = ?";
                $params[] = $line;
                $logDetails[] = "line to " . $line;
            } elseif (isset($input['role']) && $input['role'] !== 'supervisor') {
                $updateFields[] = "line = NULL";
                $logDetails[] = "line cleared";
            }

            if (!empty($input['password'])) {
                $updateFields[] = "password = ?";
                $params[] = password_hash(trim($input['password']), PASSWORD_DEFAULT);
                $logDetails[] = "password changed";
            }
            
            if (empty($updateFields)) {
                echo json_encode(['success' => true, 'message' => 'No changes were made.']);
                break;
            }

            $sql = "UPDATE USERS SET " . implode(', ', $updateFields) . " WHERE id = ?";
            $params[] = $targetId;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            logAction($pdo, $currentUser['username'], 'UPDATE USER', $targetUser['username'], implode(', ', $logDetails));
            echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
            break;
            
        case 'delete':
            $targetId = (int)($_REQUEST['id'] ?? 0);
            if (!$targetId) throw new Exception("Missing user ID.");

            if ($targetId === (int)$currentUser['id']) {
                throw new Exception("You cannot delete your own account.");
            }

            $stmt = $pdo->prepare("SELECT username, role FROM USERS WHERE id = ?");
            $stmt->execute([$targetId]);
            $targetUser = $stmt->fetch();
            if (!$targetUser) throw new Exception("User not found.");

            if ($targetUser['role'] === 'creator') {
                throw new Exception("Creator accounts cannot be deleted."); 
            }
            if ($targetUser['role'] === 'admin' && !hasRole('creator')) {
                throw new Exception("Permission denied. Only creators can delete other admins.");
            }

            $deleteStmt = $pdo->prepare("DELETE FROM USERS WHERE id = ?");
            $deleteStmt->execute([$targetId]);

            logAction($pdo, $currentUser['username'], 'DELETE USER', $targetUser['username']);
            echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
            break;
            
        case 'logs':
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 50;
            $startDate = $_GET['startDate'] ?? null;
            $endDate = $_GET['endDate'] ?? null;
            $userFilter = $_GET['user'] ?? null;
            $actionFilter = $_GET['action_type'] ?? null;
            $targetFilter = $_GET['target'] ?? null;
            
            $startRow = ($page - 1) * $limit;
            
            $conditions = [];
            $params = [];

            if ($startDate) {
                $conditions[] = "CAST(created_at AS DATE) >= ?";
                $params[] = $startDate;
            }
            if ($endDate) {
                $conditions[] = "CAST(created_at AS DATE) <= ?";
                $params[] = $endDate;
            }
            if ($userFilter) {
                $conditions[] = "action_by LIKE ?";
                $params[] = '%' . $userFilter . '%';
            }
            if ($actionFilter) {
                $conditions[] = "action_type LIKE ?";
                $params[] = '%' . $actionFilter . '%';
            }
            if ($targetFilter) {
                $conditions[] = "target_user LIKE ?";
                $params[] = '%' . $targetFilter . '%';
            }
            
            $whereClause = $conditions ? "WHERE " . implode(" AND ", $conditions) : "";

            $totalSql = "SELECT COUNT(*) AS total FROM USER_LOGS $whereClause";
            $totalStmt = $pdo->prepare($totalSql);
            $totalStmt->execute($params);
            $total = (int)$totalStmt->fetch()['total'];
            
            $dataSql = "
                SELECT * FROM (
                    SELECT 
                        id, action_by, action_type, target_user, detail, created_at,
                        ROW_NUMBER() OVER (ORDER BY created_at DESC, id DESC) AS RowNum
                    FROM USER_LOGS
                    $whereClause
                ) AS NumberedRows
                WHERE RowNum > ? AND RowNum <= ?
            ";
            
            $endRow = $startRow + $limit;
            $paginationParams = array_merge($params, [$startRow, $endRow]);

            $dataStmt = $pdo->prepare($dataSql);
            $dataStmt->execute($paginationParams);
            $logs = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($logs as &$log) {
                if ($log['created_at']) {
                    $log['created_at'] = (new DateTime($log['created_at']))->format('Y-m-d H:i:s');
                }
            }
            
            echo json_encode([
                'success' => true,
                'data' => $logs,
                'total' => $total,
                'page' => $page,
                'limit' => $limit
            ]);
            break;

        default:
            http_response_code(400);
            throw new Exception("Invalid action specified for User Management.");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    error_log("Error in userManage.php: " . $e->getMessage());
}
?>