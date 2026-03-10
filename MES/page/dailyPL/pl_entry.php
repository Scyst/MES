<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

if (!hasPermission('view_pl') && !hasPermission('manage_pl')) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "Daily P&L Entry";
$pageHeaderTitle = "Daily P&L Entry"; 
$pageHeaderSubtitle = "บันทึกรายรับ-รายจ่าย และดูภาพรวม Dashboard";
$pageIcon = "fas fa-hand-holding-usd"; 

$v = filemtime(__DIR__ . '/script/pl_entry.js'); 
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
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
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeDaily">
                            <i class="fas fa-edit me-1"></i> Entry
                        </label>

                        <input type="radio" class="btn-check" name="viewMode" id="modeReport" autocomplete="off" onclick="switchMode('report')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeReport">
                            <i class="fas fa-file-alt me-1"></i> Report
                        </label>

                        <input type="radio" class="btn-check" name="viewMode" id="modeDashboard" autocomplete="off" onclick="switchMode('dashboard')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeDashboard">
                            <i class="fas fa-chart-pie me-1"></i> Dashboard
                        </label>

                        <input type="radio" class="btn-check" name="viewMode" id="modeStatement" autocomplete="off" onclick="switchMode('statement')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeStatement">
                            <i class="fas fa-table me-1"></i> Statement
                        </label>

                        <input type="radio" class="btn-check" name="viewMode" id="modeExecutive" autocomplete="off" onclick="switchMode('executive')">
                        <label class="btn btn-sm btn-outline-primary fw-bold px-3" for="modeExecutive" title="Executive Summary">
                            <i class="fas fa-crown me-1"></i> Executive View
                        </label>
                    </div>

                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <div id="dailyPickerGroup" class="input-group input-group-sm shadow-sm picker-group" style="width: 170px;">
                        <span class="input-group-text bg-white border-end-0 text-primary"><i class="far fa-calendar-alt"></i></span>
                        <input type="date" id="targetDate" class="form-control border-start-0 fw-bold text-dark" 
                               value="<?php echo date('Y-m-d'); ?>" onchange="loadEntryData()">
                    </div>

                    <div id="rangePickerGroup" class="d-none align-items-center gap-2 picker-group">
                        <div class="input-group input-group-sm shadow-sm" style="width: 150px;">
                            <span class="input-group-text bg-white border-end-0 text-success fw-bold">From</span>
                            <input type="date" id="startDate" class="form-control border-start-0 fw-bold" 
                                   value="<?php echo date('Y-m-01'); ?>" onchange="loadEntryData()"> 
                        </div>
                        <span class="text-muted"><i class="fas fa-arrow-right"></i></span>
                        <div class="input-group input-group-sm shadow-sm" style="width: 130px;">
                            <span class="input-group-text bg-white border-end-0 text-danger fw-bold">To</span>
                            <input type="date" id="endDate" class="form-control border-start-0 fw-bold" 
                                   value="<?php echo date('Y-m-d'); ?>" onchange="loadEntryData()">
                        </div>
                    </div>
                    
                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <div class="input-group input-group-sm shadow-sm" style="width: 200px;">
                        <span class="input-group-text bg-white border-end-0 text-secondary"><i class="fas fa-industry"></i></span>
                        <select id="sectionFilter" class="form-select border-start-0 fw-bold" onchange="handleSectionChange()">
                            </select>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <span id="saveStatus" class="me-2 small fw-bold text-muted d-flex align-items-center transition-fade" style="visibility: hidden;">
                        <i class="fas fa-check-circle text-success me-1"></i> Saved
                    </span>

                    <button id="btnSaveSnapshot" class="btn btn-success btn-sm rounded-pill px-3 shadow-sm fw-bold" onclick="saveDailySnapshot()" title="Save All Data (Freeze)">
                        <i class="fas fa-save me-1"></i> Save Day
                    </button>

                    <button class="btn btn-outline-success btn-sm rounded-pill px-3" onclick="exportPLToExcel()" title="Download Excel">
                        <i class="fas fa-file-excel me-1"></i> Export
                    </button>
                    <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="refreshCurrentView()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    <div id="btnSetBudgetWrapper">
                        <button class="btn btn-outline-info btn-sm rounded-pill px-3 fw-bold" onclick="openTargetModal()">
                            <i class="fas fa-bullseye me-1"></i> Budget
                        </button>
                    </div>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div id="view-table" class="view-section active">
                    <div class="row g-3 mb-3">
                        <div class="col-6 col-md-3">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-primary">
                                <div class="card-body p-3">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <div class="text-uppercase small fw-bold text-muted">Total Revenue</div>
                                        <i class="fas fa-coins text-primary opacity-50"></i>
                                    </div>
                                    <h4 class="mb-0 fw-bold text-primary" id="cardRevenue">-</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-danger">
                                <div class="card-body p-3">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <div class="text-uppercase small fw-bold text-muted">Total Expense</div>
                                        <i class="fas fa-hand-holding-usd text-danger opacity-50"></i>
                                    </div>
                                    <h4 class="mb-0 fw-bold text-danger" id="cardExpense">-</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-success">
                                <div class="card-body p-3">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <div class="text-uppercase small fw-bold text-muted">Net Profit</div>
                                        <i class="fas fa-chart-line text-success opacity-50"></i>
                                    </div>
                                    <h4 class="mb-0 fw-bold text-success" id="cardProfit">-</h4>
                                </div>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card border-0 shadow-sm h-100 border-start border-4 border-info">
                                <div class="card-body p-3">
                                    <div class="d-flex align-items-center justify-content-between mb-1">
                                        <div class="text-uppercase small fw-bold text-muted">Net Margin</div>
                                        <i class="fas fa-percent text-info opacity-50"></i>
                                    </div>
                                    <h4 class="mb-0 fw-bold text-info" id="cardProfitMargin">-</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="card-table"> 
                        <div class="table-responsive h-100 custom-scrollbar">
                            <table class="table table-hover table-custom mb-0 align-middle w-100">
                                <thead>
                                    <tr>
                                        <th class="text-start ps-4" style="width: 40%;">Account Item</th>
                                        <th class="text-center px-3" style="width: 1%;">Code</th>
                                        <th style="width: auto;"></th> 
                                        <th class="text-end text-muted small text-uppercase" style="width: 120px;">Target</th>
                                        <th class="text-end" style="width: 150px;">Actual</th>
                                        <th class="text-center" style="width: 90px;">Diff</th>
                                        <th class="text-center px-3" style="width: 1%;">Ref.</th>
                                        <th class="text-end pe-4" style="width: 250px;">Remark</th>
                                    </tr>
                                </thead>
                                <tbody id="entryTableBody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="view-dashboard" class="view-section">
                    <div class="row g-3 mb-4">
                        <div class="col-md-8">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header bg-white border-0 fw-bold text-secondary">
                                    <i class="fas fa-chart-bar text-primary me-2"></i> Performance Summary (MTD)
                                </div>
                                <div class="card-body">
                                    <div style="height: 250px; position: relative;">
                                        <canvas id="chartPerformance"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card border-0 shadow-sm h-100">
                                <div class="card-header bg-white border-0 fw-bold text-secondary">
                                    <i class="fas fa-chart-pie text-warning me-2"></i> Cost Breakdown
                                </div>
                                <div class="card-body d-flex justify-content-center align-items-center">
                                    <div style="height: 250px; width: 100%; position: relative;">
                                        <canvas id="chartStructure"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="dashboardGrid" class="row g-3"></div>
                </div>

                <div id="view-statement" class="view-section h-100 flex-column">
                    <div class="card border-0 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
                        
                        <div class="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <div class="d-flex align-items-center gap-3">
                                <h5 class="card-title mb-0 fw-bold text-primary">
                                    <i class="fas fa-file-invoice-dollar me-2"></i> P&L Statement
                                </h5>
                                <div class="btn-group btn-group-sm shadow-sm" role="group">
                                    <input type="radio" class="btn-check" name="stmtView" id="stmtYearly" autocomplete="off" checked onchange="changeStatementView('yearly')">
                                    <label class="btn btn-outline-secondary fw-bold px-3" for="stmtYearly">Yearly View</label>

                                    <input type="radio" class="btn-check" name="stmtView" id="stmtDaily" autocomplete="off" onchange="changeStatementView('daily')">
                                    <label class="btn btn-outline-secondary fw-bold px-3" for="stmtDaily">Daily View</label>
                                </div>
                            </div>

                            <div class="d-flex gap-2 align-items-center">
                                <label class="fw-bold small text-muted mb-0">Period:</label>
                                
                                <input type="number" id="statementYear" class="form-control form-control-sm text-center fw-bold text-primary shadow-sm" 
                                       style="width: 100px;" value="<?php echo date('Y'); ?>" onchange="loadStatementData()">
                                
                                <input type="month" id="statementMonth" class="form-control form-control-sm text-center fw-bold text-info shadow-sm d-none" 
                                       style="width: 150px;" value="<?php echo date('Y-m'); ?>" onchange="loadStatementData()">
                                
                                <button class="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-bold" onclick="exportStatementExcel()">
                                    <i class="fas fa-file-excel me-1"></i> Export
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive flex-grow-1 custom-scrollbar position-relative" id="statementTableWrapper" style="background-color: #f8f9fa;">
                            <table class="table table-hover table-bordered table-sm mb-0 align-middle statement-table" style="font-size: 0.75rem; width: max-content; min-width: 100%;">
                                <thead class="bg-light sticky-top text-center shadow-sm" style="z-index: 10;" id="statementThead">
                                    </thead>
                                <tbody id="statementTableBody" class="bg-white">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div id="view-executive" class="view-section h-100 flex-column" style="display: none;">
                    <div class="card border-0 shadow-sm flex-grow-1 overflow-hidden d-flex flex-column">
                        
                        <div class="card-header bg-dark text-white border-bottom py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <div class="d-flex align-items-center gap-3">
                                <h5 class="card-title mb-0 fw-bold">
                                    <i class="fas fa-chess-king me-2 text-warning"></i> Executive P&L Summary
                                </h5>
                                <div class="btn-group btn-group-sm shadow-sm" role="group">
                                    <input type="radio" class="btn-check" name="execViewToggle" id="execYearly" autocomplete="off" checked onchange="changeExecView('yearly')">
                                    <label class="btn btn-outline-light fw-bold px-3" for="execYearly">Yearly View</label>

                                    <input type="radio" class="btn-check" name="execViewToggle" id="execDaily" autocomplete="off" onchange="changeExecView('daily')">
                                    <label class="btn btn-outline-light fw-bold px-3" for="execDaily">Daily View</label>
                                </div>
                            </div>

                            <div class="d-flex gap-2 align-items-center">
                                <label class="fw-bold small text-light mb-0">Period:</label>
                                
                                <input type="number" id="execYear" class="form-control form-control-sm text-center fw-bold text-dark shadow-sm" 
                                       style="width: 100px;" value="<?php echo date('Y'); ?>" onchange="loadExecutiveData()">
                                
                                <input type="month" id="execMonth" class="form-control form-control-sm text-center fw-bold text-info shadow-sm d-none" 
                                       style="width: 150px;" value="<?php echo date('Y-m'); ?>" onchange="loadExecutiveData()">
                                
                                <button class="btn btn-sm btn-success rounded-pill px-3 shadow-sm fw-bold" onclick="exportExecutiveExcel()">
                                    <i class="fas fa-file-excel me-1"></i> Export
                                </button>
                            </div>
                        </div>

                        <div class="table-responsive flex-grow-1 custom-scrollbar position-relative" id="execTableWrapper" style="background-color: #fff;">
                            <table class="table table-hover table-bordered table-sm mb-0 align-middle statement-table" style="font-size: 0.85rem; width: max-content; min-width: 100%;">
                                <thead class="bg-light sticky-top text-center shadow-sm" style="z-index: 10;" id="execThead">
                                    </thead>
                                <tbody id="execTableBody" class="bg-white">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div> 
        </div> 
    </div> 

    <?php include 'components/plEntryModal.php'; ?>
    
    <script src="../../utils/libs/fullcalendar.global.min.js"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script> 
    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>