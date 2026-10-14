<?php
/**
 * Zone Health & Inventory Record Accuracy (IRA) Calculation Engine
 * MES Store Management - Phase 1.3
 */

function getThaiMonthYear(int $timestamp): string {
    $thaiMonths = [
        1 => 'มกราคม', 2 => 'กุมภาพันธ์', 3 => 'มีนาคม', 4 => 'เมษายน',
        5 => 'พฤษภาคม', 6 => 'มิถุนายน', 7 => 'กรกฎาคม', 8 => 'สิงหาคม',
        9 => 'กันยายน', 10 => 'ตุลาคม', 11 => 'พฤศจิกายน', 12 => 'ธันวาคม'
    ];
    $m = (int)date('n', $timestamp);
    $y = (int)date('Y', $timestamp) + 543;
    return ($thaiMonths[$m] ?? date('F', $timestamp)) . ' ' . $y;
}

function getZoneHealthMetrics(PDO $pdo, ?string $startDate = null, ?string $endDate = null): array {
    // Default to current monthly cycle (1st of month to end of month)
    if (!$startDate) {
        $startDate = date('Y-m-01 00:00:00');
    }
    if (!$endDate) {
        $endDate = date('Y-m-t 23:59:59');
    }

    $cycleLabel = getThaiMonthYear(strtotime($startDate));

    $sql = "
    WITH RankedSessions AS (
        SELECT 
            s.session_id,
            s.location_id,
            l.location_name,
            ISNULL(l.zone_name, N'อื่น ๆ (Others)') as zone_name,
            s.status,
            s.created_at,
            ROW_NUMBER() OVER (PARTITION BY s.location_id ORDER BY s.session_id DESC) as rn
        FROM dbo.CYCLE_COUNT_SESSIONS s WITH (NOLOCK)
        JOIN dbo.LOCATIONS l WITH (NOLOCK) ON s.location_id = l.location_id
        WHERE s.created_at >= :start_date AND s.created_at <= :end_date
          AND EXISTS (
            SELECT 1 FROM dbo.CYCLE_COUNT_DETAILS d WITH (NOLOCK) 
            WHERE d.session_id = s.session_id AND d.actual_qty IS NOT NULL
        )
    ),
    SessionMetrics AS (
        SELECT 
            rs.session_id,
            rs.location_id,
            rs.location_name,
            rs.zone_name,
            COUNT(d.id) as total_pallets,
            SUM(CASE WHEN d.actual_qty IS NOT NULL THEN 1 ELSE 0 END) as counted_pallets,
            SUM(CASE WHEN d.actual_qty IS NOT NULL AND d.variance_qty = 0 AND d.is_wrong_location = 0 THEN 1 ELSE 0 END) as accurate_pallets,
            SUM(CASE WHEN d.actual_qty IS NOT NULL AND (d.variance_qty != 0 OR d.is_wrong_location = 1) THEN 1 ELSE 0 END) as variance_pallets,
            SUM(CASE WHEN d.actual_qty IS NOT NULL THEN d.system_qty * COALESCE(NULLIF(i.StandardPrice, 0), NULLIF(i.Cost_Total, 0), 0) ELSE 0 END) as system_value,
            SUM(CASE WHEN d.actual_qty IS NOT NULL THEN ABS(d.actual_qty - d.system_qty) * COALESCE(NULLIF(i.StandardPrice, 0), NULLIF(i.Cost_Total, 0), 0) ELSE 0 END) as variance_value
        FROM RankedSessions rs
        JOIN dbo.CYCLE_COUNT_DETAILS d WITH (NOLOCK) ON rs.session_id = d.session_id
        JOIN dbo.ITEMS i WITH (NOLOCK) ON d.item_id = i.item_id
        WHERE rs.rn = 1
        GROUP BY rs.session_id, rs.location_id, rs.location_name, rs.zone_name
    ),
    AllZones AS (
        SELECT 
            ISNULL(zone_name, N'อื่น ๆ (Others)') as zone_name,
            COUNT(DISTINCT location_id) as total_locations
        FROM dbo.LOCATIONS WITH (NOLOCK)
        WHERE location_type = 'STORE' AND is_active = 1
        GROUP BY ISNULL(zone_name, N'อื่น ๆ (Others)')
    )
    SELECT 
        az.zone_name,
        az.total_locations,
        ISNULL(sm.locations_audited, 0) as locations_audited,
        ISNULL(sm.total_pallets, 0) as total_pallets,
        ISNULL(sm.counted_pallets, 0) as counted_pallets,
        ISNULL(sm.accurate_pallets, 0) as accurate_pallets,
        ISNULL(sm.variance_pallets, 0) as variance_pallets,
        CASE WHEN ISNULL(sm.counted_pallets, 0) > 0 
             THEN ROUND((CAST(sm.accurate_pallets AS FLOAT) / sm.counted_pallets) * 100, 1) 
             ELSE NULL END as ira_item_pct,
        CASE WHEN ISNULL(sm.system_value, 0) > 0 
             THEN CASE WHEN (1.0 - (sm.variance_value / sm.system_value)) * 100 < 0 THEN 0.0 
                       ELSE ROUND((1.0 - (sm.variance_value / sm.system_value)) * 100, 1) END
             WHEN ISNULL(sm.counted_pallets, 0) > 0 THEN 100.0
             ELSE NULL END as ira_value_pct,
        ISNULL(sm.system_value, 0) as total_system_value,
        ISNULL(sm.variance_value, 0) as total_variance_value
    FROM AllZones az
    LEFT JOIN (
        SELECT 
            zone_name,
            COUNT(DISTINCT location_id) as locations_audited,
            SUM(total_pallets) as total_pallets,
            SUM(counted_pallets) as counted_pallets,
            SUM(accurate_pallets) as accurate_pallets,
            SUM(variance_pallets) as variance_pallets,
            SUM(system_value) as system_value,
            SUM(variance_value) as variance_value
        FROM SessionMetrics
        GROUP BY zone_name
    ) sm ON az.zone_name = sm.zone_name
    ORDER BY az.zone_name
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute(['start_date' => $startDate, 'end_date' => $endDate]);
    $zoneRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Compute Grades and format numbers
    $zonesMap = [];
    $totalLocationsAll = 0;
    $auditedLocationsAll = 0;
    $totalPalletsAll = 0;
    $countedPalletsAll = 0;
    $accuratePalletsAll = 0;
    $variancePalletsAll = 0;
    $totalSystemValueAll = 0.0;
    $totalVarianceValueAll = 0.0;

    foreach ($zoneRows as $row) {
        $zoneName = $row['zone_name'];
        $counted = (int)$row['counted_pallets'];
        $itemIra = $row['ira_item_pct'] !== null ? (float)$row['ira_item_pct'] : null;
        $valIra = $row['ira_value_pct'] !== null ? (float)$row['ira_value_pct'] : null;

        $grade = null;
        $gradeClass = 'badge-grade-none';
        $gradeIcon = 'far fa-clock';
        $gradeText = 'ยังไม่ตรวจ';
        $status = 'UNAUDITED';

        if ($counted > 0 && $itemIra !== null) {
            $status = 'AUDITED';
            if ($itemIra >= 95.0) {
                $grade = 'A';
                $gradeClass = 'badge-grade-a';
                $gradeIcon = 'fas fa-check-circle';
                $gradeText = 'เกรด A · ' . number_format($itemIra, 1) . '%';
            } elseif ($itemIra >= 85.0) {
                $grade = 'B';
                $gradeClass = 'badge-grade-b';
                $gradeIcon = 'fas fa-exclamation-triangle';
                $gradeText = 'เกรด B · ' . number_format($itemIra, 1) . '%';
            } else {
                $grade = 'C';
                $gradeClass = 'badge-grade-c';
                $gradeIcon = 'fas fa-times-circle';
                $gradeText = 'เกรด C · ' . number_format($itemIra, 1) . '%';
            }
        }

        $rowFormatted = [
            'zone_name' => $zoneName,
            'total_locations' => (int)$row['total_locations'],
            'locations_audited' => (int)$row['locations_audited'],
            'total_pallets' => (int)$row['total_pallets'],
            'counted_pallets' => $counted,
            'accurate_pallets' => (int)$row['accurate_pallets'],
            'variance_pallets' => (int)$row['variance_pallets'],
            'ira_item_pct' => $itemIra,
            'ira_value_pct' => $valIra,
            'total_system_value' => (float)$row['total_system_value'],
            'total_variance_value' => (float)$row['total_variance_value'],
            'grade' => $grade,
            'grade_class' => $gradeClass,
            'grade_icon' => $gradeIcon,
            'grade_text' => $gradeText,
            'status' => $status
        ];

        $zonesMap[$zoneName] = $rowFormatted;

        $totalLocationsAll += (int)$row['total_locations'];
        $auditedLocationsAll += (int)$row['locations_audited'];
        $totalPalletsAll += (int)$row['total_pallets'];
        $countedPalletsAll += $counted;
        $accuratePalletsAll += (int)$row['accurate_pallets'];
        $variancePalletsAll += (int)$row['variance_pallets'];
        $totalSystemValueAll += (float)$row['total_system_value'];
        $totalVarianceValueAll += (float)$row['total_variance_value'];
    }

    // Compute Overall Warehouse Health
    $overallItemIra = $countedPalletsAll > 0 ? round(($accuratePalletsAll / $countedPalletsAll) * 100, 1) : null;
    $overallValIra = null;
    if ($totalSystemValueAll > 0) {
        $valPct = (1.0 - ($totalVarianceValueAll / $totalSystemValueAll)) * 100;
        $overallValIra = round(max(0.0, $valPct), 1);
    } elseif ($countedPalletsAll > 0) {
        $overallValIra = 100.0;
    }

    $overallGrade = null;
    $overallGradeClass = 'badge-grade-none';
    $overallGradeIcon = 'far fa-clock';
    $overallGradeText = 'ยังไม่ตรวจ';
    $overallStatus = 'UNAUDITED';

    if ($countedPalletsAll > 0 && $overallItemIra !== null) {
        $overallStatus = 'AUDITED';
        if ($overallItemIra >= 95.0) {
            $overallGrade = 'A';
            $overallGradeClass = 'badge-grade-a';
            $overallGradeIcon = 'fas fa-check-circle';
            $overallGradeText = 'เกรด A · มาตรฐานยอดเยี่ยม';
        } elseif ($overallItemIra >= 85.0) {
            $overallGrade = 'B';
            $overallGradeClass = 'badge-grade-b';
            $overallGradeIcon = 'fas fa-exclamation-triangle';
            $overallGradeText = 'เกรด B · มาตรฐานยอมรับได้';
        } else {
            $overallGrade = 'C';
            $overallGradeClass = 'badge-grade-c';
            $overallGradeIcon = 'fas fa-times-circle';
            $overallGradeText = 'เกรด C · ต้องปรับปรุงเร่งด่วน';
        }
    }

    $overall = [
        'cycle_label' => $cycleLabel,
        'start_date' => $startDate,
        'end_date' => $endDate,
        'total_locations' => $totalLocationsAll,
        'audited_locations' => $auditedLocationsAll,
        'total_pallets' => $totalPalletsAll,
        'counted_pallets' => $countedPalletsAll,
        'accurate_pallets' => $accuratePalletsAll,
        'variance_pallets' => $variancePalletsAll,
        'ira_item_pct' => $overallItemIra,
        'ira_value_pct' => $overallValIra,
        'total_system_value' => $totalSystemValueAll,
        'total_variance_value' => $totalVarianceValueAll,
        'grade' => $overallGrade,
        'grade_class' => $overallGradeClass,
        'grade_icon' => $overallGradeIcon,
        'grade_text' => $overallGradeText,
        'status' => $overallStatus
    ];

    return [
        'overall' => $overall,
        'zones' => array_values($zonesMap),
        'zones_map' => $zonesMap
    ];
}
