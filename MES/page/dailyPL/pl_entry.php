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
                    
                    <div class="btn-group shadow-sm" role="group">
                        <input type="radio" class="btn-check" name="viewMode" id="modeDaily" autocomplete="off" checked onclick="switchMode('daily')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeDaily"><i class="fas fa-edit me-1"></i> Daily</label>

                        <input type="radio" class="btn-check" name="viewMode" id="modeReport" autocomplete="off" onclick="switchMode('report')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeReport"><i class="fas fa-chart-line me-1"></i> Report</label>
                    </div>

                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <div id="dailyPickerGroup" class="input-group input-group-sm shadow-sm" style="width: 170px;">
                        <span class="input-group-text bg-white border-end-0 text-primary"><i class="far fa-calendar-alt"></i></span>
                        <input type="date" id="targetDate" class="form-control border-start-0 fw-bold text-dark" 
                               value="<?php echo date('Y-m-d'); ?>" onchange="loadEntryData()">
                    </div>

                    <div id="rangePickerGroup" class="d-none align-items-center gap-2">
                        <div class="input-group input-group-sm shadow-sm" style="width: 160px;">
                            <span class="input-group-text bg-white border-end-0 text-success fw-bold">From</span>
                            <input type="date" id="startDate" class="form-control border-start-0 fw-bold" 
                                   value="<?php echo date('Y-m-01'); ?>" onchange="loadEntryData()">
                        </div>
                        <span class="text-muted"><i class="fas fa-arrow-right"></i></span>
                        <div class="input-group input-group-sm shadow-sm" style="width: 140px;">
                            <span class="input-group-text bg-white border-end-0 text-danger fw-bold">To</span>
                            <input type="date" id="endDate" class="form-control border-start-0 fw-bold" 
                                   value="<?php echo date('Y-m-d'); ?>" onchange="loadEntryData()">
                        </div>
                    </div>
                    
                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <div class="input-group input-group-sm shadow-sm" style="width: 200px;">
                        <span class="input-group-text bg-white border-end-0 text-secondary"><i class="fas fa-industry"></i></span>
                        <select id="sectionFilter" class="form-select border-start-0 fw-bold" onchange="loadEntryData()">
                            <option value="Team 1">🏭 Team 1 (Main)</option>
                            <option value="Team 2">🏭 Team 2 (Support)</option>
                        </select>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    
                    <span id="saveStatus" class="me-2 small fw-bold text-muted d-flex align-items-center transition-fade">
                        <i class="fas fa-check-circle text-success me-1"></i> All changes saved
                    </span>

                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="loadEntryData()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>

                    <div id="btnSetBudgetWrapper">
                        <button class="btn btn-outline-info btn-sm rounded-pill px-3 fw-bold" onclick="openTargetModal()">
                            <i class="fas fa-bullseye me-1"></i> Set Budget
                        </button>
                    </div>

                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="row g-3 mb-3">
                    <div class="col-md-3">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-body p-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div class="text-uppercase small fw-bold text-muted mb-1">Total Revenue</div>
                                    <h4 class="mb-0 fw-bold text-primary" id="cardRevenue">-</h4>
                                </div>
                                <div class="bg-primary bg-opacity-10 p-3 rounded-circle text-primary">
                                    <i class="fas fa-coins fa-lg"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>

                <div class="card-table"> 
                    <div class="table-responsive h-100 custom-scrollbar">
                        <table class="table table-hover table-custom mb-0 align-middle w-100">
                            <thead>
                                <tr>
                                    <th class="text-start ps-4" style="white-space: nowrap; width: 40%;">Account Item</th>
                                    
                                    <th class="text-center px-3" style="white-space: nowrap; width: 1%; min-width: 80px;">Code</th>

                                    <th style="width: auto;"></th> 

                                    <th class="text-end text-muted small text-uppercase" style="width: 120px;">Target</th>
                                    <th class="text-end" style="width: 150px;">Actual</th>
                                    <th class="text-center" style="width: 90px;">Diff</th>

                                    <th class="text-center px-3" style="width: 1%;">Ref.</th>
                                    <th class="text-end pe-4" style="width: 250px;">Remark</th>
                                </tr>
                            </thead>
                            <tbody id="entryTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>

            </div> 
        </div> 
    </div> 

    <?php include 'components/plEntryModal.php'; ?>
    <script src="../../utils/libs/fullcalendar.global.min.js"></script>
    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>