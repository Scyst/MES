<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check Auth
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    if ($action === 'read') {
        // =========================================================
        // READ: ดึงโครงสร้าง + ข้อมูลที่บันทึกไว้ (Left Join)
        // =========================================================
        $date = $_GET['entry_date'] ?? date('Y-m-d');
        $section = $_GET['section'] ?? 'Team 1';

        $sql = "
            WITH PL_Tree AS (
                SELECT 
                    id, item_name, account_code, item_type, data_source, calculation_formula, parent_id, row_order,
                    0 AS item_level,
                    CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                FROM PL_STRUCTURE 
                WHERE parent_id IS NULL AND is_active = 1

                UNION ALL

                SELECT 
                    c.id, c.item_name, c.account_code, c.item_type, c.data_source, c.calculation_formula, c.parent_id, c.row_order,
                    p.item_level + 1,
                    p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                FROM PL_STRUCTURE c
                INNER JOIN PL_Tree p ON c.parent_id = p.id
                WHERE c.is_active = 1
            )
            SELECT 
                T.id AS item_id, 
                T.account_code, 
                T.item_name, 
                T.item_type, 
                T.data_source, 
                T.calculation_formula,
                T.item_level,
                T.parent_id,
                -- ดึงยอดเงินจากตาราง Entry
                E.amount AS actual_amount,
                E.remark
            FROM PL_Tree T
            LEFT JOIN PL_DAILY_ENTRY E ON T.id = E.pl_item_id AND E.entry_date = :date AND E.section_name = :section
            ORDER BY T.SortPath
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':date' => $date, ':section' => $section]);
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 🔥 Fix Type: แปลง String เป็น Float/Int เพื่อให้ JS คำนวณสูตรได้แม่นยำ
        foreach ($data as &$row) {
            if ($row['actual_amount'] !== null) {
                $row['actual_amount'] = (float)$row['actual_amount'];
            }
            // แปลง Level เป็น Int ด้วย
            $row['item_level'] = (int)$row['item_level'];
        }

        echo json_encode(['success' => true, 'data' => $data]);

    } elseif ($action === 'save') {
        // =========================================================
        // SAVE: บันทึกข้อมูล (รองรับทั้ง Amount และ Remark)
        // =========================================================
        $date = $_POST['entry_date'];
        $section = $_POST['section'];
        $items = json_decode($_POST['items'], true); // [{item_id, amount, remark?}, ...]

        if (!$date || !$section || !is_array($items)) {
            throw new Exception("Invalid input data");
        }

        $pdo->beginTransaction();
        try {
            // 🔥 ปรับ SQL MERGE ให้รองรับ Remark ด้วย
            $sql = "
                MERGE INTO PL_DAILY_ENTRY AS Target
                USING (VALUES (:item_id, :date, :section, :amount, :remark, :user)) 
                AS Source (item_id, entry_date, section_name, amount, remark, updated_by)
                ON Target.pl_item_id = Source.item_id 
                   AND Target.entry_date = Source.entry_date 
                   AND Target.section_name = Source.section_name
                WHEN MATCHED THEN
                    UPDATE SET 
                        amount = Source.amount, 
                        remark = ISNULL(Source.remark, Target.remark), -- อัปเดต Remark ถ้ามีการส่งค่ามา
                        updated_by = Source.updated_by, 
                        updated_at = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (pl_item_id, entry_date, section_name, amount, remark, created_by)
                    VALUES (Source.item_id, Source.entry_date, Source.section_name, Source.amount, Source.remark, Source.updated_by);
            ";
            
            $stmt = $pdo->prepare($sql);
            $userId = $_SESSION['user_id'] ?? 0;

            foreach ($items as $item) {
                $amount = isset($item['amount']) ? floatval($item['amount']) : 0;
                
                // รับค่า Remark (ถ้าไม่มีให้ส่ง NULL เพื่อให้ SQL ใช้ ISNULL)
                $remark = isset($item['remark']) ? trim($item['remark']) : null;
                // แต่ถ้าส่งมาเป็น Empty String แปลว่าUserลบข้อความ ให้บันทึกเป็นค่าว่าง
                if (isset($item['remark']) && $item['remark'] === '') $remark = '';

                $stmt->execute([
                    ':item_id' => $item['item_id'],
                    ':date'    => $date,
                    ':section' => $section,
                    ':amount'  => $amount,
                    ':remark'  => $remark,
                    ':user'    => $userId
                ]);
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Saved successfully']);

        } catch (Exception $ex) {
            $pdo->rollBack();
            throw $ex;
        }

    } else {
        throw new Exception("Unknown Action");
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>