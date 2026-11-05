<?php
// Toolbox/public/api/ai/morningBriefAi.php
// AI Executive Shift Briefing & Dynamic MES Query Generator via Gemini API

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';
require_once __DIR__ . '/../../db.php';

// Only allow authenticated users
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'กรุณาเข้าสู่ระบบก่อนใช้งาน AI Executive Briefing'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Financial data (revenue, labor cost) is restricted to the same roles as the Morning Brief itself
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ไม่มีสิทธิ์ใช้งาน AI Executive Briefing (เฉพาะผู้บริหารและผู้ดูแลระบบ)'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$csrfHeader = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $csrfHeader)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'CSRF Token Validation Failed.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Read input payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    $input = $_POST;
}

$briefData = $input['brief_data'] ?? null;
$customPrompt = trim((string)($input['custom_prompt'] ?? ''));
$summaryStyle = trim((string)($input['summary_style'] ?? 'concise')); // 'concise' | 'formal'
$team = htmlspecialchars((string)($input['team'] ?? 'ALL'));

$apiKey = getenv('GEMINI_API_KEY');
if (empty($apiKey)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบหลังบ้าน'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// HELPER 1: Smart Thai & Universal Date/Month Parser
// -------------------------------------------------------------
function parseDateOrMonthFromText(string $text, int $defaultYear = 2026): ?array {
    if (empty($text)) return null;

    $thaiMonths = [
        'มกราคม' => 1, 'มกรา' => 1, 'ม.ค.' => 1,
        'กุมภาพันธ์' => 2, 'กุมภา' => 2, 'ก.พ.' => 2,
        'มีนาคม' => 3, 'มีนา' => 3, 'มี.ค.' => 3,
        'เมษายน' => 4, 'เมษา' => 4, 'เม.ย.' => 4,
        'พฤษภาคม' => 5, 'พฤษภา' => 5, 'พ.ค.' => 5,
        'มิถุนายน' => 6, 'มิถุนา' => 6, 'มิ.ย.' => 6,
        'กรกฎาคม' => 7, 'กรกฎา' => 7, 'ก.ค.' => 7,
        'สิงหาคม' => 8, 'สิงหา' => 8, 'ส.ค.' => 8,
        'กันยายน' => 9, 'กันยา' => 9, 'ก.ย.' => 9,
        'ตุลาคม' => 10, 'ตุลา' => 10, 'ต.ค.' => 10,
        'พฤศจิกายน' => 11, 'พฤศจิกา' => 11, 'พ.ย.' => 11,
        'ธันวาคม' => 12, 'ธันวา' => 12, 'ธ.ค.' => 12,
    ];

    $thaiNumWords = [
        'หนึ่ง' => 1, 'สอง' => 2, 'สาม' => 3, 'สี่' => 4, 'ห้า' => 5,
        'หก' => 6, 'เจ็ด' => 7, 'แปด' => 8, 'เก้า' => 9, 'สิบ' => 10,
        'สิบเอ็ด' => 11, 'สิบสอง' => 12, 'สิบสาม' => 13, 'สิบสี่' => 14, 'สิบห้า' => 15,
        'สิบหก' => 16, 'สิบเจ็ด' => 17, 'สิบแปด' => 18, 'สิบเก้า' => 19, 'ยี่สิบ' => 20,
        'ยี่สิบเอ็ด' => 21, 'ยี่สิบสอง' => 22, 'ยี่สิบสาม' => 23, 'ยี่สิบสี่' => 24, 'ยี่สิบห้า' => 25,
        'ยี่สิบหก' => 26, 'ยี่สิบเจ็ด' => 27, 'ยี่สิบแปด' => 28, 'ยี่สิบเก้า' => 29, 'สามสิบ' => 30,
        'สามสิบเอ็ด' => 31
    ];

    $foundYear = $defaultYear;
    if (preg_match('/(25\d{2})/', $text, $matches)) {
        $foundYear = (int)$matches[1] - 543;
    } elseif (preg_match('/(20\d{2})/', $text, $matches)) {
        $foundYear = (int)$matches[1];
    }

    // 1. Month Mode check e.g. "เดือน 11", "เดือนนี้", "เดือนที่แล้ว", "เดือนพฤศจิกายน"
    if (preg_match('/(?:เดือน\s*ที่\s*แล้ว)/u', $text)) {
        $lastMonth = (int)date('m', strtotime('-1 month'));
        $lastYear = (int)date('Y', strtotime('-1 month'));
        return [
            'type' => 'month',
            'month' => $lastMonth,
            'year' => $lastYear,
            'label' => "เดือน $lastMonth/$lastYear",
            'start_date' => date('Y-m-01', strtotime('-1 month')),
            'end_date' => date('Y-m-t', strtotime('-1 month'))
        ];
    }
    if (preg_match('/(?:เดือน\s*นี้|mtd)/ui', $text)) {
        $currMonth = (int)date('m');
        return [
            'type' => 'month',
            'month' => $currMonth,
            'year' => $foundYear,
            'label' => "เดือน $currMonth/$foundYear (MTD)",
            'start_date' => sprintf('%04d-%02d-01', $foundYear, $currMonth),
            'end_date' => date('Y-m-d')
        ];
    }
    if (preg_match('/(?:เดือน|month)\s*[:=]?\s*(\d{1,2})/ui', $text, $matches)) {
        $mNum = (int)$matches[1];
        if ($mNum >= 1 && $mNum <= 12) {
            if (!preg_match('/(?:วันที่|ที่)\s*\d{1,2}/u', $text)) {
                $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $foundYear, $mNum)));
                return [
                    'type' => 'month',
                    'month' => $mNum,
                    'year' => $foundYear,
                    'label' => "เดือน $mNum/$foundYear",
                    'start_date' => sprintf('%04d-%02d-01', $foundYear, $mNum),
                    'end_date' => sprintf('%04d-%02d-%s', $foundYear, $mNum, $lastDay)
                ];
            }
        }
    }
    foreach ($thaiMonths as $mName => $mNum) {
        if (mb_stripos($text, $mName) !== false) {
            if (mb_stripos($text, 'เดือน') !== false && !preg_match('/(?:วันที่|ที่|\d{1,2})\s*' . preg_quote($mName, '/') . '/u', $text) && !preg_match('/' . preg_quote($mName, '/') . '\s*(?:วันที่|ที่|\d{1,2})/u', $text)) {
                $lastDay = date('t', strtotime(sprintf('%04d-%02d-01', $foundYear, $mNum)));
                return [
                    'type' => 'month',
                    'month' => $mNum,
                    'year' => $foundYear,
                    'label' => "เดือน $mNum/$foundYear",
                    'start_date' => sprintf('%04d-%02d-01', $foundYear, $mNum),
                    'end_date' => sprintf('%04d-%02d-%s', $foundYear, $mNum, $lastDay)
                ];
            }
        }
    }

    // 2. Day Mode check
    if (mb_stripos($text, 'เมื่อวาน') !== false) {
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        return ['type' => 'day', 'date' => $yesterday, 'label' => date('d/m/Y', strtotime($yesterday))];
    }
    if (mb_stripos($text, 'วันนี้') !== false) {
        $today = date('Y-m-d');
        return ['type' => 'day', 'date' => $today, 'label' => date('d/m/Y', strtotime($today))];
    }

    foreach ($thaiMonths as $mName => $mNum) {
        if (mb_stripos($text, $mName) !== false) {
            $foundDay = null;
            if (preg_match('/(\d{1,2})\s*(?:' . preg_quote($mName, '/') . ')/u', $text, $m)) {
                $foundDay = (int)$m[1];
            } elseif (preg_match('/(?:' . preg_quote($mName, '/') . ')\s*(?:วันที่|ที่)?\s*(\d{1,2})/u', $text, $m)) {
                $foundDay = (int)$m[1];
            } elseif (preg_match('/(?:วันที่|ที่)\s*(\d{1,2})/u', $text, $m)) {
                $foundDay = (int)$m[1];
            } else {
                foreach ($thaiNumWords as $w => $num) {
                    if (mb_stripos($text, $w) !== false) {
                        $foundDay = $num;
                        break;
                    }
                }
            }
            if ($foundDay && $foundDay >= 1 && $foundDay <= 31) {
                $dStr = sprintf('%04d-%02d-%02d', $foundYear, $mNum, $foundDay);
                return ['type' => 'day', 'date' => $dStr, 'label' => date('d/m/Y', strtotime($dStr))];
            }
        }
    }

    if (preg_match('/(\d{4})-(\d{1,2})-(\d{1,2})/', $text, $m)) {
        $dStr = sprintf('%04d-%02d-%02d', (int)$m[1], (int)$m[2], (int)$m[3]);
        return ['type' => 'day', 'date' => $dStr, 'label' => date('d/m/Y', strtotime($dStr))];
    }
    if (preg_match('/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/', $text, $m)) {
        $dStr = sprintf('%04d-%02d-%02d', (int)$m[3], (int)$m[2], (int)$m[1]);
        return ['type' => 'day', 'date' => $dStr, 'label' => date('d/m/Y', strtotime($dStr))];
    }

    return null;
}

