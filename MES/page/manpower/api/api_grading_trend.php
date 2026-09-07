<?php
// page/manpower/api/api_grading_trend.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json');

if (!hasPermission('manage_manpower')) {
    echo json_encode(['success' => false, 'message' => 'Permission denied.']);
    exit;
}

$action  = $_GET['action'] ?? 'get_trend_data';
$months  = max(3, min(24, (int)($_GET['months'] ?? 12)));
$line    = $_GET['line']    ?? 'ALL';
$hcGroup = $_GET['hcGroup'] ?? 'ALL';
$dim     = $_GET['dimension'] ?? 'overall'; // iph | 5s | attendance | learning | overall

// Map dimension to column name
$dimColMap = [
    'iph'        => 'grade_iph',
    '5s'         => 'grade_5s',
    'attendance' => 'grade_attendance',
    'learning'   => 'grade_learning',
    'overall'    => 'grade_overall',
];
$gradeCol = $dimColMap[$dim] ?? 'grade_overall';

try {
    if ($action === 'get_trend_data') {
        // Generate list of last N months
        $periods = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $periods[] = date('Y-m', strtotime("-$i months"));
        }
        $periodList = "'" . implode("','", $periods) . "'";

        // Build employee filter subquery
        $empFilter = "WHERE EG.evaluation_period IN ($periodList)";
        if ($line !== 'ALL') {
            $empFilter .= " AND EXISTS (SELECT 1 FROM dbo.MANPOWER_EMPLOYEES ME WHERE ME.emp_id = EG.emp_id AND ME.line = :line)";
        }
        if ($hcGroup !== 'ALL') {
            $empFilter .= " AND EXISTS (SELECT 1 FROM dbo.MANPOWER_EMPLOYEES ME
                INNER JOIN dbo.MANPOWER_TEAM_SETTINGS TS ON ME.department_api = TS.department_api
                WHERE ME.emp_id = EG.emp_id AND TS.hc_group = :hcGroup)";
        }

        $sql = "
            SELECT
                EG.evaluation_period,
                ME.line,
                EG.$gradeCol AS grade_value,
                COUNT(*) AS cnt
            FROM dbo.EMPLOYEE_GRADES EG WITH (NOLOCK)
            INNER JOIN dbo.MANPOWER_EMPLOYEES ME WITH (NOLOCK) ON EG.emp_id = ME.emp_id COLLATE Thai_CI_AS
            $empFilter
              AND EG.$gradeCol IS NOT NULL
              AND EG.$gradeCol != ''
            GROUP BY EG.evaluation_period, ME.line, EG.$gradeCol
            ORDER BY EG.evaluation_period ASC, ME.line ASC
        ";

        $params = [];
        if ($line !== 'ALL')    $params[':line']    = $line;
        if ($hcGroup !== 'ALL') $params[':hcGroup'] = $hcGroup;

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Aggregate: by period x line
        $byPeriodLine = [];
        $allLines     = [];
        $gradeDist    = []; // global: period -> grade -> count

        foreach ($rows as $row) {
            $p = $row['evaluation_period'];
            $l = $row['line'] ?? 'Unknown';
            $g = $row['grade_value'];
            $c = (int)$row['cnt'];

            if (!isset($byPeriodLine[$p][$l])) {
                $byPeriodLine[$p][$l] = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'total' => 0];
            }
            if (in_array($g, ['A', 'B', 'C', 'D'])) {
                $byPeriodLine[$p][$l][$g]    += $c;
                $byPeriodLine[$p][$l]['total'] += $c;
            }

            if (!isset($gradeDist[$p])) $gradeDist[$p] = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'total' => 0];
            if (in_array($g, ['A', 'B', 'C', 'D'])) {
                $gradeDist[$p][$g]     += $c;
                $gradeDist[$p]['total'] += $c;
            }

            $allLines[$l] = true;
        }

        $allLines = array_keys($allLines);
        sort($allLines);

        // Build series: pct A per line per period, and overall stacked
        $lineSeries = []; // line -> [period -> %A]
        foreach ($allLines as $l) {
            $series = [];
            foreach ($periods as $p) {
                $d = $byPeriodLine[$p][$l] ?? null;
                $pctA = ($d && $d['total'] > 0) ? round(($d['A'] / $d['total']) * 100, 1) : null;
                $series[] = $pctA;
            }
            $lineSeries[] = ['name' => $l, 'data' => $series];
        }

        // Grade distribution stacked by period (global)
        $stackedGrades = [];
        foreach (['A', 'B', 'C', 'D'] as $g) {
            $data = [];
            foreach ($periods as $p) {
                $data[] = $gradeDist[$p][$g] ?? 0;
            }
            $stackedGrades[] = ['name' => "Grade $g", 'data' => $data];
        }

        // Latest vs previous month comparison per line
        $latestPeriod   = end($periods);
        $prevPeriod     = count($periods) >= 2 ? $periods[count($periods) - 2] : null;
        $comparison = [];
        foreach ($allLines as $l) {
            $cur  = $byPeriodLine[$latestPeriod][$l] ?? null;
            $prev = $prevPeriod ? ($byPeriodLine[$prevPeriod][$l] ?? null) : null;
            $curPctA  = ($cur  && $cur['total']  > 0) ? round(($cur['A']  / $cur['total'])  * 100, 1) : null;
            $prevPctA = ($prev && $prev['total'] > 0) ? round(($prev['A'] / $prev['total']) * 100, 1) : null;
            $delta = ($curPctA !== null && $prevPctA !== null) ? round($curPctA - $prevPctA, 1) : null;
            $comparison[] = [
                'line'      => $l,
                'cur'       => $cur,
                'prev'      => $prev,
                'pct_a_cur' => $curPctA,
                'pct_a_prev'=> $prevPctA,
                'delta'     => $delta,
            ];
        }

        echo json_encode([
            'success'       => true,
            'periods'       => $periods,
            'lines'         => $allLines,
            'line_series'   => $lineSeries,
            'stacked_grades'=> $stackedGrades,
            'comparison'    => $comparison,
            'dimension'     => $dim,
            'latest_period' => $latestPeriod,
            'prev_period'   => $prevPeriod,
        ]);
        exit;
    }

    throw new Exception("Invalid action.");

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
