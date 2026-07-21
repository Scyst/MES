<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

try {
    /**
     * Single SQL query approach:
     * 1. Merge both staging tables (ALL_STOCK has priority over OPERATION_SLIP via ROW_NUMBER)
     * 2. LEFT JOIN with ITEMS using RTRIM/LTRIM to handle whitespace
     * 3. Use COUNT(DISTINCT item_id) to detect duplicates safely — no more fetch() cursor bugs
     * 4. MIN(material_type) / MIN(part_description) to safely aggregate duplicate rows in ITEMS
     */
    $diffQuery = "
        WITH SAPItems AS (
            SELECT Mat_No, MatDesc, 1 AS src_priority
            FROM SAP_STG_ALL_STOCK
            WHERE Mat_No IS NOT NULL AND RTRIM(LTRIM(Mat_No)) != ''
            UNION ALL
            SELECT Mat_No, MatDesc, 2 AS src_priority
            FROM SAP_STG_OPERATION_SLIP
            WHERE Mat_No IS NOT NULL AND RTRIM(LTRIM(Mat_No)) != ''
        ),
        RankedSAP AS (
            -- ALL_STOCK wins when the same Mat_No exists in both tables
            SELECT
                RTRIM(LTRIM(Mat_No)) AS Mat_No,
                RTRIM(LTRIM(MatDesc)) AS MatDesc,
                ROW_NUMBER() OVER (PARTITION BY RTRIM(LTRIM(Mat_No)) ORDER BY src_priority) AS rn
            FROM SAPItems
        ),
        UniqueSAP AS (
            SELECT Mat_No, MatDesc FROM RankedSAP WHERE rn = 1
        )
        SELECT
            s.Mat_No,
            s.MatDesc,
            COUNT(i.item_id)          AS item_count,
            MIN(i.part_description)   AS existing_desc,
            MIN(i.material_type)      AS existing_type
        FROM UniqueSAP s
        LEFT JOIN dbo.ITEMS i ON RTRIM(LTRIM(i.sap_no)) = s.Mat_No
        GROUP BY s.Mat_No, s.MatDesc
        OPTION (RECOMPILE)  -- Force fresh plan every time to avoid cold-cache 0-row bug
    ";

    // Use prepare()->execute() instead of query() to avoid pdo_sqlsrv first-run empty result
    $diffStmt = $pdo->prepare($diffQuery);
    $diffStmt->execute();
    $diffRows = $diffStmt->fetchAll(PDO::FETCH_ASSOC);
    $diffStmt->closeCursor(); // Release result set before starting transaction

    $isDryRun = isset($_GET['dry_run']) && $_GET['dry_run'] == '1';

    $inserted     = 0;
    $updated      = 0;
    $affectedItems = [];

    if (!$isDryRun) {
        $pdo->beginTransaction();
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO dbo.ITEMS (
            sap_no, part_no, part_description, material_type, material_sub_type,
            is_active, is_tracking, created_at, min_stock, max_stock
        ) VALUES (
            ?, ?, ?, 'UNCLASSIFIED', 'UNCLASSIFIED',
            1, 0, GETDATE(), 0, 0
        )
    ");

    // Update only UNCLASSIFIED rows — never touch classified items
    $updateStmt = $pdo->prepare("
        UPDATE dbo.ITEMS
        SET part_description = ?
        WHERE sap_no = ? AND material_type = 'UNCLASSIFIED'
    ");

    foreach ($diffRows as $row) {
        $matNo   = trim($row['Mat_No']);
        $matDesc = trim($row['MatDesc']); // Trim for safety despite SQL RTRIM/LTRIM
        $count   = (int)$row['item_count'];

        if ($count === 0) {
            // Not in ITEMS at all — insert it
            if (!$isDryRun) {
                $insertStmt->execute([$matNo, $matNo, $matDesc]);
            }
            $inserted++;

            $affectedItems[] = [
                'action'           => 'NEW',
                'sap_no'           => $matNo,
                'part_description' => $matDesc,
                'material_type'    => 'UNCLASSIFIED',
            ];

        } else {
            // Already exists — only overwrite description if still UNCLASSIFIED AND desc differs
            $existingType = trim($row['existing_type'] ?? '');
            $existingDesc = trim($row['existing_desc'] ?? '');

            if ($existingType === 'UNCLASSIFIED' && $existingDesc !== $matDesc) {
                if (!$isDryRun) {
                    $updateStmt->execute([$matDesc, $matNo]);
                }
                $updated++;

                $affectedItems[] = [
                    'action'           => 'UPDATE',
                    'sap_no'           => $matNo,
                    'part_description' => $matDesc,
                    'old_description'  => $existingDesc,
                    'material_type'    => 'UNCLASSIFIED',
                ];
            }
        }
    }

    if (!$isDryRun) {
        $pdo->commit();
    }

    $actionMsg = $isDryRun ? "Preview generated" : "Sync completed successfully";

    echo json_encode([
        'success'        => true,
        'message'        => "$actionMsg. $inserted new items, $updated items updated.",
        'inserted'       => $inserted,
        'updated'        => $updated,
        'affected_items' => $affectedItems,
        'is_dry_run'     => $isDryRun
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage(),
    ]);
}
?>
