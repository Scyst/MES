<?php
// page/pl_daily/pl_setting.php
require_once __DIR__ . '/../components/init.php';

// กฎข้อ 1: Reality Check - เช็คสิทธิ์ก่อนเข้าถึง (ตัวอย่าง)
if (!hasRole(['admin', 'creator'])) {
    header("Location: ../../auth/access_denied.php");
    exit;
}

$pageTitle = "P&L Structure Management";
$pageIcon = "fas fa-sitemap"; 
$pageHeaderTitle = "P&L Master Data";
$pageHeaderSubtitle = "จัดการโครงสร้างบัญชีและแหล่งที่มาข้อมูล";

// กฎข้อ 2: ใช้ Local Versioning เพื่อ Performance
$v = filemtime(__DIR__ . '/script/pl_setting.js');
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* Refactor CSS: ใช้ Variables จาก style.css ที่คุณมีอยู่แล้ว */
        .table-custom thead th { 
            background-color: var(--bs-tertiary-bg); 
            position: sticky; 
            top: 0; 
            z-index: 10;
            border-bottom: 2px solid var(--bs-border-color);
        }
        .row-parent { background-color: rgba(var(--bs-primary-rgb), 0.05); font-weight: bold; }
        .row-child { padding-left: 2.5rem !important; position: relative; }
        /* เพิ่มสัญลักษณ์ลำดับขั้นให้ดูง่ายขึ้น */
        .row-child::before {
            content: "└";
            position: absolute;
            left: 1rem;
            color: var(--bs-secondary);
        }
        /* ปรับปรุง Search Box ให้ดู Modern */
        .search-box-container .input-group {
            border-radius: 8px;
            overflow: hidden;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.075);
        }
    </style>
</head>
<body class="layout-top-header"> <div class="page-container">
        <?php include_once '../components/php/top_header.php'; ?>
        
        <div id="main-content">
            <div class="content-wrapper p-3"> <div class="row g-3 mb-4 align-items-center">
                    <div class="col-12 col-md-6">
                        <div class="search-box-container">
                            <div class="input-group border">
                                <span class="input-group-text bg-light border-0"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" id="masterSearch" class="form-control border-0" placeholder="ค้นหาชื่อรายการหรือรหัสบัญชี...">
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 text-md-end">
                        <button class="btn btn-primary btn-lg shadow-sm w-100 w-md-auto" onclick="openAddModal()">
                            <i class="fas fa-plus-circle me-2"></i>เพิ่มรายการใหม่
                        </button>
                    </div>
                </div>

                <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 15px;">
                    <div class="card-body p-0">
                        <div class="table-responsive" style="max-height: 70vh;">
                            <table class="table table-hover table-custom align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th width="150">Account Code</th>
                                        <th>Item Name</th>
                                        <th width="120">Type</th>
                                        <th width="150">Data Source</th>
                                        <th width="80" class="text-center">Order</th>
                                        <th width="100" class="text-center">Status</th>
                                        <th width="100" class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="plMasterTableBody">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <?php include 'components/modal_pl_item.php'; ?>

    <script src="script/pl_setting.js?v=<?php echo $v; ?>"></script>
</body>
</html>