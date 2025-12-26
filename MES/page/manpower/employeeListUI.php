<?php
// page/manpower/employeeListUI.php
require_once __DIR__ . '/../components/init.php';

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

    <?php include_once('../components/php/docking_sidebar.php'); ?>
    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include_once('components/manpower_modals_bundle.php'); ?>
    
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