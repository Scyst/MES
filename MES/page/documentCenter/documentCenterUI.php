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
                        <div class="col-md-9">
                            <div class="filter-controls-wrapper">
                                 <input type="search" id="docSearchInput" class="form-control" placeholder="Search by File Name, Description, or Category...">
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
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th style="width: 30%;">File Name</th>
                                <th style="width: 35%;">Description</th>
                                <th style="width: 10%;">Category</th>
                                <th style="width: 10%;">Uploaded By</th>
                            </tr>
                        </thead>
                        <tbody id="documentTableBody">
                            </tbody>
                    </table>
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
                // ทุกคนสามารถดูรายละเอียดไฟล์ได้
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