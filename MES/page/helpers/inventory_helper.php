<?php
// MES/page/helpers/inventory_helper.php

// --- Your existing helper functions (they are good, keep them) ---
function getLocationId($pdo, $locationName) {
    $stmt = $pdo->prepare("SELECT location_id FROM " . LOCATIONS_TABLE . " WHERE location_name = ?");
    $stmt->execute([$locationName]);
    $result = $stmt->fetchColumn();
    return $result ? (int)$result : null;
}

function getItemId($pdo, $partNo, $line, $model) {
    $paramStmt = $pdo->prepare("SELECT sap_no FROM " . PARAM_TABLE . " WHERE part_no = ? AND line = ? AND model = ?");
    $paramStmt->execute([$partNo, $line, $model]);
    $sap_no = $paramStmt->fetchColumn();
    if (!$sap_no) return null;

    $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
    $itemStmt->execute([$sap_no]);
    $result = $itemStmt->fetchColumn();
    return $result ? (int)$result : null;
}


// --- New, more robust functions ---

if (!function_exists('updateOnhandBalance')) {
    /**
     * Safely updates the on-hand stock for a given item and location.
     * Prevents stock from going negative.
     * @return bool - Returns true on success, false if there is insufficient stock.
     */
    function updateOnhandBalance(PDO $pdo, int $item_id, int $location_id, float $quantity_change): bool
    {
        if ($quantity_change < 0) {
            // If subtracting, use a safe UPDATE that checks stock levels atomically.
            $updateSql = "UPDATE " . ONHAND_TABLE . " 
                          SET quantity = quantity + ?, last_updated = GETDATE() 
                          WHERE parameter_id = ? AND location_id = ? AND quantity >= ?";
            
            $stmt = $pdo->prepare($updateSql);
            // Use abs() to get the positive value for the stock check (quantity >= abs(-50))
            $stmt->execute([$quantity_change, $item_id, $location_id, abs($quantity_change)]);

            // If no rows were affected, it means there was not enough stock.
            return $stmt->rowCount() > 0;
        } else {
            // If adding, use MERGE to handle both new and existing items.
            $mergeSql = "MERGE " . ONHAND_TABLE . " AS target 
                         USING (SELECT ? AS item_id, ? AS location_id) AS source 
                         ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) 
                         WHEN MATCHED THEN 
                             UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() 
                         WHEN NOT MATCHED THEN 
                             INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
            
            $stmt = $pdo->prepare($mergeSql);
            $stmt->execute([$item_id, $location_id, $quantity_change, $item_id, $location_id, $quantity_change]);
            return true; // Adding stock always succeeds.
        }
    }
}

if (!function_exists('logStockTransaction')) {
    /**
     * Inserts a record into the stock transactions table.
     */
    function logStockTransaction(PDO $pdo, int $item_id, float $quantity, string $type, ?int $from_loc, ?int $to_loc, int $user_id, ?string $notes, ?string $ref)
    {
        $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, reference_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$item_id, $quantity, $type, $from_loc, $to_loc, $user_id, $notes, $ref]);
    }
}