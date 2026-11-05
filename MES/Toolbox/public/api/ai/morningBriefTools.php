<?php
// Toolbox/public/api/ai/morningBriefTools.php
// Read-only data tools exposed to the Gemini model (function calling) for the Morning Brief AI.
// Include-only module: loaded by morningBriefAi.php after authentication, role and CSRF checks.

declare(strict_types=1);

if (!defined('MORNING_BRIEF_AI_ENTRY')) {
    http_response_code(403);
    exit;
}

const AI_TOOL_MAX_RANGE_DAYS = 92;
const AI_TOOL_MAX_MODEL_ROWS = 15;

/**
 * Production date rule used across MES: the production day rolls over at 08:00.
 */
function getProductionToday(): string {
    $now = new DateTimeImmutable('now');
    if ((int)$now->format('H') < 8) {
        $now = $now->modify('-1 day');
    }
    return $now->format('Y-m-d');
}

function isValidIsoDate(string $value): bool {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts)) {
        return false;
    }
    return checkdate((int)$parts[2], (int)$parts[3], (int)$parts[1]);
}

/**
 * Validate and normalise a date range: swap if reversed, clamp end to the current production date
 * (labor cost exists for future calendar days as plan data, which must never be reported as actual),
 * and cap the span.
 *
 * @return array{0:string,1:string}|array{error:string}
 */
function normalizeDateRange(string $start, string $end): array {
    if (!isValidIsoDate($start) || !isValidIsoDate($end)) {
        return ['error' => 'รูปแบบวันที่ต้องเป็น YYYY-MM-DD'];
    }
    if ($start > $end) {
        [$start, $end] = [$end, $start];
    }
    $today = getProductionToday();
    if ($start > $today) {
        return ['error' => "ช่วงที่ขอเป็นอนาคตทั้งหมด (วันนี้คือ {$today}) ยังไม่มีข้อมูลจริง"];
    }
    if ($end > $today) {
        $end = $today;
    }
    $spanDays = (int)((strtotime($end) - strtotime($start)) / 86400) + 1;
    if ($spanDays > AI_TOOL_MAX_RANGE_DAYS) {
        return ['error' => 'ช่วงวันที่ยาวเกิน ' . AI_TOOL_MAX_RANGE_DAYS . ' วัน กรุณาแบ่งถามทีละช่วง'];
    }
    return [$start, $end];
}

function toMoney($value): float {
    return round((float)$value, 2);
}

/**
 * Single-day full report (production, shifts, labor, utilities, mood).
 * NOTE: Intentionally >50 lines — five independent SQL blocks that read best sequentially.
 */
