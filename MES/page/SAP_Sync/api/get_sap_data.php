<?php
// e:\MES\MES\MES\page\SAP_Sync\api\get_sap_data.php
header('Content-Type: application/json; charset=utf-8');
require_once '../../sap_db.php';
session_start();

// Simple auth check if needed, depending on the project
// require_once '../../../auth/check_auth.php'; 

$action = $_GET['action'] ?? '';

try {
    if ($action === 'get_operation_slips') {
        $stmt = $pdo_sap->query("SELECT TOP 500 * FROM View_OperationSlip_1820 ORDER BY LogDate DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } 
    elseif ($action === 'get_sap_stocks') {
        $stmt = $pdo_sap->query("SELECT TOP 500 * FROM View_SAP_ALL_STOCK_1820 ORDER BY Logdate DESC");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['success' => true, 'data' => $data]);
    } 
    else {
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Query Failed: ' . $e->getMessage()]);
}
?>
