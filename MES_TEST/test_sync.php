<?php
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/page/db.php';

$pdo->beginTransaction();
try {
    // Let's create a test item first
    $testSapNo = '99999999';
    $testSapDesc = 'Original SAP Desc';

    // 1. Insert into Staging
    $pdo->exec("DELETE FROM TOOLBOX_TEMP.dbo.SAP_STG_ALL_STOCK WHERE Mat_No = '99999999'");
    $pdo->exec("INSERT INTO TOOLBOX_TEMP.dbo.SAP_STG_ALL_STOCK (Mat_No, MatDesc) VALUES ('99999999', 'Original SAP Desc')");

    // 2. Insert into MES ITEMS but with a DIFFERENT description
    $pdo->exec("DELETE FROM dbo.ITEMS WHERE sap_no = '99999999'");
    $pdo->exec("INSERT INTO dbo.ITEMS (sap_no, part_no, part_description, material_type) VALUES ('99999999', '99999999', 'Original SAP Desc TEST', 'UNCLASSIFIED')");

    // Now let's run the exact logic from sync_sap_items.php
    $sapQuery = "SELECT DISTINCT Mat_No, MatDesc FROM TOOLBOX_TEMP.dbo.SAP_STG_ALL_STOCK WHERE Mat_No = '99999999'";
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

        echo "Found Existing:\n";
        print_r($existing);
        echo "SAP Desc: $matDesc\n";
        
        if ($existing) {
            if (trim($existing['material_type']) === 'UNCLASSIFIED') {
                if (trim($existing['part_description']) !== $matDesc) {
                    echo "UPDATE TRIGGERED!\n";
                } else {
                    echo "UPDATE NOT TRIGGERED (Descriptions match)\n";
                }
            } else {
                echo "NOT UNCLASSIFIED\n";
            }
        }
    }
    $pdo->rollBack();
} catch (Exception $e) {
    echo $e->getMessage();
}
