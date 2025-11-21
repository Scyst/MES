<?php
// page/inventorySettings/api/get_master_lines.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';

try {
    // ใช้ UNION เพื่อรวมรายชื่อ Line จากทุกแหล่ง และ DISTINCT อัตโนมัติ
    // ใช้ UPPER() เพื่อให้มาตรฐานเป็นตัวพิมพ์ใหญ่ทั้งหมด
    $sql = "
        SELECT DISTINCT UPPER(LTRIM(RTRIM(line))) as line FROM " . ROUTES_TABLE . " WHERE line IS NOT NULL AND line != ''
        UNION
        SELECT DISTINCT UPPER(LTRIM(RTRIM(line))) as line FROM " . SCHEDULES_TABLE . " WHERE line IS NOT NULL AND line != ''
        UNION
        SELECT DISTINCT UPPER(LTRIM(RTRIM(production_line))) as line FROM " . LOCATIONS_TABLE . " WHERE production_line IS NOT NULL AND production_line != ''
        UNION
        -- (Optional) ถ้ามีตาราง Manpower Mapping ก็เอามาด้วย
        SELECT DISTINCT UPPER(LTRIM(RTRIM(target_line))) as line FROM " . (IS_DEVELOPMENT ? 'MANPOWER_DEPARTMENT_MAPPING_TEST' : 'MANPOWER_DEPARTMENT_MAPPING') . " WHERE target_line IS NOT NULL
    ";

    $stmt = $pdo->query($sql);
    $lines = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // เรียงลำดับตัวอักษร
    sort($lines);

    echo json_encode(['success' => true, 'data' => $lines]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>