<?php
header('Content-Type: application/json; charset=utf-8');
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

// Hybrid Auth: checks granular permission or fallback to administrative roles
if (!hasPermission('manage_sap_sync') && !hasPermission('manage_system_settings') && !hasRole(['admin', 'creator', 'supervisor', 'manager'])) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized Access.']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    if (empty($_SERVER['HTTP_X_CSRF_TOKEN']) || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_SERVER['HTTP_X_CSRF_TOKEN'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'CSRF token validation failed.']);
        exit;
    }
}

try {
    /**
     * Single SQL query approach:
     * 1. Merge both staging tables (ALL_STOCK has priority over OPERATION_SLIP via ROW_NUMBER)
     * 2. LEFT JOIN with ITEMS using RTRIM/LTRIM to handle whitespace
     * 3. Use COUNT(DISTINCT item_id) to detect duplicates safely
     * 4. MIN(material_type) / MIN(part_description) to safely aggregate duplicate rows in ITEMS
     */
    $diffQuery = "
        WITH SAPItems AS (
            SELECT Mat_No, MatDesc, 1 AS src_priority
            FROM SAP_STG_ALL_STOCK WITH (NOLOCK)
            WHERE Mat_No IS NOT NULL AND RTRIM(LTRIM(Mat_No)) != ''
            UNION ALL
            SELECT Mat_No, MatDesc, 2 AS src_priority
            FROM SAP_STG_OPERATION_SLIP WITH (NOLOCK)
            WHERE Mat_No IS NOT NULL AND RTRIM(LTRIM(Mat_No)) != ''
        ),
        RankedSAP AS (
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
        LEFT JOIN dbo.ITEMS i WITH (NOLOCK) ON RTRIM(LTRIM(i.sap_no)) = s.Mat_No
        GROUP BY s.Mat_No, s.MatDesc
        OPTION (RECOMPILE)
    ";

    $diffStmt = $pdo->prepare($diffQuery);
    $diffStmt->execute();
    $diffRows = $diffStmt->fetchAll(PDO::FETCH_ASSOC);
    $diffStmt->closeCursor();

    $isDryRun = (isset($_REQUEST['dry_run']) && $_REQUEST['dry_run'] == '1') || (($_REQUEST['action'] ?? '') === 'preview');

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

    $updateStmt = $pdo->prepare("
        UPDATE dbo.ITEMS
        SET part_description = ?
        WHERE sap_no = ? AND material_type = 'UNCLASSIFIED'
    ");

    foreach ($diffRows as $row) {
        $matNo   = trim($row['Mat_No']);
        $matDesc = trim($row['MatDesc']);
        $count   = (int)$row['item_count'];

        if ($count === 0) {
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
        writeLog($pdo, 'SYNC_SAP_ITEMS', 'SYSTEM_SETTINGS', 0, null, ['inserted' => $inserted, 'updated' => $updated], "Synced items from SAP staging");
    }

    $actionMsg = $isDryRun ? "Preview generated" : "Sync completed successfully";

    echo json_encode([
        'success'        => true,
        'message'        => "$actionMsg. $inserted new items, $updated items updated.",
        'data'           => [
            'inserted'       => $inserted,
            'updated'        => $updated,
            'affected_items' => $affectedItems,
            'is_dry_run'     => $isDryRun
        ],
        'inserted'       => $inserted,
        'updated'        => $updated,
        'affected_items' => $affectedItems,
        'is_dry_run'     => $isDryRun
    ]);

} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $_REQUEST);
}
?>

