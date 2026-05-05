<?php
// MES/page/BOM/api/bomManage.php (หรือชื่อไฟล์ที่ตรงกับของคุณ)
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (!isset($_SERVER['HTTP_X_CSRF_TOKEN']) || !isset($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_REQUEST['action'] ?? '';
$input = json_decode(file_get_contents("php://input"), true);
$currentUser = $_SESSION['user'];

function checkCircularDependency($pdo, $fg_id, $comp_id) {
    if ($fg_id == $comp_id) return true;
    $sql = "
        WITH CTE AS (
            SELECT component_item_id, 1 AS depth
            FROM " . BOM_TABLE . " WITH (NOLOCK) 
            WHERE fg_item_id = ?
            
            UNION ALL
            
            SELECT b.component_item_id, c.depth + 1
            FROM " . BOM_TABLE . " b WITH (NOLOCK)
            INNER JOIN CTE c ON b.fg_item_id = c.component_item_id
            WHERE c.depth < 50
        )
        SELECT TOP 1 1 FROM CTE WHERE component_item_id = ?
    ";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$comp_id, $fg_id]);
        return (bool) $stmt->fetchColumn();
    } catch (Exception $e) {
        return true; 
    }
}

try {
    switch ($action) {
        // =========================================================================
        // [1] READ OPERATIONS (NOLOCK)
        // =========================================================================
        case 'get_all_fgs_with_bom':
            $sql = "
                WITH LatestBOM AS (
                    SELECT 
                        fg_item_id, updated_by, updated_at,
                        ROW_NUMBER() OVER(PARTITION BY fg_item_id ORDER BY updated_at DESC) as rn
                    FROM " . BOM_TABLE . " WITH (NOLOCK)
                )
                SELECT 
                    b.fg_item_id, i.sap_no AS fg_sap_no, i.part_no AS fg_part_no, i.part_description AS fg_part_description,
                    b.updated_by, FORMAT(b.updated_at, 'yyyy-MM-dd HH:mm') AS updated_at
                FROM LatestBOM b
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON b.fg_item_id = i.item_id
                WHERE b.rn = 1 AND i.is_active = 1
            ";
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " AND i.item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line = ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$currentUser['line']]);
            } else {
                $sql .= " ORDER BY i.sap_no ASC";
                $stmt = $pdo->query($sql);
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_fgs_without_bom':
            $search = $_GET['search'] ?? '';
            if (strlen($search) < 2) {
                echo json_encode(['success' => true, 'data' => []]);
                exit;
            }
            $sql = "
                SELECT TOP 20 item_id, sap_no, part_no, part_description 
                FROM " . ITEMS_TABLE . " i WITH (NOLOCK) 
                WHERE is_active = 1 
                  AND NOT EXISTS (SELECT 1 FROM " . BOM_TABLE . " b WITH (NOLOCK) WHERE b.fg_item_id = i.item_id)
                  AND (sap_no LIKE ? OR part_no LIKE ? OR part_description LIKE ?)
                ORDER BY sap_no ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(["%$search%", "%$search%", "%$search%"]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // =========================================================================
        // [1.7] GET BOM VERSIONS (ดึงประวัติเวอร์ชันทั้งหมดของ FG)
        // =========================================================================
        case 'get_bom_versions':
            $fg_id = (int)($_GET['fg_item_id'] ?? 0);
            if (!$fg_id) throw new Exception("FG Item ID is required.");
            $sql = "SELECT DISTINCT bom_version, bom_status, ecn_number, FORMAT(effective_date, 'yyyy-MM-dd') AS effective_date 
                    FROM " . BOM_TABLE . " WITH (NOLOCK) 
                    WHERE fg_item_id = ? 
                    ORDER BY bom_version DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$fg_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_bom_components':
            $fg_id = (int)($_GET['fg_item_id'] ?? 0);
            $version = (int)($_GET['bom_version'] ?? 0);
            if (!$fg_id) throw new Exception("FG Item ID is required.");

            $versionCondition = $version > 0 ? "AND b.bom_version = ?" : "AND b.bom_status = 'ACTIVE'";
            $params = $version > 0 ? [$fg_id, $version] : [$fg_id];

            $sql = "
                SELECT 
                    b.bom_id, b.component_item_id, CAST(b.quantity_required AS FLOAT) AS quantity_required, 
                    b.line, b.model, b.bom_version, b.bom_status,
                    i.sap_no, i.part_no, i.part_description, i.material_type, 
                    CAST(i.Cost_RM AS FLOAT) AS Cost_RM, CAST(i.Cost_PKG AS FLOAT) AS Cost_PKG, CAST(i.Cost_SUB AS FLOAT) AS Cost_SUB
                FROM " . BOM_TABLE . " b WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON b.component_item_id = i.item_id
                WHERE b.fg_item_id = ? $versionCondition
                ORDER BY i.material_type ASC, i.sap_no ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_where_used':
            $comp_id = (int)($_GET['component_item_id'] ?? 0);
            if (!$comp_id) throw new Exception("Component Item ID is required.");

            $sql = "
                SELECT 
                    b.fg_item_id, CAST(b.quantity_required AS FLOAT) AS quantity_required,
                    b.bom_version, b.bom_status, b.ecn_number,
                    i.sap_no AS fg_sap_no, i.part_description, i.material_type
                FROM " . BOM_TABLE . " b WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " i WITH (NOLOCK) ON b.fg_item_id = i.item_id
                WHERE b.component_item_id = ?
                ORDER BY b.bom_status ASC, i.sap_no ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$comp_id]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_audit_trail':
            $target_id = $_GET['target_id'] ?? '';
            $target_sap = $_GET['target_sap'] ?? '';

            if (empty($target_id) && empty($target_sap)) {
                throw new Exception("Missing target identifier.");
            }

            $sql = "
                SELECT TOP 50 
                    username, 
                    action, 
                    remark AS details, 
                    FORMAT(created_at, 'yyyy-MM-dd HH:mm:ss') AS log_time
                FROM SYSTEM_LOGS WITH (NOLOCK) 
                WHERE ref_id = ? OR ref_id = ?
                ORDER BY created_at DESC
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(string)$target_id, (string)$target_sap]);
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        // =========================================================================
        // [2] WRITE OPERATIONS (TRANSACTIONS)
        // =========================================================================
        case 'add_bom_component':
            $fg_id = (int)($input['fg_item_id'] ?? 0);
            $comp_id = (int)($input['component_item_id'] ?? 0);
            $qty = (float)($input['quantity_required'] ?? 0);
            $bom_version = (int)($input['bom_version'] ?? 1); 

            if ($fg_id <= 0 || $comp_id <= 0 || $qty <= 0) throw new Exception("Invalid input data.");
            
            if (checkCircularDependency($pdo, $fg_id, $comp_id)) {
                throw new Exception("ไม่สามารถเพิ่มวัตถุดิบนี้ได้! ตรวจพบ 'การอ้างอิงแบบวงกลม (Circular Dependency)'");
            }

            $pdo->beginTransaction();
            try {
                $statusStmt = $pdo->prepare("SELECT TOP 1 bom_status FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND bom_version = ?");
                $statusStmt->execute([$fg_id, $bom_version]);
                $currentStatus = $statusStmt->fetchColumn();

                if ($currentStatus === 'ACTIVE' || $currentStatus === 'OBSOLETE') {
                    throw new Exception("🔒 ไม่สามารถแก้ไขสูตรสถานะ [{$currentStatus}] ได้! กรุณาสร้าง Revision (ECN) ใหม่ก่อน");
                }

                $bom_status = $currentStatus ? $currentStatus : 'DRAFT';

                $checkStmt = $pdo->prepare("SELECT 1 FROM " . BOM_TABLE . " WITH (UPDLOCK) WHERE fg_item_id = ? AND component_item_id = ? AND bom_version = ?");
                $checkStmt->execute([$fg_id, $comp_id, $bom_version]);
                if ($checkStmt->fetchColumn()) throw new Exception("วัตถุดิบนี้ถูกเพิ่มไปแล้วในสูตรเวอร์ชัน {$bom_version}");

                $stmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, quantity_required, line, model, updated_by, updated_at, bom_version, bom_status) VALUES (?, ?, ?, 'DEFAULT', 'DEFAULT', ?, GETDATE(), ?, ?)");
                $stmt->execute([$fg_id, $comp_id, $qty, $currentUser['username'], $bom_version, $bom_status]);
                
                writeLog($pdo, 'ADD_BOM_COMPONENT', basename(__FILE__), $fg_id, null, null, "Comp ID: {$comp_id}, Qty: {$qty}, Ver: v{$bom_version}");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'เพิ่มส่วนประกอบสำเร็จ']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'update_bom_component':
            $bom_id = (int)($input['bom_id'] ?? 0);
            $qty = (float)($input['quantity_required'] ?? 0);
            if ($bom_id <= 0 || $qty <= 0) throw new Exception("Invalid BOM ID or quantity.");

            $checkStatus = $pdo->prepare("SELECT bom_status FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE bom_id = ?");
            $checkStatus->execute([$bom_id]);
            $status = $checkStatus->fetchColumn();

            if ($status === 'ACTIVE' || $status === 'OBSOLETE') {
                throw new Exception("🔒 ไม่สามารถแก้ไขสูตรสถานะ [{$status}] ได้! กรุณาสร้าง Revision (ECN) ใหม่ก่อน");
            }

            $stmt = $pdo->prepare("UPDATE " . BOM_TABLE . " SET quantity_required = ?, updated_by = ?, updated_at = GETDATE() WHERE bom_id = ?");
            $stmt->execute([$qty, $currentUser['username'], $bom_id]);
            echo json_encode(['success' => true, 'message' => 'อัปเดตปริมาณเรียบร้อย']);
            break;

        case 'delete_bom_component':
            $bom_id = (int)($input['bom_id'] ?? 0);
            if ($bom_id <= 0) throw new Exception("Invalid BOM ID.");

            $checkStatus = $pdo->prepare("SELECT bom_status FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE bom_id = ?");
            $checkStatus->execute([$bom_id]);
            $status = $checkStatus->fetchColumn();

            if ($status === 'ACTIVE' || $status === 'OBSOLETE') {
                throw new Exception("🔒 ไม่สามารถลบวัตถุดิบออกจากสูตรสถานะ [{$status}] ได้! กรุณาสร้าง Revision (ECN) ใหม่ก่อน");
            }

            $stmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE bom_id = ?");
            $stmt->execute([$bom_id]);
            echo json_encode(['success' => true, 'message' => 'ลบส่วนผสมเรียบร้อย']);
            break;

        case 'delete_full_bom':
            $fg_id = (int)($input['fg_item_id'] ?? 0);
            $bom_version = (int)($input['bom_version'] ?? 0);
            if ($fg_id <= 0 || $bom_version <= 0) throw new Exception("Invalid FG ID or Version.");

            $checkStatus = $pdo->prepare("SELECT TOP 1 bom_status FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND bom_version = ?");
            $checkStatus->execute([$fg_id, $bom_version]);
            $status = $checkStatus->fetchColumn();

            if ($status === 'ACTIVE' || $status === 'OBSOLETE') {
                throw new Exception("🔒 ไม่สามารถล้างสูตรสถานะ [{$status}] ได้!");
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ? AND bom_version = ?");
            $stmt->execute([$fg_id, $bom_version]);
            
            writeLog($pdo, 'DELETE_FULL_BOM', basename(__FILE__), $fg_id, null, null, "Deleted all components for Version: v{$bom_version}");
            $pdo->commit();
            
            echo json_encode(['success' => true, 'message' => "ล้างข้อมูลสูตรร่างเวอร์ชัน v{$bom_version} เรียบร้อยแล้ว"]);
            break;

        case 'bulk_delete_bom':
            $boms = $input['boms'] ?? [];
            if (empty($boms)) throw new Exception("No BOMs selected.");

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ?");
            $count = 0;
            foreach ($boms as $bom) {
                if (!empty($bom['fg_item_id'])) {
                    $stmt->execute([(int)$bom['fg_item_id']]);
                    $count++;
                }
            }
            writeLog($pdo, 'BULK_DELETE_BOM', basename(__FILE__), 0, null, null, "Deleted {$count} BOMs");
            $pdo->commit();
            
            echo json_encode(['success' => true, 'message' => "Successfully deleted {$count} BOM(s)."]);
            break;

        case 'rollup_bom_cost':
            $fg_id = (int)($input['fg_item_id'] ?? 0);  
            $bom_version = (int)($input['bom_version'] ?? 0);
            if ($fg_id <= 0 || $bom_version <= 0) throw new Exception("Invalid FG ID or Version.");

            $pdo->beginTransaction();
            try {
                $sql = "
                    SELECT 
                        ISNULL(SUM(c.Cost_RM * b.quantity_required), 0) AS sum_rm,
                        ISNULL(SUM(c.Cost_PKG * b.quantity_required), 0) AS sum_pkg,
                        ISNULL(SUM(c.Cost_SUB * b.quantity_required), 0) AS sum_sub
                    FROM " . BOM_TABLE . " b WITH (NOLOCK)
                    JOIN " . ITEMS_TABLE . " c WITH (NOLOCK) ON b.component_item_id = c.item_id
                    WHERE b.fg_item_id = ? AND b.bom_version = ?
                ";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$fg_id, $bom_version]);
                $costs = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$costs) {
                    throw new Exception("ไม่สามารถคำนวณต้นทุนได้ (อาจไม่มีสูตรการผลิต)");
                }

                $updateSql = "
                    UPDATE " . ITEMS_TABLE . "
                    SET Cost_RM = ?, Cost_PKG = ?, Cost_SUB = ?, updated_at = GETDATE()
                    WHERE item_id = ?
                ";
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute([
                    $costs['sum_rm'], 
                    $costs['sum_pkg'], 
                    $costs['sum_sub'], 
                    $fg_id
                ]);

                $logMsg = "Updated Cost RM: " . number_format($costs['sum_rm'], 4) . " from Ver: v{$bom_version}";
                writeLog($pdo, 'COST_ROLLUP', basename(__FILE__), $fg_id, null, null, $logMsg);
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'อัปเดตต้นทุนมาตรฐานจากสูตรเวอร์ชัน v'.$bom_version.' สำเร็จแล้ว!']);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'create_bom_revision':
            $fg_id = (int)($input['fg_item_id'] ?? 0);
            $ecn_no = trim($input['ecn_number'] ?? '');
            if ($fg_id <= 0 || empty($ecn_no)) throw new Exception("FG ID และ ECN Number เป็นข้อมูลบังคับ");

            $pdo->beginTransaction();
            try {
                $checkDraft = $pdo->prepare("SELECT TOP 1 bom_version FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND bom_status = 'DRAFT'");
                $checkDraft->execute([$fg_id]);
                if ($checkDraft->fetchColumn()) {
                    throw new Exception("ไม่สามารถสร้างได้! มีสูตรเวอร์ชัน DRAFT ค้างรออนุมัติอยู่ กรุณาจัดการของเดิมให้เสร็จก่อน");
                }

                $getActive = $pdo->prepare("SELECT TOP 1 bom_version FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? AND bom_status = 'ACTIVE' ORDER BY bom_version DESC");
                $getActive->execute([$fg_id]);
                $activeVer = (int)$getActive->fetchColumn();
                
                if ($activeVer === 0) {
                     $getObs = $pdo->prepare("SELECT TOP 1 bom_version FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ? ORDER BY bom_version DESC");
                     $getObs->execute([$fg_id]);
                     $activeVer = (int)$getObs->fetchColumn();
                }

                $newVer = $activeVer > 0 ? $activeVer + 1 : 1;

                if ($activeVer > 0) {
                    $sql = "INSERT INTO " . BOM_TABLE . " 
                            (fg_item_id, component_item_id, quantity_required, line, model, updated_by, updated_at, bom_version, bom_status, ecn_number)
                            SELECT fg_item_id, component_item_id, quantity_required, line, model, ?, GETDATE(), ?, 'DRAFT', ?
                            FROM " . BOM_TABLE . " WITH (NOLOCK)
                            WHERE fg_item_id = ? AND bom_version = ?";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([$currentUser['username'], $newVer, $ecn_no, $fg_id, $activeVer]);
                }

                writeLog($pdo, 'CREATE_BOM_REVISION', basename(__FILE__), $fg_id, null, null, "Created Version: v{$newVer}, ECN: {$ecn_no}");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "เปิดเอกสาร ECN และสร้างสูตรร่าง (Draft v{$newVer}) สำเร็จ!", 'new_version' => $newVer]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'approve_bom_revision':
            $fg_id = (int)($input['fg_item_id'] ?? 0);
            $version = (int)($input['bom_version'] ?? 0);
            if ($fg_id <= 0 || $version <= 0) throw new Exception("ข้อมูลไม่ครบถ้วน");

            $pdo->beginTransaction();
            try {
                $stmtObs = $pdo->prepare("UPDATE " . BOM_TABLE . " SET bom_status = 'OBSOLETE' WHERE fg_item_id = ? AND bom_status = 'ACTIVE'");
                $stmtObs->execute([$fg_id]);
                $stmtAct = $pdo->prepare("UPDATE " . BOM_TABLE . " SET bom_status = 'ACTIVE', effective_date = GETDATE() WHERE fg_item_id = ? AND bom_version = ? AND bom_status = 'DRAFT'");
                $stmtAct->execute([$fg_id, $version]);

                writeLog($pdo, 'APPROVE_BOM_REVISION', basename(__FILE__), $fg_id, null, null, "Approved Version: v{$version} to ACTIVE");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "อนุมัติสูตร v{$version} ขึ้นเป็น ACTIVE สำเร็จ! สูตรเดิมถูกปรับเป็น Obsolete แล้ว"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        // =========================================================================
        // [3] EXPORT OPERATIONS (NOLOCK)
        // =========================================================================
        case 'export_all_boms':
            $sql = "
                SELECT 
                    ISNULL(b.line, 'DEFAULT') AS LINE, ISNULL(b.model, 'DEFAULT') AS MODEL,
                    fg.sap_no AS FG_SAP_NO, c.sap_no AS COMPONENT_SAP_NO,
                    CAST(b.quantity_required AS FLOAT) AS QUANTITY_REQUIRED
                FROM " . BOM_TABLE . " b WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " fg WITH (NOLOCK) ON b.fg_item_id = fg.item_id
                JOIN " . ITEMS_TABLE . " c WITH (NOLOCK) ON b.component_item_id = c.item_id
            ";
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " WHERE b.fg_item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line = ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$currentUser['line']]);
            } else {
                $sql .= " ORDER BY fg.sap_no ASC";
                $stmt = $pdo->query($sql);
            }
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'export_selected_boms':
            $boms = $input['boms'] ?? [];
            if (empty($boms)) throw new Exception("No BOMs selected.");
            $fg_ids = array_filter(array_column($boms, 'fg_item_id'));
            if (empty($fg_ids)) throw new Exception("Invalid BOM data.");

            $placeholders = implode(',', array_fill(0, count($fg_ids), '?'));
            $sql = "
                SELECT 
                    fg.sap_no AS MAP_KEY, ISNULL(b.line, 'DEFAULT') AS LINE, ISNULL(b.model, 'DEFAULT') AS MODEL,
                    c.sap_no AS COMPONENT_SAP_NO, CAST(b.quantity_required AS FLOAT) AS QUANTITY_REQUIRED
                FROM " . BOM_TABLE . " b WITH (NOLOCK)
                JOIN " . ITEMS_TABLE . " fg WITH (NOLOCK) ON b.fg_item_id = fg.item_id
                JOIN " . ITEMS_TABLE . " c WITH (NOLOCK) ON b.component_item_id = c.item_id
                WHERE b.fg_item_id IN ($placeholders)
                ORDER BY fg.sap_no, c.sap_no
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($fg_ids);
            
            $groupedData = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $key = $row['MAP_KEY'];
                unset($row['MAP_KEY']);
                $groupedData[$key][] = $row;
            }
            echo json_encode(['success' => true, 'data' => $groupedData]);
            break;

        // =========================================================================
        // [4] IMPORT OPERATIONS (BULK TRANSACTIONS)
        // =========================================================================
        case 'validate_bulk_import':
            $sheets = $input['sheets'] ?? [];
            if (empty($sheets)) throw new Exception("No data provided.");

            $sapNos = [];
            foreach ($sheets as $sheetName => $data) {
                $sapNos[] = $sheetName;
                foreach ($data['rows'] as $row) {
                    if (!empty($row['COMPONENT_SAP_NO'])) $sapNos[] = $row['COMPONENT_SAP_NO'];
                }
            }
            $itemMap = [];
            if (!empty($sapNos)) {
                $uniqueSapNos = array_unique($sapNos);
                $placeholders = implode(',', array_fill(0, count($uniqueSapNos), '?'));
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN ({$placeholders})");
                $stmt->execute(array_values($uniqueSapNos));
                while ($i = $stmt->fetch(PDO::FETCH_ASSOC)) $itemMap[$i['sap_no']] = $i['item_id'];
            }

            $existingBomsStmt = $pdo->query("SELECT DISTINCT fg_item_id FROM " . BOM_TABLE . " WITH (NOLOCK)");
            $existingBoms = array_flip($existingBomsStmt->fetchAll(PDO::FETCH_COLUMN, 0));

            $results = [];
            $summary = ['create' => 0, 'overwrite' => 0, 'skipped' => 0];
            $isValid = true;

            foreach ($sheets as $sheetName => $data) {
                $processed = ['sheet_name' => $sheetName, 'errors' => [], 'rows' => $data['rows']];
                $fgId = $itemMap[$sheetName] ?? null;

                if (!$fgId) $processed['errors'][] = "FG SAP '{$sheetName}' not found.";
                if (empty($data['rows'])) $processed['errors'][] = "Empty data rows.";
                
                foreach ($data['rows'] as $row) {
                    $compSap = $row['COMPONENT_SAP_NO'] ?? '';
                    $qty = (float)($row['QUANTITY_REQUIRED'] ?? 0);
                    if (empty($compSap) || $qty <= 0) $processed['errors'][] = "Invalid Component or Quantity.";
                    if (!isset($itemMap[$compSap])) $processed['errors'][] = "Component '{$compSap}' not found.";
                }

                if (empty($processed['errors'])) {
                    if (isset($existingBoms[$fgId])) {
                        $processed['status'] = 'OVERWRITE';
                        $summary['overwrite']++;
                    } else {
                        $processed['status'] = 'CREATE';
                        $summary['create']++;
                    }
                } else {
                    $processed['status'] = 'SKIPPED';
                    $summary['skipped']++;
                    $isValid = false;
                }
                $results[] = $processed;
            }

            echo json_encode(['success' => true, 'data' => ['isValid' => $isValid, 'summary' => $summary, 'sheets' => $results]]);
            break;

        case 'execute_bulk_import':
            $sheets = $input['sheets'] ?? [];
            if (empty($sheets)) throw new Exception("No validated data.");

            $sapNos = [];
            foreach ($sheets as $s) {
                $sapNos[] = $s['sheet_name'];
                foreach ($s['rows'] as $r) $sapNos[] = $r['COMPONENT_SAP_NO'];
            }
            $itemMap = [];
            if (!empty($sapNos)) {
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN (" . implode(',', array_fill(0, count(array_unique($sapNos)), '?')) . ")");
                $stmt->execute(array_values(array_unique($sapNos)));
                while ($i = $stmt->fetch(PDO::FETCH_ASSOC)) $itemMap[$i['sap_no']] = $i['item_id'];
            }

            $pdo->beginTransaction();
            try {
                $delStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ?");
                $insStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, line, model, quantity_required, updated_by, updated_at) VALUES (?, ?, 'DEFAULT', 'DEFAULT', ?, ?, GETDATE())");
                
                $count = 0;
                foreach ($sheets as $sheet) {
                    if ($sheet['status'] === 'SKIPPED') continue;
                    $fgId = $itemMap[$sheet['sheet_name']] ?? null;
                    if (!$fgId) continue;

                    $delStmt->execute([$fgId]);
                    foreach ($sheet['rows'] as $row) {
                        $compId = $itemMap[$row['COMPONENT_SAP_NO']] ?? null;
                        if (!$compId) continue;
                        $insStmt->execute([$fgId, $compId, (float)$row['QUANTITY_REQUIRED'], $currentUser['username']]);
                    }
                    $count++;
                }

                writeLog($pdo, 'BULK_IMPORT_BOM', basename(__FILE__), 0, null, null, "Processed {$count} BOMs");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Successfully imported {$count} BOM(s)."]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'create_initial_boms':
            $rows = $input['rows'] ?? [];
            if (empty($rows)) throw new Exception("No data provided.");

            $sapNos = [];
            foreach ($rows as $r) {
                if (!empty($r['FG_SAP_NO'])) $sapNos[] = $r['FG_SAP_NO'];
                if (!empty($r['COMPONENT_SAP_NO'])) $sapNos[] = $r['COMPONENT_SAP_NO'];
            }
            $itemMap = [];
            if (!empty($sapNos)) {
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN (" . implode(',', array_fill(0, count(array_unique($sapNos)), '?')) . ")");
                $stmt->execute(array_values(array_unique($sapNos)));
                while ($i = $stmt->fetch(PDO::FETCH_ASSOC)) $itemMap[$i['sap_no']] = $i['item_id'];
            }

            $bomGroups = [];
            $existingBomsStmt = $pdo->query("SELECT DISTINCT fg_item_id FROM " . BOM_TABLE . " WITH (NOLOCK)");
            $existingFgIds = array_flip($existingBomsStmt->fetchAll(PDO::FETCH_COLUMN, 0));

            foreach ($rows as $row) {
                $fgId = $itemMap[$row['FG_SAP_NO']] ?? null;
                if (!$fgId || isset($existingFgIds[$fgId])) continue;
                $bomGroups[$fgId][] = $row;
            }

            $pdo->beginTransaction();
            try {
                $insStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, line, model, quantity_required, updated_by, updated_at) VALUES (?, ?, 'DEFAULT', 'DEFAULT', ?, ?, GETDATE())");
                $created = 0;
                foreach ($bomGroups as $fgId => $comps) {
                    $processed = [];
                    foreach ($comps as $c) {
                        $compId = $itemMap[$c['COMPONENT_SAP_NO']] ?? null;
                        $qty = (float)($c['QUANTITY_REQUIRED'] ?? 0);
                        if ($compId && $qty > 0 && !isset($processed[$compId])) {
                            $insStmt->execute([$fgId, $compId, $qty, $currentUser['username']]);
                            $processed[$compId] = true;
                        }
                    }
                    if (!empty($processed)) $created++;
                }

                writeLog($pdo, 'INITIAL_BOM_CREATE', basename(__FILE__), 0, null, null, "Created {$created} BOMs");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => "Created {$created} new BOM(s). Existing ones skipped."]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'get_bom_master_list':
            $sql = "
                SELECT 
                    i.item_id, i.sap_no, i.part_no, i.part_description, i.material_type, i.planned_output,
                    CASE WHEN EXISTS (SELECT 1 FROM " . BOM_TABLE . " b WITH (NOLOCK) WHERE b.fg_item_id = i.item_id) 
                         THEN 1 ELSE 0 
                    END AS has_bom
                FROM " . ITEMS_TABLE . " i WITH (NOLOCK)
                WHERE i.is_active = 1 
                  AND i.material_type != 'RM'
            ";
            
            if ($currentUser['role'] === 'supervisor') {
                $sql .= " AND i.item_id IN (SELECT item_id FROM " . ROUTES_TABLE . " WITH (NOLOCK) WHERE line = ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$currentUser['line']]);
            } else {
                $sql .= " ORDER BY i.sap_no ASC";
                $stmt = $pdo->query($sql);
            }
            
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'copy_bom':
            $source_sap = trim($input['source_fg_sap_no'] ?? '');
            $target_sap = trim($input['target_fg_sap_no'] ?? '');

            if (empty($source_sap) || empty($target_sap)) {
                throw new Exception("Missing source or target SAP No.");
            }
            if (strtoupper($source_sap) === strtoupper($target_sap)) {
                throw new Exception("ไม่สามารถคัดลอกสูตรทับตัวเองได้ (Source และ Target ต้องไม่เหมือนกัน)");
            }

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("SELECT item_id, sap_no FROM " . ITEMS_TABLE . " WITH (NOLOCK) WHERE sap_no IN (?, ?)");
                $stmt->execute([$source_sap, $target_sap]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $source_id = null;
                $target_id = null;

                foreach ($items as $item) {
                    if (strcasecmp($item['sap_no'], $source_sap) === 0) $source_id = $item['item_id'];
                    if (strcasecmp($item['sap_no'], $target_sap) === 0) $target_id = $item['item_id'];
                }

                if (!$source_id) throw new Exception("ไม่พบรหัสสินค้าต้นฉบับ (Source): {$source_sap} ในระบบ");
                if (!$target_id) throw new Exception("ไม่พบรหัสสินค้าปลายทาง (Target): {$target_sap} ในระบบ (ต้องไปสร้างใน Item Master ก่อน)");

                $srcStmt = $pdo->prepare("SELECT component_item_id, quantity_required FROM " . BOM_TABLE . " WITH (NOLOCK) WHERE fg_item_id = ?");
                $srcStmt->execute([$source_id]);
                $components = $srcStmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($components) === 0) {
                    throw new Exception("รหัสต้นฉบับ {$source_sap} ยังไม่มีสูตรการผลิต ไม่สามารถคัดลอกได้");
                }

                $delStmt = $pdo->prepare("DELETE FROM " . BOM_TABLE . " WHERE fg_item_id = ?");
                $delStmt->execute([$target_id]);
                $insStmt = $pdo->prepare("INSERT INTO " . BOM_TABLE . " (fg_item_id, component_item_id, quantity_required, line, model, updated_by, updated_at) VALUES (?, ?, ?, 'DEFAULT', 'DEFAULT', ?, GETDATE())");
                
                foreach ($components as $comp) {
                    $insStmt->execute([
                        $target_id, 
                        $comp['component_item_id'], 
                        $comp['quantity_required'], 
                        $currentUser['username']
                    ]);
                }

                writeLog($pdo, 'COPY_BOM', basename(__FILE__), $source_sap, null, null, "Cloned BOM to Target SAP: {$target_sap}");
                $pdo->commit();
                
                echo json_encode(['success' => true, 'message' => "คัดลอกสูตรไปยัง '{$target_sap}' สำเร็จแล้ว!"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            throw new Exception("Invalid Action.");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>