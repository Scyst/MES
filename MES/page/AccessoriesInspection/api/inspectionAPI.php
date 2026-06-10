<?php
/**
 * inspectionAPI.php — Inspection log API
 * Deploy to: MES_scanBarcode/page/accessoriesInspection/api/
 *
 * action=get_logs  — fetch latest N rows from ACCESSORIES_INSPECTION_LOG
 */

require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
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

        if ($date) {
            $stmt = $pdo->prepare("
                SELECT TOP (:limit)
                    ID,
                    MODEL,
                    CONVERT(varchar(19), TIME_STAMP, 120) AS TIMESTAMP,
                    RESULT,
                    ELAPSED_S
                FROM ACCESSORIES_INSPECTION_LOG
                WHERE CAST(TIME_STAMP AS DATE) = CAST(:date AS DATE)
                ORDER BY ID DESC
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':date',  $date);
        } else {
            $stmt = $pdo->prepare("
                SELECT TOP (:limit)
                    ID,
                    MODEL,
                    CONVERT(varchar(19), TIME_STAMP, 120) AS TIMESTAMP,
                    RESULT,
                    ELAPSED_S
                FROM ACCESSORIES_INSPECTION_LOG
                ORDER BY ID DESC
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        }

        $stmt->execute();
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data'    => $rows,
            'count'   => count($rows),
        ]);

    } else {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Unknown action: ' . htmlspecialchars($action, ENT_QUOTES, 'UTF-8'),
        ]);
    }

} catch (Throwable $e) {
    error_log('[InspectionAPI] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'เกิดข้อผิดพลาดในระบบ กรุณาติดต่อผู้ดูแลระบบ',
    ]);
}
