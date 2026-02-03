<?php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    switch ($action) {
        // ======================================================================
        // CASE: READ (เพิ่ม Logic กรอง is_active)
        // ======================================================================
        case 'read':
            // รับค่าจากหน้าบ้าน ว่าจะให้โชว์ตัวที่ลบไหม (ส่งมาเป็น 1 หรือ true)
            $showInactive = isset($_REQUEST['show_inactive']) && $_REQUEST['show_inactive'] == 1;

            // สร้างเงื่อนไข SQL
            $activeCondition = $showInactive ? "1=1" : "is_active = 1"; // ถ้า showInactive=1 ให้เอาหมด, ถ้าไม่ ให้เอาแค่ Active
            $activeConditionC = $showInactive ? "1=1" : "c.is_active = 1"; 

            $sql = "
                WITH PL_Tree AS (
                    SELECT 
                        id, item_name, account_code, item_type, data_source, 
                        calculation_formula,
                        parent_id, row_order, is_active, updated_at,
                        0 AS item_level,
                        CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                    FROM PL_STRUCTURE 
                    WHERE parent_id IS NULL 
                      AND $activeCondition -- 🔥 กรอง Root Node

                    UNION ALL

                    SELECT 
                        c.id, c.item_name, c.account_code, c.item_type, c.data_source, 
                        c.calculation_formula,
                        c.parent_id, c.row_order, c.is_active, c.updated_at,
                        p.item_level + 1,
                        p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                    FROM PL_STRUCTURE c
                    INNER JOIN PL_Tree p ON c.parent_id = p.id
                    WHERE $activeConditionC -- 🔥 กรอง Child Node
                )
                SELECT * FROM PL_Tree ORDER BY SortPath
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // ======================================================================
        // CASE: SAVE (Regex รองรับ _ แล้ว)
        // ======================================================================
        case 'save':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $parent_id = !empty($_POST['parent_id']) ? $_POST['parent_id'] : null;
            $formula = trim($_POST['calculation_formula'] ?? '');
            
            if (empty($_POST['account_code']) || empty($_POST['item_name'])) throw new Exception("Incomplete Data");

            if (!empty($formula)) {
                // ✅ Regex นี้รองรับ A-Z, 0-9, และ _ เรียบร้อยแล้ว
                if (!preg_match('/^[A-Z0-9_\[\]\+\-\*\/\(\)\.\s]+$/i', $formula)) {
                    throw new Exception("Security Alert: Invalid characters in formula.");
                }
                
                if (strpos($formula, '--') !== false || strpos($formula, '/*') !== false || strpos($formula, '//') !== false) {
                    throw new Exception("Security Alert: Comments are not allowed in formula.");
                }

                if (substr_count($formula, '[') !== substr_count($formula, ']')) {
                    throw new Exception("Syntax Error: Mismatched brackets []");
                }
            }

            $params = [
                ':code'   => strtoupper(trim($_POST['account_code'])),
                ':name'   => trim($_POST['item_name']),
                ':parent' => $parent_id,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => (int)$_POST['row_order'],
                ':formula'=> $formula
            ];

            if ($id) {
                // Update
                $sql = "UPDATE PL_STRUCTURE SET account_code=:code, item_name=:name, parent_id=:parent, 
                        item_type=:type, data_source=:source, calculation_formula=:formula, row_order=:order, updated_at=GETDATE() WHERE id=:id";
                $params[':id'] = $id;
            } else {
                // Insert (Default is_active = 1)
                $sql = "INSERT INTO PL_STRUCTURE (account_code, item_name, parent_id, item_type, data_source, calculation_formula, row_order, is_active)
                        VALUES (:code, :name, :parent, :type, :source, :formula, :order, 1)";
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'Saved successfully']);
            break;

        // ======================================================================
        // CASE: DELETE (เปลี่ยนเป็น Soft Delete)
        // ======================================================================
        case 'delete':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");
            
            // 🔥 เปลี่ยนจาก DELETE เป็น UPDATE is_active = 0
            // ไม่ต้องเช็ค Child แล้ว เพราะเราแค่ซ่อนแม่ ลูกก็จะหายไปจาก Tree view เอง (ตาม Logic ใน case read)
            $stmt = $pdo->prepare("UPDATE PL_STRUCTURE SET is_active = 0, updated_at = GETDATE() WHERE id = ?");
            $stmt->execute([$id]);
            
            echo json_encode(['success' => true, 'message' => 'Item soft deleted']);
            break;

        // ======================================================================
        // CASE: RESTORE (กู้คืนชีพ)
        // ======================================================================
        case 'restore':
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");
            
            $stmt = $pdo->prepare("UPDATE PL_STRUCTURE SET is_active = 1, updated_at = GETDATE() WHERE id = ?");
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
                $sql = "UPDATE PL_STRUCTURE SET row_order = :order WHERE id = :id";
                $stmt = $pdo->prepare($sql);

                foreach ($items as $index => $itemId) {
                    $newOrder = ($index + 1) * 10;
                    $stmt->execute([':order' => $newOrder, ':id' => $itemId]);
                }

                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        // ======================================================================
        // CASE: IMPORT BATCH
        // ======================================================================
        case 'import_batch':
            $rawData = json_decode($_POST['data'], true);
            if (!is_array($rawData)) throw new Exception("Invalid JSON Data");

            $pdo->beginTransaction();
            try {
                // เพิ่ม is_active ใน Insert ด้วย
                $sqlUpsert = "
                    MERGE INTO PL_STRUCTURE AS T
                    USING (SELECT :code as code, :name as name, :type as type, :src as src, :formula as formula, :order as ord) AS S
                    ON (T.account_code = S.code)
                    WHEN MATCHED THEN
                        UPDATE SET item_name = S.name, item_type = S.type, data_source = S.src, calculation_formula = S.formula, row_order = S.ord, updated_at = GETDATE()
                    WHEN NOT MATCHED THEN
                        INSERT (account_code, item_name, item_type, data_source, calculation_formula, row_order, is_active)
                        VALUES (S.code, S.name, S.type, S.src, S.formula, S.ord, 1);
                ";
                $stmtUpsert = $pdo->prepare($sqlUpsert);

                $importedCount = 0;

                foreach ($rawData as $row) {
                    if (empty($row['account_code'])) continue;

                    $rawSrc = strtoupper(trim($row['data_source']));
                    $src = 'MANUAL';

                    // Logic เดิมของการ Map Data Source
                    if (strpos($rawSrc, 'CALC') !== false) $src = 'CALCULATED';
                    elseif (strpos($rawSrc, 'STOCK') !== false) $src = 'AUTO_STOCK';
                    elseif (strpos($rawSrc, 'LABOR') !== false) $src = 'AUTO_LABOR';
                    elseif (strpos($rawSrc, 'MAT') !== false) $src = 'AUTO_MAT';
                    elseif (strpos($rawSrc, 'SCRAP') !== false) $src = 'AUTO_SCRAP';
                    elseif (strpos($rawSrc, 'MACHINE') !== false) $src = 'AUTO_OH_MACHINE';
                    elseif ($rawSrc === 'MANUAL') $src = 'MANUAL';

                    $formula = trim($row['calculation_formula'] ?? '');
                    
                    if ($src === 'CALCULATED' && empty($formula)) {
                        $formula = 'SUM_CHILDREN';
                    }
                    if (in_array($src, ['AUTO_STOCK', 'AUTO_LABOR', 'AUTO_MAT', 'AUTO_SCRAP', 'AUTO_OH_MACHINE'])) {
                        $formula = '';
                    }

                    $stmtUpsert->execute([
                        ':code' => strtoupper(trim($row['account_code'])),
                        ':name' => trim($row['item_name']),
                        ':type' => strtoupper(trim($row['item_type'])),
                        ':src'  => $src,
                        ':formula' => $formula,
                        ':order'=> (int)$row['row_order']
                    ]);
                    $importedCount++;
                }

                // Fix Parent ID Logic (คงเดิม)
                $sqlFixParents = "
                    UPDATE Child
                    SET Child.parent_id = Parent.id
                    FROM PL_STRUCTURE Child
                    JOIN PL_STRUCTURE Parent ON Parent.account_code = :parent_code
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
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>