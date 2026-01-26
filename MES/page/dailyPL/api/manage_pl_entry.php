<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

$action = $_REQUEST['action'] ?? 'read';
$entry_date = $_REQUEST['entry_date'] ?? date('Y-m-d');
$section = $_REQUEST['section'] ?? 'Team 1';

try {
    switch ($action) {
        case 'read':
            // ดึงรายการ Manual ทั้งหมดมา Join กับข้อมูลที่เคยบันทึกไว้แล้ว (ถ้ามี)
            $sql = "SELECT s.id as item_id, s.item_name, s.account_code, s.item_type, 
                           e.actual_amount, e.id as entry_id
                    FROM PL_STRUCTURE s
                    LEFT JOIN DAILY_PL_ENTRIES e ON s.id = e.item_id 
                         AND e.entry_date = :date AND e.section_name = :section
                    WHERE s.data_source = 'MANUAL' AND s.is_active = 1
                    ORDER BY s.row_order ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':date' => $entry_date, ':section' => $section]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            break;

        case 'get_summary':
            // รับค่าจาก Request
            $date = $_GET['entry_date'] ?? date('Y-m-d');
            $sect = $_GET['section'] ?? $_SESSION['user']['line'] ?? 'Team 1';

            try {
                // เรียก SP เพื่อดึงยอดจากเครื่องจักรและค่าแรง
                $stmt = $pdo->prepare("EXEC sp_GetDailyPLSummary :date, :sect");
                $stmt->execute([':date' => $date, ':sect' => $sect]);
                
                // ชุดข้อมูลที่ 1: สรุปยอดใหญ่
                $summary = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // ชุดข้อมูลที่ 2: รายการ Manual (ถ้าต้องการใช้ร่วมกัน)
                $stmt->nextRowset();
                $details = $stmt->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode([
                    'success' => true,
                    'summary' => $summary,
                    'details' => $details
                ]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;

        case 'update_cell':
            // Reality Check: ป้องกัน SQL Injection และตรวจสอบค่าตัวเลข
            $item_id = filter_var($_POST['item_id'], FILTER_VALIDATE_INT);
            $amount  = filter_var($_POST['amount'], FILTER_VALIDATE_FLOAT);
            $date    = $_POST['entry_date'];
            $user    = $_SESSION['user']['username'];
            $sect    = $_POST['section'] ?? $_SESSION['user']['line'] ?? 'Team 1';

            if ($amount === false || $amount < 0) {
                echo json_encode(['success' => false, 'message' => 'จำนวนเงินไม่ถูกต้อง']);
                exit;
            }

            try {
                $pdo->beginTransaction(); // กฎข้อ 3A: Transaction Safety
                
                $sql = "MERGE INTO DAILY_PL_ENTRIES AS target
                        USING (SELECT :date as d, :sect as s, :item as i) AS source
                        ON (target.entry_date = source.d AND target.section_name = source.s AND target.item_id = source.i)
                        WHEN MATCHED THEN
                            UPDATE SET actual_amount = :amount, updated_at = GETDATE(), input_by = :user
                        WHEN NOT MATCHED THEN
                            INSERT (entry_date, section_name, item_id, actual_amount, input_by)
                            VALUES (:date, :sect, :item, :amount, :user);";
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':date'   => $date,
                    ':sect'   => $sect,
                    ':item'   => $item_id,
                    ':amount' => $amount,
                    ':user'   => $user
                ]);
                
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}