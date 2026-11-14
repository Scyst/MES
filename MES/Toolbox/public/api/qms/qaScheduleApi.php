<?php
/**
 * Self-contained QA/QC Schedule & Planner Calendar API (dbo.SALES_ORDERS).
 * Enforces explicit columns, TOP limits, CSRF tokens, strict state consistency,
 * and SYSTEM_LOGS audit trail without overwriting sales confirmation status.
 */

require_once __DIR__ . '/_common.php';

try {
    [$action, $input, $currentUser] = parseQmsRequest();
    requireQmsAccess();

    $actorName = resolveQmsActorName($pdo, $currentUser);

    switch ($action) {
        case 'get_schedule':
            $startDate = parseQmsDateOrNull($input['start_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $endDate = parseQmsDateOrNull($input['end_date'] ?? date('Y-m-d')) ?? date('Y-m-d');
            $range = trim((string)($input['range'] ?? 'date'));

            if ($range === 'today') {
                $startDate = date('Y-m-d');
                $endDate = date('Y-m-d');
            } elseif ($range === 'this_week') {
                $startDate = date('Y-m-d', strtotime('monday this week'));
                $endDate = date('Y-m-d', strtotime('sunday this week'));
            } elseif ($range === 'this_month') {
                $startDate = date('Y-m-01');
                $endDate = date('Y-m-t');
            } elseif ($range === 'last_month') {
                $startDate = date('Y-m-01', strtotime('first day of last month'));
                $endDate = date('Y-m-t', strtotime('last day of last month'));
            }

            $sql = "
                SELECT TOP (500)
                    id, po_number, sku, description, color, quantity, dc_location,
                    loading_date, loading_week, inspection_date, actual_inspection_date,
                    inspection_status, inspection_result, is_confirmed, inspection_remark,
                    qa_inspector, ticket_number, inspect_type
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE CAST(inspection_date AS DATE) >= ? AND CAST(inspection_date AS DATE) <= ?
                ORDER BY inspection_date ASC, loading_date ASC, po_number ASC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$startDate, $endDate]);
            $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stats = [
                'total' => count($data),
                'waiting' => 0,
                'in_progress' => 0,
                'passed' => 0,
                'failed' => 0,
            ];
            foreach ($data as $row) {
                $st = strtoupper(trim((string)($row['inspection_status'] ?? '')));
                $res = strtoupper(trim((string)($row['inspection_result'] ?? '')));
                if ($res === 'PASS' || $st === 'PASS') {
                    $stats['passed']++;
                } elseif ($res === 'FAIL') {
                    $stats['failed']++;
                } elseif ($st === 'DONE') {
                    $stats['passed']++;
                } elseif ($st === 'IN_PROGRESS') {
                    $stats['in_progress']++;
                } else {
                    $stats['waiting']++;
                }
            }

            qmsJsonSuccess(['rows' => $data, 'stats' => $stats, 'start_date' => $startDate, 'end_date' => $endDate]);
            break;

        case 'get_pending_jobs':
            $search = trim((string)($input['search'] ?? ''));
            $where = "(inspection_date IS NULL OR inspection_status = 'WAITING' OR inspection_status IS NULL)";
            $params = [];
            if ($search !== '') {
                $where .= ' AND (po_number LIKE ? OR sku LIKE ? OR description LIKE ?)';
                $like = '%' . $search . '%';
                array_push($params, $like, $like, $like);
            }

            $sql = "
                SELECT TOP (100)
                    id, po_number, sku, description, color, quantity, dc_location, loading_date, loading_week
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE {$where}
                ORDER BY loading_date ASC, id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'search_po':
            $search = trim((string)($input['search'] ?? ''));
            if ($search === '') {
                qmsJsonSuccess([]);
            }
            $sql = "
                SELECT TOP (30) id, po_number, sku, description, color, quantity, dc_location, loading_date, inspection_date, inspection_status
                FROM dbo.SALES_ORDERS WITH (NOLOCK)
                WHERE po_number LIKE ? OR sku LIKE ?
                ORDER BY loading_date DESC, id DESC
            ";
            $stmt = $pdo->prepare($sql);
            $like = '%' . $search . '%';
            $stmt->execute([$like, $like]);
            qmsJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'get_qc_users':
            $sql = "
                SELECT u.id,
                       COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username) AS fullname,
                       u.username,
                       u.aka
                FROM dbo.USERS u WITH (NOLOCK)
                LEFT JOIN dbo.MANPOWER_EMPLOYEES m WITH (NOLOCK) ON u.username = m.emp_id
                WHERE u.role IN ('qc', 'qa') AND u.is_active = 1
                  AND COALESCE(NULLIF(m.name_th, ''), NULLIF(u.fullname, ''), u.username) IS NOT NULL
                ORDER BY fullname ASC
            ";
            $users = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            qmsJsonSuccess($users);
            break;

        case 'schedule_po':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $scheduleDate = parseQmsDateOrNull($input['schedule_date'] ?? null);
            if ($scheduleDate === null) {
                throw new InvalidArgumentException('กรุณาระบุวันที่กำหนดตรวจ (Schedule Date)');
            }

            $stmtOld = $pdo->prepare("SELECT id, po_number, inspection_date FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?");
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $pdo->prepare("UPDATE dbo.SALES_ORDERS SET inspection_date = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$scheduleDate, $poId]);

            writeLog($pdo, 'RESCHEDULE', 'QMS_QA_SCHEDULE', $poId, $oldData, ['inspection_date' => $scheduleDate], "Scheduled PO {$oldData['po_number']} to {$scheduleDate}");
            qmsJsonSuccess(['id' => $poId, 'inspection_date' => $scheduleDate], 'จัดตารางตรวจ QA/QC เรียบร้อยแล้ว');
            break;

        case 'update_result':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $inspectionStatus = strtoupper(trim((string)($input['inspection_status'] ?? '')));
            $inspectionResult = strtoupper(trim((string)($input['inspection_result'] ?? '')));
            if ($inspectionResult === 'PENDING' || $inspectionResult === '') {
                $inspectionResult = null;
            }
            if (!in_array($inspectionStatus, ['WAITING', 'IN_PROGRESS', 'DONE'], true)) {
                throw new InvalidArgumentException('สถานะการตรวจไม่ถูกต้อง (ต้องเป็น WAITING, IN_PROGRESS หรือ DONE)');
            }
            if ($inspectionResult !== null && !in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
                throw new InvalidArgumentException('ผลการตรวจไม่ถูกต้อง (ต้องเป็น PASS หรือ FAIL)');
            }

            $remark = trim((string)($input['remark'] ?? ''));
            $ticketNumber = trim((string)($input['ticket_number'] ?? '')) ?: null;
            $qaInspector = trim((string)($input['qa_inspector'] ?? '')) ?: null;
            $inspectType = trim((string)($input['inspect_type'] ?? '')) ?: null;
            if ($inspectType !== null && !in_array($inspectType, ['Remote', 'On-site'], true)) {
                throw new InvalidArgumentException('รูปแบบการตรวจต้องเป็น Remote หรือ On-site');
            }
            $actualDate = parseQmsDateOrNull($input['actual_inspection_date'] ?? null);

            // Auto-consistency rules preserved from legacy QMS
            if (in_array($inspectionResult, ['PASS', 'FAIL'], true)) {
                $inspectionStatus = 'DONE';
                if ($actualDate === null) {
                    $actualDate = date('Y-m-d');
                }
            } elseif ($inspectionStatus === 'DONE' && $inspectionResult === null) {
                $inspectionResult = 'PASS';
                if ($actualDate === null) {
                    $actualDate = date('Y-m-d');
                }
            } elseif ($inspectionStatus === 'WAITING') {
                $inspectionResult = null;
            }

            $stmtOld = $pdo->prepare(
                "SELECT id, po_number, inspection_status, inspection_result, inspection_remark, ticket_number, qa_inspector, inspect_type, actual_inspection_date
                 FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET inspection_status = ?, inspection_result = ?, inspection_remark = ?,
                    ticket_number = ?, qa_inspector = ?, inspect_type = ?, actual_inspection_date = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $inspectionStatus, $inspectionResult, $remark,
                $ticketNumber, $qaInspector, $inspectType, $actualDate, $poId,
            ]);

            $newData = [
                'inspection_status' => $inspectionStatus,
                'inspection_result' => $inspectionResult,
                'inspection_remark' => $remark,
                'ticket_number' => $ticketNumber,
                'qa_inspector' => $qaInspector,
                'inspect_type' => $inspectType,
                'actual_inspection_date' => $actualDate,
            ];
            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $oldData, $newData, "Updated QA inspection {$oldData['po_number']}");
            qmsJsonSuccess(['id' => $poId], 'อัปเดตผลการตรวจ QA/QC เรียบร้อยแล้ว');
            break;

        case 'remove_schedule':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $force = (string)($input['force'] ?? '0');

            $stmtOld = $pdo->prepare(
                "SELECT id, po_number, inspection_date, inspection_status, inspection_result, qa_inspector
                 FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $status = strtoupper((string)($oldData['inspection_status'] ?? 'WAITING'));
            if (($status === 'IN_PROGRESS' || $status === 'DONE') && $force !== '1') {
                qmsJsonSuccess(['require_force' => true], 'รายการนี้อยู่ระหว่างดำเนินการหรือตรวจเสร็จแล้ว กรุณายืนยันการนำออกจากตาราง', ['require_force' => true]);
            }

            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET inspection_date = NULL, inspection_status = 'WAITING', inspection_result = NULL,
                    inspection_remark = NULL, qa_inspector = NULL, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([$poId]);

            writeLog($pdo, 'DELETE', 'QMS_QA_SCHEDULE', $poId, $oldData, ['inspection_date' => null, 'inspection_status' => 'WAITING'], "Removed PO {$oldData['po_number']} from QA schedule");
            qmsJsonSuccess(['id' => $poId], 'นำรายการออกจากตารางตรวจและรีเซ็ตสถานะเรียบร้อยแล้ว');
            break;

        case 'assign_inspector':
            $poId = parseQmsPositiveInt($input['id'] ?? null, 'รหัส PO');
            $inspector = trim((string)($input['qa_inspector'] ?? '')) ?: $actorName;

            $stmtOld = $pdo->prepare("SELECT id, po_number, qa_inspector FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?");
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ระบุ', 404);
            }

            $pdo->prepare("UPDATE dbo.SALES_ORDERS SET qa_inspector = ?, updated_at = GETDATE() WHERE id = ?")
                ->execute([$inspector, $poId]);

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $oldData, ['qa_inspector' => $inspector], "Assigned inspector {$inspector} to {$oldData['po_number']}");
            qmsJsonSuccess(['id' => $poId, 'qa_inspector' => $inspector], 'มอบหมายผู้ตรวจสอบเรียบร้อยแล้ว');
            break;

        case 'bulk_update_ticket':
            $rawIds = $input['po_ids'] ?? [];
            if (is_string($rawIds)) {
                $rawIds = json_decode($rawIds, true) ?: [];
            }
            $poIds = array_values(array_filter(array_map('intval', is_array($rawIds) ? $rawIds : []), static fn ($v) => $v > 0));
            if (empty($poIds)) {
                throw new InvalidArgumentException('กรุณาเลือก PO อย่างน้อย 1 รายการ');
            }

            $ticketNumber = trim((string)($input['ticket_number'] ?? ''));
            $qaInspector = trim((string)($input['qa_inspector'] ?? ''));
            $inspectType = trim((string)($input['inspect_type'] ?? ''));
            if ($inspectType !== '' && !in_array($inspectType, ['Remote', 'On-site'], true)) {
                throw new InvalidArgumentException('รูปแบบการตรวจต้องเป็น Remote หรือ On-site');
            }
            $inspectionDate = parseQmsDateOrNull($input['inspection_date'] ?? null);

            $placeholders = implode(',', array_fill(0, count($poIds), '?'));
            $params = [
                $ticketNumber !== '' ? $ticketNumber : null,
                $qaInspector !== '' ? $qaInspector : null,
                $inspectType !== '' ? $inspectType : null,
            ];
            $sql = "UPDATE dbo.SALES_ORDERS SET ticket_number = ?, qa_inspector = ?, inspect_type = ?";
            if ($inspectionDate !== null) {
                $sql .= ", inspection_date = ?";
                $params[] = $inspectionDate;
            }
            $sql .= ", updated_at = GETDATE() WHERE id IN ({$placeholders})";
            $params = array_merge($params, $poIds);

            $pdo->beginTransaction();
            $pdo->prepare($sql)->execute($params);
            $pdo->commit();

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', implode(',', $poIds), null, [
                'po_count' => count($poIds),
                'ticket_number' => $ticketNumber,
                'qa_inspector' => $qaInspector,
                'inspect_type' => $inspectType,
                'inspection_date' => $inspectionDate,
            ], 'Bulk updated QA schedule ticket');

            qmsJsonSuccess(['updated_count' => count($poIds)], 'อัปเดต Ticket สำหรับ ' . count($poIds) . ' PO เรียบร้อยแล้ว');
            break;

        case 'update_po_details':
            $poId = parseQmsPositiveInt($input['po_id'] ?? ($input['id'] ?? null), 'รหัส PO');
            $poNumber = trim((string)($input['po_number'] ?? ''));
            if ($poNumber === '') {
                throw new InvalidArgumentException('กรุณาระบุเลขที่ PO Number');
            }
            $sku = trim((string)($input['sku'] ?? ''));
            $description = trim((string)($input['description'] ?? ''));
            $color = trim((string)($input['color'] ?? ''));
            $quantity = parseQmsBoundedFloat($input['quantity'] ?? null, 'จำนวนสินค้า', 0, 99999999, true);
            $dcLocation = trim((string)($input['dc_location'] ?? ''));
            $loadingDate = parseQmsDateOrNull($input['loading_date'] ?? null);
            $loadingWeek = trim((string)($input['loading_week'] ?? ''));

            $stmtOld = $pdo->prepare(
                "SELECT po_number, sku, description, color, quantity, dc_location, loading_date, loading_week
                 FROM dbo.SALES_ORDERS WITH (NOLOCK) WHERE id = ?"
            );
            $stmtOld->execute([$poId]);
            $oldData = $stmtOld->fetch(PDO::FETCH_ASSOC);
            if (!$oldData) {
                qmsJsonError('ไม่พบข้อมูล PO ที่ต้องการแก้ไข', 404);
            }

            $newData = [
                'po_number' => $poNumber,
                'sku' => $sku,
                'description' => $description,
                'color' => $color,
                'quantity' => $quantity,
                'dc_location' => $dcLocation,
                'loading_date' => $loadingDate,
                'loading_week' => $loadingWeek,
            ];

            $pdo->prepare("
                UPDATE dbo.SALES_ORDERS
                SET po_number = ?, sku = ?, description = ?, color = ?, quantity = ?,
                    dc_location = ?, loading_date = ?, loading_week = ?, updated_at = GETDATE()
                WHERE id = ?
            ")->execute([
                $poNumber, $sku, $description, $color, $quantity,
                $dcLocation, $loadingDate, $loadingWeek, $poId,
            ]);

            writeLog($pdo, 'UPDATE', 'QMS_QA_SCHEDULE', $poId, $oldData, $newData, "Updated PO details {$poNumber}");
            qmsJsonSuccess(['id' => $poId], 'อัปเดตข้อมูล PO เรียบร้อยแล้ว');
            break;

        default:
            qmsJsonError('ไม่พบ Action ที่ระบุ', 400);
    }
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    qmsJsonError($e->getMessage(), 400);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (isset($pdo)) {
        writeErrorLog($pdo, 'QMS_QA_SCHEDULE', $e->getMessage(), $input ?? null);
    }
    qmsJsonError('เกิดข้อผิดพลาดในระบบตารางตรวจ QA/QC กรุณาลองใหม่อีกครั้ง', 500);
}
