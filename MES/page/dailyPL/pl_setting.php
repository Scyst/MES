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
    <style>
        /* Table Header */
        .table-custom thead th {
            background-color: #f1f3f5;
            border-bottom: 2px solid #dee2e6;
            color: #495057;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 0.5px;
        }

        /* --- Tree View Logic --- */
        
        /* Level 0: Root Header */
        .tree-l0 td {
            background-color: #e3f2fd !important; /* ฟ้าอ่อน */
            border-top: 2px solid #fff;
            color: #0d47a1;
            font-weight: 800;
            font-size: 1.05em;
        }

        /* Level 1: Sub-Header */
        .tree-l1 td {
            background-color: #f8f9fa !important; /* เทาจางๆ */
            color: #2c3e50;
            font-weight: 600;
        }

        /* Level 2+: Items */
        .tree-item td {
            background-color: #fff !important;
            color: #495057;
        }

        /* Connector Line (เส้นโยง L-Shape) */
        .tree-connector {
            position: relative;
            height: 100%;
            display: inline-block;
        }
        
        /* เส้นแนวตั้ง | */
        .tree-line-v {
            position: absolute;
            left: -18px; /* ขยับซ้ายตาม Indent */
            top: -20px;  /* ลากจากบรรทัดบน */
            bottom: 0;
            width: 1px;
            background-color: #cbd3da;
            height: 45px; /* ความสูงพอดีบรรทัด */
        }
        
        /* เส้นแนวนอน _ */
        .tree-line-h {
            position: absolute;
            left: -18px;
            top: 50%;
            width: 12px;
            height: 1px;
            background-color: #cbd3da;
        }

        /* Action Buttons */
        .action-btn {
            width: 28px; height: 28px;
            padding: 0;
            display: inline-flex;
            align-items: center; justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
        }
        .action-btn:hover { transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    </style>
</head>
<body class="layout-top-header">
    <?php include_once '../components/php/top_header.php'; ?>

    <div id="main-content">
        <div class="container-fluid py-4">
            
            <div class="card border-0 shadow-sm mb-4 rounded-3">
                <div class="card-body py-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
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
                                    <th style="width: 12%; text-center">Code</th>
                                    <th style="width: 10%; text-center">Type</th>
                                    <th style="width: 12%; text-center">Source</th>
                                    <th style="width: 8%; text-center">Order</th>
                                    <th style="width: 13%; text-center">Actions</th>
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