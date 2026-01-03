<?php
// page/sales/api/manage_shipping.php

// ปิดการแสดง Error หน้าเว็บ (ป้องกัน JSON พัง) แต่ให้เก็บลง Log แทน
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');

try {
    // --- 1. ระบบ Auto-Detect init.php (แก้ปัญหา Path ไม่ตรง) ---
    $paths = [
        __DIR__ . '/../../components/init.php',  // กรณีอยู่ folder api/
        __DIR__ . '/../components/init.php',     // กรณีอยู่ folder sales/
        __DIR__ . '/init.php'                    // กรณีอยู่ folder เดียวกัน
    ];
    
    $initFound = false;
    foreach ($paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            $initFound = true;
            break;
        }
    }

    if (!$initFound) {
        throw new Exception("หาไฟล์ init.php ไม่เจอ! (ตรวจสอบตำแหน่งไฟล์)");
    }

    // --- 2. เชื่อมต่อฐานข้อมูล ---
    $table = defined('SALES_ORDERS_TABLE') ? SALES_ORDERS_TABLE : 'SALES_ORDERS';

    if (!isset($pdo)) {
        if (!defined('DB_HOST')) throw new Exception("Config Database ไม่ถูกโหลด");
        $pdo = new PDO("sqlsrv:Server=".DB_HOST.";Database=".DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    $action = $_REQUEST['action'] ?? 'read';

    // ===================================================================================
    // CASE 1: READ
    // ===================================================================================
    if ($action === 'read') {
        $sql = "SELECT * FROM $table ORDER BY id DESC";
        $stmt = $pdo->query($sql);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        exit;
    }

    // ===================================================================================
    // CASE 2: UPDATE CELL (จุดที่แก้ปัญหา Date Format)
    // ===================================================================================
    if ($action === 'update_cell') {
        $in = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = $in['id'] ?? null;
        $field = $in['field'] ?? null;
        $value = $in['value'] ?? null;
        
        if ($id && $field) {
            // แปลงค่าว่างเป็น NULL
            if ($value === '' || $value === 'null') $value = null;

            // --- [FIX] แปลงวันที่ให้ SQL Server เข้าใจ (yyyy-mm-dd) ---
            // เช็คว่าเป็นฟิลด์วันที่หรือไม่ (ดูจากชื่อ หรือ keywords)
            $isDateField = (
                strpos(strtolower($field), 'date') !== false || 
                in_array($field, ['etd', 'snc_load_day', 'si_vgm_cut_off'])
            );

            if ($isDateField && $value) {
                // แปลง / เป็น - เพื่อให้ strtotime เข้าใจง่ายขึ้น
                $cleanDate = str_replace('/', '-', $value);
                $ts = strtotime($cleanDate);
                
                if ($ts) {
                    $value = date('Y-m-d', $ts); // แปลงเป็น format มาตรฐาน
                } else {
                    $value = null; // ถ้าแปลงไม่ได้ ให้เป็น null ดีกว่า error
                }
            }
            // --------------------------------------------------------

            $sql = "UPDATE $table SET $field = ?, updated_at = GETDATE() WHERE id = ?";
            $pdo->prepare($sql)->execute([$value, $id]);
            
            echo json_encode(['success' => true, 'message' => 'Updated', 'debug_val' => $value]);
        } else {
            throw new Exception("ข้อมูลไม่ครบ (Missing ID or Field)");
        }
        exit;
    }

    // ===================================================================================
    // CASE 3: IMPORT (Smart Import)
    // ===================================================================================
    if ($action === 'import') {
        if (!isset($_FILES['csv_file'])) throw new Exception("No file uploaded");
        
        $file = $_FILES['csv_file']['tmp_name'];
        // Remove BOM
        $content = file_get_contents($file);
        $bom = pack("CCC", 0xef, 0xbb, 0xbf);
        if (0 === strncmp($content, $bom, 3)) file_put_contents($file, substr($content, 3));
        
        $handle = fopen($file, "r");
        $headerIndexMap = [];
        $foundHeader = false;

        // Find Header
        while (($row = fgetcsv($handle, 10000, ",")) !== FALSE) {
            $cleanRow = array_map(function($col) {
                return strtolower(trim(str_replace(['.', '_', '-', ' '], '', $col)));
            }, $row);

            if (in_array('ponumber', $cleanRow) || in_array('po', $cleanRow)) {
                foreach ($cleanRow as $index => $colName) if(!empty($colName)) $headerIndexMap[$colName] = $index;
                $foundHeader = true;
                break;
            }
        }

        if (!$foundHeader) throw new Exception("ไม่พบหัวตาราง PO Number");

        // Helper functions
        $getVal = function($dataRow, $names) use ($headerIndexMap) {
            foreach ((array)$names as $name) {
                $k = strtolower(trim(str_replace(['.', '_', '-', ' '], '', $name)));
                if (isset($headerIndexMap[$k]) && isset($dataRow[$headerIndexMap[$k]])) 
                    return trim($dataRow[$headerIndexMap[$k]]);
            }
            return null;
        };

        $fnDate = function($val) {
            if(!$val) return null;
            $val = explode(' ', str_replace('/', '-', $val))[0];
            $ts = strtotime($val);
            return $ts ? date('Y-m-d', $ts) : null;
        };

        $success = 0; $updated = 0;
        
        while (($data = fgetcsv($handle, 10000, ",")) !== FALSE) {
            if (count($data) < 2) continue;
            $po = $getVal($data, ['po', 'ponumber']);
            if (!$po) continue;

            $params = [
                $getVal($data, ['week', 'shippingweek']),
                $getVal($data, ['status', 'shippingcustomerstatus']),
                $getVal($data, ['inspecttype']),
                $getVal($data, ['inspectresult']),
                $fnDate($getVal($data, ['sncloadday'])),
                $fnDate($getVal($data, ['etd'])),
                $getVal($data, ['dc', 'dclocation']),
                $getVal($data, ['sku']),
                $getVal($data, ['bookingno']),
                $getVal($data, ['invoice']),
                $getVal($data, ['description']),
                str_replace(',', '', $getVal($data, ['qty', 'quantity']) ?? '0'),
                $getVal($data, ['ctnsize']),
                $getVal($data, ['containerno']),
                $getVal($data, ['sealno']),
                $getVal($data, ['tare']),
                $getVal($data, ['nw']),
                $getVal($data, ['gw']),
                $getVal($data, ['cbm']),
                $getVal($data, ['feeder']),
                $getVal($data, ['mother']),
                $getVal($data, ['sncci']),
                $fnDate($getVal($data, ['sivgmcutoff'])),
                $fnDate($getVal($data, ['pickup'])),
                $fnDate($getVal($data, ['return'])),
                $getVal($data, ['remark']),
                $fnDate($getVal($data, ['cutoffdate'])),
                $getVal($data, ['cutofftime'])
            ];

            // Check existing
            $stmt = $pdo->prepare("SELECT id FROM $table WHERE po_number = ?");
            $stmt->execute([$po]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                // UPDATE Logic
                $sql = "UPDATE $table SET 
                        shipping_week=?, shipping_customer_status=?, inspect_type=?, inspection_result=?, snc_load_day=?, 
                        etd=?, dc_location=?, sku=?, booking_no=?, invoice_no=?, description=?, quantity=?, ctn_size=?, 
                        container_no=?, seal_no=?, container_tare=?, net_weight=?, gross_weight=?, cbm=?, feeder_vessel=?, 
                        mother_vessel=?, snc_ci_no=?, si_vgm_cut_off=?, pickup_date=?, return_date=?, remark=?, 
                        cutoff_date=?, cutoff_time=?, updated_at=GETDATE()
                        WHERE id=?";
                $params[] = $row['id'];
                $pdo->prepare($sql)->execute($params);
                $updated++;
            } else {
                // INSERT Logic
                $sql = "INSERT INTO $table (
                        po_number, shipping_week, shipping_customer_status, inspect_type, inspection_result, snc_load_day, 
                        etd, dc_location, sku, booking_no, invoice_no, description, quantity, ctn_size, 
                        container_no, seal_no, container_tare, net_weight, gross_weight, cbm, feeder_vessel, 
                        mother_vessel, snc_ci_no, si_vgm_cut_off, pickup_date, return_date, remark, 
                        cutoff_date, cutoff_time, created_at
                    ) VALUES (?, ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, GETDATE())";
                array_unshift($params, $po);
                $pdo->prepare($sql)->execute($params);
                $success++;
            }
        }
        fclose($handle);
        echo json_encode(['success' => true, 'message' => "Import: New $success, Updated $updated"]);
        exit;
    }

    // ===================================================================================
    // CASE 4: EXPORT
    // ===================================================================================
    if ($action === 'export') {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename=Shipping_Data.csv');
        $output = fopen('php://output', 'w');
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // Header
        fputcsv($output, ['PO Number', 'Week', 'Load Date', 'ETD', 'Container', 'Status', 'Remark']);
        
        $sql = "SELECT * FROM $table ORDER BY id DESC";
        $stmt = $pdo->query($sql);
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            fputcsv($output, [
                $row['po_number'], $row['shipping_week'], 
                $row['snc_load_day'], $row['etd'], $row['container_no'], 
                $row['shipping_customer_status'], $row['remark']
            ]);
        }
        fclose($output);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500); // ส่ง 500 ให้ JS รู้ว่า Error
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>