// -------------------------------------------------------------
// HELPER 2: Query Single Day with Shift Breakdown
// -------------------------------------------------------------
function queryMorningBriefFromDb(string $targetDate, ?string $teamGroup = null): ?array {
    global $pdo;

    try {
        if (!isset($pdo) || !($pdo instanceof PDO)) return null;

        $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;

        // 1. Manpower Detailed Shift Breakdown (Shift 1 = Day, Shift 2 = Night)
        $mpQuery = "SELECT 
            ISNULL(L.shift_id, 1) as shift_id,
            SUM(CASE WHEN L.status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN L.status IN ('SICK', 'BUSINESS', 'VACATION', 'LEAVE', 'ABSENT') THEN 1 ELSE 0 END) as leave_count,
            SUM(CASE WHEN L.status = 'SICK' THEN 1 ELSE 0 END) as sick_count,
            SUM(CASE WHEN L.status = 'BUSINESS' THEN 1 ELSE 0 END) as business_count,
            SUM(CASE WHEN L.status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
            COUNT(L.emp_id) as total_shift
            FROM MANPOWER_DAILY_LOGS L WITH (NOLOCK) 
            LEFT JOIN MANPOWER_EMPLOYEES E WITH (NOLOCK) ON L.emp_id = E.emp_id
            LEFT JOIN MANPOWER_TEAM_SETTINGS TS WITH (NOLOCK) ON E.department_api = TS.department_api
            WHERE L.log_date = ? AND L.status != 'GHOST'";
        $mpParams = [$targetDate];
        if (!empty($teamParam)) {
            $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
            $mpParams[] = $teamParam;
        } else {
            $mpQuery .= " AND ISNULL(TS.hc_group, '') != 'EXCLUDE'";
        }
        $mpQuery .= " GROUP BY ISNULL(L.shift_id, 1)";
        $stmtMp = $pdo->prepare($mpQuery);
        $stmtMp->execute($mpParams);
        $shiftRows = $stmtMp->fetchAll() ?: [];

        $shift1 = ['total' => 0, 'present' => 0, 'leave' => 0, 'sick' => 0, 'biz' => 0, 'absent' => 0];
        $shift2 = ['total' => 0, 'present' => 0, 'leave' => 0, 'sick' => 0, 'biz' => 0, 'absent' => 0];

        foreach ($shiftRows as $s) {
            $sid = (int)($s['shift_id'] ?? 1);
            if ($sid === 2) {
                $shift2['total'] = (int)($s['total_shift'] ?? 0);
                $shift2['present'] = (int)($s['present'] ?? 0);
                $shift2['leave'] = (int)($s['leave_count'] ?? 0);
                $shift2['sick'] = (int)($s['sick_count'] ?? 0);
                $shift2['biz'] = (int)($s['business_count'] ?? 0);
                $shift2['absent'] = (int)($s['absent_count'] ?? 0);
            } else {
                $shift1['total'] = (int)($s['total_shift'] ?? 0);
                $shift1['present'] = (int)($s['present'] ?? 0);
                $shift1['leave'] = (int)($s['leave_count'] ?? 0);
                $shift1['sick'] = (int)($s['sick_count'] ?? 0);
                $shift1['biz'] = (int)($s['business_count'] ?? 0);
                $shift1['absent'] = (int)($s['absent_count'] ?? 0);
            }
        }

        $mpTotal = $shift1['total'] + $shift2['total'];
        $mpPresent = $shift1['present'] + $shift2['present'];
        $mpLeave = $shift1['leave'] + $shift2['leave'];

        // 2. Labor Cost
        $costQuery = "SELECT 
            ISNULL(SUM(Normal_Cost + OT_Cost), 0) as total_dlot,
            ISNULL(SUM(OT_Cost), 0) as total_ot,
            ISNULL(SUM(CASE WHEN rate_type = 'DAILY' THEN Normal_Cost ELSE 0 END), 0) as daily_dl
            FROM dbo.fn_GetManpowerSummary_V2(?)";
        $costParams = [$targetDate];
        if (!empty($teamParam)) {
            $costQuery .= " WHERE hc_group = ?";
            $costParams[] = $teamParam;
        } else {
            $costQuery .= " WHERE ISNULL(hc_group, '') != 'EXCLUDE'";
        }
        $stmtCost = $pdo->prepare($costQuery);
        $stmtCost->execute($costParams);
        $cost = $stmtCost->fetch() ?: ['total_dlot' => 0, 'total_ot' => 0, 'daily_dl' => 0];

        // 3. Utilities
        $stmtUtil = $pdo->prepare("SELECT 
            ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
            ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
            FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
            JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
            WHERE s.log_date = ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
        $stmtUtil->execute([$targetDate]);
        $util = $stmtUtil->fetch() ?: ['elec_cost' => 0, 'gas_cost' => 0];

        // 4. Production & Revenue
        $prodQuery = "SELECT 
            ISNULL(r.model, i.part_no) as model_name,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as hold,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN 
                t.quantity * CASE 
                    WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                    ELSE ISNULL(t.std_price_snapshot, i.StandardPrice) 
                END
            ELSE 0 END) as revenue
            FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
            JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
            LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON i.item_id = r.item_id
            LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
            LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = ?
            AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
            AND i.material_type = 'FG'";
        $prodParams = [$targetDate];
        if (!empty($teamParam)) {
            $prodQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
            $prodParams[] = $teamParam;
            $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
        } else {
            $prodQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
        }
        $prodQuery .= " GROUP BY ISNULL(r.model, i.part_no)
                        HAVING SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) > 0";
        $stmtProd = $pdo->prepare($prodQuery);
        $stmtProd->execute($prodParams);
        $models = $stmtProd->fetchAll() ?: [];

        $totalRevenue = 0.0;
        foreach ($models as $m) {
            $totalRevenue += (float)($m['revenue'] ?? 0);
        }

        // 5. Team Mood
        $stmtMood = $pdo->prepare("SELECT ISNULL(AVG(CAST(mood_score AS FLOAT)), 0) as mood_avg FROM OPERATOR_DAILY_LOGS WITH (NOLOCK) WHERE log_date = ? AND mood_score > 0");
        $stmtMood->execute([$targetDate]);
        $mood = $stmtMood->fetch();
        $moodAvg = (float)($mood['mood_avg'] ?? 0.0);

        return [
            'raw_date' => $targetDate,
            'date_text' => date('d/m/Y', strtotime($targetDate)),
            'mp_total' => $mpTotal,
            'mp_present' => $mpPresent,
            'mp_leave' => $mpLeave,
            'shift1' => $shift1,
            'shift2' => $shift2,
            'dlot_total' => number_format((float)($cost['total_dlot'] ?? 0), 2),
            'dl_daily' => number_format((float)($cost['daily_dl'] ?? 0), 2),
            'ot_total' => number_format((float)($cost['total_ot'] ?? 0), 2),
            'elec_cost' => number_format((float)($util['elec_cost'] ?? 0), 2),
            'gas_cost' => number_format((float)($util['gas_cost'] ?? 0), 2),
            'revenue' => number_format($totalRevenue, 2),
            'revenue_raw' => $totalRevenue,
            'dlot_raw' => (float)($cost['total_dlot'] ?? 0),
            'util_raw' => (float)($util['elec_cost'] ?? 0) + (float)($util['gas_cost'] ?? 0),
            'mood_avg' => $moodAvg,
            'models' => $models
        ];
    } catch (Throwable $e) {
        error_log("Dynamic Day Query Error: " . $e->getMessage());
        return null;
    }
}

