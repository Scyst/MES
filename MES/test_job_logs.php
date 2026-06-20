<?php
$host = '127.0.0.1';
$db   = 'scyst_mes';
$user = 'sa';
$pass = 'Aa123456789!';

$dsn = "sqlsrv:Server=$host;Database=$db;TrustServerCertificate=true";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];
try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}

function test_job($job_no) {
    global $pdo;
    $jobStmt = $pdo->prepare("SELECT lot_no, ISNULL(start_time, created_at) as baseline_time, ISNULL(end_time, '2099-12-31 23:59:59') as end_time, item_id FROM PRODUCTION_JOBS WHERE job_no = ?");
    $jobStmt->execute([$job_no]);
    $jobData = $jobStmt->fetch(PDO::FETCH_ASSOC);
    $lot_no = $jobData ? $jobData['lot_no'] : null;
    $baseline_time = ($jobData && $jobData['baseline_time']) ? $jobData['baseline_time'] : '2000-01-01 00:00:00';
    $end_time = ($jobData && $jobData['end_time']) ? $jobData['end_time'] : '2099-12-31 23:59:59';
    $item_id = $jobData ? $jobData['item_id'] : null;

    $sql = "SELECT t.transaction_id as txn_id, t.notes, t.parameter_id
            FROM STOCK_TRANSACTIONS t
            WHERE t.transaction_type LIKE 'PRODUCTION_%' 
            AND (
                    t.reference_id = ? 
                    OR (t.reference_id = ? AND (CHARINDEX(?, t.notes) > 0 OR (CHARINDEX('[Job:', t.notes) = 0 AND t.transaction_timestamp >= CAST(? AS DATETIME) AND t.transaction_timestamp <= CAST(? AS DATETIME) AND t.parameter_id = ?)))
            )
            ORDER BY t.transaction_timestamp DESC, t.transaction_id DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$job_no, $lot_no ?: $job_no, "[Job: $job_no]", $baseline_time, $end_time, $item_id]);
    
    echo "$job_no ($lot_no) - Item: $item_id\n";
    echo "Time: $baseline_time to $end_time\n";
    print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
    echo "--------------------------\n";
}

test_job('JOB-2606-0018');
test_job('JOB-2606-0021');
test_job('JOB-2606-0022');
test_job('JOB-2606-0040');
