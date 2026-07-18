<?php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$matNo = $input['mat_no'] ?? '';
$sapQty = (float)($input['sap_qty'] ?? 0);

if (empty($matNo)) {
    echo json_encode(['success' => false, 'message' => 'Missing Material Number.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Get item_id
    $stmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
    $stmt->execute([$matNo]);
    $itemId = $stmt->fetchColumn();

    if (!$itemId) {
        throw new Exception("Material $matNo not found in MES ITEMS table.");
    }

    // 2. Get total current MES qty
    $qtyStmt = $pdo->prepare("SELECT SUM(quantity) FROM " . ONHAND_TABLE . " WHERE parameter_id = ?");
    $qtyStmt->execute([$itemId]);
    $currentMesQty = (float)$qtyStmt->fetchColumn();

    $diff = $sapQty - $currentMesQty;

    if ($diff != 0) {
        // Find a location to adjust
        $locStmt = $pdo->prepare("SELECT TOP 1 location_id FROM " . ONHAND_TABLE . " WHERE parameter_id = ? AND quantity > 0");
        $locStmt->execute([$itemId]);
        $locId = $locStmt->fetchColumn();

        if (!$locId) {
            $locStmt = $pdo->prepare("SELECT TOP 1 location_id FROM " . LOCATIONS_TABLE . " WHERE location_type = 'STORE' AND is_active = 1");
            $locStmt->execute();
            $locId = $locStmt->fetchColumn();
        }

        if (!$locId) {
            throw new Exception("No active STORE location found to perform adjustment.");
        }

        // Call sp_UpdateOnhandBalance (MERGE logic)
        $spStmt = $pdo->prepare("EXEC dbo.sp_UpdateOnhandBalance @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        $spStmt->execute([$itemId, $locId, $diff]);

        // Insert log into STOCK_TRANSACTIONS
        $currentUser = $_SESSION['user'] ?? ['id' => 1, 'username' => 'System'];
        $notes = "SAP Sync Adjustment (SAP Qty: $sapQty, MES was: $currentMesQty)";
        
        $logStmt = $pdo->prepare("
            INSERT INTO " . TRANSACTIONS_TABLE . " 
            (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, to_location_id, created_by_user_id, notes) 
            VALUES (?, ?, ?, GETDATE(), ?, ?, ?, ?)
        ");
        $logStmt->execute([
            $itemId,
            $diff,
            'ADJUSTMENT',
            null, // from
            $locId, // to
            $currentUser['id'],
            $notes
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => "Adjusted $matNo successfully. MES quantity is now matching SAP ($sapQty)."]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}
?>
