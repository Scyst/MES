<?php
require_once __DIR__ . '/../components/init.php';
if (!hasPermission('manage_users') && !hasPermission('manage_roles')) {
    header("Location: ../dailyLog/dailyLogUI.php");
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

            <ul class="nav nav-tabs mb-4" id="userManageTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active fw-bold" id="users-tab" data-bs-toggle="tab" data-bs-target="#tab-users" type="button" role="tab"><i class="fas fa-users me-2"></i>Users List</button>
                </li>
                <?php if(hasPermission('manage_roles')): ?>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold text-primary" id="roles-tab" data-bs-toggle="tab" data-bs-target="#tab-roles" type="button" role="tab"><i class="fas fa-key me-2"></i>Roles & Permissions</button>
                </li>
                <?php endif; ?>
                <li class="nav-item" role="presentation">
                    <button class="nav-link fw-bold text-secondary" id="logs-tab" data-bs-toggle="tab" data-bs-target="#tab-logs" type="button" role="tab"><i class="fas fa-history me-2"></i>Audit Logs</button>
                </li>
            </ul>

            <div class="tab-content" id="userManageTabsContent">
                
                <div class="tab-pane fade show active" id="tab-users" role="tabpanel">
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div class="input-group" style="width: 300px;">
                            <span class="input-group-text bg-white border-end-0"><i class="fas fa-search text-muted"></i></span>
                            <input type="text" id="searchUserInput" class="form-control border-start-0 ps-0" placeholder="Search by Name, Emp ID...">
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary shadow-sm" onclick="openModal('addUserModal')">
                                <i class="fas fa-user-plus me-1"></i> Add User
                            </button>
                            <button class="btn btn-outline-success shadow-sm" id="btnSyncManpower">
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
                                            <th class="ps-4">Employee Details</th> 
                                            <th>Username</th> 
                                            <th>Role & Dept</th>
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

                <div class="tab-pane fade" id="tab-roles" role="tabpanel">
                    <div class="card user-card border-primary mb-3">
                        <div class="card-header bg-primary bg-opacity-10 text-primary fw-bold">
                            <i class="fas fa-shield-alt me-2"></i> Permission Matrix (PBAC)
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-bordered table-hover align-middle mb-0" id="matrixTable">
                                    <thead class="table-light text-center" id="matrixThead">
                                        </thead>
                                    <tbody id="matrixTbody">
                                        <tr><td class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Loading Matrix...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div class="alert alert-info py-2 small mb-0">
                        <i class="fas fa-info-circle me-1"></i> สิทธิ์ระดับ <b>System Owner (creator)</b> ไม่สามารถแก้ไขได้เพื่อป้องกันการสูญเสียการควบคุมระบบ
                    </div>
                </div>

                <div class="tab-pane fade" id="tab-logs" role="tabpanel">
                    <div class="card user-card border-0 mb-3 shadow-sm">
                        <div class="card-body bg-light rounded">
                            <form id="filterLogsForm" class="row g-2 align-items-end">
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold mb-1">Date Range</label>
                                    <div class="input-group input-group-sm">
                                        <input type="date" class="form-control" id="logStartDate" name="startDate">
                                        <span class="input-group-text px-2">-</span>
                                        <input type="date" class="form-control" id="logEndDate" name="endDate">
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold mb-1">Action Type</label>
                                    <input type="text" class="form-control form-control-sm" id="logActionType" name="action_type" placeholder="e.g. UPDATE, LOGIN, API_ERROR">
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold mb-1">Module</label>
                                    <input type="text" class="form-control form-control-sm" id="logModule" name="module" placeholder="e.g. INVENTORY_API">
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label small fw-bold mb-1">Keyword Search</label>
                                    <input type="text" class="form-control form-control-sm" id="logSearch" name="search" placeholder="Search in remark, values, ref_id...">
                                </div>
                                <div class="col-md-2 d-grid">
                                    <button type="submit" class="btn btn-primary btn-sm fw-bold"><i class="fas fa-search me-1"></i> Search Logs</button>
                                </div>
                            </form>
                        </div>
                    </div>
                    
                    <div class="card user-card">
                        <div class="card-body p-0">
                            <div class="table-responsive" style="max-height: 600px;">
                                <table class="table table-hover table-custom align-middle mb-0" style="font-size: 0.85rem; table-layout: fixed;">
                                    <thead class="position-sticky top-0" style="z-index: 1; background-color: var(--bs-tertiary-bg);">
                                        <tr>
                                            <th style="width: 15%;">Timestamp</th>
                                            <th style="width: 18%;">User & IP</th>
                                            <th style="width: 20%;">Action & Module</th>
                                            <th style="width: 6%;">Ref ID</th>
                                            <th style="width: 33%;">Details / Remark</th>
                                            <th style="width: 8%;" class="text-center">Raw Data</th>
                                        </tr>
                                    </thead>
                                    <tbody id="logsTbody">
                                        <tr><td colspan="6" class="text-center py-4 text-muted">Click Search to load logs.</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <small class="text-muted" id="logRecordInfo">Showing 0 records</small>
                        <div class="d-flex gap-2 align-items-center">
                            <button class="btn btn-sm btn-outline-secondary" id="btnPrevLog" disabled><i class="fas fa-chevron-left"></i></button>
                            <span class="fw-bold" id="logCurrentPage">1</span>
                            <button class="btn btn-sm btn-outline-secondary" id="btnNextLog" disabled><i class="fas fa-chevron-right"></i></button>
                        </div>
                    </div>
                </div>

                <div class="modal fade" id="rawLogModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-dark text-white py-2">
                                <h5 class="modal-title fs-6"><i class="fas fa-code me-2"></i>Raw Log Data</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body p-0 bg-dark">
                                <pre><code id="rawLogContent" class="text-success p-3 d-block" style="max-height: 400px; overflow-y: auto; font-size: 0.8rem;"></code></pre>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <?php 
            include_once('components/addUserModal.php'); 
            include_once('components/editUserModal.php'); 
        ?>
    </main>

    <script>
        const canManage = true;
        const currentUserId = <?= json_encode($_SESSION['user']['id'] ?? 0) ?>;
        const currentUserRole = <?= json_encode($_SESSION['user']['role'] ?? '') ?>;
    </script>
    <script src="script/userManage.js?v=<?= time() ?>"></script>
</body>
</html>