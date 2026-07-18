<?php
// FILE: MES/page/planning/api/dailyMeetingApi.php
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../db.php'; 
require_once __DIR__ . '/../../../auth/check_auth.php';

// --- HELPER 1: ดึงข้อมูลกำลังคน ---
function getManpowerData($pdo, $date, $shift) {
    $mpData = [];
    $empTable = IS_DEVELOPMENT ? 'MANPOWER_EMPLOYEES_TEST' : 'MANPOWER_EMPLOYEES';
    $logTable = IS_DEVELOPMENT ? 'MANPOWER_DAILY_LOGS_TEST' : 'MANPOWER_DAILY_LOGS';

    // 1. Plan (MP_REQ)
    $sqlReq = "SELECT line, COUNT(*) as req FROM $empTable WHERE is_active = 1 GROUP BY line";
    $stmt = $pdo->query($sqlReq);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $mpData[$row['line']]['req'] = $row['req'];
    }

    // 2. Actual (MP_ACT)
    $sqlAct = "SELECT E.line, COUNT(*) as act
               FROM $logTable L
               JOIN $empTable E ON L.emp_id = E.emp_id
               WHERE L.log_date = ? AND L.status IN ('PRESENT', 'LATE')
               GROUP BY E.line";
    $stmt = $pdo->prepare($sqlAct);
    $stmt->execute([$date]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $mpData[$row['line']]['act'] = $row['act'];
    }
    return $mpData;
}

// --- HELPER 2: ดึงข้อมูลตั้งต้น (System Initial Data) ---
function getSystemInitialData($pdo, $date, $shift) {
    $response = ['production' => [], 'loading' => [], 'shortages' => []];

    // Table Constants
    $planTable = IS_DEVELOPMENT ? 'PRODUCTION_PLANS_TEST' : 'PRODUCTION_PLANS';
    $itemTable = IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS';
    $onhandTable = IS_DEVELOPMENT ? 'INVENTORY_ONHAND_TEST' : 'INVENTORY_ONHAND';
    $salesTable = IS_DEVELOPMENT ? 'SALES_ORDERS_TEST' : 'SALES_ORDERS';

    // 1. Production Plan (เหมือนเดิม)
    $shiftCondition = ($shift === 'ALL') ? "1=1" : "P.shift = ?";
    $params = ($shift === 'ALL') ? [$date] : [$date, $shift];

    $sqlPlan = "SELECT 
                    P.plan_id, P.line, P.shift,
                    COALESCE(I.part_no, 'Unknown') as model,
                    I.sap_no,
                    (P.original_planned_quantity + P.carry_over_quantity) as plan_qty,
                    ISNULL((SELECT SUM(quantity) FROM $onhandTable O WHERE O.parameter_id = P.item_id), 0) as current_stock
                FROM $planTable P
                LEFT JOIN $itemTable I ON P.item_id = I.item_id
                WHERE P.plan_date = ? AND ($shiftCondition)";
    
    $stmt = $pdo->prepare($sqlPlan);
    $stmt->execute($params);
    $plans = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $mpData = getManpowerData($pdo, $date, $shift);

    // 2. Demand Calculation (แก้ไข JOIN)
    // เทียบ SKU -> SKU เพื่อแปลงเป็น SAP No สำหรับ Group รวมยอด
    $targetDate = date('Y-m-d', strtotime($date . ' + 14 days'));
    
    $sqlDemand = "SELECT 
                    I.sap_no,             -- ใช้ SAP No เป็น Key สำหรับ map กลับไปหา Plan
                    SUM(S.quantity) as total_demand 
                  FROM $salesTable S
                  LEFT JOIN $itemTable I ON S.sku = I.sku  -- ✅ แก้ไข: Join ด้วย SKU ที่ตรงกัน
                  WHERE S.loading_date BETWEEN ? AND ? 
                  AND S.is_loading_done = 0 
                  AND I.sap_no IS NOT NULL
                  GROUP BY I.sap_no";
    
    $stmtD = $pdo->prepare($sqlDemand);
    $stmtD->execute([$date, $targetDate]);
    $demandMap = $stmtD->fetchAll(PDO::FETCH_KEY_PAIR);

    foreach ($plans as $row) {
        $lineName = $row['line'];
        $sapNo = $row['sap_no'];
        
        $req = $mpData[$lineName]['req'] ?? 0;
        $act = $mpData[$lineName]['act'] ?? 0;
        $demand = $demandMap[$sapNo] ?? 0;

        $response['production'][] = [
            'id' => 'plan_' . $row['plan_id'],
            'line' => $row['line'] . ($shift==='ALL' ? ' (' .$row['shift']. ')' : ''),
            'model' => $row['model'],
            'sap_no' => $sapNo,
            'mp_req' => $req,
            'mp_act' => $act,
            'demand' => (float)$demand,
            'stock' => (float)$row['current_stock'],
            'plan' => (float)$row['plan_qty'],
            'jobs' => []
        ];
    }

    // 3. Loading Plan List (แก้ไข JOIN และ SELECT)
    $sqlLoading = "SELECT 
                        S.id, S.po_number, S.quantity, S.sku,
                        I.part_no 
                   FROM $salesTable S
                   LEFT JOIN $itemTable I ON S.sku = I.sku 
                   WHERE S.loading_date = ? AND S.is_loading_done = 0";
                   
    $stmtL = $pdo->prepare($sqlLoading);
    $stmtL->execute([$date]);
    $loadings = $stmtL->fetchAll(PDO::FETCH_ASSOC);

    foreach ($loadings as $row) {
        // ใช้ Part No เป็นหลัก ถ้าไม่มีใช้ SKU
        $displayItem = !empty($row['part_no']) ? $row['part_no'] : $row['sku'];
        
        // จัด PO Number (ถ้ามี)
        $poText = !empty($row['po_number']) ? "PO: " . $row['po_number'] : "";

        $response['loading'][] = [
            'id' => $row['id'],
            'time' => '10:00',
            'po' => $poText,          // ส่ง PO แยกมาต่างหาก
            'customer' => $displayItem, // ช่องนี้ใส่ Part No เพียวๆ ตามที่ขอ
            'qty' => (float)$row['quantity'],
            'status' => 'pending'
        ];
    }

    return $response;
}

