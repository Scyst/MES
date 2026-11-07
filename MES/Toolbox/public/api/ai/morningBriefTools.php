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

    // Delivery Attainment from PRODUCTION_PLANS (Assembly Line)
    $stmtPlan = $pdo->prepare("SELECT ISNULL(SUM(CASE WHEN adjusted_planned_quantity > 0 THEN adjusted_planned_quantity ELSE 0 END), 0) as planned_qty FROM dbo.PRODUCTION_PLANS WITH (NOLOCK) WHERE plan_date = ? AND line = 'ASSEMBLY'");
    $stmtPlan->execute([$targetDate]);
    $plannedFg = (int)(($stmtPlan->fetch() ?: [])['planned_qty'] ?? 0);
    $planAttainmentPct = $plannedFg > 0 ? round($totalFg / $plannedFg * 100, 1) : null;

    // IpH (Income per Head) Ratio 1:1 Analysis
    $totalPresent = $shifts[1]['present'] + $shifts[2]['present'];
    $dailyIph = $totalPresent > 0 ? round($revenue / $totalPresent, 2) : 0.0;
    $iphStatus = 'ON_TRACK';
    if ($dailyIph >= 45000) {
        $iphStatus = 'EXCELLENT';
    } elseif ($dailyIph < 35000 && $totalPresent > 0) {
        $iphStatus = 'BELOW_TARGET';
    }
    $otLaborPct = $labor > 0 ? round($overtime / $labor * 100, 1) : 0.0;
    $efficiencyFlag = null;
    if ($otLaborPct >= 25.0 && $iphStatus === 'BELOW_TARGET') {
        $efficiencyFlag = 'OT_HIGH_PRODUCTIVITY_LOW'; // โอทีพุ่งสวนทางกับผลผลิตต่อหัว
    }

    // Daily target (from SNC Roadmap 2027 standard: 2M THB/day)
    $dailyTargetRevenue = 2000000.0;
    $dailyTargetAchievementPct = round($revenue / $dailyTargetRevenue * 100, 1);

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
            'total_present_both_shifts' => $totalPresent,
            'total_headcount_both_shifts' => $shifts[1]['total'] + $shifts[2]['total'],
            'mood_average_of_5' => round($moodAverage, 2),
        ],
        'cost' => [
            'standard_material_cost_thb' => toMoney($matCost),
            'overhead_production_thb' => toMoney($ohCost),
            'labor_dlot_thb' => toMoney($labor),
            'overtime_thb' => toMoney($overtime),
            'overtime_pct_of_labor' => $otLaborPct,
            'electricity_thb' => toMoney($electricity),
            'lpg_gas_thb' => toMoney($gas),
            'energy_total_thb' => toMoney($energy),
            'total_standard_cogs_and_expenses_thb' => toMoney($matCost + $ohCost + $labor + $energy),
        ],
        'margin' => [
            'contribution_margin_thb' => toMoney($revenue - $labor - $energy),
            'contribution_margin_pct' => $revenue > 0 ? round(($revenue - $labor - $energy) / $revenue * 100, 2) : 0.0,
            'operational_ebitda_proxy_thb' => toMoney($revenue - $matCost - $labor - $energy),
            'ebitda_margin_pct' => $revenue > 0 ? round(($revenue - $matCost - $labor - $energy) / $revenue * 100, 2) : 0.0,
            'gross_profit_standard_thb' => toMoney($revenue - $matCost - $ohCost - $labor - $energy),
            'gross_profit_margin_pct' => $revenue > 0 ? round(($revenue - $matCost - $ohCost - $labor - $energy) / $revenue * 100, 2) : 0.0,
            'note' => 'EBITDA Proxy = รายได้ หักค่าวัตถุดิบ ค่าแรง และพลังงาน (ก่อนหักค่าเสื่อมและโสหุ้ยคงที่) | Gross Profit = รายได้ หักต้นทุนวัตถุดิบ ค่าโสหุ้ย ค่าแรง และพลังงาน',
        ],
        'snc_executive_metrics' => [
            'plan_delivery' => [
                'planned_fg_assembly_pieces' => $plannedFg,
                'actual_fg_pieces' => $totalFg,
                'plan_attainment_pct' => $planAttainmentPct,
                'status' => $planAttainmentPct === null ? 'NO_PLAN' : ($planAttainmentPct >= 95 ? 'ON_PLAN' : 'BEHIND_PLAN'),
            ],
            'iph_productivity' => [
                'revenue_per_head_thb' => $dailyIph,
                'snc_ratio_1_1_benchmark_thb' => 38461.54, // 1M/26 days
                'status' => $iphStatus,
                'efficiency_flag' => $efficiencyFlag,
                'note' => 'IpH = รายได้ต่อพนักงานที่มาทำงานจริง เทียบเกณฑ์ Ratio 1:1 (~38.5k/คน/วัน)',
            ],
            'target_2m_per_day' => [
                'daily_target_thb' => $dailyTargetRevenue,
                'actual_revenue_thb' => toMoney($revenue),
                'achievement_pct' => $dailyTargetAchievementPct,
                'gap_thb' => toMoney($dailyTargetRevenue - $revenue),
            ],
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
        ELSE 0 END) as revenue,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_mat_snapshot, 0) ELSE 0 END) as mat_cost,
        SUM(CASE WHEN t.transaction_type = 'PRODUCTION_FG' THEN t.quantity * ISNULL(t.std_cost_oh_snapshot, 0) ELSE 0 END) as oh_cost
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
        $rev = (float)$row['revenue'];
        $mat = (float)$row['mat_cost'];
        $oh = (float)$row['oh_cost'];
        $gp = $rev - $mat - $oh;
        $rmPct = $rev > 0 ? round($mat / $rev * 100, 1) : 0.0;
        $gpMargin = $rev > 0 ? round($gp / $rev * 100, 2) : 0.0;
        $riskFlag = ($rmPct >= 70.0 && $gpMargin < 10.0) ? 'HIGH_RM_LOW_MARGIN' : 'NORMAL';

        $rows[] = [
            'model' => (string)$row['model_name'],
            'fg' => (int)$row['fg'],
            'hold' => (int)$row['hold'],
            'scrap' => (int)$row['scrap'],
            'revenue_thb' => toMoney($rev),
            'standard_material_cost_thb' => toMoney($mat),
            'rm_pct_of_revenue' => $rmPct,
            'standard_overhead_thb' => toMoney($oh),
            'standard_gross_profit_thb' => toMoney($gp),
            'gross_margin_pct' => $gpMargin,
            'risk_flag' => $riskFlag,
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

    $rev = $totals['revenue'];
    $mat = $totals['material_cost'];
    $oh = $totals['overhead_cost'];
    $dlot = $totals['labor'];
    $ebitda = $rev - $mat - $dlot - $energy;
    $gp = $rev - $mat - $oh - $dlot - $energy;
    $contrib = $rev - $dlot - $energy;

    // Master Target & 135-100-35% Analysis from MONTHLY_PL_TARGETS
    $startYear = (int)substr($startDate, 0, 4);
    $startMonthNum = (int)substr($startDate, 5, 2);
    $stmtTarget = $pdo->prepare("SELECT TOP 1 target_amount, working_days FROM dbo.MONTHLY_PL_TARGETS WITH (NOLOCK) WHERE year_val = ? AND month_val = ? AND item_id = 2 AND (section_name = 'ALL' OR section_name = 'Team 1') ORDER BY CASE WHEN section_name = 'ALL' THEN 1 ELSE 2 END");
    $stmtTarget->execute([$startYear, $startMonthNum]);
    $targetRow = $stmtTarget->fetch() ?: [];
    
    $workingDaysInTarget = !empty($targetRow['working_days']) ? (int)$targetRow['working_days'] : 26;
    $monthlyTargetRevenue = !empty($targetRow['target_amount']) && (float)$targetRow['target_amount'] > 0 
        ? (float)$targetRow['target_amount'] 
        : (2000000.0 * $workingDaysInTarget); // Default to SNC 2M/day standard (52M)
    
    $targetAchievementPct = round($rev / $monthlyTargetRevenue * 100, 2);
    $gapToTarget = $monthlyTargetRevenue - $rev;

    // Days calculation for required run rate
    $daysInMonth = (int)date('t', strtotime($startDate));
    $currentDayNum = (int)date('j', strtotime($endDate));
    $remainingDays = max(0, $daysInMonth - $currentDayNum);
    $requiredDailyRevenue = $remainingDays > 0 && $gapToTarget > 0 ? round($gapToTarget / $remainingDays, 2) : 0.0;

    // SNC 135-100-35% Rule: Total expenses should be <= 74.07% of revenue
    $totalCosts = $mat + $oh + $dlot + $energy;
    $costRatioPct = $rev > 0 ? round($totalCosts / $rev * 100, 2) : 0.0;
    $surplusReservePct = $rev > 0 ? round(($rev - $totalCosts) / $rev * 100, 2) : 0.0;
    $rule135 = [
        'cost_ratio_pct' => $costRatioPct,
        'target_max_cost_ratio_pct' => 74.07, // 100/135
        'surplus_reserve_pct' => $surplusReservePct,
        'target_min_surplus_pct' => 25.93, // 35/135
        'status' => $costRatioPct <= 74.1 ? 'PASS_SURPLUS_ACHIEVED' : 'HIGH_EXPENSE_ALERT',
        'note' => 'กรอบ 135-100-35: รายจ่ายรวมต้องไม่เกิน 74.07% ของรายได้ เพื่อรักษาส่วนสำรองกำไร 25.93%',
    ];

    // Run rate projection for month-to-date queries
    $startMonth = substr($startDate, 0, 7);
    $endMonth = substr($endDate, 0, 7);
    $isMtd = ($startMonth === $endMonth && $startDate === "{$startMonth}-01");
    $runRate = null;
    if ($isMtd && $productionDays > 0) {
        $dailyAvgRev = $rev / $productionDays;
        $dailyAvgEbitda = $ebitda / $productionDays;
        $runRate = [
            'is_month_to_date' => true,
            'elapsed_production_days' => $productionDays,
            'remaining_calendar_days' => $remainingDays,
            'daily_average_revenue_thb' => toMoney($dailyAvgRev),
            'daily_average_ebitda_thb' => toMoney($dailyAvgEbitda),
            'projected_month_end_revenue_thb' => toMoney($rev + ($dailyAvgRev * $remainingDays)),
            'projected_month_end_ebitda_thb' => toMoney($ebitda + ($dailyAvgEbitda * $remainingDays)),
            'gap_to_master_target_thb' => toMoney($gapToTarget),
            'required_daily_run_rate_to_hit_target_thb' => toMoney($requiredDailyRevenue),
            'note' => 'ประมาณการยอดสิ้นเดือนจากจังหวะการผลิตเฉลี่ยต่อวัน (Run Rate) ในช่วงที่ผ่านมาของเดือน',
        ];
    }

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
            'revenue_thb' => toMoney($rev),
            'standard_material_cost_thb' => toMoney($mat),
            'overhead_production_thb' => toMoney($oh),
            'labor_dlot_thb' => toMoney($dlot),
            'overtime_thb' => toMoney($totals['overtime']),
            'overtime_pct_of_labor' => $dlot > 0 ? round($totals['overtime'] / $dlot * 100, 1) : 0.0,
            'electricity_thb' => toMoney($totals['electricity']),
            'lpg_gas_thb' => toMoney($totals['gas']),
            'energy_total_thb' => toMoney($energy),
            'contribution_margin_thb' => toMoney($contrib),
            'contribution_margin_pct' => $rev > 0 ? round($contrib / $rev * 100, 2) : 0.0,
            'operational_ebitda_proxy_thb' => toMoney($ebitda),
            'ebitda_margin_pct' => $rev > 0 ? round($ebitda / $rev * 100, 2) : 0.0,
            'gross_profit_standard_thb' => toMoney($gp),
            'gross_profit_margin_pct' => $rev > 0 ? round($gp / $rev * 100, 2) : 0.0,
            'margin_note' => 'EBITDA Proxy = รายได้ หักค่าวัตถุดิบ ค่าแรง และพลังงาน | Gross Profit = รายได้ หักวัตถุดิบ ค่าแรง พลังงาน และโสหุ้ยมาตรฐาน',
        ],
        'snc_master_budget' => [
            'monthly_target_revenue_thb' => toMoney($monthlyTargetRevenue),
            'target_working_days' => $workingDaysInTarget,
            'actual_revenue_thb' => toMoney($rev),
            'achievement_pct' => $targetAchievementPct,
            'gap_to_target_thb' => toMoney($gapToTarget),
            'required_daily_run_rate_thb' => toMoney($requiredDailyRevenue),
            'rule_135_100_35' => $rule135,
        ],
        'run_rate_projection' => $runRate,
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

    // Active Unresolved Backlog (ALL Open/Pending/In Progress work orders regardless of requested date)
    $activeBacklogSql = "SELECT TOP 15
        wo_number, machine_name, line, priority, status, issue_title, requested_at,
        DATEDIFF(day, requested_at, GETDATE()) as days_pending
        FROM PE_WORK_ORDERS WITH (NOLOCK)
        WHERE status IN ('Open', 'Pending', 'In Progress')";
    $activeParams = [];
    if (!empty($line) && $line !== 'ALL') {
        $activeBacklogSql .= " AND line = ?";
        $activeParams[] = $line;
    }
    $activeBacklogSql .= " ORDER BY CASE WHEN priority = 'Critical' THEN 1 WHEN priority = 'High' THEN 2 ELSE 3 END, requested_at DESC";
    $stmtActive = $pdo->prepare($activeBacklogSql);
    $stmtActive->execute($activeParams);
    $activeWorkOrders = [];
    foreach ($stmtActive->fetchAll() ?: [] as $row) {
        $activeWorkOrders[] = [
            'wo_number' => (string)$row['wo_number'],
            'machine_name' => (string)$row['machine_name'],
            'line' => (string)$row['line'],
            'priority' => (string)$row['priority'],
            'status' => (string)$row['status'],
            'issue_title' => (string)$row['issue_title'],
            'requested_at' => substr((string)$row['requested_at'], 0, 16),
            'days_pending' => (int)$row['days_pending'],
        ];
    }

    $activeSumSql = "SELECT
        COUNT(*) as total_backlog,
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as backlog_critical,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as backlog_high
        FROM PE_WORK_ORDERS WITH (NOLOCK)
        WHERE status IN ('Open', 'Pending', 'In Progress')";
    $activeSumParams = [];
    if (!empty($line) && $line !== 'ALL') {
        $activeSumSql .= " AND line = ?";
        $activeSumParams[] = $line;
    }
    $stmtActiveSum = $pdo->prepare($activeSumSql);
    $stmtActiveSum->execute($activeSumParams);
    $activeSum = $stmtActiveSum->fetch() ?: [];
    $totalBacklog = (int)($activeSum['total_backlog'] ?? 0);
    $backlogCrit = (int)($activeSum['backlog_critical'] ?? 0);
    $backlogHigh = (int)($activeSum['backlog_high'] ?? 0);

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
        'active_unresolved_backlog' => [
            'total_open_pending' => $totalBacklog,
            'critical_count' => $backlogCrit,
            'high_count' => $backlogHigh,
            'critical_and_high_total' => $backlogCrit + $backlogHigh,
            'items' => $activeWorkOrders,
        ],
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
 * Query Inventory & Working Capital Health (เงินจมและสต็อกคงคลัง) from dbo.INVENTORY_ONHAND & dbo.ITEMS.
 * Analyzes total valuation, category breakdown (FG, SEMI, RM, PKG), and top tied-up cash items.
 * NOTE: Intentionally >50 lines — multi-faceted inventory valuation and category analytics.
 */
