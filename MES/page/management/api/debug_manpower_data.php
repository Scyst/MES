<?php
// MES/utils/debug/debug_manpower_data.php
include_once("../../db.php");
include_once("../../../config/config.php");

header('Content-Type: text/html; charset=utf-8');

echo "<h1>🔍 Manpower Data Inspector</h1>";

try {
    // 1. ตรวจสอบการตั้งค่ากะ (Shifts)
    echo "<h3>1. Shift Configuration (ตาราง: ".MANPOWER_SHIFTS_TABLE.")</h3>";
    $stmt = $pdo->query("SELECT * FROM " . MANPOWER_SHIFTS_TABLE);
    $shifts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background: #eee;'><th>ID</th><th>Name</th><th>Start</th><th>End</th><th>Active</th></tr>";
    foreach ($shifts as $s) {
        echo "<tr>
                <td>{$s['shift_id']}</td>
                <td>{$s['shift_name']}</td>
                <td>{$s['start_time']}</td>
                <td>{$s['end_time']}</td>
                <td>{$s['is_active']}</td>
              </tr>";
    }
    echo "</table>";

    // 2. ตัวอย่างข้อมูลพนักงาน (Employees) - สุ่มมา 10 คน
    echo "<h3>2. Employee Samples (ตาราง: ".MANPOWER_EMPLOYEES_TABLE.")</h3>";
    $sqlEmp = "SELECT TOP 100 emp_id, name_th, position, line, default_shift_id FROM " . MANPOWER_EMPLOYEES_TABLE . " WHERE is_active = 1";
    $stmtEmp = $pdo->query($sqlEmp);
    
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background: #eee;'><th>ID</th><th>Name</th><th>Position (ใช้คำนวณเงิน)</th><th>Line</th><th>Shift ID</th></tr>";
    while ($row = $stmtEmp->fetch(PDO::FETCH_ASSOC)) {
        echo "<tr>
                <td>{$row['emp_id']}</td>
                <td>{$row['name_th']}</td>
                <td style='color: blue; font-weight: bold;'>{$row['position']}</td>
                <td>{$row['line']}</td>
                <td>{$row['default_shift_id']}</td>
              </tr>";
    }
    echo "</table>";

    // 3. ตัวอย่างการลงเวลา (Logs) - ของเมื่อวาน/วันนี้
    echo "<h3>3. Time Logs Sample (ตาราง: ".MANPOWER_DAILY_LOGS_TABLE.")</h3>";
    $checkDate = date('Y-m-d', strtotime('-1 day')); // ดูย้อนหลัง 1 วันเพื่อให้มั่นใจว่ามีข้อมูล
    $sqlLog = "
        SELECT TOP 100 l.log_date, l.emp_id, e.name_th, l.scan_in_time, l.scan_out_time, l.status 
        FROM " . MANPOWER_DAILY_LOGS_TABLE . " l
        JOIN " . MANPOWER_EMPLOYEES_TABLE . " e ON l.emp_id = e.emp_id
        WHERE l.log_date >= :date AND l.status IN ('PRESENT', 'LATE')
        ORDER BY l.scan_out_time DESC
    ";
    $stmtLog = $pdo->prepare($sqlLog);
    $stmtLog->execute([':date' => $checkDate]);
    
    echo "<table border='1' cellpadding='5' style='border-collapse: collapse; width: 100%;'>";
    echo "<tr style='background: #eee;'><th>Date</th><th>Emp</th><th>In (Scan)</th><th>Out (Scan)</th><th>Status</th></tr>";
    while ($row = $stmtLog->fetch(PDO::FETCH_ASSOC)) {
        // Highlight เวลาที่มีผลต่อ OT
        $inTime = $row['scan_in_time'] ? date('H:i:s', strtotime($row['scan_in_time'])) : '-';
        $outTime = $row['scan_out_time'] ? date('H:i:s', strtotime($row['scan_out_time'])) : '-';
        
        echo "<tr>
                <td>{$row['log_date']}</td>
                <td>{$row['name_th']}</td>
                <td>{$inTime}</td>
                <td>{$outTime}</td>
                <td>{$row['status']}</td>
              </tr>";
    }
    echo "</table>";

} catch (Exception $e) {
    echo "<h2 style='color: red;'>Error: " . $e->getMessage() . "</h2>";
}
?>