function queryDailyReport(string $targetDate, ?string $teamGroup): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;

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
    if ($teamParam !== null) {
        $mpQuery .= " AND ISNULL(TS.hc_group, '') = ?";
        $mpParams[] = $teamParam;
    } else {
        $mpQuery .= " AND ISNULL(TS.hc_group, '') != 'EXCLUDE'";
    }
    $mpQuery .= " GROUP BY ISNULL(L.shift_id, 1)";
    $stmtMp = $pdo->prepare($mpQuery);
    $stmtMp->execute($mpParams);

    $emptyShift = ['total' => 0, 'present' => 0, 'leave' => 0, 'sick' => 0, 'business' => 0, 'absent' => 0];
    $shifts = [1 => $emptyShift, 2 => $emptyShift];
    foreach ($stmtMp->fetchAll() ?: [] as $row) {
        $shiftId = ((int)($row['shift_id'] ?? 1)) === 2 ? 2 : 1;
        $shifts[$shiftId] = [
            'total' => (int)$row['total_shift'],
            'present' => (int)$row['present'],
            'leave' => (int)$row['leave_count'],
            'sick' => (int)$row['sick_count'],
            'business' => (int)$row['business_count'],
            'absent' => (int)$row['absent_count'],
        ];
    }

    $costQuery = "SELECT
        ISNULL(SUM(Normal_Cost + OT_Cost), 0) as total_dlot,
        ISNULL(SUM(OT_Cost), 0) as total_ot
        FROM dbo.fn_GetManpowerSummary_V2(?)";
    $costParams = [$targetDate];
    if ($teamParam !== null) {
        $costQuery .= " WHERE hc_group = ?";
        $costParams[] = $teamParam;
    } else {
        $costQuery .= " WHERE ISNULL(hc_group, '') != 'EXCLUDE'";
    }
    $stmtCost = $pdo->prepare($costQuery);
    $stmtCost->execute($costParams);
    $cost = $stmtCost->fetch() ?: ['total_dlot' => 0, 'total_ot' => 0];

    $stmtUtil = $pdo->prepare("SELECT
        ISNULL(SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END), 0) as elec_cost,
        ISNULL(SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END), 0) as gas_cost
        FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
        JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
        WHERE s.log_date = ? AND m.is_active = 1 AND m.meter_name != 'MDB'");
    $stmtUtil->execute([$targetDate]);
    $util = $stmtUtil->fetch() ?: ['elec_cost' => 0, 'gas_cost' => 0];

    $models = queryModelBreakdown($targetDate, $targetDate, $teamGroup);

    $stmtMood = $pdo->prepare("SELECT ISNULL(AVG(CAST(mood_score AS FLOAT)), 0) as mood_avg FROM OPERATOR_DAILY_LOGS WITH (NOLOCK) WHERE log_date = ? AND mood_score > 0");
    $stmtMood->execute([$targetDate]);
    $moodAverage = (float)(($stmtMood->fetch() ?: [])['mood_avg'] ?? 0);

    $matOhQuery = "SELECT
        ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_mat_snapshot, 0) ELSE 0 END), 0) as mat_cost,
        ISNULL(SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_oh_snapshot, 0) ELSE 0 END), 0) as oh_cost
        FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
        JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
        LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
        WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) = ?
          AND t.transaction_type = 'PRODUCTION_FG'
          AND i.material_type = 'FG'";
    $matOhParams = [$targetDate];
    if ($teamParam !== null) {
        $matOhQuery .= " AND (u.team_group = ? OR t.notes LIKE ?)";
        $matOhParams[] = $teamParam;
        $matOhParams[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
    } else {
        $matOhQuery .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
    }
    $stmtMatOh = $pdo->prepare($matOhQuery);
    $stmtMatOh->execute($matOhParams);
    $matOh = $stmtMatOh->fetch() ?: ['mat_cost' => 0, 'oh_cost' => 0];
    $matCost = (float)$matOh['mat_cost'];
    $ohCost = (float)$matOh['oh_cost'];

    $revenue = 0.0;
    $totalFg = 0;
    $totalHold = 0;
    $totalScrap = 0;
    foreach ($models as $model) {
        $revenue += $model['revenue'];
        $totalFg += $model['fg'];
        $totalHold += $model['hold'];
        $totalScrap += $model['scrap'];
    }

    $labor = (float)$cost['total_dlot'];
    $overtime = (float)$cost['total_ot'];
    $electricity = (float)$util['elec_cost'];
    $gas = (float)$util['gas_cost'];
    $energy = $electricity + $gas;

    return [
        'date' => $targetDate,
        'is_current_production_day' => $targetDate === getProductionToday(),
        'production' => [
            'fg_pieces' => $totalFg,
            'hold_pieces' => $totalHold,
            'scrap_pieces' => $totalScrap,
            'revenue_thb' => toMoney($revenue),
            'models' => $models,
        ],
        'manpower' => [
            'day_shift' => $shifts[1],
            'night_shift' => $shifts[2],
            'total_present_both_shifts' => $shifts[1]['present'] + $shifts[2]['present'],
            'total_headcount_both_shifts' => $shifts[1]['total'] + $shifts[2]['total'],
            'mood_average_of_5' => round($moodAverage, 2),
        ],
        'cost' => [
            'standard_material_cost_thb' => toMoney($matCost),
            'overhead_production_thb' => toMoney($ohCost),
            'labor_dlot_thb' => toMoney($labor),
            'overtime_thb' => toMoney($overtime),
            'overtime_pct_of_labor' => $labor > 0 ? round($overtime / $labor * 100, 1) : 0.0,
            'electricity_thb' => toMoney($electricity),
            'lpg_gas_thb' => toMoney($gas),
            'energy_total_thb' => toMoney($energy),
            'total_standard_cogs_and_expenses_thb' => toMoney($matCost + $ohCost + $labor + $energy),
        ],
        'margin' => [
            'revenue_minus_labor_and_energy_thb' => toMoney($revenue - $labor - $energy),
            'gross_profit_standard_thb' => toMoney($revenue - $matCost - $ohCost - $labor - $energy),
            'note' => 'ต้นทุนวัตถุดิบและค่าโสหุ้ยคำนวณจาก Standard Cost Snapshot ของ BOM ที่ผูกกับยอดผลิต FG',
        ],
    ];
}

/**
 * Per-model production breakdown for a date range (FG / Hold / Scrap / revenue).
 *
 * @return array<int,array<string,mixed>>
 */
