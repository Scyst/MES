<?php
// page/pl_daily/pl_setting.php
require_once __DIR__ . '/../components/init.php';

if (!hasRole(['admin', 'creator'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

// 1. ตั้งค่าตัวแปรสำหรับ top_header.php
$pageTitle = "P&L Structure Setup";
$pageIcon = "fas fa-sitemap"; 
$pageHeaderTitle = "P&L Structure Setup"; 
$pageHeaderSubtitle = "ตั้งค่าผังบัญชี สูตรคำนวณ และลำดับชั้นข้อมูล"; 

$v = filemtime(__DIR__ . '/script/pl_setting.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/pl_setting.css?v=<?php echo $v; ?>">
    <style>
        /* CSS เฉพาะหน้า Setting */
        .form-switch .form-check-input {
            width: 2.5em;
            height: 1.25em;
            cursor: pointer;
        }
        .form-switch .form-check-label {
            cursor: pointer;
            user-select: none;
            font-size: 0.85rem;
        }
        
        /* Toolbar ปรับแต่ง */
        .toolbar-container {
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
            padding: 0.75rem 1.5rem;
            width: 100%; /* 🔥 บังคับเต็มจอ */
        }

        /* Badge Styles */
        .badge-mini {
            display: inline-flex; align-items: center; justify-content: center;
            width: 20px; height: 20px; border-radius: 4px; 
            font-size: 10px; font-weight: bold; color: white;
        }
        .badge-type-rev { background-color: #198754; }
        .badge-type-cogs { background-color: #dc3545; }
        .badge-type-exp { background-color: #fd7e14; }
        .badge-src-auto { background-color: #0dcaf0; color: #000; }
        .badge-src-calc { background-color: #6f42c1; }
        .badge-src-manual { background-color: #6c757d; }
    </style>
</head>
<body class="layout-top-header bg-light">
    
    <div class="page-container">
        
        <?php include_once '../components/php/top_header.php'; ?>

        <div id="main-content">
            
            <div class="toolbar-container shadow-sm">
                <div class="d-flex align-items-center w-100">
                    
                    <div class="d-flex align-items-center">
                        <div class="form-check form-switch d-flex align-items-center gap-2 mb-0">
                            <input class="form-check-input mt-0" type="checkbox" id="showInactiveToggle">
                            <label class="form-check-label text-muted fw-bold" for="showInactiveToggle">
                                <i class="fas fa-trash-alt me-1 text-secondary"></i> Show Deleted
                            </label>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center gap-2 ms-auto">
                        <button class="btn btn-outline-success btn-sm rounded-pill px-3" onclick="exportTemplate()">
                            <i class="fas fa-file-excel me-1"></i> Export
                        </button>
                        
                        <input type="file" id="importFile" accept=".xlsx, .xls" class="d-none" onchange="handleFileUpload(this)">
                        <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="document.getElementById('importFile').click()">
                            <i class="fas fa-file-import me-1"></i> Import
                        </button>
                        
                        <div class="vr text-muted opacity-25 mx-2"></div>
                        
                        <button class="btn btn-primary btn-sm rounded-pill px-4 shadow-sm fw-bold" onclick="openModal()">
                            <i class="fas fa-plus me-1"></i> Add Item
                        </button>
                    </div>

                </div>
            </div>
            <div class="content-wrapper p-3">
                <div class="card border-0 shadow-sm rounded-4 h-100 overflow-hidden"> 
                    <div class="card-body p-0 h-100">
                        <div class="table-responsive h-100 custom-scrollbar">
                            <table class="table table-hover table-custom mb-0 align-middle w-100">
                                <thead class="bg-light sticky-top" style="z-index: 5;">
                                    <tr>
                                        <th class="text-start ps-4 py-3" style="width: 40%;">Account Name (Tree View)</th>
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