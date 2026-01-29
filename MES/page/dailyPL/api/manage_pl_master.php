<?php
// page/pl_daily/api/manage_pl_master.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check Auth
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    switch ($action) {
        case 'read':
            // 🔥 UPGRADE: แก้ไข SQL ให้ดึง calculation_formula ออกมาด้วย
            $sql = "
                WITH PL_Tree AS (
                    -- Anchor: Level 0 (เพิ่ม calculation_formula)
                    SELECT 
                        id, item_name, account_code, item_type, data_source, 
                        calculation_formula,
                        parent_id, row_order, is_active, updated_at,
                        0 AS item_level,
                        CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                    FROM PL_STRUCTURE 
                    WHERE parent_id IS NULL

                    UNION ALL

                    -- Recursive: Children (เพิ่ม calculation_formula)
                    SELECT 
                        c.id, c.item_name, c.account_code, c.item_type, c.data_source, 
                        c.calculation_formula,
                        c.parent_id, c.row_order, c.is_active, c.updated_at,
                        p.item_level + 1,
                        p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                    FROM PL_STRUCTURE c
                    INNER JOIN PL_Tree p ON c.parent_id = p.id
                )
                SELECT * FROM PL_Tree ORDER BY SortPath
            ";
            $stmt = $pdo->query($sql);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save':
            // (Logic เดิมของคุณ ดีอยู่แล้ว)
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $parent_id = !empty($_POST['parent_id']) ? $_POST['parent_id'] : null;
            
            if (empty($_POST['account_code']) || empty($_POST['item_name'])) throw new Exception("ข้อมูลไม่ครบถ้วน");

            $params = [
                ':code'   => strtoupper(trim($_POST['account_code'])),
                ':name'   => trim($_POST['item_name']),
                ':parent' => $parent_id,
                ':type'   => $_POST['item_type'],
                ':source' => $_POST['data_source'],
                ':order'  => (int)$_POST['row_order'],
                ':formula'=> trim($_POST['calculation_formula'] ?? '') 
            ];

            if ($id) {
                $sql = "UPDATE PL_STRUCTURE SET account_code=:code, item_name=:name, parent_id=:parent, 
                        item_type=:type, data_source=:source, calculation_formula=:formula, row_order=:order, updated_at=GETDATE() WHERE id=:id";
                $params[':id'] = $id;
            } else {
                $sql = "INSERT INTO PL_STRUCTURE (account_code, item_name, parent_id, item_type, data_source, calculation_formula, row_order, is_active)
                        VALUES (:code, :name, :parent, :type, :source, :formula, :order, 1)";
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'message' => 'บันทึกเรียบร้อย']);
            break;

        case 'delete':
            // (Logic เดิม)
            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            if (!$id) throw new Exception("Invalid ID");
            
            $check = $pdo->prepare("SELECT COUNT(*) FROM PL_STRUCTURE WHERE parent_id = ?");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) throw new Exception("ลบไม่ได้: มีรายการย่อยอยู่ภายใน");

            $stmt = $pdo->prepare("DELETE FROM PL_STRUCTURE WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        // ACTION: Reorder (จัดลำดับใหม่)
        case 'reorder':
            $items = json_decode($_POST['items'], true); // รับ Array ของ ID ที่เรียงแล้ว
            if (!is_array($items)) throw new Exception("Invalid Data");

            $pdo->beginTransaction();
            try {
                // Loop อัปเดต row_order ตามลำดับที่ส่งมา
                // คูณ 10 เพื่อให้มีช่องว่างสำหรับแทรกในอนาคต (10, 20, 30...)
                $sql = "UPDATE PL_STRUCTURE SET row_order = :order WHERE id = :id";
                $stmt = $pdo->prepare($sql);

                foreach ($items as $index => $itemId) {
                    $newOrder = ($index + 1) * 10;
                    $stmt->execute([':order' => $newOrder, ':id' => $itemId]);
                }

                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'จัดลำดับใหม่เรียบร้อย']);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        // ACTION: Batch Import from Excel
        case 'import_batch':
            $rawData = json_decode($_POST['data'], true);
            if (!is_array($rawData)) throw new Exception("Invalid JSON Data");

            $pdo->beginTransaction();
            try {
                // 1. เตรียม Statement
                // ใช้ MERGE เพื่อ Update ของเดิม หรือ Insert ของใหม่
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

                // 2. PASS 1: Upsert ข้อมูลหลัก (ยังไม่สน Parent)
                foreach ($rawData as $row) {
                    // Skip ถ้ารหัสว่าง
                    if (empty($row['account_code'])) continue;

                    // 1. จัดการ Data Source (แก้ไข Logic ตรงนี้)
                    $src = strtoupper(trim($row['data_source']));

                    // ตรวจสอบ Keyword และจัดระเบียบ
                    if (strpos($src, 'CALC') !== false) {
                        $src = 'CALCULATED';
                    }
                    elseif (strpos($src, 'AUTO') !== false && strpos($src, 'STOCK') !== false) {
                        $src = 'AUTO_STOCK';
                    }
                    elseif (strpos($src, 'AUTO') !== false) {
                        $src = 'AUTO_LABOR';
                    }
                    // ตัด SECTION ทิ้งไปเลย ตามที่เราตกลงกันว่าไม่ใช้แล้ว

                    // Validation สุดท้าย: ต้องอยู่ในรายชื่อที่อนุญาตเท่านั้น
                    $allowedSources = ['MANUAL', 'AUTO_STOCK', 'AUTO_LABOR', 'CALCULATED'];
                    if (!in_array($src, $allowedSources)) {
                        $src = 'MANUAL'; // ถ้าค่าแปลกประหลาดหลุดมา ให้ตีเป็น Manual
                    }

                    // 2. จัดการ Formula (Smart Default)
                    // Logic นี้จะทำงานถูกต้องแล้ว เพราะ $src เป็น CALCULATED แล้ว
                    $formula = trim($row['calculation_formula'] ?? '');
                    if ($src === 'CALCULATED' && $formula === '') {
                        $formula = 'SUM_CHILDREN';
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

                // 3. PASS 2: Re-link Parent (จับคู่ลูกกับแม่)
                // อัปเดต parent_id โดยการ Join account_code ของแม่
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
                
                // 4. (Optional) Fix Root Items (ตัวที่ไม่มี Parent Code ให้ Parent ID เป็น NULL)
                // เพื่อป้องกันขยะตกค้างจากการย้ายกลุ่ม
                /* $pdo->exec("UPDATE PL_STRUCTURE SET parent_id = NULL WHERE account_code IN (" . 
                    implode(',', array_map(function($r) { return empty($r['parent_code']) ? "'".$r['account_code']."'" : "''"; }, $rawData)) 
                . ")");
                */

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