<?php
require_once 'config.php';
setApiHeaders();

try {
    $pdo = getDBConnection();

    $sql = "SELECT COUNT(*) AS today_count
            FROM " . TBL_SCAN_LOGS . "
            WHERE CONVERT(date, " . COL_LOG_LOGDATE . ") = CONVERT(date, GETDATE())";

    $stmt = $pdo->query($sql);
    $row  = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'count'   => (int)$row['today_count']
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'count'   => 0,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
