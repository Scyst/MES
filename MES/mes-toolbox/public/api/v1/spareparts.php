<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../core/init.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$input = json_decode(file_get_contents("php://input"), true) ?? $_POST;
$action = $_REQUEST['action'] ?? $input['action'] ?? '';
$userId = $_SESSION['user']['id'];

try {
    switch ($action) {

        case 'get_onhand':
            $sql = "SELECT 
                        i.item_id, i.item_code, i.item_name, i.description, i.uom, 
                        i.unit_price, l.location_id, l.location_name, 
                        i.min_stock, i.max_stock, 
                        ISNULL(o.quantity, 0) AS onhand_qty
                    FROM dbo.MT_ITEMS i WITH (NOLOCK)
                    LEFT JOIN dbo.MT_INVENTORY_ONHAND o WITH (NOLOCK) ON i.item_id = o.item_id
                    LEFT JOIN dbo.LOCATIONS l WITH (NOLOCK) ON o.location_id = l.location_id
                    WHERE i.is_active = 1 AND ISNULL(o.quantity, 0) > 0 
                    ORDER BY i.item_code ASC";
            $data = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // KPIs
            $totalSKU = count($data);
            $lowStock = 0;
            $totalValue = 0;
            foreach ($data as $row) {
                $totalValue += $row['onhand_qty'] * ($row['unit_price'] ?? 0);
                if ($row['min_stock'] > 0 && $row['onhand_qty'] <= $row['min_stock']) {
                    $lowStock++;
                }
            }

            // Locations for filter
            $locations = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WHERE is_active = 1 AND location_type = 'MAINTENANCE' ORDER BY location_name")->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $data,
                'kpi' => [
                    'total_sku' => $totalSKU,
                    'low_stock' => $lowStock,
                    'total_value' => $totalValue
                ],
                'locations' => $locations
            ]);
            break;

        case 'get_master_data':
            $items = $pdo->query("SELECT item_id, item_code, item_name, uom FROM dbo.MT_ITEMS WHERE is_active = 1 ORDER BY item_code ASC")->fetchAll();
            $locations = $pdo->query("SELECT location_id, location_name FROM dbo.LOCATIONS WHERE is_active = 1 AND location_type = 'MAINTENANCE' ORDER BY location_name ASC")->fetchAll();
            echo json_encode(['success' => true, 'data' => ['items' => $items, 'locations' => $locations]]);
            break;

        case 'process_transaction':
            $itemId = $input['item_id'] ?? null;
            $locationId = $input['location_id'] ?? null;
            $quantity = (float)($input['quantity'] ?? 0);
            $type = $input['transaction_type'] ?? '';
            $refJobId = !empty($input['ref_job_id']) ? $input['ref_job_id'] : null;
            $notes = $input['notes'] ?? '';

            if (!$itemId || !$locationId || $quantity == 0 || !in_array($type, ['RECEIVE', 'ISSUE', 'ADJUST'])) {
                throw new Exception("ข้อมูลไม่ครบถ้วน");
            }

            $stmt = $pdo->prepare("EXEC sp_MT_ProcessTransaction @item_id=?, @location_id=?, @quantity=?, @transaction_type=?, @ref_job_id=?, @notes=?, @user_id=?");
            $stmt->execute([$itemId, $locationId, $quantity, $type, $refJobId, $notes, $userId]);

            echo json_encode(['success' => true, 'message' => "ทำรายการ $type สำเร็จ"]);
            break;

        default:
            throw new Exception("Invalid action");
    }
} catch (Throwable $e) {
    handleApiError($e, $pdo ?? null, $input ?? $_REQUEST);
}
?>
