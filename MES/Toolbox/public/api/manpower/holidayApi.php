<?php
/**
 * Self-contained Manpower Holiday & Calendar Multiplier API.
 * Reads calendar events and updates holidays/work_rate_holiday/ot_rate_holiday via sp_SaveCalendarEvent.
 */

require_once __DIR__ . '/_common.php';

$input = [];
try {
    [$action, $input, $currentUser] = parseMpRequest('read');
    $updatedBy = trim((string)($currentUser['username'] ?? 'SYSTEM'));

    switch ($action) {
        case 'read':
            requireMpAccess(false);
            $start = parseMpDate(substr((string)($input['start'] ?? ''), 0, 10), date('Y-m-01'), 'วันเริ่มต้น');
            $end = parseMpDate(substr((string)($input['end'] ?? ''), 0, 10), date('Y-m-t'), 'วันสิ้นสุด');

            $stmt = $pdo->prepare("
                SELECT TOP (400)
                    CONVERT(VARCHAR(10), calendar_date, 120) AS calendar_date,
                    day_type,
                    description,
                    CAST(ISNULL(work_rate_holiday, 1.0) AS FLOAT) AS work_rate_holiday,
                    CAST(ISNULL(ot_rate_holiday, 1.5) AS FLOAT) AS ot_rate_holiday,
                    updated_by,
                    updated_at
                FROM dbo.MANPOWER_CALENDAR WITH (NOLOCK)
                WHERE calendar_date BETWEEN ? AND ?
                ORDER BY calendar_date ASC
            ");
            $stmt->execute([$start, $end]);
            mpJsonSuccess($stmt->fetchAll(PDO::FETCH_ASSOC));

        case 'save':
            requireMpAccess(true);
            $date = parseMpDate($input['date'] ?? ($input['calendar_date'] ?? null), null, 'วันที่');
            if (!$date) {
                throw new InvalidArgumentException('กรุณาระบุวันที่');
            }
            $dayType = strtoupper(trim((string)($input['day_type'] ?? 'HOLIDAY')));
            $allowedTypes = ['HOLIDAY', 'OFFDAY', 'SUNDAY', 'NORMAL'];
            if (!in_array($dayType, $allowedTypes, true)) {
                throw new InvalidArgumentException('ประเภทวันหยุดไม่ถูกต้อง');
            }
            $desc = substr(trim((string)($input['description'] ?? '')), 0, 200);
            $workRate = max(0.0, min(10.0, (float)($input['work_rate_holiday'] ?? ($input['work_rate'] ?? 1.0))));
            $otRate = max(0.0, min(10.0, (float)($input['ot_rate_holiday'] ?? ($input['ot_rate'] ?? 1.5))));

            $oldStmt = $pdo->prepare("SELECT TOP 1 CONVERT(VARCHAR(10), calendar_date, 120) AS calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday FROM dbo.MANPOWER_CALENDAR WHERE calendar_date = ?");
            $oldStmt->execute([$date]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC) ?: null;

            $pdo->beginTransaction();
            $stmt = $pdo->prepare('EXEC dbo.sp_SaveCalendarEvent @Date = ?, @Type = ?, @Desc = ?, @WorkRate = ?, @OtRate = ?, @User = ?');
            $stmt->execute([$date, $dayType, $desc, $workRate, $otRate, $updatedBy]);
            while ($stmt->nextRowset()) {
                // Consume result sets cleanly
            }
            writeLog($pdo, $oldRow ? 'UPDATE' : 'CREATE', 'MANPOWER_CALENDAR', $date, $oldRow, [
                'day_type' => $dayType,
                'description' => $desc,
                'work_rate_holiday' => $workRate,
                'ot_rate_holiday' => $otRate,
            ], "Saved calendar configuration for {$date}");
            $pdo->commit();
            mpJsonSuccess(null, 'บันทึกปฏิทินและตัวคูณค่าแรงเรียบร้อยแล้ว');

        case 'delete':
            requireMpAccess(true);
            $date = parseMpDate($input['date'] ?? ($input['calendar_date'] ?? null), null, 'วันที่');
            if (!$date) {
                throw new InvalidArgumentException('กรุณาระบุวันที่ที่ต้องการรีเซ็ต');
            }

            $oldStmt = $pdo->prepare("SELECT TOP 1 CONVERT(VARCHAR(10), calendar_date, 120) AS calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday FROM dbo.MANPOWER_CALENDAR WHERE calendar_date = ?");
            $oldStmt->execute([$date]);
            $oldRow = $oldStmt->fetch(PDO::FETCH_ASSOC);

            $pdo->beginTransaction();
            $isSunday = (int)date('w', strtotime($date)) === 0;
            $defaultType = $isSunday ? 'SUNDAY' : 'NORMAL';
            $defaultDesc = $isSunday ? 'Sunday' : 'Working Day';
            $defaultOt = $isSunday ? 3.0 : 1.5;

            $stmt = $pdo->prepare('EXEC dbo.sp_SaveCalendarEvent @Date = ?, @Type = ?, @Desc = ?, @WorkRate = ?, @OtRate = ?, @User = ?');
            $stmt->execute([$date, $defaultType, $defaultDesc, 1.0, $defaultOt, $updatedBy]);
            while ($stmt->nextRowset()) {
                // Consume result sets cleanly
            }
            writeLog($pdo, 'UPDATE', 'MANPOWER_CALENDAR', $date, $oldRow ?: null, ['day_type' => $defaultType, 'description' => $defaultDesc], "Reset calendar day {$date} to default");
            $pdo->commit();
            mpJsonSuccess(null, 'คืนค่าปฏิทินเป็นวันปกติเรียบร้อยแล้ว');

        default:
            throw new InvalidArgumentException('ไม่พบคำสั่งที่ระบุ');
    }
} catch (Throwable $e) {
    handleMpException($pdo, 'MANPOWER_HOLIDAY_API', $e, $input);
}
