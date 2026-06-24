<?php
require_once __DIR__ . '/../components/init.php';

// ตรวจสอบสิทธิ์
if (!hasRole(['admin', 'creator', 'supervisor', 'operator', 'qc'])) {
    header("Location: ../dailyLog/dailyLogUI.php");
    exit;
}

$canManage = hasRole(['admin', 'creator', 'qc']);
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: #4F46E5;
            --primary-hover: #4338CA;
            --bg-color: #F8FAFC;
            --surface-color: #FFFFFF;
            --text-primary: #0F172A;
            --text-primary: #0F172A;
            --text-secondary: #475569;
            --border-color: #CBD5E1;
            --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        body.layout-top-header {
            font-family: var(--font-family);
            background-color: var(--bg-color);
            color: var(--text-primary);
        }
        .card-modern {
            background-color: var(--surface-color);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .btn-indigo {
            background-color: var(--primary-color);
            color: white;
            border: none;
            transition: all 0.2s ease;
        }
        .btn-indigo:hover {
            background-color: var(--primary-hover);
            color: white;
        }
        /* Table Styles */
        .table-modern {
            border-collapse: collapse;
        }
        .table-modern thead th {
            color: var(--text-primary);
            font-size: 0.9rem;
            font-weight: 700;
            border-bottom: 2px solid #94A3B8 !important;
            background-color: #F1F5F9;
            padding: 12px 10px;
        }
        .table-modern tbody tr {
            border-bottom: 1px solid #CBD5E1;
            transition: background 0.2s;
        }
        .table-modern tbody tr:hover {
            background-color: #F1F5F9;
        }
        .table-modern tbody td {
            padding: 12px 10px;
            vertical-align: middle;
            border: none;
        }
        
        /* Category Dropdown */
        .category-picker-dropdown .dropdown-menu {
            min-width: 280px;
            max-height: 400px;
            overflow-y: auto;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .category-item { transition: all 0.2s; border-radius: 4px; margin: 0 4px; }
        .category-item:hover { background-color: #F1F5F9; }
        .category-item.active { background-color: #EEF2FF; color: var(--primary-color); font-weight: 600; }
        .folder-arrow { font-size: 0.8rem; color: var(--text-secondary); }
    </style>
</head>

<body class="layout-top-header">
    
    <div class="page-container">
        <?php include __DIR__ . '/../components/php/top_header.php'; ?>

        <div id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="content-wrapper p-3">
                
                <div class="card-modern mb-3 flex-shrink-0">
                    <div class="card-body p-3 d-flex flex-wrap align-items-center gap-3">
                            
                            <!-- Left side: Search and Breadcrumbs -->
                            <div class="d-flex align-items-center gap-3 flex-grow-1">
                                <!-- Search Box -->
                                <div class="position-relative" style="width: 250px;">
                                    <span class="position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" id="docSearchInput" class="form-control bg-white ps-5" placeholder="Search..." style="border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                </div>
                                
                                <!-- Breadcrumbs -->
                                <div class="d-flex align-items-center gap-2" id="breadcrumbContainer" style="font-size: 1.1rem;">
                                    <!-- Populated by JS -->
                                    <span style="cursor: pointer; color: var(--text-primary); font-weight: 600;" onclick="navigateToFolder('')">All Files</span>
                                </div>
                            </div>

                            <!-- Right side: Buttons -->
                            <div class="d-flex align-items-center gap-3 flex-wrap justify-content-end">
                                <?php if ($canManage): ?>
                                    <button id="newFolderBtn" class="btn btn-light border fw-medium px-3 shadow-sm" data-bs-toggle="modal" data-bs-target="#newFolderModal" style="padding: 8px 16px; border-radius: 6px; color: var(--primary-color);">
                                        📁 + New Folder
                                    </button>

                                    <button id="uploadDocBtn" class="btn btn-indigo px-3 shadow-sm" data-bs-toggle="modal" data-bs-target="#uploadDocModal" style="padding: 8px 16px; border-radius: 6px; font-weight: 500;">
                                        📄 + Upload File
                                    </button>
                                <?php endif; ?>
                            </div>

                        </div>
                    </div>

                <div class="card-modern d-flex flex-column flex-grow-1" style="min-height: 0; padding: 1rem;">
                    <div class="table-responsive flex-grow-1" style="overflow-y: auto;">
                        <table class="table-modern w-100 text-start align-middle mb-0">
                            <thead style="position: sticky; top: 0; z-index: 10;">
                                <tr>

                                    <th style="width: 35%;">File Name</th>
                                    <th style="width: 20%;">Description</th>
                                    <th style="width: 15%;">Category</th>
                                    <th style="width: 10%;">Size</th>
                                    <th style="width: 10%;">Uploaded By</th>
                                    <?php if ($canManage): ?>
                                    <th style="width: 10%; text-align: right;">Actions</th>
                                    <?php endif; ?>
                                </tr>
                            </thead>
                            <tbody id="documentTableBody">
                                <tr><td colspan="7" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="bg-white border-top py-3 mt-3 d-flex justify-content-center">
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
                    include('components/moveDocModal.php');
                    include('components/reviseDocModal.php');
                    include('components/newFolderModal.php');
                }
                include('components/viewDocModal.php');
                include('components/view3DModal.php');
            ?>

        </div>
    </div>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>

    <script src="https://cdn.jsdelivr.net/npm/online-3d-viewer@0.14.0/build/engine/o3dv.min.js"></script>
    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="script/documentCenter.js?v=<?php echo filemtime('script/documentCenter.js'); ?>"></script>
    
</body>
</html>
