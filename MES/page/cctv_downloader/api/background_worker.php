<?php
// Script สำหรับรันเบื้องหลังเพื่อควบคุม FFmpeg อย่างละเอียด (ฉบับ HTTP Smart Download เท่านั้น)
date_default_timezone_set('Asia/Bangkok');
if ($argc < 2) exit;

$data = json_decode(base64_decode($argv[1]), true);
if (!$data) exit;

$marker_file = $data['marker'];
$log_file = $data['log'];
$meta = $data['meta'] ?? null;

// ฟังก์ชันดักจับกรณี PHP Worker พังกระทันหัน (Fatal Error)
register_shutdown_function(function() use ($marker_file) {
    $error = error_get_last();
    if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        file_put_contents($marker_file, "ERROR|ระบบเบื้องหลังพังกระทันหัน (Fatal Error: {$error['message']})");
    }
});

$return_var = -1;
$error_msg = "";

$camera_ip = $meta['camera_ip'] ?? '';
$cam_user = $meta['cam_user'] ?? '';
$cam_pass = $meta['cam_pass'] ?? '';
$start_time = $meta['start_time'] ?? '';
$end_time = $meta['end_time'] ?? '';
$filename = $meta['filename'] ?? 'video';
$channel = $meta['channel'] ?? '1';

if (empty($camera_ip)) {
    file_put_contents($marker_file, "ERROR|ข้อมูลกล้องไม่ครบถ้วน");
    exit;
}

// Log setup
file_put_contents($log_file, "Starting Smart Download for $filename\n");

// 1. SEARCH
$ts_start = strtotime($start_time);
$ts_end = strtotime($end_time);
$search_start = gmdate('Y-m-d\TH:i:s\Z', $ts_start);
$search_end = gmdate('Y-m-d\TH:i:s\Z', $ts_end);

