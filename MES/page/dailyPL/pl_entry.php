<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

// Check Permissions
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "Daily P&L Entry";
$v = filemtime(__DIR__ . '/script/pl_entry.js'); // Cache busting
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link rel="stylesheet" href="css/pl_entry.css?v=<?php echo $v; ?>">
</head>
<body class="layout-top-header bg-light">
    
    <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>

        <div id="main-content">
            
            <div class="toolbar-container shadow-sm z-2">
                <div class="d-flex align-items-center gap-3">
                    
                    <div class="input-group input-group-sm shadow-sm" style="width: 170px;">
                        <span class="input-group-text bg-white border-end-0 text-primary"><i class="far fa-calendar-alt"></i></span>
                        <input type="date" id="targetDate" class="form-control border-start-0 fw-bold text-dark" 
                               value="<?php echo date('Y-m-d'); ?>" onchange="loadEntryData()">
                    </div>
                    
                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <div class="input-group input-group-sm shadow-sm" style="width: 200px;">
                        <span class="input-group-text bg-white border-end-0 text-secondary"><i class="fas fa-industry"></i></span>
                        <select id="sectionFilter" class="form-select border-start-0 fw-bold" onchange="loadEntryData()">
                            <option value="Team 1">🏭 Team 1 (Main)</option>
                            <option value="Team 2">🏭 Team 2 (Support)</option>
                        </select>
                    </div>

                    <span id="saveStatus" class="ms-2 small fw-bold text-muted transition-fade opacity-0">
                        <i class="fas fa-check-circle text-success me-1"></i>Saved
                    </span>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="loadEntryData()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    <button class="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-bold" onclick="saveEntryData()" id="btnSave">
                        <i class="fas fa-save me-1"></i> Save Changes
                    </button>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="row g-3 mb-2 flex-shrink-0"> 
                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-success">
                            <div class="d-flex justify-content-between align-items-start z-1 position-relative">
                                <div>
                                    <div class="metric-label text-success">Total Revenue</div>
                                    <div class="metric-value text-dark" id="estRevenue">0.00</div>
                                </div>
                                <span class="badge badge-soft-success rounded-pill px-2">Auto</span>
                            </div>
                            <i class="fas fa-coins metric-icon-bg text-success"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-warning">
                            <div class="d-flex justify-content-between align-items-start z-1 position-relative">
                                <div>
                                    <div class="metric-label text-warning">Total Cost & Exp.</div>
                                    <div class="metric-value text-dark" id="estCost">0.00</div>
                                </div>
                                <span class="badge badge-soft-warning rounded-pill px-2">Mixed</span>
                            </div>
                            <i class="fas fa-wallet metric-icon-bg text-warning"></i>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="metric-card border-start border-4 border-primary">
                            <div class="d-flex justify-content-between align-items-start z-1 position-relative">
                                <div>
                                    <div class="metric-label text-primary">Est. Net Profit</div>
                                    <div class="metric-value text-primary" id="estGP">0.00</div>
                                </div>
                                <span class="badge badge-soft-primary rounded-pill px-2">Live</span>
                            </div>
                            <i class="fas fa-chart-pie metric-icon-bg text-primary"></i>
                        </div>
                    </div>
                </div>

                <div class="card-table"> 
                    <div class="table-responsive h-100 custom-scrollbar">
                        <table class="table table-hover table-custom mb-0 align-middle w-100">
                            <thead>
                                <tr>
                                    <th class="text-start ps-4" style="white-space: nowrap; width: 1%;">Account Item</th>
                                    
                                    <th class="text-center px-3" style="white-space: nowrap; width: 1%; min-width: 130px;">Code</th>

                                    <th style="width: auto;"></th> 
                                    
                                    <th class="text-end" style="width: 150px;">Amount (THB)</th>

                                    <th class="text-center px-3" style="white-space: nowrap; width: 1%;">Ref.</th>
                                    
                                    <th class="text-end pe-4" style="width: 250px;">Remark</th>
                                </tr>
                            </thead>
                            <tbody id="entryTableBody">
                                <tr>
                                    <td colspan="6" class="text-center py-5">
                                        <div class="spinner-border text-primary mb-2" role="status"></div>
                                        <div class="text-muted small">Loading P&L Data...</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>