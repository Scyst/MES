<?php
require_once 'e:\MES\MES\MES_TEST\page\db.php';
$checkStmt = $pdo->prepare("SELECT item_id, part_description, material_type FROM dbo.ITEMS WHERE sap_no = '10011635'");
$checkStmt->execute();
$existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

$matDesc = 'SPCC 0.8x1219x2438 mm.';

echo "Material Type: '" . trim($existing['material_type']) . "'\n";
echo "DB Desc: '" . trim($existing['part_description']) . "'\n";
echo "SAP Desc: '" . $matDesc . "'\n";

if (trim($existing['material_type']) === 'UNCLASSIFIED') {
    if (trim($existing['part_description']) !== $matDesc) {
        echo "MISMATCH FOUND! Updating...\n";
        $updateStmt = $pdo->prepare("UPDATE dbo.ITEMS SET part_description = ? WHERE sap_no = ?");
        $success = $updateStmt->execute([$matDesc, '10011635']);
        echo "Update result: " . ($success ? "true" : "false") . "\n";
        echo "Row count: " . $updateStmt->rowCount() . "\n";
    } else {
        echo "MATCH! No update needed.\n";
    }
} else {
    echo "NOT UNCLASSIFIED\n";
}
