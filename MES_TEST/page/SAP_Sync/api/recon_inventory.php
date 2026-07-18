<?php
// e:/MES/MES/MES/page/SAP_Sync/api/recon_inventory.php
require_once __DIR__ . '/../../db.php'; // MES DB
require_once __DIR__ . '/../../sap_db.php'; // SAP DB
require_once __DIR__ . '/../../components/init.php';

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Fetch SAP Stock
    $sapQuery = "SELECT Mat_No, Storage_Location, SUM(Quantity) as SAP_Qty FROM View_SAP_ALL_STOCK_1820 GROUP BY Mat_No, Storage_Location";
    $sapStmt = $pdo_sap->query($sapQuery);
    $sapStockRaw = $sapStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $sapStock = [];
    foreach ($sapStockRaw as $row) {
        $matNo = trim($row['Mat_No']);
        if (!isset($sapStock[$matNo])) {
            $sapStock[$matNo] = 0;
        }
        $sapStock[$matNo] += (float)$row['SAP_Qty'];
    }

    // 2. Fetch MES Stock
    $mesQuery = "
        SELECT 
            i.sap_no,
            i.part_description,
            SUM(o.quantity) as MES_Qty
        FROM dbo.INVENTORY_ONHAND o
        JOIN dbo.ITEMS i ON o.parameter_id = i.item_id
        WHERE i.sap_no IS NOT NULL AND i.sap_no != ''
        GROUP BY i.sap_no, i.part_description
    ";
    $mesStmt = $pdo->query($mesQuery);
    $mesStockRaw = $mesStmt->fetchAll(PDO::FETCH_ASSOC);

    $reconciliation = [];
    
    foreach ($mesStockRaw as $row) {
        $matNo = trim($row['sap_no']);
        $mesQty = (float)$row['MES_Qty'];
        $sapQty = isset($sapStock[$matNo]) ? $sapStock[$matNo] : 0;
        
        $diff = $mesQty - $sapQty;
        
        $status = 'MATCH';
        if ($diff > 0) {
            $status = 'EXCESS_IN_MES'; // MES has more than SAP
        } elseif ($diff < 0) {
            $status = 'SHORTAGE_IN_MES'; // MES has less than SAP
        }

        if ($status !== 'MATCH' || isset($_GET['show_all'])) {
            $reconciliation[] = [
                'Mat_No' => $matNo,
                'Description' => $row['part_description'],
                'MES_Qty' => $mesQty,
                'SAP_Qty' => $sapQty,
                'Diff' => $diff,
                'Status' => $status
            ];
        }
    }

    echo json_encode([
        'success' => true,
        'data' => $reconciliation,
        'count' => count($reconciliation)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