$search_url = "http://{$camera_ip}/ISAPI/ContentMgmt/search";
$search_xml = '<?xml version="1.0" encoding="utf-8"?><CMSearchDescription><searchID>' . uniqid() . '</searchID><trackList><trackID>'.$channel.'01</trackID></trackList><timeSpanList><timeSpan><startTime>' . $search_start . '</startTime><endTime>' . $search_end . '</endTime></timeSpan></timeSpanList><maxResults>40</maxResults><searchResultPostion>0</searchResultPostion><metadataList><metadataDescriptor>//recordType.meta.std-cgi.com</metadataDescriptor></metadataList></CMSearchDescription>';

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $search_url);
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_DIGEST | CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_USERPWD, "$cam_user:$cam_pass");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $search_xml);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/xml']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$search_res = curl_exec($ch);
$search_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($search_code == 200 && preg_match_all('/<playbackURI>(.*?)<\/playbackURI>/', $search_res, $matches)) {
    $raw_uris = $matches[1];
    $total_chunks = count($raw_uris);
    file_put_contents($log_file, "Found {$total_chunks} physical file(s) on camera.\nDownloading raw chunks via high-speed HTTP...\n", FILE_APPEND);
    
    $temp_files = [];
    $dl_success = true;
    
    $start_dl_time = microtime(true);
    
    foreach ($raw_uris as $index => $raw_uri) {
        $chunk_num = $index + 1;
        $temp_file = __DIR__ . '/../downloads/temp_' . $filename . '_chunk' . $chunk_num . '_' . uniqid() . '.mp4';
        $temp_files[] = $temp_file;
        $fp = fopen($temp_file, 'wb');
        
        $dl_url = "http://{$camera_ip}/ISAPI/ContentMgmt/download";
        // ใช้ URI ดิบๆ ห้ามแปลง htmlspecialchars ตามที่คุณแจ้งว่าใช้งานได้
        $dl_xml = "<downloadRequest><playbackURI>{$raw_uri}</playbackURI></downloadRequest>";
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $dl_url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET');
        curl_setopt($ch, CURLOPT_POSTFIELDS, $dl_xml);
        // กลับไปใช้ CURLAUTH_ANY แบบเดิมที่เคยใช้งานได้ตอนแรก
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_ANY);
        curl_setopt($ch, CURLOPT_USERPWD, "$cam_user:$cam_pass");
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3600);
        
        // จำกัดความเร็วดาวน์โหลดไว้ที่ 3 MB/s เพื่อป้องกันกล้อง Hikvision น็อคกลางทาง
        curl_setopt($ch, CURLOPT_MAX_RECV_SPEED_LARGE, 3145728);
        
        curl_setopt($ch, CURLOPT_NOPROGRESS, false);
        $last_progress_time = 0;
        curl_setopt($ch, CURLOPT_PROGRESSFUNCTION, function($resource, $download_size, $downloaded, $upload_size, $uploaded) use (&$last_progress_time, &$start_dl_time, $log_file, $index, $total_chunks) {
            $now = microtime(true);
            if ($now - $last_progress_time > 1.0 && $download_size > 0 && $downloaded > 0) {
                $last_progress_time = $now;
                $chunk_percent = ($downloaded / $download_size) * 100;
                $percent = round((($index * 100) + $chunk_percent) / $total_chunks, 1);
                $elapsed = max(0.1, $now - $start_dl_time);
                
                $percent_decimal = $percent / 100;
                if ($percent_decimal > 0) {
                    $estimated_total_time = $elapsed / $percent_decimal;
                    $remaining_secs = round($estimated_total_time - $elapsed);
                    file_put_contents($log_file, "SmartDL_Progress: {$percent}% | ETA: {$remaining_secs}s\n", FILE_APPEND);
                }
            }
        });
        
        curl_exec($ch);
        $dl_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        fclose($fp);
        
        $actual_filesize = file_exists($temp_file) ? filesize($temp_file) : 0;
        if ($dl_code != 200 || $actual_filesize < 1000) {
            file_put_contents($log_file, "ERROR on chunk {$chunk_num}: HTTP {$dl_code}, Size: {$actual_filesize} bytes.\n", FILE_APPEND);
            if ($actual_filesize > 0 && $actual_filesize < 1000) {
                $err_content = file_get_contents($temp_file);
                file_put_contents($log_file, "Chunk response body: " . $err_content . "\n", FILE_APPEND);
            }
            $dl_success = false;
            break;
        }
    }
    
    if ($dl_success) {
        file_put_contents($log_file, "All raw chunks downloaded successfully.\nMerging and cutting exact time range using FFmpeg...\n", FILE_APPEND);
        
        // 3. CONCAT & CUT WITH FFMPEG
        // Extract start time from the FIRST chunk to calculate offset
        $first_raw_uri = $raw_uris[0];
        preg_match('/starttime=(\d{8}T\d{6}Z)/', $first_raw_uri, $start_match);
        
        if ($start_match) {
            $file_start_utc = $start_match[1];
            $file_ts = strtotime(preg_replace('/(\d{8})T(\d{6})Z/', '$1 $2', $file_start_utc) . ' UTC');
            
            $offset_start = max(0, $ts_start - $file_ts);
            $duration = $ts_end - $ts_start;
            
            $final_file = __DIR__ . '/../downloads/' . $filename . '.mp4';
            
            // Generate concat.txt
            $concat_txt = __DIR__ . '/../downloads/concat_' . $filename . '_' . uniqid() . '.txt';
            $concat_content = "";
            foreach ($temp_files as $tf) {
                $tf_escaped = str_replace("'", "'\\''", $tf);
                $concat_content .= "file '" . $tf_escaped . "'\n";
            }
            file_put_contents($concat_txt, $concat_content);
            
            // FFmpeg command 
            $ffmpeg_path = file_exists(__DIR__ . '/ffmpeg.exe') ? __DIR__ . '/ffmpeg.exe' : 'ffmpeg';
            
            // เตรียมไฟล์ Log และสร้างคำสั่ง FFmpeg
            $ff_log = __DIR__ . '/../downloads/ff_' . $filename . '_' . uniqid() . '.log';
            $descriptorspec = [
                0 => ['pipe', 'r'],
                1 => ['file', $ff_log, 'a'],
                2 => ['file', $ff_log, 'a']
            ];
            
            $cmd_str = escapeshellcmd($ffmpeg_path) . " -ss " . escapeshellarg($offset_start) . " -f concat -safe 0 -i " . escapeshellarg($concat_txt) . " -t " . escapeshellarg($duration) . " -c copy -y " . escapeshellarg($final_file);
            $cmd_with_log = $cmd_str . ' > ' . escapeshellarg($ff_log) . ' 2>&1';
            
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $vbs_file = __DIR__ . '/run_hidden_ffmpeg_' . uniqid() . '.vbs';
                $vbs_cmd = 'cmd.exe /c "' . $cmd_with_log . '"';
                $vbs_cmd_escaped = str_replace('"', '""', $vbs_cmd);
                $vbs_code = 'WScript.Quit CreateObject("WScript.Shell").Run("' . $vbs_cmd_escaped . '", 0, True)';
                file_put_contents($vbs_file, $vbs_code);
                
                $bg_cmd = 'wscript.exe //nologo ' . escapeshellarg($vbs_file);
                $vbs_descriptorspec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
                $proc = proc_open($bg_cmd, $vbs_descriptorspec, $pipes, null, null, ['bypass_shell' => true, 'create_no_window' => true]);
                if (is_resource($proc)) {
                    fclose($pipes[0]);
                    fclose($pipes[1]);
                    fclose($pipes[2]);
                    $ret = proc_close($proc);
                    @unlink($vbs_file);
                } else {
                    $ret = -1;
                }
            } else {
                $proc = proc_open($cmd_with_log, $descriptorspec, $pipes);
                if (is_resource($proc)) {
                    fclose($pipes[0]);
                    $ret = proc_close($proc);
                } else {
                    $ret = -1;
                }
            }
            
            $out_str = file_exists($ff_log) ? file_get_contents($ff_log) : '';
            $out = explode("\n", trim($out_str));
            
            if ($ret === 0 && file_exists($final_file)) {
                $return_var = 0;
                file_put_contents($log_file, "Smart Download completed successfully.\n", FILE_APPEND);
                
                $meta_file = $final_file . '.meta';
                $meta_data = [
                    'start_time' => $start_time,
                    'end_time' => $end_time,
                    'duration' => $duration
                ];
                file_put_contents($meta_file, json_encode($meta_data, JSON_UNESCAPED_UNICODE));
            } else {
                $error_msg = "ERROR|ล้มเหลวในการรวม/ตัดไฟล์วิดีโอ (FFmpeg ตัดไฟล์ผิดพลาด)";
                file_put_contents($log_file, "FFmpeg failed:\n" . implode("\n", $out), FILE_APPEND);
            }
            
            // Cleanup
            @unlink($concat_txt);
            @unlink($ff_log);
        } else {
             $error_msg = "ERROR|รูปแบบเวลาของไฟล์ดิบจากกล้องไม่ถูกต้อง";
        }
    } else {
        $error_msg = "ERROR|ดาวน์โหลดไฟล์ดิบจากกล้องไม่สำเร็จ (บางส่วน)";
    }
    
    foreach ($temp_files as $tf) {
        @unlink($tf);
    }
} else {
    $error_msg = "ERROR|ไม่พบไฟล์วิดีโอในช่วงเวลานี้ (ไม่มีข้อมูลใน SD Card)";
}

