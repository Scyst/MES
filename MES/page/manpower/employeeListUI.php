<?php
// page/manpower/employeeListUI.php
require_once("../../auth/check_auth.php");

// ตรวจสอบสิทธิ์
if (!hasRole(['admin', 'creator', 'supervisor'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

// 1. ตั้งค่า Header Variable
$currentUser = $_SESSION['user'];
$userLine = $currentUser['line'] ?? ''; 

$pageTitle = "Employee Management";
$pageIcon = "fas fa-id-card"; // ไอคอนหัวเว็บ
$pageHeaderTitle = "Employee Management";
// แสดงรายละเอียด Line หรือ Role ใน Subtitle
$roleInfo = htmlspecialchars($currentUser['role']);
$lineInfo = $userLine ? " | Line: $userLine" : " | All Lines";
$pageHeaderSubtitle = "รายชื่อและข้อมูลพนักงาน ($roleInfo $lineInfo)";
?>

<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap" rel="stylesheet">

    <style>
        /* Override Font */
        body { font-family: 'Sarabun', sans-serif; }

        /* Loading Overlay Style (Standardized) */
        #loadingOverlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.8); z-index: 9999;
            display: none; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        [data-bs-theme="dark"] #loadingOverlay { background: rgba(0, 0, 0, 0.7); }

        .spinner-custom {
            width: 3rem; height: 3rem;
            border: 4px solid var(--bs-border-color); border-top-color: var(--bs-primary);
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Table Styles */
        .cursor-pointer { cursor: pointer; }
        .hover-bg:hover { background-color: var(--bs-tertiary-bg) !important; }
    </style>
</head>

<body class="dashboard-page layout-top-header">
    
    <div id="loadingOverlay">
        <div class="spinner-custom mb-3"></div>
        <h5 class="fw-bold text-muted">กำลังโหลดข้อมูล...</h5>
    </div>
    
    <?php include('../components/php/top_header.php'); ?>
    
    <main id="main-content">
        <div class="container-fluid p-3" style="max-width: 1600px;">
            
            <div class="card border-0 shadow-sm mb-3 flex-shrink-0" style="background-color: var(--bs-secondary-bg);">
                <div class="card-body py-3">
                    <div class="row align-items-center g-3">
                        <div class="col-md-6 col-lg-5">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted ps-3">
                                    <i class="fas fa-search"></i>
                                </span>
                                <input type="text" id="searchInput" class="form-control border-start-0 bg-body ps-2 py-2 fw-bold" 
                                       placeholder="ค้นหา (รหัส, ชื่อ, ทีม, แผนก)...">
                            </div>
                        </div>

                        <div class="col-md-6 col-lg-7 d-flex justify-content-md-end align-items-center gap-3">
                            <span class="text-muted small d-none d-lg-inline">
                                <i class="fas fa-info-circle me-1"></i> คลิกที่แถวเพื่อแก้ไขข้อมูล
                            </span>
                            
                            <a href="manpowerUI.php" class="btn btn-sm btn-outline-primary fw-bold px-3">
                                <i class="fas fa-arrow-left me-2"></i>Back to Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card border-0 shadow-sm h-100"> <div class="card-header bg-transparent border-0 pt-3 pb-2 d-flex justify-content-between align-items-center">
                     <h6 class="fw-bold mb-0"><i class="fas fa-users me-2"></i>Employee Directory</h6>
                     <div class="text-end">
                         </div>
                </div>

                <div class="card-body p-0 d-flex flex-column">
                    <div class="table-responsive flex-grow-1">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="bg-light sticky-top" style="top: 0; z-index: 5;">
                                <tr class="text-uppercase small text-muted">
                                    <th class="py-3 ps-4 pe-3" style="width: 150px;">Emp ID</th>
                                    <th class="py-3">Name / Dept</th>
                                    <th class="py-3 text-center" style="width: 100px;">Team</th>
                                    <th class="py-3 text-center" style="width: 150px;">Line (System)</th>
                                    <th class="py-3 text-center" style="width: 150px;">Default Shift</th>
                                    <th class="py-3 text-center" style="width: 120px;">Status</th>
                                </tr>
                            </thead>
                            <tbody id="empTableBody" class="border-top-0">
                                </tbody>
                        </table>
                    </div>
                </div>

                <div class="card-footer bg-white border-top py-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <small class="text-muted" id="pageInfo">Showing 0 entries</small>
                        <nav>
                            <ul class="pagination pagination-sm mb-0 justify-content-end" id="paginationControls"></ul>
                        </nav>
                    </div>
                </div>
            </div>

        </div>
    </main>

    <div class="modal fade" id="editEmpModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow rounded-4">
                <div class="modal-header bg-primary text-white py-2">
                    <h6 class="modal-title fw-bold"><i class="fas fa-user-edit me-2"></i>Edit Employee Info</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4">
                    <form id="editEmpForm">
                        <div class="mb-3">
                            <label class="form-label text-muted small fw-bold text-uppercase">Employee Name</label>
                            <input type="text" class="form-control form-control-lg fw-bold px-2 bg-light border-0" id="modalEmpName" readonly>
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
                                <label class="form-label small fw-bold text-primary">Team</label>
                                <select class="form-select fw-bold text-primary" id="modalTeam">
                                    <option value="">-</option>
                                    <option value="A">Team A</option>
                                    <option value="B">Team B</option>
                                    <option value="C">Team C</option>
                                    <option value="D">Team D</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="form-label small fw-bold">Default Shift</label>
                            <select class="form-select" id="modalShift">
                                <option value="">-- Select Shift --</option>
                            </select>
                        </div>

                        <div class="form-check form-switch p-3 bg-light rounded border d-flex align-items-center">
                            <input class="form-check-input ms-0 me-3" type="checkbox" id="modalActive" checked style="width: 2.5em; height: 1.25em;">
                            <div>
                                <label class="form-check-label fw-bold d-block" for="modalActive">Active Status</label>
                                <small class="text-muted" style="font-size: 0.75rem;">ปิดการใช้งานหากพนักงานลาออก</small>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-light border-0 py-2">
                    <button type="button" class="btn btn-sm btn-light border" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-sm btn-primary fw-bold px-3" onclick="saveEmployee()">
                        <i class="fas fa-save me-2"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    </div>

    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    
    <script src="script/employeeList.js?v=<?php echo time(); ?>"></script>
    
    <script>
        // Override Standard Functions
        function showSpinner() { document.getElementById('loadingOverlay').style.display = 'flex'; }
        function hideSpinner() { document.getElementById('loadingOverlay').style.display = 'none'; }
        
        // Simple Toast Function
        function showToast(message, color = '#333') {
            // เช็คว่ามี container หรือยัง
            let toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                toastContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1060;';
                document.body.appendChild(toastContainer);
            }
            
            const toastEl = document.createElement('div');
            toastEl.className = 'toast align-items-center text-white border-0 show mb-2 shadow';
            toastEl.style.backgroundColor = color;
            toastEl.innerHTML = `
                <div class="d-flex">
                    <div class="toast-body">${message}</div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>`;
            
            toastContainer.appendChild(toastEl);
            
            // Auto remove
            setTimeout(() => {
                toastEl.classList.remove('show');
                setTimeout(() => toastEl.remove(), 300);
            }, 3000);
        }
    </script>
</body>
</html>