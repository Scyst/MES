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
            // ------------------------------------------------------------------
            // ENGINE: ดึงโครงสร้าง + ข้อมูลที่บันทึก + ข้อมูล Auto Real-time
            // ------------------------------------------------------------------
            // ใช้ Constants จาก config.php เพื่อรองรับ Test/Prod Mode
            $tblTransactions = TRANSACTIONS_TABLE;
            $tblItems = ITEMS_TABLE;
            $tblLocations = LOCATIONS_TABLE;
            // $tblLabor = IS_DEVELOPMENT ? 'MES_MANUAL_DAILY_COSTS_TEST' : 'MES_MANUAL_DAILY_COSTS'; // ถ้ามีตาราง Test
            $tblLabor = 'MES_MANUAL_DAILY_COSTS'; // สมมติใช้ตารางเดียว

            $sql = "
                SELECT 
                    s.id as item_id, 
                    s.item_name, 
                    s.account_code, 
                    s.item_type, 
                    s.data_source, 
                    s.parent_id,
                    s.row_order,
                    
                    -- [Smart Logic] เลือกค่าที่จะแสดง
                    CASE 
                        -- 1. HEADER: ไม่แสดงค่า
                        WHEN s.data_source = 'SECTION' THEN NULL

                        -- 2. MANUAL: ถ้ามีค่าที่บันทึกไว้ ให้ใช้ค่านั้น (Manual Override)
                        WHEN s.data_source = 'MANUAL' THEN ISNULL(e.actual_amount, 0)
                        
                        -- 3. AUTO REVENUE: ดึงจากยอดผลิต (FG) * StandardPrice
                        WHEN s.data_source = 'AUTO_STOCK' THEN (
                            SELECT ISNULL(SUM(t.quantity * i.StandardPrice), 0)
                            FROM $tblTransactions t
                            JOIN $tblItems i ON t.parameter_id = i.item_id
                            LEFT JOIN $tblLocations l ON t.to_location_id = l.location_id
                            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = :date1
                              AND t.transaction_type = 'PRODUCTION_FG'
                              -- AND (@section1 = 'ALL' OR l.production_line = @section1) -- เปิดใช้ถ้าต้องการกรอง Line
                        )

                        -- 4. AUTO LABOR: ดึงจากค่าแรงที่คำนวณไว้
                        WHEN s.data_source = 'AUTO_LABOR' THEN (
                            SELECT ISNULL(SUM(cost_value), 0)
                            FROM $tblLabor
                            WHERE entry_date = :date2 
                              -- AND line = :section2 
                              AND cost_category = 'LABOR'
                              -- Mapping Account Code อย่างง่าย
                              AND (
                                  (s.account_code = '522001' AND cost_type = 'DIRECT_LABOR') OR
                                  (s.account_code = '522002' AND cost_type = 'OVERTIME') OR
                                  (cost_type = 'DIRECT_LABOR') -- Default
                              )
                        )

                        ELSE ISNULL(e.actual_amount, 0)
                    END as actual_amount,
                    
                    e.updated_at

                FROM PL_STRUCTURE s WITH (NOLOCK)
                LEFT JOIN DAILY_PL_ENTRIES e WITH (NOLOCK) 
                    ON s.id = e.item_id 
                    AND e.entry_date = :dateMain 
                    AND e.section_name = :sectMain
                WHERE s.is_active = 1
                ORDER BY s.row_order ASC, s.account_code ASC
            ";
            
            $stmt = $pdo->prepare($sql);
            
            // Parameter Binding
            $params = [
                ':date1' => $entry_date,
                // ':section1' => $section,
                ':date2' => $entry_date,
                // ':section2' => $section,
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