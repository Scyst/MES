<?php
/**
 * sapReconcileApi.php
 * MES vs SAP Stock Reconciliation & Manual MB52 Import API.
 * Standard: PDO Prepared Statements, CSRF on POST, Role Guard, SYSTEM_LOGS Audit Trail.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
error_reporting(0);
ini_set('display_errors', 0);

require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../utils/check_auth.php';
require_once __DIR__ . '/../../utils/logger.php';

function sapRecJson(bool $ok, $data, string $message = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode(['success' => $ok, 'data' => $data, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function sapRecVerifyCsrf(): void {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    $sessionToken = $_SESSION['csrf_token'] ?? '';
    if ($sessionToken !== '' && !hash_equals($sessionToken, (string)$token)) {
        sapRecJson(false, null, 'Invalid CSRF token', 403);
    }
}

function sapRecIsAdmin(): bool {
    $role = strtolower((string)($_SESSION['user']['role'] ?? ''));
    return in_array($role, ['admin', 'creator', 'manager', 'supervisor'], true);
}

/** Compares aggregated MES INVENTORY_ONHAND vs SAP_STG_ALL_STOCK by sap_no. */
function handleGetDiff(PDO $pdo): void {
    $type = strtoupper(trim((string)($_GET['type'] ?? 'ALL')));
    $onlyDiff = !empty($_GET['only_diff']) && $_GET['only_diff'] !== '0' && $_GET['only_diff'] !== 'false';
    $search = trim((string)($_GET['search'] ?? ''));

    $sapMeta = $pdo->query(
        "SELECT COUNT(*) AS row_cnt, CONVERT(varchar(19), MAX(Logdate), 120) AS last_sync FROM dbo.SAP_STG_ALL_STOCK WITH (NOLOCK)"
    )->fetch(PDO::FETCH_ASSOC);

    $where = ["1=1"];
    $params = [];
    if (in_array($type, ['FG', 'SEMI', 'RM', 'PKG'], true)) {
        $where[] = "material_type = ?";
        $params[] = $type;
    }
    if ($onlyDiff) {
        $where[] = "ABS(mes_qty - sap_qty) > 0.001";
    }
    if ($search !== '') {
        $where[] = "(sap_no LIKE ? OR part_no LIKE ? OR part_description LIKE ?)";
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }
    $whereSql = implode(' AND ', $where);

    $cte = "
        WITH MES_AGG AS (
            SELECT
                LTRIM(RTRIM(I.sap_no)) AS sap_no,
                MAX(I.item_id) AS item_id,
                MAX(I.part_no) AS part_no,
                MAX(I.part_description) AS part_description,
                MAX(ISNULL(I.material_type, 'OTHER')) AS material_type,
                MAX(ISNULL(I.Cost_Total, 0)) AS unit_cost,
                SUM(ISNULL(O.quantity, 0)) AS mes_qty
            FROM dbo.ITEMS I WITH (NOLOCK)
            LEFT JOIN dbo.INVENTORY_ONHAND O WITH (NOLOCK) ON O.parameter_id = I.item_id
            WHERE ISNULL(LTRIM(RTRIM(I.sap_no)), '') != ''
            GROUP BY LTRIM(RTRIM(I.sap_no))
        ),
        SAP_AGG AS (
            SELECT
                LTRIM(RTRIM(Mat_No)) AS sap_no,
                MAX(MatDesc) AS sap_desc,
                SUM(ISNULL(Quantity, 0)) AS sap_qty
            FROM dbo.SAP_STG_ALL_STOCK WITH (NOLOCK)
            WHERE ISNULL(LTRIM(RTRIM(Mat_No)), '') != ''
            GROUP BY LTRIM(RTRIM(Mat_No))
        ),
        COMBINED AS (
            SELECT
                COALESCE(M.sap_no, S.sap_no) AS sap_no,
                M.item_id,
                ISNULL(M.part_no, S.sap_no) AS part_no,
                COALESCE(M.part_description, S.sap_desc, '-') AS part_description,
                ISNULL(M.material_type, 'SAP_ONLY') AS material_type,
                CAST(ISNULL(M.unit_cost, 0) AS DECIMAL(14,4)) AS unit_cost,
                CAST(ISNULL(M.mes_qty, 0) AS DECIMAL(16,2)) AS mes_qty,
                CAST(ISNULL(S.sap_qty, 0) AS DECIMAL(16,2)) AS sap_qty,
                CAST(ISNULL(M.mes_qty, 0) - ISNULL(S.sap_qty, 0) AS DECIMAL(16,2)) AS diff_qty,
                CAST((ISNULL(M.mes_qty, 0) - ISNULL(S.sap_qty, 0)) * ISNULL(M.unit_cost, 0) AS DECIMAL(16,2)) AS diff_val
            FROM MES_AGG M
            FULL OUTER JOIN SAP_AGG S ON M.sap_no = S.sap_no
            WHERE ISNULL(M.mes_qty, 0) <> 0 OR ISNULL(S.sap_qty, 0) <> 0
        )
    ";

    $summarySql = $cte . "
        SELECT
            COUNT(*) AS total_skus,
            SUM(CASE WHEN ABS(diff_qty) <= 0.001 THEN 1 ELSE 0 END) AS matched_skus,
            SUM(CASE WHEN ABS(diff_qty) > 0.001 THEN 1 ELSE 0 END) AS diff_skus,
            CAST(SUM(mes_qty * unit_cost) AS DECIMAL(18,2)) AS mes_total_val,
            CAST(SUM(sap_qty * unit_cost) AS DECIMAL(18,2)) AS sap_total_val,
            CAST(SUM(ABS(diff_val)) AS DECIMAL(18,2)) AS abs_diff_val
        FROM COMBINED WHERE {$whereSql}
    ";
    $stmtSum = $pdo->prepare($summarySql);
    $stmtSum->execute($params);
    $summary = $stmtSum->fetch(PDO::FETCH_ASSOC) ?: [];

    $listSql = $cte . "
        SELECT TOP (500) * FROM COMBINED
        WHERE {$whereSql}
        ORDER BY ABS(diff_val) DESC, ABS(diff_qty) DESC
    ";
    $stmtList = $pdo->prepare($listSql);
    $stmtList->execute($params);
    $rows = $stmtList->fetchAll(PDO::FETCH_ASSOC);

    sapRecJson(true, [
        'sap_meta' => $sapMeta,
        'summary' => $summary,
        'rows' => $rows,
    ], 'โหลดรายงานเทียบยอด MES–SAP เรียบร้อย');
}

