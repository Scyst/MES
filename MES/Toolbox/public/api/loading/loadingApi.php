<?php
/**
 * Self-contained Toolbox Loading Report (C-TPAT) API.
 * Supports job queue pagination, header save, compressed photo upload/delete/view,
 * 10-point C-TPAT checklist & Pass-All, Finish + Logistics Fleet Sync, Reopen with audit,
 * completed report tracking search, and official share token generation.
 */

if (($_GET['action'] ?? $_REQUEST['action'] ?? '') === 'view_photo') {
    define('LOADING_SKIP_JSON_HEADER', true);
}

require_once __DIR__ . '/_common.php';

/** Resolves normalized API viewer path for an uploaded loading report image. */
function buildLoadingPhotoViewerPath(?string $rawPath): ?string {
    $trimmed = trim((string)$rawPath);
    if ($trimmed === '') {
        return null;
    }
    $cleanName = basename(str_replace('\\', '/', $trimmed));
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $cleanName)) {
        return null;
    }
    return $cleanName;
}

/** Streams a C-TPAT inspection image safely after session auth & directory containment checks. */
function handleViewLoadingPhoto(array $input): void {
    requireLoadingAccess(false);

    $file = basename(str_replace('\\', '/', trim((string)($input['file'] ?? ''))));
    if (!preg_match('/^[A-Za-z0-9._-]+$/', $file)) {
        http_response_code(400);
        exit('Invalid file name');
    }

    $foundPath = null;
    foreach (resolveLoadingUploadSearchDirs() as $dir) {
        $candidate = realpath($dir . DIRECTORY_SEPARATOR . $file);
        if ($candidate !== false && strpos($candidate, $dir) === 0 && is_file($candidate)) {
            $foundPath = $candidate;
            break;
        }
    }

    if ($foundPath === null) {
        http_response_code(404);
        exit('Photo not found');
    }

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($foundPath) ?: 'application/octet-stream';
    if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
        http_response_code(403);
        exit('Unsupported media type');
    }

    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string)filesize($foundPath));
    header('Cache-Control: private, max-age=3600');
    readfile($foundPath);
    exit;
}

/** Reads paginated C-TPAT job list with date range, status, and keyword search. */
function handleGetLoadingJobs(PDO $pdo, array $input): void {
    requireLoadingAccess(false);

    $startDate = trim((string)($input['start_date'] ?? date('Y-m-d')));
    $endDate = trim((string)($input['end_date'] ?? date('Y-m-d')));
    $status = strtoupper(trim((string)($input['status'] ?? 'ALL')));
    $keyword = trim((string)($input['search'] ?? ''));

    $page = max(1, (int)($input['page'] ?? 1));
    $pageSize = max(1, min(200, (int)($input['page_size'] ?? 100)));
    $offset = ($page - 1) * $pageSize;

    $whereClauses = [];
    $params = [];
    if ($keyword !== '') {
        $whereClauses[] = '(s.po_number LIKE ? OR s.booking_no LIKE ? OR s.container_no LIKE ? OR s.snc_ci_no LIKE ?)';
        $like = '%' . $keyword . '%';
        array_push($params, $like, $like, $like, $like);
    } else {
        $whereClauses[] = '(s.loading_date >= ? AND s.loading_date <= ?)';
        $params[] = $startDate;
        $params[] = $endDate;
    }

    $baseWhere = ' WHERE ' . implode(' AND ', $whereClauses);

    $kpiSql = "SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN r.status IS NULL OR r.status = 'DRAFT' THEN 1 ELSE 0 END) AS draft
        FROM dbo.SALES_ORDERS s WITH (NOLOCK)
        LEFT JOIN dbo.LOADING_REPORTS r WITH (NOLOCK) ON s.id = r.sales_order_id
        {$baseWhere}";
    $stmtKpi = $pdo->prepare($kpiSql);
    $stmtKpi->execute($params);
    $summary = $stmtKpi->fetch(PDO::FETCH_ASSOC) ?: ['total' => 0, 'completed' => 0, 'draft' => 0];

    $statusWhere = $baseWhere;
    if ($status === 'COMPLETED') {
        $statusWhere .= " AND r.status = 'COMPLETED'";
    } elseif ($status === 'DRAFT') {
        $statusWhere .= " AND (r.status = 'DRAFT' OR r.status IS NULL)";
    }

    $stmtCount = $pdo->prepare(
        "SELECT COUNT(*) FROM dbo.SALES_ORDERS s WITH (NOLOCK)
         LEFT JOIN dbo.LOADING_REPORTS r WITH (NOLOCK) ON s.id = r.sales_order_id
         {$statusWhere}"
    );
    $stmtCount->execute($params);
    $totalRows = (int)$stmtCount->fetchColumn();

    $listSql = "SELECT s.id AS so_id, s.po_number, s.description, s.loading_date, s.container_no,
                s.quantity, s.booking_no, s.snc_ci_no, r.id AS report_id, ISNULL(r.status, 'DRAFT') AS report_status
            FROM dbo.SALES_ORDERS s WITH (NOLOCK)
            LEFT JOIN dbo.LOADING_REPORTS r WITH (NOLOCK) ON s.id = r.sales_order_id
            {$statusWhere}
            ORDER BY CASE WHEN r.status = 'COMPLETED' THEN 1 ELSE 0 END, s.loading_date DESC, s.po_number ASC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
    $stmt = $pdo->prepare($listSql);
    foreach ($params as $idx => $val) {
        $stmt->bindValue($idx + 1, $val);
    }
    $stmt->bindValue(count($params) + 1, $offset, PDO::PARAM_INT);
    $stmt->bindValue(count($params) + 2, $pageSize, PDO::PARAM_INT);
    $stmt->execute();

    ldJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC), 'OK', [
        'summary' => $summary,
        'pagination' => ['page' => $page, 'page_size' => $pageSize, 'total_rows' => $totalRows],
    ]);
}

