<?php
/**
 * Self-contained Accessories Inspection Log & Image Resolver API for Toolbox SPA.
 * Replaces legacy page/AccessoriesInspection/api/inspectionAPI.php.
 */

if (isset($_GET['action']) && $_GET['action'] === 'get_image') {
    define('ACCESSORIES_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];

/** Validates strict SQL-safe YYYY-MM-DD date within 1753..9999, or returns false. */
function isValidAccessoriesDate(string $date): bool {
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m)) {
        return false;
    }
    $y = (int)$m[1];
    $mo = (int)$m[2];
    $d = (int)$m[3];
    return $y >= 1753 && $y <= 9999 && checkdate($mo, $d, $y);
}

/** Computes MES production date boundary (before 08:00 counts toward yesterday). */
function resolveAccessoriesProdDate(): string {
    $hour = (int)date('G');
    return ($hour < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
}

/** Resolves shift window and shared SQL WHERE clause + bound parameters. */
function resolveAccessoriesQueryWindow(array $input): array {
    $rawDate = trim((string)($input['date'] ?? ''));
    $date = ($rawDate !== '' && isValidAccessoriesDate($rawDate))
        ? $rawDate
        : resolveAccessoriesProdDate();

    $shift = strtolower(trim((string)($input['shift'] ?? 'all')));
    if (!in_array($shift, ['all', 'day', 'night'], true)) {
        $shift = 'all';
    }
    $resultFilter = strtolower(trim((string)($input['result'] ?? 'all')));
    $search = trim((string)($input['search'] ?? ''));

    $nextDate = date('Y-m-d', strtotime($date . ' +1 day'));
    if ($shift === 'day') {
        $rangeStart = "{$date} 08:00:00";
        $rangeEnd = "{$date} 20:00:00";
    } elseif ($shift === 'night') {
        $rangeStart = "{$date} 20:00:00";
        $rangeEnd = "{$nextDate} 08:00:00";
    } else {
        $rangeStart = "{$date} 08:00:00";
        $rangeEnd = "{$nextDate} 08:00:00";
    }

    $where = ["TIME_STAMP >= ? AND TIME_STAMP < ?"];
    $params = [$rangeStart, $rangeEnd];

    if ($resultFilter === 'ok') {
        $where[] = "LOWER(RESULT) = 'ok'";
    } elseif ($resultFilter === 'alarm') {
        $where[] = "LOWER(RESULT) <> 'ok'";
    }
    if ($search !== '') {
        $where[] = "(MODEL LIKE ? OR IMAGE LIKE ?)";
        $kw = "%{$search}%";
        $params[] = $kw;
        $params[] = $kw;
    }

    return [
        'date' => $date,
        'shift' => $shift,
        'range_start' => $rangeStart,
        'range_end' => $rangeEnd,
        'where_sql' => implode(' AND ', $where),
        'params' => $params,
    ];
}

/** Executes paginated or bounded inspection query with graceful fallback when S1 columns are absent. */
function queryInspectionRowsWithS1(PDO $pdo, string $colsWithS1, string $colsBase, string $whereSql, array $params, ?int $offset = null, ?int $limit = null, string $prefixTop = ''): array {
    $run = static function (string $cols) use ($pdo, $whereSql, $params, $offset, $limit, $prefixTop): array {
        $sql = "SELECT {$prefixTop} {$cols} FROM dbo.ACCESSORIES_INSPECTION_LOG WITH (NOLOCK) WHERE {$whereSql} ORDER BY ID DESC";
        if ($offset !== null && $limit !== null) {
            $sql .= " OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
        }
        $stmt = $pdo->prepare($sql);
        $idx = 1;
        foreach ($params as $val) {
            $stmt->bindValue($idx++, $val, PDO::PARAM_STR);
        }
        if ($offset !== null && $limit !== null) {
            $stmt->bindValue($idx++, $offset, PDO::PARAM_INT);
            $stmt->bindValue($idx++, $limit, PDO::PARAM_INT);
        }
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    };

    try {
        return [$run($colsWithS1), true];
    } catch (PDOException $e) {
        return [$run($colsBase), false];
    }
}

try {
    [$action, $input, $currentUser] = parseAccessoriesRequest('get_logs');

    switch ($action) {
        case 'get_config_status': {
            $cfg = getAccessoriesCameraConfig();
            accessoriesJsonSuccess([
                'cam_configured' => $cfg['configured'],
                'can_control' => canControlAccessoriesCam(),
            ], 'Configuration status loaded');
            break;
        }

        case 'get_logs': {
            $win = resolveAccessoriesQueryWindow($input);
            $page = max(1, (int)($input['page'] ?? 1));
            $limit = max(20, min(500, (int)($input['limit'] ?? 200)));
            $offset = ($page - 1) * $limit;

            $whereSql = $win['where_sql'];
            $params = $win['params'];

            $sumStmt = $pdo->prepare("
                SELECT COUNT(*) AS total_count,
                       SUM(CASE WHEN LOWER(RESULT) = 'ok' THEN 1 ELSE 0 END) AS ok_count,
                       SUM(CASE WHEN LOWER(RESULT) <> 'ok' THEN 1 ELSE 0 END) AS alarm_count,
                       AVG(CAST(ELAPSED_S AS FLOAT)) AS avg_elapsed_s
                FROM dbo.ACCESSORIES_INSPECTION_LOG WITH (NOLOCK)
                WHERE {$whereSql}
            ");
            $sumStmt->execute($params);
            $summaryRow = $sumStmt->fetch(PDO::FETCH_ASSOC) ?: [];

            $hourlyStmt = $pdo->prepare("
                SELECT LEFT(CONVERT(VARCHAR(19), TIME_STAMP, 120), 13) AS hour_key,
                       DATEPART(HOUR, TIME_STAMP) AS hour_num,
                       COUNT(*) AS total_count,
                       SUM(CASE WHEN LOWER(RESULT) = 'ok' THEN 1 ELSE 0 END) AS ok_count,
                       SUM(CASE WHEN LOWER(RESULT) <> 'ok' THEN 1 ELSE 0 END) AS alarm_count
                FROM dbo.ACCESSORIES_INSPECTION_LOG WITH (NOLOCK)
                WHERE {$whereSql}
                GROUP BY LEFT(CONVERT(VARCHAR(19), TIME_STAMP, 120), 13), DATEPART(HOUR, TIME_STAMP)
                ORDER BY hour_key DESC
            ");
            $hourlyStmt->execute($params);
            $hourlyRows = $hourlyStmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $baseCols = "ID AS id,
                       MODEL AS model,
                       CONVERT(VARCHAR(19), TIME_STAMP, 120) AS timestamp,
                       LOWER(ISNULL(RESULT, '')) AS result,
                       CAST(ISNULL(ELAPSED_S, 0) AS FLOAT) AS elapsed_s,
                       ISNULL(IMAGE, '') AS image";
            $s1Cols = $baseCols . ",
                       CONVERT(VARCHAR(23), S1_IN_TIME, 121) AS s1_in,
                       CONVERT(VARCHAR(23), S1_OUT_TIME, 121) AS s1_out";

            [$rows, $s1Available] = queryInspectionRowsWithS1($pdo, $s1Cols, $baseCols, $whereSql, $params, $offset, $limit);

            // When browsing Page 2+, fetch the immediate newer row's s1_in so row 0 Idle computes seamlessly
            $newerS1In = null;
            if ($offset > 0 && $s1Available) {
                [$peekRows] = queryInspectionRowsWithS1(
                    $pdo,
                    "CONVERT(VARCHAR(23), S1_IN_TIME, 121) AS s1_in",
                    "NULL AS s1_in",
                    $whereSql,
                    $params,
                    $offset - 1,
                    1
                );
                $newerS1In = $peekRows[0]['s1_in'] ?? null;
            }

            $totalCount = (int)($summaryRow['total_count'] ?? 0);

            accessoriesJsonSuccess([
                'date' => $win['date'],
                'shift' => $win['shift'],
                'range_start' => $win['range_start'],
                'range_end' => $win['range_end'],
                's1_available' => $s1Available,
                'newer_s1_in' => $newerS1In,
                'summary' => [
                    'total' => $totalCount,
                    'ok' => (int)($summaryRow['ok_count'] ?? 0),
                    'alarm' => (int)($summaryRow['alarm_count'] ?? 0),
                    'avg_elapsed_s' => round((float)($summaryRow['avg_elapsed_s'] ?? 0), 2),
                ],
                'hourly' => array_map(static function (array $h): array {
                    return [
                        'hour_key' => $h['hour_key'],
                        'hour_num' => (int)$h['hour_num'],
                        'total' => (int)$h['total_count'],
                        'ok' => (int)$h['ok_count'],
                        'alarm' => (int)$h['alarm_count'],
                    ];
                }, $hourlyRows),
                'rows' => $rows,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total_rows' => $totalCount,
                    'total_pages' => max(1, (int)ceil($totalCount / $limit)),
                ],
            ], 'Inspection logs loaded');
            break;
        }

        case 'get_chart_data': {
            $win = resolveAccessoriesQueryWindow($input);
            $baseCols = "MODEL AS model,
                       CONVERT(VARCHAR(19), TIME_STAMP, 120) AS timestamp,
                       LOWER(ISNULL(RESULT, '')) AS result";
            $s1Cols = $baseCols . ",
                       CONVERT(VARCHAR(23), S1_IN_TIME, 121) AS s1_in,
                       CONVERT(VARCHAR(23), S1_OUT_TIME, 121) AS s1_out";

            [$rows, $s1Available] = queryInspectionRowsWithS1(
                $pdo,
                $s1Cols,
                $baseCols,
                $win['where_sql'],
                $win['params'],
                null,
                null,
                'TOP 3000'
            );

            accessoriesJsonSuccess([
                'date' => $win['date'],
                'shift' => $win['shift'],
                'range_start' => $win['range_start'],
                'range_end' => $win['range_end'],
                's1_available' => $s1Available,
                'rows' => $rows,
            ], 'Chart analytics loaded');
            break;
        }

        case 'get_image': {
            $file = basename((string)($input['file'] ?? ''));
            if (!preg_match('/^[A-Za-z0-9._-]+\.(jpg|jpeg|png)$/i', $file)) {
                accessoriesJsonError('ชื่อไฟล์รูปภาพไม่ถูกต้อง', 400);
            }

            $candidates = [
                __DIR__ . '/../../../MES/MES/page/AccessoriesInspection/img/' . $file,
                __DIR__ . '/../../uploads/accessories_inspection/' . $file,
                __DIR__ . '/../../../MES/MES/uploads/accessories_inspection/' . $file,
                __DIR__ . '/../../../page/AccessoriesInspection/img/' . $file,
            ];

            foreach ($candidates as $localPath) {
                if (is_file($localPath) && is_readable($localPath)) {
                    $ext = strtolower(pathinfo($localPath, PATHINFO_EXTENSION));
                    header('Content-Type: ' . ($ext === 'png' ? 'image/png' : 'image/jpeg'));
                    header('Cache-Control: private, max-age=86400');
                    header('Content-Length: ' . (string)filesize($localPath));
                    readfile($localPath);
                    exit;
                }
            }

            // Fallback: proxy from AI camera node if upstream is configured
            $cfg = getAccessoriesCameraConfig();
            if ($cfg['configured'] && function_exists('curl_init')) {
                session_write_close();
                $url = $cfg['upstream'] . '/images/' . rawurlencode($file);
                $ch = curl_init($url);
                $hdrs = ['Accept: image/*'];
                if ($cfg['api_key'] !== '') {
                    $hdrs[] = 'X-Internal-Key: ' . $cfg['api_key'];
                }
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 5,
                    CURLOPT_CONNECTTIMEOUT => 3,
                    CURLOPT_HTTPHEADER => $hdrs,
                ]);
                $imgBytes = curl_exec($ch);
                $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $ctype = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                curl_close($ch);

                if ($imgBytes !== false && $httpCode === 200 && strlen($imgBytes) > 0) {
                    header('Content-Type: ' . ($ctype !== '' ? $ctype : 'image/jpeg'));
                    header('Cache-Control: private, max-age=86400');
                    header('Content-Length: ' . (string)strlen($imgBytes));
                    echo $imgBytes;
                    exit;
                }
            }

            accessoriesJsonError('ไม่พบไฟล์รูปภาพผลการตรวจสอบ', 404);
            break;
        }

        default:
            accessoriesJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'ACCESSORIES_INSPECTION', $e->getMessage(), ['action' => $action]);
    accessoriesJsonError('ไม่สามารถดึงข้อมูลระบบตรวจสอบชิ้นส่วนได้ กรุณาลองใหม่อีกครั้ง', 500);
}
