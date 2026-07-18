<?php
// page/sales/api/forecast_rm.php
header('Content-Type: application/json; charset=utf-8');
ini_set('display_errors', 0);

require_once __DIR__ . '/../../components/init.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $table_sales = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'dbo.SALES_ORDERS';
    $table_items = defined('ITEMS_TABLE') ? ITEMS_TABLE : 'dbo.ITEMS';
    $table_bom = defined('BOM_TABLE') ? BOM_TABLE : 'dbo.BOM_TABLE';
    $table_inv = defined('INVENTORY_ONHAND_TABLE') ? INVENTORY_ONHAND_TABLE : 'dbo.INVENTORY_ONHAND';
    $table_loc = defined('LOCATIONS_TABLE') ? LOCATIONS_TABLE : 'dbo.LOCATIONS';

    $startDate = $_GET['start_date'] ?? '';
    $endDate = $_GET['end_date'] ?? '';
    $dateType = $_GET['date_type'] ?? 'loading_date';
    
    $allowedDateCols = ['loading_date', 'production_start', 'production_end', 'inspection_date'];
    if (!in_array($dateType, $allowedDateCols)) {
        $dateType = 'loading_date';
    }

    $dateCondition = "";
    if (!empty($startDate)) {
        $dateCondition .= " AND s.$dateType >= :start_date ";
    }
    if (!empty($endDate)) {
        $dateCondition .= " AND s.$dateType <= :end_date ";
    }

    // 1. Fetch pending Sales Orders
    $sqlSales = "
        SELECT s.id, s.po_number, s.sku, ISNULL(s.quantity, 0) as quantity, s.custom_order, i.item_id as fg_item_id
        FROM {$table_sales} s WITH (NOLOCK)
        LEFT JOIN {$table_items} i WITH (NOLOCK) ON s.sku = i.sku OR s.sku = i.part_no
        WHERE ISNULL(s.is_production_done, 0) = 0 
          AND ISNULL(s.is_confirmed, 0) = 0
          $dateCondition
        ORDER BY ISNULL(s.custom_order, 999999) ASC, s.id DESC
    ";
    $stmt = $pdo->prepare($sqlSales);
    if (!empty($startDate)) $stmt->bindParam(':start_date', $startDate);
    if (!empty($endDate)) $stmt->bindParam(':end_date', $endDate);
    $stmt->execute();
    
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($orders)) {
        echo json_encode(['success' => true, 'data' => [], 'summary' => []]);
        exit;
    }

    // 2. Fetch BOM for FGs
    // Only fetch for ACTIVE BOMs
    $sqlBOM = "
        SELECT b.fg_item_id, b.component_item_id, CAST(b.quantity_required AS FLOAT) AS quantity_required,
               c.sap_no, c.part_description
        FROM {$table_bom} b WITH (NOLOCK)
        JOIN {$table_items} c WITH (NOLOCK) ON b.component_item_id = c.item_id
        WHERE b.bom_status = 'ACTIVE' 
          AND (c.sap_no LIKE '10%' OR c.sap_no LIKE '20%')
    ";
    $stmt = $pdo->query($sqlBOM);
    $boms = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Group BOM by fg_item_id
    $bomMap = [];
    foreach ($boms as $b) {
        $fg_id = $b['fg_item_id'];
        if (!isset($bomMap[$fg_id])) {
            $bomMap[$fg_id] = [];
        }
        $bomMap[$fg_id][] = $b;
    }

    // 3. Fetch Inventory On Hand for RMs (10*, 20*)
    $sqlInv = "
        SELECT i.item_id, i.sap_no, i.part_description, ISNULL(SUM(inv.quantity), 0) as onhand_qty
        FROM {$table_items} i WITH (NOLOCK)
        LEFT JOIN {$table_inv} inv WITH (NOLOCK) ON i.item_id = inv.parameter_id 
            AND inv.location_id IN (SELECT location_id FROM {$table_loc} WITH (NOLOCK) WHERE location_type = 'STORE')
        WHERE (i.sap_no LIKE '10%' OR i.sap_no LIKE '20%')
        GROUP BY i.item_id, i.sap_no, i.part_description
    ";
    $stmt = $pdo->query($sqlInv);
    $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stockMap = []; // item_id => current stock
    $originalStockMap = []; // item_id => original stock
    $rmInfo = [];   // item_id => [sap_no, desc]
    foreach ($inventory as $inv) {
        $stockMap[$inv['item_id']] = (float)$inv['onhand_qty'];
        $originalStockMap[$inv['item_id']] = (float)$inv['onhand_qty'];
        $rmInfo[$inv['item_id']] = [
            'sap_no' => $inv['sap_no'],
            'part_description' => $inv['part_description']
        ];
    }

    // 4. Simulate Deduction
    $result = [];
    $shortageSummary = []; // Track total shortage across all POs

    foreach ($orders as $order) {
        $poId = $order['id'];
        $fgId = $order['fg_item_id'];
        $orderQty = (float)$order['quantity'];
        
        $orderShortages = [];
        $isShort = false;

        if ($fgId && isset($bomMap[$fgId])) {
            foreach ($bomMap[$fgId] as $comp) {
                $compId = $comp['component_item_id'];
                $reqQty = $orderQty * $comp['quantity_required'];
                
                $currentStock = $stockMap[$compId] ?? 0;
                
                if ($currentStock < $reqQty) {
                    $isShort = true;
                    $shortAmt = $reqQty - $currentStock;
                    
                    $orderShortages[] = [
                        'sap_no' => $comp['sap_no'],
                        'part_description' => $comp['part_description'],
                        'required' => $reqQty,
                        'available' => $currentStock,
                        'shortage' => $shortAmt
                    ];

                    // Add to global summary
                    if (!isset($shortageSummary[$comp['sap_no']])) {
                        $shortageSummary[$comp['sap_no']] = [
                            'sap_no' => $comp['sap_no'],
                            'part_description' => $comp['part_description'],
                            'total_shortage' => 0,
                            'available_in_store' => $originalStockMap[$compId] ?? 0
                        ];
                    }
                    $shortageSummary[$comp['sap_no']]['total_shortage'] += $shortAmt;
                    
                    // Stock becomes 0 (can't go negative for subsequent POs)
                    $stockMap[$compId] = 0;
                } else {
                    // Deduct stock
                    $stockMap[$compId] = $currentStock - $reqQty;
                }
            }
        } else {
            // No BOM found or FG not mapped.
            $orderShortages[] = [
                'sap_no' => 'N/A',
                'part_description' => 'No BOM / FG mapping found',
                'required' => 0,
                'available' => 0,
                'shortage' => 0,
                'is_missing_bom' => true
            ];
            // Don't flag as short just because it doesn't have BOM, or maybe yes? Let's not block it if BOM is not found.
            // But we will pass it back for info.
            $isShort = true;
        }

        $result[$poId] = [
            'status' => $isShort ? 'SHORTAGE' : 'READY',
            'shortages' => $orderShortages
        ];
    }

    echo json_encode([
        'success' => true, 
        'data' => $result, 
        'summary' => array_values($shortageSummary)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
