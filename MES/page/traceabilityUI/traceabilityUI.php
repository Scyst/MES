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
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Lot Traceability Report</title>
    
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">Traceability Report</h2>
        </div>
        <div class="row mb-4 align-items-center sticky-bar py-3">
            <div class="col-md-6">
                <form id="traceabilityForm" class="d-flex gap-2">
                    <input list="lotList" id="lotNoInput" class="form-control form-control-lg" placeholder="Enter or select a Lot Number..." required>
                    <datalist id="lotList"></datalist>
                    <button type="submit" class="btn btn-primary btn-lg">Search</button>
                </form>
            </div>
        </div>

        <div id="reportContainer" class="d-none">
            <div id="summaryCard" class="card text-white bg-secondary mb-4"></div>

            <div class="row g-4">
                <div class="col-lg-6">
                    <h4 class="mb-3">Bill of Materials (BOM)</h4>
                    <div class="table-responsive">
                        <table class="table table-dark table-striped table-hover">
                            <thead>
                                <tr>
                                    <th>Component Part Number</th>
                                    <th>Quantity Required</th>
                                </tr>
                            </thead>
                            <tbody id="bomTableBody"></tbody>
                        </table>
                    </div>

                    <h4 class="mb-3 mt-4">WIP Entry History</h4>
                     <div class="table-responsive">
                        <table class="table table-dark table-striped table-hover table-sm">
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
                <div class="col-lg-6">
                    <h4 class="mb-3">Production History</h4>
                    <div class="table-responsive" style="max-height: 400px;">
                        <table class="table table-dark table-striped table-hover table-sm">
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
            </div>

            <h4 class="mb-3 mt-4">Relevant Downtime History</h4>
            <div class="table-responsive">
                <table class="table table-dark table-striped table-hover">
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
        
        <div id="initialMessage" class="text-center text-muted" style="margin-top: 10rem;">
            <h4>Please enter a Lot Number to start the report.</h4>
        </div>
    </div>
    
    <div id="toast"></div>
    <script src="../components/toast.js"></script>
    <script src="script/traceability.js"></script> 
</body>
</html>