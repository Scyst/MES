<?php
require_once 'config.php';
setApiHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$barcode = trim($_GET['barcode'] ?? '');

if (empty($barcode)) {
    echo json_encode(['success' => false, 'message' => 'กรุณาระบุ Barcode']);
    exit;
}

try {
    $pdo = getDBConnection();

    $sql = "SELECT TOP 1
                " . COL_PROD_BARCODE   . " AS barcode,
                " . COL_PROD_SAP       . " AS sap_no,
                " . COL_PROD_PART_NO   . " AS part_no,
                " . COL_PROD_PART_DESC . " AS part_description
            FROM (
                SELECT " . COL_PROD_BARCODE   . ",
                       " . COL_PROD_SAP       . ",
                       " . COL_PROD_PART_NO   . ",
                       " . COL_PROD_PART_DESC . "
                FROM " . TBL_PRODUCTS . "
                WHERE " . COL_PROD_MATERIAL_TYPE . " = 'FG'
            ) AS fg_items
            WHERE " . COL_PROD_BARCODE . " = :barcode";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([':barcode' => $barcode]);
    $product = $stmt->fetch();

    if ($product) {
        echo json_encode(['success' => true, 'data' => $product]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'ไม่พบ Barcode นี้ในระบบ',
            'barcode' => $barcode
        ]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
