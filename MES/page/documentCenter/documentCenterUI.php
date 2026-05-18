<?php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์
if (!hasRole(['admin', 'creator', 'supervisor', 'operator', 'qc'])) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$canManage = hasRole(['admin', 'creator']);
$currentUser = $_SESSION['user'];

// กำหนดตัวแปรสำหรับ top_header.php
$pageTitle = "Document Center";
$pageHeaderTitle = "Document Center";
$pageHeaderSubtitle = "ระบบจัดการและจัดเก็บเอกสารส่วนกลาง";
$pageIcon = "fas fa-folder-open";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* ปรับแต่ง Dropdown หมวดหมู่ให้สวยงามขึ้น */
        .category-picker-dropdown .dropdown-menu {
            min-width: 280px;
            max-height: 400px;
            overflow-y: auto;
            border-radius: 8px;
            box-shadow: 0 0.5rem 1rem rgba(0,0,0,0.15);
        }
        .category-item { transition: all 0.2s; border-radius: 4px; margin: 0 4px; }
        .category-item:hover { background-color: #f8f9fa; }
        .category-item.active { background-color: #e8f0fe; color: #0d6efd; font-weight: 600; }
        .folder-arrow { font-size: 0.8rem; color: #adb5bd; }
    </style>
</head>

<body class="layout-top-header">
    
    <div class="page-container">
        <?php include __DIR__ . '/../components/php/top_header.php'; ?>

        <div id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="content-wrapper">
                
                <div class="card shadow-sm border-0 mb-3 flex-shrink-0">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                
                                <div class="dropdown category-picker-dropdown shadow-sm">
                                    <button class="btn btn-light border-secondary-subtle dropdown-toggle d-flex align-items-center justify-content-between" type="button" id="categoryDropdown" data-bs-toggle="dropdown" aria-expanded="false" style="min-width: 200px;">
                                        <span><i class="fas fa-folder text-warning me-2"></i> <span id="currentCategoryText">All Documents</span></span>
                                    </button>
                                    <ul class="dropdown-menu" aria-labelledby="categoryDropdown" id="categoryPickerMenu">
                                        <li class="dropdown-header d-none px-3 py-2 bg-light border-bottom mb-2" id="categoryPickerBreadcrumbs">
                                            <button type="button" class="btn btn-sm btn-light border text-secondary btn-back-category me-2"><i class="fas fa-arrow-left"></i></button>
                                            <span class="breadcrumb-text fw-bold text-dark"></span>
                                        </li>
                                        <li><a class="dropdown-item category-item active py-2" href="#" data-category=""><i class="fas fa-inbox text-secondary me-2"></i> All Documents</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <div id="categoryPickerList">
                                            <li class="p-3 text-center text-muted small"><i class="fas fa-spinner fa-spin me-2"></i>Loading categories...</li>
                                        </div>
                                    </ul>
                                </div>

                                <div class="input-group input-group-sm" style="max-width: 350px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="search" id="docSearchInput" class="form-control border-secondary-subtle ps-2" placeholder="ค้นหาชื่อไฟล์, รายละเอียด..." autocomplete="off">
                                </div>
                            </div>

                            <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                                <?php if ($canManage): ?>
                                    <button id="btnDeleteSelected" class="btn btn-danger btn-sm shadow-sm" style="display: none;">
                                        <i class="fas fa-trash-alt me-1"></i> ลบที่เลือก (<span id="selectedCount">0</span>)
                                    </button>

                                    <button id="uploadDocBtn" class="btn btn-primary btn-sm fw-bold px-3 shadow-sm" data-bs-toggle="modal" data-bs-target="#uploadDocModal">
                                        <i class="fas fa-upload me-1"></i> อัปโหลดเอกสาร
                                    </button>
                                <?php endif; ?>
                            </div>

                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 d-flex flex-column flex-grow-1" style="min-height: 0;">
                    <div class="table-responsive flex-grow-1" style="overflow-y: auto;">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light text-secondary" style="position: sticky; top: 0; z-index: 10;">
                                <tr>
                                    <?php if ($canManage): ?>
                                    <th style="width: 50px; text-align: center;">
                                        <input type="checkbox" class="form-check-input" id="selectAllCheckbox">
                                    </th>
                                    <?php endif; ?>
                                    <th style="width: 40%;">File Name</th>
                                    <th style="width: 25%;">Description</th>
                                    <th style="width: 20%;">Category</th>
                                    <th style="width: 15%;">Uploaded By</th>
                                </tr>
                            </thead>
                            <tbody id="documentTableBody">
                                <tr><td colspan="5" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="card-footer bg-white border-top py-2 d-flex justify-content-center">
                        <nav id="fixedPagination" class="mb-0">
                            <ul class="pagination pagination-sm justify-content-center mb-0" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>

            </div> 
            
            <div id="toast"></div>

            <?php
                if ($canManage) {
                    include('components/uploadDocModal.php');
                    include('components/deleteConfirmationModal.php');
                }
                include('components/viewDocModal.php');
            ?>

        </div>
    </div>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>

    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="script/documentCenter.js?v=<?php echo filemtime('script/documentCenter.js'); ?>"></script>
    
</body>
</html>