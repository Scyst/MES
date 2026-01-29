<?php
// page/pl_daily/pl_setting.php
require_once __DIR__ . '/../components/init.php';

if (!hasRole(['admin', 'creator'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "P&L Structure Setup";
$v = filemtime(__DIR__ . '/script/pl_setting.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/pl_setting.css?v=<?php echo $v; ?>">
</head>
<body class="layout-top-header bg-light">
    
    <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>

        <div id="main-content">
            
            <div class="toolbar-container shadow-sm z-2">
                <div class="d-flex align-items-center gap-3">
                    <div>
                        <h6 class="fw-bold text-primary mb-0"><i class="fas fa-sitemap me-2"></i>P&L Structure</h6>
                        <span class="text-muted small">ผังบัญชีและลำดับชั้น</span>
                    </div>
                </div>
                
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-outline-success btn-sm rounded-pill px-3" onclick="exportTemplate()">
                        <i class="fas fa-file-excel me-1"></i> Export
                    </button>
                    <input type="file" id="importFile" accept=".xlsx, .xls" class="d-none" onchange="handleFileUpload(this)">
                    <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="document.getElementById('importFile').click()">
                        <i class="fas fa-file-import me-1"></i> Import
                    </button>
                    <div class="vr text-muted opacity-25 mx-1"></div>
                    <button class="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-bold" onclick="openModal()">
                        <i class="fas fa-plus me-1"></i> Add Item
                    </button>
                </div>
            </div>

            <div class="content-wrapper">
                
                <div class="card-table"> 
                    <div class="table-responsive h-100 custom-scrollbar">
                        <table class="table table-hover table-custom mb-0 align-middle w-100">
                            <thead>
                                <tr>
                                    <th class="text-start ps-4" style="width: 40%;">Account Name (Tree View)</th>
                                    <th class="text-start px-3" style="width: 15%;">Code</th>
                                    <th class="text-start" style="width: 10%;">Type</th>
                                    <th class="text-start" style="width: 15%;">Source</th>
                                    <th class="text-center" style="width: 8%;">Order</th>
                                    <th class="text-end pe-4" style="width: 12%;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="masterTableBody">
                                </tbody>
                        </table>
                    </div>
                </div>

            </div> </div> </div> <?php include 'components/modal_pl_item.php'; ?>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/Sortable.min.js"></script>
    <script src="script/pl_setting.js?v=<?php echo $v; ?>"></script>
</body>
</html>