<?php
// page/pl_daily/pl_setting.php
require_once __DIR__ . '/../components/init.php';

if (!hasRole(['admin', 'creator'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "P&L Structure Setup";
$pageIcon = "fas fa-sitemap"; 
$pageHeaderTitle = "P&L Master Data";
$pageHeaderSubtitle = "จัดการผังบัญชีและลำดับชั้น (Hierarchy)";

$v = filemtime(__DIR__ . '/script/pl_setting.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link rel="stylesheet" href="css/pl_setting.css?v=<?php echo $v; ?>">
</head>
<body class="layout-top-header">
    <?php include_once '../components/php/top_header.php'; ?>

    <div id="main-content">
        <div class="container-fluid py-2">
            
            <div class="card border-0 shadow-sm rounded-3 sticky-toolbar">
                <div class="card-body py-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <h6 class="fw-bold text-primary mb-0"><i class="fas fa-list-alt me-2"></i>Account Hierarchy</h6>
                        <span class="text-muted small">โครงสร้างบัญชีแบบลำดับชั้น</span>
                    </div>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-success btn-sm rounded-pill px-3" onclick="exportTemplate()">
                            <i class="fas fa-file-excel me-1"></i> Export
                        </button>
                        <input type="file" id="importFile" accept=".xlsx, .xls" class="d-none" onchange="handleFileUpload(this)">
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="document.getElementById('importFile').click()">
                            <i class="fas fa-file-import me-1"></i> Import
                        </button>
                        <button class="btn btn-primary btn-sm rounded-pill px-4 shadow-sm" onclick="openModal()">
                            <i class="fas fa-plus me-1"></i> Add Item
                        </button>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table mb-0 align-middle table-hover table-custom">
                            <thead>
                                <tr>
                                    <th style="width: 45%; padding-left: 1.5rem;">Account Name (Tree View)</th>
                                    
                                    <th class="text-center" style="width: 12%;">Code</th>
                                    <th class="text-center" style="width: 10%;">Type</th>
                                    <th class="text-center" style="width: 12%;">Source</th>
                                    <th class="text-center" style="width: 8%;">Order</th>
                                    <th class="text-center" style="width: 13%;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="masterTableBody">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <?php include 'components/modal_pl_item.php'; ?>

    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/Sortable.min.js"></script>
    <script src="script/pl_setting.js?v=<?php echo $v; ?>"></script>
</body>
</html>