// -------------------------------------------------------------
// HELPER 3: Query Full Month Aggregate (MTD)
// -------------------------------------------------------------
function queryMonthlyBriefFromDb(string $startDate, string $endDate, ?string $teamGroup = null): ?array {
    global $pdo;

    try {
        if (!isset($pdo) || !($pdo instanceof PDO)) return null;

        $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;

        // 1. Production MTD
        $prodQuery = "SELECT 
            COUNT(DISTINCT CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)) as prod_days,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END), 0) as total_fg,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END), 0) as total_hold,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END), 0) as total_scrap,
            ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN 
                t.quantity * CASE 
                    WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                    ELSE ISNULL(t.std_price_snapshot, i.StandardPrice) 
                END
            ELSE 0 END), 0) as total_revenue
            FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
            JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
            LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
            LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?
              AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?
              AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
              AND i.material_type = 'FG'";
        $prodParams = [$startDate, $endDate];
        if (!empty($teamParam)) {
            $prodQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
            $prodParams[] = $teamParam;
            $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
        } else {
            $prodQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
        }
        $stmtProd = $pdo->prepare($prodQuery);
        $stmtProd->execute($prodParams);
        $prod = $stmtProd->fetch() ?: [];

        // 2. Utilities MTD
        $stmtUtil = $pdo->prepare("SELECT 
            ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
            ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
            FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
            JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
            WHERE s.log_date >= ? AND s.log_date <= ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
        $stmtUtil->execute([$startDate, $endDate]);
        $util = $stmtUtil->fetch() ?: ['elec_cost' => 0, 'gas_cost' => 0];

        // 3. Top models in month
        $modelQuery = "SELECT TOP 5
            ISNULL(r.model, i.part_no) as model_name,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
            SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap
            FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
            JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
            LEFT JOIN MANUFACTURING_ROUTES r WITH (NOLOCK) ON i.item_id = r.item_id
            LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
            WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?
              AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?
              AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_SCRAP')
              AND i.material_type = 'FG'
            GROUP BY ISNULL(r.model, i.part_no)
            ORDER BY SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) DESC";
        $stmtModels = $pdo->prepare($modelQuery);
        $stmtModels->execute([$startDate, $endDate]);
        $topModels = $stmtModels->fetchAll() ?: [];

        return [
            'is_month' => true,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'prod_days' => (int)($prod['prod_days'] ?? 0),
            'total_fg' => (int)($prod['total_fg'] ?? 0),
            'total_hold' => (int)($prod['total_hold'] ?? 0),
            'total_scrap' => (int)($prod['total_scrap'] ?? 0),
            'total_revenue' => (float)($prod['total_revenue'] ?? 0),
            'elec_cost' => (float)($util['elec_cost'] ?? 0),
            'gas_cost' => (float)($util['gas_cost'] ?? 0),
            'top_models' => $topModels
        ];
    } catch (Throwable $e) {
        error_log("Monthly Query Error: " . $e->getMessage());
        return null;
    }
}