/** Fetches full inspection report bundle (header, normalized photo filenames, and checklist results). */
function handleGetReportDetail(PDO $pdo, array $input): void {
    requireLoadingAccess(false);

    $soId = (int)($input['so_id'] ?? 0);
    $reportId = (int)($input['report_id'] ?? 0);
    if ($soId <= 0 && $reportId <= 0) {
        ldJsonError('กรุณาระบุ so_id หรือ report_id', 400);
    }

    $where = $reportId > 0 ? 'r.id = ?' : 's.id = ?';
    $param = $reportId > 0 ? $reportId : $soId;

    $stmt = $pdo->prepare(
        "SELECT s.id AS so_id, s.po_number, s.description, s.quantity, s.booking_no, s.snc_ci_no, s.invoice_no,
                s.sku, s.ctn_size, s.container_no AS master_container, s.seal_no AS master_seal,
                r.id AS report_id, r.status, r.seal_no AS report_seal, r.cable_seal,
                r.container_no AS report_container, r.container_type, r.car_license,
                r.driver_name, r.inspector_name, r.supervisor_name, r.loading_location, r.access_token,
                FORMAT(r.loading_start_time, 'yyyy-MM-dd HH:mm') AS loading_start_time,
                FORMAT(r.loading_end_time, 'yyyy-MM-dd HH:mm') AS loading_end_time,
                r.created_at
         FROM dbo.SALES_ORDERS s WITH (NOLOCK)
         LEFT JOIN dbo.LOADING_REPORTS r WITH (NOLOCK) ON s.id = r.sales_order_id
         WHERE {$where}"
    );
    $stmt->execute([$param]);
    $header = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$header) {
        ldJsonError('ไม่พบข้อมูลใบงาน Loading', 404);
    }

    $photos = [];
    $checklist = [];
    if (!empty($header['report_id'])) {
        $rid = (int)$header['report_id'];
        $stmtP = $pdo->prepare('SELECT photo_type, file_path FROM dbo.LOADING_PHOTOS WITH (NOLOCK) WHERE report_id = ?');
        $stmtP->execute([$rid]);
        foreach ($stmtP->fetchAll(PDO::FETCH_ASSOC) as $pRow) {
            $viewerFile = buildLoadingPhotoViewerPath($pRow['file_path']);
            if ($viewerFile !== null) {
                $photos[$pRow['photo_type']] = $viewerFile;
            }
        }

        $stmtC = $pdo->prepare('SELECT topic_id, item_index, result, remark FROM dbo.LOADING_INSPECTION_RESULTS WITH (NOLOCK) WHERE report_id = ?');
        $stmtC->execute([$rid]);
        foreach ($stmtC->fetchAll(PDO::FETCH_ASSOC) as $cRow) {
            $checklist[(int)$cRow['topic_id']][(int)$cRow['item_index']] = $cRow;
        }
    }

    ldJsonSuccess([
        'header' => $header,
        'photos' => $photos,
        'checklist' => $checklist,
    ]);
}