if ($return_var !== 0 && $error_msg) {
    file_put_contents($marker_file, $error_msg);
} else {
    if (file_exists($marker_file)) unlink($marker_file);
}

// ---- ระบบคิว (Queue Processor) ----
// หลังจากงานปัจจุบันเสร็จสิ้น (ไม่ว่าจะสำเร็จหรือ Error ก็ตาม) ให้ไปเช็คคิวถัดไป
$downloads_dir = __DIR__ . '/../downloads';
if (!is_dir($downloads_dir)) exit; // ยังไม่มีโฟลเดอร์ downloads ไม่ต้องเช็คคิว
$files = scandir($downloads_dir);
$queued_files = [];

foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'queued') {
        $queued_files[$file] = filemtime($downloads_dir . '/' . $file);
    }
}

if (!empty($queued_files)) {
    // เรียงลำดับจากเก่าไปใหม่ (FIFO: First-In First-Out)
    asort($queued_files);
    reset($queued_files);
    $next_file = key($queued_files);
    
    $queued_path = $downloads_dir . '/' . $next_file;
    
    // ทำ Atomic Lock ด้วย flock (เสถียรกว่า rename บน Windows)
    $fp = @fopen($queued_path, 'r+');
    if (!$fp) exit; // เปิดไม่ได้ ข้ามไปก่อน
    
    // LOCK_NB = ไม่บล็อก ถ้าติด Lock อยู่แสดงว่า Worker อื่นเอาไปแล้ว ให้จบการทำงาน
    if (!@flock($fp, LOCK_EX | LOCK_NB)) {
        fclose($fp);
        exit;
    }
    
    rewind($fp); // Safety: ย้าย file pointer กลับไปต้นไฟล์ก่อนอ่าน
    $next_payload = stream_get_contents($fp);
    
    if ($next_payload) {
        $next_data = json_decode(base64_decode($next_payload), true);
        if ($next_data && isset($next_data['marker'])) {
            // ปลดล็อคและลบไฟล์คิวทิ้ง
            flock($fp, LOCK_UN);
            fclose($fp);
            @unlink($queued_path);
            if (file_exists($queued_path . '.info')) @unlink($queued_path . '.info');
            
            // เตรียมไฟล์ .downloading สำหรับคิวใหม่
            $n_meta = $next_data['meta'] ?? [];
            $n_duration = $n_meta['duration'] ?? 0;
            $n_filename = $n_meta['filename'] ?? 'unknown';
            $next_marker = $next_data['marker'];
            file_put_contents($next_marker, date('Y-m-d H:i:s') . ' | ' . $n_filename . '.mp4 | Smart Download | ' . $n_duration);
            
            // รันตัวเองซ้ำ (Self-trigger) ด้วย Payload ถัดไป
            $php_exe = $next_data['php_exe'] ?? 'php';
            $worker_script = $next_data['worker_script'] ?? __FILE__;
            
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                $vbs_file = __DIR__ . '/run_hidden_' . uniqid() . '.vbs';
                $vbs_cmd = 'cmd.exe /c ""' . $php_exe . '" "' . $worker_script . '" "' . str_replace('"', '""', $next_payload) . '""';
                $vbs_cmd_escaped = str_replace('"', '""', $vbs_cmd);
                $vbs_code = 'CreateObject("WScript.Shell").Run "' . $vbs_cmd_escaped . '", 0, False';
                file_put_contents($vbs_file, $vbs_code);
                
                $bg_cmd = 'wscript.exe //nologo ' . escapeshellarg($vbs_file);
                $descriptorspec = [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
                $proc = proc_open($bg_cmd, $descriptorspec, $pipes, null, null, ['bypass_shell' => true, 'create_no_window' => true]);
                if (is_resource($proc)) {
                    fclose($pipes[0]);
                    fclose($pipes[1]);
                    fclose($pipes[2]);
                    proc_close($proc);
                    @unlink($vbs_file);
                }
            } else {
                $safe_worker = escapeshellarg($worker_script);
                $safe_payload = escapeshellarg($next_payload);
                $bg_cmd = 'php ' . $safe_worker . ' ' . $safe_payload . ' > /dev/null 2>&1 &';
                exec($bg_cmd);
            }
        }
    }
}