// -------------------------------------------------------------
// RESOLVE QUERY INTENT: Month vs Day
// -------------------------------------------------------------
$detected = parseDateOrMonthFromText($customPrompt);
$autoSwitchedDate = null;
$monthlyData = null;

if ($detected !== null) {
    if ($detected['type'] === 'month') {
        $monthlyData = queryMonthlyBriefFromDb($detected['start_date'], $detected['end_date'], $team);
        if ($monthlyData !== null) {
            $monthlyData['month_label'] = $detected['label'];
            $autoSwitchedDate = $detected['label'];
        }
    } elseif ($detected['type'] === 'day') {
        $fetched = queryMorningBriefFromDb($detected['date'], $team);
        if ($fetched !== null) {
            $briefData = $fetched;
            $autoSwitchedDate = $detected['date'];
        }
    }
}

// Ensure shift breakdown is populated from DB if not already present
if ($monthlyData === null && !empty($briefData['raw_date']) && !isset($briefData['shift1'])) {
    $dbData = queryMorningBriefFromDb((string)$briefData['raw_date'], $team);
    if ($dbData !== null) {
        $briefData = array_merge($briefData, $dbData);
    }
}

// Fallback to day data if month not triggered
if ($monthlyData === null && (!$briefData || !is_array($briefData))) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => 'ไม่พบข้อมูลสำหรับให้ AI วิเคราะห์'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// -------------------------------------------------------------
// BUILD PROMPT: Month Mode vs Day Mode
// -------------------------------------------------------------
$isLineMode = (mb_stripos($customPrompt, 'line') !== false) || (mb_stripos($customPrompt, 'ไลน์') !== false) || (mb_stripos($customPrompt, '3 บรรทัด') !== false);