function queryModelBreakdown(string $startDate, string $endDate, ?string $teamGroup, int $limit = AI_TOOL_MAX_MODEL_ROWS): array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return [];

    $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;
    $limit = max(1, min($limit, AI_TOOL_MAX_MODEL_ROWS));

    $query = "SELECT TOP ({$limit})
        ISNULL(rt.model, i.part_no) as model_name,
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
        OUTER APPLY (SELECT TOP 1 r.model FROM MANUFACTURING_ROUTES r WITH (NOLOCK) WHERE r.item_id = i.item_id) rt
        LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
        LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
        WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?
          AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?
          AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND i.material_type = 'FG'";
    $params = [$startDate, $endDate];
    if ($teamParam !== null) {
        $query .= " AND (u.team_group = ? OR t.notes LIKE ?)";
        $params[] = $teamParam;
        $params[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
    } else {
        $query .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
    }
    $query .= " GROUP BY ISNULL(rt.model, i.part_no)
        HAVING SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) > 0
            OR SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) > 0
            OR SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) > 0
        ORDER BY SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) DESC";

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);

    $rows = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $rows[] = [
            'model' => (string)$row['model_name'],
            'fg' => (int)$row['fg'],
            'hold' => (int)$row['hold'],
            'scrap' => (int)$row['scrap'],
            'revenue' => toMoney($row['revenue']),
        ];
    }
    return $rows;
}

/**
 * Fetch one metric set grouped by date and index it by 'Y-m-d'.
 *
 * @param array<int,mixed> $params
 * @return array<string,array<string,mixed>>
 */
function fetchRowsIndexedByDate(string $sql, array $params, string $dateColumn): array {
    global $pdo;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $indexed = [];
    foreach ($stmt->fetchAll() ?: [] as $row) {
        $dateValue = $row[$dateColumn];
        $key = $dateValue instanceof DateTimeInterface ? $dateValue->format('Y-m-d') : substr((string)$dateValue, 0, 10);
        $indexed[$key] = $row;
    }
    return $indexed;
}

/**
 * Multi-day report: per-day production, labor and energy plus aggregated totals.
 * Covers weeks, months, MTD and arbitrary ranges.
 * NOTE: Intentionally >50 lines — three per-day queries merged into one timeline.
 */
