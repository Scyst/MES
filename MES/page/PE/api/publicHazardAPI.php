<?php
// e:\MES\MES\MES\page\PE\api\publicHazardAPI.php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../components/php/logger.php';
require_once __DIR__ . '/../../db.php';

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';

if ($action !== 'submit_hazard_report') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid action']);
    exit;
}

function generateWONumber($pdo) {
    $dateStr = date('Ymd');
    $prefix = "WO-$dateStr-";
    $sql = "SELECT TOP 1 wo_number FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_number LIKE ? ORDER BY wo_id DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(["$prefix%"]);
    $lastWo = $stmt->fetchColumn();
    if ($lastWo) {
        $lastNum = (int)str_replace($prefix, '', $lastWo);
        return $prefix . str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);
    }
    return $prefix . '0001';
}

try {
    $machineCode = $input['machine_code'] ?? '';
    $issueTitle = $input['issue_title'] ?? 'Safety Hazard Reported';
    $issueDetail = $input['issue_detail'] ?? '';
    $requestedBy = !empty($input['requested_by']) ? $input['requested_by'] : 'Anonymous (Quick Report)';
    
    if (empty($machineCode)) {
        throw new Exception("Machine code is required.");
    }
    
    // Look up machine details
    $mStmt = $pdo->prepare("SELECT machine_id, machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE machine_code = ? OR machine_name = ?");
    $mStmt->execute([$machineCode, $machineCode]);
    $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
    
    $machineId = $mData ? $mData['machine_id'] : null;
    $machineName = $mData ? $mData['machine_name'] : $machineCode;
    $line = $mData ? $mData['line'] : 'Unknown';
    
    // Handle image upload if provided
    $imagePath = null;
    $uploadDir = __DIR__ . '/../../../uploads/pe_images/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $filename = 'HAZARD_' . time() . '_' . uniqid() . '.jpg';
        if (move_uploaded_file($_FILES['image']['tmp_name'], $uploadDir . $filename)) {
            $imagePath = 'uploads/pe_images/' . $filename;
        }
    } else if (!empty($input['image_base64'])) {
        $filename = 'HAZARD_' . time() . '_' . uniqid() . '.jpg';
        $imgData = preg_replace('#^data:image/\w+;base64,#i', '', $input['image_base64']);
        if (file_put_contents($uploadDir . $filename, base64_decode($imgData))) {
            $imagePath = 'uploads/pe_images/' . $filename;
        }
    }
    
    $pdo->beginTransaction();
    
    $woNumber = generateWONumber($pdo);
    $requestedAt = date('Y-m-d H:i:s');
    
    $sql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
            (wo_number, wo_type, machine_id, machine_name, line, priority, requested_by, requested_at, issue_title, issue_detail, image_path, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $woNumber,
        'Safety/Hazard',
        $machineId,
        $machineName,
        $line,
        'Critical',
        $requestedBy,
        $requestedAt,
        $issueTitle,
        $issueDetail,
        $imagePath,
        'Pending'
    ]);
    
    $newId = $pdo->lastInsertId();
    if (function_exists('writeLog')) {
        writeLog($pdo, 'CREATE_WO_HAZARD', 'PUBLIC_API', $newId, null, null, "Hazard WO: $woNumber, Machine: $machineCode");
    }
    
    $pdo->commit();
    
    echo json_encode(['success' => true, 'message' => "Hazard report submitted successfully.", 'wo_number' => $woNumber]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
