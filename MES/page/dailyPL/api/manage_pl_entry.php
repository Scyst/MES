<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

// =================================================================
// 1. SECURITY & AUTH CHECK
// =================================================================
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied: Insufficient Permissions']);
    exit;
}

$action = $_REQUEST['action'] ?? 'read';
$user_name = $_SESSION['user']['username'] ?? 'System';

try {
    switch ($action) {

        // =================================================================
        // GROUP 1: P&L ENTRY (Daily Actuals)
        // =================================================================
        case 'read':
            $date = $_GET['entry_date'] ?? date('Y-m-d');
            $section = $_GET['section'] ?? 'Team 1';

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_ENTRY . " :date, :section");
            $stmt->execute([':date' => $date, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Type Casting
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target'];
                $row['monthly_budget'] = (float)$row['monthly_budget'];
                $row['item_level']    = (int)$row['item_level'];
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save': 
            $date = $_POST['entry_date'] ?? null;
            $section = $_POST['section'] ?? null;
            $items_json = $_POST['items'] ?? '[]';
            $items = json_decode($items_json, true);

            if (!$date || !$section || !is_array($items)) {
                throw new Exception("Invalid Input Data");
            }

            $pdo->beginTransaction();
            try {
                $stmt = $pdo->prepare("EXEC dbo." . SP_UPSERT_PL_ENTRY . " @EntryDate=:date, @Section=:sect, @ItemID=:id, @Amount=:amt, @InputBy=:user");
                
                foreach ($items as $item) {
                    $amount = isset($item['amount']) ? floatval($item['amount']) : 0;
                    $stmt->execute([
                        ':date' => $date,
                        ':sect' => $section,
                        ':id'   => $item['item_id'],
                        ':amt'  => $amount,
                        ':user' => $user_name
                    ]);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Saved successfully']);
            } catch (Exception $ex) {
                $pdo->rollBack();
                throw $ex; 
            }
            break;

        // =================================================================
        // GROUP 2: TARGETS (Budgeting)
        // =================================================================
        case 'save_target':
            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_MONTHLY_TARGET . " :year, :month, :section, :items, :user");
            $stmt->execute([
                ':year'    => $_POST['year'],
                ':month'   => $_POST['month'],
                ':section' => $_POST['section'],
                ':items'   => $_POST['items'],
                ':user'    => $user_name
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result && isset($result['success']) && $result['success'] == 1) {
                echo json_encode(['success' => true, 'message' => 'Budget saved.', 'working_days' => $result['working_days_used']]);
            } else {
                throw new Exception($result['message'] ?? 'Save failed at Database level');
            }
            break;

        case 'get_working_days':
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_WORKING_DAYS . " :year, :month");
            $stmt->execute([':year' => $_GET['year'], ':month' => $_GET['month']]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'days' => (int)($result['working_days'] ?? 25)]);
            break;
            
        case 'get_target_data':
            $table = defined('MONTHLY_PL_TARGETS_TABLE') ? MONTHLY_PL_TARGETS_TABLE : 'MONTHLY_PL_TARGETS';
            $stmt = $pdo->prepare("SELECT item_id, target_amount FROM $table WHERE year_val = :y AND month_val = :m AND section_name = :s");
            $stmt->execute([':y' => $_GET['year'], ':m' => $_GET['month'], ':s' => $_GET['section']]);
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        // =================================================================
        // GROUP 3: REPORTS & DASHBOARD
        // =================================================================
        case 'report_range':
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_REPORT_RANGE . " :start, :end, :section");
            $stmt->execute([
                ':start'   => $_GET['start_date'],
                ':end'     => $_GET['end_date'],
                ':section' => $_GET['section']
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($data as &$row) {
                $row['actual_amount'] = (float)$row['actual_amount'];
                $row['daily_target']  = (float)$row['daily_target'];
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'dashboard_stats':
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_DASHBOARD_STATS . " :start, :end, :section");
            $stmt->execute([
                ':start'   => $_GET['start_date'],
                ':end'     => $_GET['end_date'],
                ':section' => $_GET['section']
            ]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
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
            $stmt = $pdo->prepare("
                SELECT calendar_date as start, description as title, day_type, work_rate_holiday, ot_rate_holiday 
                FROM MANPOWER_CALENDAR WITH (NOLOCK)
                WHERE calendar_date BETWEEN :start AND :end
            ");
            $stmt->execute([':start' => $_GET['start'], ':end' => $_GET['end']]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $events = array_map(function($r) {
                $isOff = ($r['day_type'] === 'OFFDAY');
                return [
                    'title' => $r['title'],
                    'start' => $r['start'],
                    'color' => $isOff ? '#ffc107' : '#e74a3b',
                    'textColor' => $isOff ? '#000' : '#fff',
                    'extendedProps' => [
                        'work_rate' => $r['work_rate_holiday'],
                        'ot_rate'   => $r['ot_rate_holiday'],
                        'day_type'  => $r['day_type']
                    ]
                ];
            }, $rows);
            echo json_encode($events);
            break;

        case 'calendar_save':
            $in = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_CALENDAR . " :date, :type, :desc, :wRate, :oRate, :user");
            $stmt->execute([
                ':date'  => $in['date'],
                ':type'  => $in['day_type'],
                ':desc'  => $in['description'],
                ':wRate' => $in['work_rate'],
                ':oRate' => $in['ot_rate'],
                ':user'  => $user_name
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
        // GROUP 5: UTILITIES
        // =================================================================
        case 'get_active_lines':
            // [FIXED] ดึงรายชื่อแผนกจากตารางที่มีข้อมูลพนักงานจริง (รวมทีม Support)
            // ใช้ UNION เพื่อรวมทั้งจาก Manpower และตาราง Cost ที่เคยบันทึกไว้
            $sql = "
                SELECT DISTINCT line 
                FROM (
                    -- 1. จากตารางพนักงาน (Master Data)
                    SELECT line FROM MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1
                    
                    UNION
                    
                    -- 2. จากตาราง Cost ที่เคยบันทึก (Transaction Data)
                    SELECT line FROM MES_MANUAL_DAILY_COSTS WITH (NOLOCK)
                ) AS AllLines
                WHERE line IS NOT NULL AND line <> '' AND line <> 'ALL'
                ORDER BY line
            ";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            // เพิ่มตัวเลือก 'ALL' (ทุกแผนก) ไว้บนสุดเสมอ
            array_unshift($lines, 'ALL'); 

            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_exchange_rate':
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'GET', :y, :m");
            $stmt->execute([':y' => $_GET['year'], ':m' => $_GET['month']]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'rate' => (float)($res['rate'] ?? 32.0)]);
            break;

        case 'save_exchange_rate':
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'SAVE', :y, :m, :r, :u");
            $stmt->execute([
                ':y' => $input['year'], 
                ':m' => $input['month'], 
                ':r' => $input['rate'], 
                ':u' => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'get_container_rate':
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'GET', :y, :m");
            $stmt->execute([':y' => $_GET['year'], ':m' => $_GET['month']]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'rate' => (float)($res['rate'] ?? 3000.00)]);
            break;

        case 'save_container_rate':
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'SAVE', :y, :m, :r, :u");
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
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => 'Server Error: ' . $e->getMessage()
    ]);
}
?>