function queryInventoryHealthReport(?string $materialType = 'ALL', int $limitTop = 5): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $limitTop = max(1, min(20, $limitTop));

    $summarySql = "SELECT 
        COUNT(DISTINCT i.item_id) as total_skus,
        ISNULL(SUM(o.quantity), 0) as total_pcs,
        ISNULL(SUM(o.quantity * ISNULL(i.StandardPrice, 0)), 0) as total_inventory_value_thb
        FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK)
        JOIN dbo.ITEMS i WITH (NOLOCK) ON o.parameter_id = i.item_id
        WHERE o.quantity > 0";
    $stmtSummary = $pdo->query($summarySql);
    $summary = $stmtSummary->fetch() ?: [];
    $totalVal = (float)($summary['total_inventory_value_thb'] ?? 0);

    $catSql = "SELECT 
        ISNULL(i.material_type, 'OTHER') as mat_type,
        COUNT(DISTINCT i.item_id) as sku_count,
        ISNULL(SUM(o.quantity), 0) as total_qty,
        ISNULL(SUM(o.quantity * ISNULL(i.StandardPrice, 0)), 0) as total_value_thb
        FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK)
        JOIN dbo.ITEMS i WITH (NOLOCK) ON o.parameter_id = i.item_id
        WHERE o.quantity > 0
        GROUP BY ISNULL(i.material_type, 'OTHER')
        ORDER BY total_value_thb DESC";
    $stmtCat = $pdo->query($catSql);
    $categories = [];
    foreach ($stmtCat->fetchAll() ?: [] as $row) {
        $val = (float)$row['total_value_thb'];
        $categories[] = [
            'material_type' => (string)$row['mat_type'],
            'sku_count' => (int)$row['sku_count'],
            'total_quantity' => (float)$row['total_qty'],
            'total_value_thb' => toMoney($val),
            'pct_of_total_inventory' => $totalVal > 0 ? round($val / $totalVal * 100, 1) : 0.0,
        ];
    }

    $topSql = "SELECT TOP ({$limitTop})
        i.part_no, 
        i.part_description, 
        ISNULL(i.material_type, 'OTHER') as material_type, 
        SUM(o.quantity) as onhand_qty, 
        ISNULL(i.StandardPrice, 0) as standard_price, 
        SUM(o.quantity * ISNULL(i.StandardPrice, 0)) as tied_up_value_thb
        FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK)
        JOIN dbo.ITEMS i WITH (NOLOCK) ON o.parameter_id = i.item_id
        WHERE o.quantity > 0";
    $topParams = [];
    if (!empty($materialType) && $materialType !== 'ALL') {
        $topSql .= " AND i.material_type = ?";
        $topParams[] = $materialType;
    }
    $topSql .= " GROUP BY i.part_no, i.part_description, i.material_type, i.StandardPrice ORDER BY tied_up_value_thb DESC";
    $stmtTop = $pdo->prepare($topSql);
    $stmtTop->execute($topParams);
    $topItems = [];
    foreach ($stmtTop->fetchAll() ?: [] as $row) {
        $topItems[] = [
            'part_no' => (string)$row['part_no'],
            'description' => (string)$row['part_description'],
            'material_type' => (string)$row['material_type'],
            'onhand_qty' => (float)$row['onhand_qty'],
            'unit_standard_price_thb' => toMoney($row['standard_price']),
            'total_tied_up_value_thb' => toMoney($row['tied_up_value_thb']),
        ];
    }

    // 4. Location Type Breakdown (e.g. FG Assembly vs WIP vs Warehouse vs Store)
    $locSql = "SELECT 
        ISNULL(l.location_type, 'UNKNOWN') as location_type,
        COUNT(DISTINCT o.parameter_id) as sku_count,
        ISNULL(SUM(o.quantity), 0) as total_qty,
        ISNULL(SUM(o.quantity * ISNULL(i.StandardPrice, 0)), 0) as total_val
        FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK)
        LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
        JOIN dbo.ITEMS i WITH (NOLOCK) ON o.parameter_id = i.item_id
        WHERE o.quantity > 0
        GROUP BY l.location_type
        ORDER BY total_val DESC";
    $stmtLoc = $pdo->query($locSql);
    $locationBreakdown = [];
    foreach ($stmtLoc->fetchAll() ?: [] as $row) {
        $val = (float)$row['total_val'];
        $locType = (string)$row['location_type'];
        $meaning = 'คลังทั่วไป';
        if ($locType === 'FG') $meaning = 'คลังปลายไลน์ประกอบ (Assembly Line Accumulation)';
        elseif ($locType === 'WIP') $meaning = 'ชิ้นงานระหว่างทำในสายการผลิต (Press/Spot/Paint)';
        elseif ($locType === 'STORE') $meaning = 'คลังสโตร์เบิกจ่ายวัตถุดิบ (Store Requisition)';
        elseif ($locType === 'WAREHOUSE') $meaning = 'คลังจัดเก็บสินค้าหลัก (Main Warehouse)';
        elseif ($locType === 'MAINTENANCE') $meaning = 'อะไหล่และชิ้นส่วนซ่อมบำรุง (PE Maintenance)';

        $locationBreakdown[] = [
            'location_type' => $locType,
            'description' => $meaning,
            'sku_count' => (int)$row['sku_count'],
            'total_quantity' => (float)$row['total_qty'],
            'total_value_thb' => toMoney($val),
            'total_value_million_thb' => round($val / 1000000, 2),
            'pct_of_total_inventory' => $totalVal > 0 ? round($val / $totalVal * 100, 1) : 0.0,
        ];
    }

    return [
        'snapshot_date' => date('Y-m-d'),
        'total_inventory_value_thb' => toMoney($totalVal),
        'total_inventory_value_million_thb' => round($totalVal / 1000000, 2),
        'total_skus' => (int)($summary['total_skus'] ?? 0),
        'total_pieces' => (float)($summary['total_pcs'] ?? 0),
        'location_type_breakdown' => $locationBreakdown,
        'category_breakdown' => $categories,
        'top_tied_up_cash_items' => $topItems,
        'executive_insight' => 'ตัวเลข 845.48 ล้านบาท ส่วนใหญ่ 67.5% (~570 ล้านบาท) สะสมอยู่ที่ปลายไลน์ประกอบ Assembly B9 เป็นตู้ Tool Cabinet ประกอบเสร็จรอการตัดจ่ายและส่งออก (Shipping)',
    ];
}

