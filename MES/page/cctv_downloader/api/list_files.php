<?php
require_once __DIR__ . '/../../../auth/check_auth.php';

$downloads_dir = __DIR__ . '/../downloads';

if (!is_dir($downloads_dir)) {
    echo '<li class="list-group-item text-center text-muted p-4">ไม่มีไฟล์วิดีโอในระบบ</li>';
    exit;
}

$files = scandir($downloads_dir);
$hasFiles = false;

// 1. แสดงไฟล์ที่กำลังดาวน์โหลดอยู่ (marker files)
foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'downloading') {
        $hasFiles = true;
        $info = file_get_contents($downloads_dir . '/' . $file);
        
        echo '<li class="list-group-item d-flex justify-content-between align-items-center p-3 ' . (strpos($info, 'ERROR') !== false ? 'bg-danger bg-opacity-10' : 'bg-light') . '">';
        echo '<div>';
        
        if (strpos($info, 'ERROR') !== false) {
            $err_parts = explode('|', $info);
            $err_desc = isset($err_parts[1]) ? $err_parts[1] : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
            echo '  <strong class="text-danger"><i class="fas fa-exclamation-circle me-2"></i>' . htmlspecialchars(str_replace('.mp4.downloading', '.mp4', $file)) . '</strong><br>';
            echo '  <small class="text-danger">ดาวน์โหลดล้มเหลว: ' . htmlspecialchars($err_desc) . '</small>';
        } else {
            $info_parts = explode(' | ', $info);
            $duration = isset($info_parts[3]) ? (int)$info_parts[3] : 0;
            $percent = 0;
            
            // คำนวณเปอร์เซ็นต์
            $remaining_text = '';
            if ($duration > 0) {
                $log_filename = str_replace('.mp4.downloading', '.log', $file);
                $log_path = $downloads_dir . '/' . $log_filename;
                if (file_exists($log_path) && filesize($log_path) > 0) {
                    $f = fopen($log_path, 'r');
                    if ($f) {
                        fseek($f, max(0, filesize($log_path) - 2048));
                        $log_content = fread($f, 2048);
                        fclose($f);
                        
                        if (preg_match_all('/SmartDL_Progress: ([\d\.]+)% \| ETA: (\d+)s/', $log_content, $matches)) {
                            $last_idx = count($matches[0]) - 1;
                            $percent = (float)$matches[1][$last_idx];
                            $rem_secs = (int)$matches[2][$last_idx];
                            
                            if ($percent < 1 || $rem_secs > 3600) {
                                $remaining_text = ' (กำลังคำนวณเวลา...)';
                            } else {
                                $rem_mins = floor($rem_secs / 60);
                                $rem_secs_only = $rem_secs % 60;
                                if ($rem_mins > 0 || $rem_secs_only > 0) {
                                    $remaining_text = ' (เหลือเวลาประมาณ ' . $rem_mins . ' นาที ' . $rem_secs_only . ' วิ)';
                                } else {
                                    $remaining_text = ' (กำลังรวมไฟล์...)';
                                }
                            }
                        } elseif (preg_match_all('/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/', $log_content, $matches)) {
                            $last_idx = count($matches[0]) - 1;
                            $hours = (int)$matches[1][$last_idx];
                            $mins = (int)$matches[2][$last_idx];
                            $secs = (float)$matches[3][$last_idx];
                            $current_time = ($hours * 3600) + ($mins * 60) + $secs;
                            $percent = min(99, round(($current_time / $duration) * 100)); // Cap at 99% until fully done
                            
                            // คำนวณเวลาที่เหลือโดยประมาณ (อิงจาก 1x Speed)
                            $rem_secs = max(0, $duration - $current_time);
                            $rem_mins = floor($rem_secs / 60);
                            $rem_secs_only = floor($rem_secs % 60);
                            if ($rem_mins > 0 || $rem_secs_only > 0) {
                                $remaining_text = ' (เหลือเวลาอีก ' . $rem_mins . ' นาที ' . $rem_secs_only . ' วิ)';
                            } else {
                                $remaining_text = ' (ใกล้เสร็จแล้ว...)';
                            }
                        }
                    }
                }
            }

            echo '  <div class="w-100">';
            echo '    <strong class="d-block mb-1"><i class="fas fa-spinner fa-spin text-info me-2"></i>' . htmlspecialchars(str_replace('.mp4.downloading', '.mp4', $file)) . '</strong>';
            echo '    <div class="progress mb-1" style="height: 10px; max-width: 300px;">';
            echo '      <div class="progress-bar progress-bar-striped progress-bar-animated bg-info" role="progressbar" style="width: ' . $percent . '%;" aria-valuenow="' . $percent . '" aria-valuemin="0" aria-valuemax="100"></div>';
            echo '    </div>';
            echo '    <small class="text-info">กำลังดาวน์โหลดจากกล้อง... ' . $percent . '%' . $remaining_text . '</small>';
            echo '  </div>';
        }
        
        echo '</div>';
        echo '<div class="d-flex gap-2 align-items-center">';
        
        if (strpos($info, 'ERROR') !== false) {
            echo '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-file" data-filename="' . htmlspecialchars(str_replace('.mp4.downloading', '.mp4', $file)) . '"><i class="fas fa-trash-alt"></i> ลบรายการ</button>';
        } else {
            echo '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-file" data-filename="' . htmlspecialchars(str_replace('.mp4.downloading', '.mp4', $file)) . '"><i class="fas fa-times"></i> ยกเลิก</button>';
        }
        
        echo '</div>';
        echo '</li>';
    }
}

