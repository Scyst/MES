<?php
/**
 * Self-contained P&L Account Structure & Formula Builder API.
 * Replaces legacy page/dailyPL/api/manage_pl_master.php.
 */

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];
try {
    [$action, $input, $currentUser] = parsePlRequest('read');
    $tableName = defined('PL_STRUCTURE_TABLE') ? PL_STRUCTURE_TABLE : 'PL_STRUCTURE';

    switch ($action) {
        case 'read': {
            requirePlAccess(false);
            $showInactive = !empty($input['show_inactive']) && ((string)$input['show_inactive'] === '1' || $input['show_inactive'] === true);
            $activeCond = $showInactive ? '1=1' : 'is_active = 1';
            $activeCondC = $showInactive ? '1=1' : 'c.is_active = 1';

            $sql = "
                WITH PL_Tree AS (
                    SELECT
                        id, item_name, account_code, item_type, data_source,
                        calculation_formula, parent_id, row_order, is_active, updated_at,
                        0 AS item_level,
                        CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                    FROM {$tableName} WITH (NOLOCK)
                    WHERE (parent_id IS NULL OR parent_id = 0) AND {$activeCond}
                    UNION ALL
                    SELECT
                        c.id, c.item_name, c.account_code, c.item_type, c.data_source,
                        c.calculation_formula, c.parent_id, c.row_order, c.is_active, c.updated_at,
                        p.item_level + 1,
                        p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                    FROM {$tableName} c WITH (NOLOCK)
                    INNER JOIN PL_Tree p ON c.parent_id = p.id
                    WHERE {$activeCondC}
                )
                SELECT * FROM PL_Tree ORDER BY SortPath
            ";
            $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
            foreach ($rows as &$r) {
                $r['id'] = (int)$r['id'];
                $r['parent_id'] = is_numeric($r['parent_id'] ?? null) && (int)$r['parent_id'] > 0 ? (int)$r['parent_id'] : null;
                $r['row_order'] = (int)($r['row_order'] ?? 0);
                $r['item_level'] = (int)($r['item_level'] ?? 0);
                $r['is_active'] = (int)($r['is_active'] ?? 0);
            }
            unset($r);

            plJsonSuccess($rows, 'P&L structure loaded');
            break;
        }

        case 'save': {
            requirePlAccess(true);
            $id = (int)($input['id'] ?? 0);
            $parentId = (isset($input['parent_id']) && is_numeric($input['parent_id']) && (int)$input['parent_id'] > 0)
                ? (int)$input['parent_id']
                : null;
            $code = strtoupper(trim((string)($input['account_code'] ?? '')));
            $name = trim((string)($input['item_name'] ?? ''));
            $type = strtoupper(trim((string)($input['item_type'] ?? 'EXPENSE')));
            $dataSource = strtoupper(trim((string)($input['data_source'] ?? 'MANUAL')));
            $formula = trim((string)($input['calculation_formula'] ?? ''));
            $rowOrder = (int)($input['row_order'] ?? 10);

            if ($code === '' || $name === '' || !in_array($type, ['REVENUE', 'COGS', 'EXPENSE'], true)) {
                plJsonError('กรุณากรอกรหัสบัญชี ชื่อรายการ และประเภทให้ครบถ้วน', 400);
            }
            if ($id > 0 && $parentId === $id) {
                plJsonError('ไม่สามารถกำหนดรายการนี้เป็นหมวดหมู่หลักของตัวเองได้', 400);
            }
            if (!isValidPlFormula($formula)) {
                plJsonError('สูตรคำนวณมีอักขระที่ไม่ได้รับอนุญาต หรือวงเล็บ [ ] ไม่ครบคู่', 400);
            }

            $pdo->beginTransaction();
            $params = [
                ':code' => $code,
                ':name' => $name,
                ':parent' => $parentId,
                ':type' => $type,
                ':source' => $dataSource,
                ':order' => $rowOrder,
                ':formula' => $formula,
            ];

            if ($id > 0) {
                $stmtOld = $pdo->prepare("SELECT id, account_code, item_name, parent_id, item_type, data_source, calculation_formula, row_order FROM {$tableName} WHERE id = ?");
                $stmtOld->execute([$id]);
                $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
                if (!$oldRow) {
                    $pdo->rollBack();
                    plJsonError('ไม่พบรายการบัญชีที่ต้องการแก้ไข', 404);
                }

                $sql = "UPDATE {$tableName} SET account_code = :code, item_name = :name, parent_id = :parent, item_type = :type, data_source = :source, calculation_formula = :formula, row_order = :order, updated_at = GETDATE() WHERE id = :id";
                $params[':id'] = $id;
                $pdo->prepare($sql)->execute($params);
                writeLog($pdo, 'UPDATE', 'DAILY_PL_MASTER', $id, $oldRow, $params, "Updated P&L item {$code}");
            } else {
                $sql = "INSERT INTO {$tableName} (account_code, item_name, parent_id, item_type, data_source, calculation_formula, row_order, is_active) VALUES (:code, :name, :parent, :type, :source, :formula, :order, 1)";
                $pdo->prepare($sql)->execute($params);
                $newId = $pdo->lastInsertId() ?: $code;
                writeLog($pdo, 'CREATE', 'DAILY_PL_MASTER', $newId, null, $params, "Created P&L item {$code}");
            }
            $pdo->commit();

            plJsonSuccess(['id' => $id], 'บันทึกโครงสร้างบัญชี P&L สำเร็จ');
            break;
        }

        case 'delete': {
            requirePlAccess(true);
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) {
                plJsonError('รหัสรายการไม่ถูกต้อง', 400);
            }

            $pdo->beginTransaction();
            $stmtOld = $pdo->prepare("SELECT id, account_code, item_name, is_active FROM {$tableName} WHERE id = ?");
            $stmtOld->execute([$id]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                $pdo->rollBack();
                plJsonError('ไม่พบรายการที่ต้องการลบ', 404);
            }

            $pdo->prepare("UPDATE {$tableName} SET is_active = 0, updated_at = GETDATE() WHERE id = ?")->execute([$id]);
            writeLog($pdo, 'DELETE', 'DAILY_PL_MASTER', $id, $oldRow, ['is_active' => 0], "Soft deleted P&L item {$oldRow['account_code']}");
            $pdo->commit();

            plJsonSuccess(['id' => $id], 'ปิดใช้งานรายการบัญชีเรียบร้อยแล้ว');
            break;
        }

        case 'restore': {
            requirePlAccess(true);
            $id = (int)($input['id'] ?? 0);
            if ($id <= 0) {
                plJsonError('รหัสรายการไม่ถูกต้อง', 400);
            }

            $pdo->beginTransaction();
            $stmtOld = $pdo->prepare("SELECT id, account_code, item_name, is_active FROM {$tableName} WHERE id = ?");
            $stmtOld->execute([$id]);
            $oldRow = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldRow) {
                $pdo->rollBack();
                plJsonError('ไม่พบรายการที่ต้องการกู้คืน', 404);
            }

            $pdo->prepare("UPDATE {$tableName} SET is_active = 1, updated_at = GETDATE() WHERE id = ?")->execute([$id]);
            writeLog($pdo, 'RESTORE', 'DAILY_PL_MASTER', $id, $oldRow, ['is_active' => 1], "Restored P&L item {$oldRow['account_code']}");
            $pdo->commit();

            plJsonSuccess(['id' => $id], 'กู้คืนรายการบัญชีเรียบร้อยแล้ว');
            break;
        }

        case 'reorder': {
            requirePlAccess(true);
            $rawItems = $input['items'] ?? [];
            $items = is_array($rawItems) ? $rawItems : json_decode((string)$rawItems, true);
            if (!is_array($items) || count($items) === 0) {
                plJsonError('ไม่พบลำดับรายการสำหรับจัดเรียง', 400);
            }

            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE {$tableName} SET row_order = :order WHERE id = :id");
            foreach ($items as $idx => $itemId) {
                $stmt->execute([':order' => ($idx + 1) * 10, ':id' => (int)$itemId]);
            }
            writeLog($pdo, 'UPDATE', 'DAILY_PL_MASTER', 'REORDER', null, ['count' => count($items)], 'Reordered P&L items');
            $pdo->commit();
            plJsonSuccess(['count' => count($items)], 'บันทึกลำดับการแสดงผลสำเร็จ');
            break;
        }

        case 'import_batch': {
            requirePlAccess(true);
            $rawData = $input['data'] ?? [];
            $rows = is_array($rawData) ? $rawData : json_decode((string)$rawData, true);
            if (!is_array($rows) || count($rows) === 0) {
                plJsonError('ไม่พบข้อมูลสำหรับนำเข้า', 400);
            }

            $pdo->beginTransaction();
            $stmtUpsert = $pdo->prepare("
                MERGE INTO {$tableName} AS T
                USING (SELECT :code AS code, :name AS name, :type AS type, :src AS src, :formula AS formula, :order AS ord) AS S
                ON (T.account_code = S.code)
                WHEN MATCHED THEN
                    UPDATE SET item_name = S.name, item_type = S.type, data_source = S.src, calculation_formula = S.formula, row_order = S.ord, updated_at = GETDATE(), is_active = 1
                WHEN NOT MATCHED THEN
                    INSERT (account_code, item_name, item_type, data_source, calculation_formula, row_order, is_active)
                    VALUES (S.code, S.name, S.type, S.src, S.formula, S.ord, 1);
            ");

            $imported = 0;
            foreach ($rows as $row) {
                $code = strtoupper(trim((string)($row['account_code'] ?? '')));
                $name = trim((string)($row['item_name'] ?? ''));
                if ($code === '' || $name === '') {
                    continue;
                }

                $rawSrc = strtoupper(trim((string)($row['data_source'] ?? '')));
                $src = 'MANUAL';
                if (strpos($rawSrc, 'CALC') !== false) $src = 'CALCULATED';
                elseif (strpos($rawSrc, 'AUTO_') === 0) $src = $rawSrc;
                elseif (strpos($rawSrc, 'STOCK') !== false) $src = 'AUTO_STOCK';
                elseif (strpos($rawSrc, 'LABOR') !== false) $src = 'AUTO_LABOR';
                elseif (strpos($rawSrc, 'MAT') !== false) $src = 'AUTO_MAT';
                elseif (strpos($rawSrc, 'SCRAP') !== false) $src = 'AUTO_SCRAP';
                elseif (strpos($rawSrc, 'MACHINE') !== false) $src = 'AUTO_OH_MACHINE';
                elseif (strpos($rawSrc, 'UTILITY_ACT') !== false) $src = 'AUTO_UTILITY_ACTUAL';
                elseif (strpos($rawSrc, 'LPG') !== false) $src = 'AUTO_UTILITY_LPG_ACTUAL';

                $formula = trim((string)($row['calculation_formula'] ?? ''));
                if ($src === 'CALCULATED' && $formula === '') {
                    $formula = 'SUM_CHILDREN';
                }
                if (strpos($src, 'AUTO_') === 0 || !isValidPlFormula($formula)) {
                    $formula = '';
                }

                $stmtUpsert->execute([
                    ':code' => $code,
                    ':name' => $name,
                    ':type' => strtoupper(trim((string)($row['item_type'] ?? 'EXPENSE'))),
                    ':src' => $src,
                    ':formula' => $formula,
                    ':order' => (int)($row['row_order'] ?? 999),
                ]);
                $imported++;
            }

            $stmtFix = $pdo->prepare("
                UPDATE Child
                SET Child.parent_id = Parent.id
                FROM {$tableName} Child
                JOIN {$tableName} Parent ON Parent.account_code = :parent_code
                WHERE Child.account_code = :child_code
            ");
            foreach ($rows as $row) {
                $pCode = strtoupper(trim((string)($row['parent_code'] ?? '')));
                $cCode = strtoupper(trim((string)($row['account_code'] ?? '')));
                if ($pCode !== '' && $cCode !== '') {
                    $stmtFix->execute([':parent_code' => $pCode, ':child_code' => $cCode]);
                }
            }

            writeLog($pdo, 'IMPORT', 'DAILY_PL_MASTER', 'BATCH_IMPORT', null, ['count' => $imported], 'Imported P&L master account structure');
            $pdo->commit();
            plJsonSuccess(['count' => $imported], "นำเข้าผังบัญชีสำเร็จ {$imported} รายการ");
            break;
        }

        default:
            plJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'DAILY_PL_MASTER', $e->getMessage(), ['action' => $action]);
    plJsonError('ไม่สามารถจัดการโครงสร้างบัญชี P&L ได้ กรุณาลองใหม่อีกครั้ง', 500);
}
