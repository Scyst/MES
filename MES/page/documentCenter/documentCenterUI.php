<?php
    require_once __DIR__ . '/../../auth/check_auth.php';

    if (!hasRole(['admin', 'creator', 'supervisor', 'operator'])) {
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
        exit;
    }

    $canManage = hasRole(['admin', 'creator']);
    $currentUser = $_SESSION['user'];
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Document Center</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .main-content-flex {
            display: flex;
            gap: 1.0rem; /* ลดระยะห่างระหว่าง sidebar กับตาราง */
        }
        .category-sidebar {
            flex: 0 0 220px; /* ลดความกว้างของ Sidebar ลงอีก */
            min-width: 220px; /* ป้องกันไม่ให้ Sidebar เล็กลงกว่านี้ */
            max-width: 280px; /* กำหนดความกว้างสูงสุด */
            background-color: var(--bs-light); /* เพิ่มพื้นหลังให้เห็นขอบเขตชัดเจน */
            border-right: 1px solid var(--bs-gray-300); /* เพิ่มเส้นแบ่ง */
            border-radius: var(--bs-border-radius);
        }
        .documents-table-container {
            flex: 1 1 auto; 
            min-width: 0;
        }
        /* Style สำหรับ Accordion/Treeview */
        .category-tree .nav-item {
            margin-bottom: 0; /* ลดระยะห่างระหว่างรายการ */
        }
        .category-tree .nav-link {
            padding-top: 0.4rem;
            padding-bottom: 0.4rem;
            color: var(--bs-dark);
            font-weight: 500;
            display: flex;
            align-items: center;
        }
        .category-tree .nav-link.active {
            background-color: var(--bs-primary);
            color: white;
            font-weight: bold;
        }
        .category-tree .nav-link:hover:not(.active) {
            background-color: var(--bs-light-hover);
            color: var(--bs-primary);
        }
        .category-tree .nav-link .fas, .category-tree .nav-link .far {
            width: 20px; /* เพื่อให้ไอคอนจัดเรียงตรงกัน */
            text-align: center;
        }
        .category-tree .collapse .nav-link {
            font-weight: normal; /* รายการย่อยไม่ต้องตัวหนามาก */
        }
        .category-tree .folder-toggle-icon {
            margin-left: auto; /* จัดให้อยู่ขวา */
            transition: transform 0.2s ease-in-out;
        }
        .category-tree .folder-toggle-icon.rotated {
            transform: rotate(90deg);
        }
    </style>
</head>

<body class="page-with-table">
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">📄 Document Center</h2>
                </div>
            </div>
            
            <div class="sticky-bar">
                <div class="container-fluid">
                    <div class="row my-3 align-items-center">
                        <div class="col-md-9">
                            <div class="filter-controls-wrapper">
                                 <input type="search" id="docSearchInput" class="form-control" placeholder="Search all documents...">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex justify-content-end gap-2">
                                <?php if ($canManage): ?>
                                    <button class="btn btn-success" id="uploadDocBtn">
                                        <i class="fas fa-upload"></i> Upload Documents
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper">
                <div class="main-content-flex">

                    <div class="category-sidebar card"> <div class="card-header py-2 d-flex align-items-center">
                            <h6 class="card-title mb-0 flex-grow-1"><i class="fas fa-folder-open me-2"></i>Categories</h6>
                            <?php if ($canManage): // อาจเพิ่มปุ่มสำหรับสร้างโฟลเดอร์ใหม่ตรงนี้ ?>
                                <?php endif; ?>
                        </div>
                        <div class="card-body p-0" id="category-tree-container" style="max-height: calc(100vh - 250px); overflow-y: auto;">
                            <div class="text-center text-muted p-3">
                                <div class="spinner-border spinner-border-sm" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <span class="ms-2">Loading Categories...</span>
                            </div>
                        </div>
                    </div>

                    <div class="documents-table-container">
                        <div class="table-responsive">
                            <table class="table table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 30%;">File Name</th>
                                        <th style="width: 35%;">Description</th>
                                        <th style="width: 20%;">Category</th>
                                        <th style="width: 15%;">Uploaded By</th>
                                    </tr>
                                </thead>
                                <tbody id="documentTableBody">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                    
                </div>
            </div>

            <nav class="sticky-bottom">
                <ul class="pagination justify-content-center" id="paginationControls"></ul>
            </nav>
            
            <div id="toast"></div>

            <?php
                if ($canManage) {
                    include('components/uploadDocModal.php');
                }
                include('components/viewDocModal.php'); 
                include('../components/php/autoLogoutUI.php');
            ?>

        </main>
    </div>
    
    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>

    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="script/documentCenter.js?v=<?php echo filemtime('script/documentCenter.js'); ?>"></script>
</body>
</html>