function queryRangeReport(string $startDate, string $endDate, ?string $teamGroup): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $teamParam = ($teamGroup === 'ALL' || empty($teamGroup)) ? null : $teamGroup;

    $prodSql = "SELECT CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) as prod_date,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity ELSE 0 END) as fg,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_HOLD' THEN t.quantity ELSE 0 END) as hold,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_SCRAP' THEN t.quantity ELSE 0 END) as scrap,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_mat_snapshot, 0) ELSE 0 END) as mat_cost,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_oh_snapshot, 0) ELSE 0 END) as oh_cost,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN
            t.quantity * CASE
                WHEN ISNULL(t.std_price_usd_snapshot, 0) > 0 THEN (t.std_price_usd_snapshot * ISNULL(cal.exchange_rate, 32.0))
                ELSE ISNULL(t.std_price_snapshot, i.StandardPrice)
            END
        ELSE 0 END) as revenue
        FROM STOCK_TRANSACTIONS t WITH (NOLOCK)
        JOIN ITEMS i WITH (NOLOCK) ON t.parameter_id = i.item_id
        LEFT JOIN MANPOWER_CALENDAR cal WITH (NOLOCK) ON cal.calendar_date = CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)
        LEFT JOIN USERS u WITH (NOLOCK) ON t.created_by_user_id = u.id
        WHERE CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) >= ?
          AND CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE) <= ?
          AND t.transaction_type IN ('PRODUCTION_FG', 'PRODUCTION_HOLD', 'PRODUCTION_SCRAP')
          AND i.material_type = 'FG'";
    $prodParams = [$startDate, $endDate];
    if ($teamParam !== null) {
        $prodSql .= " AND (u.team_group = ? OR t.notes LIKE ?)";
        $prodParams[] = $teamParam;
        $prodParams[] = '%[[]TEAM_OVERRIDE: ' . $teamParam . ']%';
    } else {
        $prodSql .= " AND ISNULL(u.team_group, '') != 'EXCLUDE'";
    }
    $prodSql .= " GROUP BY CAST(DATEADD(HOUR, -8, t.transaction_timestamp) AS DATE)";
    $productionByDate = fetchRowsIndexedByDate($prodSql, $prodParams, 'prod_date');

    $laborSql = "SELECT cal.calendar_date as work_date,
        SUM(f.Normal_Cost + f.OT_Cost) as dlot, SUM(f.OT_Cost) as ot
        FROM dbo.MANPOWER_CALENDAR cal WITH (NOLOCK)
        CROSS APPLY dbo.fn_GetManpowerSummary_V2(cal.calendar_date) f
        WHERE cal.calendar_date >= ? AND cal.calendar_date <= ?";
    $laborParams = [$startDate, $endDate];
    if ($teamParam !== null) {
        $laborSql .= " AND f.hc_group = ?";
        $laborParams[] = $teamParam;
    } else {
        $laborSql .= " AND ISNULL(f.hc_group, '') != 'EXCLUDE'";
    }
    $laborSql .= " GROUP BY cal.calendar_date";
    $laborByDate = fetchRowsIndexedByDate($laborSql, $laborParams, 'work_date');

    $utilSql = "SELECT s.log_date as util_date,
        SUM(CASE WHEN m.utility_type = 'ELECTRIC' THEN s.calculated_cost ELSE 0 END) as elec,
        SUM(CASE WHEN m.utility_type = 'LPG' THEN s.calculated_cost ELSE 0 END) as gas
        FROM UTILITY_HOURLY_SUMMARY s WITH (NOLOCK)
        JOIN UTILITY_METERS m WITH (NOLOCK) ON s.meter_id = m.meter_id
        WHERE s.log_date >= ? AND s.log_date <= ? AND m.is_active = 1 AND m.meter_name != 'MDB'
        GROUP BY s.log_date";
    $utilByDate = fetchRowsIndexedByDate($utilSql, [$startDate, $endDate], 'util_date');

    $totals = [
        'fg' => 0, 'hold' => 0, 'scrap' => 0,
        'revenue' => 0.0, 'material_cost' => 0.0, 'overhead_cost' => 0.0,
        'labor' => 0.0, 'overtime' => 0.0, 'electricity' => 0.0, 'gas' => 0.0
    ];
    $days = [];
    $productionDays = 0;
    for ($cursor = strtotime($startDate); $cursor <= strtotime($endDate); $cursor += 86400) {
        $dateKey = date('Y-m-d', $cursor);
        $prod = $productionByDate[$dateKey] ?? null;
        $labor = $laborByDate[$dateKey] ?? null;
        $util = $utilByDate[$dateKey] ?? null;

        $matCostDay = (float)($prod['mat_cost'] ?? 0);
        $ohCostDay = (float)($prod['oh_cost'] ?? 0);

        $day = [
            'date' => $dateKey,
            'weekday' => date('D', $cursor),
            'fg' => (int)($prod['fg'] ?? 0),
            'hold' => (int)($prod['hold'] ?? 0),
            'scrap' => (int)($prod['scrap'] ?? 0),
            'revenue_thb' => toMoney($prod['revenue'] ?? 0),
            'material_cost_thb' => toMoney($matCostDay),
            'overhead_cost_thb' => toMoney($ohCostDay),
            'labor_dlot_thb' => toMoney($labor['dlot'] ?? 0),
            'overtime_thb' => toMoney($labor['ot'] ?? 0),
            'energy_thb' => toMoney((float)($util['elec'] ?? 0) + (float)($util['gas'] ?? 0)),
        ];
        $days[] = $day;

        if ($day['fg'] > 0) $productionDays++;
        $totals['fg'] += $day['fg'];
        $totals['hold'] += $day['hold'];
        $totals['scrap'] += $day['scrap'];
        $totals['revenue'] += $day['revenue_thb'];
        $totals['material_cost'] += $matCostDay;
        $totals['overhead_cost'] += $ohCostDay;
        $totals['labor'] += $day['labor_dlot_thb'];
        $totals['overtime'] += $day['overtime_thb'];
        $totals['electricity'] += (float)($util['elec'] ?? 0);
        $totals['gas'] += (float)($util['gas'] ?? 0);
    }

    $energy = $totals['electricity'] + $totals['gas'];
    $inspected = $totals['fg'] + $totals['hold'] + $totals['scrap'];

    return [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'calendar_days' => count($days),
        'production_days' => $productionDays,
        'includes_current_production_day' => $endDate === getProductionToday(),
        'totals' => [
            'fg_pieces' => $totals['fg'],
            'hold_pieces' => $totals['hold'],
            'scrap_pieces' => $totals['scrap'],
            'scrap_rate_pct' => $inspected > 0 ? round($totals['scrap'] / $inspected * 100, 2) : 0.0,
            'revenue_thb' => toMoney($totals['revenue']),
            'standard_material_cost_thb' => toMoney($totals['material_cost']),
            'overhead_production_thb' => toMoney($totals['overhead_cost']),
            'labor_dlot_thb' => toMoney($totals['labor']),
            'overtime_thb' => toMoney($totals['overtime']),
            'overtime_pct_of_labor' => $totals['labor'] > 0 ? round($totals['overtime'] / $totals['labor'] * 100, 1) : 0.0,
            'electricity_thb' => toMoney($totals['electricity']),
            'lpg_gas_thb' => toMoney($totals['gas']),
            'energy_total_thb' => toMoney($energy),
            'revenue_minus_labor_and_energy_thb' => toMoney($totals['revenue'] - $totals['labor'] - $energy),
            'gross_profit_standard_thb' => toMoney($totals['revenue'] - $totals['material_cost'] - $totals['overhead_cost'] - $totals['labor'] - $energy),
            'margin_note' => 'ต้นทุนวัตถุดิบและค่าโสหุ้ยคำนวณจาก Standard Cost Snapshot ของ BOM ที่ผูกกับยอดผลิต FG',
        ],
        'daily' => $days,
    ];
}

