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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        :root { 
            --bg-body: #f1f5f9; 
            --text-main: #1e293b;
            --text-muted: #64748b;
            --primary-color: #3b82f6;
            --primary-light: rgba(59, 130, 246, 0.1);
            --card-bg: #ffffff;
            --border-soft: rgba(0, 0, 0, 0.08);
            --shadow-soft: 0 2px 4px rgba(0,0,0,0.04);
            --shadow-hover: 0 8px 16px rgba(0,0,0,0.08);
            --radius-md: 8px;
            --radius-lg: 12px;
        }
        body { background-color: var(--bg-body); overflow: hidden; font-family: 'Sarabun', 'Inter', sans-serif; color: var(--text-main); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* 🟢 Global Toolbar (Tabs + Date Filter) */
        .global-toolbar {
            position: sticky; top: 0; z-index: 1020;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--border-soft);
            padding: 0.6rem 1rem;
            display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }

        .mode-tab { 
            border: 1px solid transparent; background: transparent; color: var(--text-muted); 
            font-weight: 600; padding: 0.4rem 1rem; margin-right: 0.3rem;
            transition: all 0.2s ease; 
            white-space: nowrap; font-size: 0.9rem; border-radius: 8px; 
        }
        .mode-tab:hover { color: var(--primary-color); background: var(--bg-body); border-color: var(--border-soft); }
        .mode-tab.active { 
            color: var(--primary-color); background: var(--primary-light); 
            border-color: rgba(59, 130, 246, 0.2); font-weight: 700;
        }

        /* Order Cards Styling (Left Pane) */
        .order-card { 
            border: 1px solid var(--border-soft); background: var(--card-bg); 
            transition: all 0.2s ease; 
            border-left: 4px solid transparent; cursor: pointer; 
            border-radius: var(--radius-md) !important; margin-bottom: 6px; 
            box-shadow: var(--shadow-soft); 
            padding: 0.8rem 1rem !important;
        }
        .order-card:hover { 
            background-color: #fafafa; transform: translateY(-2px); 
            box-shadow: var(--shadow-hover); z-index: 2; position: relative; 
            border-color: rgba(0, 0, 0, 0.12);
        }
        .order-card.active { 
            background: #f8fafc; 
            border-color: var(--border-soft); border-left-color: var(--primary-color); 
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08); 
        }
        .status-new { border-left-color: #0d6efd; } 
        .status-prep { border-left-color: #ffc107; } 
        .status-comp { border-left-color: #198754; opacity: 0.9; }
        .status-rej { border-left-color: #dc3545; opacity: 0.8; }
        
        .item-img-small { width: 45px; height: 45px; object-fit: cover; border: 1px solid var(--border-soft); border-radius: 6px; }
        .ph-small { width: 45px; height: 45px; background: #e2e8f0; display: flex; align-items: center; justify-content: center; border-radius: 6px; }

        @media (max-width: 991.98px) {
            body { overflow: auto; } 
            #left-pane, #right-pane { min-height: calc(100vh - 180px); padding-bottom: 80px; }
            #action-bar-mobile { position: fixed; bottom: 0; left: 0; width: 100%; z-index: 1050; border-top: 1px solid var(--border-soft); background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); padding: 12px; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
            .global-toolbar { flex-direction: column; align-items: stretch; }
            .date-filter-group { width: 100%; justify-content: space-between; }
        }
        
        @keyframes pulse-blue { 0% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.3); } 70% { box-shadow: 0 0 0 8px rgba(13, 110, 253, 0); } 100% { box-shadow: 0 0 0 0 rgba(13, 110, 253, 0); } }
        .pulse-alert { animation: pulse-blue 2s infinite; border-color: var(--bs-primary); }
        .issue-qty-input { font-size: 1.1rem !important; padding: 2px !important; border-radius: 6px; border: 1px solid var(--border-soft); background: #f8f9fa; }
        .issue-qty-input::-webkit-outer-spin-button, .issue-qty-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .issue-qty-input { -moz-appearance: textfield; text-align: center !important; padding: 0 !important; font-weight: 700; color: var(--text-main); }

        /* --- Analytics Enhanced Styling --- */
        .stat-card { border: 1px solid var(--border-soft); border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s ease; background: var(--card-bg); box-shadow: var(--shadow-soft); position: relative; z-index: 1; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.12); }
        .stat-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; margin-bottom: 0.6rem; background: var(--bg-body); }
        .stat-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); }
        .stat-value { font-size: 1.8rem; font-weight: 800; line-height: 1.1; color: var(--text-main); }
        
        .adv-kpi-box { 
            background: var(--card-bg); border: 1px solid var(--border-soft); 
            border-radius: var(--radius-md); padding: 0.8rem 1rem; 
            display: flex; flex-direction: column; justify-content: center;
            height: 100%; box-shadow: var(--shadow-soft); transition: all 0.2s;
        }
        .adv-kpi-box:hover { transform: translateY(-2px); box-shadow: var(--shadow-hover); border-color: rgba(0,0,0,0.12); }
        .adv-kpi-label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; }
        .adv-kpi-val { font-size: 1.2rem; font-weight: 800; color: var(--text-main); }

        .chart-container-card { border: 1px solid var(--border-soft); background: var(--card-bg); border-radius: var(--radius-lg); box-shadow: var(--shadow-soft); overflow: hidden; }
        .chart-header { padding: 0.8rem 1.2rem; border-bottom: 1px solid var(--border-soft); display: flex; justify-content: space-between; align-items: center; }
        .chart-title { font-size: 0.95rem; font-weight: 700; color: var(--text-main); margin-bottom: 0; }
        
        /* --- Premium Container Classes --- */
        .ff-card { border: 1px solid var(--border-soft); border-radius: var(--radius-lg); background: var(--card-bg); box-shadow: var(--shadow-soft); transition: all 0.2s ease; }
        .ff-job-item { border: 1px solid var(--border-soft); margin-bottom: 6px; border-radius: var(--radius-md) !important; background: var(--card-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.02); transition: all 0.2s ease; }
        .ff-job-item:hover { background: #fafafa; transform: translateX(3px); border-color: rgba(0,0,0,0.1); box-shadow: 0 3px 10px rgba(0,0,0,0.05); }
        .ff-job-item.active { background: #f8fafc; border-left: 4px solid var(--primary-color); border-color: var(--border-soft); }
        
        .ff-table { border-collapse: separate; border-spacing: 0 6px; width: 100%; }
        .ff-table thead th { border: none; text-transform: uppercase; font-size: 0.75rem; font-weight: 700; color: var(--text-muted); background: transparent; padding: 0 12px 6px 12px; }
        .ff-table tbody tr { background: var(--card-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.03); border: 1px solid var(--border-soft); border-radius: var(--radius-md); transition: transform 0.2s, box-shadow 0.2s; }
        .ff-table tbody tr:hover { transform: scale(1.005); box-shadow: 0 4px 12px rgba(0,0,0,0.06); z-index: 2; position: relative; border-color: rgba(0,0,0,0.1); }
        .ff-table tbody td { border-top: 1px solid var(--border-soft); border-bottom: 1px solid var(--border-soft); padding: 12px 16px; vertical-align: middle; background: transparent; }
        .ff-table tbody td:first-child { border-left: 1px solid var(--border-soft); border-top-left-radius: var(--radius-md); border-bottom-left-radius: var(--radius-md); }
        .ff-table tbody td:last-child { border-right: 1px solid var(--border-soft); border-top-right-radius: var(--radius-md); border-bottom-right-radius: var(--radius-md); }
        
        .ff-progress { height: 8px; border-radius: 6px; background: #e2e8f0; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        .ff-progress-bar { transition: width 0.8s ease; border-radius: 6px; background: var(--primary-color); }
        .ff-header-gradient { background: #f8fafc; border-bottom: 1px solid var(--border-soft); border-top-left-radius: var(--radius-lg); border-top-right-radius: var(--radius-lg); }

        /* General Refinements */
        .card { border-radius: var(--radius-lg) !important; border: 1px solid var(--border-soft); box-shadow: var(--shadow-soft) !important; }
        .card-header { border-bottom: 1px solid var(--border-soft) !important; background: #f8fafc; }
        .form-select, .form-control, .input-group-text { border-radius: 6px; border: 1px solid #cbd5e1; padding: 0.25rem 0.6rem; font-size: 0.85rem; font-weight: 500; transition: all 0.2s; height: 32px; display: flex; align-items: center; }
        .form-select:focus, .form-control:focus { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); border-color: var(--primary-color); }
        .btn { border-radius: 6px; font-weight: 600; padding: 0.25rem 0.8rem; font-size: 0.85rem; transition: all 0.2s; height: 32px; display: inline-flex; align-items: center; justify-content: center; }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 6px rgba(0,0,0,0.08); }
        .badge { padding: 0.4em 0.8em; font-weight: 700; border-radius: 6px; font-size: 0.75rem; }
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
                <div class="d-flex gap-1 overflow-auto hide-scrollbar w-100 pe-2" style="flex-wrap: nowrap; -webkit-overflow-scrolling: touch;">
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
                    <div class="input-group w-auto">
                        <span class="input-group-text bg-light text-muted fw-bold d-none d-md-block"><i class="fas fa-calendar-alt"></i></span>
                        <input type="date" id="global_start" class="form-control fw-bold text-primary" onchange="triggerGlobalReload()">
                        <span class="input-group-text bg-light text-muted border-start-0 border-end-0">-</span>
                        <input type="date" id="global_end" class="form-control fw-bold text-primary" onchange="triggerGlobalReload()">
                    </div>
                    <button class="btn btn-primary px-3" onclick="triggerGlobalReload()" title="โหลดข้อมูลใหม่"><i class="fas fa-sync-alt"></i></button>
                    <button id="btnExportCSV" class="btn btn-success px-3 fw-bold d-none" onclick="exportToCSV()"><i class="fas fa-file-excel me-1"></i> Export</button>
                </div>
            </div>

            <div class="p-2 p-lg-3 flex-grow-1 d-flex flex-column overflow-hidden">
                
                <div class="row g-2 h-100 flex-grow-1 px-1 px-lg-2" id="order-layout">
                    
                    <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100" id="left-pane">
                        <div class="ff-card p-3 mb-2 flex-shrink-0">
                            <label class="form-label small fw-bold text-secondary mb-1">กรองสถานะรายการ</label>
                            <select id="filter_status" class="form-select form-select-sm fw-bold border-secondary-subtle" onchange="triggerGlobalReload();">
                                <option value="ACTIVE" class="opt-stock">⚡ คิวงานทั้งหมด (Active)</option>
                                <option value="ALL" class="opt-stock">📦 ประวัติทั้งหมด (History)</option>
                                <option value="NEW ORDER" class="opt-stock">🔵 บิลใหม่ (New)</option>
                                <option value="PREPARING" class="opt-stock">🟡 กำลังเตรียม (Prepare)</option>
                                <option value="COMPLETED" class="opt-stock">🟢 สำเร็จ (Complete)</option>
                                <option value="REJECTED" class="opt-stock">🔴 ปฏิเสธ (Reject)</option>
                                <option value="WAITING" class="opt-k2 d-none">⏳ รอเปิด K2</option>
                                <option value="K2_OPENED" class="opt-k2 d-none">✅ เปิดแล้ว (History)</option>
                            </select>
                        </div>
                        <div class="ff-card flex-grow-1 overflow-auto hide-scrollbar p-3 d-flex flex-column gap-2" id="orderListContainer"></div>
                    </div>

                    <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100" id="right-pane">
                        <div class="ff-card flex-grow-1 d-flex flex-column overflow-hidden position-relative">
                            
                            <div id="empty-state" class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                <i class="fas fa-inbox fa-4x mb-3 text-light-gray opacity-50"></i>
                                <h5 class="fw-bold">เลือกรายการเพื่อดูรายละเอียด</h5>
                            </div>

                            <div id="form-stock" class="flex-grow-1 d-none flex-column overflow-hidden bg-transparent">
                                <div class="card border-0 shadow-sm mx-3 mt-3 mb-2 flex-shrink-0">
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
                                            <div class="col-4 border-end"><small class="text-muted d-block fw-bold mb-1">Internal Job No.</small><span class="fw-bold fs-6 text-primary" id="disp_internal_job">-</span></div>
                                            <div class="col-4"><small class="text-muted d-block fw-bold mb-1">หมายเหตุ</small><span class="fw-bold" id="disp_remark">-</span></div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-3 pb-3 w-100">
                                    <div class="d-flex align-items-center justify-content-between mb-3 mt-2">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="fas fa-tasks text-primary"></i>
                                            <span class="fw-bold text-dark fs-6">รายการวัสดุ (Pick List)</span>
                                        </div>
                                        <div class="d-none d-flex align-items-center gap-2" id="globalScannerContainer">
                                            <!-- Camera Scanner Button (Mobile Friendly) -->
                                            <button class="btn btn-outline-primary btn-sm rounded shadow-sm d-flex align-items-center justify-content-center" style="width:32px; height:32px; padding:0;" onclick="openOrderCameraScanner()" title="สแกนด้วยกล้อง">
                                                <i class="fas fa-camera"></i>
                                            </button>
                                            <!-- USB Scanner Input -->
                                            <div class="input-group shadow-sm" style="border-radius: 6px; overflow: hidden; max-width: 180px;">
                                                <span class="input-group-text bg-white border-secondary-subtle text-primary border-end-0 px-2"><i class="fas fa-barcode"></i></span>
                                                <input type="text" id="globalScannerInput" class="form-control border-secondary-subtle border-start-0 fw-bold px-1" placeholder="ยิงบาร์โค้ด..." autocomplete="off" style="font-size: 0.8rem; box-shadow: none;">
                                            </div>
                                        </div>
                                    </div>
                                    <div id="itemsContainer" class="d-flex flex-column gap-2 mb-3"></div>
                                    <div id="issuerContainer" class="alert alert-success d-none py-3 px-4 shadow-sm border-0 rounded-3" style="background: linear-gradient(90deg, #d1e7dd, #e5f2eb); color: #0f5132;"><i class="fas fa-check-circle me-2 fs-5 align-middle"></i> จ่ายโดย: <span id="disp_issuer" class="fw-bold fs-6"></span> <span class="ms-1 opacity-75 small">(<span id="disp_issue_time"></span>)</span></div>
                                </div>
                                <div id="action-bar-mobile" class="bg-white border-top p-3 flex-shrink-0 d-flex justify-content-end gap-2 shadow-sm" style="border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);"></div>
                            </div>

                            <div id="form-k2" class="flex-grow-1 d-none flex-column overflow-hidden bg-transparent">
                                <div class="card border-0 shadow-sm mx-3 mt-3 mb-2 flex-shrink-0">
                                    <div class="card-header p-3 d-flex justify-content-between align-items-center border-0 rounded-top bg-dark text-white">
                                        <div class="d-flex align-items-center gap-2">
                                            <button class="btn btn-sm btn-light d-lg-none shadow-sm rounded-circle" onclick="switchView('list')"><i class="fas fa-arrow-left"></i></button>
                                            <div><h6 class="mb-0 fw-bold fs-5"><i class="fas fa-shopping-cart me-2"></i>รอเปิด K2</h6><small class="opacity-75">Material Requisition</small></div>
                                        </div>
                                        <span class="badge bg-white shadow-sm px-3 py-2 rounded-pill fw-bold text-dark">WAITING</span>
                                    </div>
                                    <div class="card-body p-3 bg-white rounded-bottom small">
                                        <div class="row g-2 text-center">
                                            <div class="col-4 border-end">
                                                <div id="k2_disp_img" class="d-none"></div>
                                                <small class="text-muted d-block fw-bold mb-1">รหัสวัสดุ (SAP)</small>
                                                <span class="fw-bold fs-6 text-primary" id="k2_disp_sap">-</span>
                                            </div>
                                            <div class="col-4 border-end">
                                                <small class="text-muted d-block fw-bold mb-1">รายละเอียดวัสดุ</small>
                                                <div class="fw-bold fs-6 text-dark text-truncate px-2" id="k2_disp_desc">-</div>
                                            </div>
                                            <div class="col-4">
                                                <small class="text-muted d-block fw-bold mb-1">รวม (ชิ้น)</small>
                                                <span class="fw-bold fs-6 text-warning-emphasis" id="k2_disp_total">0</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex-grow-1 overflow-auto hide-scrollbar px-3 pb-3 w-100">
                                    <div class="card border-0 shadow-sm mt-3">
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
                                <div id="k2-action-bar" class="bg-white border-top p-3 flex-shrink-0 d-none" style="border-bottom-left-radius: var(--radius-lg); border-bottom-right-radius: var(--radius-lg);">
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
                <!-- Fulfillment Layout -->
                <div class="row g-2 d-none h-100 flex-grow-1 px-1 px-lg-2" id="fulfillment-layout">
                    
                    <div class="col-12 col-lg-4 col-xl-3 d-flex flex-column h-100">
                        <div class="ff-card p-3 mb-2 flex-shrink-0">
                            <label class="form-label small fw-bold text-secondary mb-1">กรองไลน์การผลิต</label>
                            <div class="d-flex align-items-center gap-2">
                                <select id="fulfill_line" class="form-select form-select-sm fw-bold border-secondary-subtle" onchange="loadActiveJobsForFulfillment()">
                                    <option value="">🌐 ทุกไลน์การผลิต</option>
                                </select>
                                <button class="btn btn-sm btn-primary px-3 shadow-sm" style="border-radius: 8px;" onclick="loadActiveJobsForFulfillment()" title="รีเฟรชข้อมูล">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        <div class="ff-card flex-grow-1 overflow-auto hide-scrollbar p-3 d-flex flex-column gap-2" id="fulfillJobList">
                            <div class="p-4 text-center text-muted">กำลังโหลดข้อมูล...</div>
                        </div>
                    </div>

                    <div class="col-12 col-lg-8 col-xl-9 d-none d-lg-flex flex-column h-100">
                        <div class="ff-card flex-grow-1 d-flex flex-column overflow-hidden position-relative" style="background-color: #f8f9fa;">
                            
                            <div class="card border-0 shadow-sm mx-3 mt-3 mb-2 flex-shrink-0" style="border-radius: 12px; overflow: hidden;">
                                <div class="card-header p-3 d-flex justify-content-between align-items-center border-0 rounded-top bg-dark text-white">
                                    <div class="fw-bold fs-5">
                                        <i class="fas fa-box-open text-primary me-2"></i> รายการวัตถุดิบตามสูตร (BOM Details)
                                    </div>
                                    <span id="fulfillSelectedJobName" class="badge bg-white text-dark shadow-sm px-3 py-2 rounded-pill fw-bold">-</span>
                                </div>
                            </div>
                            <div class="flex-grow-1 overflow-auto hide-scrollbar px-3 pb-3 w-100">
                                <div class="card border-0 shadow-sm" style="border-radius: 12px; overflow: hidden;">
                                    <table class="table mb-0 text-center align-middle w-100 bg-white">
                                        <thead class="bg-light text-muted" style="border-bottom: 2px solid #e9ecef;">
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
        </main>
    </div>

    <input type="hidden" id="current_req_id">
    <input type="hidden" id="current_dashboard_mode" value="STOCK"> 
    
    <!-- Modals -->
    <?php include __DIR__ . '/components/InventoryModal.php'; ?>


    <!-- Camera Scanner Modal -->
    <div class="modal fade" id="orderCameraModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-dark text-white py-2 px-3">
                    <h6 class="modal-title fw-bold mb-0"><i class="fas fa-camera me-2"></i> สแกนด้วยกล้อง</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-2 bg-black d-flex justify-content-center align-items-center" style="min-height: 300px;">
                    <div id="order-qr-reader" class="w-100 h-100"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="../../utils/libs/html5-qrcode.min.js"></script>
    <script src="script/storeCommon.js?v=<?php echo filemtime(__DIR__ . '/script/storeCommon.js'); ?>"></script>
    <script src="script/storeDashboard.js?v=<?php echo filemtime(__DIR__ . '/script/storeDashboard.js'); ?>" defer></script>
</body>
</html>