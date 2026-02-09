<?php
// page/pl_daily/api/manage_pl_master.php
header('Content-Type: application/json');

// ปิด Error หน้าเว็บ ให้ลง Log แทน
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// =================================================================
// 1. SECURITY CHECK (Admin Only)
// =================================================================
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied: Insufficient Permissions']);
    exit;
}

// 2. Select Table (Prod vs Dev)
$tableName = defined('PL_STRUCTURE_TABLE') ? PL_STRUCTURE_TABLE : 'PL_STRUCTURE';

$action = $_REQUEST['action'] ?? 'read';

// Helper: ตรวจสอบความปลอดภัยของสูตร (Allow only math chars, brackets, alphanumeric)
function validateFormula($formula) {
    if (empty($formula)) return true;
    // อนุญาต: A-Z, 0-9, _, [], +, -, *, /, (), ., และ space
    return preg_match('/^[A-Z0-9_\[\]\+\-\*\/\(\)\.\s]+$/i', $formula);
}

try {
    switch ($action) {
        
        // ======================================================================
        // CASE: READ (Recursive CTE for Tree View)
        // ======================================================================
        case 'read':
            $showInactive = isset($_REQUEST['show_inactive']) && $_REQUEST['show_inactive'] == 1;
            
            // Logic: ถ้า Show Inactive = True ให้เอาหมด (1=1), ถ้า False ให้เอาแค่ active=1
            $activeCondition  = $showInactive ? "1=1" : "is_active = 1"; 
            $activeConditionC = $showInactive ? "1=1" : "c.is_active = 1"; 

            $sql = "
                WITH PL_Tree AS (
                    -- Anchor (Root)
                    SELECT 
                        id, item_name, account_code, item_type, data_source, 
                        calculation_formula, parent_id, row_order, is_active, updated_at,
                        0 AS item_level,
                        CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                    FROM $tableName 
                    WHERE (parent_id IS NULL OR parent_id = 0)
                      AND $activeCondition

                    UNION ALL

                    -- Recursive (Child)
                    SELECT 
                        c.id, c.item_name, c.account_code, c.item_type, c.data_source, 
                        c.calculation_formula, c.parent_id, c.row_order, c.is_active, c.updated_at,
                        p.item_level + 1,
                        p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                    FROM $tableName c
                    INNER JOIN PL_Tree p ON c.parent_id = p.id
                    WHERE $activeConditionC
                )
                SELECT * FROM PL_Tree ORDER BY SortPath
            ";
            
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: SAVE (Insert / Update)
        // ======================================================================
        case 'save':
            // 1. Sanitize & Validate Inputs
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $parent_id = filter_input(INPUT_POST, 'parent_id', FILTER_VALIDATE_INT);
            if ($parent_id === 0) $parent_id = null; // Convert 0 to NULL for DB

            $code = strtoupper(trim($_POST['account_code'] ?? ''));
            $name = trim($_POST['item_name'] ?? '');
            $formula = trim($_POST['calculation_formula'] ?? '');
            
            if (empty($code) || empty($name)) throw new Exception("Code and Name are required");

            // 2. Validate Formula Security
            if (!validateFormula($formula)) {
                throw new Exception("Security Alert: Invalid characters in formula.");
            }
            // ป้องกัน Comment Injection
            if (strpos($formula, '--') !== false || strpos($formula, '/*') !== false) {
                throw new Exception("Security Alert: Comments not allowed in formula.");
            }
            // เช็ควงเล็บก้ามปู [ ] (Basic Check)
            if (substr_count($formula, '[') !== substr_count($formula, ']')) {
                throw new Exception("Syntax Error: Mismatched brackets []");
            }

            $params = [
                ':code'   => $code,
                ':name'   => $name,
                ':parent' => $parent_id,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => (int)$_POST['row_order'],
                ':formula'=> $formula
            ];

            if ($id) {
                // Update
                $sql = "UPDATE $tableName SET 
                        account_code=:code, item_name=:name, parent_id=:parent, 
                        item_type=:type, data_source=:source, calculation_formula=:formula, 
                        row_order=:order, updated_at=GETDATE() 
                        WHERE id=:id";
                $params[':id'] = $id;
            } else {
                // Insert
                $sql = "INSERT INTO $tableName (account_code, item_name, parent_id, item_type, data_source, calculation_formula, row_order, is_active)
                        VALUES (:code, :name, :parent, :type, :source, :formula, :order, 1)";
            }
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'Saved successfully']);
            break;

        // ======================================================================
        // CASE: DELETE (Soft Delete)
        // ======================================================================
        case 'delete':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");
            
            // Soft Delete: แค่ซ่อน แม่หายลูกก็หายจาก Tree View (เพราะ CTE Join ไม่เจอแม่)
            $stmt = $pdo->prepare("UPDATE $tableName SET is_active = 0, updated_at = GETDATE() WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode(['success' => true, 'message' => 'Item soft deleted']);
            break;

        // ======================================================================
        // CASE: RESTORE
        // ======================================================================
        case 'restore':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");
            
            $stmt = $pdo->prepare("UPDATE $tableName SET is_active = 1, updated_at = GETDATE() WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode(['success' => true, 'message' => 'Item restored']);
            break;

        // ======================================================================
        // CASE: REORDER
        // ======================================================================
        case 'reorder':
            $items = json_decode($_POST['items'], true);
            if (!is_array($items)) throw new Exception("Invalid Data");

            $pdo->beginTransaction();
            try {
                $sql = "UPDATE $tableName SET row_order = :order WHERE id = :id";
                $stmt = $pdo->prepare($sql);

                foreach ($items as $index => $itemId) {
                    // เว้นช่วงทีละ 10 เพื่อให้แทรกง่ายในอนาคต (10, 20, 30...)
                    $newOrder = ($index + 1) * 10; 
                    $stmt->execute([':order' => $newOrder, ':id' => (int)$itemId]);
                }

                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        // ======================================================================
        // CASE: IMPORT BATCH (Excel Import) - Critical Refactor
        // ======================================================================
        case 'import_batch':
            $rawData = json_decode($_POST['data'], true);
            if (!is_array($rawData)) throw new Exception("Invalid JSON Data");

            $pdo->beginTransaction();
            try {
                // 1. Prepare Upsert (MERGE)
                $sqlUpsert = "
                    MERGE INTO $tableName AS T
                    USING (SELECT :code as code, :name as name, :type as type, :src as src, :formula as formula, :order as ord) AS S
                    ON (T.account_code = S.code)
                    WHEN MATCHED THEN
                        UPDATE SET item_name = S.name, item_type = S.type, data_source = S.src, calculation_formula = S.formula, row_order = S.ord, updated_at = GETDATE(), is_active = 1
                    WHEN NOT MATCHED THEN
                        INSERT (account_code, item_name, item_type, data_source, calculation_formula, row_order, is_active)
                        VALUES (S.code, S.name, S.type, S.src, S.formula, S.ord, 1);
                ";
                $stmtUpsert = $pdo->prepare($sqlUpsert);

                $importedCount = 0;

                foreach ($rawData as $row) {
                    if (empty($row['account_code'])) continue;

                    // 1.1 Map Data Source
                    $rawSrc = strtoupper(trim($row['data_source'] ?? ''));
                    $src = 'MANUAL';
                    if (strpos($rawSrc, 'CALC') !== false) $src = 'CALCULATED';
                    elseif (strpos($rawSrc, 'STOCK') !== false) $src = 'AUTO_STOCK';
                    elseif (strpos($rawSrc, 'LABOR') !== false) $src = 'AUTO_LABOR';
                    elseif (strpos($rawSrc, 'MAT') !== false) $src = 'AUTO_MAT';
                    elseif (strpos($rawSrc, 'SCRAP') !== false) $src = 'AUTO_SCRAP';
                    elseif (strpos($rawSrc, 'MACHINE') !== false) $src = 'AUTO_OH_MACHINE';
                    
                    // 1.2 Formula Logic
                    $formula = trim($row['calculation_formula'] ?? '');
                    if ($src === 'CALCULATED' && empty($formula)) $formula = 'SUM_CHILDREN';
                    if (strpos($src, 'AUTO_') === 0) $formula = ''; // Auto ไม่ต้องมีสูตร

                    // 1.3 Validate
                    if (!validateFormula($formula)) $formula = ''; // ถ้าสูตรอันตราย เคลียร์ทิ้ง

                    $stmtUpsert->execute([
                        ':code' => strtoupper(trim($row['account_code'])),
                        ':name' => trim($row['item_name']),
                        ':type' => strtoupper(trim($row['item_type'] ?? 'EXPENSE')),
                        ':src'  => $src,
                        ':formula' => $formula,
                        ':order'=> (int)($row['row_order'] ?? 999)
                    ]);
                    $importedCount++;
                }

                // 2. Fix Parent ID Logic (Re-link Parent-Child based on Codes)
                // ต้องทำทีหลัง Insert เพราะต้องรอให้ Parent เกิดก่อน
                $sqlFixParents = "
                    UPDATE Child
                    SET Child.parent_id = Parent.id
                    FROM $tableName Child
                    JOIN $tableName Parent ON Parent.account_code = :parent_code
                    WHERE Child.account_code = :child_code
                ";
                $stmtFix = $pdo->prepare($sqlFixParents);

                foreach ($rawData as $row) {
                    if (!empty($row['parent_code']) && !empty($row['account_code'])) {
                        $stmtFix->execute([
                            ':parent_code' => strtoupper(trim($row['parent_code'])),
                            ':child_code'  => strtoupper(trim($row['account_code']))
                        ]);
                    }
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'count' => $importedCount]);

            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;
            
        default:
            throw new Exception("Unknown Action");
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>