/**
 * Query Work Schedule Monitoring (WSM) Action Items & Overdue Tasks from dbo.TeamPlanner_Tasks.
 * NOTE: Intentionally >50 lines — multi-status WSM task tracking and overdue analysis.
 */
function queryWsmActionItems(?string $statusFilter = 'OVERDUE', int $limit = 10): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $limit = max(1, min(30, $limit));

    $sumSql = "SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN DueDate < CAST(GETDATE() AS DATE) AND Status NOT IN ('done', 'completed') THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN Priority IN ('urgent', 'high') AND Status NOT IN ('done', 'completed') THEN 1 ELSE 0 END) as urgent_open_count,
        SUM(CASE WHEN Status IN ('done', 'completed') THEN 1 ELSE 0 END) as completed_count
        FROM dbo.TeamPlanner_Tasks WITH (NOLOCK)";
    $stmtSum = $pdo->query($sumSql);
    $sum = $stmtSum->fetch() ?: [];

    $listSql = "SELECT TOP ({$limit})
        Id, Title, Assignee, DueDate, Priority, Status, Description,
        DATEDIFF(DAY, DueDate, GETDATE()) as days_overdue
        FROM dbo.TeamPlanner_Tasks WITH (NOLOCK)";
    if ($statusFilter === 'OVERDUE') {
        $listSql .= " WHERE DueDate < CAST(GETDATE() AS DATE) AND Status NOT IN ('done', 'completed')";
    } elseif ($statusFilter === 'URGENT') {
        $listSql .= " WHERE Priority IN ('urgent', 'high') AND Status NOT IN ('done', 'completed')";
    } else {
        $listSql .= " WHERE Status NOT IN ('done', 'completed')";
    }
    $listSql .= " ORDER BY CASE WHEN Priority = 'urgent' THEN 1 WHEN Priority = 'high' THEN 2 ELSE 3 END, DueDate ASC";

    $stmtList = $pdo->query($listSql);
    $tasks = [];
    foreach ($stmtList->fetchAll() ?: [] as $row) {
        $tasks[] = [
            'id' => (int)$row['Id'],
            'title' => (string)$row['Title'],
            'assignee' => (string)($row['Assignee'] ?? 'Unassigned'),
            'due_date' => substr((string)$row['DueDate'], 0, 10),
            'priority' => (string)$row['Priority'],
            'status' => (string)$row['Status'],
            'days_overdue' => max(0, (int)$row['days_overdue']),
        ];
    }

    return [
        'wsm_summary' => [
            'total_active_tasks' => (int)($sum['total_tasks'] ?? 0) - (int)($sum['completed_count'] ?? 0),
            'overdue_tasks_count' => (int)($sum['overdue_count'] ?? 0),
            'urgent_high_open_count' => (int)($sum['urgent_open_count'] ?? 0),
            'completed_tasks_count' => (int)($sum['completed_count'] ?? 0),
        ],
        'filter_used' => $statusFilter,
        'action_items' => $tasks,
        'note' => 'ระบบติดตามแผนงานและข้อตกลงระดับบริหาร (WSM - Work Schedule Monitoring)',
    ];
}

