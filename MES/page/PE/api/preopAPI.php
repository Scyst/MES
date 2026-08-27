<?php
// e:\MES\MES\MES\page\PE\api\preopAPI.php
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS, GET");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../components/php/logger.php';
require_once __DIR__ . '/../../db.php';

$jsonInput = json_decode(file_get_contents("php://input"), true);
$input = is_array($jsonInput) ? $jsonInput : (!empty($_POST) ? $_POST : $_GET);
$action = $input['action'] ?? '';

if ($action === 'get_preop_logs') {
    try {
        $sql = "SELECT p.*, m.machine_code, m.machine_name, m.line, w.wo_number 
                FROM PE_PREOP_AUDITS p 
                JOIN " . PE_MACHINES_TABLE . " m ON p.machine_id = m.machine_id 
                LEFT JOIN " . PE_WORK_ORDERS_TABLE . " w ON p.wo_id = w.wo_id
                ORDER BY p.audited_at DESC";
        $stmt = $pdo->query($sql);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $logs]);
    } catch (Throwable $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_dashboard_stats') {
    try {
        // Stats for today
        $today = date('Y-m-d');
        $sql = "SELECT 
                    COUNT(*) as total_audits,
                    SUM(CASE WHEN status = 'Passed' THEN 1 ELSE 0 END) as passed_audits,
                    SUM(CASE WHEN status = 'Failed' THEN 1 ELSE 0 END) as failed_audits
                FROM PE_PREOP_AUDITS 
                WHERE CAST(audited_at AS DATE) = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$today]);
        $stats = $stmt->fetch(PDO::FETCH_ASSOC);
        
        $compliance = 100;
        if ($stats['total_audits'] > 0) {
            $compliance = round(($stats['passed_audits'] / $stats['total_audits']) * 100, 1);
        }

        echo json_encode(['success' => true, 'data' => [
            'total' => $stats['total_audits'] ?? 0,
            'passed' => $stats['passed_audits'] ?? 0,
            'failed' => $stats['failed_audits'] ?? 0,
            'compliance' => $compliance
        ]]);
    } catch (Throwable $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_checklist') {
    try {
        $machineCode = $input['machine_code'] ?? '';
        $machineType = null;
        
        if (!empty($machineCode)) {
            $mStmt = $pdo->prepare("SELECT machine_type FROM " . PE_MACHINES_TABLE . " WHERE machine_code = ? OR machine_name = ?");
            $mStmt->execute([$machineCode, $machineCode]);
            $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
            if ($mData && !empty($mData['machine_type'])) {
                $machineType = $mData['machine_type'];
            }
        }
        
        // Find items for specific machine type, fallback to NULL (default)
        $sql = "SELECT * FROM PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_type = ? ORDER BY item_order ASC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$machineType]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($items)) {
            // Fallback to default
            $stmt = $pdo->prepare("SELECT * FROM PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_type IS NULL ORDER BY item_order ASC");
            $stmt->execute();
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        
        echo json_encode(['success' => true, 'data' => $items, 'machine_type' => $machineType]);
    } catch (Throwable $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'get_machine_types') {
    try {
        $stmt = $pdo->query("SELECT DISTINCT machine_type FROM " . PE_MACHINES_TABLE . " WHERE machine_type IS NOT NULL AND machine_type != '' ORDER BY machine_type");
        $types = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo json_encode(['success' => true, 'data' => $types]);
    } catch (Throwable $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'save_checklist') {
    try {
        $machineType = !empty($input['machine_type']) ? $input['machine_type'] : null;
        $items = $input['items'] ?? [];
        
        $pdo->beginTransaction();
        
        // Delete old items for this type
        if ($machineType === null) {
            $delStmt = $pdo->prepare("DELETE FROM PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_type IS NULL");
            $delStmt->execute();
        } else {
            $delStmt = $pdo->prepare("DELETE FROM PE_PREOP_CHECKLIST_TEMPLATE WHERE machine_type = ?");
            $delStmt->execute([$machineType]);
        }
        
        // Insert new items
        $insSql = "INSERT INTO PE_PREOP_CHECKLIST_TEMPLATE (machine_type, item_order, item_text, is_critical) VALUES (?, ?, ?, ?)";
        $insStmt = $pdo->prepare($insSql);
        
        foreach ($items as $item) {
            $insStmt->execute([
                $machineType,
                $item['item_order'],
                $item['item_text'],
                $item['is_critical']
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Checklist saved successfully']);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

if ($action === 'submit_preop') {
    try {
        $machineCode = $input['machine_code'] ?? '';
        $shift = $input['shift'] ?? '';
        $auditedBy = $input['audited_by'] ?? '';
        
        if (empty($machineCode) || empty($shift) || empty($auditedBy)) {
            throw new Exception("Missing required fields.");
        }
        
        $checklistData = $input['checklist_data'] ?? [];
        $isFailed = false;
        
        // Loop through checklist answers to determine status
        foreach ($checklistData as $item) {
            if (isset($item['answer']) && $item['answer'] === 'no') {
                $isFailed = true;
                break;
            }
        }
        
        $status = $isFailed ? 'Failed' : 'Passed';
        $remarks = $input['remarks'] ?? '';
        $checklistJson = json_encode($checklistData, JSON_UNESCAPED_UNICODE);
        
        // Look up machine details
        $mStmt = $pdo->prepare("SELECT machine_id, machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE machine_code = ?");
        $mStmt->execute([$machineCode]);
        $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$mData) {
            // Check if user entered machine name instead, but usually QR code uses machine_code
            $mStmt2 = $pdo->prepare("SELECT machine_id, machine_name, line FROM " . PE_MACHINES_TABLE . " WHERE machine_name = ?");
            $mStmt2->execute([$machineCode]);
            $mData = $mStmt2->fetch(PDO::FETCH_ASSOC);
            
            if (!$mData) {
                // Improved error message
                throw new Exception("ไม่พบเครื่องจักร รหัส: $machineCode (Machine not found in database)");
            }
        }
        
        $machineId = $mData['machine_id'];
        $machineName = $mData['machine_name'];
        $line = $mData['line'];
        
        // Handle multiple image uploads per item
        $imagePath = null;
        $uploadDir = __DIR__ . '/../../../uploads/pe_images/';
        
        foreach ($checklistData as &$item) {
            if (!empty($item['image_base64'])) {
                if (!is_dir($uploadDir)) {
                    mkdir($uploadDir, 0755, true);
                }
                $filename = 'PREOP_ITEM_' . $item['item_id'] . '_' . time() . '_' . uniqid() . '.jpg';
                $imgData = preg_replace('#^data:image/\w+;base64,#i', '', $item['image_base64']);
                if (file_put_contents($uploadDir . $filename, base64_decode($imgData))) {
                    $item['image_path'] = 'uploads/pe_images/' . $filename;
                    // Set the first found image as the main image_path for the overall record
                    if ($imagePath === null) {
                        $imagePath = $item['image_path'];
                    }
                }
                // Unset base64 string so it doesn't take up space in JSON DB column
                unset($item['image_base64']);
            }
        }
        unset($item);
        
        $checklistJson = json_encode($checklistData, JSON_UNESCAPED_UNICODE);
        
        $pdo->beginTransaction();
        
        $woId = null;
        if ($isFailed) {
            // Generate WO Number
            $dateStr = date('Ymd');
            $prefix = "WO-$dateStr-";
            $stmt = $pdo->prepare("SELECT TOP 1 wo_number FROM " . PE_WORK_ORDERS_TABLE . " WHERE wo_number LIKE ? ORDER BY wo_id DESC");
            $stmt->execute(["$prefix%"]);
            $lastWo = $stmt->fetchColumn();
            
            if ($lastWo) {
                $lastNum = (int)str_replace($prefix, '', $lastWo);
                $woNumber = $prefix . str_pad($lastNum + 1, 4, '0', STR_PAD_LEFT);
            } else {
                $woNumber = $prefix . '0001';
            }
            
            $issueTitle = "Pre-Op Audit Failed";
            $issueDetail = "Checklist failed items.\nRemarks: " . $remarks;
            $requestedAt = date('Y-m-d H:i:s');
            
            $woSql = "INSERT INTO " . PE_WORK_ORDERS_TABLE . " 
                    (wo_number, wo_type, machine_id, machine_name, line, priority, requested_by, requested_at, issue_title, issue_detail, image_path, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $woStmt = $pdo->prepare($woSql);
            $woStmt->execute([
                $woNumber,
                'Safety/Hazard',
                $machineId,
                $machineName,
                $line,
                'Critical',
                $auditedBy,
                $requestedAt,
                $issueTitle,
                $issueDetail,
                $imagePath,
                'Pending'
            ]);
            
            $woId = $pdo->lastInsertId();
            
            // Auto LOTO
            $lotoSql = "UPDATE " . PE_MACHINES_TABLE . " SET is_loto = 1, loto_reason = ? WHERE machine_id = ?";
            $lotoStmt = $pdo->prepare($lotoSql);
            $lotoStmt->execute(["Pre-Op Audit Failed: " . $remarks, $machineId]);
            
            // Log LOTO with correct columns
            $lLogSql = "INSERT INTO PE_LOTO_LOGS (machine_id, wo_id, locked_by, locked_at, status, reason) VALUES (?, ?, ?, ?, 'LOCKED', ?)";
            $lLogStmt = $pdo->prepare($lLogSql);
            $lLogStmt->execute([$machineId, $woId, $auditedBy, date('Y-m-d H:i:s'), "Failed: " . $remarks]);
        }
        
        $shiftDate = date('Y-m-d');
        
        $auditSql = "INSERT INTO PE_PREOP_AUDITS 
                (machine_id, shift_date, shift_name, audited_by, status, failed_reason, wo_id, image_path, checklist_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $auditStmt = $pdo->prepare($auditSql);
        $auditStmt->execute([
            $machineId,
            $shiftDate,
            $shift,
            $auditedBy,
            $status,
            $isFailed ? $remarks : null,
            $woId,
            $imagePath,
            $checklistJson
        ]);
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true, 
            'message' => $isFailed ? 'ตรวจสอบไม่ผ่าน! ระบบได้ล็อกเครื่องและสร้างใบแจ้งซ่อมฉุกเฉินแล้ว' : 'บันทึกการตรวจสอบเรียบร้อย'
        ]);
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        // Return raw error message
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