if ($monthlyData !== null) {
    // === MONTHLY PROMPT ===
    $mLabel = htmlspecialchars($monthlyData['month_label']);
    $mDays = (int)$monthlyData['prod_days'];
    $mFg = number_format($monthlyData['total_fg']);
    $mHold = number_format($monthlyData['total_hold']);
    $mScrap = number_format($monthlyData['total_scrap']);
    $mRev = number_format($monthlyData['total_revenue'], 2);
    $mElec = number_format($monthlyData['elec_cost'], 2);
    $mGas = number_format($monthlyData['gas_cost'], 2);
    $mUtil = number_format($monthlyData['elec_cost'] + $monthlyData['gas_cost'], 2);

    $topModelsText = "";
    $topModelParts = [];
    foreach ($monthlyData['top_models'] as $tm) {
        $topModelsText .= "- {$tm['model_name']}: FG " . number_format((int)$tm['fg']) . " ชิ้น, Scrap " . number_format((int)$tm['scrap']) . " ชิ้น\n";
        $topModelParts[] = "{$tm['model_name']} (" . number_format((int)$tm['fg']) . " ชิ้น)";
    }
    $topModelsInline = !empty($topModelParts) ? implode(', ', $topModelParts) : 'ไม่มีข้อมูลยอดผลิต';

    if ($isLineMode) {
        $styleInstruction = <<<LINESTYLE
[คำสั่งพิเศษ: จัดทำข้อความสรุป 3 บรรทัดสำหรับส่ง LINE ผู้บริหาร]
ตอบเฉพาะ 3-4 บรรทัดนี้เท่านั้น ห้ามมีคำขึ้นต้น (ห้ามเขียน 'เรียนผู้จัดการ') ห้ามมีคำลงท้าย:
📌 [SNC-B9 MES] สรุปผลงานสะสม {$mLabel} ทีม: {$team}
1️⃣ ผลผลิต & รายได้สะสม: FG {$mFg} ชิ้น (เปิดสายผลิต {$mDays} วัน) | รายได้ ฿{$mRev} บาท | Scrap {$mScrap} ชิ้น
2️⃣ ต้นทุนพลังงานสะสม: ฿{$mUtil} บาท (ค่าไฟ ฿{$mElec} | ค่าแก๊ส LPG ฿{$mGas})
3️⃣ โมเดลขับเคลื่อนหลัก: {$topModelsInline}
LINESTYLE;
    } elseif ($summaryStyle === 'concise') {
        $styleInstruction = <<<STYLE
[รูปแบบคำตอบ: สรุปภาพรวมสะสมรายเดือนสำหรับผู้บริหาร (Executive Quick Summary - สั้น คม ตัวเลขเน้นๆ)]
- ความยาวประมาณ 4-6 บรรทัด (Bullet points ชัดเจน)
- รายได้สะสมทั้งเดือน ฿{$mRev} บาท (ผลิตสำเร็จรูป FG รวม {$mFg} ชิ้น จาก {$mDays} วันเปิดสายผลิต)
- ของเสียสะสม: Scrap {$mScrap} ชิ้น, Hold {$mHold} ชิ้น
- ต้นทุนพลังงานสะสม: รวม ฿{$mUtil} บาท (ค่าไฟฟ้า ฿{$mElec} บาท, ค่าแก๊ส LPG ฿{$mGas} บาท)
- โมเดลหลักที่ผลิต: {$topModelsInline}
- ห้ามเกริ่นนำ ให้สรุปตัวเลขและประเด็นสำคัญทันที
STYLE;
    } else {
        $styleInstruction = <<<STYLE
[รูปแบบคำตอบ: รายงานสะสมรายเดือนทางการเชิงวิศวกรรมอุตสาหการ (Formal Industrial Report)]
- เขียนรายงานเป็นทางการ 3 มิติ:
  1. **ภาพรวมผลงานสะสมรายเดือน (Executive Overview):** รายได้ ฿{$mRev} บาท, ยอดผลิตรวม {$mFg} ชิ้น (เปิดสายการผลิต {$mDays} วัน)
  2. **ประสิทธิภาพกระบวนการและต้นทุน (Process & Cost Efficiency):** การควบคุมของเสีย (Scrap {$mScrap} ชิ้น, Hold {$mHold} ชิ้น) และต้นทุนพลังงานสะสม ฿{$mUtil} บาท
  3. **ข้อเสนอแนะเชิงกลยุทธ์สำหรับรอบเดือน (Strategic Recommendations):** 2 ข้อสั้นๆ เชิงวิศวกรรม
STYLE;
    }

    $prompt = <<<EOT
คุณคือ "AI ผู้ช่วยฝ่ายบริหารและปฏิบัติการอัจฉริยะ" ประจำระบบ MES โรงงาน B9 (บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน))
ข้อมูลสรุปภาพรวมสะสมรายเดือน: {$mLabel} (ช่วงวันที่ {$monthlyData['start_date']} ถึง {$monthlyData['end_date']}) ทีม: {$team}

