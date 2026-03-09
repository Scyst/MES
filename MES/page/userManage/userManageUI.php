<?php
require_once __DIR__ . '/../components/init.php';
if (!hasRole(['admin', 'creator'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
$canManage = true;
$pageTitle = "User Management";
$pageHeaderTitle = "User & Access Management"; 
$pageHeaderSubtitle = "จัดการผู้ใช้งาน สิทธิ์การเข้าถึง และซิงค์ข้อมูลพนักงาน";
$pageIcon = "fas fa-users-cog";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>User Manager</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .user-card { border-radius: 12px; border: none; box-shadow: 0 0.125rem 0.25rem rgba(0,0,0,0.075); }
        .table-custom th { background-color: var(--bs-tertiary-bg); color: var(--bs-secondary-color); font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; }
        .badge-role { font-size: 0.75rem; padding: 0.4em 0.6em; }
        .avatar-circle { width: 40px; height: 40px; background: var(--bs-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    </style>
</head>
<body class="layout-top-header">
    
    <?php include_once('../components/php/top_header.php'); ?>

    <main id="main-content">
        <div class="container-fluid py-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
                <div>
                    <div class="input-group" style="width: 300px;">
                        <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                        <input type="text" id="searchUserInput" class="form-control border-start-0 ps-0" placeholder="Search by Name, Emp ID...">
                    </div>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-primary" onclick="openModal('addUserModal')">
                        <i class="fas fa-user-plus me-1"></i> Add User
                    </button>
                    <button class="btn btn-outline-success" id="btnSyncManpower">
                        <i class="fas fa-sync-alt me-1"></i> Sync Manpower
                    </button>
                </div>
            </div>

            <div class="card user-card">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-custom align-middle mb-0">
                            <thead>
                                <tr>
                                    <th class="ps-4">Employee Details</th> <th>Username</th> <th>Role & Dept</th>
                                    <th>Status</th>
                                    <th>Source</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="userTable">
                                <tr><td colspan="6" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2"></i> Loading users...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="addUserModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-user-plus me-2 text-primary"></i>Add User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addUserForm">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Employee ID</label>
                                    <input type="text" name="emp_id" id="add_emp_id" class="form-control text-uppercase" placeholder="e.g. 1096...">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Username <span class="text-danger">*</span></label>
                                    <input type="text" name="username" id="add_username" class="form-control" required>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" name="fullname" id="add_fullname" class="form-control" placeholder="Name - Surname">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Password <span class="text-danger">*</span></label>
                                    <input type="password" name="password" class="form-control" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Role <span class="text-danger">*</span></label>
                                    <select class="form-select" name="role" required>
                                        <option value="">Select...</option>
                                        <option value="admin" <?= (!hasRole('creator')) ? 'disabled' : '' ?>>Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="planner">Planner</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="qc">QA / QC</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="operator">Operator</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Team / Group</label>
                                    <input type="text" name="team_group" id="add_team" class="form-control text-uppercase" placeholder="e.g. A, B">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Line / Area</label>
                                    <input type="text" name="line" id="add_line" class="form-control text-uppercase" placeholder="e.g. PRESS, ALL">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="addUserForm" class="btn btn-primary w-100">Save User</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="editUserModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title"><i class="fas fa-edit me-2 text-warning"></i>Edit User</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editUserForm">
                            <input type="hidden" name="id" id="edit_id">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label">Employee ID</label>
                                    <input type="text" name="emp_id" id="edit_emp_id" class="form-control text-uppercase" autocomplete="off">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Username</label>
                                    <input type="text" name="username" id="edit_username" class="form-control bg-light" readonly>
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Full Name</label>
                                    <input type="text" name="fullname" id="edit_fullname" class="form-control">
                                </div>
                                <div class="col-12">
                                    <label class="form-label">Reset Password <small class="text-muted">(Leave blank if no change)</small></label>
                                    <input type="password" name="password" id="edit_password" class="form-control" autocomplete="new-password">
                                </div>
                                <div class="col-md-12">
                                    <label class="form-label">Role <span class="text-danger">*</span></label>
                                    <select class="form-select" name="role" id="edit_role" required>
                                        <option value="">Select...</option>
                                        <option value="admin" <?= (!hasRole('creator')) ? 'disabled' : '' ?>>Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="planner">Planner</option>
                                        <option value="supervisor">Supervisor</option>
                                        <option value="qc">QA / QC</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="operator">Operator</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Team / Group</label>
                                    <input type="text" name="team_group" id="edit_team" class="form-control text-uppercase">
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Line / Area</label>
                                    <input type="text" name="line" id="edit_line" class="form-control text-uppercase">
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="editUserForm" class="btn btn-warning w-100 text-dark fw-bold">Update User</button>
                    </div>
                </div>
            </div>
        </div>

    </main>

    <script>
        const canManage = true;
        const currentUserId = <?= json_encode($_SESSION['user']['id'] ?? 0) ?>;
        const currentUserRole = <?= json_encode($_SESSION['user']['role'] ?? '') ?>;
    </script>
    <script src="script/userManage.js?v=<?= time() ?>"></script>
</body>
</html>