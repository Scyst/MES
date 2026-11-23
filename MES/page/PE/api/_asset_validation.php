<?php
// MES/page/PE/api/_asset_validation.php
// Shared server-side asset/location validation for PE Work Orders and Downtime Logs.

function getPeStandardExtraAreas(): array {
    return [
        'Facility & Utility',
        'ST/WH',
        'MT/PE',
        'Office / อาคารสำนักงาน',
        'Outdoor / นอกอาคารและพื้นที่ส่วนกลาง',
    ];
}

function getPeGeneralCategories(): array {
    return [
        'เครื่องมือช่าง / ปืนลม / สว่าน',
        'ระบบไฟฟ้า / แสงสว่าง / พัดลม',
        'ระบบปรับอากาศ / ประปา / อาคาร',
        'Jig & Fixture / รถเข็น / ชั้นวาง',
        'พื้นที่ภายนอกอาคาร / ประตู / ถนน',
        'อุปกรณ์ทั่วไปอื่นๆ',
    ];
}

/**
 * Validates and resolves machine_id, machine_name, and line from request payload.
 * Enforces strict PE_MACHINES lookup when machine_id is provided or asset_mode === 'machine',
 * and enforces standard area/category validation when asset_mode === 'general'.
 */
function resolveValidatedAsset(PDO $pdo, array $input): array {
    $assetMode = trim((string)($input['asset_mode'] ?? ''));
    $machineId = !empty($input['machine_id']) ? intval($input['machine_id']) : null;
    if ($machineId !== null && $machineId <= 0) {
        $machineId = null;
    }

    if ($assetMode === 'machine' && $machineId === null) {
        throw new Exception('กรุณาเลือกเครื่องจักรจากรายการในระบบ');
    }

    if ($machineId !== null && $assetMode !== 'general') {
        $mStmt = $pdo->prepare(
            "SELECT machine_id, machine_name, line
             FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
             WHERE machine_id = ? AND is_active = 1"
        );
        $mStmt->execute([$machineId]);
        $mData = $mStmt->fetch(PDO::FETCH_ASSOC);
        if (!$mData) {
            throw new Exception('ไม่พบข้อมูลเครื่องจักรที่เลือกในระบบ หรือเครื่องจักรไม่ได้เปิดใช้งาน');
        }

        return [
            'machine_id' => (int)$mData['machine_id'],
            'machine_name' => mb_substr(trim((string)$mData['machine_name']), 0, 200),
            'line' => mb_substr(trim((string)$mData['line']), 0, 50),
        ];
    }

    if ($assetMode === 'general') {
        $genLine = trim((string)($input['general_line'] ?? $input['line'] ?? ''));
        $genCat = trim((string)($input['general_category'] ?? ''));
        $genName = trim((string)($input['general_name'] ?? $input['machine_name'] ?? ''));

        $dbLines = $pdo->query(
            "SELECT DISTINCT line FROM " . PE_MACHINES_TABLE . " WITH (NOLOCK)
             WHERE is_active = 1 AND line IS NOT NULL AND line != ''"
        )->fetchAll(PDO::FETCH_COLUMN) ?: [];

        $allowedAreas = array_values(array_unique(array_merge(
            array_map(static fn($v) => trim((string)$v), $dbLines),
            getPeStandardExtraAreas()
        )));

        $allowedCategories = getPeGeneralCategories();

        if ($genLine === '' || !in_array($genLine, $allowedAreas, true)) {
            throw new Exception('กรุณาเลือกพื้นที่ / แผนกจากรายการมาตรฐาน');
        }
        if ($genCat === '' || !in_array($genCat, $allowedCategories, true)) {
            throw new Exception('กรุณาเลือกหมวดหมู่อุปกรณ์ทั่วไปให้ถูกต้อง');
        }
        if ($genName === '') {
            throw new Exception('กรุณาระบุชื่ออุปกรณ์ / จุดที่พบปัญหา');
        }

        $prefixTag = "[{$genCat}] ";
        $formattedName = (strpos($genName, $prefixTag) === 0) ? $genName : ($prefixTag . $genName);

        return [
            'machine_id' => null,
            'machine_name' => mb_substr($formattedName, 0, 200),
            'line' => mb_substr($genLine, 0, 50),
        ];
    }

    // Legacy fallback (e.g., PE Dashboard modals without asset_mode)
    return [
        'machine_id' => null,
        'machine_name' => mb_substr(trim((string)($input['machine_name'] ?? '')), 0, 200),
        'line' => mb_substr(trim((string)($input['line'] ?? '')), 0, 50),
    ];
}
