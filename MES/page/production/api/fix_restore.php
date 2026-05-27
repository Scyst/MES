<?php
require_once __DIR__ . '/../../db.php';

echo "Starting recovery...\n";

try {
    $pdo->beginTransaction();

    // Find all PENDING orders
    $stmt = $pdo->query("SELECT * FROM dbo.STOCK_TRANSFER_ORDERS WHERE status = 'PENDING'");
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $restored_count = 0;
    
    // We will keep track of used transaction IDs so we don't map multiple orders to the same transaction
    $used_txn_ids = [];

    foreach ($orders as $order) {
        // SAFETY CHECK: Only process auto-created requests (which always start with [SNC] or [Vendor])
        if (!preg_match('/^\[.*?\]/', $order['notes'])) {
            continue; 
        }
        
        $matched_txn = null;

        // 1. If it has [TXN:...]
        if (preg_match('/\[TXN:(\d+)\]/', $order['notes'], $matches)) {
            $txn_id = $matches[1];
            $txnStmt = $pdo->prepare("SELECT * FROM dbo.TRANSACTIONS_TABLE WHERE transaction_id = ?");
            $txnStmt->execute([$txn_id]);
            $matched_txn = $txnStmt->fetch(PDO::FETCH_ASSOC);
        } else {
            // 2. Try to match by item_id, user_id, and notes
            $clean_note = preg_replace('/^\[.*?\]\s*/', '', $order['notes']);
            $clean_note = trim($clean_note);
            
            $sql = "SELECT * FROM dbo.TRANSACTIONS_TABLE 
                    WHERE parameter_id = ? AND transaction_type = 'PRODUCTION_SCRAP' AND created_by_user_id = ?";
            
            $txnStmt = $pdo->prepare($sql);
            $txnStmt->execute([$order['item_id'], $order['created_by_user_id']]);
            $possible_txns = $txnStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($possible_txns as $ptxn) {
                if (in_array($ptxn['transaction_id'], $used_txn_ids)) continue;
                
                $ptxn_note = preg_replace('/\[TEAM_OVERRIDE:\s*[^\]]+\]\s*/', '', $ptxn['notes']);
                $ptxn_note = trim($ptxn_note);
                
                // If it's scan barcode, it has "Scan: " prefix, we can try to strip it too
                $ptxn_note_scan = preg_replace('/^Scan:\s*/', '', $ptxn_note);
                
                if ($ptxn_note === $clean_note || $ptxn_note_scan === $clean_note || $clean_note === 'Auto-Scan Fallback') {
                    $matched_txn = $ptxn;
                    break;
                }
            }
            
            // If still no match, just take the most recent unused one for this item and user
            if (!$matched_txn) {
                foreach ($possible_txns as $ptxn) {
                    if (!in_array($ptxn['transaction_id'], $used_txn_ids)) {
                        $matched_txn = $ptxn;
                        break;
                    }
                }
            }
        }

        if ($matched_txn) {
            $used_txn_ids[] = $matched_txn['transaction_id'];
            
            // Update order
            $upd = $pdo->prepare("UPDATE dbo.STOCK_TRANSFER_ORDERS SET quantity = ?, to_location_id = ?, created_at = ? WHERE transfer_id = ?");
            $upd->execute([$matched_txn['quantity'], $matched_txn['to_location_id'], $matched_txn['transaction_timestamp'], $order['transfer_id']]);
            
            echo "Restored Order ID {$order['transfer_id']} with TXN ID {$matched_txn['transaction_id']}\n";
            $restored_count++;
        } else {
            echo "Failed to match Order ID {$order['transfer_id']}\n";
        }
    }

    $pdo->commit();
    echo "Recovery completed! Restored {$restored_count} orders.\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "Error: " . $e->getMessage() . "\n";
}
?>