/**
 * PE Maintenance & Machine downtime report for a date range.
 * NOTE: Intentionally >50 lines — three maintenance queries merged into one operational report.
 *
 * @return array<string,mixed>
 */
function queryMaintenanceReport(string $startDate, string $endDate, ?string $line = null, ?string $status = null): array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return ['error' => 'Database connection unavailable'];

    $summarySql = "SELECT
        COUNT(*) as total_wo,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'In Progress') THEN 1 ELSE 0 END) as pending_wo,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_wo,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_count,
        ISNULL(SUM(repair_minutes), 0) as total_repair_minutes
        FROM PE_WORK_ORDERS WITH (NOLOCK)
        WHERE CAST(requested_at AS DATE) >= ? AND CAST(requested_at AS DATE) <= ?";
    $summaryParams = [$startDate, $endDate];
    if (!empty($line) && $line !== 'ALL') {
        $summarySql .= " AND line = ?";
        $summaryParams[] = $line;
    }
    if (!empty($status) && $status !== 'ALL') {
        $summarySql .= " AND status = ?";
        $summaryParams[] = $status;
    }
    $stmtSummary = $pdo->prepare($summarySql);
    $stmtSummary->execute($summaryParams);
    $summary = $stmtSummary->fetch() ?: [];

    $topMachSql = "SELECT TOP 5
        machine_name, line, COUNT(*) as issue_count, ISNULL(SUM(repair_minutes), 0) as total_repair_min
        FROM PE_WORK_ORDERS WITH (NOLOCK)
        WHERE CAST(requested_at AS DATE) >= ? AND CAST(requested_at AS DATE) <= ?";
    $topMachParams = [$startDate, $endDate];
    if (!empty($line) && $line !== 'ALL') {
        $topMachSql .= " AND line = ?";
        $topMachParams[] = $line;
    }
    $topMachSql .= " GROUP BY machine_name, line ORDER BY COUNT(*) DESC, total_repair_min DESC";
    $stmtTop = $pdo->prepare($topMachSql);
    $stmtTop->execute($topMachParams);
    $topMachines = [];
    foreach ($stmtTop->fetchAll() ?: [] as $row) {
        $topMachines[] = [
            'machine_name' => (string)$row['machine_name'],
            'line' => (string)$row['line'],
            'issue_count' => (int)$row['issue_count'],
            'total_repair_minutes' => (int)$row['total_repair_min'],
        ];
    }

    $urgentSql = "SELECT TOP 5
        wo_number, machine_name, line, priority, status, issue_title, requested_at, repair_minutes
        FROM PE_WORK_ORDERS WITH (NOLOCK)
        WHERE CAST(requested_at AS DATE) >= ? AND CAST(requested_at AS DATE) <= ?";
    $urgentParams = [$startDate, $endDate];
    if (!empty($line) && $line !== 'ALL') {
        $urgentSql .= " AND line = ?";
        $urgentParams[] = $line;
    }
    $urgentSql .= " ORDER BY CASE WHEN priority = 'Critical' THEN 1 WHEN priority = 'High' THEN 2 ELSE 3 END, requested_at DESC";
    $stmtUrgent = $pdo->prepare($urgentSql);
    $stmtUrgent->execute($urgentParams);
    $recentIssues = [];
    foreach ($stmtUrgent->fetchAll() ?: [] as $row) {
        $recentIssues[] = [
            'wo_number' => (string)$row['wo_number'],
            'machine_name' => (string)$row['machine_name'],
            'line' => (string)$row['line'],
            'priority' => (string)$row['priority'],
            'status' => (string)$row['status'],
            'issue_title' => (string)$row['issue_title'],
            'requested_at' => substr((string)$row['requested_at'], 0, 16),
            'repair_minutes' => $row['repair_minutes'] !== null ? (int)$row['repair_minutes'] : null,
        ];
    }

    return [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'line_filter' => $line ?? 'ALL',
        'metrics' => [
            'total_work_orders' => (int)($summary['total_wo'] ?? 0),
            'pending_work_orders' => (int)($summary['pending_wo'] ?? 0),
            'completed_work_orders' => (int)($summary['completed_wo'] ?? 0),
            'critical_issues_count' => (int)($summary['critical_count'] ?? 0),
            'high_issues_count' => (int)($summary['high_count'] ?? 0),
            'total_repair_downtime_minutes' => (int)($summary['total_repair_minutes'] ?? 0),
            'total_repair_downtime_hours' => round(((int)($summary['total_repair_minutes'] ?? 0)) / 60, 1),
        ],
        'top_problem_machines' => $topMachines,
        'recent_urgent_work_orders' => $recentIssues,
    ];
}

