<?php
// MES/api/finance/api_import_invoice.php
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Invalid Request Method"]);
    exit;
}

try {
    if (!isset($_FILES['invoice_file']) || $_FILES['invoice_file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception("กรุณาอัปโหลดไฟล์ที่ถูกต้อง");
    }

    $fileTmp = $_FILES['invoice_file']['tmp_name'];
    $handle = fopen($fileTmp, "r");
    if (!$handle) throw new Exception("ไม่สามารถเปิดไฟล์ได้");

    $invoiceNo = '';
    $reportId = (int)($_POST['report_id'] ?? 0);
    $remark = trim($_POST['remark'] ?? 'Imported via CSV');
    
    $customerData = [];
    $shippingData = [];
    $invoiceDetails = [];

    $isReadingItems = false;

    // ฟังก์ชันช่วยหาค่าที่อยู่ติดกับ Keyword
    $findValue = function($row, $keyword) {
        $found = false;
        foreach ($row as $cell) {
            $cleanCell = trim($cell);
            if ($cleanCell === $keyword) {
                $found = true;
                continue;
            }
            if ($found && $cleanCell !== '') return $cleanCell;
        }
        return null;
    };

    while (($row = fgetcsv($handle, 10000, ",")) !== FALSE) {
        // 1. แกะ Header
        if (in_array('INVOICE NO.', $row)) {
            $invoiceNo = $findValue($row, 'INVOICE NO.');
        }
        if (in_array('CUSTOMER NAME :', $row)) {
            $customerData['name'] = $findValue($row, 'CUSTOMER NAME :');
        }
        if (in_array('CONTAINER NO.', $row)) {
            $shippingData['container_no'] = $findValue($row, 'CONTAINER NO.');
        }
        if (in_array('PORT OF DISCHARGE:', $row)) {
            $shippingData['port_discharge'] = $findValue($row, 'PORT OF DISCHARGE:');
        }

        // 2. หาจุดเริ่มต้นของตารางสินค้า
        if (in_array('DESCRIPTION', $row) && in_array('QUANTITY', $row)) {
            $isReadingItems = true;
            continue;
        }

        // 3. แกะรายการสินค้า
        if ($isReadingItems) {
            // เทคนิค Smart Filter: กรองเอาเฉพาะคอลัมน์ที่มีตัวหนังสือ แล้วจัด Index ใหม่ (0, 1, 2...)
            $cleanRow = array_values(array_filter($row, function($v) { return trim($v) !== ''; }));
            
            // ข้ามบรรทัดที่ว่างเปล่า หรือบรรทัดหัวตารางรอง
            if (count($cleanRow) < 3) continue;
            if (strpos(strtoupper($cleanRow[0]), 'TOTAL') !== false) break; // เจอคำว่า TOTAL ให้หยุดอ่าน

            // รูปแบบที่เจอในไฟล์: [0] Carton No, [1] Description/SKU, [2] Qty, [3] Unit Price, [4] Amount
            // แต่บางที Carton No หายไป ระบบก็จะปรับตาม
            $skuDesc = '';
            $qty = 0;
            $price = 0;

            // ตรวจสอบว่าคอลัมน์แรกเป็นตัวเลข/ช่วง (Carton No) หรือไม่
            if (preg_match('/^[0-9\-]+$/', $cleanRow[0])) {
                $skuDesc = $cleanRow[1];
                $qty = (float)str_replace(',', '', $cleanRow[2]);
                $price = (float)str_replace(',', '', $cleanRow[3]);
            } else {
                // ไม่มี Carton No (ขยับ Index มาซ้าย 1 สเตป)
                $skuDesc = $cleanRow[0];
                $qty = (float)str_replace(',', '', $cleanRow[1]);
                $price = (float)str_replace(',', '', $cleanRow[2]);
            }

            if ($qty > 0 && $price > 0) {
                // แยก SKU ออกจาก Description (สมมติว่าวรรคแรกคือ SKU)
                $parts = explode(' ', $skuDesc, 2);
                $sku = $parts[0];
                
                $invoiceDetails[] = [
                    "sku" => $sku,
                    "description" => $skuDesc,
                    "qty_carton" => $qty,
                    "price" => $price
                ];
            }
        }
    }
    fclose($handle);

    if (empty($invoiceNo)) throw new Exception("ไม่พบเลข INVOICE NO. ในไฟล์");
    if (empty($invoiceDetails)) throw new Exception("ไม่พบรายการสินค้าที่ระบุราคาและจำนวน");

    // 4. บันทึกเข้า Database ผ่าน SP
    global $pdo;
    $sql = "EXEC dbo.sp_Finance_ImportInvoice ?, ?, ?, ?, ?, ?, ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $invoiceNo,
        $reportId,
        json_encode($customerData, JSON_UNESCAPED_UNICODE),
        json_encode($shippingData, JSON_UNESCAPED_UNICODE),
        json_encode($invoiceDetails, JSON_UNESCAPED_UNICODE),
        $_SESSION['user']['id'] ?? 0,
        $remark
    ]);

    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($result && $result['success'] == 1) {
        echo json_encode([
            "success" => true,
            "message" => $result['message'],
            "data" => ["version" => $result['current_version'], "invoice_no" => $invoiceNo]
        ]);
    } else {
        throw new Exception($result['message'] ?? "Unknown SP Error");
    }

} catch (Exception $e) {
    echo json_encode(["success" => false, "message" => $e->getMessage()]);
}
?>