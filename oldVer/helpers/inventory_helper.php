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
    $paramStmt = $pdo->prepare("SELECT sap_no FROM " . PARAMETER_TABLE . " WHERE part_no = ? AND line = ? AND model = ?");
    $paramStmt->execute([$partNo, $line, $model]);
    $sap_no = $paramStmt->fetchColumn();
    if (!$sap_no) return null;

    $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
    $itemStmt->execute([$sap_no]);
    $result = $itemStmt->fetchColumn();
    return $result ? (int)$result : null;
}

if (!function_exists('updateOnhandBalance')) {
    /**
     * Updates on-hand stock. This version ALLOWS negative inventory.
     * @return bool - Always returns true as it no longer checks for sufficient stock.
     */
    function updateOnhandBalance(PDO $pdo, int $item_id, int $location_id, float $quantity_change): bool
    {
        // MERGE statement handles all cases: positive, negative, new, and existing items.
        $mergeSql = "MERGE " . ONHAND_TABLE . " AS target 
                     USING (SELECT ? AS item_id, ? AS location_id) AS source 
                     ON (target.parameter_id = source.item_id AND target.location_id = source.location_id) 
                     WHEN MATCHED THEN 
                         UPDATE SET quantity = target.quantity + ?, last_updated = GETDATE() 
                     WHEN NOT MATCHED THEN 
                         INSERT (parameter_id, location_id, quantity) VALUES (?, ?, ?);";
        
        $stmt = $pdo->prepare($mergeSql);
        // For a new item (NOT MATCHED), the starting quantity will be the change itself.
        $stmt->execute([$item_id, $location_id, $quantity_change, $item_id, $location_id, $quantity_change]);
        
        return true; // This function will now always report success.
    }
}

if (!function_exists('logStockTransaction')) {
    /**
     * Inserts a record into the stock transactions table.
     */
    function logStockTransaction(
        PDO $pdo, 
        int $item_id, 
        float $quantity, 
        string $type, 
        ?int $from_loc, 
        ?int $to_loc, 
        int $user_id, 
        ?string $notes, 
        ?string $ref,
        // --- เพิ่ม 2 พารามิเตอร์นี้เข้ามา ---
        ?string $start_time = null,
        ?string $end_time = null
    )
    {
        // --- เพิ่ม 2 คอลัมน์นี้เข้าไปใน SQL ---
        $sql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                    (parameter_id, quantity, transaction_type, from_location_id, to_location_id, created_by_user_id, notes, reference_id, start_time, end_time) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $stmt = $pdo->prepare($sql);
        // --- เพิ่ม 2 ตัวแปรนี้เข้าไปใน execute() ---
        $stmt->execute([$item_id, $quantity, $type, $from_loc, $to_loc, $user_id, $notes, $ref, $start_time, $end_time]);
    }
}