[ตัวเลขจริงจากฐานข้อมูล MES รายเดือน]
- วันที่เปิดทำการผลิตจริง: {$mDays} วัน
- ยอดผลิต FG รวมทั้งเดือน: {$mFg} ชิ้น (ของเสีย Scrap รวม: {$mScrap} ชิ้น, Hold: {$mHold} ชิ้น)
- รายได้จากการผลิต FG สะสมทั้งเดือน: ฿{$mRev} บาท
- ต้นทุนพลังงานสะสมทั้งเดือน: ฿{$mUtil} บาท (ค่าไฟ: ฿{$mElec} บาท, ค่าแก๊ส LPG: ฿{$mGas} บาท)
- โมเดลที่ผลิตสูงสุดในเดือนนี้:
{$topModelsText}

{$styleInstruction}
EOT;

} else {
    // === DAILY PROMPT ===
    $dateText = htmlspecialchars((string)($briefData['date_text'] ?? $briefData['raw_date'] ?? date('Y-m-d')));
    $mpTotal = (int)($briefData['mp_total'] ?? 0);
    $mpPresent = (int)($briefData['mp_present'] ?? 0);
    $mpLeave = (int)($briefData['mp_leave'] ?? 0);

    // Shift breakdown info
    $shift1Info = $briefData['shift1'] ?? ['total' => $mpTotal, 'present' => $mpPresent, 'leave' => $mpLeave, 'sick' => 0, 'biz' => 0];
    $shift2Info = $briefData['shift2'] ?? ['total' => 0, 'present' => 0, 'leave' => 0, 'sick' => 0, 'biz' => 0];

    $s1Total = (int)($shift1Info['total'] ?? 0);
    $s1Present = (int)($shift1Info['present'] ?? 0);
    $s1Leave = (int)($shift1Info['leave'] ?? 0);
    $s1Sick = (int)($shift1Info['sick'] ?? 0);
    $s1Biz = (int)($shift1Info['biz'] ?? 0);

    $s2Total = (int)($shift2Info['total'] ?? 0);
    $s2Present = (int)($shift2Info['present'] ?? 0);
    $s2Leave = (int)($shift2Info['leave'] ?? 0);

    $dlotTotal = htmlspecialchars((string)($briefData['dlot_total'] ?? '0'));
    $otTotal = htmlspecialchars((string)($briefData['ot_total'] ?? '0'));
    $elecCost = htmlspecialchars((string)($briefData['elec_cost'] ?? '0'));
    $gasCost = htmlspecialchars((string)($briefData['gas_cost'] ?? '0'));
    $moodAvg = (float)($briefData['mood_avg'] ?? 0.0);
    $revenue = htmlspecialchars((string)($briefData['revenue'] ?? '0'));

    $revNum = (float)str_replace(',', '', (string)$revenue);
    $dlotNum = (float)str_replace(',', '', (string)$dlotTotal);
    $elecNum = (float)str_replace(',', '', (string)$elecCost);
    $gasNum = (float)str_replace(',', '', (string)$gasCost);
    $grossContribution = $revNum - ($dlotNum + $elecNum + $gasNum);
    $grossContributionText = number_format($grossContribution, 2);
    $totalUtilText = number_format($elecNum + $gasNum, 2);

    $modelsSummary = [];
    $totalFgCount = 0;
    $totalScrapCount = 0;
    if (!empty($briefData['models']) && is_array($briefData['models'])) {
        foreach (array_slice($briefData['models'], 0, 8) as $m) {
            $mName = (string)($m['model_name'] ?? 'N/A');
            $mFg = (int)($m['fg'] ?? 0);
            $mHold = (int)($m['hold'] ?? 0);
            $mScrap = (int)($m['scrap'] ?? 0);
            $totalFgCount += $mFg;
            $totalScrapCount += $mScrap;
            $modelsSummary[] = "- {$mName}: FG {$mFg} ชิ้น, Hold {$mHold} ชิ้น, Scrap {$mScrap} ชิ้น";
        }
    }
    $modelsText = !empty($modelsSummary) ? implode("\n", $modelsSummary) : '- ไม่มียอดผลิตโมเดลหลักที่บันทึกไว้';

    if ($isLineMode) {
        $styleInstruction = <<<LINESTYLE
[คำสั่งพิเศษ: จัดทำข้อความสรุป 3 บรรทัดสำหรับส่ง LINE ผู้บริหาร]
ตอบเฉพาะ 3-4 บรรทัดนี้เท่านั้น ห้ามมีคำขึ้นต้น (ห้ามเขียน 'เรียนผู้จัดการ') ห้ามมีคำลงท้าย:
📌 [SNC-B9 MES] สรุปผลงาน ({$dateText}) ทีม: {$team}
1️⃣ ยอดผลิต & รายได้: ผลิต FG {$totalFgCount} ชิ้น | รายได้ ฿{$revenue} | ของเสีย Scrap {$totalScrapCount} ชิ้น
2️⃣ กำลังพล (Day/Night): กะเช้ามา {$s1Present}/{$s1Total} (ลา {$s1Leave}) | กะดึกมา {$s2Present}/{$s2Total} | บรรยากาศ {$moodAvg}/5.0
3️⃣ ต้นทุน & กำไรส่วนเกิน: DLOT ฿{$dlotTotal} (OT ฿{$otTotal}) | ค่าไฟ+แก๊ส ฿{$totalUtilText} | กำไรส่วนเกินเบื้องต้น ~฿{$grossContributionText}
LINESTYLE;
    } elseif ($summaryStyle === 'concise') {
        $styleInstruction = <<<STYLE
[รูปแบบคำตอบ: สรุปกระชับสำหรับผู้บริหาร (Executive Quick Summary - สั้น ตรงประเด็น)]
- ความยาวประมาณ 4-6 บรรทัด (Bullet points ชัดเจน)
- รายได้รวม ฿{$revenue} บาท, กำไรส่วนเกินเบื้องต้น ~฿{$grossContributionText} บาท
- สรุปกำลังพลแจกแจงกะ: กะเช้ามา {$s1Present}/{$s1Total} คน (ลา {$s1Leave} คน: ป่วย {$s1Sick}, กิจ {$s1Biz}) และกะดึกมา {$s2Present}/{$s2Total} คน (รวมเข้างานทั้งสองกะ {$mpPresent}/{$mpTotal} คน)
- สรุปต้นทุน: DLOT ฿{$dlotTotal} (OT ฿{$otTotal}) และพลังงาน ฿{$totalUtilText}
- ห้ามเกริ่นนำ ให้เข้าประเด็นตัวเลขทันที
STYLE;
    } else {
        $styleInstruction = <<<STYLE
[รูปแบบคำตอบ: รายงานทางการเชิงวิศวกรรมอุตสาหการ (Formal Industrial Report)]
- เขียนรายงานเป็นทางการ 3 มิติ:
  1. **ภาพรวมการดำเนินงาน (Executive Overview):** สถานะรายได้ กำไรส่วนเกิน และกำลังพลแจกแจงกะเช้า/กะดึกชัดเจน
  2. **จุดเด่นและจุดเฝ้าระวัง (Key Highlights & Watchpoints):** ของเสีย Scrap/Hold และค่า OT/พลังงาน
  3. **ข้อเสนอแนะเชิงรุกสำหรับกะวันนี้ (Actionable Recommendations):** 2 ข้อสั้นๆ
STYLE;
    }

    $prompt = <<<EOT
คุณคือ "AI ผู้ช่วยฝ่ายบริหารและปฏิบัติการอัจฉริยะ" ประจำระบบ MES โรงงาน B9 (บริษัท เอส เอ็น ซี ฟอร์เมอร์ จำกัด (มหาชน))
ข้อมูลในระบบสำหรับวันที่: {$dateText} (ทีม: {$team}):

[ตัวเลขจริงจากฐานข้อมูล MES]
1. ยอดผลิตและรายได้:
   - รายได้จากสินค้าสำเร็จรูป (FG): ฿{$revenue} บาท
   - กำไรส่วนเกินเบื้องต้น (Gross Contribution = รายได้ - [DLOT + ไฟ + แก๊ส]): ประมาณ ฿{$grossContributionText} บาท
   - ผลิต FG รวม {$totalFgCount} ชิ้น, ของเสีย Scrap รวม {$totalScrapCount} ชิ้น
   - โมเดลผลิตหลัก:
{$modelsText}
2. ต้นทุนแรงงานและพลังงาน:
   - DLOT รวม: ฿{$dlotTotal} บาท (เป็นค่าล่วงเวลา OT: ฿{$otTotal} บาท)
   - ค่าไฟฟ้า: ฿{$elecCost} บาท | ค่าแก๊ส LPG: ฿{$gasCost} บาท (รวมพลังงาน: ฿{$totalUtilText} บาท)
3. กำลังพลจำแนกตามกะการทำงาน (Shift Breakdown ชัดเจนเพื่อไม่ให้ผู้บริหารสับสน):
   - พนักงานในระบบทั้งหมด: {$mpTotal} คน (รวมทั้งสองกะ)
   - กะเช้า (Day Shift): เข้างาน {$s1Present} คน / ขาด-ลา {$s1Leave} คน (ป่วย {$s1Sick}, ลากิจ {$s1Biz}) จากทั้งหมด {$s1Total} คน
   - กะดึก (Night Shift): เข้างาน {$s2Present} คน / ขาด-ลา {$s2Leave} คน จากทั้งหมด {$s2Total} คน
   - รวมพนักงานที่มาปฏิบัติงานจริงทั้งสองกะ: {$mpPresent} คน
   - ดัชนีบรรยากาศการทำงาน (Team Mood): {$moodAvg} / 5.0
   * หมายเหตุสำคัญเรื่องกะทำงาน: โรงงาน B9 แบ่งการทำงานเป็น 2 กะหลัก คือ กะเช้า (Day Shift) และ กะดึก (Night Shift)
     - หากเป็นการดูข้อมูลในระหว่างวันของวันปัจจุบัน กะดึกจะเริ่มงานช่วงค่ำ ตัวเลขเข้างานกะดึกจึงยังเป็น 0 คน (ไม่ใช่พนักงานหายไปหรือขาดงาน)
     - หากผู้บริหารถามเรื่องพนักงาน ให้ตอบแจกแจงแยกชัดเจนเสมอว่า "กะเช้ามาปฏิบัติงานกี่คน" และ "กะดึกกี่คน" เพื่อไม่ให้ผู้บริหารเข้าใจผิดว่าพนักงานหายไป

{$styleInstruction}

[แนวทางการตอบคำถามทั่วไป]
- หากถามข้อมูลเกี่ยวกับยอดผลิต ต้นทุน กำไร หรือกำลังพล: ให้ตอบตัวเลขจริงข้างต้นอย่างชัดเจน
- หากถามเรื่องนอกเหนือจากนี้ (เช่น สูตรสี, ใครแจ้งซ่อม, ประวัติซ่อม): ให้แนะนำว่าไปดูได้ที่โมดูลใดใน MES (เช่น PE, PaintChem, Store)
EOT;
}