/** Saves C-TPAT header metadata and creates draft LOADING_REPORTS row if absent. */
function handleSaveHeader(PDO $pdo, array $input): void {
    requireLoadingAccess(false);

    $soId = (int)($input['sales_order_id'] ?? 0);
    if ($soId <= 0) {
        ldJsonError('รหัส Sales Order ไม่ถูกต้อง', 400);
    }

    $seal = trim((string)($input['seal_no'] ?? ''));
    $cableSeal = trim((string)($input['cable_seal'] ?? ''));
    $container = trim((string)($input['container_no'] ?? ''));
    $type = trim((string)($input['container_type'] ?? ''));
    $license = trim((string)($input['car_license'] ?? ''));
    $driver = trim((string)($input['driver_name'] ?? ''));
    $inspector = trim((string)($input['inspector_name'] ?? ''));
    $supervisor = trim((string)($input['supervisor_name'] ?? ''));
    $location = trim((string)($input['loading_location'] ?? ''));
    $locationVal = $location !== '' ? $location : null;

    $rawStart = trim((string)($input['loading_start_time'] ?? ''));
    $rawEnd = trim((string)($input['loading_end_time'] ?? ''));
    $startTime = $rawStart !== '' ? str_replace('T', ' ', $rawStart) : null;
    $endTime = $rawEnd !== '' ? str_replace('T', ' ', $rawEnd) : null;

    $pdo->beginTransaction();
    $chk = $pdo->prepare('SELECT id, status, container_no, seal_no FROM dbo.LOADING_REPORTS WITH (UPDLOCK) WHERE sales_order_id = ?');
    $chk->execute([$soId]);
    $existing = $chk->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $pdo->prepare(
            'UPDATE dbo.LOADING_REPORTS
             SET loading_location = ?, loading_start_time = ?, loading_end_time = ?,
                 seal_no = ?, cable_seal = ?, container_no = ?, container_type = ?,
                 car_license = ?, driver_name = ?, inspector_name = ?, supervisor_name = ?, updated_at = GETDATE()
             WHERE id = ?'
        )->execute([
            $locationVal, $startTime, $endTime, $seal, $cableSeal, $container, $type,
            $license, $driver, $inspector, $supervisor, $existing['id'],
        ]);
        $reportId = (int)$existing['id'];
        writeLog($pdo, 'UPDATE', 'LOADING_REPORT', $reportId, $existing, ['container_no' => $container, 'seal_no' => $seal], 'Updated loading report header');
    } else {
        $pdo->prepare(
            "INSERT INTO dbo.LOADING_REPORTS
             (sales_order_id, loading_location, loading_start_time, loading_end_time,
              seal_no, cable_seal, container_no, container_type, car_license,
              driver_name, inspector_name, supervisor_name, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', GETDATE())"
        )->execute([
            $soId, $locationVal, $startTime, $endTime, $seal, $cableSeal, $container, $type,
            $license, $driver, $inspector, $supervisor,
        ]);
        $reportId = (int)$pdo->lastInsertId();
        writeLog($pdo, 'CREATE', 'LOADING_REPORT', $reportId, null, ['sales_order_id' => $soId, 'container_no' => $container], 'Created draft loading report');
    }
    $pdo->commit();

    ldJsonSuccess(['report_id' => $reportId], 'บันทึกข้อมูลส่วนหัวเรียบร้อย');
}