// 1.5 แสดงไฟล์ที่รอคิวอยู่ (.queued files)
foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'queued') {
        $hasFiles = true;
        $info = '';
        if (file_exists($downloads_dir . '/' . $file . '.info')) {
            $info = file_get_contents($downloads_dir . '/' . $file . '.info');
        }
        
        $mp4_name = htmlspecialchars(str_replace('.mp4.queued', '.mp4', $file));
        
        echo '<li class="list-group-item d-flex justify-content-between align-items-center p-3 bg-light">';
        echo '<div>';
        echo '  <div class="w-100">';
        echo '    <strong class="d-block mb-1 text-secondary"><i class="fas fa-hourglass-half me-2"></i>' . $mp4_name . '</strong>';
        echo '    <small class="text-secondary">รอคิว: ระบบจะดาวน์โหลดอัตโนมัติเมื่อคิวก่อนหน้าเสร็จสิ้น</small>';
        echo '  </div>';
        echo '</div>';
        echo '<div class="d-flex gap-2 align-items-center">';
        echo '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-file" data-filename="' . $mp4_name . '"><i class="fas fa-times"></i> ยกเลิกคิว</button>';
        echo '</div>';
        echo '</li>';
    }
}

// 2. เรียงลำดับไฟล์ MP4 ล่าสุดขึ้นก่อน
$files_with_time = [];
foreach ($files as $file) {
    if ($file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'mp4') {
        if (strpos($file, 'temp_') === 0) continue;
        // ตรวจสอบว่าไฟล์นี้กำลังดาวน์โหลดอยู่หรือไม่ ถ้ากำลังโหลด ข้ามไปก่อน (ไม่ให้โชว์ปุ่มโหลดจนกว่าจะเสร็จ)
        if (file_exists($downloads_dir . '/' . $file . '.downloading')) {
            continue;
        }
        $files_with_time[$file] = filemtime($downloads_dir . '/' . $file);
    }
}
arsort($files_with_time);

