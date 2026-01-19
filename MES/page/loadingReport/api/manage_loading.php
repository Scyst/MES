<?php
// page/loading/api/manage_loading.php
// [UPDATED] ใช้ Table Constants จาก Config เพื่อรองรับ Dev/Prod Mode

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php';
require_once __DIR__ . '/../loading_config.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
$baseUploadDir = __DIR__ . '/../../../uploads/loading_reports/'; 

if (!file_exists($baseUploadDir)) {
    mkdir($baseUploadDir, 0777, true); // (Production ควรปรับเป็น 0755)
}

try {
    if (!isset($pdo)) {
        $pdo = new PDO("sqlsrv:Server=" . DB_HOST . ";Database=" . DB_DATABASE, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }

    switch ($action) {
        // 1. ดึงรายการงาน
        case 'get_jobs':
            $filterDate = $_REQUEST['date'] ?? date('Y-m-d');
            
            // SQL: ดึงงานตามวันที่ Loading Date ที่เลือก
            $sql = "SELECT s.id as so_id, s.po_number, s.loading_date, s.container_no, 
                    s.quantity, s.booking_no,
                    r.id as report_id, r.status as report_status
                    FROM " . SALES_ORDERS_TABLE . " s
                    LEFT JOIN " . LOADING_REPORTS_TABLE . " r ON s.id = r.sales_order_id
                    WHERE s.loading_date = ?
                    ORDER BY CASE WHEN r.status = 'DRAFT' THEN 0 ELSE 1 END, s.po_number ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$filterDate]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // 2. ดึงรายละเอียด (Header + Photos)
        case 'get_report_detail':
            $so_id = $_POST['so_id'];
            
            $sqlHead = "SELECT 
                        s.id as so_id, 
                        s.po_number, 
                        s.description, 
                        s.quantity, 
                        s.booking_no, 
                        s.invoice_no, 
                        s.sku,
                        s.ctn_size,
                        s.container_no as master_container,
                        s.seal_no as master_seal,
                        
                        r.id as report_id, 
                        r.seal_no as report_seal, 
                        r.cable_seal, 
                        r.container_no as report_container,
                        r.container_type,
                        r.car_license,
                        r.driver_name,
                        r.inspector_name,
                        r.supervisor_name,
                        r.loading_location,
                        FORMAT(r.loading_start_time, 'yyyy-MM-dd HH:mm') as loading_start_time,
                        FORMAT(r.loading_end_time, 'yyyy-MM-dd HH:mm') as loading_end_time
                        FROM " . SALES_ORDERS_TABLE . " s
                        LEFT JOIN " . LOADING_REPORTS_TABLE . " r ON s.id = r.sales_order_id
                        WHERE s.id = ?";
            
            $stmt = $pdo->prepare($sqlHead);
            $stmt->execute([$so_id]);
            $header = $stmt->fetch(PDO::FETCH_ASSOC);

            // ดึงรูปภาพ
            $photos = [];
            if ($header && $header['report_id']) {
                $sqlPhoto = "SELECT photo_type, file_path FROM " . LOADING_PHOTOS_TABLE . " WHERE report_id = ?";
                $stmtP = $pdo->prepare($sqlPhoto);
                $stmtP->execute([$header['report_id']]);
                $rows = $stmtP->fetchAll(PDO::FETCH_ASSOC);
                foreach($rows as $r) $photos[$r['photo_type']] = $r['file_path'];
            }

            echo json_encode(['success' => true, 'header' => $header, 'photos' => $photos]);
            break;

        // 3. Save Header
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
            
            // [FIXED] ตัดตัว T ออกจาก string วันที่ เพื่อให้ SQL Server รับค่าได้
            $start_time = !empty($_POST['loading_start_time']) ? str_replace('T', ' ', $_POST['loading_start_time']) : null;
            $end_time = !empty($_POST['loading_end_time']) ? str_replace('T', ' ', $_POST['loading_end_time']) : null;
            
            // 1. ตรวจสอบว่ามี Report อยู่แล้วหรือยัง
            $check = $pdo->prepare("SELECT id FROM " . LOADING_REPORTS_TABLE . " WHERE sales_order_id = ?");
            $check->execute([$so_id]);
            $existing = $check->fetch();

            if ($existing) {
                // UPDATE SQL (ต้องใส่ parameter ให้ครบตามลำดับเครื่องหมาย ?)
                $sql = "UPDATE " . LOADING_REPORTS_TABLE . " 
                        SET loading_location = ?, loading_start_time = ?, loading_end_time = ?,
                            seal_no = ?, cable_seal = ?, container_no = ?, container_type = ?, 
                            car_license = ?, driver_name = ?, inspector_name = ?, supervisor_name = ?,
                            updated_at = GETDATE()
                        WHERE id = ?";
                $pdo->prepare($sql)->execute([
                    $location, $start_time, $end_time, // 1, 2, 3
                    $seal, $cable_seal, $container, $type, // 4, 5, 6, 7
                    $license, $driver, $inspector, $supervisor, // 8, 9, 10, 11
                    $existing['id'] // 12 (WHERE id) - ต้องใช้ ID ของ Report ไม่ใช่ report_id ที่อาจจะยังไม่ถูก set
                ]);
                $report_id = $existing['id']; // set report_id เพื่อส่งกลับ
            } else {
                // INSERT SQL
                $sql = "INSERT INTO " . LOADING_REPORTS_TABLE . " 
                        (sales_order_id, loading_location, loading_start_time, loading_end_time,
                        seal_no, cable_seal, container_no, container_type, car_license, 
                        driver_name, inspector_name, supervisor_name, status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', GETDATE())";
                $pdo->prepare($sql)->execute([
                    $so_id, $location, $start_time, $end_time,
                    $seal, $cable_seal, $container, $type, 
                    $license, $driver, $inspector, $supervisor
                ]);
                $report_id = $pdo->lastInsertId();
            }

            echo json_encode(['success' => true, 'report_id' => $report_id]);
            break;

        // 4. Upload Photo
        case 'upload_photo':
            if (!isset($_FILES['file']) || !isset($_POST['report_id'])) throw new Exception("Invalid Data");

            $report_id = $_POST['report_id'];
            $type = $_POST['photo_type'];
            $file = $_FILES['file'];
            
            // --- Copy Logic Resize เดิมมาวางตรงนี้ได้เลย ---
            $allowed = ['jpg', 'jpeg', 'png'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed)) throw new Exception("Invalid file type");
            $newFilename = "R{$report_id}_{$type}_" . time() . ".jpg";
            $targetPath = $baseUploadDir . $newFilename;
            $webPath = "../../uploads/loading_reports/" . $newFilename; 
            
            // ... (Image Processing Code) ...
            $source = imagecreatefromstring(file_get_contents($file['tmp_name']));
            if ($source === false) throw new Exception("Image Error");
            $exif = @exif_read_data($file['tmp_name']);
            if(!empty($exif['Orientation'])) {
                switch($exif['Orientation']) {
                    case 8: $source = imagerotate($source,90,0); break;
                    case 3: $source = imagerotate($source,180,0); break;
                    case 6: $source = imagerotate($source,-90,0); break;
                }
            }
            $width = imagesx($source);
            $height = imagesy($source);
            $maxWidth = 1000;
            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = floor($height * ($maxWidth / $width));
                $temp = imagecreatetruecolor($newWidth, $newHeight);
                imagecopyresampled($temp, $source, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($source);
                $source = $temp;
            }
            imagejpeg($source, $targetPath, 80);
            imagedestroy($source);
            // ---------------------------------------------

            // Save to DB (ใช้ LOADING_PHOTOS_TABLE)
            $pdo->prepare("DELETE FROM " . LOADING_PHOTOS_TABLE . " WHERE report_id = ? AND photo_type = ?")->execute([$report_id, $type]);
            $pdo->prepare("INSERT INTO " . LOADING_PHOTOS_TABLE . " (report_id, photo_type, file_path) VALUES (?, ?, ?)")
                ->execute([$report_id, $type, $webPath]);

            echo json_encode(['success' => true, 'path' => $webPath]);
            break;

        // 5. ดึงข้อมูล Checklist 10 ข้อ
        case 'get_checklist':
            $report_id = $_GET['report_id'];
            $sql = "SELECT topic_id, item_index, result, remark FROM " . LOADING_RESULTS_TABLE . " WHERE report_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$report_id]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // จัดรูปแบบ Data: $results[topic_id][item_index] = {result:..., remark:...}
            $results = [];
            foreach ($rows as $row) {
                $results[$row['topic_id']][$row['item_index']] = $row;
            }
            
            echo json_encode(['success' => true, 'data' => $results]);
            break;

        // 6. บันทึกผล Checklist รายข้อ (Auto-save)
        case 'save_checklist_item':
            $report_id = $_POST['report_id'];
            $topic_id = $_POST['topic_id'];
            $topic_name = $_POST['topic_name'];
            $item_index = $_POST['item_index']; // เพิ่มรับค่านี้
            $item_name = $_POST['item_name'];   // เพิ่มรับค่านี้
            $result = $_POST['result'];
            $remark = $_POST['remark'] ?? '';

            // เช็คว่ามี Record ของข้อย่อยนี้หรือยัง
            $chk = $pdo->prepare("SELECT id FROM " . LOADING_RESULTS_TABLE . " 
                                  WHERE report_id = ? AND topic_id = ? AND item_index = ?");
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
        
        // 7. จบงาน (Finish Inspection)
        case 'finish_report':
            $report_id = $_POST['report_id'];
            
            // ตรวจสอบก่อนว่ามี Report นี้จริงไหม
            $check = $pdo->prepare("SELECT id FROM " . LOADING_REPORTS_TABLE . " WHERE id = ?");
            $check->execute([$report_id]);
            if (!$check->fetch()) {
                throw new Exception("Report not found.");
            }

            // อัปเดตสถานะเป็น COMPLETED
            $sql = "UPDATE " . LOADING_REPORTS_TABLE . " 
                    SET status = 'COMPLETED', updated_at = GETDATE() 
                    WHERE id = ?";
            $pdo->prepare($sql)->execute([$report_id]);

            echo json_encode(['success' => true]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>