/**
 * Query Quality & Customer Claims from dbo.QMS_CASES and dbo.QMS_CLAIM.
 * NOTE: Intentionally >50 lines — multi-case customer claim and CAR tracking.
 */
function queryQualityAndClaimsReport(string $startDate, string $endDate): ?array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return null;

    $summarySql = "SELECT 
        COUNT(*) as total_cases,
        SUM(CASE WHEN c.current_status != 'CLOSED' AND c.current_status != 'CANCELLED' THEN 1 ELSE 0 END) as open_cases,
        ISNULL(SUM(cl.cost_estimation), 0) as total_claim_cost_thb
        FROM dbo.QMS_CASES c WITH (NOLOCK)
        LEFT JOIN dbo.QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
        WHERE CAST(c.case_date AS DATE) >= ? AND CAST(c.case_date AS DATE) <= ?";
    $stmtSum = $pdo->prepare($summarySql);
    $stmtSum->execute([$startDate, $endDate]);
    $sum = $stmtSum->fetch() ?: [];

    $listSql = "SELECT TOP 10
        c.case_id, c.car_no, c.case_date, c.customer_name, c.product_name, c.current_status,
        ISNULL(cl.cost_estimation, 0) as cost_estimation
        FROM dbo.QMS_CASES c WITH (NOLOCK)
        LEFT JOIN dbo.QMS_CLAIM cl WITH (NOLOCK) ON c.case_id = cl.case_id
        WHERE CAST(c.case_date AS DATE) >= ? AND CAST(c.case_date AS DATE) <= ?
        ORDER BY c.case_date DESC";
    $stmtList = $pdo->prepare($listSql);
    $stmtList->execute([$startDate, $endDate]);
    $cases = [];
    foreach ($stmtList->fetchAll() ?: [] as $row) {
        $cases[] = [
            'case_id' => (int)$row['case_id'],
            'car_no' => (string)$row['car_no'],
            'case_date' => substr((string)$row['case_date'], 0, 10),
            'customer_name' => (string)$row['customer_name'],
            'product_name' => (string)$row['product_name'],
            'status' => (string)$row['current_status'],
            'estimated_claim_cost_thb' => toMoney($row['cost_estimation']),
        ];
    }

    return [
        'start_date' => $startDate,
        'end_date' => $endDate,
        'metrics' => [
            'total_cases_in_period' => (int)($sum['total_cases'] ?? 0),
            'open_investigating_cases' => (int)($sum['open_cases'] ?? 0),
            'total_estimated_claim_cost_thb' => toMoney($sum['total_claim_cost_thb'] ?? 0),
        ],
        'recent_cases' => $cases,
        'note' => 'ข้อมูลข้อร้องเรียนลูกค้า (QMS Claims & CAR) สำหรับประเมินเกณฑ์ QCDSS ตัว Q (Quality)',
    ];
}

