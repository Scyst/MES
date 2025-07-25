<?php
// userManageUI.php (เวอร์ชันปรับปรุงสไตล์ฟิลเตอร์)
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="<?php echo htmlspecialchars($_SESSION['csrf_token'] ?? '', ENT_QUOTES, 'UTF-8'); ?>">
    <title>User Manager</title>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css?v=<?php echo filemtime('../../style/style.css'); ?>">
</head>

<body class="bg-dark text-white p-4">
    <?php include('../components/spinner.php'); ?>
    <?php include('../components/nav_dropdown.php'); ?>

    <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h2 class="mb-0">User Manager</h2>
        </div>

        <ul class="nav nav-tabs" id="userManagementTab" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="users-tab" data-bs-toggle="tab" data-bs-target="#users-content" type="button" role="tab">User List</button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="logs-tab" data-bs-toggle="tab" data-bs-target="#logs-content" type="button" role="tab">User Logs</button>
            </li>
        </ul>

        <div class="row my-3 align-items-center sticky-bar py-3">
            <div class="col-lg-9 col-md-8">
                <div class="filter-controls-wrapper">
                    <div id="user-filters">
                        <input type="text" class="form-control" id="searchInput" placeholder="Search users by username, role, or line...">
                    </div>
                    <div id="log-filters" class="d-none">
                         <div class="filter-controls-wrapper">
                            <input type="text" id="logUserFilter" class="form-control" placeholder="User">
                            <input type="text" id="logActionFilter" class="form-control" placeholder="Action">
                            <input type="text" id="logTargetFilter" class="form-control" placeholder="Target">
                            <input type="date" id="logStartDate" class="form-control">
                            <span>-</span>
                            <input type="date" id="logEndDate" class="form-control">
                         </div>
                    </div>
                </div>
            </div>
            <div class="col-lg-3 col-md-4">
                <div id="dynamic-button-group" class="d-flex justify-content-end gap-2">
                    </div>
            </div>
        </div>

        <div class="tab-content" id="userManagementTabContent">
            <div class="tab-pane fade show active" id="users-content" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Line</th>
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

            <div class="tab-pane fade" id="logs-content" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-dark table-striped table-hover" id="log-table">
                        </table>
                </div>
                <nav class="sticky-bottom"><ul class="pagination justify-content-center" id="log-pagination"></ul></nav>
            </div>
        </div>
    </div>

    <div id="toast"></div>

    <?php
    if ($canManage) {
        include('components/addUserModal.php');
        include('components/editUserModal.php');
    }
    include('../components/autoLogoutUI.php');
    ?>

    <script>
        const canManage = <?php echo json_encode($canManage); ?>;
        const currentUserId = <?php echo json_encode($_SESSION['user']['id'] ?? 0); ?>;
        const currentUserRole = <?php echo json_encode($_SESSION['user']['role'] ?? ''); ?>;
    </script>

    <script src="../components/spinner.js?v=<?php echo filemtime('../components/spinner.js'); ?>"></script>
    <script src="../components/toast.js?v=<?php echo filemtime('../components/toast.js'); ?>"></script>
    <script src="../components/auto_logout.js?v=<?php echo filemtime('../components/auto_logout.js'); ?>"></script>
    <script src="script/modal_handler.js?v=<?php echo filemtime('script/modal_handler.js'); ?>"></script>
    <script src="script/userManage.js?v=<?php echo filemtime('script/userManage.js'); ?>"></script>
</body>
</html>