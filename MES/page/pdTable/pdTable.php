<?php 
    include_once("../../auth/check_auth.php"); 
    
    if (!hasRole(['supervisor', 'admin', 'creator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['supervisor', 'admin', 'creator']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>Production & WIP</title>
    <script src="../../utils/libs/jspdf.umd.min.js"></script>
    <script src="../../utils/libs/jspdf.plugin.autotable.js"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="mb-0">Production & WIP Management</h2>
        </div>
        
        <ul class="nav nav-tabs" id="mainTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="entry-history-tab" data-bs-toggle="tab" data-bs-target="#entry-history-pane" type="button" role="tab">Entry History</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="production-history-tab" data-bs-toggle="tab" data-bs-target="#production-history-pane" type="button" role="tab">Production History (OUT)</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="wip-report-tab" data-bs-toggle="tab" data-bs-target="#wip-report-pane" type="button" role="tab">WIP Report</button>
            </li>
        </ul>

        <div class="row my-3 align-items-center sticky-bar py-3">
             <div class="col-md-12">
                <div class="filter-controls-wrapper" id="main-filters">
                    <input list="partNoList" id="filterPartNo" class="form-control" placeholder="Part No.">
                    <datalist id="partNoList"></datalist>

                    <input list="lotList" id="filterLotNo" class="form-control" placeholder="Lot No.">
                    <datalist id="lotList"></datalist>

                    <input list="lineList" id="filterLine" class="form-control" placeholder="Line">
                    <datalist id="lineList"></datalist>

                    <input list="modelList" id="filterModel" class="form-control" placeholder="Model">
                    <datalist id="modelList"></datalist>
                    <select id="filterCountType" class="form-select">
                        <option value="">All Types</option>
                        <option value="FG">FG</option><option value="NG">NG</option><option value="HOLD">HOLD</option>
                        <option value="REWORK">REWORK</option><option value="SCRAP">SCRAP</option><option value="ETC.">ETC.</option>
                    </select>

                    <input type="date" id="filterStartDate" class="form-control">
                    <span>-</span>
                    <input type="date" id="filterEndDate" class="form-control">
                    <!--<button class="btn btn-primary" id="filterButton">Search</button>-->
                </div>
            </div>
        </div>

        <div class="tab-content" id="mainTabContent">
            
            <div class="tab-pane fade" id="entry-history-pane" role="tabpanel">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h4 class="mb-0">ประวัติการนำเข้า (Entry History)</h4>
                    <?php if ($canManage): ?>
                        <button class="btn btn-success" onclick="openAddEntryModal(this)">Add Entry</button>
                    <?php endif; ?>
                </div>
                <div class="table-responsive">
                    <table class="table table-dark table-hover table-sm">
                         <thead>
                            <tr>
                                <th>เวลาเข้า</th>
                                <th>ไลน์</th>
                                <th>Lot No.</th>
                                <th>Part No.</th>
                                <th>จำนวนเข้า</th>
                                <!--<th>ผู้บันทึก</th>-->
                                <th>หมายเหตุ</th>
                                <?php if ($canManage): ?>
                                    <th style="width: 150px; text-align: center;">Actions</th>
                                <?php endif; ?>
                            </tr>
                        </thead>
                        <tbody id="wipHistoryTableBody"></tbody>
                    </table>
                </div>
            </div>

            <div class="tab-pane fade show active" id="production-history-pane" role="tabpanel">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div id="grandSummary" class="summary-grand-total"></div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-info" onclick="openSummaryModal(this)">View Detailed Summary</button>
                        <button class="btn btn-primary flex-fill" onclick="exportToExcel()">Export</button>
                        <?php if ($canManage): ?>
                            <button class="btn btn-success flex-fill" onclick="openAddPartModal(this)">Add Entry (IN/OUT)</button>
                        <?php endif; ?>
                    </div>
                </div>
                <div class="table-responsive">
                    <table id="partTable" class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Line</th>
                                <th>Model</th>
                                <th>Part No.</th>
                                <th>Lot No.</th>
                                <th>Qty</th>
                                <th>Type</th>
                                <th style="min-width: 200px;">Note</th>
                                <?php if ($canManage): ?>
                                    <th style="width: 150px; text-align: center;">Actions</th>
                                <?php endif; ?>
                            </tr>
                        </thead>
                        <tbody id="partTableBody"></tbody>
                    </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="paginationControls"></ul></nav>
            </div>

            <div class="tab-pane fade" id="wip-report-pane" role="tabpanel">
                <h4 class="mb-3">ตารางสรุปผลต่าง (WIP Variance Summary)</h4>
                <div class="table-responsive mb-4">
                    <table class="table table-dark table-striped">
                        <thead>
                            <tr>
                                <th>Part Number</th>
                                <th>Line</th>
                                <th>ยอดนำเข้ารวม (Total In)</th>
                                <th>ยอดผลิตเสร็จ (Total Out)</th>
                                <th>คงค้าง/ส่วนต่าง (WIP/Variance)</th>
                            </tr>
                        </thead>
                        <tbody id="wipReportTableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <div id="toast"></div>

    <?php include('components/summaryModal.php'); ?>
    <?php 
        if ($canManage) {
            include('components/addPartModal.php'); 
            include('components/editPartModal.php');
            include('components/addEntryModal.php');
            include('components/editEntryModal.php');
        }
    ?>
    
    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        
        document.addEventListener('DOMContentLoaded', () => {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            document.getElementById("filterStartDate").value = dateStr;
            document.getElementById("filterEndDate").value = dateStr;
        });
    </script>
    
    <script src="../components/auto_logout.js"></script>
    <script src="../components/datetime.js"></script>
    <script src="../components/toast.js"></script>
    <script src="script/paginationTable.js"></script>
    <script src="script/export_data.js"></script>
    <script src="script/modal_handler.js"></script> 
    <script src="script/wip_handler.js"></script> 
</body>
</html>