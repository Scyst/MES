<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';

try {
    
    switch ($action) {
        
        // =================================================================
        // CASE 1: READ (ดึงข้อมูล Entry + Target)
        // =================================================================
        case 'read':
            $date = $_GET['entry_date'] ?? date('Y-m-d');
            $section = $_GET['section'] ?? 'Team 1';

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLEntryData_WithTargets :date, :section");
            $stmt->execute([':date' => $date, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fix Types
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target'];
                $row['monthly_budget'] = (float)$row['monthly_budget'];
                $row['item_level']    = (int)$row['item_level'];
            }

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // =================================================================
        // CASE 2: SAVE ENTRY (บันทึกยอดจริงรายวัน)
        // =================================================================
        case 'save':
            $date = $_POST['entry_date'];
            $section = $_POST['section'];
            $items = json_decode($_POST['items'], true);

            if (!$date || !$section || !is_array($items)) throw new Exception("Invalid input");

            $pdo->beginTransaction();
            try {
                $sql = "MERGE INTO PL_DAILY_ENTRY AS Target
                        USING (VALUES (:item_id, :date, :section, :amount, :remark, :user)) 
                        AS Source (item_id, entry_date, section_name, amount, remark, updated_by)
                        ON Target.pl_item_id = Source.item_id AND Target.entry_date = Source.entry_date AND Target.section_name = Source.section_name
                        WHEN MATCHED THEN
                            UPDATE SET amount = Source.amount, remark = ISNULL(Source.remark, Target.remark), updated_by = Source.updated_by, updated_at = GETDATE()
                        WHEN NOT MATCHED THEN
                            INSERT (pl_item_id, entry_date, section_name, amount, remark, created_by)
                            VALUES (Source.item_id, Source.entry_date, Source.section_name, Source.amount, Source.remark, Source.updated_by);";
                
                $stmt = $pdo->prepare($sql);
                $userId = $_SESSION['user_id'] ?? 0;

                foreach ($items as $item) {
                    $amount = isset($item['amount']) ? floatval($item['amount']) : 0;
                    $remark = isset($item['remark']) ? (trim($item['remark']) === '' ? '' : trim($item['remark'])) : null;

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
                echo json_encode(['success' => true]);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex;
            }
            break;

        // =================================================================
        // CASE 3: SAVE TARGET (บันทึกงบประมาณรายเดือน)
        // =================================================================
        case 'save_target':
            $month = $_POST['month'];
            $year = $_POST['year'];
            $section = $_POST['section'];
            $itemsJson = $_POST['items'];

            $stmt = $pdo->prepare("EXEC dbo.sp_SaveMonthlyTarget :year, :month, :section, :items");
            $stmt->execute([
                ':year' => $year,
                ':month' => $month,
                ':section' => $section,
                ':items' => $itemsJson
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($result && $result['success'] == 1) {
                echo json_encode(['success' => true, 'message' => 'Budget saved.', 'working_days' => $result['working_days_used']]);
            } else {
                throw new Exception($result['message'] ?? 'Save failed');
            }
            break;

        // =================================================================
        // CASE 4: GET WORKING DAYS (สำหรับอัปเดต Badge ใน Modal)
        // =================================================================
        case 'get_working_days':
            $year = $_GET['year'];
            $month = $_GET['month'];

            $stmt = $pdo->prepare("EXEC dbo.sp_GetWorkingDays :year, :month");
            $stmt->execute([':year' => $year, ':month' => $month]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'days' => (int)$result['working_days']]);
            break;

        // =================================================================
        // DEFAULT: Unknown Action
        // =================================================================
        default:
            throw new Exception("Unknown Action: " . $action);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>