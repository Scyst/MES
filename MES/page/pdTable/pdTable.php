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
    <title>OEE - PRODUCTION HISTORY</title>
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
            <h2 class="mb-0">Production History</h2>
        </div>

        <div class="row mb-3 align-items-center sticky-bar">
            <div class="col-md-9">
                <div class="filter-controls-wrapper">
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
                        <option value="FG">FG</option>
                        <option value="NG">NG</option>
                        <option value="HOLD">HOLD</option>
                        <option value="REWORK">REWORK</option>
                        <option value="SCRAP">SCRAP</option>
                        <option value="ETC.">ETC.</option>
                    </select>

                    <input type="date" id="filterStartDate" class="form-control">
                    <span>-</span>
                    <input type="date" id="filterEndDate" class="form-control">
                </div>
            </div>

            <div class="col-md-1"></div>

            <div class="col-md-2">
                <div class="d-flex justify-content-end gap-2 btn-group-equal">
                    <button class="btn btn-primary flex-fill" onclick="exportToExcel()">Export</button>
                    <?php if ($canManage): ?>
                        <button class="btn btn-success flex-fill" onclick="openAddPartModal(this)">Add</button>
                    <?php endif; ?>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center my-3">
                 <div id="grandSummary" class="summary-grand-total">             
                 </div>
                 <button class="btn btn-info" onclick="openSummaryModal(this)">View Detailed Summary</button>
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

        <nav class="sticky-bottom">
            <ul class="pagination justify-content-center" id="paginationControls"></ul>
        </nav>
    </div>
    
    <div id="toast"></div>

    <?php include('components/summaryModal.php'); ?>
    <?php 
        if ($canManage) {
            include('components/addPartModal.php');
            include('components/editPartModal.php');
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
</body>
</html>