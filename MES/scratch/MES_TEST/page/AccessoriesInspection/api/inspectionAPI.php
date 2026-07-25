<?php
/**
 * inspectionAPI.php — Inspection log API (ดึงประวัติจาก SQL Server)
 * Deploy to: MES/MES/page/AccessoriesInspection/api/
 *
 * action=get_logs — ดึงผลตรวจจาก ACCESSORIES_INSPECTION_LOG
 *   params : date=YYYY-MM-DD (optional), limit=N (default 50, max 9999)
 *   returns: { ok:true, rows:[{model, timestamp, result, elapsed_s, image}, ...] }
 *
 * คอลัมน์ alias เป็นตัวเล็กให้ตรงกับที่ accessoriesInspection.js ใช้ (renderLogs)
 * รูป (image) เป็นชื่อไฟล์ที่หน้าเว็บเปิดจาก img/ บน web server เดียวกัน
 */

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'CSRF token validation failed.']);
        exit;
    }
}

$action = $_GET['action'] ?? '';

try {

    if ($action === 'get_logs') {
        $limit = max(1, min((int)($_GET['limit'] ?? 50), 9999));

        // reject malformed dates before they reach SQL
        $date = $_GET['date'] ?? '';
        if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $date = '';
        }

        // คอลัมน์ alias ตัวเล็ก — ตรงกับ field ที่ accessoriesInspection.js อ่าน
        $cols = "MODEL AS model,
                 CONVERT(varchar(19), TIME_STAMP, 120) AS timestamp,
                 RESULT AS result,
                 ELAPSED_S AS elapsed_s,
                 IMAGE AS image";

        if ($date) {
            $stmt = $pdo->prepare("
                SELECT TOP (:limit) $cols
                FROM ACCESSORIES_INSPECTION_LOG
                WHERE CAST(TIME_STAMP AS DATE) = CAST(:date AS DATE)
                ORDER BY ID DESC
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':date',  $date);
        } else {
            $stmt = $pdo->prepare("
                SELECT TOP (:limit) $cols
                FROM ACCESSORIES_INSPECTION_LOG
                ORDER BY ID DESC
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode(['ok' => true, 'rows' => $rows]);

    } else {
        http_response_code(400);
        echo json_encode([
            'ok'    => false,
            'error' => 'Unknown action: ' . htmlspecialchars($action, ENT_QUOTES, 'UTF-8'),
        ]);
    }

} catch (Throwable $e) {
    error_log('[InspectionAPI] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => 'เกิดข้อผิดพลาดในระบบ กรุณาติดต่อผู้ดูแลระบบ',
    ]);
}
