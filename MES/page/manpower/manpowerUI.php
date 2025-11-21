<?php
require_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

$currentUser = $_SESSION['user'];
$userLine = $currentUser['line'] ?? ''; 
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <title>Manpower Management</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        .manpower-view {
            display: flex; flex-direction: column;
            height: calc(100vh - 80px);
            overflow: hidden;
        }
        .manpower-content {
            flex-grow: 1; display: flex; flex-direction: column;
            min-height: 0; gap: 1rem; padding-bottom: 1rem;
        }
        .kpi-section-wrapper { flex-shrink: 0; }
        
        .table-card-wrapper {
            flex-grow: 1; min-height: 0; display: flex; flex-direction: column;
            border: 1px solid var(--bs-border-color);
            border-radius: var(--bs-card-border-radius, .375rem);
            background-color: var(--bs-body-bg);
        }
        .table-scroll-area { flex-grow: 1; overflow-y: auto; position: relative; }
        .table-scroll-area thead {
            position: sticky; top: 0; z-index: 10;
            background-color: var(--bs-tertiary-bg);
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        [data-bs-theme="dark"] .table-scroll-area thead { background-color: var(--bs-secondary-bg); }

        .status-badge { min-width: 80px; text-align: center; }
        .card-kpi { border: none; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s; }
        .card-kpi:hover { transform: translateY(-2px); }
        .card-kpi h3 { font-weight: bold; margin-bottom: 0; }
        
        .bg-gradient-primary-soft { background: linear-gradient(135deg, #e0eaff 0%, #f8f9fa 100%); border-left: 4px solid #0d6efd; }
        .bg-gradient-success-soft { background: linear-gradient(135deg, #d1e7dd 0%, #f8f9fa 100%); border-left: 4px solid #198754; }
        .bg-gradient-warning-soft { background: linear-gradient(135deg, #fff3cd 0%, #f8f9fa 100%); border-left: 4px solid #ffc107; }
        .bg-gradient-danger-soft  { background: linear-gradient(135deg, #f8d7da 0%, #f8f9fa 100%); border-left: 4px solid #dc3545; }
    </style>
</head>

<body class="dashboard-page">
    
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
            
            <div class="container-fluid pt-3 manpower-view">
                <div class="d-flex justify-content-between align-items-center mb-3 flex-shrink-0">
                    <div>
                        <h2 class="mb-0"><i class="fas fa-users-cog me-2"></i>Manpower Management</h2>
                        <small class="text-muted">
                            <?php echo htmlspecialchars($currentUser['role']); ?> 
                            <?php echo $userLine ? " | Line: $userLine" : " | All Lines"; ?>
                        </small>
                    </div>
                    
                    <div class="d-flex gap-2 align-items-center bg-white p-1 rounded shadow-sm border">
                        <input type="date" id="startDate" class="form-control form-control-sm" value="<?php echo date('Y-m-d'); ?>">
                        <span class="text-muted">-</span>
                        <input type="date" id="endDate" class="form-control form-control-sm" value="<?php echo date('Y-m-d'); ?>">
                        
                        <button class="btn btn-sm btn-primary" onclick="loadManpowerData()">
                            <i class="fas fa-search"></i> View
                        </button>
                        
                        <?php if (hasRole(['admin', 'creator', 'supervisor'])): ?>
                        <div class="vr mx-1"></div>
                        <button class="btn btn-sm btn-outline-success" onclick="syncApiData()">
                            <i class="fas fa-sync-alt"></i> Sync API
                        </button>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="manpower-content">
                    <div class="kpi-section-wrapper row g-3">
                        <div class="col-6 col-md-3">
                            <div class="card card-kpi bg-gradient-primary-soft p-3">
                                <span class="text-primary">Total (Selected Range)</span>
                                <h3 id="kpi-total">0</h3>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card card-kpi bg-gradient-success-soft p-3">
                                <span class="text-success">Present</span>
                                <h3 id="kpi-present">0</h3>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card card-kpi bg-gradient-danger-soft p-3">
                                <span class="text-danger">Absent</span>
                                <h3 id="kpi-absent">0</h3>
                            </div>
                        </div>
                        <div class="col-6 col-md-3">
                            <div class="card card-kpi bg-gradient-warning-soft p-3">
                                <span class="text-warning">Other</span>
                                <h3 id="kpi-other">0</h3>
                            </div>
                        </div>
                    </div>

                    <div class="table-card-wrapper shadow-sm">
                        <div class="table-scroll-area">
                            <table class="table table-hover align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Date</th> <th>ID</th>
                                        <th>Name</th>
                                        <th>Position</th>
                                        <th>Line/Dept</th>
                                        <th>Scan Time</th>
                                        <th>Status</th>
                                        <th class="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody id="manpowerTableBody"></tbody>
                            </table>
                        </div>
                        
                        <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center py-2 flex-shrink-0">
                            <small class="text-muted" id="pageInfo">Showing 0 to 0 of 0 entries</small>
                            <nav>
                                <ul class="pagination pagination-sm mb-0 justify-content-end" id="paginationControls"></ul>
                            </nav>
                        </div>
                    </div>
                </div> 
            </div> 
        </main>
    </div>

    <?php include_once('../components/php/command_center.php'); ?>
    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>

    <?php include_once('components/editLogModal.php'); ?>

    <script src="script/manpower.js?v=<?php echo filemtime('script/manpower.js'); ?>"></script>
</body>
</html>