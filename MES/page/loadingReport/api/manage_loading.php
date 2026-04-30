<?php
// page/loadingReport copy/api/manage_loading.php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../components/php/logger.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../loading_config.php';

if (!isset($_SESSION['user']) || !hasPermission('view_production')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access Denied: Production permission required.']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$baseUploadDir = __DIR__ . '/../../../uploads/loading_reports/'; 

if (!file_exists($baseUploadDir)) {
    mkdir($baseUploadDir, 0777, true);
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        case 'get_jobs':
            $startDate = $_REQUEST['start_date'] ?? date('Y-m-d');
            $endDate = $_REQUEST['end_date'] ?? date('Y-m-d');
            $status = $_REQUEST['status'] ?? 'ALL';
            $keyword = $_REQUEST['search'] ?? ''; 
            
            $sqlBase = "SELECT TOP 100 s.id as so_id, s.po_number, s.loading_date, s.container_no, 
                        s.quantity, s.booking_no, s.snc_ci_no,
                        r.id as report_id, ISNULL(r.status, 'DRAFT') as report_status
                        FROM " . SALES_ORDERS_TABLE . " s WITH (NOLOCK) 
                        LEFT JOIN " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK) ON s.id = r.sales_order_id ";

            $params = [];
            $whereClauses = [];

            if (!empty($keyword)) {
                $whereClauses[] = "(s.po_number LIKE ? OR s.booking_no LIKE ? OR s.container_no LIKE ? OR s.snc_ci_no LIKE ?)";
                $searchTerm = "%$keyword%";
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            } else {
                $whereClauses[] = "(s.loading_date >= ? AND s.loading_date <= ?)";
                $params[] = $startDate;
                $params[] = $endDate;
            }

            if ($status === 'COMPLETED') {
                $whereClauses[] = "r.status = 'COMPLETED'";
            } else if ($status === 'DRAFT') {
                $whereClauses[] = "(r.status = 'DRAFT' OR r.status IS NULL)";
            }

            if (count($whereClauses) > 0) {
                $sqlBase .= " WHERE " . implode(" AND ", $whereClauses);
            }
            
            $sqlBase .= " ORDER BY CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END, s.loading_date DESC, s.po_number ASC";
            
            $stmt = $pdo->prepare($sqlBase);
            $stmt->execute($params);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        case 'get_report_detail':
            $so_id = $_POST['so_id'];
            
            $sqlHead = "SELECT 
                        s.id as so_id, s.po_number, s.description, s.quantity, s.booking_no, s.snc_ci_no, s.invoice_no,
                        s.sku, s.ctn_size, s.container_no as master_container, s.seal_no as master_seal,
                        r.id as report_id, r.status, r.seal_no as report_seal, r.cable_seal, 
                        r.container_no as report_container, r.container_type, r.car_license,
                        r.driver_name, r.inspector_name, r.supervisor_name, r.loading_location,
                        FORMAT(r.loading_start_time, 'yyyy-MM-dd HH:mm') as loading_start_time,
                        FORMAT(r.loading_end_time, 'yyyy-MM-dd HH:mm') as loading_end_time
                        FROM " . SALES_ORDERS_TABLE . " s WITH (NOLOCK)
                        LEFT JOIN " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK) ON s.id = r.sales_order_id
                        WHERE s.id = ?";
            
            $stmt = $pdo->prepare($sqlHead);
            $stmt->execute([$so_id]);
            $header = $stmt->fetch(PDO::FETCH_ASSOC);

            $photos = [];
            if ($header && $header['report_id']) {
                $sqlPhoto = "SELECT photo_type, file_path FROM " . LOADING_PHOTOS_TABLE . " WITH (NOLOCK) WHERE report_id = ?";
                $stmtP = $pdo->prepare($sqlPhoto);
                $stmtP->execute([$header['report_id']]);
                $rows = $stmtP->fetchAll(PDO::FETCH_ASSOC);
                foreach($rows as $r) $photos[$r['photo_type']] = $r['file_path'];
            }

            echo json_encode(['success' => true, 'header' => $header, 'photos' => $photos]);
            break;

        case 'save_header':
            $so_id = $_POST['sales_order_id'];
            $seal = $_POST['seal_no'] ?? '';
            $cable_seal = $_POST['cable_seal'] ?? '';
            $container = $_POST['container_no'] ?? '';
            $type = $_POST['container_type'] ?? '';
            $license = $_POST['car_license'] ?? '';
            $driver = $_POST['driver_name'] ?? '';
            $inspector = $_POST['inspector_name'] ?? '';
            $supervisor = $_POST['supervisor_name'] ?? '';
            $location = $_POST['loading_location'] ?? null;
            
            $start_time = !empty($_POST['loading_start_time']) ? str_replace('T', ' ', $_POST['loading_start_time']) : null;
            $end_time = !empty($_POST['loading_end_time']) ? str_replace('T', ' ', $_POST['loading_end_time']) : null;
            
            $check = $pdo->prepare("SELECT id FROM " . LOADING_REPORTS_TABLE . " WITH (UPDLOCK) WHERE sales_order_id = ?");
            $check->execute([$so_id]);
            $existing = $check->fetch();

            if ($existing) {
                $sql = "UPDATE " . LOADING_REPORTS_TABLE . " 
                        SET loading_location = ?, loading_start_time = ?, loading_end_time = ?,
                            seal_no = ?, cable_seal = ?, container_no = ?, container_type = ?, 
                            car_license = ?, driver_name = ?, inspector_name = ?, supervisor_name = ?,
                            updated_at = GETDATE()
                        WHERE id = ?";
                $pdo->prepare($sql)->execute([
                    $location, $start_time, $end_time, $seal, $cable_seal, $container, $type, 
                    $license, $driver, $inspector, $supervisor, $existing['id'] 
                ]);
                $report_id = $existing['id'];
            } else {
                $sql = "INSERT INTO " . LOADING_REPORTS_TABLE . " 
                        (sales_order_id, loading_location, loading_start_time, loading_end_time,
                        seal_no, cable_seal, container_no, container_type, car_license, 
                        driver_name, inspector_name, supervisor_name, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', GETDATE())";
                $pdo->prepare($sql)->execute([
                    $so_id, $location, $start_time, $end_time, $seal, $cable_seal, $container, $type, 
                    $license, $driver, $inspector, $supervisor
                ]);
                $report_id = $pdo->lastInsertId();
            }

            echo json_encode(['success' => true, 'report_id' => $report_id]);
            break;

        case 'upload_photo':
            if (!isset($_FILES['file']) || !isset($_POST['report_id'])) throw new Exception("Invalid Data");

            $report_id = $_POST['report_id'];
            $type = $_POST['photo_type'];
            $file = $_FILES['file'];
            
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $realMimeType = $finfo->file($file['tmp_name']);
            $allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
            
            if (!in_array($realMimeType, $allowedMimeTypes)) {
                throw new Exception("Security Warning: Invalid file format detected.");
            }

            $newFilename = "R{$report_id}_{$type}_" . time() . ".jpg";
            $targetPath = $baseUploadDir . $newFilename;
            $webPath = "../../uploads/loading_reports/" . $newFilename; 
            
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                throw new Exception("Failed to save uploaded file.");
            }

            $pdo->prepare("DELETE FROM " . LOADING_PHOTOS_TABLE . " WHERE report_id = ? AND photo_type = ?")->execute([$report_id, $type]);
            $pdo->prepare("INSERT INTO " . LOADING_PHOTOS_TABLE . " (report_id, photo_type, file_path) VALUES (?, ?, ?)")
                ->execute([$report_id, $type, $webPath]);

            echo json_encode(['success' => true, 'path' => $webPath]);
            break;

        case 'get_checklist':
            $report_id = $_GET['report_id'];
            $sql = "SELECT topic_id, item_index, result, remark FROM " . LOADING_RESULTS_TABLE . " WITH (NOLOCK) WHERE report_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$report_id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $results = [];
            foreach ($rows as $row) {
                $results[$row['topic_id']][$row['item_index']] = $row;
            }
            
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        case 'save_checklist_item':
            $report_id = $_POST['report_id'];
            $topic_id = $_POST['topic_id'];
            $topic_name = $_POST['topic_name'];
            $item_index = $_POST['item_index']; 
            $item_name = $_POST['item_name'];   
            $result = $_POST['result'];
            $remark = $_POST['remark'] ?? '';

            $chk = $pdo->prepare("SELECT id FROM " . LOADING_RESULTS_TABLE . " WITH (UPDLOCK) WHERE report_id = ? AND topic_id = ? AND item_index = ?");
            $chk->execute([$report_id, $topic_id, $item_index]);
            $existing = $chk->fetch();

            if ($existing) {
                $sql = "UPDATE " . LOADING_RESULTS_TABLE . " SET result = ?, remark = ? WHERE id = ?";
                $pdo->prepare($sql)->execute([$result, $remark, $existing['id']]);
            } else {
                $sql = "INSERT INTO " . LOADING_RESULTS_TABLE . " 
                        (report_id, topic_id, topic_name, item_index, item_name, result, remark) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)";
                $pdo->prepare($sql)->execute([$report_id, $topic_id, $topic_name, $item_index, $item_name, $result, $remark]);
            }

            echo json_encode(['success' => true]);
            break;
            
        case 'save_all_pass':
            $report_id = $_POST['report_id'];
            $pdo->beginTransaction();
            try {
                $checklist = getCtpatChecklist();
                foreach ($checklist as $topicId => $topic) {
                    $itemIndex = 1;
                    foreach ($topic['items'] as $itemName) {
                        $chk = $pdo->prepare("SELECT id FROM " . LOADING_RESULTS_TABLE . " WITH (UPDLOCK) WHERE report_id = ? AND topic_id = ? AND item_index = ?");
                        $chk->execute([$report_id, $topicId, $itemIndex]);
                        $existing = $chk->fetch();

                        if ($existing) {
                            $pdo->prepare("UPDATE " . LOADING_RESULTS_TABLE . " SET result = 'PASS' WHERE id = ?")->execute([$existing['id']]);
                        } else {
                            $pdo->prepare("INSERT INTO " . LOADING_RESULTS_TABLE . " (report_id, topic_id, topic_name, item_index, item_name, result, remark) VALUES (?, ?, ?, ?, ?, 'PASS', '')")
                                ->execute([$report_id, $topicId, $topic['title'], $itemIndex, $itemName]);
                        }
                        $itemIndex++;
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;
        
        case 'finish_report':
            $report_id = $_POST['report_id'];
            $pdo->beginTransaction();
            try {
                $check = $pdo->prepare("SELECT id FROM " . LOADING_REPORTS_TABLE . " WITH (UPDLOCK) WHERE id = ?");
                $check->execute([$report_id]);
                if (!$check->fetch()) {
                    throw new Exception("Report not found.");
                }

                $sql = "UPDATE " . LOADING_REPORTS_TABLE . " SET status = 'COMPLETED', updated_at = GETDATE() WHERE id = ?";
                $pdo->prepare($sql)->execute([$report_id]);

                $checkFleet = $pdo->prepare("SELECT log_id FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK) WHERE loading_report_id = ?");
                $checkFleet->execute([$report_id]);
                
                if (!$checkFleet->fetch()) {
                    $stmtLoad = $pdo->prepare("SELECT r.*, s.po_number FROM " . LOADING_REPORTS_TABLE . " r WITH (NOLOCK) LEFT JOIN " . SALES_ORDERS_TABLE . " s WITH (NOLOCK) ON r.sales_order_id = s.id WHERE r.id = ?");
                    $stmtLoad->execute([$report_id]);
                    $rData = $stmtLoad->fetch(PDO::FETCH_ASSOC);

                    if ($rData) {
                        $log_time = $rData['loading_end_time'] ?: date('Y-m-d H:i:s');
                        $vehicle_type = $rData['container_type'] ?: 'UNKNOWN';
                        $ref_doc = $rData['po_number'] ?: 'C-TPAT ID: ' . $report_id;
                        $user_id = $_SESSION['user']['id'] ?? 0;

                        $insFleet = "INSERT INTO dbo.LOGISTICS_FLEET_LOGS 
                            (log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, created_by_user_id)
                            VALUES (?, 'OUTBOUND', 'VENDOR', ?, ?, ?, ?, ?, ?, ?)";
                        $pdo->prepare($insFleet)->execute([
                            $log_time, $vehicle_type, $rData['car_license'], $rData['container_no'], $rData['seal_no'], $ref_doc, $report_id, $user_id
                        ]);
                    }
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        case 'reopen_report':
            $report_id = $_POST['report_id'];
            if (!hasPermission('manage_warehouse')) {
                throw new Exception("Permission Denied");
            }

            $pdo->beginTransaction();
            try {
                $check = $pdo->prepare("SELECT id FROM " . LOADING_REPORTS_TABLE . " WITH (UPDLOCK) WHERE id = ?");
                $check->execute([$report_id]);
                if (!$check->fetch()) {
                    throw new Exception("Report not found.");
                }

                if (function_exists('writeLog')) {
                    writeLog($pdo, 'UNLOCK', 'LOADING', $report_id, ['status' => 'COMPLETED'], ['status' => 'DRAFT'], 'Supervisor Re-opened Report');
                }

                $sql = "UPDATE " . LOADING_REPORTS_TABLE . " SET status = 'DRAFT', updated_at = GETDATE() WHERE id = ?";
                $pdo->prepare($sql)->execute([$report_id]);
                
                $pdo->prepare("DELETE FROM dbo.LOGISTICS_FLEET_LOGS WHERE loading_report_id = ?")->execute([$report_id]);

                $pdo->commit();
                echo json_encode(['success' => true]);
            } catch (Exception $e) {
                $pdo->rollBack();
                throw $e;
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
            break;
    }

} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>