$prompt .= <<<RULES


[กฎความถูกต้องของข้อมูล (บังคับ)]
- ใช้เฉพาะตัวเลขที่ให้ไว้ข้างต้นเท่านั้น ห้ามประมาณหรือแต่งตัวเลขเพิ่ม หากไม่มีข้อมูลให้บอกตรงๆ ว่า "ไม่มีข้อมูลในระบบ"
- ค่า "กำไรส่วนเกินเบื้องต้น" = รายได้ FG − (ค่าแรง DLOT + ค่าไฟ + ค่าแก๊ส) ยังไม่หักต้นทุนวัตถุดิบและค่าโสหุ้ยอื่น จึงไม่ใช่กำไรสุทธิ ต้องระบุคำเตือนนี้สั้นๆ ทุกครั้งที่กล่าวถึงตัวเลขนี้ (โดยเฉพาะเมื่อผู้ใช้ถามถึง "กำไร")
- หากข้อมูลที่ถูกถามเป็นของวันปัจจุบัน ให้แจ้งว่าเป็นตัวเลข ณ เวลาที่ประมวลผล ยังไม่ใช่ยอดปิดวัน
- หากผู้ใช้ถามช่วงเวลาที่ระบบยังไม่รองรับ (เช่น ช่วงหลายวัน, รายสัปดาห์, รายโมเดลย้อนหลัง) ให้แจ้งตรงๆ ว่าตอนนี้ดูได้เฉพาะ "รายวัน" และ "รายเดือน" พร้อมแนะนำให้พิมพ์ระบุวันหรือเดือนทีละช่วง
RULES;

