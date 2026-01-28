<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// Check Logic: เฉพาะ Supervisor ขึ้นไปถึงจะบันทึกได้
$canEdit = hasRole(['admin', 'creator', 'supervisor']);

$action = $_REQUEST['action'] ?? 'read';
$entry_date = $_REQUEST['entry_date'] ?? date('Y-m-d');
$section = $_REQUEST['section'] ?? $_SESSION['user']['line'] ?? 'Team 1';

try {
    switch ($action) {
        case 'read':
            $tblTransactions = TRANSACTIONS_TABLE;
            $tblItems = ITEMS_TABLE;
            $tblLocations = LOCATIONS_TABLE;
            $tblLabor = 'MES_MANUAL_DAILY_COSTS'; 

            $sql = "
                WITH PL_Tree AS (
                    SELECT 
                        id, item_name, account_code, item_type, data_source, parent_id, row_order, is_active,
                        0 AS item_level,
                        CAST(RIGHT('00000' + CAST(row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX)) AS SortPath
                    FROM PL_STRUCTURE 
                    WHERE parent_id IS NULL AND is_active = 1

                    UNION ALL

                    SELECT 
                        c.id, c.item_name, c.account_code, c.item_type, c.data_source, c.parent_id, c.row_order, c.is_active,
                        p.item_level + 1,
                        p.SortPath + '.' + CAST(RIGHT('00000' + CAST(c.row_order AS VARCHAR(20)), 5) AS VARCHAR(MAX))
                    FROM PL_STRUCTURE c
                    INNER JOIN PL_Tree p ON c.parent_id = p.id
                    WHERE c.is_active = 1
                )

                SELECT 
                    s.id as item_id, 
                    s.item_name, 
                    s.account_code, 
                    s.item_type, 
                    s.data_source, 
                    s.parent_id,
                    s.item_level,
                    
                    CASE 
                        WHEN s.data_source = 'SECTION' THEN NULL
                        WHEN s.data_source = 'MANUAL' THEN ISNULL(e.actual_amount, 0)
                        
                        WHEN s.data_source = 'AUTO_STOCK' THEN (
                            SELECT ISNULL(SUM(t.quantity * i.StandardPrice), 0)
                            FROM $tblTransactions t
                            JOIN $tblItems i ON t.parameter_id = i.item_id
                            LEFT JOIN $tblLocations l ON t.to_location_id = l.location_id
                            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = :date1
                              AND t.transaction_type = 'PRODUCTION_FG'
                        )

                        WHEN s.data_source = 'AUTO_LABOR' THEN (
                            SELECT ISNULL(SUM(cost_value), 0)
                            FROM $tblLabor
                            WHERE entry_date = :date2 
                              AND cost_category = 'LABOR'
                              AND (
                                  (s.account_code = '522001' AND cost_type = 'DIRECT_LABOR') OR
                                  (s.account_code = '522002' AND cost_type = 'OVERTIME') OR
                                  (cost_type = 'DIRECT_LABOR')
                              )
                        )

                        ELSE ISNULL(e.actual_amount, 0)
                    END as actual_amount,
                    
                    e.updated_at

                FROM PL_Tree s
                LEFT JOIN DAILY_PL_ENTRIES e WITH (NOLOCK) 
                    ON s.id = e.item_id 
                    AND e.entry_date = :dateMain 
                    AND e.section_name = :sectMain
                
                ORDER BY s.SortPath
            ";
            
            $stmt = $pdo->prepare($sql);
            
            $params = [
                ':date1' => $entry_date,
                ':date2' => $entry_date,
                ':dateMain' => $entry_date,
                ':sectMain' => $section
            ];

            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save':
            if (!$canEdit) throw new Exception("Access Denied");

            $items = json_decode($_POST['items'], true);
            $user = $_SESSION['user']['username'];
            
            if (!is_array($items)) throw new Exception("Invalid Data Format");

            $pdo->beginTransaction();
            try {
                // ใช้ SP Upsert ที่เราเตรียมไว้ (ปลอดภัยที่สุด)
                $sql = "{CALL sp_UpsertDailyPLEntry(?, ?, ?, ?, ?)}";
                $stmt = $pdo->prepare($sql);

                foreach ($items as $item) {
                    $amount = floatval(str_replace(',', '', $item['amount']));
                    $stmt->execute([
                        $entry_date,
                        $section,
                        $item['item_id'],
                        $amount,
                        $user
                    ]);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;
            
        default:
            throw new Exception("Action not found");
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>