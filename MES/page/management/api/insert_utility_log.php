<?php
// ไฟล์: MES/page/management/api/insert_utility_log.php
include_once("../../db.php");

header('Content-Type: application/json');

$headers = getallheaders();
$apiKey = isset($headers['X-API-KEY']) ? $headers['X-API-KEY'] : (isset($headers['X-Api-Key']) ? $headers['X-Api-Key'] : '');

if ($apiKey !== 'MESKey2026') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized API Key']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (!$input || !isset($input['data_batch'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON Payload or Missing Batch Data']);
    exit;
}

try {
    $meterName   = $input['meter_name'] ?? null;
    $utilityType = $input['utility_type'] ?? null;
    $dataBatch   = $input['data_batch']; // รับมาเป็น Array ของข้อมูลที่ดองไว้

    if (!$meterName || !$utilityType || !is_array($dataBatch)) {
        throw new Exception("Missing required master parameters");
    }

    // เตรียม Stored Procedure (ทำครั้งเดียว)
    $sql = "EXEC dbo.sp_InsertUtilityLog 
                @MeterName = :mName, @UtilityType = :uType, @LogTimestamp = :lTime, 
                @Voltage = :v, @CurrentAmp = :c, @PowerKw = :p, 
                @ReactivePower = :rp, @ApparentPower = :ap, @PowerFactor = :pf, 
                @Velocity = :vel, @FlowRate = :fr, @CumulativeValue = :cum";
    $stmt = $pdo->prepare($sql);

    $insertedCount = 0;

    // วนลูปแกะข้อมูลทีละ Record ในกล่องใหญ่
    foreach ($dataBatch as $data) {
        $logTimeStr  = $data['thai_time'] ?? date('Y-m-d H:i:s');
        $logTimeStr  = str_replace(['T', 'Z'], [' ', ''], $logTimeStr);

        $voltage     = isset($data['voltage']) ? floatval($data['voltage']) : null;
        $currentAmp  = isset($data['current']) ? floatval($data['current']) : null;
        $powerKw     = isset($data['power']) ? floatval($data['power']) : null;
        $reactive    = isset($data['reactive_power']) ? floatval($data['reactive_power']) : null;
        $apparent    = isset($data['apparent_power']) ? floatval($data['apparent_power']) : null;
        $pf          = isset($data['power_factor']) ? floatval($data['power_factor']) : null;
        $velocity    = isset($data['velocity']) ? floatval($data['velocity']) : null;
        $flowRate    = isset($data['flow']) ? floatval($data['flow']) : null;
        $cumulative  = isset($data['cumulative']) ? floatval($data['cumulative']) : 0;

        $stmt->execute([
            ':mName' => $meterName, ':uType' => $utilityType, ':lTime' => $logTimeStr,
            ':v' => $voltage, ':c' => $currentAmp, ':p' => $powerKw,
            ':rp' => $reactive, ':ap' => $apparent, ':pf' => $pf,
            ':vel' => $velocity, ':fr' => $flowRate, ':cum' => $cumulative
        ]);
        $insertedCount++;
    }

    echo json_encode(['success' => true, 'message' => "Inserted $insertedCount records for $meterName"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'DB Error: ' . $e->getMessage()]);
}
?>