<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

// Check Permissions
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

// Config Header
$pageTitle = "Daily P&L Entry";
$pageHeaderTitle = "Daily P&L Entry";
$pageHeaderSubtitle = "บันทึกและตรวจสอบค่าใช้จ่ายรายวัน";

// Cache Busting
$v = filemtime(__DIR__ . '/script/pl_entry.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="css/pl_entry.css?v=<?php echo $v; ?>">
</head>
<body class="layout-top-header">
    
    <div class="page-container">
        
        <?php include_once '../components/php/top_header.php'; ?>

        <div id="main-content">
            
            <div class="toolbar-container shadow-sm z-2">
                <div class="d-flex align-items-center gap-3">
                    <div class="d-flex align-items-center bg-light rounded px-2 py-1 border">
                        <i class="far fa-calendar-alt text-secondary me-2"></i>
                        <input type="date" id="targetDate" class="form-control form-control-sm border-0 bg-transparent p-0 fw-bold text-dark" style="width: 130px; cursor: pointer;">
                    </div>
                    
                    <div class="vr mx-1"></div>

                    <div class="d-flex align-items-center bg-light rounded px-2 py-1 border">
                        <i class="fas fa-industry text-secondary me-2"></i>
                        <select id="sectionFilter" class="form-select form-select-sm border-0 bg-transparent p-0 fw-bold text-dark" style="width: 150px; box-shadow: none; cursor: pointer;">
                            <option value="Team 1">Team 1</option>
                            <option value="Team 2">Team 2</option>
                        </select>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="loadEntryData()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="row g-3 mb-3"> <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-success">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-success">Total Revenue</div>
                                    <div class="metric-value text-dark" id="estRevenue">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-success">Auto</span>
                                </div>
                            </div>
                            <i class="fas fa-coins metric-icon-bg text-success"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-warning">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-warning">Total Cost & Exp.</div>
                                    <div class="metric-value text-dark" id="estCost">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-warning">Mixed</span>
                                </div>
                            </div>
                            <i class="fas fa-wallet metric-icon-bg text-warning"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-primary">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <div class="metric-label text-primary">Est. Net Profit</div>
                                    <div class="metric-value text-primary" id="estGP">0.00</div>
                                </div>
                                <div class="text-end">
                                    <span class="badge badge-soft-primary">Live</span>
                                </div>
                            </div>
                            <i class="fas fa-chart-pie metric-icon-bg text-primary"></i>
                        </div>
                    </div>
                </div>

                <div class="card-table flex-grow-1 overflow-hidden"> 
                    <div class="overflow-auto custom-scrollbar h-100">
                        <table class="table table-custom table-hover w-100 mb-0">
                            <thead>
                                <tr>
                                    <th style="width: 80px;" class="text-center">Code</th>
                                    <th style="width: 40%;">Account Item</th>
                                    <th style="width: 100px;" class="text-center">Type</th>
                                    <th style="width: 120px;" class="text-center">Source</th>
                                    <th class="text-end pe-4">Amount (THB)</th>
                                </tr>
                            </thead>
                            <tbody id="entryTableBody">
                                <tr>
                                    <td colspan="5" class="text-center align-middle" style="height: 200px;">
                                        <div class="spinner-border text-primary mb-2" role="status"></div>
                                        <div class="text-muted small">Loading Data...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div> </div> </div> <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>