<?php
$pdo = new PDO('sqlsrv:Server=10.1.1.31;Database=TOOLBOX_TEMP;TrustServerCertificate=true', 'TOOLBOX', 'I1o1@T@#1boX');


header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch unique Mat_No from Staging ALL_STOCK
    $sapQuery = "SELECT DISTINCT Mat_No, MatDesc FROM TOOLBOX_TEMP.dbo.SAP_STG_ALL_STOCK WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $sapStmt = $pdo->query($sapQuery);
    $sapItemsRaw = $sapStmt->fetchAll(PDO::FETCH_ASSOC);

    // Combine with Staging OperationSlip for completeness
    $sapOpsQuery = "SELECT DISTINCT Mat_No, MatDesc FROM TOOLBOX_TEMP.dbo.SAP_STG_OPERATION_SLIP WHERE Mat_No IS NOT NULL AND Mat_No != ''";
    $sapOpsStmt = $pdo->query($sapOpsQuery);
    $sapOpsRaw = $sapOpsStmt->fetchAll(PDO::FETCH_ASSOC);

    $sapItemsMap = [];
    foreach ($sapItemsRaw as $row) {
        $sapItemsMap[trim($row['Mat_No'])] = trim($row['MatDesc']);
    }
    foreach ($sapOpsRaw as $row) {
        $sapItemsMap[trim($row['Mat_No'])] = trim($row['MatDesc']);
    }

    $inserted = 0;
    $updated = 0;
    $affectedItems = [];

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO dbo.ITEMS (
            sap_no, part_no, part_description, material_type, material_sub_type, 
            is_active, is_tracking, created_at, min_stock, max_stock
        ) VALUES (
            ?, ?, ?, 'UNCLASSIFIED', 'UNCLASSIFIED', 
            1, 0, GETDATE(), 0, 0
        )
    ");
    $updateStmt = $pdo->prepare("UPDATE dbo.ITEMS SET part_description = ? WHERE sap_no = ?");
    $checkStmt = $pdo->prepare("SELECT item_id, part_description, material_type FROM dbo.ITEMS WHERE sap_no = ?");

    // Check existing
    foreach ($sapItemsMap as $matNo => $matDesc) {
        $checkStmt->execute([$matNo]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            // Insert new item
            $insertStmt->execute([$matNo, $matNo, $matDesc]);
            $inserted++;
            
            $affectedItems[] = [
                'action' => 'NEW',
                'sap_no' => $matNo,
                'part_description' => $matDesc,
                'material_type' => 'UNCLASSIFIED'
            ];
        } else {
            // If exists and is UNCLASSIFIED, overwrite description if changed
            if (trim($existing['material_type']) === 'UNCLASSIFIED') {
                if (trim($existing['part_description']) !== $matDesc) {
                    $updateStmt->execute([$matDesc, $matNo]);
                    $updated++;
                    
                    $affectedItems[] = [
                        'action' => 'UPDATE',
                        'sap_no' => $matNo,
                        'part_description' => $matDesc,
                        'old_description' => $existing['part_description'],
                        'material_type' => 'UNCLASSIFIED'
                    ];
                }
            }
        }
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => "Sync complete. Inserted: $inserted, Updated: $updated.",
        'inserted' => $inserted,
        'updated' => $updated,
        'affected_items' => $affectedItems
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>

