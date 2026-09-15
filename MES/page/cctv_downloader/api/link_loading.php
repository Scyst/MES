<?php
// page/cctv_downloader/api/link_loading.php
// API: ดึงข้อมูล Loading Reports ที่ COMPLETED สำหรับ Link กับ CCTV Downloader
// ไฟล์ใหม่ - ไม่กระทบโค้ดเดิม

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json');
date_default_timezone_set('Asia/Bangkok');

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$date = $_REQUEST['date'] ?? date('Y-m-d');

// Validate date format (YYYY-MM-DD)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    echo json_encode(['success' => false, 'message' => 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)']);
    exit;
}

try {
    $sql = "SELECT r.id AS report_id,
                   FORMAT(r.loading_start_time, 'yyyy-MM-dd HH:mm') AS loading_start_time,
                   FORMAT(r.loading_end_time, 'yyyy-MM-dd HH:mm') AS loading_end_time,
                   r.container_no,
                   s.po_number,
                   s.description
            FROM " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK)
            INNER JOIN " . SALES_ORDERS_TABLE . " s WITH (NOLOCK) ON r.sales_order_id = s.id
            WHERE r.status = 'COMPLETED'
              AND CAST(r.loading_start_time AS DATE) = ?
              AND r.loading_start_time IS NOT NULL
              AND r.loading_end_time IS NOT NULL
            ORDER BY r.loading_start_time ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$date]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Already Downloaded Detection: ตรวจสอบว่ามีไฟล์อยู่ใน downloads/ แล้วหรือไม่
    $downloads_dir = __DIR__ . '/../downloads';
    foreach ($data as &$row) {
        $sanitized_po = preg_replace('/[^a-zA-Z0-9_-]/', '_', $row['po_number'] ?? '');
        $row['sanitized_filename'] = $sanitized_po;
        $row['already_exists'] = false;
        $row['exists_status'] = '';

        if (!empty($sanitized_po) && is_dir($downloads_dir)) {
            $mp4_file = $downloads_dir . '/' . $sanitized_po . '.mp4';
            $downloading_file = $mp4_file . '.downloading';
            $queued_file = $mp4_file . '.queued';

            if (file_exists($mp4_file)) {
                $row['already_exists'] = true;
                $row['exists_status'] = 'downloaded';
            } elseif (file_exists($downloading_file)) {
                $row['already_exists'] = true;
                $row['exists_status'] = 'downloading';
            } elseif (file_exists($queued_file)) {
                $row['already_exists'] = true;
                $row['exists_status'] = 'queued';
            }
        }
    }
    unset($row);

    echo json_encode([
        'success' => true,
        'data' => $data,
        'count' => count($data)
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database Error: ' . $e->getMessage()
    ]);
}
