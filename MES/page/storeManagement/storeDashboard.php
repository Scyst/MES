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

        /* Navigation Tabs with Glassmorphism */
        .mode-tab-container {
            position: sticky; top: 0; z-index: 1020;
            background-color: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--bs-border-color);
            display: flex; gap: 4px; padding: 0 1rem;
        }
        .mode-tab { 
            border: none; background: transparent; color: #6c757d; 
            font-weight: 600; padding: 0.6rem 1rem; 
            border-bottom: 3px solid transparent; transition: all 0.15s; 
            white-space: nowrap; font-size: 0.85rem; 
        }
        .mode-tab:hover { color: var(--bs-primary); }
        .mode-tab.active { color: var(--bs-primary); border-bottom-color: var(--bs-primary); }

        /* Order Cards Styling */
        .order-card { 
            border: 1px solid var(--bs-border-color); 
            background: #fff; transition: all 0.15s; 
            border-left: 4px solid transparent; cursor: pointer; 
        }
        .order-card:hover { border-color: var(--bs-primary); background-color: #f8f9fa; }
        .order-card.active { background-color: #eef6ff; border-color: var(--bs-primary); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        
        .status-new { border-left-color: var(--bs-danger); } 
        .status-prep { border-left-color: var(--bs-warning); } 
        .status-comp { border-left-color: var(--bs-success); opacity: 0.8; }
        .status-rej { border-left-color: var(--bs-secondary); opacity: 0.7; }

        .item-img-small { width: 45px; height: 45px; object-fit: cover; border: 1px solid var(--bs-border-color); border-radius: 4px; }
        .ph-small { width: 45px; height: 45px; background: #f0f3f8; display: flex; align-items: center; justify-content: center; border-radius: 4px; }

        @media (max-width: 991.98px) {
            body { overflow: auto; } 
            #left-pane, #right-pane { min-height: calc(100vh - 160px); padding-bottom: 70px; }
            #action-bar-mobile { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 1050; border-top: 1px solid var(--bs-border-color); background: white; padding: 10px; }
        }
        
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.3); } 70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); } }
        .pulse-alert { animation: pulse-red 2s infinite; border-color: var(--bs-danger); }

        .issue-qty-input { font-size: 1.1rem !important; padding: 2px !important; }
        .transition-hover { transition: transform 0.15s; }
        .transition-hover:hover { transform: translateY(-2px); }

        /* --- Analytics Enhanced Styling --- */
        .stat-card {
            border: none;
            border-radius: 8px;
            overflow: hidden;
            transition: all 0.2s ease;
            background: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.04);
        }
        .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            margin-bottom: 0.75rem;
        }
        .stat-label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #6c757d;
        }
        .stat-value {
            font-size: 1.75rem;
            font-weight: 800;
            line-height: 1;
            color: #2c3e50;
        }
        .chart-container-card {
            border: 1px solid var(--bs-border-color);
            background: #fff;
            border-radius: 8px;
        }
        .chart-header {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--bs-border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .chart-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: #495057;
            margin-bottom: 0;
        }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.7); z-index:2050; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <div class="fw-bold text-dark small">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>
    <?php include __DIR__ . '/../components/php/mobile_menu.php'; ?>

    <div class="page-container d-flex flex-column h-100">
        
        <main id="main-content" class="d-flex flex-column flex-grow-1 overflow-hidden">
            
            <div class="mode-tab-container flex-shrink-0">
                <button class="mode-tab active" id="tab-stock" onclick="switchDashboardMode('STOCK')">
                    <i class="fas fa-box me-1"></i> คิวจ่าย (Stock)
                </button>
                <button class="mode-tab" id="tab-k2" onclick="switchDashboardMode('K2')">
                    <i class="fas fa-shopping-cart me-1"></i> รอเปิด K2
                </button>
                <button class="mode-tab" id="tab-analytics" onclick="switchDashboardMode('ANALYTICS')">
                    <i class="fas fa-chart-bar me-1"></i> Analytics
                </button>
            </div>

            <div class="p-2 p-lg-3 flex-grow-1 d-flex flex-column overflow-hidden">
                
                <div class="row g-2 h-100 flex-grow-1" id="order-layout">
                    
                    <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100" id="left-pane">
                        <div class="bg-white border rounded shadow-sm p-2 mb-2">
                            <div class="d-flex gap-1">
                                <select id="filter_status" class="form-select form-select-sm fw-bold border-secondary-subtle" onchange="toggleDateFilter(); loadActiveQueue();">
                                    <option value="ACTIVE" class="opt-stock">⚡ คิวงาน (Active)</option>
                                    <option value="ALL" class="opt-stock">📦 ประวัติ (History)</option>
                                    <option value="WAITING" class="opt-k2 d-none">⏳ รอเปิด K2</option>
                                    <option value="K2_OPENED" class="opt-k2 d-none">✅ เปิดแล้ว (History)</option>
                                </select>
                                <button class="btn btn-sm btn-primary px-2" onclick="loadActiveQueue()"><i class="fas fa-sync-alt"></i></button>
                            </div>
                            
                            <div id="date_filter_container" class="row g-1 mt-2 pt-2 border-top d-none">
                                <div class="col-6">
                                    <input type="date" id="filter_start" class="form-control form-control-sm text-center fw-bold" onchange="loadActiveQueue()">
                                </div>
                                <div class="col-6">
                                    <input type="date" id="filter_end" class="form-control form-control-sm text-center fw-bold" onchange="loadActiveQueue()">
                                </div>
                            </div>
                        </div>

                        <div class="list-group list-group-flush border rounded shadow-sm flex-grow-1 overflow-auto hide-scrollbar bg-white p-1 gap-1" id="orderListContainer"></div>
                    </div>

                    <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100" id="right-pane">
                        <div class="bg-white border rounded shadow-sm flex-grow-1 d-flex flex-column overflow-hidden position-relative">
                            
                            <div id="empty-state" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                <i class="fas fa-inbox fa-4x mb-3"></i>
                                <h5 class="fw-bold">เลือกรายการเพื่อดูรายละเอียด</h5>
                            </div>

                            <div id="form-stock" class="flex-grow-1 d-none flex-column overflow-hidden bg-light">
                                <div class="card border-0 shadow-sm m-2 flex-shrink-0">
                                    <div class="card-header bg-dark text-white p-2 d-flex justify-content-between align-items-center border-0 rounded-top" id="header-bg">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-sm btn-light d-lg-none" onclick="switchView('list')"><i class="fas fa-arrow-left"></i></button>
                                            <div><h6 class="mb-0 fw-bold" id="disp_req_no">REQ-XXXX</h6><small class="opacity-75" id="disp_time">--/--/----</small></div>
                                        </div>
                                        <span class="badge bg-white text-dark small" id="disp_status">STATUS</span>
                                    </div>
                                    <div class="card-body p-2 bg-white rounded-bottom small">
                                        <div class="row g-1">
                                            <div class="col-6 border-end"><small class="text-muted d-block fw-bold">ผู้ขอเบิก</small><span class="fw-bold" id="disp_requester">-</span></div>
                                            <div class="col-6"><small class="text-muted d-block fw-bold">หมายเหตุ</small><span id="disp_remark">-</span></div>
                                        </div>
                                    </div>
                                </div>

                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-2 pb-2 w-100">
                                    <small class="fw-bold text-secondary d-block mb-2 ms-1">รายการวัสดุ (Pick List)</small>
                                    <div id="itemsContainer" class="d-flex flex-column gap-1 mb-2"></div>
                                    <div id="issuerContainer" class="alert alert-success d-none py-2 px-3 small border-0 shadow-sm">
                                        <i class="fas fa-check-circle me-1"></i> จ่ายโดย: <span id="disp_issuer" class="fw-bold"></span> (<span id="disp_issue_time"></span>)
                                    </div>
                                </div>

                                <div id="action-bar-mobile" class="bg-white border-top p-2 flex-shrink-0 d-flex justify-content-end gap-2 shadow-sm"></div>
                            </div>

                            <div id="form-k2" class="flex-grow-1 d-none flex-column overflow-hidden bg-light">
                                <div class="card border-0 shadow-sm m-2 flex-shrink-0 border-top border-warning border-3">
                                    <div class="card-body p-2 bg-white rounded">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-sm btn-light d-lg-none border" onclick="switchView('list')"><i class="fas fa-arrow-left"></i></button>
                                            <div id="k2_disp_img"></div>
                                            <div class="flex-grow-1 min-w-0">
                                                <h6 class="fw-bold text-dark mb-0 text-truncate" id="k2_disp_desc">Description</h6>
                                                <small class="text-primary fw-bold">SAP: <span id="k2_disp_sap"></span></small>
                                            </div>
                                            <div class="text-center bg-warning bg-opacity-10 border border-warning rounded p-1 px-3">
                                                <small class="text-dark small d-block">รวม</small>
                                                <span class="fw-bold text-warning-emphasis" id="k2_disp_total">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-2 pb-2 w-100">
                                    <table class="table table-sm table-hover bg-white rounded shadow-sm border small">
                                        <thead class="table-light"><tr><th>วันที่</th><th>บิล</th><th>ผู้เบิก</th><th class="text-end">จำนวน</th></tr></thead>
                                        <tbody id="k2UsersList"></tbody>
                                    </table>
                                </div>
                                <div id="k2-action-bar" class="bg-white border-top p-2 flex-shrink-0 shadow-sm d-none">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-light">K2 PR</span>
                                        <input type="text" id="input_k2_pr" class="form-control fw-bold" placeholder="เช่น PR-2404-0015">
                                        <button class="btn btn-warning fw-bold px-3" onclick="submitK2Batch()">อัปเดต</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> 
                </div>

                <div class="row g-3 d-none h-100 overflow-auto pb-4 hide-scrollbar" id="analytics-layout">
                    <div class="col-12">
                        <div class="bg-white p-2 rounded shadow-sm border d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div class="input-group input-group-sm w-auto" style="min-width: 320px;">
                                <span class="input-group-text bg-light fw-bold small">ช่วงเวลา</span>
                                <input type="date" id="analytic_start" class="form-control fw-bold text-primary">
                                <span class="input-group-text bg-light text-muted"><i class="fas fa-arrow-right"></i></span>
                                <input type="date" id="analytic_end" class="form-control fw-bold text-primary">
                                <button class="btn btn-primary px-3" onclick="loadAnalytics()"><i class="fas fa-sync-alt"></i></button>
                            </div>
                            <button class="btn btn-sm btn-success fw-bold px-3" onclick="exportToCSV()">
                                <i class="fas fa-file-excel me-1"></i> Export Data
                            </button>
                        </div>
                    </div>

                    <div class="col-6 col-lg-3">
                        <div class="stat-card p-3 border-bottom border-primary border-4">
                            <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-file-invoice"></i></div>
                            <div class="stat-label">บิลเบิกที่สำเร็จ</div>
                            <div class="stat-value" id="stat_total_reqs">0</div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="stat-card p-3 border-bottom border-success border-4">
                            <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="fas fa-boxes"></i></div>
                            <div class="stat-label">จำนวนจ่ายออกรวม</div>
                            <div class="stat-value" id="stat_total_issued">0</div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="stat-card p-3 border-bottom border-warning border-4">
                            <div class="stat-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-clock"></i></div>
                            <div class="stat-label">รายการค้างเปิด K2</div>
                            <div class="stat-value" id="stat_waiting_k2">0</div>
                        </div>
                    </div>
                    <div class="col-6 col-lg-3">
                        <div class="stat-card p-3 border-bottom border-danger border-4">
                            <div class="stat-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-ban"></i></div>
                            <div class="stat-label">บิลที่ถูกปฏิเสธ</div>
                            <div class="stat-value" id="stat_total_rejects">0</div>
                        </div>
                    </div>

                    <div class="col-12 col-xl-8">
                        <div class="chart-container-card h-100">
                            <div class="chart-header">
                                <h6 class="chart-title"><i class="fas fa-chart-line me-2 text-primary"></i>แนวโน้มการเบิกจ่ายรายวัน</h6>
                                <small class="text-muted">จำนวนบิล/วัน</small>
                            </div>
                            <div class="p-3" style="height: 350px;"><canvas id="chartTrend"></canvas></div>
                        </div>
                    </div>

                    <div class="col-12 col-xl-4">
                        <div class="chart-container-card h-100">
                            <div class="chart-header">
                                <h6 class="chart-title"><i class="fas fa-chart-pie me-2 text-success"></i>สัดส่วนตามหมวดหมู่</h6>
                            </div>
                            <div class="p-3 d-flex align-items-center justify-content-center" style="height: 350px;">
                                <canvas id="chartCategory"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-6">
                        <div class="chart-container-card">
                            <div class="chart-header">
                                <h6 class="chart-title"><i class="fas fa-award me-2 text-warning"></i>5 อันดับวัสดุเบิกสูงสุด (Qty)</h6>
                            </div>
                            <div class="p-3" style="height: 300px;"><canvas id="chartTopItems"></canvas></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="chart-container-card">
                            <div class="chart-header">
                                <h6 class="chart-title"><i class="fas fa-user-tag me-2 text-info"></i>5 อันดับผู้เบิกสูงสุด (บิล)</h6>
                            </div>
                            <div class="p-3" style="height: 300px;"><canvas id="chartTopUsers"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <input type="hidden" id="current_req_id">
    <input type="hidden" id="current_dashboard_mode" value="STOCK"> 
    
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/storeDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>