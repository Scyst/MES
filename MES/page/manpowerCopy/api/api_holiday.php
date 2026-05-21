<?php
// page/manpower/api/api_holiday.php
header('Content-Type: application/json');
require_once __DIR__ . '/../../db.php';
require_once __DIR__ . '/../../../auth/check_auth.php';
require_once __DIR__ . '/../../../config/config.php';

if (!isset($_SESSION['user']) || !hasPermission('manage_manpower')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Permission Denied: You do not have permission to manage holiday settings.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? 'read');

try {
    switch ($action) {
        case 'read':
            $startRaw = $_GET['start'] ?? date('Y-m-01');
            $endRaw   = $_GET['end']   ?? date('Y-m-t');
            
            $start = date('Y-m-d', strtotime($startRaw));
            $end   = date('Y-m-d', strtotime($endRaw));

            $sql = "SELECT 
                        calendar_date, 
                        day_type, 
                        description, 
                        work_rate_holiday, 
                        ot_rate_holiday 
                    FROM dbo.MANPOWER_CALENDAR 
                    WHERE calendar_date BETWEEN ? AND ?";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $events = [];
            foreach ($rows as $row) {
                $color = ($row['day_type'] === 'HOLIDAY') ? '#e74a3b' : '#f6c23e';
                if (stripos($row['description'], 'Sunday') !== false) $color = '#858796';

                $events[] = [
                    'id'    => $row['calendar_date'],
                    'title' => $row['description'],
                    'start' => $row['calendar_date'],
                    'allDay'=> true,
                    'backgroundColor' => $color,
                    'borderColor' => $color,
                    'extendedProps' => [
                        'day_type' => $row['day_type'],
                        'work_rate' => $row['work_rate_holiday'],
                        'ot_rate' => $row['ot_rate_holiday']
                    ]
                ];
            }

            echo json_encode([
                'success' => true, 
                'data' => $events,
                'message' => 'Fetched holiday calendar successfully'
            ]);
            break;

        case 'save':
            $date = $input['date'];
            $desc = $input['description'];
            $type = $input['day_type'] ?? 'HOLIDAY';
            $workRate = $input['work_rate'] ?? 2.0;
            $otRate = $input['ot_rate'] ?? 3.0;

            if (!$date || !$desc) throw new Exception("Missing required fields");

            $sql = "MERGE INTO dbo.MANPOWER_CALENDAR AS Target
                    USING (SELECT ? AS d) AS Source
                    ON (Target.calendar_date = Source.d)
                    WHEN MATCHED THEN
                        UPDATE SET 
                            day_type = ?, 
                            description = ?, 
                            work_rate_holiday = ?, 
                            ot_rate_holiday = ?
                    WHEN NOT MATCHED THEN
                        INSERT (calendar_date, day_type, description, work_rate_holiday, ot_rate_holiday)
                        VALUES (?, ?, ?, ?, ?);";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                $date, 
                $type, $desc, $workRate, $otRate,
                $date, $type, $desc, $workRate, $otRate
            ]);

            echo json_encode(['success' => true]);
            break;

        case 'delete':
            $date = $input['date'];
            if (!$date) throw new Exception("Date required");

            $stmt = $pdo->prepare("DELETE FROM dbo.MANPOWER_CALENDAR WHERE calendar_date = ?");
            $stmt->execute([$date]);

            echo json_encode(['success' => true]);
            break;

        default:
            throw new Exception("Invalid Action");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>