<?php
// userManageUI.php (เวอร์ชันปรับปรุง)
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
    <script src="../../utils/libs/jspdf.umd.min.js"></script>
    <script src="../../utils/libs/jspdf.plugin.autotable.js"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="../../utils/libs/bootstrap.bundle.min.js"></script>
    <link rel="stylesheet" href="../../utils/libs/bootstrap.min.css">
    <link rel="stylesheet" href="../../style/style.css">
</head>

<body class="bg-dark text-white p-4">
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
            <div class="col-md-8">
                <div class="filter-controls-wrapper">
                    <div id="user-filters">
                        <input type="text" class="form-control" id="searchInput" placeholder="Search users by username, role, or line...">
                    </div>
                    <div id="log-filters" class="d-none">
                         <div class="d-flex align-items-center gap-2 flex-wrap">
                            <input type="text" id="logUserFilter" class="form-control form-control-sm" placeholder="Filter User...">
                            <input type="text" id="logActionFilter" class="form-control form-control-sm" placeholder="Filter Action...">
                            <input type="text" id="logTargetFilter" class="form-control form-control-sm" placeholder="Filter Target...">
                            <input type="date" id="logStartDate" class="form-control form-control-sm">
                            <span>-</span>
                            <input type="date" id="logEndDate" class="form-control form-control-sm">
                            <button id="filterLogsBtn" class="btn btn-info btn-sm text-nowrap">Search</button>
                         </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div id="dynamic-button-group" class="d-flex justify-content-end gap-2">
                     <?php if ($canManage): ?>
                        <button class="btn btn-success" onclick="openModal('addUserModal')">Add New User</button>
                    <?php endif; ?>
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
                <div id="log-pagination" class="d-flex justify-content-end mt-3">
                    </div>
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

    <script src="../components/toast.js"></script>
    <script src="../components/auto_logout.js"></script>
    <script src="script/modal_handler.js"></script>
    <script src="script/userManage.js"></script>
</body>
</html>