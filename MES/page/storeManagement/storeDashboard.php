<?php
// page/store/storedashboard.php
require_once __DIR__ . '/../components/init.php';

$pageTitle = "Store Dashboard | ระบบจัดการออเดอร์เบิกจ่าย";
$pageHeaderTitle = "Store Dashboard";
$pageHeaderSubtitle = "ระบบจัดการคิวและจ่ายวัสดุอุปกรณ์ (KDS)";
$pageIcon = "fas fa-store";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <?php include_once __DIR__ . '/../components/common_head.php'; ?> 
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    <style>
        :root { --bg-light-gray: #f4f6f9; }
        body { background-color: var(--bg-light-gray); overflow: hidden; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Main Mode Tabs */
        .mode-tab { border: none; background: transparent; color: #6c757d; font-weight: 600; padding: 0.75rem 1rem; border-bottom: 3px solid transparent; transition: all 0.2s; white-space: nowrap; }
        .mode-tab:hover { color: #0d6efd; }
        .mode-tab.active { color: #0d6efd; border-bottom-color: #0d6efd; }

        /* Left Pane Order Cards */
        .order-card { border: 1px solid #eef2f6; border-radius: 12px; background: #fff; transition: all 0.2s; border-left: 5px solid transparent; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
        .order-card:hover { transform: translateX(3px); border-color: #0d6efd; }
        .order-card.active { background-color: #f0f7ff; border-color: #0d6efd; }
        
        .status-new { border-left-color: #dc3545; } 
        .status-prep { border-left-color: #ffc107; } 
        .status-comp { border-left-color: #198754; opacity: 0.7; }
        .status-rej { border-left-color: #6c757d; opacity: 0.6; filter: grayscale(100%); }

        .item-img-small { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid #eee; }
        .ph-small { width: 50px; height: 50px; border-radius: 8px; background: #f0f3f8; display: flex; align-items: center; justify-content: center; }

        @media (max-width: 991.98px) {
            body { overflow: auto; } 
            .mobile-flex-grow { flex-grow: 0 !important; }
            #left-pane, #right-pane { min-height: calc(100vh - 180px); padding-bottom: 80px; }
            #action-bar-mobile { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 1050; box-shadow: 0 -4px 20px rgba(0,0,0,0.1); padding-bottom: calc(15px + env(safe-area-inset-bottom)); background: white; }
            .mode-tab { padding: 0.6rem; font-size: 0.85rem; }
        }
        
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); } }
        .pulse-alert { animation: pulse-red 2s infinite; }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:2050; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2" style="width: 3rem; height: 3rem;"></div>
        <div class="fw-bold text-dark fs-5">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <div class="page-container d-flex flex-column h-100">
        
        <main id="main-content" class="d-flex flex-column flex-grow-1 overflow-hidden">
            
            <div class="bg-white border-bottom px-2 px-lg-4 d-flex gap-1 gap-md-4 overflow-auto hide-scrollbar shadow-sm flex-shrink-0" style="z-index: 1020;">
                <button class="mode-tab active" id="tab-stock" onclick="switchDashboardMode('STOCK')">
                    <i class="fas fa-box me-1"></i> <span class="d-none d-sm-inline">คิวจ่ายของ</span><span class="d-sm-none">คิวจ่าย</span>
                </button>
                <button class="mode-tab" id="tab-k2" onclick="switchDashboardMode('K2')">
                    <i class="fas fa-shopping-cart me-1"></i> รอเปิด K2
                </button>
                <button class="mode-tab text-info" id="tab-analytics" onclick="switchDashboardMode('ANALYTICS')">
                    <i class="fas fa-chart-bar me-1"></i> สถิติ
                </button>
            </div>

            <div class="p-2 p-lg-3 flex-grow-1 mobile-flex-grow d-flex flex-column overflow-hidden">
                
                <div class="row g-3 h-100 flex-grow-1" id="order-layout">
                    
                    <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100" id="left-pane">
                        <div class="bg-white border rounded-3 shadow-sm p-2 mb-2 flex-shrink-0">
                            <div class="d-flex justify-content-between align-items-center">
                                <select id="filter_status" class="form-select form-select-sm shadow-sm fw-bold border-secondary-subtle" style="flex-grow: 1; margin-right: 5px;" onchange="toggleDateFilter(); loadActiveQueue();">
                                    <option value="ACTIVE" class="opt-stock">⚡ เฉพาะที่ต้องจัด (Active)</option>
                                    <option value="ALL" class="opt-stock">📦 ประวัติเบิกทั้งหมด (History)</option>
                                    <option value="WAITING" class="opt-k2 d-none">⏳ รอสโตร์เปิด K2</option>
                                    <option value="K2_OPENED" class="opt-k2 d-none">✅ เปิด K2 แล้ว (History)</option>
                                </select>
                                <button class="btn btn-sm btn-primary shadow-sm px-3 fw-bold" onclick="loadActiveQueue()">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                            
                            <div id="date_filter_container" class="row g-1 mt-2 pt-2 border-top d-none">
                                <div class="col-6">
                                    <small class="text-muted fw-bold" style="font-size: 0.65rem;">ตั้งแต่</small>
                                    <input type="date" id="filter_start" class="form-control form-control-sm text-center fw-bold text-primary" onchange="loadActiveQueue()">
                                </div>
                                <div class="col-6">
                                    <small class="text-muted fw-bold" style="font-size: 0.65rem;">ถึง</small>
                                    <input type="date" id="filter_end" class="form-control form-control-sm text-center fw-bold text-primary" onchange="loadActiveQueue()">
                                </div>
                            </div>
                        </div>

                        <div class="list-group list-group-flush border rounded-3 shadow-sm flex-grow-1 overflow-auto hide-scrollbar bg-white p-2 gap-2" id="orderListContainer"></div>
                    </div>

                    <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100" id="right-pane">
                        <div class="bg-white border rounded-3 shadow-sm flex-grow-1 d-flex flex-column overflow-hidden position-relative">
                            
                            <div id="empty-state" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                <i class="fas fa-hand-pointer fa-4x mb-3 text-primary"></i>
                                <h4 class="fw-bold">เลือกรายการด้านซ้ายเพื่อดูรายละเอียด</h4>
                            </div>

                            <div id="form-stock" class="flex-grow-1 d-none flex-column overflow-hidden bg-light">
                                <div class="card border-0 shadow-sm m-2 m-md-3 flex-shrink-0">
                                    <div class="card-header bg-dark text-white p-3 d-flex justify-content-between align-items-center border-0 rounded-top" id="header-bg">
                                        <div class="d-flex align-items-center gap-3">
                                            <button class="btn btn-sm btn-light text-dark d-lg-none rounded-circle shadow-sm" onclick="switchView('list')" style="width: 32px; height: 32px; padding: 0;"><i class="fas fa-arrow-left"></i></button>
                                            <div><h5 class="mb-0 fw-bold" id="disp_req_no">REQ-XXXX</h5><small class="opacity-75" id="disp_time"><i class="far fa-clock"></i> --/--/----</small></div>
                                        </div>
                                        <span class="badge bg-white text-dark fs-6 shadow-sm" id="disp_status">STATUS</span>
                                    </div>
                                    <div class="card-body p-3 bg-white rounded-bottom">
                                        <div class="row g-2">
                                            <div class="col-12 col-md-6 border-end-md pb-2 pb-md-0"><small class="text-muted d-block"><i class="fas fa-user me-1"></i> ผู้ขอเบิก</small><span class="fw-bold text-primary fs-6" id="disp_requester">-</span></div>
                                            <div class="col-12 col-md-6"><small class="text-muted d-block"><i class="fas fa-comment-dots me-1"></i> หมายเหตุ</small><span class="fw-bold text-dark" id="disp_remark">-</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-2 px-md-3 pb-3 w-100">
                                    <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-clipboard-list me-2"></i>รายการวัสดุ (Pick List)</h6>
                                    <div id="itemsContainer" class="d-flex flex-column gap-2 mb-3"></div>
                                    <div id="issuerContainer" class="alert alert-success d-none shadow-sm border-0"><h6 class="fw-bold mb-1"><i class="fas fa-check-circle me-1"></i> ทำรายการเสร็จสิ้น</h6><small class="d-block text-dark">จ่ายของโดย: <span id="disp_issuer" class="fw-bold"></span></small><small class="d-block text-dark">เวลา: <span id="disp_issue_time" class="fw-bold"></span></small></div>
                                </div>
                                <div id="action-bar-mobile" class="bg-white border-top p-3 flex-shrink-0 d-flex justify-content-end gap-2 shadow-lg" style="z-index: 1020;"></div>
                            </div>

                            <div id="form-k2" class="flex-grow-1 d-none flex-column overflow-hidden bg-light">
                                <div class="card border-0 shadow-sm m-2 m-md-3 flex-shrink-0 border-top border-warning border-4">
                                    <div class="card-body p-3 bg-white rounded">
                                        <div class="d-flex align-items-center gap-3">
                                            <button class="btn btn-sm btn-light text-dark d-lg-none rounded-circle shadow-sm border" onclick="switchView('list')" style="width: 32px; height: 32px; padding: 0;"><i class="fas fa-arrow-left"></i></button>
                                            <div id="k2_disp_img"></div>
                                            <div class="flex-grow-1">
                                                <h5 class="fw-bold text-dark mb-1" id="k2_disp_desc">Item Description</h5>
                                                <span class="text-primary fw-bold">SAP: <span id="k2_disp_sap"></span></span>
                                            </div>
                                            <div class="text-center bg-warning bg-opacity-10 border border-warning rounded p-2 px-4">
                                                <small class="text-dark fw-bold d-block">ยอดรวมขอสั่งซื้อ</small>
                                                <span class="fs-4 fw-bold text-warning-emphasis" id="k2_disp_total">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-2 px-md-3 pb-3 w-100">
                                    <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-users me-2"></i>รายชื่อผู้ขอเบิก (Requestors)</h6>
                                    <div class="table-responsive bg-white rounded-3 shadow-sm border">
                                        <table class="table table-hover mb-0 align-middle">
                                            <thead class="table-light text-muted small">
                                                <tr><th>วันที่ขอเบิก</th><th>บิลอ้างอิง</th><th>ผู้เบิก</th><th class="text-end">จำนวน</th></tr>
                                            </thead>
                                            <tbody id="k2UsersList"></tbody>
                                        </table>
                                    </div>
                                </div>

                                <div id="k2-action-bar" class="bg-white border-top p-3 flex-shrink-0 shadow-lg" style="z-index: 1020;">
                                    <label class="fw-bold text-dark mb-2"><i class="fas fa-keyboard me-1 text-primary"></i> กรอกเลขที่ใบขอซื้อ (K2 PR Number) เพื่อยืนยัน</label>
                                    <div class="input-group input-group-lg shadow-sm">
                                        <span class="input-group-text bg-light text-muted border-end-0"><i class="fas fa-file-invoice"></i></span>
                                        <input type="text" id="input_k2_pr" class="form-control border-start-0 text-primary fw-bold" placeholder="เช่น PR-2404-0015">
                                        <button class="btn btn-warning text-dark fw-bold px-4 px-md-5" onclick="submitK2Batch()"><i class="fas fa-check-circle me-2"></i>อัปเดต K2</button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div> 

                </div>

                <div class="row g-3 d-none h-100 overflow-auto pb-4 hide-scrollbar" id="analytics-layout">
                    <div class="col-12 d-flex flex-wrap justify-content-between align-items-center bg-white p-3 rounded-3 shadow-sm border gap-2 flex-shrink-0">
                        <div class="d-flex align-items-center gap-2">
                            <input type="date" id="analytic_start" class="form-control fw-bold text-primary">
                            <span class="fw-bold text-muted">ถึง</span>
                            <input type="date" id="analytic_end" class="form-control fw-bold text-primary">
                            <button class="btn btn-primary fw-bold px-3" onclick="loadAnalytics()"><i class="fas fa-search"></i></button>
                        </div>
                        <button class="btn btn-success fw-bold px-4 shadow-sm" onclick="exportToCSV()"><i class="fas fa-file-excel me-2"></i>Export Data</button>
                    </div>

                    <div class="col-12 col-md-4 flex-shrink-0">
                        <div class="card bg-primary text-white border-0 shadow-sm h-100">
                            <div class="card-body text-center py-4">
                                <h6 class="fw-bold opacity-75 mb-1">บิลเบิกจ่ายสำเร็จ</h6><h2 class="fw-bold mb-0" id="stat_total_reqs">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4 flex-shrink-0">
                        <div class="card bg-success text-white border-0 shadow-sm h-100">
                            <div class="card-body text-center py-4">
                                <h6 class="fw-bold opacity-75 mb-1">จำนวนชิ้นที่จ่ายออก</h6><h2 class="fw-bold mb-0" id="stat_total_issued">0</h2>
                            </div>
                        </div>
                    </div>
                    <div class="col-12 col-md-4 flex-shrink-0">
                        <div class="card bg-warning text-dark border-0 shadow-sm h-100">
                            <div class="card-body text-center py-4">
                                <h6 class="fw-bold opacity-75 mb-1">รายการรอเปิด K2</h6><h2 class="fw-bold mb-0" id="stat_waiting_k2">0</h2>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-6 flex-shrink-0">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-white border-bottom pt-3 pb-2"><h6 class="fw-bold text-dark"><i class="fas fa-chart-pie me-2 text-primary"></i>5 อันดับวัสดุเบิกเยอะสุด (จำนวนชิ้น)</h6></div>
                            <div class="card-body"><canvas id="chartTopItems" height="250"></canvas></div>
                        </div>
                    </div>
                    <div class="col-12 col-lg-6 flex-shrink-0">
                        <div class="card border-0 shadow-sm h-100">
                            <div class="card-header bg-white border-bottom pt-3 pb-2"><h6 class="fw-bold text-dark"><i class="fas fa-user-chart me-2 text-info"></i>5 อันดับผู้เบิกบ่อยสุด (จำนวนบิล)</h6></div>
                            <div class="card-body"><canvas id="chartTopUsers" height="250"></canvas></div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <input type="hidden" id="current_req_id">
    <input type="hidden" id="current_dashboard_mode" value="STOCK"> 
    
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/storedashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>