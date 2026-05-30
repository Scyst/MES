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
        :root { --bg-light-gray: #e9ecef; }
        body { background-color: var(--bg-light-gray); overflow: hidden; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* 🟢 Global Toolbar (Tabs + Date Filter) */
        .global-toolbar {
            position: sticky; top: 0; z-index: 1020;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
            backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(0,0,0,0.08);
            padding: 0.5rem 1rem;
            display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }

        .mode-tab { border: none; background: transparent; color: #6c757d; font-weight: 600; padding: 0.4rem 0.8rem; border-bottom: 3px solid transparent; transition: all 0.2s; white-space: nowrap; font-size: 0.9rem; border-radius: 4px 4px 0 0; }
        .mode-tab:hover { color: var(--bs-primary); background: rgba(13,110,253,0.03); }
        .mode-tab.active { color: var(--bs-primary); border-bottom-color: var(--bs-primary); background: rgba(13,110,253,0.06); }

        /* Order Cards Styling */
        .order-card { border: 1px solid rgba(0,0,0,0.04); background: #fff; transition: all 0.2s cubic-bezier(0.4,0,0.2,1); border-left: 4px solid transparent; cursor: pointer; border-radius: 8px !important; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .order-card:hover { border-color: rgba(0,0,0,0.08); background-color: #f8faff; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); z-index: 2; position: relative; }
        .order-card.active { background: linear-gradient(145deg, #f0f7ff, #ffffff); border-color: var(--bs-primary); border-left-color: var(--bs-primary); box-shadow: 0 4px 15px rgba(13,110,253,0.1); }
        .status-new { border-left-color: var(--bs-danger); } 
        .status-prep { border-left-color: var(--bs-warning); } 
        .status-comp { border-left-color: var(--bs-success); opacity: 0.85; }
        .status-rej { border-left-color: var(--bs-secondary); opacity: 0.75; }
        .item-img-small { width: 45px; height: 45px; object-fit: cover; border: 1px solid var(--bs-border-color); border-radius: 4px; }
        .ph-small { width: 45px; height: 45px; background: #f0f3f8; display: flex; align-items: center; justify-content: center; border-radius: 4px; }

        @media (max-width: 991.98px) {
            body { overflow: auto; } 
            #left-pane, #right-pane { min-height: calc(100vh - 180px); padding-bottom: 70px; }
            #action-bar-mobile { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 1050; border-top: 1px solid var(--bs-border-color); background: white; padding: 10px; }
            .global-toolbar { flex-direction: column; align-items: stretch; }
            .date-filter-group { width: 100%; justify-content: space-between; }
        }
        
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.3); } 70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); } 100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); } }
        .pulse-alert { animation: pulse-red 2s infinite; border-color: var(--bs-danger); }
        .issue-qty-input { font-size: 1.1rem !important; padding: 2px !important; }
        .issue-qty-input::-webkit-outer-spin-button,
        .issue-qty-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .issue-qty-input {
            -moz-appearance: textfield; /* สำหรับ Firefox */
            text-align: center !important;
            padding: 0 !important;
        }

        /* --- Analytics Enhanced Styling --- */
        .stat-card { border: 1px solid rgba(0,0,0,0.04); border-radius: 12px; overflow: hidden; transition: all 0.3s ease; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.08); }
        .stat-icon { width: 42px; height: 42px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.5rem; }
        .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #6c757d; }
        .stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1; color: #2c3e50; }
        
        /* Advanced KPI Boxes (Vertical Stack) */
        .adv-kpi-box { 
            background: linear-gradient(135deg, #f8f9fa, #ffffff); border: 1px solid rgba(0,0,0,0.05); 
            border-radius: 10px; padding: 0.75rem 1rem; 
            display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
            height: 100%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            transition: all 0.2s;
        }
        .adv-kpi-box:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .adv-kpi-label { font-size: 0.75rem; font-weight: 700; color: #6c757d; margin-bottom: 4px; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-transform: uppercase; }
        .adv-kpi-val { font-size: 1.2rem; font-weight: 800; line-height: 1.2; }

        .chart-container-card { border: 1px solid var(--bs-border-color); background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .chart-header { padding: 0.75rem 1rem; border-bottom: 1px solid var(--bs-border-color); display: flex; justify-content: space-between; align-items: center; }
        .chart-title { font-size: 0.9rem; font-weight: 700; color: #495057; margin-bottom: 0; }
        
        /* --- Fulfillment Premium Styling --- */
        .ff-card { border: 1px solid rgba(0,0,0,0.05); border-radius: 12px; background: #ffffff; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: all 0.3s ease; }
        .ff-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.06); }
        .ff-job-item { border: none; border-bottom: 1px solid rgba(0,0,0,0.03); transition: all 0.2s cubic-bezier(0.4,0,0.2,1); margin-bottom: 4px; border-radius: 8px !important; background: #fff; }
        .ff-job-item:hover { background: #f8faff; transform: translateX(4px); box-shadow: 0 2px 8px rgba(13,110,253,0.08); }
        .ff-job-item.active { background: linear-gradient(145deg, #f0f7ff, #ffffff); border-left: 4px solid var(--bs-primary); box-shadow: inset 0 0 0 1px rgba(13, 110, 253, 0.1); }
        .ff-table { border-collapse: separate; border-spacing: 0 8px; width: 100%; }
        .ff-table thead th { border: none; text-transform: uppercase; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; color: #87929d; background: transparent; padding: 0 16px 8px 16px; }
        .ff-table tbody tr { background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.02); border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
        .ff-table tbody tr:hover { transform: scale(1.005); box-shadow: 0 4px 15px rgba(0,0,0,0.06); z-index: 2; position: relative; }
        .ff-table tbody td { border: 1px solid rgba(0,0,0,0.04); border-style: solid none; padding: 14px 16px; vertical-align: middle; background: #fff; }
        .ff-table tbody td:first-child { border-left: 1px solid rgba(0,0,0,0.04); border-top-left-radius: 10px; border-bottom-left-radius: 10px; }
        .ff-table tbody td:last-child { border-right: 1px solid rgba(0,0,0,0.04); border-top-right-radius: 10px; border-bottom-right-radius: 10px; }
        .ff-progress { height: 10px; border-radius: 6px; background: #e2e6ea; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        .ff-progress-bar { transition: width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); border-radius: 6px; }
        .ff-header-gradient { background: linear-gradient(90deg, #f1f4f9, #ffffff); border-bottom: 1px solid rgba(0,0,0,0.04); border-top-left-radius: 12px; border-top-right-radius: 12px; }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.7); z-index:2050; flex-direction:column; align-items:center; justify-content:center;">
        <div class="spinner-border text-primary mb-2" role="status"></div>
        <div class="fw-bold text-dark small">Processing...</div>
    </div>

    <?php include __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="page-container d-flex flex-column h-100">
        <main id="main-content" class="d-flex flex-column flex-grow-1 overflow-hidden">
            
            <div class="global-toolbar flex-shrink-0">
                <div class="d-flex gap-1 overflow-auto hide-scrollbar">
                    <button class="mode-tab active" id="tab-stock" onclick="switchDashboardMode('STOCK')">
                        <i class="fas fa-box me-1"></i> คิวจ่าย (Stock)
                    </button>
                    <button class="mode-tab" id="tab-k2" onclick="switchDashboardMode('K2')">
                        <i class="fas fa-shopping-cart me-1"></i> รอเปิด K2
                    </button>
                    <button class="mode-tab" id="tab-analytics" onclick="switchDashboardMode('ANALYTICS')">
                        <i class="fas fa-chart-line me-1"></i> วิเคราะห์ (Analytics)
                    </button>
                    <button class="mode-tab" id="tab-fulfillment" onclick="switchDashboardMode('FULFILLMENT')">
                        <i class="fas fa-check-double me-1"></i> ตรวจสอบยอดจ่าย (Fulfillment)
                    </button>
                </div>

                <div class="d-flex align-items-center gap-2 date-filter-group" id="global-date-filter">
                    <div class="input-group input-group-sm w-auto">
                        <span class="input-group-text bg-light text-muted fw-bold d-none d-md-block"><i class="fas fa-calendar-alt"></i></span>
                        <input type="date" id="global_start" class="form-control fw-bold text-primary" onchange="triggerGlobalReload()">
                        <span class="input-group-text bg-light text-muted border-start-0 border-end-0">-</span>
                        <input type="date" id="global_end" class="form-control fw-bold text-primary" onchange="triggerGlobalReload()">
                    </div>
                    <button class="btn btn-sm btn-primary px-2" onclick="triggerGlobalReload()" title="โหลดข้อมูลใหม่"><i class="fas fa-sync-alt"></i></button>
                    <button id="btnExportCSV" class="btn btn-sm btn-success px-3 fw-bold d-none" onclick="exportToCSV()"><i class="fas fa-file-excel me-1"></i> Export</button>
                </div>
            </div>

            <div class="p-2 p-lg-3 flex-grow-1 d-flex flex-column overflow-hidden">
                
                <div class="row g-2 h-100 flex-grow-1 px-1 px-lg-2" id="order-layout">
                    
                    <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100" id="left-pane">
                        <div class="ff-card p-3 mb-2 flex-shrink-0">
                            <label class="form-label small fw-bold text-secondary mb-1">กรองสถานะรายการ</label>
                            <select id="filter_status" class="form-select form-select-sm fw-bold border-secondary-subtle" style="border-radius: 8px;" onchange="triggerGlobalReload();">
                                <option value="ACTIVE" class="opt-stock">⚡ คิวงาน (Active)</option>
                                <option value="ALL" class="opt-stock">📦 ประวัติ (History)</option>
                                <option value="WAITING" class="opt-k2 d-none">⏳ รอเปิด K2</option>
                                <option value="K2_OPENED" class="opt-k2 d-none">✅ เปิดแล้ว (History)</option>
                            </select>
                        </div>
                        <div class="ff-card flex-grow-1 overflow-auto hide-scrollbar p-2 d-flex flex-column gap-1" style="background-color: #fcfcfc;" id="orderListContainer"></div>
                    </div>

                    <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100" id="right-pane">
                        <div class="ff-card flex-grow-1 d-flex flex-column overflow-hidden position-relative" style="background-color: #f8f9fa;">
                            
                            <div id="empty-state" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                <i class="fas fa-inbox fa-4x mb-3 text-light-gray opacity-50"></i>
                                <h5 class="fw-bold">เลือกรายการเพื่อดูรายละเอียด</h5>
                            </div>

                            <div id="form-stock" class="flex-grow-1 d-none flex-column overflow-hidden bg-transparent">
                                <div class="card border-0 shadow-sm mx-3 mt-3 mb-2 flex-shrink-0" style="border-radius: 12px; overflow: hidden;">
                                    <div class="card-header p-3 d-flex justify-content-between align-items-center border-0 rounded-top bg-dark text-white" id="header-bg">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-sm btn-light d-lg-none shadow-sm rounded-circle" onclick="switchView('list')"><i class="fas fa-arrow-left"></i></button>
                                            <div><h6 class="mb-0 fw-bold fs-5" id="disp_req_no">REQ-XXXX</h6><small class="opacity-75" id="disp_time">--/--/----</small></div>
                                        </div>
                                        <span class="badge bg-white shadow-sm px-3 py-2 rounded-pill fw-bold text-dark" id="disp_status">STATUS</span>
                                    </div>
                                    <div class="card-body p-3 bg-white rounded-bottom small">
                                        <div class="row g-2 text-center">
                                            <div class="col-4 border-end"><small class="text-muted d-block fw-bold mb-1">ผู้ขอเบิก</small><span class="fw-bold fs-6" id="disp_requester">-</span></div>
                                            <div class="col-4 border-end"><small class="text-muted d-block fw-bold mb-1">Reser No.</small><span class="fw-bold fs-6 text-primary" id="disp_reser_no">-</span></div>
                                            <div class="col-4"><small class="text-muted d-block fw-bold mb-1">หมายเหตุ</small><span class="fw-bold" id="disp_remark">-</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-3 pb-3 w-100">
                                    <div class="d-flex align-items-center gap-2 mb-3 mt-2">
                                        <i class="fas fa-tasks text-primary"></i>
                                        <span class="fw-bold text-dark fs-6">รายการวัสดุ (Pick List)</span>
                                    </div>
                                    <div id="itemsContainer" class="d-flex flex-column gap-2 mb-3"></div>
                                    <div id="issuerContainer" class="alert alert-success d-none py-3 px-4 shadow-sm border-0 rounded-3" style="background: linear-gradient(90deg, #d1e7dd, #e5f2eb); color: #0f5132;"><i class="fas fa-check-circle me-2 fs-5 align-middle"></i> จ่ายโดย: <span id="disp_issuer" class="fw-bold fs-6"></span> <span class="ms-1 opacity-75 small">(<span id="disp_issue_time"></span>)</span></div>
                                </div>
                                <div id="action-bar-mobile" class="bg-white border-top p-3 flex-shrink-0 d-flex justify-content-end gap-2 shadow-sm" style="border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;"></div>
                            </div>

                            <div id="form-k2" class="flex-grow-1 d-none flex-column overflow-hidden bg-transparent">
                                <div class="card border-0 shadow-sm mx-3 mt-3 mb-2 flex-shrink-0" style="border-radius: 12px; overflow: hidden;">
                                    <div class="card-header p-3 d-flex justify-content-between align-items-center border-0 rounded-top bg-dark text-white">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-sm btn-light d-lg-none shadow-sm rounded-circle" onclick="switchView('list')"><i class="fas fa-arrow-left"></i></button>
                                            <div><h6 class="mb-0 fw-bold fs-5"><i class="fas fa-shopping-cart me-2"></i>รอเปิด K2</h6><small class="opacity-75">Material Requisition</small></div>
                                        </div>
                                        <span class="badge bg-white shadow-sm px-3 py-2 rounded-pill fw-bold text-dark">WAITING</span>
                                    </div>
                                    <div class="card-body p-3 bg-white rounded-bottom small">
                                        <div class="row g-2 text-center align-items-center">
                                            <div class="col-4 border-end">
                                                <div id="k2_disp_img" class="mb-1"></div>
                                                <span class="fw-bold text-primary small">SAP: <span id="k2_disp_sap"></span></span>
                                            </div>
                                            <div class="col-4 border-end">
                                                <small class="text-muted d-block fw-bold mb-1">รายละเอียด (Description)</small>
                                                <div class="fw-bold text-dark text-truncate" id="k2_disp_desc" style="font-size: 0.9rem;">Description</div>
                                            </div>
                                            <div class="col-4">
                                                <small class="text-muted d-block fw-bold mb-1">รวม (ชิ้น)</small>
                                                <span class="fw-bold text-warning-emphasis fs-5" id="k2_disp_total">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-3 pb-3 w-100">
                                    <div class="d-flex align-items-center gap-2 mb-3 mt-2">
                                        <i class="fas fa-list text-warning"></i>
                                        <span class="fw-bold text-dark fs-6">รายการบิลที่รอเปิด K2</span>
                                    </div>
                                    <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                                        <table class="table mb-0 text-center align-middle w-100 bg-white">
                                            <thead class="bg-light text-muted" style="border-bottom: 2px solid #e9ecef;">
                                                <tr>
                                                    <th class="text-start ps-4 border-0 py-3 fw-bold small text-uppercase">วันที่</th>
                                                    <th class="border-0 py-3 fw-bold small text-uppercase">เลขที่บิล</th>
                                                    <th class="border-0 py-3 fw-bold small text-uppercase">ผู้เบิก</th>
                                                    <th class="text-end pe-4 border-0 py-3 fw-bold small text-uppercase">จำนวน (ชิ้น)</th>
                                                </tr>
                                            </thead>
                                            <tbody id="k2UsersList" style="border-top: none;"></tbody>
                                        </table>
                                    </div>
                                </div>
                                <div id="k2-action-bar" class="bg-white border-top p-3 flex-shrink-0 shadow-sm d-none" style="border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
                                    <div class="d-flex flex-column gap-2 w-100">
                                        <div class="d-flex gap-2">
                                            <input type="text" id="input_k2_pr" class="form-control py-2 fw-bold" placeholder="ระบุเลขที่ PR (เช่น PR-2404-0015)" style="background-color: #f8f9fa;">
                                            <button id="btnSubmitK2" class="btn btn-success fw-bold px-4 py-2 flex-shrink-0" onclick="submitK2Batch()">
                                                <i class="fas fa-check-double me-1"></i> ยืนยันบันทึก
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> 
                </div>

                <div class="row g-3 d-none overflow-auto pb-4 hide-scrollbar px-2" id="analytics-layout">
                    
                    <div class="col-6 col-lg-3 mt-3"><div class="stat-card p-3 border-start border-primary border-4"><div class="stat-label mb-2">บิลสำเร็จ</div><div class="stat-value" id="stat_total_reqs">0</div></div></div>
                    <div class="col-6 col-lg-3 mt-3"><div class="stat-card p-3 border-start border-success border-4"><div class="stat-label mb-2">จ่ายออก (ชิ้น)</div><div class="stat-value" id="stat_total_issued">0</div></div></div>
                    <div class="col-6 col-lg-3 mt-3"><div class="stat-card p-3 border-start border-warning border-4"><div class="stat-label mb-2">รอ K2 (ใบ)</div><div class="stat-value" id="stat_waiting_k2">0</div></div></div>
                    <div class="col-6 col-lg-3 mt-3"><div class="stat-card p-3 border-start border-danger border-4"><div class="stat-label mb-2">ถูกปฏิเสธ</div><div class="stat-value" id="stat_total_rejects">0</div></div></div>

                    <div class="col-12">
                        <div class="row g-3">
                            <div class="col-6 col-md-3 col-xl">
                                <div class="adv-kpi-box"><div class="adv-kpi-label"><i class="fas fa-stopwatch me-1 text-primary"></i> SLA</div><div class="adv-kpi-val text-dark" id="adv_sla">0 นาที</div></div>
                            </div>
                            <div class="col-6 col-md-3 col-xl">
                                <div class="adv-kpi-box"><div class="adv-kpi-label"><i class="fas fa-boxes me-1 text-success"></i> Fill Rate</div><div class="adv-kpi-val text-success" id="adv_fill_rate">0%</div></div>
                            </div>
                            <div class="col-6 col-md-3 col-xl">
                                <div class="adv-kpi-box"><div class="adv-kpi-label"><i class="fas fa-check-circle me-1 text-info"></i> IRA</div><div class="adv-kpi-val text-info" id="adv_ira">0%</div></div>
                            </div>
                            <div class="col-6 col-md-3 col-xl">
                                <div class="adv-kpi-box"><div class="adv-kpi-label"><i class="fas fa-exclamation-triangle me-1 text-danger"></i> Reject Rate</div><div class="adv-kpi-val text-danger" id="adv_reject_rate">0%</div></div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-xl-8">
                        <div class="chart-container-card h-100 shadow-sm border-0 d-flex flex-column">
                            <div class="ff-header-gradient p-3 d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-chart-bar text-primary me-2"></i> ปริมาณบิลเบิก (รายวัน)</h6>
                            </div>
                            <div class="p-3 flex-grow-1" style="height: 350px;">
                                <canvas id="chartTrend"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-xl-4">
                        <div class="chart-container-card h-100 shadow-sm border-0 d-flex flex-column">
                            <div class="ff-header-gradient p-3 d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-chart-pie text-success me-2"></i> สัดส่วนวัสดุที่เบิก</h6>
                            </div>
                            <div class="p-3 flex-grow-1 d-flex align-items-center justify-content-center" style="height: 350px;">
                                <canvas id="chartCategory"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-6">
                        <div class="chart-container-card shadow-sm border-0">
                            <div class="ff-header-gradient p-3">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-star text-warning me-2"></i> Top 5 วัสดุยอดฮิต</h6>
                            </div>
                            <div class="p-0">
                                <div class="p-3 pt-0" style="height: 250px;">
                                    <canvas id="chartTopItems"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-6">
                        <div class="chart-container-card shadow-sm border-0">
                            <div class="ff-header-gradient p-3">
                                <h6 class="fw-bold text-dark mb-0"><i class="fas fa-user-astronaut text-info me-2"></i> Top 5 ผู้เบิก (แผนกผลิต)</h6>
                            </div>
                            <div class="p-0">
                                <div class="p-3 pt-0" style="height: 250px;">
                                    <canvas id="chartTopUsers"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fulfillment Layout -->
                <div class="row d-none h-100 overflow-auto pb-4 hide-scrollbar" id="fulfillment-layout" style="background-color: #e9ecef; border-radius: 12px; margin: 0; padding-top: 15px;">
                    <div class="col-12 d-flex flex-column h-100 px-3">
                        
                        <!-- Toolbar -->
                        <div class="ff-card p-3 mb-3 flex-shrink-0 d-flex justify-content-end align-items-center">
                            <div class="d-flex align-items-center gap-2">
                                <i class="fas fa-filter text-muted ms-2"></i>
                                <select id="fulfill_line" class="form-select form-select-sm fw-bold border-secondary-subtle" style="min-width: 200px; border-radius: 6px;" onchange="loadActiveJobsForFulfillment()">
                                    <option value="">🌐 ทุกไลน์การผลิต</option>
                                </select>
                                <button class="btn btn-sm btn-primary px-3 shadow-sm" style="border-radius: 6px;" onclick="loadActiveJobsForFulfillment()" title="รีเฟรชข้อมูล">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Content Area -->
                        <div class="row g-3 flex-grow-1 overflow-hidden">
                            <!-- Left: Job list -->
                            <div class="col-md-4 col-lg-3 d-flex flex-column h-100">
                                <div class="ff-card h-100 d-flex flex-column shadow-sm" style="background-color: #f8f9fa; border: 1px solid rgba(0,0,0,0.08);">
                                    <div class="ff-header-gradient p-3 fw-bold text-dark d-flex align-items-center" style="border-bottom: 1px solid rgba(0,0,0,0.08);">
                                        <i class="fas fa-clipboard-list text-primary me-2"></i> คิวงาน (Active Jobs)
                                    </div>
                                    <div class="p-2 flex-grow-1 overflow-auto hide-scrollbar" id="fulfillJobList" style="max-height: calc(100vh - 250px);">
                                        <div class="p-4 text-center text-muted">กำลังโหลดข้อมูล...</div>
                                    </div>
                                </div>
                            </div>

                            <!-- Right: Table -->
                            <div class="col-md-8 col-lg-9 d-flex flex-column h-100">
                                <div class="ff-card h-100 d-flex flex-column shadow-sm" style="background-color: #ffffff; border: 1px solid rgba(0,0,0,0.08);">
                                    <div class="ff-header-gradient p-3 d-flex justify-content-between align-items-center" style="border-bottom: 1px solid rgba(0,0,0,0.08);">
                                        <div class="fw-bold text-dark">
                                            <i class="fas fa-box-open text-primary me-2"></i> รายการวัตถุดิบตามสูตร (BOM Details)
                                        </div>
                                        <div id="fulfillSelectedJobName" class="badge bg-light text-dark border px-3 py-2 fs-7 shadow-sm rounded-pill">-</div>
                                    </div>
                                    <div class="p-3 flex-grow-1 overflow-auto hide-scrollbar" style="max-height: calc(100vh - 250px); border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; background-color: #f8f9fa;">
                                        <table class="ff-table mb-0 text-center align-middle">
                                            <thead class="sticky-top" style="z-index: 1; top: -15px; background: #f8f9fa;">
                                                <tr>
                                                    <th class="text-start ps-3" style="width: 40%;">วัตถุดิบ (Material)</th>
                                                    <th>เป้าหมาย (Target)</th>
                                                    <th>จ่ายแล้ว (Issued)</th>
                                                    <th style="width: 25%;">สถานะ (Fulfillment)</th>
                                                </tr>
                                            </thead>
                                            <tbody id="fulfillmentListContainer">
                                                <tr>
                                                    <td colspan="4" class="text-center py-5 bg-transparent border-0">
                                                        <div class="text-muted d-flex flex-column align-items-center">
                                                            <i class="fas fa-mouse-pointer fs-1 mb-3 text-light-gray opacity-50"></i>
                                                            <h5>คลิกเลือกงานจากรายการด้านซ้าย</h5>
                                                            <p class="small">เพื่อดูรายการวัตถุดิบและความคืบหน้าการเบิกจ่าย</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>

    <input type="hidden" id="current_req_id">
    <input type="hidden" id="current_dashboard_mode" value="STOCK"> 
    
    <!-- Modals -->
    <?php include __DIR__ . '/components/InventoryModal.php'; ?>


    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/storeDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>