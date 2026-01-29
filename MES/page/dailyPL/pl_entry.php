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
                    <button class="btn btn-outline-info btn-sm rounded-pill px-3" onclick="openTargetModal()">
                        <i class="fas fa-bullseye me-1"></i> Set Budget
                    </button>
                    
                    <div class="vr text-muted opacity-25 mx-1"></div>

                    <button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="loadEntryData()" title="Reload Data">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    <button class="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-bold" onclick="saveEntryData()" id="btnSave">
                        <i class="fas fa-save me-1"></i> Save Changes
                    </button>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="card-table"> 
                    <div class="table-responsive h-100 custom-scrollbar">
                        <table class="table table-hover table-custom mb-0 align-middle w-100">
                            <thead>
                                <tr>
                                    <th class="text-start ps-4" style="white-space: nowrap; width: 1%;">Account Item</th>
                                    <th class="text-center px-3" style="white-space: nowrap; width: 1%; min-width: 100px;">Code</th>

                                    <th style="width: auto;"></th> 

                                    <th class="text-end text-muted small text-uppercase" style="width: 100px;">Daily Target</th>
                                    
                                    <th class="text-end" style="width: 140px;">Actual</th>

                                    <th class="text-center" style="width: 70px;">Diff</th>

                                    <th class="text-center px-3" style="width: 1%;">Ref.</th>
                                    
                                    <th class="text-end pe-4" style="width: 200px;">Remark</th>
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
    <div class="modal fade" id="targetModal" tabindex="-1" data-bs-backdrop="static">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                
                <div class="modal-header bg-info-subtle text-info-emphasis border-bottom-0">
                    <div>
                        <h5 class="modal-title fw-bold"><i class="fas fa-bullseye me-2"></i>Set Monthly Budget</h5>
                        <p class="mb-0 small opacity-75">กำหนดงบประมาณรายเดือน (ระบบจะหารเป็นรายวันให้อัตโนมัติ)</p>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>

                <div class="modal-body bg-light p-0 d-flex flex-column overflow-hidden">
                    
                    <div class="p-3 bg-white border-bottom shadow-sm z-2 flex-shrink-0">
                        <div class="row g-2 align-items-center">
                            <div class="col-auto">
                                <label class="small fw-bold text-muted text-uppercase">Target Month:</label>
                            </div>
                            <div class="col-auto">
                                <input type="month" id="budgetMonth" class="form-control form-control-sm fw-bold border-info" 
                                       style="width: 160px;" value="<?php echo date('Y-m'); ?>">
                            </div>
                            <div class="col-auto ms-auto">
                                <span class="badge bg-warning text-dark shadow-sm" id="workingDaysBadge">
                                    <i class="far fa-calendar-check me-1"></i>Working Days: --
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex-grow-1 overflow-auto custom-scrollbar bg-white">
                        <table class="table table-sm table-hover mb-0" style="font-size: 0.9rem;">
                            <thead class="table-light border-bottom sticky-top" style="top: 0; z-index: 10;">
                                <tr>
                                    <th class="ps-4 py-2" style="width: 50%;">Account Item</th>
                                    <th class="text-end py-2" style="width: 150px;">Monthly Budget</th>
                                    <th class="text-end pe-4 py-2 text-muted" style="width: 120px;">~ Daily</th>
                                </tr>
                            </thead>
                            <tbody id="budgetTableBody">
                                </tbody>
                        </table>
                    </div>

                </div>

                <div class="modal-footer border-top bg-light">
                    <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-info text-white rounded-pill px-4 shadow-sm fw-bold" onclick="saveTarget()">
                        <i class="fas fa-save me-1"></i> Save Budget
                    </button>
                </div>

            </div>
        </div>
    </div>

    <script src="script/pl_entry.js?v=<?php echo $v; ?>"></script>
</body>
</html>