<?php
/**
 * Self-contained CCTV Downloader & C-TPAT Video Extraction API for Toolbox SPA.
 * Replaces legacy page/cctv_downloader/api/{check_status,preview,link_loading,download,list_files,delete}.php.
 */

if (isset($_GET['action']) && $_GET['action'] === 'stream_file') {
    define('CCTV_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';

$action = '';
$input = [];

/** Parses download progress percentage and ETA from worker logs safely. */
function parseCctvProgressFromLog(string $logPath, int $duration): array {
    if ($duration <= 0 || !is_file($logPath) || filesize($logPath) === 0) {
        return [0.0, 'กำลังเตรียมการ...'];
    }
    $f = @fopen($logPath, 'rb');
    if (!$f) {
        return [0.0, 'กำลังเชื่อมต่อกล้อง...'];
    }
    $size = filesize($logPath);
    fseek($f, max(0, $size - 2048));
    $chunk = (string)fread($f, 2048);
    fclose($f);

    if (preg_match_all('/SmartDL_Progress:\s*([\d\.]+)%\s*\|\s*ETA:\s*(\d+)s/', $chunk, $matches) && !empty($matches[0])) {
        $last = count($matches[0]) - 1;
        $pct = min(99.0, (float)$matches[1][$last]);
        $rem = (int)$matches[2][$last];
        if ($pct < 1 || $rem > 3600) {
            return [$pct, 'กำลังคำนวณเวลา...'];
        }
        if ($rem > 0) {
            return [$pct, 'เหลือประมาณ ' . floor($rem / 60) . ' นาที ' . ($rem % 60) . ' วินาที'];
        }
        return [$pct, 'กำลังรวมไฟล์ด้วย FFmpeg...'];
    }

    if (preg_match_all('/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/', $chunk, $matches) && !empty($matches[0])) {
        $last = count($matches[0]) - 1;
        $curr = ((int)$matches[1][$last] * 3600) + ((int)$matches[2][$last] * 60) + (float)$matches[3][$last];
        $pct = min(99.0, round(($curr / $duration) * 100, 1));
        $rem = max(0, (int)round($duration - $curr));
        return [$pct, $rem > 0 ? ('เหลืออีก ' . floor($rem / 60) . ' นาที ' . ($rem % 60) . ' วินาที') : 'ใกล้เสร็จแล้ว...'];
    }

    return [0.0, 'กำลังดาวน์โหลดข้อมูลจากกล้อง...'];
}

try {
    [$action, $input, $currentUser] = parseCctvRequest('list_files');

    switch ($action) {
        case 'get_capabilities': {
            requireCctvAccess(false);
            $creds = getCctvCameraCredentials();
            $ffmpeg = resolveCctvFfmpegPath();
            $dir = getCctvDownloadsDir();
            cctvJsonSuccess([
                'cam_credentials_configured' => $creds['configured'],
                'ffmpeg_available' => $ffmpeg['available'],
                'downloads_dir_writable' => is_dir($dir) && is_writable($dir),
                'os_family' => PHP_OS_FAMILY,
            ], 'CCTV runtime capabilities inspected');
            break;
        }

        case 'check_status': {
            requireCctvAccess(false);
            $ip = normalizeCctvIp($input['camera_ip'] ?? '');
            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }
            $errno = 0;
            $errstr = '';
            $conn = @fsockopen($ip, 554, $errno, $errstr, 2.0);
            if (is_resource($conn)) {
                fclose($conn);
                cctvJsonSuccess(['online' => true, 'port' => 554, 'ip' => $ip], 'กล้องออนไลน์พร้อมเชื่อมต่อ');
            }
            cctvJsonSuccess(['online' => false, 'port' => 554, 'ip' => $ip], 'ไม่พบการตอบสนองจากพอร์ต RTSP (554) ของกล้อง');
            break;
        }

        case 'preview': {
            requireCctvAccess(false);
            $ip = normalizeCctvIp($input['camera_ip'] ?? '');
            $channel = max(1, min(64, (int)($input['channel'] ?? 1)));
            $creds = getCctvCameraCredentials();

            if (!$creds['configured']) {
                cctvJsonError('ยังไม่ได้ตั้งค่า CCTV_CAM_USER และ CCTV_CAM_PASS ในไฟล์ .env', 503, ['configured' => false]);
            }

            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }

            $isapiUrl = "http://{$ip}/ISAPI/Streaming/channels/{$channel}01/picture";
            $ch = curl_init($isapiUrl);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPAUTH => CURLAUTH_DIGEST | CURLAUTH_BASIC,
                CURLOPT_USERPWD => $creds['user'] . ':' . $creds['pass'],
                CURLOPT_TIMEOUT => 5,
                CURLOPT_CONNECTTIMEOUT => 3,
            ]);
            $imgRaw = curl_exec($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($imgRaw !== false && $httpCode === 200 && substr($imgRaw, 0, 3) === "\xFF\xD8\xFF") {
                cctvJsonSuccess([
                    'ip' => $ip,
                    'channel' => $channel,
                    'image' => 'data:image/jpeg;base64,' . base64_encode($imgRaw),
                ], 'ดึงภาพตัวอย่างสำเร็จ');
            }

            cctvJsonError(
                'ไม่สามารถดึงภาพจากกล้องได้ (' . ($httpCode > 0 ? "HTTP {$httpCode}" : ($curlErr !== '' ? $curlErr : 'ไม่สามารถเข้าถึงเครือข่ายกล้องจากเซิร์ฟเวอร์นี้ได้')) . ')',
                502
            );
            break;
        }

        case 'link_loading': {
            requireCctvAccess(false);
            $date = normalizeCctvDate($input['date'] ?? date('Y-m-d'), date('Y-m-d'));
            $stmt = $pdo->prepare("
                SELECT TOP (200)
                       r.id AS report_id,
                       FORMAT(r.loading_start_time, 'yyyy-MM-dd HH:mm') AS loading_start_time,
                       FORMAT(r.loading_end_time, 'yyyy-MM-dd HH:mm') AS loading_end_time,
                       ISNULL(r.container_no, '') AS container_no,
                       ISNULL(s.po_number, '') AS po_number,
                       ISNULL(s.description, '') AS description
                FROM " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK)
                INNER JOIN " . SALES_ORDERS_TABLE . " s WITH (NOLOCK) ON r.sales_order_id = s.id
                WHERE r.status = 'COMPLETED'
                  AND CAST(r.loading_start_time AS DATE) = ?
                  AND r.loading_start_time IS NOT NULL
                  AND r.loading_end_time IS NOT NULL
                ORDER BY r.loading_start_time ASC
            ");
            $stmt->execute([$date]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

            $dir = getCctvDownloadsDir();
            foreach ($rows as &$row) {
                $sanitized = preg_replace('/[^a-zA-Z0-9_-]/', '_', (string)($row['po_number'] ?? ''));
                $row['sanitized_filename'] = $sanitized;
                $row['already_exists'] = false;
                $row['exists_status'] = '';

                if ($sanitized !== '' && is_dir($dir)) {
                    $mp4 = $dir . '/' . $sanitized . '.mp4';
                    if (is_file($mp4)) {
                        $row['already_exists'] = true;
                        $row['exists_status'] = 'downloaded';
                    } elseif (is_file($mp4 . '.downloading')) {
                        $row['already_exists'] = true;
                        $row['exists_status'] = 'downloading';
                    } elseif (is_file($mp4 . '.queued')) {
                        $row['already_exists'] = true;
                        $row['exists_status'] = 'queued';
                    }
                }
            }
            unset($row);

            cctvJsonSuccess(['rows' => $rows, 'date' => $date], 'Loading reports retrieved');
            break;
        }

        case 'list_files': {
            requireCctvAccess(false);
            $dir = getCctvDownloadsDir();
            if (!is_dir($dir)) {
                cctvJsonSuccess(['downloading' => [], 'queued' => [], 'completed' => []], 'No downloads directory yet');
            }

            $entries = @scandir($dir) ?: [];
            $downloading = [];
            $queued = [];
            $completed = [];

            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }
                $fullPath = $dir . '/' . $entry;
                if (!is_file($fullPath)) {
                    continue;
                }

                if (substr($entry, -16) === '.mp4.downloading') {
                    $mp4Name = substr($entry, 0, -12);
                    $info = (string)@file_get_contents($fullPath);
                    if (strpos($info, 'ERROR') !== false) {
                        $parts = explode('|', $info, 2);
                        $downloading[] = [
                            'filename' => $mp4Name,
                            'status' => 'error',
                            'percent' => 0,
                            'eta_text' => '',
                            'error_message' => trim((string)($parts[1] ?? 'เกิดข้อผิดพลาดในการดึงข้อมูล')),
                        ];
                    } else {
                        $parts = explode(' | ', $info);
                        $duration = (int)($parts[3] ?? 0);
                        $logPath = $dir . '/' . substr($entry, 0, -16) . '.log';
                        [$pct, $eta] = parseCctvProgressFromLog($logPath, $duration);
                        $downloading[] = [
                            'filename' => $mp4Name,
                            'status' => 'downloading',
                            'percent' => $pct,
                            'eta_text' => $eta,
                            'error_message' => '',
                        ];
                    }
                } elseif (substr($entry, -11) === '.mp4.queued') {
                    $mp4Name = substr($entry, 0, -7);
                    $info = is_file($fullPath . '.info') ? (string)@file_get_contents($fullPath . '.info') : '';
                    $queued[] = [
                        'filename' => $mp4Name,
                        'status' => 'queued',
                        'info' => $info,
                    ];
                } elseif (strtolower(pathinfo($entry, PATHINFO_EXTENSION)) === 'mp4') {
                    if (strpos($entry, 'temp_') === 0 || is_file($fullPath . '.downloading')) {
                        continue;
                    }
                    $size = (int)@filesize($fullPath);
                    $mtime = (int)@filemtime($fullPath);
                    $metaFile = $fullPath . '.meta';
                    $startTime = '';
                    $endTime = '';
                    $duration = 0;
                    if (is_file($metaFile)) {
                        $meta = json_decode((string)@file_get_contents($metaFile), true);
                        if (is_array($meta)) {
                            $startTime = (string)($meta['start_time'] ?? '');
                            $endTime = (string)($meta['end_time'] ?? '');
                            $duration = (int)($meta['duration'] ?? 0);
                        }
                    }
                    $completed[] = [
                        'filename' => $entry,
                        'size_bytes' => $size,
                        'modified_ts' => $mtime,
                        'modified_at' => $mtime > 0 ? date('Y-m-d H:i', $mtime) : '',
                        'start_time' => $startTime,
                        'end_time' => $endTime,
                        'start_ts' => $startTime !== '' ? (strtotime(str_replace('/', '-', $startTime)) ?: 0) : 0,
                        'duration_sec' => $duration,
                    ];
                }
            }

            usort($completed, static fn($a, $b) => $b['modified_ts'] <=> $a['modified_ts']);

            cctvJsonSuccess([
                'downloading' => $downloading,
                'queued' => $queued,
                'completed' => $completed,
            ], 'File list loaded');
            break;
        }

        case 'start_download': {
            requireCctvAccess(true);
            $ip = normalizeCctvIp($input['camera_ip'] ?? '');
            $channel = max(1, min(64, (int)($input['channel'] ?? 1)));

            $creds = getCctvCameraCredentials();
            if (!$creds['configured']) {
                cctvJsonError('ยังไม่ได้ตั้งค่า CCTV_CAM_USER และ CCTV_CAM_PASS ในไฟล์ .env', 503);
            }

            $ffmpeg = resolveCctvFfmpegPath();
            if (!$ffmpeg['available']) {
                cctvJsonError('ไม่พบโปรแกรม FFmpeg บนเซิร์ฟเวอร์ (ไม่สามารถตัดและรวมไฟล์วิดีโอได้)', 503);
            }

            $jobsInput = $input['jobs'] ?? null;
            if (!is_array($jobsInput) || empty($jobsInput)) {
                $jobsInput = [[
                    'start_time' => $input['start_time'] ?? '',
                    'end_time' => $input['end_time'] ?? '',
                    'filename' => $input['filename'] ?? '',
                ]];
            }

            $dir = getCctvDownloadsDir();
            if (!is_dir($dir) || !is_writable($dir)) {
                cctvJsonError('โฟลเดอร์จัดเก็บวิดีโอบนเซิร์ฟเวอร์ไม่สามารถเขียนได้', 500);
            }

            // Auto-clean stale .downloading markers older than 15 mins without log updates
            $now = time();
            $activeCount = 0;
            foreach (glob($dir . '/*.downloading') ?: [] as $dlMarker) {
                $logCheck = str_replace('.mp4.downloading', '.log', $dlMarker);
                $lastTouch = is_file($logCheck) ? (int)filemtime($logCheck) : (int)filemtime($dlMarker);
                if ($now - $lastTouch >= 900) {
                    @unlink($dlMarker);
                } else {
                    $activeCount++;
                }
            }

            $workerScript = __DIR__ . '/background_worker.php';
            $phpExe = (PHP_OS_FAMILY === 'Windows')
                ? (is_file(dirname(PHP_BINARY) . '/php-win.exe') ? dirname(PHP_BINARY) . '/php-win.exe' : PHP_BINARY)
                : PHP_BINARY;

            $results = ['started' => 0, 'queued' => 0, 'errors' => []];

            foreach ($jobsInput as $idx => $job) {
                $startRaw = trim((string)($job['start_time'] ?? ''));
                $endRaw = trim((string)($job['end_time'] ?? ''));
                $rawName = trim((string)($job['filename'] ?? ('video_' . time() . '_' . $idx)));
                $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $rawName);

                if ($startRaw === '' || $endRaw === '' || $cleanName === '') {
                    $results['errors'][] = "รายการที่ " . ($idx + 1) . ": ข้อมูลไม่ครบถ้วน";
                    continue;
                }
                $tsStart = strtotime($startRaw);
                $tsEnd = strtotime($endRaw);
                if ($tsStart === false || $tsEnd === false || $tsEnd <= $tsStart) {
                    $results['errors'][] = "{$cleanName}: ช่วงเวลาเริ่มต้น/สิ้นสุดไม่ถูกต้อง";
                    continue;
                }
                $duration = $tsEnd - $tsStart;
                if ($duration > 6 * 3600) {
                    $results['errors'][] = "{$cleanName}: อนุญาตสูงสุดไม่เกิน 6 ชั่วโมงต่อ 1 คลิป";
                    continue;
                }

                $outputFile = $dir . '/' . $cleanName . '.mp4';
                $markerFile = $outputFile . '.downloading';
                $queuedFile = $outputFile . '.queued';
                if (is_file($markerFile) || is_file($queuedFile)) {
                    $results['errors'][] = "{$cleanName}.mp4: กำลังดาวน์โหลดหรืออยู่ในคิวแล้ว";
                    continue;
                }
                if (is_file($outputFile)) {
                    $results['errors'][] = "{$cleanName}.mp4: มีไฟล์นี้อยู่ในระบบแล้ว";
                    continue;
                }

                $jobSpec = [
                    'marker' => $markerFile,
                    'log' => $dir . '/' . $cleanName . '.log',
                    'output_dir' => $dir,
                    'ffmpeg_path' => $ffmpeg['path'],
                    'php_exe' => $phpExe,
                    'worker_script' => $workerScript,
                    'meta' => [
                        'camera_ip' => $ip,
                        'channel' => (string)$channel,
                        'start_time' => date('Y-m-d H:i:s', $tsStart),
                        'end_time' => date('Y-m-d H:i:s', $tsEnd),
                        'filename' => $cleanName,
                        'duration' => $duration,
                    ],
                ];

                if ($activeCount >= 2) {
                    file_put_contents($queuedFile, json_encode($jobSpec, JSON_UNESCAPED_UNICODE), LOCK_EX);
                    file_put_contents(
                        $queuedFile . '.info',
                        date('Y-m-d H:i:s') . " | {$cleanName}.mp4 | HTTP (Queued) | {$duration}",
                        LOCK_EX
                    );
                    $results['queued']++;
                } else {
                    $activeCount++;
                    file_put_contents(
                        $markerFile,
                        date('Y-m-d H:i:s') . " | {$cleanName}.mp4 | HTTP (Smart) | {$duration}",
                        LOCK_EX
                    );
                    $jobTokenFile = $dir . '/.job_' . bin2hex(random_bytes(8)) . '.json';
                    file_put_contents($jobTokenFile, json_encode($jobSpec, JSON_UNESCAPED_UNICODE), LOCK_EX);

                    if (PHP_OS_FAMILY === 'Windows') {
                        $vbsFile = $dir . '/.run_' . bin2hex(random_bytes(6)) . '.vbs';
                        $vbsCmd = 'cmd.exe /c ""' . $phpExe . '" "' . $workerScript . '" "' . $jobTokenFile . '""';
                        $vbsCode = 'CreateObject("WScript.Shell").Run "' . str_replace('"', '""', $vbsCmd) . '", 0, False';
                        file_put_contents($vbsFile, $vbsCode);
                        $proc = @proc_open(
                            'wscript.exe //nologo ' . escapeshellarg($vbsFile),
                            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                            $pipes,
                            null,
                            null,
                            ['bypass_shell' => true, 'create_no_window' => true]
                        );
                        if (is_resource($proc)) {
                            fclose($pipes[0]);
                            fclose($pipes[1]);
                            fclose($pipes[2]);
                            proc_close($proc);
                            @unlink($vbsFile);
                        }
                    } else {
                        $cmd = escapeshellarg($phpExe) . ' ' . escapeshellarg($workerScript) . ' ' . escapeshellarg($jobTokenFile) . ' > /dev/null 2>&1 &';
                        @exec($cmd);
                    }
                    $results['started']++;
                }
            }

            writeLog(
                $pdo,
                'CREATE',
                'CCTV_DOWNLOAD',
                $ip,
                null,
                ['ip' => $ip, 'channel' => $channel, 'started' => $results['started'], 'queued' => $results['queued']],
                'Queued/started CCTV video download jobs'
            );

            cctvJsonSuccess($results, "ส่งคำสั่งแล้ว (เริ่มโหลดทันที {$results['started']} ไฟล์, เข้าคิว {$results['queued']} ไฟล์)");
            break;
        }

        case 'delete_file': {
            requireCctvAccess(true);
            $filename = basename(trim((string)($input['filename'] ?? '')));
            if ($filename === '' || !preg_match('/^[a-zA-Z0-9._-]+\.mp4$/', $filename)) {
                cctvJsonError('ชื่อไฟล์ไม่ถูกต้อง', 400);
            }

            $dir = getCctvDownloadsDir();
            $targetFile = $dir . '/' . $filename;
            $markerFile = $targetFile . '.downloading';
            $queuedFile = $targetFile . '.queued';
            $queuedInfo = $queuedFile . '.info';
            $metaFile = $targetFile . '.meta';
            $baseNoExt = pathinfo($filename, PATHINFO_FILENAME);
            $logFile = $dir . '/' . $baseNoExt . '.log';
            $davFile = $dir . '/' . $baseNoExt . '.dav';

            $oldMeta = [
                'filename' => $filename,
                'size_bytes' => is_file($targetFile) ? filesize($targetFile) : 0,
                'was_downloading' => is_file($markerFile),
            ];

            // Stop active ffmpeg process first to release file locks & camera stream
            if (is_file($markerFile)) {
                if (PHP_OS_FAMILY === 'Windows') {
                    $procOutput = [];
                    @exec('wmic process where "name=\'ffmpeg.exe\'" get CommandLine,ProcessId /format:csv 2>nul', $procOutput);
                    foreach ($procOutput as $line) {
                        if (stripos($line, $baseNoExt) !== false) {
                            $parts = explode(',', trim($line));
                            $pid = end($parts);
                            if (is_numeric($pid)) {
                                @exec('taskkill /F /PID ' . (int)$pid . ' 2>nul');
                            }
                        }
                    }
                } else {
                    @exec('pkill -f ' . escapeshellarg('ffmpeg.*' . $baseNoExt) . ' 2>/dev/null');
                }
                usleep(400000);
            }

            $deletedAny = false;
            foreach ([$targetFile, $markerFile, $queuedFile, $queuedInfo, $metaFile, $logFile, $davFile] as $f) {
                if (is_file($f) && @unlink($f)) {
                    $deletedAny = true;
                }
            }

            if (!$deletedAny) {
                cctvJsonError('ไม่พบไฟล์นี้ในระบบ', 404);
            }

            writeLog($pdo, 'DELETE', 'CCTV_DOWNLOAD', $filename, $oldMeta, ['deleted' => true], 'Deleted CCTV file / cancelled job');
            cctvJsonSuccess(['filename' => $filename], 'ลบไฟล์ / ยกเลิกงานเรียบร้อยแล้ว');
            break;
        }

        case 'stream_file': {
            requireCctvAccess(false);
            $filename = basename(trim((string)($input['file'] ?? '')));
            if ($filename === '' || !preg_match('/^[a-zA-Z0-9._-]+\.mp4$/', $filename)) {
                cctvJsonError('ชื่อไฟล์วิดีโอไม่ถูกต้อง', 400);
            }

            $dir = getCctvDownloadsDir();
            $path = $dir . '/' . $filename;
            if (!is_file($path) || !is_readable($path)) {
                cctvJsonError('ไม่พบไฟล์วิดีโอนี้', 404);
            }

            if (session_status() === PHP_SESSION_ACTIVE) {
                session_write_close();
            }

            $size = (int)filesize($path);
            $downloadMode = !empty($input['download']) && $input['download'] !== '0';

            header('Content-Type: video/mp4');
            header('Accept-Ranges: bytes');
            header('Content-Disposition: ' . ($downloadMode ? 'attachment' : 'inline') . '; filename="' . $filename . '"');

            $start = 0;
            $end = max(0, $size - 1);

            if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/bytes=(\d*)-(\d*)/', $_SERVER['HTTP_RANGE'], $m)) {
                if ($m[1] !== '') {
                    $start = (int)$m[1];
                }
                if ($m[2] !== '') {
                    $end = min($end, (int)$m[2]);
                }
                if ($start > $end || $start >= $size) {
                    http_response_code(416);
                    header("Content-Range: bytes */{$size}");
                    exit;
                }
                http_response_code(206);
                header("Content-Range: bytes {$start}-{$end}/{$size}");
            }

            $length = ($size > 0) ? ($end - $start + 1) : 0;
            header('Content-Length: ' . (string)$length);

            $fp = fopen($path, 'rb');
            if ($fp) {
                fseek($fp, $start);
                $remaining = $length;
                while ($remaining > 0 && !feof($fp)) {
                    $chunkSize = min(65536, $remaining);
                    $buf = fread($fp, $chunkSize);
                    if ($buf === false) {
                        break;
                    }
                    echo $buf;
                    flush();
                    $remaining -= strlen($buf);
                }
                fclose($fp);
            }
            exit;
        }

        default:
            cctvJsonError("Invalid action: {$action}", 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    writeErrorLog($pdo ?? null, 'CCTV_DOWNLOADER', $e->getMessage(), ['action' => $action]);
    cctvJsonError('เกิดข้อผิดพลาดในการดำเนินการระบบ CCTV', 500);
}
