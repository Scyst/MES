<?php
// page/pl_daily/pl_entry.php
require_once __DIR__ . '/../components/init.php';

// Check Permissions
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

// 1. ตั้งค่า Browser Tab Title
$pageTitle = "Daily P&L Entry";

// 2. 🔥 กำหนดตัวแปรสำหรับ Top Header (ส่วนที่ขาดไป)
$pageHeaderTitle = "Daily P&L Entry"; 
$pageHeaderSubtitle = "บันทึกรายรับ-รายจ่าย และดูภาพรวม Dashboard";
$pageIcon = "fas fa-hand-holding-usd"; 

// 3. Cache Busting
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
                                   value="<?php echo date('Y-m-01'); ?>" onchange="loadEntryData()"> </div>
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
                            <option value="Team 1">Team 1</option>
                            <option value="Team 2">Team 2</option>
                        </select>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <span id="saveStatus" class="me-2 small fw-bold text-muted d-flex align-items-center transition-fade" style="visibility: hidden;">
                        <i class="fas fa-check-circle text-success me-1"></i> Saved
                    </span>

                    <button id="btnSaveSnapshot" class="btn btn-success btn-sm rounded-pill px-3 shadow-sm fw-bold" 
                            onclick="saveDailySnapshot()" title="Save All Data (Freeze)">
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

                    <div id="dashboardGrid" class="row g-3">
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