/** Imports parsed SAP MB52 rows into dbo.SAP_STG_ALL_STOCK with Zero-Row Guard. */
function handleImportSapRows(PDO $pdo, array $payload): void {
    sapRecVerifyCsrf();
    if (!sapRecIsAdmin()) {
        sapRecJson(false, null, 'ต้องใช้สิทธิ์ผู้ดูแลระบบหรือหัวหน้างานในการนำเข้าข้อมูล SAP', 403);
    }
    $rows = $payload['rows'] ?? [];
    if (!is_array($rows) || count($rows) === 0) {
        sapRecJson(false, null, 'ไม่พบรายการข้อมูล SAP สำหรับนำเข้า (ยกเลิกเพื่อไม่ให้ล้างข้อมูลเดิม)', 400);
    }

    $validRows = [];
    foreach ($rows as $r) {
        $matNo = trim((string)($r['mat_no'] ?? ''));
        if ($matNo === '') continue;
        $validRows[] = [
            substr(trim((string)($r['plant'] ?? '1820')), 0, 50),
            substr($matNo, 0, 50),
            substr(trim((string)($r['mat_desc'] ?? '')), 0, 255),
            substr(trim((string)($r['sloc'] ?? '')), 0, 50),
            substr(trim((string)($r['batch'] ?? '')), 0, 50),
            (float)($r['quantity'] ?? 0),
            substr(trim((string)($r['unit'] ?? 'PCS')), 0, 20),
        ];
    }
    if (count($validRows) === 0) {
        sapRecJson(false, null, 'ไม่พบรหัส Material (Mat_No) ที่ถูกต้องในไฟล์นำเข้า', 400);
    }

    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM dbo.SAP_STG_ALL_STOCK');
    $stmt = $pdo->prepare(
        "INSERT INTO dbo.SAP_STG_ALL_STOCK (Plant, Mat_No, MatDesc, Storage_Location, Batch, Quantity, Unit, Logdate)
         VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE())"
    );
    foreach ($validRows as $vr) {
        $stmt->execute($vr);
    }
    $pdo->commit();

    writeLog($pdo, 'IMPORT', 'SAP_RECONCILE', 'MB52_MANUAL', null, ['rows' => count($validRows)], 'Manual SAP MB52 import into SAP_STG_ALL_STOCK');
    sapRecJson(true, ['imported_rows' => count($validRows)], 'นำเข้าข้อมูล SAP MB52 สำเร็จ ' . count($validRows) . ' รายการ');
}

