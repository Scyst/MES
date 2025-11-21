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
</head>

<body class="page-with-table">
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#globalMobileMenu" 
            aria-controls="globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>

        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>

            <div class="container-fluid pt-3">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="mb-0">Document Center</h2>
                </div>
            </div>
            
            <div class="sticky-bar">
                <div class="container-fluid">
                    <div class="row my-3 align-items-center">
                        <div class="col-md-7">
                            <div class="filter-controls-wrapper d-flex gap-2">
                                <div class="dropdown category-picker-dropdown">
                                    <button class="btn btn-secondary dropdown-toggle" type="button" id="categoryDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-folder me-2"></i> <span id="currentCategoryText">All Documents</span>
                                    </button>
                                    <ul class="dropdown-menu" aria-labelledby="categoryDropdown" id="categoryPickerMenu">
                                        <li class="dropdown-header d-none" id="categoryPickerBreadcrumbs">
                                            <button type="button" class="btn-back-category"><i class="fas fa-arrow-left"></i></button>
                                            <span class="breadcrumb-text"></span>
                                        </li>
                                        <li><a class="dropdown-item category-item active" href="#" data-category=""><i class="fas fa-inbox"></i> All Documents</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <div id="categoryPickerList">
                                            <li class="p-3 text-center text-muted">Loading categories...</li>
                                        </div>
                                    </ul>
                                </div>
                                <input type="search" id="docSearchInput" class="form-control" placeholder="Search documents by name, description, category..." autocomplete="off">
                            </div>
                        </div>
                        <div class="col-md-5">
                            <div class="d-flex justify-content-end gap-2">
                                <?php if ($canManage): ?>
                                    <button id="btnDeleteSelected" class="btn btn-danger" style="display: none;">
                                        <i class="fas fa-trash-alt me-2"></i>Delete Selected (<span id="selectedCount">0</span>)
                                    </button>
                                <?php endif; ?>

                                <?php if ($canManage): ?>
                                    <button id="uploadDocBtn" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#uploadDocModal">
                                    <i class="fas fa-upload me-2"></i>Upload Documents
                                    </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="content-wrapper">
                <div class="main-content-flex">
                    <div class="documents-table-container pt-2">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0">
                                <thead>
                                    <tr>
                                        <?php if ($canManage): ?>
                                        <th style="width: 50px;">
                                            <input type="checkbox" id="selectAllCheckbox"> </th>
                                        <?php endif; ?>
                                        <th class="sortable" data-sort="file_name" style="width: 50%;">File Name <!--i class="fas fa-sort float-end"></i--></th>
                                        <th class="sortable" data-sort="file_description" >Description <!--i class="fas fa-sort float-end"></i--></th>
                                        <th class="sortable" data-sort="category" style="width: 15%;">Category <!--i class="fas fa-sort float-end"></i--></th>
                                        <th class="sortable" data-sort="uploaded_by" style="width: 10%;">Uploaded By <!--i class="fas fa-sort float-end"></i--></th>
                                </thead>
                                <tbody id="documentTableBody">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <nav id="fixedPagination" class="pagination-footer">
                <ul class="pagination justify-content-center" id="paginationControls"></ul>
            </nav>
            
            <div id="toast"></div>

            <?php
                if ($canManage) {
                    include('components/uploadDocModal.php');
                    include('components/deleteConfirmationModal.php');
                }
                include('components/viewDocModal.php'); 
                include('../components/php/autoLogoutUI.php');
            ?>

        </main>
    </div>
    
    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUser = <?php echo json_encode($currentUser); ?>;
    </script>

    <script src="../components/js/pagination.js?v=<?php echo filemtime('../components/js/pagination.js'); ?>"></script>
    <script src="script/documentCenter.js?v=<?php echo filemtime('script/documentCenter.js'); ?>"></script>
    
</body>
</html>