try {
    [$action, $input, $currentUser] = parseLoadingRequest('get_jobs');

    switch ($action) {
        case 'view_photo':
            handleViewLoadingPhoto($input);
            break;

        case 'get_jobs':
            handleGetLoadingJobs($pdo, $input);
            break;

        case 'get_report_detail':
            handleGetReportDetail($pdo, $input);
            break;

        case 'save_header':
            handleSaveHeader($pdo, $input);
            break;

        case 'upload_photo':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            $type = preg_replace('/[^a-zA-Z0-9_]/', '', (string)($input['photo_type'] ?? ''));
            if ($reportId <= 0 || $type === '' || !isset($_FILES['file'])) {
                ldJsonError('ข้อมูลไฟล์หรือพารามิเตอร์ไม่ครบถ้วน', 400);
            }
            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                ldJsonError('อัปโหลดไฟล์ล้มเหลว รหัสข้อผิดพลาด: ' . $file['error'], 400);
            }
            if ($file['size'] > 5 * 1024 * 1024) {
                ldJsonError('ขนาดไฟล์เกินขีดจำกัด 5MB', 400);
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                ldJsonError('อนุญาตเฉพาะไฟล์ภาพ JPG, PNG หรือ WEBP เท่านั้น', 400);
            }
            $ext = $mime === 'image/png' ? 'png' : ($mime === 'image/webp' ? 'webp' : 'jpg');
            $newFilename = "R{$reportId}_{$type}_" . time() . '.' . $ext;
            $uploadDir = resolveWritableLoadingUploadDir();
            $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $newFilename;
            if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
                throw new RuntimeException('ไม่สามารถบันทึกไฟล์รูปภาพลงบนเซิร์ฟเวอร์ได้');
            }
            $webPath = '../../uploads/loading_reports/' . $newFilename;
            $pdo->beginTransaction();
            $pdo->prepare('DELETE FROM dbo.LOADING_PHOTOS WHERE report_id = ? AND photo_type = ?')->execute([$reportId, $type]);
            $pdo->prepare('INSERT INTO dbo.LOADING_PHOTOS (report_id, photo_type, file_path) VALUES (?, ?, ?)')->execute([$reportId, $type, $webPath]);
            $pdo->commit();
            writeLog($pdo, 'UPLOAD', 'LOADING_PHOTO', $reportId, null, ['photo_type' => $type, 'file' => $newFilename], "Uploaded photo {$type}");
            ldJsonSuccess(['file' => $newFilename, 'path' => $webPath], 'อัปโหลดรูปภาพเรียบร้อย');
            break;

        case 'delete_photo':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            $type = preg_replace('/[^a-zA-Z0-9_]/', '', (string)($input['photo_type'] ?? ''));
            if ($reportId <= 0 || $type === '') {
                ldJsonError('พารามิเตอร์ลบรูปภาพไม่ถูกต้อง', 400);
            }
            $stmtOld = $pdo->prepare('SELECT file_path FROM dbo.LOADING_PHOTOS WITH (NOLOCK) WHERE report_id = ? AND photo_type = ?');
            $stmtOld->execute([$reportId, $type]);
            $row = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if ($row && !empty($row['file_path'])) {
                $targetName = basename(str_replace('\\', '/', (string)$row['file_path']));
                foreach (resolveLoadingUploadSearchDirs() as $dir) {
                    $candidate = realpath($dir . DIRECTORY_SEPARATOR . $targetName);
                    if ($candidate !== false && strpos($candidate, $dir) === 0 && is_file($candidate)) {
                        @unlink($candidate);
                    }
                }
            }
            $pdo->prepare('DELETE FROM dbo.LOADING_PHOTOS WHERE report_id = ? AND photo_type = ?')->execute([$reportId, $type]);
            writeLog($pdo, 'DELETE', 'LOADING_PHOTO', $reportId, $row ?: null, null, "Deleted loading photo {$type}");
            ldJsonSuccess(null, 'ลบรูปภาพเรียบร้อย');
            break;

        case 'save_checklist_item':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            $topicId = (int)($input['topic_id'] ?? 0);
            $topicName = trim((string)($input['topic_name'] ?? ''));
            $itemIndex = (int)($input['item_index'] ?? 0);
            $itemName = trim((string)($input['item_name'] ?? ''));
            $result = strtoupper(trim((string)($input['result'] ?? '')));
            $remark = trim((string)($input['remark'] ?? ''));
            if ($reportId <= 0 || $topicId <= 0 || $itemIndex <= 0 || !in_array($result, ['PASS', 'FAIL', 'N/A', ''], true)) {
                ldJsonError('ข้อมูลการตรวจเช็คไม่ถูกต้อง', 400);
            }

            $chk = $pdo->prepare('SELECT id, result, remark FROM dbo.LOADING_INSPECTION_RESULTS WITH (UPDLOCK) WHERE report_id = ? AND topic_id = ? AND item_index = ?');
            $chk->execute([$reportId, $topicId, $itemIndex]);
            $existing = $chk->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $pdo->prepare('UPDATE dbo.LOADING_INSPECTION_RESULTS SET result = ?, remark = ? WHERE id = ?')->execute([$result, $remark, $existing['id']]);
            } else {
                $pdo->prepare(
                    'INSERT INTO dbo.LOADING_INSPECTION_RESULTS (report_id, topic_id, topic_name, item_index, item_name, result, remark)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                )->execute([$reportId, $topicId, $topicName, $itemIndex, $itemName, $result, $remark]);
            }
            ldJsonSuccess(null, 'บันทึกรายการตรวจแล้ว');
            break;

        case 'save_all_pass':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            if ($reportId <= 0) {
                ldJsonError('รหัสรายงานไม่ถูกต้อง', 400);
            }
            $pdo->beginTransaction();
            $checklist = getToolboxCtpatChecklist();
            foreach ($checklist as $topicId => $topic) {
                $itemIndex = 1;
                foreach ($topic['items'] as $itemName) {
                    $chk = $pdo->prepare('SELECT id FROM dbo.LOADING_INSPECTION_RESULTS WITH (UPDLOCK) WHERE report_id = ? AND topic_id = ? AND item_index = ?');
                    $chk->execute([$reportId, $topicId, $itemIndex]);
                    $existing = $chk->fetch(PDO::FETCH_ASSOC);
                    if ($existing) {
                        $pdo->prepare("UPDATE dbo.LOADING_INSPECTION_RESULTS SET result = 'PASS' WHERE id = ?")->execute([$existing['id']]);
                    } else {
                        $pdo->prepare(
                            "INSERT INTO dbo.LOADING_INSPECTION_RESULTS (report_id, topic_id, topic_name, item_index, item_name, result, remark)
                             VALUES (?, ?, ?, ?, ?, 'PASS', '')"
                        )->execute([$reportId, $topicId, $topic['title'], $itemIndex, $itemName]);
                    }
                    $itemIndex++;
                }
            }
            $pdo->commit();
            writeLog($pdo, 'UPDATE', 'LOADING_CHECKLIST', $reportId, null, ['result' => 'ALL_PASS'], 'Marked all C-TPAT items PASS');
            ldJsonSuccess(null, 'ตั้งค่าผ่านทุกรายการเรียบร้อย');
            break;

        case 'finish_report':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            if ($reportId <= 0) {
                ldJsonError('รหัสรายงานไม่ถูกต้อง', 400);
            }
            $pdo->beginTransaction();
            $check = $pdo->prepare('SELECT id, status FROM dbo.LOADING_REPORTS WITH (UPDLOCK) WHERE id = ?');
            $check->execute([$reportId]);
            $oldReport = $check->fetch(PDO::FETCH_ASSOC);
            if (!$oldReport) {
                throw new InvalidArgumentException('ไม่พบรายงาน Loading Report');
            }

            $pdo->prepare("UPDATE dbo.LOADING_REPORTS SET status = 'COMPLETED', updated_at = GETDATE() WHERE id = ?")->execute([$reportId]);

            $checkFleet = $pdo->prepare('SELECT log_id FROM dbo.LOGISTICS_FLEET_LOGS WITH (UPDLOCK) WHERE loading_report_id = ?');
            $checkFleet->execute([$reportId]);
            if (!$checkFleet->fetch()) {
                $stmtLoad = $pdo->prepare(
                    'SELECT r.loading_end_time, r.container_type, r.car_license, r.container_no, r.seal_no, s.po_number
                     FROM dbo.LOADING_REPORTS r WITH (NOLOCK)
                     LEFT JOIN dbo.SALES_ORDERS s WITH (NOLOCK) ON r.sales_order_id = s.id
                     WHERE r.id = ?'
                );
                $stmtLoad->execute([$reportId]);
                $rData = $stmtLoad->fetch(PDO::FETCH_ASSOC);
                if ($rData) {
                    $logTime = $rData['loading_end_time'] ?: date('Y-m-d H:i:s');
                    $vehicleType = $rData['container_type'] ?: 'UNKNOWN';
                    $refDoc = $rData['po_number'] ?: ('C-TPAT ID: ' . $reportId);
                    $pdo->prepare(
                        "INSERT INTO dbo.LOGISTICS_FLEET_LOGS
                         (log_timestamp, trans_type, provider_type, vehicle_type, car_license, container_no, seal_no, ref_document, loading_report_id, created_by_user_id)
                         VALUES (?, 'OUTBOUND', 'VENDOR', ?, ?, ?, ?, ?, ?, ?)"
                    )->execute([
                        $logTime, $vehicleType, $rData['car_license'], $rData['container_no'],
                        $rData['seal_no'], $refDoc, $reportId, (int)$currentUser['id'],
                    ]);
                }
            }
            $pdo->commit();
            writeLog($pdo, 'COMPLETE', 'LOADING_REPORT', $reportId, $oldReport, ['status' => 'COMPLETED'], 'Completed C-TPAT report and synced fleet log');
            ldJsonSuccess(null, 'ยืนยันจบงานและบันทึกเข้าบัญชีเที่ยวรถเรียบร้อย');
            break;

        case 'reopen_report':
            requireLoadingAccess(true);
            $reportId = (int)($input['report_id'] ?? 0);
            if ($reportId <= 0) {
                ldJsonError('รหัสรายงานไม่ถูกต้อง', 400);
            }
            $pdo->beginTransaction();
            $check = $pdo->prepare('SELECT id, status FROM dbo.LOADING_REPORTS WITH (UPDLOCK) WHERE id = ?');
            $check->execute([$reportId]);
            $oldReport = $check->fetch(PDO::FETCH_ASSOC);
            if (!$oldReport) {
                throw new InvalidArgumentException('ไม่พบรายงาน Loading Report');
            }
            $pdo->prepare("UPDATE dbo.LOADING_REPORTS SET status = 'DRAFT', updated_at = GETDATE() WHERE id = ?")->execute([$reportId]);
            $pdo->prepare('DELETE FROM dbo.LOGISTICS_FLEET_LOGS WHERE loading_report_id = ?')->execute([$reportId]);
            $pdo->commit();
            writeLog($pdo, 'UNLOCK', 'LOADING_REPORT', $reportId, $oldReport, ['status' => 'DRAFT'], 'Supervisor reopened completed report');
            ldJsonSuccess(null, 'ปลดล็อกรายงานกลับเป็นสถานะ DRAFT สำเร็จ');
            break;

        case 'search_completed':
            requireLoadingAccess(false);
            $keyword = trim((string)($input['keyword'] ?? ''));
            if ($keyword === '') {
                ldJsonError('กรุณากรอกเลข PO, Invoice, Booking หรือเบอร์ตู้', 400);
            }
            $like = '%' . $keyword . '%';
            $stmt = $pdo->prepare(
                "SELECT TOP 25 r.id AS report_id, s.id AS so_id, s.po_number, s.snc_ci_no, s.booking_no,
                        r.container_no, r.seal_no, r.loading_start_time, r.created_at
                 FROM dbo.LOADING_REPORTS r WITH (NOLOCK)
                 JOIN dbo.SALES_ORDERS s WITH (NOLOCK) ON r.sales_order_id = s.id
                 WHERE r.status = 'COMPLETED'
                   AND (s.po_number LIKE ? OR s.snc_ci_no LIKE ? OR s.booking_no LIKE ? OR r.container_no LIKE ?)
                 ORDER BY COALESCE(r.loading_start_time, r.created_at) DESC"
            );
            $stmt->execute([$like, $like, $like, $like]);
            ldJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'generate_share_token':
            requireLoadingAccess(false);
            $reportId = (int)($input['report_id'] ?? 0);
            if ($reportId <= 0) {
                ldJsonError('รหัสรายงานไม่ถูกต้อง', 400);
            }
            $stmt = $pdo->prepare(
                "DECLARE @tok VARCHAR(64);
                 EXEC dbo.sp_loadingGenerateToken @reportId = ?, @expiryDays = 30, @token = @tok OUTPUT;
                 SELECT @tok AS access_token;"
            );
            $stmt->execute([$reportId]);
            $tokenRow = $stmt->fetch(PDO::FETCH_ASSOC);
            $token = $tokenRow['access_token'] ?? '';
            writeLog($pdo, 'SHARE', 'LOADING_REPORT', $reportId, null, ['has_token' => $token !== ''], 'Generated share token');
            ldJsonSuccess(['access_token' => $token]);
            break;

        default:
            ldJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ldJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo) && function_exists('writeErrorLog')) {
        writeErrorLog($pdo, 'LOADING_REPORT', $e->getMessage(), ['action' => $action ?? '']);
    }
    ldJsonError('เกิดข้อผิดพลาดในการจัดการ Loading Report', 500);
}
