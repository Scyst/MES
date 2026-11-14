<?php
/**
 * Self-contained Multi-Month 4D Employee Grading Trend Analytics API.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input] = parseMpRequest('get_trend_data');
    requireMpAccess(true, true);

    if ($action !== 'get_trend_data') {
        throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }

    $line = trim((string)($input['line'] ?? 'ALL'));
    $hcGroup = trim((string)($input['hcGroup'] ?? 'ALL'));
    $dim = strtolower(trim((string)($input['dimension'] ?? 'overall')));
    $months = min(36, max(1, (int)($input['months'] ?? 12)));

    $colMap = [
        'overall' => 'G.grade_overall',
        'iph' => 'G.grade_iph',
        '5s' => 'G.grade_5s',
        'attendance' => 'G.grade_attendance',
        'learning' => 'G.grade_learning',
    ];
    $gradeCol = $colMap[$dim] ?? 'G.grade_overall';

    $startMonth = date('Y-m', strtotime('-' . ($months - 1) . ' months'));
    $sql = "
        SELECT TOP (2000)
            G.evaluation_period,
            E.line,
            COUNT(*) AS total,
            SUM(CASE WHEN COALESCE(NULLIF({$gradeCol}, ''), G.grade) = 'A' THEN 1 ELSE 0 END) AS count_a,
            SUM(CASE WHEN COALESCE(NULLIF({$gradeCol}, ''), G.grade) = 'B' THEN 1 ELSE 0 END) AS count_b,
            SUM(CASE WHEN COALESCE(NULLIF({$gradeCol}, ''), G.grade) = 'C' THEN 1 ELSE 0 END) AS count_c,
            SUM(CASE WHEN COALESCE(NULLIF({$gradeCol}, ''), G.grade) = 'D' THEN 1 ELSE 0 END) AS count_d
        FROM dbo.EMPLOYEE_GRADES G WITH (NOLOCK)
        INNER JOIN dbo.MANPOWER_EMPLOYEES E WITH (NOLOCK) ON G.emp_id = E.emp_id
        WHERE LEN(G.evaluation_period) = 7
          AND G.evaluation_period >= ?
    ";
    $params = [$startMonth];

    if ($line !== 'ALL' && $line !== '') {
        $sql .= ' AND E.line = ?';
        $params[] = $line;
    }
    if ($hcGroup !== 'ALL' && $hcGroup !== '' && $hcGroup !== 'undefined') {
        $sql .= ' AND E.department_api IN (SELECT department_api FROM dbo.MANPOWER_TEAM_SETTINGS WITH (NOLOCK) WHERE hc_group = ?)';
        $params[] = $hcGroup;
    }
    $sql .= ' GROUP BY G.evaluation_period, E.line ORDER BY G.evaluation_period ASC, E.line ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $periods = [];
    $byPeriodLine = [];
    $gradeDist = [];
    $allLines = [];

    foreach ($rows as $row) {
        $p = $row['evaluation_period'];
        $l = $row['line'] ?: 'OTHER';
        $periods[$p] = true;
        $allLines[$l] = true;
        $a = (int)$row['count_a'];
        $b = (int)$row['count_b'];
        $c = (int)$row['count_c'];
        $d = (int)$row['count_d'];
        $total = $a + $b + $c + $d;
        $byPeriodLine[$p][$l] = ['A' => $a, 'B' => $b, 'C' => $c, 'D' => $d, 'total' => $total];
        if (!isset($gradeDist[$p])) {
            $gradeDist[$p] = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0];
        }
        $gradeDist[$p]['A'] += $a;
        $gradeDist[$p]['B'] += $b;
        $gradeDist[$p]['C'] += $c;
        $gradeDist[$p]['D'] += $d;
    }

    $periodList = array_keys($periods);
    sort($periodList);
    $lineList = array_keys($allLines);
    sort($lineList);

    $lineSeries = [];
    foreach ($lineList as $ln) {
        $series = [];
        foreach ($periodList as $p) {
            $d = $byPeriodLine[$p][$ln] ?? null;
            $series[] = ($d && $d['total'] > 0) ? round(($d['A'] / $d['total']) * 100, 1) : null;
        }
        $lineSeries[] = ['name' => $ln, 'data' => $series];
    }

    $stackedGrades = [];
    foreach (['A', 'B', 'C', 'D'] as $g) {
        $data = [];
        foreach ($periodList as $p) {
            $data[] = $gradeDist[$p][$g] ?? 0;
        }
        $stackedGrades[] = ['name' => "Grade {$g}", 'data' => $data];
    }

    $latestPeriod = !empty($periodList) ? end($periodList) : null;
    $prevPeriod = count($periodList) >= 2 ? $periodList[count($periodList) - 2] : null;
    $comparison = [];
    foreach ($lineList as $ln) {
        $cur = $latestPeriod ? ($byPeriodLine[$latestPeriod][$ln] ?? null) : null;
        $prev = $prevPeriod ? ($byPeriodLine[$prevPeriod][$ln] ?? null) : null;
        $curPctA = ($cur && $cur['total'] > 0) ? round(($cur['A'] / $cur['total']) * 100, 1) : null;
        $prevPctA = ($prev && $prev['total'] > 0) ? round(($prev['A'] / $prev['total']) * 100, 1) : null;
        $delta = ($curPctA !== null && $prevPctA !== null) ? round($curPctA - $prevPctA, 1) : null;
        $comparison[] = [
            'line' => $ln,
            'cur' => $cur,
            'prev' => $prev,
            'pct_a_cur' => $curPctA,
            'pct_a_prev' => $prevPctA,
            'delta' => $delta,
        ];
    }

    mpJsonSuccess([
        'periods' => $periodList,
        'lines' => $lineList,
        'line_series' => $lineSeries,
        'stacked_grades' => $stackedGrades,
        'comparison' => $comparison,
        'dimension' => $dim,
        'latest_period' => $latestPeriod,
        'prev_period' => $prevPeriod,
    ]);
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_TREND_API', $e, $input);
}
