<?php
// page/pl_daily/api/manage_pl_entry.php
header('Content-Type: application/json');

ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/../../../config/config.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

if (!hasPermission('view_pl') && !hasPermission('manage_pl')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied: You do not have permission to access P&L data.']);
    exit;
}

function validateDate($date, $format = 'Y-m-d') {
    $d = DateTime::createFromFormat($format, $date);
    return $d && $d->format($format) === $date;
}

$action = $_REQUEST['action'] ?? 'read';
$user_name = $_SESSION['user']['username'] ?? 'System';

try {
    switch ($action) {
        case 'read':
            $date = $_GET['entry_date'] ?? date('Y-m-d');
            if (!validateDate($date)) throw new Exception("Invalid Date Format");
            
            $section = trim($_GET['section'] ?? '');
            if (empty($section)) throw new Exception("Section is required");

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_ENTRY . " :date, :section");
            $stmt->execute([':date' => $date, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($data as &$row) {
                $row['actual_amount']  = (float)$row['actual_amount'];
                $row['daily_target']   = (float)$row['daily_target'];
                $row['monthly_budget'] = (float)$row['monthly_budget'];
                $row['item_level']     = (int)$row['item_level'];
                $row['item_id']        = (int)$row['item_id'];
                $row['parent_id']      = is_numeric($row['parent_id']) ? (int)$row['parent_id'] : null;
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save': 
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $date = $_POST['entry_date'] ?? null;
            $section = trim($_POST['section'] ?? '');
            $items_json = $_POST['items'] ?? '[]';

            if (!validateDate($date)) throw new Exception("Invalid Date");
            if (empty($section)) throw new Exception("Invalid Section");

            $stmt = $pdo->prepare("EXEC dbo.sp_UpsertDailyPLEntry_Batch :date, :sect, :items, :user");
            $stmt->execute([
                ':date'  => $date,
                ':sect'  => $section,
                ':items' => $items_json,
                ':user'  => $user_name
            ]);
            
            echo json_encode(['success' => true, 'message' => 'Saved successfully']);
            break;

        case 'save_target':
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $year = isset($_POST['year']) ? (int)$_POST['year'] : 0;
            $month = isset($_POST['month']) ? (int)$_POST['month'] : 0;
            $section = $_POST['section'] ?? '';
            $itemsJson = $_POST['items'] ?? '[]';

            if ($year <= 0 || $month <= 0) {
                throw new Exception("Invalid Year/Month (Received: $year-$month)");
            }
            if (empty($section)) throw new Exception("Invalid Section");

            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_MONTHLY_TARGET . " :year, :month, :section, :items, :user");
            $stmt->execute([
                ':year'    => $year,
                ':month'   => $month,
                ':section' => $section,
                ':items'   => $itemsJson,
                ':user'    => $user_name
            ]);
            
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result && isset($result['success']) && $result['success'] == 1) {
                echo json_encode([
                    'success' => true, 
                    'message' => 'Budget saved.', 
                    'working_days' => $result['working_days_used']
                ]);
            } else {
                throw new Exception($result['message'] ?? 'Save failed at Database level');
            }
            break;

        case 'get_working_days':
            $year = isset($_GET['year']) ? (int)$_GET['year'] : 0;
            $month = isset($_GET['month']) ? (int)$_GET['month'] : 0;
            
            if ($year <= 0 || $month <= 0 || $month > 12) {
                echo json_encode(['success' => true, 'days' => 25]); 
                exit;
            }
            
            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_WORKING_DAYS . " :year, :month");
            $stmt->execute([':year' => $year, ':month' => $month]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'days' => (int)($result['working_days'] ?? 25)]);
            break;
            
        case 'get_target_data':
            $year = filter_input(INPUT_GET, 'year', FILTER_VALIDATE_INT);
            $month = filter_input(INPUT_GET, 'month', FILTER_VALIDATE_INT);
            $section = $_GET['section'] ?? '';
            $table = defined('MONTHLY_PL_TARGETS_TABLE') ? MONTHLY_PL_TARGETS_TABLE : 'MONTHLY_PL_TARGETS';
            $stmt = $pdo->prepare("SELECT item_id, target_amount FROM $table WHERE year_val = :y AND month_val = :m AND section_name = :s");
            $stmt->execute([':y' => $year, ':m' => $month, ':s' => $section]);
            $rows = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
            
            foreach ($rows as $k => $v) { $rows[$k] = (float)$v; }
            echo json_encode(['success' => true, 'data' => $rows]);
            break;

        case 'report_range':
            $start = $_GET['start_date'];
            $end = $_GET['end_date'];
            if (!validateDate($start) || !validateDate($end)) throw new Exception("Invalid Dates");

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_PL_REPORT_RANGE . " :start, :end, :section");
            $stmt->execute([
                ':start'   => $start,
                ':end'     => $end,
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
            $start = $_GET['start_date'];
            $end = $_GET['end_date'];
            if (!validateDate($start) || !validateDate($end)) throw new Exception("Invalid Dates");

            $stmt = $pdo->prepare("EXEC dbo." . SP_GET_DASHBOARD_STATS . " :start, :end, :section");
            $stmt->execute([
                ':start'   => $start,
                ':end'     => $end,
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

        case 'calendar_read':
            $stmt = $pdo->prepare("
                SELECT calendar_date as start, description as title, day_type, 
                       work_rate_holiday, ot_rate_holiday, exchange_rate, container_rate 
                FROM MANPOWER_CALENDAR WITH (NOLOCK)
                WHERE calendar_date BETWEEN :start AND :end
            ");
            $stmt->execute([':start' => $_GET['start'], ':end' => $_GET['end']]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $events = array_map(function($r) {
                $isOff = ($r['day_type'] === 'OFFDAY' || $r['day_type'] === 'SUNDAY');
                return [
                    'title' => $r['title'],
                    'start' => $r['start'],
                    'color' => $isOff ? '#ffc107' : '#e74a3b',
                    'textColor' => $isOff ? '#000' : '#fff',
                    'extendedProps' => [
                        'work_rate' => (float)$r['work_rate_holiday'],
                        'ot_rate'   => (float)$r['ot_rate_holiday'],
                        'day_type'  => $r['day_type'],
                        'ex_rate'   => $r['exchange_rate'],
                        'ctn_rate'  => $r['container_rate']
                    ]
                ];
            }, $rows);
            echo json_encode($events);
            break;

        case 'calendar_save':
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $in = json_decode(file_get_contents('php://input'), true);
            if (!validateDate($in['date'] ?? '')) throw new Exception("Invalid Date");

            $stmt = $pdo->prepare("EXEC dbo." . SP_SAVE_CALENDAR . " :date, :type, :desc, :wRate, :oRate, :user");
            $stmt->execute([
                ':date'  => $in['date'],
                ':type'  => $in['day_type'],
                ':desc'  => $in['description'] ?? '',
                ':wRate' => floatval($in['work_rate']),
                ':oRate' => floatval($in['ot_rate']),
                ':user'  => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'calendar_delete':
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $in = json_decode(file_get_contents('php://input'), true);
            if (!validateDate($in['date'] ?? '')) throw new Exception("Invalid Date");

            $stmt = $pdo->prepare("DELETE FROM MANPOWER_CALENDAR WHERE calendar_date = :date");
            $stmt->execute([':date' => $in['date']]);
            echo json_encode(['success' => true]);
            break;

        // =================================================================
        // GROUP 5: UTILITIES
        // =================================================================
        case 'get_active_lines':
            // ใช้ SQL ธรรมดาแทน SP เพราะ Logic ง่ายและไม่ซับซ้อน
            $sql = "
                SELECT DISTINCT line 
                FROM (
                    SELECT line FROM MANPOWER_EMPLOYEES WITH (NOLOCK) WHERE is_active = 1
                    UNION
                    SELECT line FROM MES_MANUAL_DAILY_COSTS WITH (NOLOCK)
                ) AS AllLines
                WHERE line IS NOT NULL AND line <> '' AND line <> 'ALL'
                ORDER BY line
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
            
            array_unshift($lines, 'ALL'); // Default Option
            echo json_encode(['success' => true, 'data' => $lines]);
            break;

        case 'get_exchange_rate':
            // 1. รับค่าและแปลงเป็น Int ทันที
            $year = isset($_GET['year']) ? (int)$_GET['year'] : 0;
            $month = isset($_GET['month']) ? (int)$_GET['month'] : 0;
            
            // 2. Validation: ถ้าปีหรือเดือนเป็น 0 ห้ามเรียก SQL เด็ดขาด (เพราะจะทำ SQL Error)
            if ($year <= 0 || $month <= 0 || $month > 12) {
                // คืนค่า Default ไปเลย
                echo json_encode(['success' => true, 'rate' => 32.0]); 
                exit;
            }
            
            // 3. เรียก SP อย่างปลอดภัย
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'GET', :y, :m");
            $stmt->execute([':y' => $year, ':m' => $month]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'rate' => (float)($res['rate'] ?? 32.0)]);
            break;

        case 'save_exchange_rate':
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_EXCHANGE . " 'SAVE', :y, :m, :r, :u");
            $stmt->execute([
                ':y' => (int)$input['year'], 
                ':m' => (int)$input['month'], 
                ':r' => (float)$input['rate'], 
                ':u' => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'get_container_rate':
            $year = isset($_GET['year']) ? (int)$_GET['year'] : 0;
            $month = isset($_GET['month']) ? (int)$_GET['month'] : 0;

            if ($year <= 0 || $month <= 0 || $month > 12) {
                echo json_encode(['success' => true, 'rate' => 3000.00]); 
                exit;
            }

            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'GET', :y, :m");
            $stmt->execute([':y' => $year, ':m' => $month]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'rate' => (float)($res['rate'] ?? 3000.00)]);
            break;

        case 'save_container_rate':
            if (!hasPermission('manage_pl')) throw new Exception("Permission Denied: Manage P&L right is required.");
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("EXEC dbo." . SP_MANAGE_CONTAINER . " 'SAVE', :y, :m, :r, :u");
            $stmt->execute([
                ':y' => (int)$input['year'], 
                ':m' => (int)$input['month'], 
                ':r' => (float)$input['rate'], 
                ':u' => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'statement_yearly':
            $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
            $section = $_GET['section'] ?? 'ALL';

            if ($year < 2000 || $year > 2100) throw new Exception("Invalid Year");

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLStatement_Yearly :year, :section");
            $stmt->execute([':year' => $year, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($data as &$row) {
                $row['item_level'] = (int)$row['item_level'];
                for ($m = 1; $m <= 12; $m++) {
                    $row["m{$m}_act"] = (float)$row["m{$m}_act"];
                    $row["m{$m}_tgt"] = (float)$row["m{$m}_tgt"];
                }
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'statement_daily':
            $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
            $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
            $section = $_GET['section'] ?? 'ALL';

            if ($year < 2000 || $year > 2100 || $month < 1 || $month > 12) throw new Exception("Invalid Date");

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPLStatement_Daily :year, :month, :section");
            $stmt->execute([':year' => $year, ':month' => $month, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($data as &$row) {
                $row['item_level'] = (int)$row['item_level'];
                for ($d = 1; $d <= 31; $d++) {
                    $row["d{$d}_act"] = (float)$row["d{$d}_act"];
                    $row["d{$d}_tgt"] = (float)$row["d{$d}_tgt"];
                }
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'executive_summary':
            $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
            $section = $_GET['section'] ?? 'ALL';

            if ($year < 2000 || $year > 2100) throw new Exception("Invalid Year");

            $stmt = $pdo->prepare("EXEC dbo.sp_GetPL_ExecutiveSummary :year, :section");
            $stmt->execute([':year' => $year, ':section' => $section]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($data as &$row) {
                for ($m = 1; $m <= 12; $m++) {
                    $row["m{$m}_act"] = (float)$row["m{$m}_act"];
                    $row["m{$m}_tgt"] = (float)$row["m{$m}_tgt"];
                }
            }
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'save_batch':
            $checkLock = $pdo->prepare("SELECT is_locked FROM dbo.DAILY_PL_STATUS WHERE entry_date = :d AND section_name = :s");
            $checkLock->execute([':d' => $_POST['entry_date'], ':s' => $_POST['section']]);
            if ($checkLock->fetchColumn() == 1) {
                throw new Exception("Period is locked. Cannot save changes.");
            }

            $date = $_POST['entry_date'] ?? date('Y-m-d');
            $section = $_POST['section'] ?? '';
            $itemsJson = $_POST['items'] ?? '[]';

            $stmt = $pdo->prepare("EXEC " . SP_UPSERT_PL_ENTRY . "_Batch :date, :sect, :items, :user");
            $stmt->execute([
                ':date' => $date,
                ':sect' => $section,
                ':items' => $itemsJson,
                ':user' => $user_name
            ]);
            echo json_encode(['success' => true]);
            break;

        case 'toggle_lock':
            if (!hasPermission('manage_pl')) throw new Exception("Admin rights required to lock/unlock period.");
            
            $date = $_POST['entry_date'] ?? '';
            $section = $_POST['section'] ?? '';
            
            if (empty($date) || empty($section)) throw new Exception("Invalid parameters");

            $stmt = $pdo->prepare("EXEC dbo.sp_TogglePLLock :date, :sect, :user");
            $stmt->execute([
                ':date' => $date,
                ':sect' => $section,
                ':user' => $user_name
            ]);
            $res = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'is_locked' => $res['is_locked']]);
            break;

        default:
            throw new Exception("Unknown Action: " . $action);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    
    // Return Error JSON
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage() // หรือจะซ่อน Message ถ้าระบบขึ้น Prod แล้ว
    ]);
}
?>