<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// 1. Security & Auth Check
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';
$user_id = $_SESSION['user']['id'] ?? 0; // หรือ username ตามระบบคุณ
$user_name = $_SESSION['user']['username'] ?? 'System';

try {
    switch ($action) {

        // =================================================================
        // GROUP 1: P&L ENTRY (Daily Actuals)
        // =================================================================
        case 'read':
            $date = $_GET['entry_date'] ?? date('Y-m-d');
            $section = $_GET['section'] ?? 'Team 1';

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLEntryData_WithTargets :date, :section");
            $stmt->execute([':date' => $date, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Type Casting เพื่อความปลอดภัยของ JS
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target'];
                $row['monthly_budget'] = (float)$row['monthly_budget'];
                $row['item_level']    = (int)$row['item_level'];
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save': // Refactored: ใช้ SP + Transaction
            $date = $_POST['entry_date'];
            $section = $_POST['section'];
            $items = json_decode($_POST['items'], true);

            if (!$date || !$section || !is_array($items)) throw new Exception("Invalid input");

            $pdo->beginTransaction();
            try {
                // Prepare ครั้งเดียว ใช้ซ้ำใน Loop เพื่อ Performance
                $stmt = $pdo->prepare("EXEC dbo.sp_UpsertDailyPLEntry @EntryDate=:date, @Section=:sect, @ItemID=:id, @Amount=:amt, @InputBy=:user");
                
                foreach ($items as $item) {
                    $amount = isset($item['amount']) ? floatval($item['amount']) : 0;
                    // Note: Remark ถ้าจะเก็บต้องเพิ่ม parameter ใน SP, ในที่นี้ผมยึดตาม SP เดิมที่มีแค่ InputBy
                    
                    $stmt->execute([
                        ':date' => $date,
                        ':sect' => $section,
                        ':id'   => $item['item_id'],
                        ':amt'  => $amount,
                        ':user' => $user_name
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
        // GROUP 2: TARGETS (Budgeting)
        // =================================================================
        case 'save_target':
            $stmt = $pdo->prepare("EXEC dbo.sp_SaveMonthlyTarget :year, :month, :section, :items");
            $stmt->execute([
                ':year' => $_POST['year'],
                ':month' => $_POST['month'],
                ':section' => $_POST['section'],
                ':items' => $_POST['items'] // JSON String
            ]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result && $result['success'] == 1) {
                echo json_encode(['success' => true, 'message' => 'Budget saved.', 'working_days' => $result['working_days_used']]);
            } else {
                throw new Exception($result['message'] ?? 'Save failed');
            }
            break;

        case 'get_working_days':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetWorkingDays :year, :month");
            $stmt->execute([':year' => $_GET['year'], ':month' => $_GET['month']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'days' => (int)$result['working_days']]);
            break;

        case 'get_target_data': // ควรทำเป็น SP เล็กๆ หรือ Query สั้นๆ
            $stmt = $pdo->prepare("SELECT item_id, target_amount FROM dbo.MONTHLY_PL_TARGETS WHERE year_val = :y AND month_val = :m AND section_name = :s");
            $stmt->execute([':y' => $_GET['year'], ':m' => $_GET['month'], ':s' => $_GET['section']]);
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR); // Fetch แบบ [id => amount] โดยตรง
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        // =================================================================
        // GROUP 3: REPORTS & DASHBOARD
        // =================================================================
        case 'report_range':
            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLReport_Range :start, :end, :section");
            $stmt->execute([
                ':start' => $_GET['start_date'],
                ':end'   => $_GET['end_date'],
                ':section' => $_GET['section']
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target'];
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'dashboard_stats': // Refactored: ย้าย Logic ซับซ้อนไปไว้ใน SP
            $stmt = $pdo->prepare("EXEC dbo.sp_GetDashboardStats :start, :end, :section");
            $stmt->execute([
                ':start' => $_GET['start_date'],
                ':end'   => $_GET['end_date'],
                ':section' => $_GET['section']
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Logic การคำนวณ % สามารถทำใน PHP หรือ SP ก็ได้ (ทำใน PHP ยืดหยุ่นกว่าสำหรับการแสดงผล)
            foreach ($data as &$row) {
                $tgt = (float)$row['target_monthly'];
                $act = (float)$row['actual_mtd'];
                $row['progress_percent'] = ($tgt > 0) ? ($act / $tgt * 100) : 0;
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // =================================================================
        // GROUP 4: CALENDAR
        // =================================================================
        case 'calendar_read':
            // Logic นี้ง่าย พออนุโลมให้ใช้ SQL ใน PHP ได้ แต่ถ้าให้ดีควรเป็น sp_GetCalendarEvents
            $stmt = $pdo->prepare("SELECT calendar_date as start, description as title, day_type, work_rate_holiday, ot_rate_holiday FROM MANPOWER_CALENDAR WHERE calendar_date BETWEEN :start AND :end");
            $stmt->execute([':start' => $_GET['start'], ':end' => $_GET['end']]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Format ให้ตรงกับ FullCalendar
            $events = array_map(function($r) {
                $isOff = ($r['day_type'] === 'OFFDAY');
                return [
                    'title' => $r['title'],
                    'start' => $r['start'],
                    'color' => $isOff ? '#ffc107' : '#e74a3b',
                    'textColor' => $isOff ? '#000' : '#fff',
                    'extendedProps' => [
                        'work_rate' => $r['work_rate_holiday'],
                        'ot_rate' => $r['ot_rate_holiday'],
                        'day_type' => $r['day_type']
                    ]
                ];
            }, $rows);
            echo json_encode($events);
            break;

        case 'calendar_save':
            $in = json_decode(file_get_contents('php://input'), true);
            // เรียก SP แทนการเขียน MERGE ยาวๆ
            $stmt = $pdo->prepare("EXEC dbo.sp_SaveCalendarEvent :date, :type, :desc, :wRate, :oRate");
            $stmt->execute([
                ':date' => $in['date'],
                ':type' => $in['day_type'],
                ':desc' => $in['description'],
                ':wRate'=> $in['work_rate'],
                ':oRate'=> $in['ot_rate']
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'calendar_delete':
            $in = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("DELETE FROM MANPOWER_CALENDAR WHERE calendar_date = :date");
            $stmt->execute([':date' => $in['date']]);
            echo json_encode(['success' => true]);
            break;

        // =================================================================
        // CASE 9: GET ACTIVE LINES (ดึงรายชื่อไลน์ผลิตสำหรับ Dropdown)
        // =================================================================
        case 'get_active_lines':
            // ใช้ Constant LOCATIONS_TABLE จาก config.php เพื่อรองรับ Test/Prod Mode
            $sql = "SELECT DISTINCT production_line 
                    FROM " . LOCATIONS_TABLE . " 
                    WHERE production_line IS NOT NULL 
                      AND production_line <> '' 
                    ORDER BY production_line";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);

            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        // =================================================================
        // CASE 10: EXCHANGE RATE (Calendar Based)
        // =================================================================
        case 'get_exchange_rate':
            // ดึงเรทของเดือนนั้นมาโชว์
            $stmt = $pdo->prepare("EXEC dbo.sp_ManageExchangeRate 'GET', :y, :m");
            $stmt->execute([':y' => $_GET['year'], ':m' => $_GET['month']]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'rate' => (float)$res['rate']]);
            break;

        case 'save_exchange_rate':
            // บันทึกเรท (SP จะไป update ทุกวันในเดือนนั้นให้เอง)
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo.sp_ManageExchangeRate 'SAVE', :y, :m, :r, :u");
            $stmt->execute([
                ':y' => $input['year'], 
                ':m' => $input['month'], 
                ':r' => $input['rate'], 
                ':u' => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Unknown Action: " . $action);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}