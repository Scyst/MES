<?php
require_once 'e:\MES\MES\MES_TEST\page\db.php';

$sapQuery = "SELECT DISTINCT Mat_No, MatDesc FROM SAP_STG_ALL_STOCK WHERE Mat_No = '10011635'";
$sapStmt = $pdo->query($sapQuery);
$sapItemsRaw = $sapStmt->fetchAll(PDO::FETCH_ASSOC);

$sapItemsMap = [];
foreach ($sapItemsRaw as $row) {
    $sapItemsMap[trim($row['Mat_No'])] = trim($row['MatDesc']);
}

$checkStmt = $pdo->prepare("SELECT item_id, part_description, material_type FROM dbo.ITEMS WHERE sap_no = ?");
foreach ($sapItemsMap as $matNo => $matDesc) {
    $checkStmt->execute([$matNo]);
    $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

    echo "matNo: $matNo\n";
    echo "matDesc (from Staging): '$matDesc'\n";
    
    if ($existing) {
        echo "existing part_description: '" . $existing['part_description'] . "'\n";
        echo "existing material_type: '" . $existing['material_type'] . "'\n";
        
        $trimMaterialType = trim($existing['material_type']);
        echo "trim(material_type) === 'UNCLASSIFIED': " . ($trimMaterialType === 'UNCLASSIFIED' ? 'true' : 'false') . "\n";
        
        $trimDesc = trim($existing['part_description']);
        echo "trim(part_description) !== matDesc: " . ($trimDesc !== $matDesc ? 'true' : 'false') . "\n";
    }
}
