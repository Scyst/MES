<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../db.php';

try {
    // 1. Get Top-Level KPIs
    $kpiSql = "
        SELECT 
            COUNT(*) as totalDeals,
            SUM(ISNULL(value, 0)) as totalValue,
            SUM(CASE WHEN status != 'post-sale' THEN 1 ELSE 0 END) as activeDeals,
            SUM(CASE WHEN status = 'post-sale' THEN 1 ELSE 0 END) as wonDeals
        FROM CRM_DEALS
    ";
    $kpiStmt = $pdo->query($kpiSql);
    $kpis = $kpiStmt->fetch(PDO::FETCH_ASSOC);

    // 2. Get Pipeline Stats (Group by status)
    // Map internal status names to Display Names for charts
    $stageNames = [
        'leads' => 'Leads',
        'viewing' => 'Viewing',
        'negotiation' => 'Negotiation',
        'transfer' => 'Transfer',
        'post-sale' => 'Post-Sale'
    ];

    $pipelineSql = "
        SELECT 
            status as stage,
            COUNT(*) as count,
            SUM(ISNULL(value, 0)) as value
        FROM CRM_DEALS
        GROUP BY status
    ";
    $pipelineStmt = $pdo->query($pipelineSql);
    $pipelineRaw = $pipelineStmt->fetchAll(PDO::FETCH_ASSOC);

    // Ensure all stages are represented even if 0
    $pipelineData = [];
    foreach ($stageNames as $key => $name) {
        $pipelineData[$key] = [
            'name' => $name,
            'count' => 0,
            'value' => 0
        ];
    }
    
    foreach ($pipelineRaw as $row) {
        $stage = $row['stage'];
        if (isset($pipelineData[$stage])) {
            $pipelineData[$stage]['count'] = (int)$row['count'];
            $pipelineData[$stage]['value'] = (float)$row['value'];
        }
    }

    // Convert to indexed array for Recharts
    $pipelineArray = array_values($pipelineData);

    // 3. Get Recent 5 Deals
    $recentSql = "
        SELECT TOP 5 d.id, d.title, c.name as clientName, d.status as stage, d.value, d.updatedAt 
        FROM CRM_DEALS d
        LEFT JOIN CRM_CLIENTS c ON d.clientId = c.id
        ORDER BY d.updatedAt DESC
    ";
    $recentStmt = $pdo->query($recentSql);
    $recentDeals = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'status' => 'success',
        'data' => [
            'kpis' => [
                'totalDeals' => (int)$kpis['totalDeals'],
                'totalValue' => (float)$kpis['totalValue'],
                'activeDeals' => (int)$kpis['activeDeals'],
                'wonDeals' => (int)$kpis['wonDeals']
            ],
            'pipeline' => $pipelineArray,
            'recentDeals' => $recentDeals
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
