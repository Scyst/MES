<?php 
    include_once("../../auth/check_auth.php"); 

    if (!hasRole(['admin', 'creator'])) { 
        header("Location: ../OEE_Dashboard/OEE_Dashboard.php"); 
        exit; 
    }

    $canManage = hasRole(['admin', 'creator']);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>User Manager</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/nav_dropdown.php'); ?>
    
    <div class="container">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">User Manager</h2>
        </div>

        <div class="row mb-3 align-items-center sticky-bar pb-3">
            <div class="col-md-5">
                <div class="filter-controls-wrapper">
                    <input type="text" class="form-control" id="searchInput" placeholder="Search users...">
                </div>
            </div>
            <div class="col-md-4"></div>
            <div class="col-md-3">
                <div class="d-flex justify-content-end gap-2 btn-group-equal">
                    <button class="btn btn-secondary flex-fill" onclick="openLogsModal()">View Logs</button>
                    <?php if ($canManage): ?>
                        <button class="btn btn-success flex-fill" onclick="openModal('addUserModal')">Add New</button>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <div class="table-responsive">
            <table class="table table-dark table-striped table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Created at</th>
                        <?php if ($canManage): ?>
                            <th style="width: 150px; text-align: center;">Actions</th>
                        <?php endif; ?>
                    </tr>
                </thead>
                <tbody id="userTable"></tbody>
            </table>
        </div>

        </div>
    <div id="toast"></div>

    <?php 
        if ($canManage) {

            include('components/addUserModal.php');
            include('components/editUserModal.php');
        }
        include('components/logsModal.php'); 
    ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUserId = <?php echo json_encode($_SESSION['user']['id'] ?? 0); ?>;
        const currentUserRole = <?php echo json_encode($_SESSION['user']['role'] ?? ''); ?>;
    </script>

    <script src="../components/toast.js"></script>
    <script src="../components/auto_logout.js"></script>
    <script src="script/modal_handler.js"></script>
    <script src="script/userManage.js"></script>  
</body>
</html>