// --- MAIN PROCESS ---
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';
$dailyTable = IS_DEVELOPMENT ? 'DAILY_MEETINGS_TEST' : 'DAILY_MEETINGS';

try {
    if ($action === 'get_dashboard_data') {
        $date = $data['date'] ?? date('Y-m-d');
        $shift = $data['shift'] ?? 'ALL';

        // --- แก้ไขจุดนี้ (FIXED): ไม่ว่า Shift ไหน ก็ให้ลองดึง Saved Data ก่อน ---
        // ถ้าเจอข้อมูลใน DB ให้ดึงมาแสดงเลย (แปลว่า User เคย Save ไว้แล้ว)
        // ถ้าไม่เจอ ค่อยวิ่งไปสร้าง Fresh Data
        
        $stmt = $pdo->prepare("SELECT * FROM $dailyTable WHERE meeting_date = ? AND shift = ?");
        $stmt->execute([$date, $shift]);
        $meeting = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($meeting) {
            echo json_encode([
                'status' => 'success',
                'mode' => 'loaded_from_save',
                'data' => [
                    'meeting_id' => $meeting['meeting_id'],
                    'production_tracking' => json_decode($meeting['production_tracking_json'] ?? '[]'),
                    'loading_plan' => json_decode($meeting['loading_plan_json'] ?? '[]'),
                    'notes' => [
                        'safety' => $meeting['safety_talk'],
                        'machine' => $meeting['machine_status'],
                        'general' => $meeting['general_note']
                    ]
                ]
            ]);
        } else {
            // ถ้ายังไม่เคย Save (สำหรับ Shift นี้/วันนี้) ให้ดึงข้อมูลสด
            $systemData = getSystemInitialData($pdo, $date, $shift);
            echo json_encode([
                'status' => 'success',
                'mode' => 'generated_fresh',
                'data' => [
                    'meeting_id' => 0,
                    'production_tracking' => $systemData['production'],
                    'loading_plan' => $systemData['loading'],
                    'notes' => ['safety' => '', 'machine' => '', 'general' => '']
                ]
            ]);
        }

    } elseif ($action === 'get_master_data') {
        // Master Data for Autocomplete
        $planTable = IS_DEVELOPMENT ? 'PRODUCTION_PLANS_TEST' : 'PRODUCTION_PLANS';
        $itemTable = IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS';

        $lines = [];
        $stmtLine = $pdo->query("SELECT DISTINCT line FROM $planTable WHERE line IS NOT NULL ORDER BY line");
        $lines = $stmtLine->fetchAll(PDO::FETCH_COLUMN);
        
        $items = [];
        $stmtItem = $pdo->query("SELECT item_id, sap_no, part_no, part_description FROM $itemTable WHERE is_active = 1");
        $items = $stmtItem->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['status' => 'success', 'data' => ['lines' => $lines, 'items' => $items]]);

    } elseif ($action === 'add_plan') {
        // Add Plan Logic
        $planTable = IS_DEVELOPMENT ? 'PRODUCTION_PLANS_TEST' : 'PRODUCTION_PLANS';
        $itemTable = IS_DEVELOPMENT ? 'ITEMS_TEST' : 'ITEMS';
        
        $date = $data['date'];
        $line = $data['line'];
        $shift = $data['shift'];
        $qty = $data['qty'];
        $itemId = $data['model']; 

        if (!is_numeric($itemId)) {
             $stmt = $pdo->prepare("SELECT item_id FROM $itemTable WHERE part_no = ? OR sap_no = ?");
             $stmt->execute([$itemId, $itemId]);
             $itemId = $stmt->fetchColumn();
             if(!$itemId) throw new Exception("ไม่พบสินค้า (กรุณาเลือกจากรายการ)");
        }

        $sql = "INSERT INTO $planTable (plan_date, line, shift, item_id, original_planned_quantity, carry_over_quantity, created_at)
                VALUES (?, ?, ?, ?, ?, 0, GETDATE())";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$date, $line, $shift, $itemId, $qty]);
        
        echo json_encode(['status' => 'success', 'message' => 'Plan added successfully']);

    } elseif ($action === 'get_history_list') {
        // ดึงประวัติ 20 รายการล่าสุด
        // เลือก Shift ด้วย เพื่อให้ JS เอาไปสั่งเปลี่ยนหน้าจอได้ถูก
        $limit = 20; 
        $sql = "SELECT TOP $limit meeting_id, meeting_date, meeting_time, shift, created_by 
                FROM $dailyTable 
                ORDER BY meeting_date DESC, meeting_time DESC";
        $stmt = $pdo->query($sql);
        $history = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // จัด Format เวลาให้สวยงาม (ตัดวินาทีออก)
        foreach ($history as &$row) {
            if($row['meeting_time']) $row['meeting_time'] = substr($row['meeting_time'], 0, 5); 
        }
        
        echo json_encode(['status' => 'success', 'data' => $history]);

    } elseif ($action === 'save_meeting') {
        // Save Meeting Logic
        $id = $data['meeting_id'] ?? 0;
        $date = $data['meeting_date'];
        $time = $data['meeting_time'];
        $shift = $data['shift'] ?? 'DAY'; // ค่านี้จะรับ 'ALL' ได้ถ้าส่งมาจากหน้าจอ
        
        $safety = $data['safety_talk'] ?? '';
        $machine = $data['machine_status'] ?? '';
        $general = $data['general_note'] ?? '';
        
        $prodJson = isset($data['production_tracking_json']) ? $data['production_tracking_json'] : '[]';
        $loadJson = isset($data['loading_plan_json']) ? $data['loading_plan_json'] : '[]';
        $userId = $_SESSION['user']['user_id'] ?? 1;

        if ($id == 0) {
            $checkStmt = $pdo->prepare("SELECT meeting_id FROM $dailyTable WHERE meeting_date = ? AND shift = ?");
            $checkStmt->execute([$date, $shift]);
            $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) $id = $existing['meeting_id'];
        }

        if ($id && $id != 0) {
            $sql = "UPDATE $dailyTable SET meeting_time=?, safety_talk=?, machine_status=?, general_note=?, production_tracking_json=?, loading_plan_json=?, updated_at=GETDATE() WHERE meeting_id=?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$time, $safety, $machine, $general, $prodJson, $loadJson, $id]);
            $newId = $id;
        } else {
            $sql = "INSERT INTO $dailyTable (meeting_date, meeting_time, meeting_type, shift, safety_talk, machine_status, general_note, production_tracking_json, loading_plan_json, created_by) VALUES (?, ?, 'DAILY', ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$date, $time, $shift, $safety, $machine, $general, $prodJson, $loadJson, $userId]);
            $newId = $pdo->lastInsertId();
        }
        echo json_encode(['status' => 'success', 'message' => 'Plan committed successfully', 'meeting_id' => $newId]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>