foreach ($files_with_time as $file => $mtime) {
    $hasFiles = true;
    $filesize = filesize($downloads_dir . '/' . $file);
    
    // แปลงขนาดไฟล์
    if ($filesize >= 1073741824) {
        $size_str = number_format($filesize / 1073741824, 2) . ' GB';
    } elseif ($filesize >= 1048576) {
        $size_str = number_format($filesize / 1048576, 2) . ' MB';
    } else {
        $size_str = number_format($filesize / 1024, 2) . ' KB';
    }
    
    // อ่านข้อมูล Meta (ถ้ามี)
    $meta_file = $downloads_dir . '/' . $file . '.meta';
    $start_time_text = 'ไม่ทราบเวลาเริ่มต้น';
    $start_timestamp = 0;
    if (file_exists($meta_file)) {
        $meta_data = json_decode(file_get_contents($meta_file), true);
        if ($meta_data && isset($meta_data['start_time'])) {
            $start_time_text = $meta_data['start_time'];
            // แปลงรูปแบบ 13/08/2026 09:18 AM เป็น Timestamp สำหรับจัดเรียง
            $start_timestamp = strtotime(str_replace('/', '-', $start_time_text)) ?: 0;
        }
    }
    
    // ใส่ data-* สำหรับให้ JavaScript นำไปใช้ค้นหาและจัดเรียง
    echo '<li class="list-group-item d-flex justify-content-between align-items-center gap-1 gap-md-2 p-2 p-md-3 video-item" ' .
         'data-name="' . htmlspecialchars(strtolower($file)) . '" ' .
         'data-date-dl="' . $mtime . '" ' .
         'data-date-start="' . $start_timestamp . '">';
    echo '<div class="text-truncate" style="flex: 1; min-width: 0;">';
    echo '  <strong class="d-block text-truncate mb-1" style="font-size: 0.95rem;"><i class="fas fa-video text-primary me-1"></i>' . htmlspecialchars($file) . '</strong>';
    if ($start_timestamp > 0) {
        echo '  <small class="text-success fw-bold d-block text-truncate" style="font-size: 0.75rem; line-height: 1.2;"><i class="fas fa-calendar-alt me-1"></i> ' . htmlspecialchars($start_time_text) . '</small>';
    }
    echo '  <small class="text-muted d-block text-truncate mt-1" style="font-size: 0.75rem; line-height: 1.2;"><i class="fas fa-clock me-1"></i> ' . date('d/m/y H:i', $mtime) . ' <span class="ms-1 border-start ps-1"><i class="fas fa-hdd me-1"></i> ' . $size_str . '</span></small>';
    echo '</div>';
    echo '<div class="d-flex gap-1 gap-md-2 align-items-center flex-shrink-0">';
    echo '  <a href="downloads/' . htmlspecialchars($file) . '" class="btn btn-sm btn-success text-white shadow-sm text-center" style="border-radius: 50px; padding: 0.3rem 0.6rem; transition: transform 0.2s;" target="_blank" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fas fa-play-circle"></i><span class="d-none d-md-inline ms-1">เปิดดู</span></a>';
    echo '  <a href="downloads/' . htmlspecialchars($file) . '" class="btn btn-sm btn-primary text-white shadow-sm text-center" style="border-radius: 50px; padding: 0.3rem 0.6rem; transition: transform 0.2s;" download onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fas fa-cloud-download-alt"></i><span class="d-none d-md-inline ms-1">ดาวน์โหลด</span></a>';
    echo '  <button type="button" class="btn btn-sm btn-outline-danger btn-delete-file shadow-sm text-center" style="border-radius: 50px; padding: 0.3rem 0.6rem; transition: transform 0.2s;" data-filename="' . htmlspecialchars($file) . '" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'"><i class="fas fa-trash-alt"></i><span class="d-none d-md-inline ms-1">ลบ</span></button>';
    echo '</div>';
    echo '</li>';
}

if (!$hasFiles) {
    echo '<li class="list-group-item text-center text-muted p-4">ไม่มีไฟล์วิดีโอในระบบ</li>';
}
?>