/** Applies audited Cut-off ADJUSTMENT to align selected MES SKUs to SAP_STG_ALL_STOCK. */
function handleApplyCutoff(PDO $pdo, array $payload): void {
    sapRecVerifyCsrf();
    if (!sapRecIsAdmin()) {
        sapRecJson(false, null, 'ต้องใช้สิทธิ์ผู้ดูแลระบบหรือหัวหน้างานในการปรับยอด Cut-off', 403);
    }
    $sapNos = $payload['sap_nos'] ?? [];
    if (!is_array($sapNos) || count($sapNos) === 0 || count($sapNos) > 200) {
        sapRecJson(false, null, 'กรุณาเลือกรายการที่ต้องการปรับยอด Cut-off (1–200 รายการต่อครั้ง)', 400);
    }

    $userId = (int)($_SESSION['user']['id'] ?? $_SESSION['user']['user_id'] ?? 0);
    $refId = 'CUTOFF-SAP-' . date('Ymd');
    $updated = 0;

    $stmtItem = $pdo->prepare("SELECT TOP 1 item_id, sap_no FROM dbo.ITEMS WITH (NOLOCK) WHERE LTRIM(RTRIM(sap_no)) = ?");
    $stmtSap  = $pdo->prepare("SELECT SUM(ISNULL(Quantity, 0)) FROM dbo.SAP_STG_ALL_STOCK WITH (NOLOCK) WHERE LTRIM(RTRIM(Mat_No)) = ?");
    $stmtLocs = $pdo->prepare("SELECT location_id, quantity FROM dbo.INVENTORY_ONHAND WITH (UPDLOCK) WHERE parameter_id = ? ORDER BY quantity DESC, location_id ASC");
    $stmtUpd  = $pdo->prepare("UPDATE dbo.INVENTORY_ONHAND SET quantity = ?, last_updated = GETDATE() WHERE parameter_id = ? AND location_id = ?");
    $stmtIns  = $pdo->prepare("INSERT INTO dbo.INVENTORY_ONHAND (parameter_id, location_id, quantity, last_updated) VALUES (?, ?, ?, GETDATE())");
    $stmtTx   = $pdo->prepare(
        "INSERT INTO dbo.STOCK_TRANSACTIONS (parameter_id, quantity, transaction_type, transaction_timestamp, from_location_id, reference_id, created_by_user_id, notes)
         VALUES (?, ?, 'ADJUSTMENT', GETDATE(), ?, ?, ?, ?)"
    );

    $pdo->beginTransaction();
    foreach ($sapNos as $rawSap) {
        $sapNo = trim((string)$rawSap);
        if ($sapNo === '') continue;
        $stmtItem->execute([$sapNo]);
        $item = $stmtItem->fetch(PDO::FETCH_ASSOC);
        if (!$item) continue;
        $itemId = (int)$item['item_id'];

        $stmtSap->execute([$sapNo]);
        $targetQty = (float)($stmtSap->fetchColumn() ?: 0);

        $stmtLocs->execute([$itemId]);
        $locs = $stmtLocs->fetchAll(PDO::FETCH_ASSOC);

        if (count($locs) === 0) {
            if (abs($targetQty) > 0.001) {
                $stmtIns->execute([$itemId, 1, $targetQty]);
                $stmtTx->execute([$itemId, $targetQty, 1, $refId, $userId ?: null, "Cut-off reconcile to SAP ({$sapNo})"]);
                $updated++;
            }
            continue;
        }

        // Primary location takes targetQty; all secondary locations zeroed out cleanly
        foreach ($locs as $idx => $loc) {
            $locId = (int)$loc['location_id'];
            $curQty = (float)$loc['quantity'];
            $newQty = ($idx === 0) ? $targetQty : 0.0;
            $delta = $newQty - $curQty;
            if (abs($delta) > 0.001) {
                $stmtUpd->execute([$newQty, $itemId, $locId]);
                $stmtTx->execute([$itemId, $delta, $locId, $refId, $userId ?: null, "Cut-off reconcile to SAP ({$sapNo})"]);
            }
        }
        $updated++;
    }
    $pdo->commit();

    writeLog($pdo, 'ADJUSTMENT', 'SAP_RECONCILE', $refId, null, ['updated_skus' => $updated], "Applied SAP cut-off reconciliation for {$updated} SKUs");
    sapRecJson(true, ['updated_skus' => $updated, 'ref_id' => $refId], "ปรับยอด Cut-off ตรงกับ SAP เรียบร้อย {$updated} รายการ");
}

try {
    if (!isset($_SESSION['user'])) {
        sapRecJson(false, null, 'Unauthorized Access', 401);
    }

    $payload = [];
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $raw = file_get_contents('php://input');
        $decoded = $raw ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $payload = $decoded;
        }
    }
    $action = trim((string)($_GET['action'] ?? $payload['action'] ?? 'get_diff'));

    switch ($action) {
        case 'get_diff':
            handleGetDiff($pdo);
            break;
        case 'import_sap_rows':
            handleImportSapRows($pdo, $payload);
            break;
        case 'apply_cutoff':
            handleApplyCutoff($pdo, $payload);
            break;
        default:
            sapRecJson(false, null, 'Unknown action', 400);
    }
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (function_exists('writeErrorLog')) {
        writeErrorLog($e, 'sapReconcileApi');
    }
    sapRecJson(false, null, 'เกิดข้อผิดพลาดในการเทียบยอด SAP กรุณาลองใหม่อีกครั้ง', 500);
}