/**
 * Query System & Security Audit logs from dbo.SYSTEM_LOGS.
 * Analyzes logins, distinct active users, API errors, deletion events, and high-risk security operations.
 * NOTE: Intentionally >50 lines — multi-faceted security and system log aggregation.
 */
function querySystemAuditReport(string $targetDate, ?string $actionFilter = 'ALL', int $limit = 15): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $limit = max(1, min(30, $limit));

    $summarySql = "SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT username) as distinct_users,
        SUM(CASE WHEN action = 'LOGIN' THEN 1 ELSE 0 END) as login_count,
        SUM(CASE WHEN action = 'LOGOUT' THEN 1 ELSE 0 END) as logout_count,
        SUM(CASE WHEN action = 'API_ERROR' THEN 1 ELSE 0 END) as api_error_count,
        SUM(CASE WHEN action LIKE 'DELETE%' THEN 1 ELSE 0 END) as delete_count,
        SUM(CASE WHEN action IN ('UNLOCK', 'APPROVE_USER', 'RESET_PASSWORD_DEFAULT', 'DEACTIVATE_ITEM') THEN 1 ELSE 0 END) as security_critical_count
        FROM SYSTEM_LOGS WITH (NOLOCK)
        WHERE CAST(created_at AS DATE) = ?";
    $stmtSummary = $pdo->prepare($summarySql);
    $stmtSummary->execute([$targetDate]);
    $summary = $stmtSummary->fetch() ?: [];

    $stmtErrors = $pdo->prepare("SELECT TOP 5
        id, username, role, action, module, remark, created_at
        FROM SYSTEM_LOGS WITH (NOLOCK)
        WHERE CAST(created_at AS DATE) = ? AND action = 'API_ERROR'
        ORDER BY created_at DESC");
    $stmtErrors->execute([$targetDate]);
    $recentErrors = [];
    foreach ($stmtErrors->fetchAll() ?: [] as $row) {
        $recentErrors[] = [
            'id' => (int)$row['id'],
            'username' => (string)$row['username'],
            'role' => (string)($row['role'] ?? 'unknown'),
            'module' => (string)($row['module'] ?? ''),
            'error_detail' => (string)($row['remark'] ?? ''),
            'time' => substr((string)$row['created_at'], 11, 8),
        ];
    }

    $stmtRisks = $pdo->prepare("SELECT TOP 5
        id, username, role, action, module, remark, created_at
        FROM SYSTEM_LOGS WITH (NOLOCK)
        WHERE CAST(created_at AS DATE) = ? AND (action LIKE 'DELETE%' OR action IN ('UNLOCK', 'DEACTIVATE_ITEM', 'RESET_PASSWORD_DEFAULT'))
        ORDER BY created_at DESC");
    $stmtRisks->execute([$targetDate]);
    $recentRisks = [];
    foreach ($stmtRisks->fetchAll() ?: [] as $row) {
        $recentRisks[] = [
            'id' => (int)$row['id'],
            'username' => (string)$row['username'],
            'role' => (string)($row['role'] ?? 'unknown'),
            'action' => (string)$row['action'],
            'module' => (string)($row['module'] ?? ''),
            'remark' => (string)($row['remark'] ?? ''),
            'time' => substr((string)$row['created_at'], 11, 8),
        ];
    }

    $eventSql = "SELECT TOP {$limit}
        id, username, role, action, module, remark, ip_address, created_at
        FROM SYSTEM_LOGS WITH (NOLOCK)
        WHERE CAST(created_at AS DATE) = ?";
    $eventParams = [$targetDate];
    if (!empty($actionFilter) && $actionFilter !== 'ALL') {
        $eventSql .= " AND action = ?";
        $eventParams[] = $actionFilter;
    }
    $eventSql .= " ORDER BY created_at DESC";
    $stmtEvents = $pdo->prepare($eventSql);
    $stmtEvents->execute($eventParams);
    $recentEvents = [];
    foreach ($stmtEvents->fetchAll() ?: [] as $row) {
        $recentEvents[] = [
            'username' => (string)$row['username'],
            'role' => (string)($row['role'] ?? 'unknown'),
            'action' => (string)$row['action'],
            'module' => (string)($row['module'] ?? ''),
            'remark' => (string)($row['remark'] ?? ''),
            'ip' => (string)($row['ip_address'] ?? 'internal'),
            'time' => substr((string)$row['created_at'], 11, 8),
        ];
    }

    return [
        'target_date' => $targetDate,
        'metrics' => [
            'total_events_today' => (int)($summary['total_events'] ?? 0),
            'active_distinct_users' => (int)($summary['distinct_users'] ?? 0),
            'login_count' => (int)($summary['login_count'] ?? 0),
            'logout_count' => (int)($summary['logout_count'] ?? 0),
            'api_error_count' => (int)($summary['api_error_count'] ?? 0),
            'delete_operations_count' => (int)($summary['delete_count'] ?? 0),
            'security_critical_count' => (int)($summary['security_critical_count'] ?? 0),
        ],
        'system_errors' => $recentErrors,
        'high_risk_actions' => $recentRisks,
        'recent_events_sample' => $recentEvents,
    ];
}

/**
 * Gemini function declarations (schema types are upper-case per the REST API).
 *
 * @return array<int,array<string,mixed>>
 */
function getToolDeclarations(): array {
    $dateProperty = ['type' => 'STRING', 'description' => 'วันที่รูปแบบ YYYY-MM-DD (ค.ศ.)'];

    return [[
        'functionDeclarations' => [
            [
                'name' => 'get_daily_report',
                'description' => 'รายงานเต็มของ 1 วัน: ยอดผลิต FG/Hold/Scrap รายโมเดล, รายได้, ต้นทุนวัตถุดิบมาตรฐาน (Standard BOM Material), ค่าโสหุ้ย (Overhead), กำลังพลแยกกะเช้า/กะดึก, ค่าแรง DLOT/OT, ค่าไฟ ค่าแก๊ส, กำไรขั้นต้นมาตรฐาน ใช้เมื่อผู้ใช้ถามเฉพาะวันใดวันหนึ่ง หรือถามกำลังพล หรือถามต้นทุนรวม',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => ['date' => $dateProperty],
                    'required' => ['date'],
                ],
            ],
            [
                'name' => 'get_range_report',
                'description' => 'รายงานช่วงหลายวัน (สัปดาห์ เดือน สะสมเดือนนี้ หรือช่วงใดๆ ไม่เกิน 92 วัน) พร้อมยอดรวม และรายวัน ได้แก่ ผลผลิต รายได้ ต้นทุนวัตถุดิบมาตรฐาน ค่าโสหุ้ย ค่าแรง OT พลังงาน และกำไรขั้นต้น ใช้เมื่อผู้ใช้ถามเป็นช่วงเวลา หรือถามยอดเดือน หรือเทียบแนวโน้ม',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'start_date' => $dateProperty,
                        'end_date' => $dateProperty,
                    ],
                    'required' => ['start_date', 'end_date'],
                ],
            ],
            [
                'name' => 'get_model_breakdown',
                'description' => 'ยอดผลิต FG, Hold, Scrap และรายได้แยกรายโมเดลในช่วงวันที่ที่ระบุ เรียงตามยอดผลิตมากไปน้อย ใช้เมื่อถามเรื่องโมเดล ของเสียรายโมเดล หรือสินค้าที่ขายดี',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'start_date' => $dateProperty,
                        'end_date' => $dateProperty,
                    ],
                    'required' => ['start_date', 'end_date'],
                ],
            ],
            [
                'name' => 'get_maintenance_report',
                'description' => 'รายงานแจ้งซ่อมและสถานะเครื่องจักร (PE Maintenance / Work Orders): ยอดใบงานทั้งหมด, รอดำเนินการ, ซ่อมเสร็จ, ใบงานวิกฤต (Critical/High), เครื่องจักรที่เสียบ่อยที่สุด, เวลา Downtime/เวลาซ่อมรวม และรายการแจ้งซ่อมเร่งด่วนล่าสุด ใช้เมื่อถามเรื่องเครื่องจักรเสีย, แจ้งซ่อม, ซ่อมบำรุง, PE, เครื่องจักรไหนมีปัญหา',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'start_date' => $dateProperty,
                        'end_date' => $dateProperty,
                        'line' => [
                            'type' => 'STRING',
                            'description' => 'สายการผลิตที่ต้องการกรอง เช่น PRESS, SPOT, PAINT, ASSEMBLY หรือ ALL หากไม่ระบุ',
                        ],
                    ],
                    'required' => ['start_date', 'end_date'],
                ],
            ],
            [
                'name' => 'get_system_audit_logs',
                'description' => 'ตรวจสอบบันทึกการใช้งานระบบ (System Audit & Security Logs) จากตาราง SYSTEM_LOGS: สรุปจำนวนการ Login, จำนวนผู้ใช้ที่เข้าใช้งาน (Active Users), ข้อผิดพลาดของระบบ (API_ERROR), การลบหรือแก้ไขข้อมูลสำคัญ (DELETE, UNLOCK, DEACTIVATE), รายการเหตุการณ์ล่าสุด ใช้เมื่อผู้ใช้ถามเรื่อง การใช้งานระบบ, มีใครใช้งานบ้าง, มีอะไรแปลกๆ ในระบบไหม, เช็คระบบ, ตรวจสอบความปลอดภัย หรือ Error ของระบบ',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'date' => $dateProperty,
                        'action_filter' => [
                            'type' => 'STRING',
                            'description' => 'กรองเฉพาะประเภท action เช่น ALL, LOGIN, API_ERROR, DELETE หรือเว้นว่างเพื่อดูภาพรวมทั้งหมด',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'จำนวนเหตุการณ์ล่าสุดที่ต้องการดึง (1-30, ค่าเริ่มต้น 15)',
                        ],
                    ],
                    'required' => ['date'],
                ],
            ],
        ],
    ]];
}

