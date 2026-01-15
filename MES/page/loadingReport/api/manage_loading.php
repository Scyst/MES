<?php
// page/loading/api/manage_loading.php
// API สำหรับจัดการ Loading Report (Photo Phase)

header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/../../components/init.php';

if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_REQUEST['action'] ?? '';
// โฟลเดอร์เก็บรูป (ต้องสร้างและเปิด Permission 777)
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
        // 1. ดึงรายการงาน (Job List) - งานวันนี้ + งานค้าง
        case 'get_jobs':
            $today = date('Y-m-d');
            $sql = "SELECT s.id as so_id, s.po_number, s.loading_date, s.container_no, 
                    r.id as report_id, r.status as report_status
                    FROM SALES_ORDERS s
                    LEFT JOIN LOADING_REPORTS r ON s.id = r.sales_order_id
                    WHERE (s.loading_date = ? OR r.status = 'DRAFT')
                    ORDER BY CASE WHEN r.status = 'DRAFT' THEN 0 ELSE 1 END, s.po_number ASC";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$today]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $data]);
            break;

        // 2. ดึงรายละเอียดรายงาน (Detail)
        case 'get_report_detail':
            $so_id = $_POST['so_id'];
            
            // ดึงข้อมูล Header
            $sqlHead = "SELECT s.id as so_id, s.po_number, s.description, s.quantity, 
                        s.booking_no, s.invoice_no, s.container_no as master_container,
                        r.id as report_id, r.seal_no, r.cable_seal, r.container_no as report_container
                        FROM SALES_ORDERS s
                        LEFT JOIN LOADING_REPORTS r ON s.id = r.sales_order_id
                        WHERE s.id = ?";
            $stmt = $pdo->prepare($sqlHead);
            $stmt->execute([$so_id]);
            $header = $stmt->fetch(PDO::FETCH_ASSOC);

            // ดึงรูปภาพที่เคยถ่ายไว้
            $photos = [];
            if ($header['report_id']) {
                $sqlPhoto = "SELECT photo_type, file_path FROM LOADING_PHOTOS WHERE report_id = ?";
                $stmtP = $pdo->prepare($sqlPhoto);
                $stmtP->execute([$header['report_id']]);
                $rows = $stmtP->fetchAll(PDO::FETCH_ASSOC);
                foreach($rows as $r) $photos[$r['photo_type']] = $r['file_path'];
            }

            echo json_encode(['success' => true, 'header' => $header, 'photos' => $photos]);
            break;

        // 3. Auto Save Header (Seal No)
        case 'save_header':
            $so_id = $_POST['so_id'];
            $seal = $_POST['seal_no'] ?? '';
            $cable = $_POST['cable_seal'] ?? '';
            
            // ตรวจสอบว่ามี Report ID หรือยัง
            $chk = $pdo->prepare("SELECT id FROM LOADING_REPORTS WHERE sales_order_id = ?");
            $chk->execute([$so_id]);
            $row = $chk->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                // มีแล้ว -> Update
                $report_id = $row['id'];
                $pdo->prepare("UPDATE LOADING_REPORTS SET seal_no = ?, cable_seal = ?, updated_at = GETDATE() WHERE id = ?")
                    ->execute([$seal, $cable, $report_id]);
            } else {
                // ยังไม่มี -> Insert
                $pdo->prepare("INSERT INTO LOADING_REPORTS (sales_order_id, seal_no, cable_seal, status) VALUES (?, ?, ?, 'DRAFT')")
                    ->execute([$so_id, $seal, $cable]);
                $report_id = $pdo->lastInsertId();
            }
            
            echo json_encode(['success' => true, 'report_id' => $report_id]);
            break;

        // 4. Upload & Resize Photo
        case 'upload_photo':
            if (!isset($_FILES['file']) || !isset($_POST['report_id'])) throw new Exception("Invalid Data");

            $report_id = $_POST['report_id'];
            $type = $_POST['photo_type'];
            $file = $_FILES['file'];

            $allowed = ['jpg', 'jpeg', 'png'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed)) throw new Exception("Invalid file type (JPG/PNG only)");

            // ตั้งชื่อไฟล์: ReportID_Type_Timestamp.jpg
            $newFilename = "R{$report_id}_{$type}_" . time() . ".jpg";
            $targetPath = $baseUploadDir . $newFilename;
            $webPath = "../../uploads/loading_reports/" . $newFilename; 

            // --- Resize Logic (ลดขนาดภาพให้เบา) ---
            $source = imagecreatefromstring(file_get_contents($file['tmp_name']));
            if ($source === false) throw new Exception("Image Error");

            // แก้ภาพกลับหัว (Exif Rotation)
            $exif = @exif_read_data($file['tmp_name']);
            if(!empty($exif['Orientation'])) {
                switch($exif['Orientation']) {
                    case 8: $source = imagerotate($source,90,0); break;
                    case 3: $source = imagerotate($source,180,0); break;
                    case 6: $source = imagerotate($source,-90,0); break;
                }
            }

            // ย่อให้เหลือความกว้างไม่เกิน 1000px
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

            // Save JPG Quality 80%
            imagejpeg($source, $targetPath, 80);
            imagedestroy($source);

            // Save to DB (Delete old photo of same type first)
            $pdo->prepare("DELETE FROM LOADING_PHOTOS WHERE report_id = ? AND photo_type = ?")->execute([$report_id, $type]);
            $pdo->prepare("INSERT INTO LOADING_PHOTOS (report_id, photo_type, file_path) VALUES (?, ?, ?)")
                ->execute([$report_id, $type, $webPath]);

            echo json_encode(['success' => true, 'path' => $webPath]);
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid Action']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>