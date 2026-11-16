<?php
/**
 * Background worker for downloading Hikvision ISAPI video chunks and muxing via FFmpeg.
 * Credentials are read directly from .env via config.php — never passed on CLI argv.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit('CLI only');
}

date_default_timezone_set('Asia/Bangkok');
if ($argc < 2) {
    exit(1);
}

$jobFile = $argv[1];
if (!is_file($jobFile)) {
    exit(1);
}

$rawJson = @file_get_contents($jobFile);
@unlink($jobFile);
$data = json_decode((string)$rawJson, true);
if (!is_array($data)) {
    exit(1);
}

require_once __DIR__ . '/../../config.php';

$camUser = trim((string)($_ENV['CCTV_CAM_USER'] ?? $_SERVER['CCTV_CAM_USER'] ?? getenv('CCTV_CAM_USER') ?: ''));
$camPass = trim((string)($_ENV['CCTV_CAM_PASS'] ?? $_SERVER['CCTV_CAM_PASS'] ?? getenv('CCTV_CAM_PASS') ?: ''));

$markerFile = (string)($data['marker'] ?? '');
$logFile = (string)($data['log'] ?? '');
$outputDir = (string)($data['output_dir'] ?? dirname($markerFile));
$ffmpegPath = (string)($data['ffmpeg_path'] ?? 'ffmpeg');
$meta = $data['meta'] ?? [];

if ($markerFile === '' || $logFile === '' || empty($meta['camera_ip'])) {
    exit(1);
}

register_shutdown_function(static function () use ($markerFile) {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        @file_put_contents($markerFile, "ERROR|ระบบเบื้องหลังหยุดทำงานกระทันหัน ({$error['message']})");
    }
});

if ($camUser === '' || $camPass === '') {
    file_put_contents($markerFile, "ERROR|ยังไม่ได้ตั้งค่า CCTV_CAM_USER/CCTV_CAM_PASS ในไฟล์ .env");
    exit(1);
}

$cameraIp = (string)$meta['camera_ip'];
$channel = (string)($meta['channel'] ?? '1');
$startTime = (string)($meta['start_time'] ?? '');
$endTime = (string)($meta['end_time'] ?? '');
$filename = (string)($meta['filename'] ?? 'video');

$returnVar = -1;
$errorMsg = '';

file_put_contents($logFile, "Starting Smart Download for {$filename}\n");

$tsStart = strtotime($startTime);
$tsEnd = strtotime($endTime);
$searchStart = gmdate('Y-m-d\TH:i:s\Z', $tsStart);
$searchEnd = gmdate('Y-m-d\TH:i:s\Z', $tsEnd);

$searchUrl = "http://{$cameraIp}/ISAPI/ContentMgmt/search";
$searchXml = '<?xml version="1.0" encoding="utf-8"?><CMSearchDescription><searchID>' . uniqid('', true)
    . '</searchID><trackList><trackID>' . $channel . '01</trackID></trackList><timeSpanList><timeSpan><startTime>'
    . $searchStart . '</startTime><endTime>' . $searchEnd
    . '</endTime></timeSpan></timeSpanList><maxResults>40</maxResults><searchResultPostion>0</searchResultPostion>'
    . '<metadataList><metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor></metadataList></CMSearchDescription>';

$ch = curl_init($searchUrl);
curl_setopt_array($ch, [
    CURLOPT_HTTPAUTH => CURLAUTH_DIGEST | CURLAUTH_BASIC,
    CURLOPT_USERPWD => "{$camUser}:{$camPass}",
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $searchXml,
    CURLOPT_HTTPHEADER => ['Content-Type: application/xml'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);
$searchRes = (string)curl_exec($ch);
$searchCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($searchCode === 200 && preg_match_all('/<playbackURI>(.*?)<\/playbackURI>/', $searchRes, $matches)) {
    $rawUris = $matches[1];
    $totalChunks = count($rawUris);
    file_put_contents($logFile, "Found {$totalChunks} chunk(s). Downloading...\n", FILE_APPEND);

    $tempFiles = [];
    $dlSuccess = true;
    $startDlTime = microtime(true);

    foreach ($rawUris as $index => $rawUri) {
        $chunkNum = $index + 1;
        $tempFile = $outputDir . '/temp_' . $filename . '_chunk' . $chunkNum . '_' . uniqid('', true) . '.mp4';
        $tempFiles[] = $tempFile;
        $fp = fopen($tempFile, 'wb');

        $dlUrl = "http://{$cameraIp}/ISAPI/ContentMgmt/download";
        $dlXml = "<downloadRequest><playbackURI>{$rawUri}</playbackURI></downloadRequest>";

        $ch = curl_init($dlUrl);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'GET',
            CURLOPT_POSTFIELDS => $dlXml,
            CURLOPT_HTTPAUTH => CURLAUTH_ANY,
            CURLOPT_USERPWD => "{$camUser}:{$camPass}",
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 3600,
            CURLOPT_MAX_RECV_SPEED_LARGE => 3145728,
            CURLOPT_NOPROGRESS => false,
        ]);

        $lastProgress = 0.0;
        curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, static function ($res, $dlSize, $dlNow) use (&$lastProgress, $startDlTime, $logFile, $index, $totalChunks) {
            $now = microtime(true);
            if ($now - $lastProgress > 1.0 && $dlSize > 0 && $dlNow > 0) {
                $lastProgress = $now;
                $chunkPct = ($dlNow / $dlSize) * 100.0;
                $pct = round((($index * 100.0) + $chunkPct) / $totalChunks, 1);
                $elapsed = max(0.1, $now - $startDlTime);
                if ($pct > 0) {
                    $eta = (int)round(($elapsed / ($pct / 100.0)) - $elapsed);
                    file_put_contents($logFile, "SmartDL_Progress: {$pct}% | ETA: {$eta}s\n", FILE_APPEND);
                }
            }
        });

        curl_exec($ch);
        $dlCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);

        $actualSize = is_file($tempFile) ? (int)filesize($tempFile) : 0;
        if ($dlCode !== 200 || $actualSize < 1000) {
            file_put_contents($logFile, "ERROR chunk {$chunkNum}: HTTP {$dlCode}, size={$actualSize}\n", FILE_APPEND);
            $dlSuccess = false;
            break;
        }
    }

    if ($dlSuccess) {
        if (preg_match('/starttime=(\d{8}T\d{6}Z)/', $rawUris[0], $startMatch)) {
            $fileTs = strtotime(preg_replace('/(\d{8})T(\d{6})Z/', '$1 $2', $startMatch[1]) . ' UTC');
            $offsetStart = max(0, $tsStart - $fileTs);
            $duration = max(1, $tsEnd - $tsStart);
            $finalFile = $outputDir . '/' . $filename . '.mp4';

            $concatTxt = $outputDir . '/concat_' . $filename . '_' . uniqid('', true) . '.txt';
            $concatBody = '';
            foreach ($tempFiles as $tf) {
                $concatBody .= "file '" . str_replace("'", "'\\''", $tf) . "'\n";
            }
            file_put_contents($concatTxt, $concatBody);

            $ffLog = $outputDir . '/ff_' . $filename . '_' . uniqid('', true) . '.log';
            $cmdStr = escapeshellcmd($ffmpegPath)
                . ' -ss ' . escapeshellarg((string)$offsetStart)
                . ' -f concat -safe 0 -i ' . escapeshellarg($concatTxt)
                . ' -t ' . escapeshellarg((string)$duration)
                . ' -c copy -y ' . escapeshellarg($finalFile);

            $proc = proc_open(
                $cmdStr,
                [0 => ['pipe', 'r'], 1 => ['file', $ffLog, 'a'], 2 => ['file', $ffLog, 'a']],
                $pipes
            );
            $ret = -1;
            if (is_resource($proc)) {
                fclose($pipes[0]);
                $ret = proc_close($proc);
            }

            if ($ret === 0 && is_file($finalFile)) {
                $returnVar = 0;
                file_put_contents($logFile, "Smart Download completed successfully.\n", FILE_APPEND);
                file_put_contents($finalFile . '.meta', json_encode([
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'duration' => $duration,
                ], JSON_UNESCAPED_UNICODE));
            } else {
                $errorMsg = 'ERROR|ล้มเหลวในการรวมหรือตัดไฟล์วิดีโอด้วย FFmpeg';
                if (is_file($ffLog)) {
                    file_put_contents($logFile, "FFmpeg error:\n" . file_get_contents($ffLog), FILE_APPEND);
                }
            }

            @unlink($concatTxt);
            @unlink($ffLog);
        } else {
            $errorMsg = 'ERROR|รูปแบบเวลาของไฟล์ดิบจากกล้องไม่ถูกต้อง';
        }
    } else {
        $errorMsg = 'ERROR|ดาวน์โหลดไฟล์ดิบจากกล้องไม่สำเร็จ';
    }

    foreach ($tempFiles as $tf) {
        @unlink($tf);
    }
} else {
    $errorMsg = 'ERROR|ไม่พบไฟล์วิดีโอในช่วงเวลานี้บนกล้อง (HTTP ' . $searchCode . ')';
}

if ($returnVar !== 0 && $errorMsg !== '') {
    file_put_contents($markerFile, $errorMsg);
} else {
    if (is_file($markerFile)) {
        @unlink($markerFile);
    }
}

// FIFO queue processor
$queuedFiles = [];
foreach (@scandir($outputDir) ?: [] as $file) {
    if (substr($file, -7) === '.queued') {
        $queuedFiles[$file] = (int)filemtime($outputDir . '/' . $file);
    }
}

if (!empty($queuedFiles)) {
    asort($queuedFiles);
    $nextFile = (string)key($queuedFiles);
    $queuedPath = $outputDir . '/' . $nextFile;
    $fp = @fopen($queuedPath, 'r+');
    if ($fp && @flock($fp, LOCK_EX | LOCK_NB)) {
        rewind($fp);
        $nextJson = stream_get_contents($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        @unlink($queuedPath);
        @unlink($queuedPath . '.info');

        $nextData = json_decode((string)$nextJson, true);
        if (is_array($nextData) && !empty($nextData['marker'])) {
            $nMeta = $nextData['meta'] ?? [];
            file_put_contents(
                $nextData['marker'],
                date('Y-m-d H:i:s') . ' | ' . ($nMeta['filename'] ?? 'video') . '.mp4 | Smart Download | ' . ($nMeta['duration'] ?? 0)
            );
            $nextJobToken = $outputDir . '/.job_' . bin2hex(random_bytes(8)) . '.json';
            file_put_contents($nextJobToken, $nextJson, LOCK_EX);

            $phpExe = (string)($nextData['php_exe'] ?? 'php');
            $workerScript = (string)($nextData['worker_script'] ?? __FILE__);
            if (PHP_OS_FAMILY === 'Windows') {
                $vbsFile = $outputDir . '/.run_' . bin2hex(random_bytes(6)) . '.vbs';
                $vbsCmd = 'cmd.exe /c ""' . $phpExe . '" "' . $workerScript . '" "' . $nextJobToken . '""';
                file_put_contents($vbsFile, 'CreateObject("WScript.Shell").Run "' . str_replace('"', '""', $vbsCmd) . '", 0, False');
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
                @exec(escapeshellarg($phpExe) . ' ' . escapeshellarg($workerScript) . ' ' . escapeshellarg($nextJobToken) . ' > /dev/null 2>&1 &');
            }
        }
    } elseif ($fp) {
        fclose($fp);
    }
}