/**
 * Execute one model-requested tool. Never throws: failures are returned to the model as a safe error message.
 *
 * @param array<string,mixed> $arguments
 * @param array<int,string>   $scopeLog  Human-readable list of data scopes touched (shown to the user)
 * @return array<string,mixed>
 */
function executeTool(string $toolName, array $arguments, ?string $team, array &$scopeLog): array {
    try {
        if ($toolName === 'get_daily_report') {
            $date = (string)($arguments['date'] ?? '');
            $range = normalizeDateRange($date, $date);
            if (isset($range['error'])) return $range;
            $report = queryDailyReport($range[0], $team);
            $scopeLog[] = $range[0];
            return $report ?? ['error' => 'ไม่สามารถอ่านข้อมูลของวันดังกล่าวได้'];
        }

        if ($toolName === 'get_range_report' || $toolName === 'get_model_breakdown') {
            $range = normalizeDateRange((string)($arguments['start_date'] ?? ''), (string)($arguments['end_date'] ?? ''));
            if (isset($range['error'])) return $range;
            $scopeLog[] = $range[0] === $range[1] ? $range[0] : "{$range[0]} ถึง {$range[1]}";

            if ($toolName === 'get_model_breakdown') {
                return ['start_date' => $range[0], 'end_date' => $range[1], 'models' => queryModelBreakdown($range[0], $range[1], $team)];
            }
            return queryRangeReport($range[0], $range[1], $team) ?? ['error' => 'ไม่สามารถอ่านข้อมูลช่วงดังกล่าวได้'];
        }

        if ($toolName === 'get_maintenance_report') {
            $range = normalizeDateRange((string)($arguments['start_date'] ?? ''), (string)($arguments['end_date'] ?? ''));
            if (isset($range['error'])) return $range;
            $scopeLog[] = "งานซ่อมบำรุง PE {$range[0]} ถึง {$range[1]}";
            $line = isset($arguments['line']) ? (string)$arguments['line'] : null;
            return queryMaintenanceReport($range[0], $range[1], $line);
        }

        if ($toolName === 'get_system_audit_logs') {
            $date = (string)($arguments['date'] ?? '');
            $range = normalizeDateRange($date, $date);
            if (isset($range['error'])) return $range;
            $scopeLog[] = "บันทึกการใช้งานระบบ {$range[0]}";
            $actionFilter = isset($arguments['action_filter']) ? (string)$arguments['action_filter'] : 'ALL';
            $limit = isset($arguments['limit']) ? (int)$arguments['limit'] : 15;
            return querySystemAuditReport($range[0], $actionFilter, $limit) ?? ['error' => 'ไม่สามารถอ่านบันทึกระบบได้'];
        }

        return ['error' => "ไม่รู้จักเครื่องมือ {$toolName}"];
    } catch (Throwable $e) {
        error_log("[MORNING_BRIEF_AI_TOOL] {$toolName}: " . $e->getMessage());
        return ['error' => 'เกิดข้อผิดพลาดในการอ่านข้อมูลจากฐานข้อมูล'];
    }
}

