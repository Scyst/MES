<?php
// page/manpower/api/manage_mapping.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

// ตรวจสอบสิทธิ์ (ถ้าจำเป็น)
if (!hasRole(['admin', 'creator'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? 'read_all';

try {
    if ($action === 'read_all') {
        // 1. ดึงข้อมูล Section Mapping
        $sqlSec = "SELECT * FROM " . MANPOWER_SEC_MAPPING_TABLE . " ORDER BY display_section";
        $stmtSec = $pdo->query($sqlSec);
        $sections = $stmtSec->fetchAll(PDO::FETCH_ASSOC);

        // 2. ดึงข้อมูล Category Mapping
        $sqlCat = "SELECT * FROM " . MANPOWER_CAT_MAPPING_TABLE . " ORDER BY category_name";
        $stmtCat = $pdo->query($sqlCat);
        $categories = $stmtCat->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'sections' => $sections,
            'categories' => $categories
        ]);
    } 
    
    elseif ($action === 'save_all') {
        // รับข้อมูล JSON จากหน้าเว็บ
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);

        if (!$data) throw new Exception("Invalid Data");

        $pdo->beginTransaction();

        // --- จัดการ Section Mapping ---
        // วิธีที่ง่ายที่สุดคือลบของเก่าแล้ว Insert ใหม่ทั้งหมด (สำหรับตาราง Mapping ขนาดเล็ก)
        $pdo->exec("DELETE FROM " . MANPOWER_SEC_MAPPING_TABLE);
        $stmtSec = $pdo->prepare("INSERT INTO " . MANPOWER_SEC_MAPPING_TABLE . " (api_department, display_section, is_production) VALUES (?, ?, ?)");
        
        foreach ($data['sections'] as $sec) {
            $stmtSec->execute([
                $sec['api_department'], 
                $sec['display_section'], 
                $sec['is_production']
            ]);
        }

        // --- จัดการ Category Mapping (ถ้าส่งมา) ---
        if (isset($data['categories'])) {
            $pdo->exec("DELETE FROM " . MANPOWER_CAT_MAPPING_TABLE);
            $stmtCat = $pdo->prepare("INSERT INTO " . MANPOWER_CAT_MAPPING_TABLE . " (api_position, category_name) VALUES (?, ?)");
            foreach ($data['categories'] as $cat) {
                $stmtCat->execute([$cat['api_position'], $cat['category_name']]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'บันทึกข้อมูลสำเร็จ']);
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}