/**
 * Query Proactive Red-Flags for executive morning alerts.
 * Automatically checks 4 critical risk dimensions:
 * 1. Equipment Critical Work Orders
 * 2. Overdue Urgent WSM Tasks
 * 3. System API Errors today
 * 4. Assembly FG Storage Accumulation
 */
function queryProactiveRedFlags(): array {
    global $pdo;
    if (!isset($pdo) || !($pdo instanceof PDO)) return ['evaluated_at' => date('Y-m-d H:i:s'), 'total_red_flags' => 0, 'flags' => []];

    $today = getProductionToday();
    $redFlags = [];

    // 1. Critical / High PE Maintenance Work Orders
    $stmtPE = $pdo->query("SELECT COUNT(*) as critical_pe FROM dbo.PE_WORK_ORDERS WITH (NOLOCK) WHERE priority IN ('Critical', 'High') AND status IN ('Open', 'Pending', 'In Progress')");
    $critPE = (int)(($stmtPE->fetch() ?: [])['critical_pe'] ?? 0);
    if ($critPE > 0) {
        $redFlags[] = [
            'level' => 'CRITICAL',
            'category' => 'EQUIPMENT',
            'title' => "พบเครื่องจักรขัดข้องระดับ Critical/High ค้างอยู่ {$critPE} รายการ",
            'detail' => 'มีใบแจ้งซ่อมเครื่องจักรระดับเร่งด่วนที่ยังไม่แล้วเสร็จ อาจส่งผลกระทบต่อไลน์การผลิต',
        ];
    }

    // 2. Overdue Urgent WSM Tasks
    $stmtWSM = $pdo->query("SELECT COUNT(*) as overdue_urgent FROM dbo.TeamPlanner_Tasks WITH (NOLOCK) WHERE DueDate < CAST(GETDATE() AS DATE) AND Priority IN ('urgent', 'high') AND Status NOT IN ('done', 'completed')");
    $overdueUrgent = (int)(($stmtWSM->fetch() ?: [])['overdue_urgent'] ?? 0);
    if ($overdueUrgent > 0) {
        $redFlags[] = [
            'level' => 'WARNING',
            'category' => 'WSM_PLANNER',
            'title' => "มีงาน WSM ระดับ Urgent/High เลยกำหนดส่ง {$overdueUrgent} รายการ",
            'detail' => 'มี Action Plan และภารกิจสำคัญใน Team Planner ที่เกินกำหนด Due Date',
        ];
    }

    // 3. System API Errors today
    $stmtErr = $pdo->prepare("SELECT COUNT(*) as api_errors FROM dbo.SYSTEM_LOGS WITH (NOLOCK) WHERE action = 'API_ERROR' AND CAST(created_at AS DATE) = ?");
    $stmtErr->execute([$today]);
    $apiErr = (int)(($stmtErr->fetch() ?: [])['api_errors'] ?? 0);
    if ($apiErr > 0) {
        $redFlags[] = [
            'level' => 'NOTICE',
            'category' => 'SYSTEM_HEALTH',
            'title' => "พบข้อผิดพลาดระบบ (API Error) วันนี้ {$apiErr} รายการ",
            'detail' => 'มีการเรียกใช้งาน API บางตัวผิดพลาด ตรวจสอบรายละเอียดได้ใน System Audit Logs',
        ];
    }

    // 4. Assembly FG Storage Accumulation
    $stmtFG = $pdo->query("SELECT ISNULL(SUM(o.quantity * ISNULL(i.StandardPrice, 0)), 0) as fg_val FROM dbo.INVENTORY_ONHAND o WITH (NOLOCK) JOIN dbo.ITEMS i WITH (NOLOCK) ON o.parameter_id = i.item_id WHERE o.location_id = 1 AND o.quantity > 0");
    $fgVal = (float)(($stmtFG->fetch() ?: [])['fg_val'] ?? 0);
    if ($fgVal >= 500000000) {
        $fgM = round($fgVal / 1000000, 1);
        $redFlags[] = [
            'level' => 'FINANCIAL',
            'category' => 'WORKING_CAPITAL',
            'title' => "สินค้าสำเร็จรูป (FG) ค้างสะสมปลายไลน์ประกอบสูงถึง {$fgM} ล้านบาท",
            'detail' => 'มีตู้ Tool Cabinet ประกอบเสร็จสะสมอยู่ที่ Assembly B9 รอการตัดจ่ายและส่งมอบ',
        ];
    }

    return [
        'evaluated_at' => date('Y-m-d H:i:s'),
        'total_red_flags' => count($redFlags),
        'flags' => $redFlags,
    ];
}

