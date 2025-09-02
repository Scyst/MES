<?php
// api/get_dashboard_filters.php
require_once __DIR__ . '/../../db.php';

try {
    // 1. ดึงข้อมูล Lines
    $lineSql = "SELECT DISTINCT RTRIM(LTRIM(line)) as line 
                FROM " . ROUTES_TABLE . " 
                WHERE line IS NOT NULL AND line != '' 
                ORDER BY line ASC";
    $lineStmt = $pdo->query($lineSql);
    $lines = $lineStmt->fetchAll(PDO::FETCH_COLUMN);

    // 2. ดึงข้อมูล Models
    $modelSql = "SELECT DISTINCT RTRIM(LTRIM(model)) as model 
                 FROM " . ROUTES_TABLE . " 
                 WHERE model IS NOT NULL AND model != '' 
                 ORDER BY model ASC";
    $modelStmt = $pdo->query($modelSql);
    $models = $modelStmt->fetchAll(PDO::FETCH_COLUMN);

    // 3. รวบรวมข้อมูลทั้งหมดแล้วส่งกลับใน JSON เดียว
    echo json_encode([
        'success' => true, 
        'data' => [
            'lines' => $lines,
            'models' => $models
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to fetch filter data.']);
    error_log("Error in get_dashboard_filters.php: " . $e->getMessage());
}
?>