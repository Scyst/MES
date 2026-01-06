<?php
// page/sales/shipping_loading.php
define('ALLOW_GUEST_ACCESS', true);
require_once __DIR__ . '/../components/init.php';

// --- Auth Logic ---
$isStaff = isset($_SESSION['user']) && ($_SESSION['user']['role'] !== 'CUSTOMER');
$isGuestAuth = isset($_SESSION['guest_access']) && $_SESSION['guest_access'] === true;
$isLocked = !isset($_SESSION['user']) && !$isGuestAuth; 
$isCustomer = (!$isStaff); 

$pageTitle = "Shipping Schedule Control";
$pageIcon = "fas fa-truck-loading"; 
$pageHeaderTitle = "Shipping Schedule";
$pageHeaderSubtitle = "ตารางแผนการโหลดตู้และสถานะขนส่ง";
$pageHelpId = "helpModal";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?> 
    
    <link rel="stylesheet" href="css/salesDashboard.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
    
    <?php if ($isLocked): ?>
    <style>
        body { overflow: hidden; }
        .page-container, header, .mobile-menu, .docking-sidebar { 
            filter: blur(8px); 
            pointer-events: none; 
            user-select: none;
        }
    </style>
    <?php endif; ?>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div class="spinner-border text-light mb-3" role="status"></div>
        <h5 class="fw-bold text-white">Processing...</h5>
    </div>

    <?php if ($isLocked): ?>
    <div class="modal fade show" id="gatekeeperModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true" style="display: block; background-color: #f8f9fa; z-index: 10000;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-body p-5 text-center">
                    <div class="mb-4">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-inline-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                            <i class="fas fa-lock fa-3x"></i>
                        </div>
                    </div>
                    <h3 class="fw-bold mb-2">Restricted Access</h3>
                    <p class="text-muted mb-4">กรุณากรอกรหัสผ่านเพื่อเข้าดูตาราง Shipping</p>
                    
                    <form onsubmit="event.preventDefault(); verifyPasscode();">
                        <div class="mb-3">
                            <input type="password" id="guestPasscode" class="form-control form-control-lg text-center" placeholder="Enter Passcode" required autofocus>
                        </div>
                        <button type="submit" class="btn btn-primary w-100 btn-lg fw-bold shadow-sm">
                            เข้าสู่ระบบ <i class="fas fa-arrow-right ms-2"></i>
                        </button>
                    </form>
                    <div id="passcodeError" class="text-danger mt-3 small" style="display:none;">
                        <i class="fas fa-exclamation-circle me-1"></i> รหัสผ่านไม่ถูกต้อง
                    </div>
                </div>
                <div class="modal-footer justify-content-center bg-light border-0">
                    <a href="../../auth/login_form.php" class="small text-decoration-none text-muted">สำหรับพนักงาน (Staff Login)</a>
                </div>
            </div>
        </div>
    </div>
    <?php endif; ?>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            <div class="content-wrapper pt-3">
                
                <div class="row g-2 mb-3">
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-danger h-100" id="defaultCard" onclick="filterTable('TODAY')" style="cursor:pointer;">
                            <div class="card-body p-3" style="background: linear-gradient(to bottom, #ffffff 80%, #fbecec 100%);">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-danger small fw-bold mb-1"><i class="fas fa-exclamation-circle me-1"></i>Today & Backlog</div>
                                        <h2 class="text-danger fw-bold mb-0" id="kpi-today">0</h2>
                                        <div class="small text-danger fw-bold mt-1" id="kpi-backlog-sub" style="font-size: 0.75rem;">Inc. 0 Delays</div>
                                    </div>
                                    <div class="bg-danger bg-opacity-10 text-danger p-3 rounded-circle"><i class="fas fa-calendar-day fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-info h-100" onclick="filterTable('7DAYS')" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-info small fw-bold mb-1">Next 7 Days</div>
                                        <h2 class="text-info fw-bold mb-0" id="kpi-7days">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">Upcoming Plan</div>
                                    </div>
                                    <div class="bg-info bg-opacity-10 text-info p-3 rounded-circle"><i class="fas fa-calendar-week fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-warning h-100" onclick="filterTable('WAIT_LOADING')" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-warning small fw-bold mb-1">Wait Loading</div>
                                        <h2 class="text-warning fw-bold mb-0" id="kpi-wait-load">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">Ready at Dock</div>
                                    </div>
                                    <div class="bg-warning bg-opacity-10 text-warning p-3 rounded-circle"><i class="fas fa-dolly fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-primary h-100" onclick="filterTable('ACTIVE')" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-primary small fw-bold mb-1">Total Active</div>
                                        <h2 class="text-primary fw-bold mb-0" id="kpi-active">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">In Progress</div>
                                    </div>
                                    <div class="bg-primary bg-opacity-10 text-primary p-3 rounded-circle"><i class="fas fa-clipboard-list fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-6 col-md-4 col-lg-20-percent">
                        <div class="card shadow-sm kpi-card border-secondary h-100" onclick="filterTable('ALL')" style="cursor:pointer;">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="text-uppercase text-secondary small fw-bold mb-1">All Orders</div>
                                        <h2 class="text-secondary fw-bold mb-0" id="kpi-total">0</h2>
                                        <div class="small text-muted mt-1" style="font-size: 0.75rem;">History</div>
                                    </div>
                                    <div class="bg-secondary bg-opacity-10 text-secondary p-3 rounded-circle"><i class="fas fa-history fa-lg"></i></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 mb-3">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 400px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search PO, SKU, Container...">
                                </div>
                                
                                <?php if (!$isCustomer): ?>
                                <a href="salesDashboard.php" class="btn btn-outline-secondary btn-sm fw-bold shadow-sm d-flex align-items-center me-2" title="กลับไปหน้า Sales Dashboard">
                                    <i class="fas fa-clipboard-list me-2"></i> Sales Dashboard
                                </a>
                                <?php endif; ?>
                                
                                <button class="btn btn-outline-secondary btn-sm" onclick="loadData()" title="Refresh"><i class="fas fa-sync-alt"></i></button>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <?php if (!$isCustomer): ?>
                                <input type="file" id="csv_file" style="display:none;" onchange="uploadFile()">
                                <button class="btn btn-light btn-sm shadow-sm" onclick="document.getElementById('csv_file').click()"><i class="fas fa-file-import me-1"></i> Import</button>
                                <?php endif; ?>
                                <button class="btn btn-success btn-sm shadow-sm" onclick="exportToCSV()"><i class="fas fa-file-excel me-1"></i> Export</button>
                                <?php if ($isCustomer): ?>
                                <button class="btn btn-warning btn-sm shadow-sm text-dark fw-bold" onclick="guestLogout()" title="ออกจากระบบ / ล็อคหน้าจอ">
                                    <i class="fas fa-lock me-1"></i> Lock
                                </button>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 table-card h-100">
                    <div class="table-responsive-custom">
                        <table class="table table-bordered table-hover mb-0 text-nowrap align-middle shipping-table">
                            <thead class="bg-light sticky-top">
                                <tr class="text-center">
                                    <th class="sticky-col-left-1">Load</th>
                                    <th class="sticky-col-left-2">Prod</th>
                                    <th class="sticky-col-left-3">PO Number</th>
                                    <th>Week</th>
                                    <th>Status</th>
                                    <th>Inspect Type</th>
                                    <th>Inspect Res</th>
                                    <th>SNC Load Day / Time</th>
                                    <th>DC</th>
                                    <th>SKU</th>
                                    <th>Booking No.</th>
                                    <th>Invoice</th>
                                    <th>Description</th>
                                    <th>Q'ty (Pcs)</th>
                                    <th>CTN Size</th>
                                    <th>Container No.</th>
                                    <th>Seal No.</th>
                                    <th>Tare</th>
                                    <th>N.W.</th>
                                    <th>G.W.</th>
                                    <th>CBM</th>
                                    <th>Feeder Vsl</th>
                                    <th>Mother Vsl</th>
                                    <th>SNC CI No.</th>
                                    <th>SI/VGM Cut</th>
                                    <th>Pickup Date</th>
                                    <th>Return Date</th>
                                    <th style="background-color: rgb(255 249 230)">ETD</th>
                                    <th>Remark</th>
                                    <th class="sticky-col-right-2 text-danger">Cutoff Date</th>
                                    <th class="sticky-col-right-1 text-danger">Cutoff Time</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody" class="bg-white"></tbody>
                        </table>
                    </div>
                    <div id="paginationContainer" class="py-2 px-3 border-top bg-light"></div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow border-0">
                <div class="modal-header bg-light">
                    <h5 class="modal-title fw-bold">สรุปการนำเข้าข้อมูล</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="mb-3">
                        <h1 class="display-4 fw-bold text-primary" id="importSuccessCount">0</h1>
                        <p class="text-muted">รายการอัปเดตสำเร็จ</p>
                    </div>
                    <div id="importErrorSection" class="text-start d-none">
                        <div class="alert alert-warning py-2">พบปัญหา <span id="importSkipCount">0</span> รายการ:</div>
                        <textarea id="importErrorLog" class="form-control text-danger bg-light" rows="5" readonly style="font-size:0.8rem"></textarea>
                    </div>
                    <div id="importAllSuccess" class="text-success d-none">
                        <i class="fas fa-check-circle fa-3x mb-2"></i><br>นำเข้าสำเร็จครบถ้วน
                    </div>
                </div>
                <div class="modal-footer"><button class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง</button></div>
            </div>
        </div>
    </div>

    <?php include 'components/helpModalShipping.php'; ?>

    <script>
        const isCustomer = <?php echo json_encode($isCustomer); ?>;
    </script>
    
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
    <script src="../../utils/libs/xlsx.full.min.js"></script>
    <script src="script/shipping_loading.js?v=<?php echo time(); ?>"></script>
</body>
</html>