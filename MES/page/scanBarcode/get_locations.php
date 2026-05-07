<?php
// ============================================
// API: ดึงรายการ Location สำหรับ Dropdown
// ============================================
require_once 'config.php';
setApiHeaders();

try {
    $pdo = getDBConnection();

    $sql = "SELECT
                " . COL_LOC_ID   . " AS location_id,
                " . COL_LOC_NAME . " AS location_name
            FROM " . TBL_LOCATIONS . "
            ORDER BY " . COL_LOC_NAME;

    $stmt = $pdo->query($sql);
    $locations = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => $locations
    ]);
} catch (PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
