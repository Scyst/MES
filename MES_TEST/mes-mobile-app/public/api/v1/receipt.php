<?php
session_start();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowed_origins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (in_array($origin, $allowed_origins) || true) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized: Please login']);
    exit;
}
$user = $_SESSION['user'];
$userId = $user['id'];

require_once __DIR__ . '/../../db.php';
if (!defined('TRANSACTIONS_TABLE')) {
    require_once __DIR__ . '/../../config/config.php';
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $sapNo = $_POST['sap_no'] ?? null;
    $qty = (float)($_POST['qty'] ?? 0);
    $toLocationId = $_POST['to_location_id'] ?? null;
    $fromLocationId = $_POST['from_location_id'] ?? null;
    $lotNo = $_POST['lot_no'] ?? null;
    $notes = "Mobile App Receipt";

    if (!$sapNo || $qty <= 0 || !$toLocationId) {
        echo json_encode(['success' => false, 'message' => 'Invalid data. SAP No, Qty, and Destination are required.']);
        exit;
    }

    try {
        $pdo->beginTransaction();
        
        // Resolve item_id from sap_no
        $itemStmt = $pdo->prepare("SELECT item_id FROM " . ITEMS_TABLE . " WHERE sap_no = ?");
        $itemStmt->execute([$sapNo]);
        $itemId = $itemStmt->fetchColumn();
        
        if (!$itemId) {
            throw new Exception("Item SAP No not found.");
        }

        // Update Stock via SP
        $spStock = $pdo->prepare("EXEC dbo." . SP_UPDATE_ONHAND . " @item_id = ?, @location_id = ?, @quantity_to_change = ?");
        $spStock->execute([$itemId, $toLocationId, $qty]);
        
        // Insert Transaction
        $timestamp = date('Y-m-d H:i:s');
        $transSql = "INSERT INTO " . TRANSACTIONS_TABLE . " 
                     (parameter_id, quantity, transaction_type, to_location_id, from_location_id, created_by_user_id, notes, reference_id, transaction_timestamp) 
                     VALUES (?, ?, 'RECEIPT', ?, ?, ?, ?, ?, ?)";
        $transStmt = $pdo->prepare($transSql);
        $transStmt->execute([$itemId, $qty, $toLocationId, $fromLocationId, $userId, $notes, $lotNo, $timestamp]);
        
        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Receipt logged successfully']);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
