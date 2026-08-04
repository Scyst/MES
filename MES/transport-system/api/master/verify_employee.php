<?php
// transport-system/api/master/verify_employee.php
require_once '../../auth/check_auth.php';
require_once '../db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $empId = $_GET['empId'] ?? '';
    
    if (!$empId) {
        sendResponse(false, null, "ไม่ได้ระบุรหัสพนักงาน", 400);
    }
    
    $pdo = getDB();
    try {
        $stmt = $pdo->prepare("SELECT emp_id, emp_name, bu_id, is_active FROM TRANSPORT_EMP_SYNC WHERE emp_id = ?");
        $stmt->execute([$empId]);
        $emp = $stmt->fetch();
        
        if ($emp) {
            if (!$emp['is_active']) {
                sendResponse(false, null, "พนักงานท่านนี้พ้นสภาพ หรือไม่อยู่ในสถานะ Active");
            } else {
                sendResponse(true, $emp, "พบข้อมูลพนักงาน");
            }
        } else {
            sendResponse(false, null, "ไม่พบรหัสพนักงานนี้ในระบบ Master Data", 404);
        }
    } catch (Exception $e) {
        sendResponse(false, null, $e->getMessage(), 500);
    }
} else {
    sendResponse(false, null, "Method Not Allowed", 405);
}
?>
