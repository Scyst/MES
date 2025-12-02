<?php
// page/manpower/employeeListUI.php
require_once("../../auth/check_auth.php");

if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}
$pageTitle = "Employee Management";
$currentUser = $_SESSION['user'];
$userLine = $currentUser['line'] ?? ''; 
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link rel="stylesheet" href="../dailyLog/css/portal.css?v=<?php echo time(); ?>"> 
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        /* Shared Styles matching manpowerUI */
        html, body.dashboard-page { font-family: 'Sarabun', sans-serif; height: auto !important; min-height: 100vh; overflow-y: auto !important; }
        .page-container { height: auto !important; overflow: visible !important; display: block !important; }
        #main-content { margin-left: 70px !important; width: calc(100% - 70px) !important; height: auto !important; min-height: 100vh; overflow: visible !important; padding-bottom: 50px; }
        #sidebar-toggle-btn { display: inline-flex !important; }
        
        .report-header { 
            background-color: var(--bs-secondary-bg); 
            padding: 1rem 1.5rem; 
            border-bottom: 1px solid var(--bs-border-color); 
            position: sticky; top: 0; z-index: 1020; 
        }
        
        .chart-box { 
            background: var(--bs-secondary-bg); 
            border: 1px solid var(--bs-border-color); 
            border-radius: 16px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.02); 
            display: flex; flex-direction: column; 
            min-height: 500px; 
        }

        .cursor-pointer { cursor: pointer; }
        .hover-bg:hover { background-color: var(--bs-tertiary-bg) !important; }

        /* Custom for this page */
        .search-box-container { max-width: 400px; }
    </style>
</head>
<body class="dashboard-page">
    
    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.8); z-index: 9999; flex-direction: column; align-items: center; justify-content: center;">
        <div class="spinner-border text-primary mb-3" role="status" style="width: 3rem; height: 3rem;"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>
    
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>
    
    <div class="page-container">
        <?php include_once('../components/php/nav_dropdown.php'); ?>
        
        <main id="main-content">
            <div class="report-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <span class="badge bg-primary bg-opacity-10 text-primary me-3 p-2 fs-4 rounded-3">
                        <i class="fas fa-users-cog"></i>
                    </span>
                    <div class="d-flex align-items-baseline flex-wrap">
                        <span class="fw-bold fs-4 text-body">
                            Manpower Management
                        </span>
                        <span class="text-muted small ms-2 border-start ps-2" style="border-color: #dee2e6 !important;">
                            <?php echo htmlspecialchars($currentUser['role']); ?> 
                            <?php echo $userLine ? " | Line: $userLine" : " | All Lines"; ?>
                        </span>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-2">
                    <a href="manpowerUI.php" class="btn btn-light btn-sm text-primary fw-bold border ms-2 rounded-pill px-3">
                        Manpower <i class="fas fa-users-cog ms-1"></i>
                    </a>
                    <span class="d-none d-md-inline text-muted small me-3">
                        <i class="far fa-clock me-1"></i> <?php echo date('d F Y'); ?>
                    </span>
                    <button class="btn btn-link text-secondary p-0 me-3" id="page-theme-btn" title="Switch Theme">
                        <i class="fas fa-adjust fa-lg"></i>
                    </button>
                </div>
            </div>
            
            <div class="container-fluid p-4" style="max-width: 1600px;">
                
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <div class="search-box-container w-100">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0 text-muted ps-3"><i class="fas fa-search"></i></span>
                            <input type="text" id="searchInput" class="form-control border-start-0 bg-white ps-0 py-2" placeholder="ค้นหาพนักงาน (รหัส, ชื่อ, ทีม, แผนก)...">
                        </div>
                    </div>
                    <div class="text-muted small d-none d-md-block">
                        <i class="fas fa-info-circle me-1"></i> คลิกที่แถวเพื่อแก้ไขข้อมูล
                    </div>
                </div>

                <div class="chart-box">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light sticky-top" style="z-index: 5;">
                                <tr class="text-uppercase small text-muted">
                                    <th class="py-3 ps-4 pe-3" style="width: 180px;">Emp ID</th>
                                    
                                    <th class="py-3">Name / Dept</th>
                                    <th class="py-3 text-center" style="width: 100px;">Team</th>
                                    <th class="py-3 text-center" style="width: 150px;">Line (System)</th>
                                    <th class="py-3 text-center" style="width: 150px;">Default Shift</th>
                                    <th class="py-3 text-center" style="width: 100px;">Status</th>
                                </tr>
                            </thead>
                            <tbody id="empTableBody" class="border-top-0">
                                </tbody>
                        </table>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center p-3 border-top bg-white rounded-bottom">
                        <small class="text-muted" id="pageInfo">Showing 0 entries</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0 justify-content-end" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <div class="modal fade" id="editEmpModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title fw-bold"><i class="fas fa-user-edit me-2"></i>Edit Employee Info</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="editEmpForm">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold">Employee Name</label>
                            <input type="text" class="form-control form-control-plaintext fw-bold px-2" id="modalEmpName" readonly>
                            <input type="hidden" id="modalEmpId">
                        </div>
                        
                        <div class="row g-3 mb-3">
                            <div class="col-8">
                                <label class="form-label small fw-bold">Line / Section</label>
                                <select class="form-select" id="modalLine">
                                    <option value="">Loading lines...</option>
                                </select>
                            </div>
                            <div class="col-4">
                                <label class="form-label small fw-bold text-primary">Team Group</label>
                                <select class="form-select fw-bold text-primary" id="modalTeam">
                                    <option value="">-</option>
                                    <option value="A">Team A</option>
                                    <option value="B">Team B</option>
                                    <option value="C">Team C</option>
                                    <option value="D">Team D</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label class="form-label small fw-bold">Default Shift</label>
                            <select class="form-select" id="modalShift">
                                <option value="">-- Select Shift --</option>
                            </select>
                        </div>

                        <div class="form-check form-switch p-3 bg-light rounded border">
                            <input class="form-check-input ms-0 me-3" type="checkbox" id="modalActive" checked>
                            <label class="form-check-label fw-bold" for="modalActive">Active Status</label>
                            <div class="text-muted small mt-1">ปิดการใช้งานหากพนักงานลาออกหรือย้ายแผนก</div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light border-0">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary fw-bold px-4" onclick="saveEmployee()">
                        <i class="fas fa-save me-2"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script src="script/employeeList.js?v=<?php echo time(); ?>"></script>
    
    <script>
        function showToast(message, color = '#333') {
            let toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                toastContainer.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1060;';
                document.body.appendChild(toastContainer);
            }
            const toastEl = document.createElement('div');
            toastEl.className = 'toast align-items-center text-white border-0 show mb-2';
            toastEl.style.backgroundColor = color;
            toastEl.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`;
            toastContainer.appendChild(toastEl);
            setTimeout(() => toastEl.remove(), 3000);
        }
    </script>
</body>
</html>