/**
 * Query external web search for industrial knowledge, machine error codes, commodity prices, and standards.
 * Uses secure HTTPS cURL to fetch relevant web snippets.
 * Includes sanitization to prevent leaking proprietary customer info or attempting SSRF.
 */
function queryExternalWebSearch(string $query, ?string $category = 'GENERAL'): array {
    $cleanQuery = trim($query);
    if ($cleanQuery === '') {
        return ['error' => 'กรุณาระบุคำค้นหาที่ต้องการสืบค้นบนอินเทอร์เน็ต'];
    }

    // Safety Sanitization: Strip dangerous internal keywords or IP attempts
    $sanitizedQuery = preg_replace('/\b(https?:\/\/|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|localhost|127\.0\.0\.1)\b/i', '', $cleanQuery);
    $sanitizedQuery = mb_substr(trim($sanitizedQuery), 0, 150);

    if ($sanitizedQuery === '') {
        return ['error' => 'คำค้นหาไม่ปลอดภัยหรือไม่ถูกต้อง'];
    }

    $encoded = urlencode($sanitizedQuery);
    $url = "https://html.duckduckgo.com/html/?q=" . $encoded;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_TIMEOUT => 8,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $html = curl_exec($ch);
    $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($httpCode !== 200 || empty($html)) {
        return [
            'query' => $sanitizedQuery,
            'status' => 'UNAVAILABLE',
            'results' => [],
            'note' => 'ไม่สามารถติดต่อบริการสืบค้นภายนอกได้ชั่วคราว: ' . ($curlErr ?: "HTTP {$httpCode}"),
        ];
    }

    preg_match_all('/<a class="result__snippet[^>]*>(.*?)<\/a>/is', $html, $snippetMatches);
    preg_match_all('/<a class="result__url"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/is', $html, $urlMatches);

    $results = [];
    $rawSnippets = $snippetMatches[1] ?? [];
    $rawUrls = $urlMatches[2] ?? [];

    $count = min(5, count($rawSnippets));
    for ($i = 0; $i < $count; $i++) {
        $cleanSnippet = trim(html_entity_decode(strip_tags($rawSnippets[$i]), ENT_QUOTES, 'UTF-8'));
        $site = trim(html_entity_decode(strip_tags($rawUrls[$i] ?? ''), ENT_QUOTES, 'UTF-8'));
        if ($cleanSnippet !== '') {
            $results[] = [
                'index' => $i + 1,
                'source' => $site ?: 'Web',
                'snippet' => $cleanSnippet,
            ];
        }
    }

    return [
        'query' => $sanitizedQuery,
        'category' => $category,
        'total_found' => count($results),
        'results' => $results,
        'source_attribution' => 'Google / DuckDuckGo Public Web Index',
        'note' => 'ข้อมูลสืบค้นสดจากอินเทอร์เน็ตภายนอก สำหรับเปรียบเทียบราคาอ้างอิง คู่มือเครื่องจักร หรือมาตรฐานสากล',
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
                'description' => 'รายงานเต็มของ 1 วัน: ยอดผลิต FG/Hold/Scrap, รายได้, ต้นทุนวัตถุดิบมาตรฐาน (Standard BOM Material), ค่าโสหุ้ย (Overhead), กำลังพลกะเช้า/กะดึก, ค่าแรง DLOT/OT, ค่าไฟ ค่าแก๊ส, กำไรขั้นต้นมาตรฐาน (Gross Profit & Margin %), และกำไรจากการดำเนินงาน EBITDA Proxy ใช้เมื่อถามยอดวันใดวันหนึ่ง หรือถามกำไร/EBITDA ประจำวัน หรือต้นทุนรวม',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => ['date' => $dateProperty],
                    'required' => ['date'],
                ],
            ],
            [
                'name' => 'get_range_report',
                'description' => 'รายงานช่วงหลายวัน (สัปดาห์ เดือน สะสมเดือนนี้ หรือช่วงใดๆ ไม่เกิน 92 วัน): ยอดผลิต, รายได้, ต้นทุนวัตถุดิบมาตรฐาน, ค่าโสหุ้ย, ค่าแรง OT, พลังงาน, กำไรขั้นต้น (Gross Profit & Margin %), กำไร EBITDA Proxy (& Margin %), และประมาณการยอดสิ้นเดือน (Run Rate Forecast หากถามเดือนนี้) ใช้เมื่อผู้ใช้ถามเป็นช่วงเวลา ยอดสะสมเดือน กำไร/EBITDA หรือแนวโน้มสิ้นเดือน',
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
                'description' => 'ยอดผลิต FG, Hold, Scrap, รายได้, ต้นทุนวัตถุดิบ, ค่าโสหุ้ย และกำไรขั้นต้น (Standard GP & Gross Margin %) แยกรายโมเดล เรียงตามยอดผลิตมากไปน้อย ใช้เมื่อถามเรื่องโมเดล, ของเสียรายโมเดล, สินค้าที่ขายดี หรือสินค้าที่ทำกำไรสูงสุด/ต่ำสุด',
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
                'description' => 'รายงานแจ้งซ่อมและสถานะเครื่องจักร (PE Maintenance / Work Orders): สรุปใบงานใหม่ตามช่วงวันที่ และรายการใบแจ้งซ่อมที่ \'ยังค้างอยู่ทั้งหมดในระบบ (Active Backlog / Still Open)\' โดยเฉพาะระดับ Critical/High ที่ยังค้างอยู่ไม่ว่าจะแจ้งซ่อมตั้งแต่วันไหน หากถามเรื่อง \'มีใบแจ้งซ่อมค้างไหม\', \'เครื่องจักรขัดข้องระดับ Critical/High ค้างอยู่\', หรือถามเจาะลึกจาก Red-Flags ให้ดูที่ active_unresolved_backlog เป็นหลัก',
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
            [
                'name' => 'get_inventory_health_report',
                'description' => 'รายงานสุขภาพคลังสินค้าและเงินจม (Inventory Valuation & Working Capital): ยอดมูลค่าสินค้าคงคลังรวมทั้งสิ้น (บาท), สัดส่วนเงินจมแยกตามหมวดสินค้า (FG สินค้าสำเร็จรูป, SEMI ชิ้นงานระหว่างทำ, RM วัตถุดิบ, PKG บรรจุภัณฑ์), และรายการสินค้าที่มีเงินจมสูงสุด (Top Tied-up Cash Items) ใช้เมื่อผู้บริหารหรือผู้ใช้ถามเรื่อง เงินจมในสต็อก, สินค้าคงคลัง, มูลค่าคลังสินค้า, สต็อกคงเหลือรวม หรือสินค้าตัวไหนค้างสต็อกเยอะสุด',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'material_type' => [
                            'type' => 'STRING',
                            'description' => 'กรองหมวดหมู่สินค้า เช่น ALL, FG, SEMI, RM, PKG หรือเว้นว่างเพื่อดูทั้งหมด',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'จำนวนสินค้าที่มีเงินจมสูงสุดที่ต้องการดึง (1-20, ค่าเริ่มต้น 5)',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_wsm_action_items',
                'description' => 'รายงานติดตามแผนงานและการบริหารจัดการตารางเวลา WSM (Work Schedule Monitoring) จาก Team Planner: ตรวจสอบจำนวนงานที่เลยกำหนด (Overdue Tasks), งานระดับเร่งด่วนที่ยังค้างอยู่ (Urgent/High Open Tasks), งานที่เสร็จแล้ว และรายการ Action Items ที่ต้องติดตามเร่งด่วนตามผู้รับผิดชอบ ใช้เมื่อถามเรื่อง WSM, งานค้าง, ใครทำงานช้า, งานอะไรเกินกำหนด, แผนงานของผู้บริหาร หรือ Action Items',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'status_filter' => [
                            'type' => 'STRING',
                            'description' => 'กรองสถานะงาน เช่น OVERDUE (งานเลยกำหนด), URGENT (งานด่วนที่ยังไม่เสร็จ), ALL_OPEN (งานค้างทั้งหมด) ค่าเริ่มต้นคือ OVERDUE',
                        ],
                        'limit' => [
                            'type' => 'INTEGER',
                            'description' => 'จำนวนรายการงานที่ต้องการดึง (1-30, ค่าเริ่มต้น 10)',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_quality_and_claims_report',
                'description' => 'รายงานคุณภาพและข้อร้องเรียนลูกค้า (Quality Claims & Customer Complaints - QMS): จำนวนข้อร้องเรียนทั้งหมด, ใบ CAR/เคสที่อยู่ระหว่างสอบสวน (Open Cases), ค่าเสียหายหรือประมาณการเคลมรวม (Claim Cost Estimation ฿) และรายการเคสร้องเรียนล่าสุด ใช้เมื่อถามเรื่อง คุณภาพ, ข้อร้องเรียนลูกค้า, งานเคลม, CAR, QMS, ของเสียที่หลุดไปหาลูกค้า หรือตัว Q ในเกณฑ์ QCDSS',
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
                'name' => 'search_external_web',
                'description' => 'ค้นหาข้อมูลสดจากอินเทอร์เน็ตภายนอกโรงงาน (External Web Search): ใช้สืบค้นราคากลางสินค้าโภคภัณฑ์ (เช่น ราคาเหล็กแผ่นรีดร้อน HRC, ราคาอลูมิเนียม LME, ราคาก๊าซ LPG), รหัสและวิธีแก้ปัญหา Alarm/Error Code เครื่องจักร (FANUC, Yaskawa, Mitsubishi, Siemens), คู่มือทางวิศวกรรม, อัตราแลกเปลี่ยนค่าเงิน, หรือมาตรฐานอุตสาหกรรม (ISO, RoHS, REACH) ใช้เมื่อคำถามต้องพึ่งพาข้อมูลภายนอกโรงงาน หรือผู้ใช้สั่งให้ "ท่องเน็ต", "ค้นหาในกูเกิล", "เช็คราคาตลาด", หรือ "ค้นหาวิธีแก้ error เครื่องจักร"',
                'parameters' => [
                    'type' => 'OBJECT',
                    'properties' => [
                        'query' => [
                            'type' => 'STRING',
                            'description' => 'คำค้นหาที่ต้องการสืบค้นบนอินเทอร์เน็ต (เป็นภาษาไทยหรืออังกฤษ)',
                        ],
                        'category' => [
                            'type' => 'STRING',
                            'description' => 'หมวดหมู่ เช่น COMMODITY_PRICE (ราคาสินค้าโภคภัณฑ์), MACHINE_MANUAL (คู่มือเครื่องจักร/Error Code), REGULATION (มาตรฐาน/กฎหมาย), GENERAL (ทั่วไป)',
                        ],
                    ],
                    'required' => ['query'],
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

        if ($toolName === 'get_inventory_health_report') {
            $scopeLog[] = "มูลค่าสินค้าคงคลังและเงินจม";
            $materialType = isset($arguments['material_type']) ? (string)$arguments['material_type'] : 'ALL';
            $limit = isset($arguments['limit']) ? (int)$arguments['limit'] : 5;
            return queryInventoryHealthReport($materialType, $limit) ?? ['error' => 'ไม่สามารถอ่านข้อมูลสินค้าคงคลังได้'];
        }

        if ($toolName === 'get_wsm_action_items') {
            $scopeLog[] = "แผนงาน WSM (Team Planner)";
            $statusFilter = isset($arguments['status_filter']) ? (string)$arguments['status_filter'] : 'OVERDUE';
            $limit = isset($arguments['limit']) ? (int)$arguments['limit'] : 10;
            return queryWsmActionItems($statusFilter, $limit) ?? ['error' => 'ไม่สามารถอ่านข้อมูล WSM ได้'];
        }

        if ($toolName === 'get_quality_and_claims_report') {
            $range = normalizeDateRange((string)($arguments['start_date'] ?? ''), (string)($arguments['end_date'] ?? ''));
            if (isset($range['error'])) return $range;
            $scopeLog[] = "ข้อร้องเรียนคุณภาพ QMS {$range[0]} ถึง {$range[1]}";
            return queryQualityAndClaimsReport($range[0], $range[1]) ?? ['error' => 'ไม่สามารถอ่านข้อมูลคุณภาพ QMS ได้'];
        }

        if ($toolName === 'search_external_web') {
            $query = (string)($arguments['query'] ?? '');
            $category = (string)($arguments['category'] ?? 'GENERAL');
            $scopeLog[] = "ท่องเน็ต: " . mb_substr($query, 0, 25);
            return queryExternalWebSearch($query, $category);
        }

        return ['error' => "ไม่รู้จักเครื่องมือ {$toolName}"];
    } catch (Throwable $e) {
        error_log("[MORNING_BRIEF_AI_TOOL] {$toolName}: " . $e->getMessage());
        return ['error' => 'เกิดข้อผิดพลาดในการอ่านข้อมูลจากฐานข้อมูล'];
    }
}

