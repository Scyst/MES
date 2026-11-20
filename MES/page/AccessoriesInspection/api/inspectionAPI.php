<?php
/**
 * inspectionAPI.php — Inspection log API (ดึงประวัติจาก SQL Server)
 * Deploy to: MES/MES/page/AccessoriesInspection/api/
 *
 * action=get_logs — ดึงผลตรวจจาก ACCESSORIES_INSPECTION_LOG
 *   params : date=YYYY-MM-DD (optional), limit=N (default 50, max 9999)
 *   returns: { ok:true, rows:[{model, timestamp, result, elapsed_s, image,
 *                             s1_in, s1_out}, ...] }
 *   s1_in / s1_out = 'YYYY-MM-DD HH:MM:SS.mmm' (งานมาถึง / พ้น Sensor 1)
 *   (ถ้ายังไม่ได้ ALTER TABLE เพิ่ม S1_IN_TIME/S1_OUT_TIME จะ fallback เป็นชุดเดิม)
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
        $baseCols = "MODEL AS model,
                     CONVERT(varchar(19), TIME_STAMP, 120) AS timestamp,
                     RESULT AS result,
                     ELAPSED_S AS elapsed_s,
                     IMAGE AS image";
        $s1Cols = ",
                     CONVERT(varchar(23), S1_IN_TIME, 121)  AS s1_in,
                     CONVERT(varchar(23), S1_OUT_TIME, 121) AS s1_out";

        $fetch = function (string $cols) use ($pdo, $limit, $date) {
            $where = $date ? 'WHERE CAST(TIME_STAMP AS DATE) = CAST(:date AS DATE)' : '';
            $stmt = $pdo->prepare("
                SELECT TOP (:limit) $cols
                FROM ACCESSORIES_INSPECTION_LOG
                $where
                ORDER BY ID DESC
            ");
            if ($stmt === false) throw new PDOException('prepare failed');
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            if ($date) $stmt->bindValue(':date', $date);
            // throw เองด้วย เผื่อ PDO ไม่ได้ตั้ง ERRMODE_EXCEPTION
            if (!$stmt->execute()) throw new PDOException('execute failed');
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        };

        $s1 = true;
        try {
            $rows = $fetch($baseCols . $s1Cols);
        } catch (PDOException $e) {
            // ยังไม่ได้เพิ่มคอลัมน์ S1_IN_TIME/S1_OUT_TIME ในตาราง → ใช้ชุดเดิมไปก่อน
            error_log('[InspectionAPI] S1 columns unavailable: ' . $e->getMessage());
            $s1 = false;
            $rows = $fetch($baseCols);
        }

        // api_ver / s1 ไว้เช็คว่า server ใช้ API ตัวใหม่ และอ่านคอลัมน์ S1 ได้จริง
        echo json_encode(['ok' => true, 'api_ver' => 2, 's1' => $s1, 'rows' => $rows]);

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
