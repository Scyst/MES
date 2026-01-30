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
        // CASE 5: GET TARGET DATA (ดึงเป้าหมายของเดือนที่ระบุ เพื่ออัปเดต Modal)
        // =================================================================
        case 'get_target_data':
            $year = $_GET['year'];
            $month = $_GET['month'];
            $section = $_GET['section'];

            // ดึงเฉพาะ Item ID และ Amount ของเดือนนั้น
            $sql = "SELECT item_id, target_amount 
                    FROM dbo.MONTHLY_PL_TARGETS 
                    WHERE year_val = :year AND month_val = :month AND section_name = :section";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':year' => $year, ':month' => $month, ':section' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // แปลงให้เป็น Key-Value Pair เพื่อให้ JS ใช้ง่ายๆ { item_id: amount }
            $result = [];
            foreach ($rows as $r) {
                $result[$r['item_id']] = (float)$r['target_amount'];
            }

            echo json_encode(['success' => true, 'data' => $result]);
            break;

        // =================================================================
        // CASE 6: CALENDAR - EVENTS
        // =================================================================

        case 'report_range':
            $start = $_GET['start_date'];
            $end = $_GET['end_date'];
            $section = $_GET['section'];

            // เรียก SP ตัวใหม่ที่เพิ่งสร้าง
            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLReport_Range :start, :end, :section");
            $stmt->execute([':start' => $start, ':end' => $end, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fix Types (แปลงตัวเลขให้ JS เอาไปคำนวณต่อได้ง่ายๆ)
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target']; // ในโหมดนี้คือ "Period Target"
                $row['item_level']    = (int)$row['item_level'];
                // ในโหมด Report เราไม่ส่ง monthly_budget ไป เพราะมันจะสับสน
            }

            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'calendar_read':
            $start = $_GET['start']; // FullCalendar ส่งมาให้เอง
            $end = $_GET['end'];

            $stmt = $pdo->prepare("SELECT calendar_date, description, day_type, work_rate_holiday, ot_rate_holiday 
                                   FROM MANPOWER_CALENDAR 
                                   WHERE calendar_date BETWEEN :start AND :end");
            $stmt->execute([':start' => $start, ':end' => $end]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $events = [];
            foreach ($rows as $row) {
                // กำหนดสีตามประเภทวันหยุด
                $color = ($row['day_type'] === 'OFFDAY') ? '#ffc107' : '#e74a3b'; // เหลือง หรือ แดง
                $textColor = ($row['day_type'] === 'OFFDAY') ? '#000' : '#fff';

                $events[] = [
                    'title' => $row['description'],
                    'start' => $row['calendar_date'],
                    'color' => $color,
                    'textColor' => $textColor,
                    'extendedProps' => [ // ส่งข้อมูลเสริมไปใช้ใน Modal
                        'work_rate' => $row['work_rate_holiday'],
                        'ot_rate' => $row['ot_rate_holiday'],
                        'day_type' => $row['day_type']
                    ]
                ];
            }
            echo json_encode($events);
            break;

        case 'calendar_save':
            $data = json_decode(file_get_contents('php://input'), true);
            $date = $data['date'];
            $desc = $data['description'];
            $type = $data['day_type'];
            $wRate = $data['work_rate'];
            $oRate = $data['ot_rate'];

            // ใช้ MERGE (Upsert)
            $stmt = $pdo->prepare("MERGE INTO MANPOWER_CALENDAR AS Target
                                   USING (VALUES (:date, :type, :desc, :wRate, :oRate)) AS Source (d, t, de, w, o)
                                   ON Target.calendar_date = Source.d
                                   WHEN MATCHED THEN
                                       UPDATE SET day_type = Source.t, description = Source.de, work_rate_holiday = Source.w, ot_rate_holiday = Source.o
                                   WHEN NOT MATCHED THEN
                                       INSERT (calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday)
                                       VALUES (Source.d, Source.t, Source.de, Source.w, Source.o);");
            $stmt->execute([':date'=>$date, ':type'=>$type, ':desc'=>$desc, ':wRate'=>$wRate, ':oRate'=>$oRate]);
            echo json_encode(['success' => true]);
            break;

        // =================================================================
        // CASE 7: CALENDAR - DELETE HOLIDAY
        // =================================================================
        case 'calendar_delete':
            $data = json_decode(file_get_contents('php://input'), true);
            $date = $data['date'];
            
            $stmt = $pdo->prepare("DELETE FROM MANPOWER_CALENDAR WHERE calendar_date = :date");
            $stmt->execute([':date' => $date]);
            echo json_encode(['success' => true]);
            break;

        // =================================================================
        // CASE 8: DASHBOARD STATS (Range Filter Version)
        // =================================================================
        case 'dashboard_stats':
            $startDate = $_GET['start_date'];
            $endDate = $_GET['end_date'];
            $section = $_GET['section'];
            
            $sql = "
                SELECT 
                    T.item_name,
                    T.item_type,
                    T.account_code,
                    T.row_order,
                    
                    COALESCE((
                        SELECT SUM(target_amount) 
                        FROM dbo.MONTHLY_PL_TARGETS 
                        WHERE item_id = T.id 
                          AND section_name = :tgt_sec
                          AND DATEFROMPARTS(year_val, month_val, 1) >= DATEFROMPARTS(YEAR(:tgt_start_1), MONTH(:tgt_start_2), 1)
                          AND DATEFROMPARTS(year_val, month_val, 1) <= DATEFROMPARTS(YEAR(:tgt_end_1), MONTH(:tgt_end_2), 1)
                    ), 0) AS target_monthly,
                    
                    COALESCE((
                        SELECT SUM(amount) 
                        FROM dbo.PL_DAILY_ENTRY 
                        WHERE pl_item_id = T.id 
                          AND entry_date BETWEEN :act_start AND :act_end 
                          AND section_name = :act_sec
                    ), 0) AS actual_mtd

                FROM dbo.PL_STRUCTURE T
                WHERE T.is_active = 1 
                  AND (T.parent_id IS NULL OR T.parent_id = 0)
                ORDER BY T.row_order
            ";

            $stmt = $pdo->prepare($sql);
            
            $stmt->execute([
                // Target Params
                ':tgt_sec'     => $section,
                ':tgt_start_1' => $startDate, // ใช้ใน YEAR()
                ':tgt_start_2' => $startDate, // ใช้ใน MONTH()
                ':tgt_end_1'   => $endDate,   // ใช้ใน YEAR()
                ':tgt_end_2'   => $endDate,   // ใช้ใน MONTH()
                
                // Actual Params
                ':act_start'   => $startDate,
                ':act_end'     => $endDate,
                ':act_sec'     => $section
            ]);
            
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // คำนวณ Progress %
            foreach ($data as &$row) {
                $tgt = (float)$row['target_monthly'];
                $act = (float)$row['actual_mtd'];
                $row['progress_percent'] = ($tgt > 0) ? ($act / $tgt * 100) : 0;
            }

            echo json_encode(['success' => true, 'data' => $data]);
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