if (!empty($customPrompt)) {
    $cleanPrompt = htmlspecialchars($customPrompt);
    $prompt .= "\n\n[คำถามหรือคำสั่งเจาะจงจากผู้ใช้]\n\"{$cleanPrompt}\"\nโปรดตอบคำถามนี้เป็นอันดับแรกให้ชัดเจนและตรงประเด็นที่สุด";
}

$payload = [
    'contents' => [
        [
            'parts' => [
                ['text' => $prompt]
            ]
        ]
    ],
    'generationConfig' => [
        'temperature' => 0.2,
        'maxOutputTokens' => 2048
    ]
];

$candidateModels = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash'
];

$replyText = null;
$usedModel = null;
$lastError = null;
$hitRateLimit = false;

foreach ($candidateModels as $model) {
    $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json; charset=utf-8',
            'x-goog-api-key: ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 25,
        CURLOPT_SSL_VERIFYPEER => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode === 200 && !empty($response)) {
        $jsonRes = json_decode($response, true);
        $candidateText = $jsonRes['candidates'][0]['content']['parts'][0]['text'] ?? null;
        if (!empty($candidateText)) {
            $replyText = trim($candidateText);
            $usedModel = $model;
            break;
        }
    } else {
        if ($httpCode === 429) {
            $hitRateLimit = true;
        }
        $lastError = "Model {$model} returned HTTP {$httpCode}: " . ($curlError ?: $response);
    }
}

if ($replyText === null) {
    http_response_code($hitRateLimit ? 429 : 502);
    $userMsg = $hitRateLimit 
        ? 'ขณะนี้มีการเรียกใช้งาน AI ถี่เกินโควตาทดลองใช้ฟรี (จำกัด 15 ครั้ง/นาที) กรุณารอประมาณ 15-20 วินาทีแล้วลองกดใหม่อีกครั้งครับ'
        : 'ไม่สามารถเชื่อมต่อบริการ AI ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';

    echo json_encode([
        'success' => false,
        'data' => null,
        'message' => $userMsg,
        'debug' => $lastError
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

writeLog(
    $pdo,
    'AI_QUERY',
    'MORNING_BRIEF_AI',
    $monthlyData !== null ? ($monthlyData['start_date'] ?? '') : ($briefData['raw_date'] ?? ''),
    null,
    ['team' => $team, 'style' => $summaryStyle, 'model' => $usedModel],
    mb_substr($customPrompt !== '' ? $customPrompt : '(default brief)', 0, 200)
);

echo json_encode([
    'success' => true,
    'data' => [
        'briefing' => $replyText,
        'model' => $usedModel,
        'generated_at' => date('Y-m-d H:i:s'),
        'auto_switched_date' => $autoSwitchedDate,
        'is_month' => $monthlyData !== null,
        'month_label' => $monthlyData['month_label'] ?? null,
        'target_date' => $monthlyData ? $monthlyData['start_date'] : ($briefData['raw_date'] ?? $dateText),
        'updated_brief_data' => $autoSwitchedDate ? $briefData : null
    ],
    'message' => 'วิเคราะห์ข้อมูลด้วย AI สำเร็จ'
], JSON_UNESCAPED_UNICODE);
