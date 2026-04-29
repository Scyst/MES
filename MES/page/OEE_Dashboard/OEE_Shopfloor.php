<?php
//MES/page/OEE_Dashboard/OEE_Shopfloor.php
define('ALLOW_GUEST_ACCESS', true);

require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/../../auth/check_auth.php';

$pageTitle = 'Production Live Board';
$pageHeaderTitle = 'Production Monitor';
$pageIcon = 'fas fa-tv';
$pageHeaderSubtitle = 'ติดตามสถานะการผลิตและยอดขายแบบเรียลไทม์ (Shop Floor View)';
?>

<!DOCTYPE html>
<html lang="en" data-bs-theme="light">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    <style>
        html, body.layout-top-header { height: auto !important; min-height: 100vh; overflow-x: hidden; overflow-y: auto !important; background-color: #f8f9fa; }
        .page-container, #main-content { height: auto !important; min-height: 100%; overflow: visible !important; }
        .dashboard-toolbar { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .dashboard-toolbar select, .dashboard-toolbar input[type="date"] { font-family: 'Prompt', sans-serif; font-size: 0.85rem; border-radius: 6px; }
        .chart-card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.03); transition: all 0.3s ease; height: 100%; display: flex; flex-direction: column; }
        .gauge-container { height: 110px !important; position: relative; width: 100%; display: flex; justify-content: center; }
        
        .table-responsive { max-height: 400px; overflow-y: auto; }
        .data-bar-cell { position: relative; z-index: 1; text-align: right; padding-right: 12px !important; vertical-align: middle; font-weight: 600; }
        .data-bar-bg { position: absolute; top: 20%; left: 0; height: 60%; background-color: #f1f5f9; z-index: -1; border-radius: 0 4px 4px 0; }
        .data-bar-fill { position: absolute; top: 20%; left: 0; height: 60%; z-index: -1; border-radius: 0 4px 4px 0; transition: width 0.8s ease-out; }
        .fill-fg { background-color: rgba(25, 135, 84, 0.2); border-right: 3px solid rgba(25, 135, 84, 0.9); }
        .fill-hold { background-color: rgba(253, 126, 20, 0.2); border-right: 3px solid rgba(253, 126, 20, 0.9); }
        .fill-scrap { background-color: rgba(220, 53, 69, 0.2); border-right: 3px solid rgba(220, 53, 69, 0.9); }
        
        .metric-mini-box { background: #f8f9fa; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; text-align: center; border: 1px solid #e9ecef; }
        .metric-mini-label { color: #6c757d; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;}
        .metric-mini-value { font-weight: 700; color: #212529; font-size: 0.85rem; }
        
        @keyframes pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(25, 135, 84, 0); }
            100% { box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
        }

        @keyframes pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
            70% { box-shadow: 0 0 0 6px rgba(220, 53, 69, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        .live-indicator.offline { background-color: #dc3545 !important; animation: pulse-red 2s infinite !important; }
        .live-text.offline { color: #dc3545 !important; }
        .live-indicator { width: 10px; height: 10px; background-color: #198754; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; margin-right: 8px; }

        .sf-card { border-radius: 16px; border-left: 6px solid #e2e8f0; text-align: center; padding: 20px !important; justify-content: center; }
        .sf-card.revenue { border-color: #0d6efd; background: linear-gradient(180deg, #ffffff 0%, #eff6ff 100%); }
        .sf-card.good { border-color: #198754; background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%); }
        .sf-card.hold { border-color: #fd7e14; background: linear-gradient(180deg, #ffffff 0%, #fff7ed 100%); }
        .sf-card.scrap { border-color: #dc3545; background: linear-gradient(180deg, #ffffff 0%, #fef2f2 100%); }
        
        .sf-label { font-size: 1.2rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
        .sf-value { font-size: 3.5rem; font-weight: 900; line-height: 1.1; margin: 10px 0; font-family: 'Prompt', sans-serif; }
        
        .sf-card.revenue .sf-value { color: #1d4ed8; }
        .sf-card.good .sf-value { color: #15803d; }
        .sf-card.hold .sf-value { color: #c2410c; }
        .sf-card.scrap .sf-value { color: #b91c1c; }
        
        .sf-unit { font-size: 1.2rem; font-weight: bold; color: #94a3b8; }
        .sf-target { font-size: 0.95rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-top: 5px; }

        .top-controls-wrapper { width: 100%; overflow-x: hidden; }
        .dashboard-toolbar { width: 100%; display: flex; flex-wrap: wrap; align-items: center; }
        .live-status-item { margin-right: auto !important; }

        @media (max-width: 767.98px) and (orientation: portrait) {
            .dashboard-toolbar { display: grid !important; grid-template-columns: 1fr 1fr; gap: 12px 8px; padding: 12px !important; }
            .live-status-item { margin: 0 0 4px 0 !important; grid-column: 1 / span 2; justify-content: center !important; border-right: none !important; border-bottom: 1px solid #f1f5f9 !important; padding-bottom: 12px !important; }
            .filter-item { width: 100% !important; border-right: none !important; padding: 0 !important; margin-left: 0 !important; }
            .date-item { grid-column: 1 / span 2; display: flex !important; justify-content: space-between; padding: 0 !important; }
            .date-item input { flex: 1; min-width: 0; }
            .update-btn { grid-column: 1 / span 2; width: 100% !important; margin: 0 !important; }
            .dashboard-toolbar select, .dashboard-toolbar input[type="date"] { width: 100% !important; padding: 8px 10px !important; }
            .sf-value { font-size: 2.2rem; }
            .table-responsive { overflow-x: auto; border-radius: 8px; }
            #productionTable th:nth-child(1), #productionTable td:nth-child(1) { position: sticky; left: 0; z-index: 10; background-color: #ffffff; }
        }

        @media (max-width: 950px) and (orientation: landscape) {
            .top-controls-wrapper { overflow-x: auto !important; margin-bottom: 8px !important; width: 100%; }
            .top-controls-wrapper::-webkit-scrollbar { display: none; }
            .dashboard-toolbar { display: flex !important; flex-direction: row !important; flex-wrap: nowrap !important; min-width: 100% !important; width: max-content !important; padding: 4px !important; gap: 4px !important; }
            .live-status-item { margin-right: auto !important; padding: 0 8px !important; border-right: none !important; }
            .live-text, .live-vr, .shortcut-text { display: none !important; }
            .filter-item, .date-item { border-right: 1px solid #e2e8f0 !important; padding: 0 8px !important; display: flex !important; align-items: center; }
            .update-btn { margin: 0 4px !important; }
            .sf-value { font-size: 2rem; }
            .sf-card { padding: 10px !important; }
        }
    </style>
</head>
<body class="layout-top-header">
    <?php include_once __DIR__ . '/../components/php/top_header.php'; ?>

    <div class="page-container">
        <main id="main-content">
            <div class="content-wrapper p-3">
                
                <div class="top-controls-wrapper mb-3">
                    <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                        
                        <div class="d-flex align-items-center px-3 py-1 border-end live-status-item">
                            <span class="live-indicator"></span>
                            <span class="fw-bold text-success live-text" style="font-size: 0.8rem; letter-spacing: 0.5px; margin-right: 12px;">LIVE MONITOR</span>
                            <div class="vr mx-2 text-muted live-vr" style="opacity: 0.2;"></div>
                            <i class="far fa-clock text-muted me-2" style="font-size: 0.85rem;"></i>
                            <span class="fw-bold text-dark" style="font-size: 0.95rem;" id="liveClock">--:--:--</span>
                            
                            <?php if (isset($_SESSION['user']) && hasPermission('view_executive')): ?>
                                <div class="vr mx-2 text-muted" style="opacity: 0.2;"></div>
                                <a href="OEE_Dashboard.php" class="btn btn-dark btn-sm d-flex align-items-center shadow-sm" style="padding: 2px 8px; border-radius: 6px;" title="กลับไปหน้าหลัก">
                                    <i class="fas fa-user-tie text-warning"></i>
                                    <span class="ms-1 fw-bold shortcut-text text-white" style="font-size: 0.7rem;">Executive View</span>
                                </a>
                            <?php endif; ?>
                            
                            <div class="vr mx-2 text-muted" style="opacity: 0.2;"></div>
                            <a href="../production/productionUI.php" class="btn btn-light btn-sm border d-flex align-items-center shadow-sm" style="padding: 2px 8px; border-radius: 6px;" title="Data Entry">
                                <i class="fas fa-boxes text-primary"></i>
                                <span class="ms-1 fw-bold text-secondary shortcut-text" style="font-size: 0.7rem;">Data Entry</span>
                            </a>
                        </div>

                        <div class="d-flex align-items-center px-2 border-end filter-item">
                            <select id="lineFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 120px;"><option value="">All Lines</option></select>
                        </div>
                        <div class="d-flex align-items-center px-2 border-end filter-item">
                            <select id="modelFilter" class="form-select form-select-sm border-0 bg-transparent fw-bold" style="width: 120px;"><option value="">All Models</option></select>
                        </div>
                        <div class="d-flex align-items-center px-2 date-item">
                            <input type="date" id="startDate" class="form-control form-control-sm border-0 bg-transparent fw-bold" style="width: 135px;">
                            <span class="text-muted mx-1"><i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i></span>
                            <input type="date" id="endDate" class="form-control form-control-sm border-0 bg-transparent fw-bold" style="width: 135px;">
                        </div>
                        <button class="btn btn-primary btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm update-btn" onclick="handleFilterChange()">
                            <i class="fas fa-sync-alt me-1"></i> Update
                        </button>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card sf-card revenue">
                            <div class="sf-label"><i class="fas fa-file-invoice-dollar text-primary me-2"></i>Revenue</div>
                            <div class="sf-value" id="prodRevenueStd">0.00</div>
                            <div class="sf-unit">THB</div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card sf-card good">
                            <div class="sf-label"><i class="fas fa-check-circle text-success me-2"></i>Good Output</div>
                            <div class="sf-value" id="sf-good">0</div>
                            <div class="sf-unit">PCS</div>
                            <!-- <div class="sf-target">Target: <span id="sf-target-good">--</span> (Phase 2)</div> -->
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card sf-card hold">
                            <div class="sf-label"><i class="fas fa-pause-circle text-warning me-2"></i>Hold / Rework</div>
                            <div class="sf-value" id="sf-hold">0</div>
                            <div class="sf-unit">PCS</div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card sf-card scrap">
                            <div class="sf-label"><i class="fas fa-times-circle text-danger me-2"></i>Scrap / NG</div>
                            <div class="sf-value" id="sf-scrap">0</div>
                            <div class="sf-unit">PCS</div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-primary fw-bold mb-0 text-center"><i class="fas fa-tachometer-alt me-1"></i> OVERALL OEE</h6>
                            <div class="gauge-container mt-2"><canvas id="oeePieChart"></canvas></div>
                            <div id="oeeInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-success fw-bold mb-0 text-center"><i class="fas fa-check-circle me-1"></i> QUALITY</h6>
                            <div class="gauge-container mt-2"><canvas id="qualityPieChart"></canvas></div>
                            <div id="qualityInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-warning fw-bold mb-0 text-center"><i class="fas fa-bolt me-1"></i> PERFORMANCE</h6>
                            <div class="gauge-container mt-2"><canvas id="performancePieChart"></canvas></div>
                            <div id="performanceInfo" class="mt-2"></div>
                        </div>
                    </div>
                    <div class="col-12 col-md-6 col-xl-3">
                        <div class="chart-card p-3">
                            <h6 class="text-uppercase text-info fw-bold mb-0 text-center"><i class="fas fa-clock me-1"></i> AVAILABILITY</h6>
                            <div class="gauge-container mt-2"><canvas id="availabilityPieChart"></canvas></div>
                            <div id="availabilityInfo" class="mt-2"></div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-12">
                        <div class="chart-card p-3 h-100">
                            <h6 class="fw-bold mb-3 border-bottom pb-2"><i class="fas fa-boxes me-2 text-success"></i>Production Output by Part</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-hover align-middle mb-0" id="productionTable">
                                    <thead class="table-light sticky-top" style="z-index: 11;">
                                        <tr>
                                            <th style="min-width: 100px;">Part No.</th>
                                            <th style="min-width: 120px;">Line / Model</th>
                                            <th class="text-end" style="min-width: 130px;">FG (Good)</th>
                                            <th class="text-end" style="min-width: 130px;">Hold</th>
                                            <th class="text-end" style="min-width: 130px;">Scrap</th>
                                            <th class="text-end border-start pe-3" style="min-width: 180px;">Total Qty (Breakdown)</th>
                                        </tr>
                                    </thead>
                                    <tbody id="productionTableBody">
                                        <tr><td colspan="6" class="text-center text-muted py-4">Loading data...</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="position: absolute; width: 10px; height: 10px; overflow: hidden; opacity: 0; pointer-events: none; z-index: -999;">
                    <div id="oeeTrendToggle"></div>
                    <canvas id="oeeLineChart" width="10" height="10"></canvas>
                    
                    <div id="stopCauseToggle"></div>
                    <div id="downtimeEmptyState"></div>
                    <div id="downtimeChartWrapper"></div>
                    <canvas id="stopCauseBarChart" width="10" height="10"></canvas>

                    <span id="prodCostTotal"></span><span id="valCPU"></span>
                    <span id="prodCostMat"></span><span id="prodCostPercentRM"></span>
                    <span id="valScrapCost"></span><span id="prodCostDL"></span>
                    <span id="valDL"></span><span id="valOT"></span><span id="valLaborEff"></span>
                    <span id="prodCostOH"></span><span id="prodCostPercentOH"></span>
                    <span id="prodGPStd"></span><span id="prodPercentGPStd"></span>
                </div>

            </div>
        </main>
    </div>

<script>
        const isLoggedIn = true;
        const API_KEY = 'SNC_TV_2026_x9f8a2mPLQ';
        
        const originalFetch = window.fetch;
        window.fetch = async function() {
            let url = arguments[0];
            if (typeof url === 'string' && url.includes('oeeDashboardApi.php')) {
                url = url.replace('oeeDashboardApi.php', 'oeeShopfloorApi.php');
                const urlObj = new URL(url, window.location.href);
                urlObj.searchParams.set('key', API_KEY);
                arguments[0] = urlObj.toString();
            }
            return originalFetch.apply(this, arguments);
        };
    </script>

    <script src="script/OEE_OEEchart.js?v=<?php echo filemtime('script/OEE_OEEchart.js'); ?>"></script>
    <script src="script/OEE_barchart.js?v=<?php echo filemtime('script/OEE_barchart.js'); ?>"></script>
    <script src="script/filterManager.js?v=<?php echo filemtime('script/filterManager.js'); ?>"></script>

    <script>
        // ระบบไฟกระพริบ Offline Detection
        function setConnectionStatus(isOnline) {
            const indicator = document.querySelector('.live-indicator');
            const text = document.querySelector('.live-text');
            if (!indicator || !text) return;

            if (isOnline) {
                indicator.classList.remove('offline');
                text.classList.remove('offline');
                text.textContent = 'LIVE MONITOR';
                document.querySelectorAll('.sf-value').forEach(el => el.style.opacity = '1');
            } else {
                indicator.classList.add('offline');
                text.classList.add('offline');
                text.textContent = 'CONNECTION LOST';
                document.querySelectorAll('.sf-value').forEach(el => el.style.opacity = '0.4');
            }
        }

        // ฟังก์ชันดึงยอดชิ้นงานสำหรับป้ายไฟ
        async function fetchShopfloorTotals() {
            const params = new URLSearchParams({ 
                key: API_KEY, 
                action: 'getBarCharts', 
                startDate: document.getElementById("startDate")?.value || '', 
                endDate: document.getElementById("endDate")?.value || '', 
                line: document.getElementById("lineFilter")?.value || '', 
                model: document.getElementById("modelFilter")?.value || '' 
            });

            try {
                const res = await fetch(`api/oeeShopfloorApi.php?${params.toString()}`);
                if (!res.ok) throw new Error("HTTP Status " + res.status);
                
                const json = await res.json();
                
                if (json.success && json.data && json.data.partResults) {
                    let totalGood = 0, totalHold = 0, totalScrap = 0;
                    json.data.partResults.forEach(r => {
                        totalGood += parseFloat(r.FG) || 0;
                        totalHold += parseFloat(r.HOLD) || 0;
                        totalScrap += parseFloat(r.SCRAP) || 0;
                    });
                    
                    document.getElementById('sf-good').textContent = totalGood.toLocaleString();
                    document.getElementById('sf-hold').textContent = totalHold.toLocaleString();
                    document.getElementById('sf-scrap').textContent = totalScrap.toLocaleString();
                    setConnectionStatus(true);
                } else {
                    throw new Error("API returned false or invalid data");
                }
            } catch(e) { 
                console.error("Failed to fetch shopfloor totals:", e);
                setConnectionStatus(false); 
            }
        }

        // ผูกฟังก์ชันเข้ากับ Filter
        window.addEventListener('load', () => {
            const originalHandleFilter = window.handleFilterChange;
            // เมื่อ Filter เปลี่ยน (รวมถึงตอนที่ filterManager.js สั่ง Auto-refresh ทุกนาที) ให้ดึงข้อมูลป้ายไฟด้วย
            window.handleFilterChange = function() {
                if (originalHandleFilter) originalHandleFilter();
                fetchShopfloorTotals();
            };

            window.addEventListener('offline', () => setConnectionStatus(false));
            window.addEventListener('online', () => {
                setConnectionStatus(true);
                if (typeof handleFilterChange === 'function') handleFilterChange();
            });
        });
    </script>
</body>
</html>