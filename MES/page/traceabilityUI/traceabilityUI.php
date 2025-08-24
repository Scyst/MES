<?php 
    //-- ตรวจสอบสิทธิ์การเข้าถึง --
    require_once __DIR__ . '/../../auth/check_auth.php'; 
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Lot Traceability Report</title>
    <?php include_once '../components/common_head.php'; ?>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Traceability Report</h2>
                </div>
                <div class="row mb-3 align-items-center sticky-bar py-3">
                    <div class="col-md-6">
                        <input id="lotNoInput" class="form-control form-control" placeholder="Start typing a Lot Number to search...">
                    </div>
                </div>

                <div id="searchResultsContainer" class="list-group mb-4" style="max-height: 250px; overflow-y: auto;"></div>

                <div id="reportContainer" class="d-none">
                    <div id="summaryCard" class="card text-white bg-secondary mb-4"></div>

                    <ul class="nav nav-tabs" id="traceTab" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="prod-history-tab" data-bs-toggle="tab" data-bs-target="#prod-history-pane" type="button" role="tab">Production History</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="bom-tab" data-bs-toggle="tab" data-bs-target="#bom-pane" type="button" role="tab">Bill of Materials (BOM)</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="wip-history-tab" data-bs-toggle="tab" data-bs-target="#wip-history-pane" type="button" role="tab">WIP Entry History</button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="downtime-tab" data-bs-toggle="tab" data-bs-target="#downtime-pane" type="button" role="tab">Relevant Downtime</button>
                        </li>
                    </ul>

                    <div class="tab-content pt-3" id="traceTabContent">
                        <div class="tab-pane fade show active" id="prod-history-pane" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table  table-striped table-hover table-sm">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Time</th>
                                            <th>Type</th>
                                            <th>Value</th>
                                            <th>Note</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productionHistoryTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="bom-pane" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table  table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Component Part Number</th>
                                            <th>Quantity Required</th>
                                        </tr>
                                    </thead>
                                    <tbody id="bomTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="wip-history-pane" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table  table-striped table-hover table-sm">
                                    <thead>
                                        <tr>
                                            <th>Entry Time</th>
                                            <th>Quantity In</th>
                                            <th>Operator</th>
                                            <th>Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody id="wipHistoryTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                        <div class="tab-pane fade" id="downtime-pane" role="tabpanel">
                            <div class="table-responsive">
                                <table class="table  table-striped table-hover">
                                    <thead>
                                        <tr>
                                            <th>Stop Begin</th>
                                            <th>Stop End</th>
                                            <th>Duration (m)</th>
                                            <th>Machine/Station</th>
                                            <th>Cause</th>
                                            <th>Recovered By</th>
                                        </tr>
                                    </thead>
                                    <tbody id="downtimeHistoryTableBody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    </div>
                
                <div id="initialMessage" class="text-center text-muted" style="margin-top: 10rem;">
                    <h4>Please enter a Lot Number to start the report.</h4>
                </div>
            </div>
            
            <div id="toast"></div>
            
            <?php
                include('../components/php/autoLogoutUI.php');
            ?>
            
            <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
            <script src="script/traceability.js?v=<?php echo filemtime('script/traceability.js'); ?>"></script>
         </main>
    </div>
</body>
</html>