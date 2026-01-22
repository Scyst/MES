<?php
// MES/page/management/executiveDashboard.php
require_once __DIR__ . '/../components/init.php';

// Permission check
if (!hasRole(['admin', 'creator', 'planner', 'viewer'])) {
    header("Location: ../OEE_Dashboard/OEE_Dashboard.php");
    exit;
}

// =========================================================
// 1. CONFIG TOP HEADER
// =========================================================
$pageTitle = "Executive Dashboard";
$pageIcon = "fas fa-chart-pie"; 
$pageHeaderTitle = "Executive Overview"; 
$pageHeaderSubtitle = "Financial & Operational Performance"; 
$pageHelpId = "execHelpModal"; 

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    <link rel="stylesheet" href="css/executiveDashboard.css?v=<?php echo time(); ?>">
</head>
<body class="layout-top-header">
    
    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <main id="main-content">
            <?php include_once('../components/php/spinner.php'); ?>
            
            <div class="content-wrapper">
                
                <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                    <div class="d-flex align-items-center">
                        <div id="last-update-time" class="d-flex align-items-center gap-2 text-secondary bg-white px-3 py-2 rounded shadow-sm border" style="font-size: 0.9rem;">
                            <span class="position-relative d-flex h-2 w-2">
                                <span class="position-absolute top-0 start-0 h-100 w-100 rounded-circle bg-success opacity-75 animate-ping"></span>
                                <span class="position-relative d-inline-flex rounded-circle h-2 w-2 bg-success" style="width: 8px; height: 8px;"></span>
                            </span>
                            <span class="fw-bold">Live System</span>
                            <span class="text-muted small border-start ps-2 ms-1" id="live-clock">--:--</span>
                        </div>
                    </div>

                    <div class="d-flex align-items-center bg-white p-1 rounded shadow-sm border dashboard-toolbar">
                        <div class="input-group input-group-sm border-end pe-2" style="width: 140px;">
                            <span class="input-group-text bg-transparent border-0 text-muted small text-uppercase fw-bold">USD</span>
                            <input type="number" id="exchangeRate" class="form-control border-0 bg-light text-primary fw-bold text-end rounded-end" value="32.0" step="0.1">
                        </div>
                        
                        <div class="d-flex align-items-center px-2">
                            <input type="date" id="startDate" class="form-control form-control-sm border-0 bg-transparent text-dark fw-bold" style="width: 110px; cursor: pointer;">
                            <span class="text-muted mx-1"><i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i></span>
                            <input type="date" id="endDate" class="form-control form-control-sm border-0 bg-transparent text-dark fw-bold" style="width: 110px; cursor: pointer;">
                        </div>

                        <div class="vr mx-1 text-muted opacity-25 my-1"></div>

                        <button class="btn btn-warning btn-sm text-dark fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="syncLaborCost()" title="Sync Actual Labor Cost from Manpower System" style="height: 30px;">
                            <i class="fas fa-users-cog"></i>
                        </button>

                        <button class="btn btn-outline-warning btn-sm fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="quickSyncLabor()" title="Quick Sync: Yesterday & Today only" style="height: 30px;">
                            <i class="fas fa-bolt text-warning"></i>
                        </button>

                        <button class="btn btn-outline-info btn-sm fw-bold px-3 py-1 rounded ms-1 shadow-sm" id="btnAIForecast" onclick="toggleAIForecast()" title="AI Prediction: Forecast end-of-period result" style="height: 30px;">
                            <i class="fas fa-robot me-1"></i> AI Forecast
                        </button>

                        <button class="btn btn-primary btn-sm fw-bold px-2 py-1 rounded ms-1 shadow-sm" onclick="loadDashboardData()" style="height: 30px;">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-6 col-md-4 col-xl-2">
                        <div class="exec-card border-start border-4 border-success p-3 cursor-pointer h-100" onclick="openExplainerModal('sale')">
                            <div class="kpi-card-content position-relative">
                                <div class="d-flex justify-content-between">
                                    <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Total Revenue</small>
                                    <i class="fas fa-info-circle text-muted opacity-25" style="font-size: 0.8rem;"></i>
                                </div>
                                <h4 class="fw-bold text-dark mb-0 mt-1" id="kpi-sale">-</h4>
                                <small class="text-success mt-1"><i class="fas fa-arrow-up small me-1"></i>Actual</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-6 col-md-4 col-xl-2">
                        <div class="exec-card border-start border-4 border-danger p-3 cursor-pointer h-100" onclick="openExplainerModal('cost')">
                            <div class="kpi-card-content position-relative d-flex flex-column justify-content-between h-100">
                                
                                <div>
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <small class="text-uppercase text-muted fw-bold" style="font-size: 0.7rem;">Total Cost</small>
                                        <span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill" style="font-size: 0.6rem;">Act</span>
                                    </div>
                                    
                                    <h4 class="fw-bold text-dark mb-0" id="kpi-cost">-</h4>
                                </div>

                                <div class="border-top pt-2 mt-2" style="font-size: 0.7rem;">
                                    <div class="d-flex justify-content-between align-items-center">
                                        
                                        <div class="text-muted lh-1">
                                            <span class="d-block" style="font-size: 0.6rem;">Std (BOM)</span>
                                            <span id="kpi-cost-std" class="fw-semibold">-</span>
                                        </div>

                                        <div class="text-end lh-1">
                                            <span class="d-block text-muted" style="font-size: 0.6rem;">Diff</span>
                                            <span id="kpi-cost-diff" class="fw-bold">-</span>
                                        </div>

                                    </div>
                                </div>
                                
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-4 col-xl-2">
                        <div class="exec-card border-start border-4 border-primary bg-primary bg-opacity-10 p-3 cursor-pointer h-100" onclick="openExplainerModal('gp')" style="border-color: var(--bs-primary) !important;">
                            <div class="kpi-card-content position-relative">
                                <div class="d-flex justify-content-between">
                                    <small class="text-uppercase text-primary fw-bold" style="font-size: 0.7rem;">Gross Profit</small>
                                    <i class="fas fa-info-circle text-primary opacity-50" style="font-size: 0.8rem;"></i>
                                </div>
                                <h4 class="fw-bold text-primary mb-0 mt-1" id="kpi-gp">-</h4>
                                <span id="kpi-gp-percent" class="badge bg-primary text-white mt-2 align-self-start">0%</span>
                            </div>
                        </div>
                    </div>

                    <div class="col-4 col-md-4 col-xl-2">
                        <div class="exec-card p-3 text-center bg-light border-0 h-100 cursor-pointer" onclick="openExplainerModal('rm')">
                            <small class="text-muted text-uppercase d-block mb-1" style="font-size: 0.65rem;">Material (RM)</small>
                            <h6 class="fw-bold text-secondary mb-0" id="kpi-rm">-</h6>
                        </div>
                    </div>
                    
                    <div class="col-4 col-md-4 col-xl-2">
                        <div class="exec-card p-3 bg-light border-0 h-100 cursor-pointer" onclick="openExplainerModal('labor')">
                            <div class="d-flex flex-column justify-content-between h-100">
                                
                                <div class="text-center">
                                    <small class="text-muted text-uppercase d-block mb-1" style="font-size: 0.65rem;">Labor (DL+OT)</small>
                                    <div class="d-flex align-items-center justify-content-center">
                                        <h6 class="fw-bold text-secondary mb-0" id="kpi-dlot" style="font-size: 1.1rem;">-</h6>
                                        <i id="dlot-est-icon" class="fas fa-clock-rotate-left ms-1 text-warning d-none" 
                                        style="font-size: 0.7rem;" title="Estimated"></i>
                                    </div>
                                </div>

                                <div class="border-top pt-2 mt-2" style="font-size: 0.65rem;">
                                    <div class="d-flex justify-content-between align-items-end">
                                        <div class="text-start">
                                            <span class="text-muted d-block" style="font-size: 0.6rem;">Std</span>
                                            <span id="kpi-dl-std" class="fw-semibold text-dark">-</span>
                                        </div>
                                        <div class="text-end">
                                            <span id="kpi-dl-diff" class="fw-bold">-</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                    
                    <div class="col-4 col-md-4 col-xl-2">
                        <div class="exec-card p-3 text-center bg-light border-0 h-100 cursor-pointer" onclick="openExplainerModal('oh')">
                            <small class="text-muted text-uppercase d-block mb-1" style="font-size: 0.65rem;">Overhead (OH)</small>
                            <h6 class="fw-bold text-secondary mb-0" id="kpi-oh">-</h6>
                        </div>
                    </div>
                </div>

                <div class="row mb-3">
                    <div class="col-12">
                        <div class="exec-card p-3">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold text-dark mb-0">
                                    <i class="fas fa-chart-line me-2 text-primary"></i>Revenue & Cost Trend
                                </h6>
                            </div>
                            <div id="trend-chart-container" style="position: relative; height: 300px;">
                                <canvas id="financialTrendChart"></canvas> 
                                <div id="trend-placeholder" class="position-absolute top-50 start-50 translate-middle text-center text-muted">
                                    <i class="fas fa-chart-area fa-2x mb-2 opacity-25"></i>
                                    <p class="small m-0">Waiting for daily data feed...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="row g-3 mb-3">
                    <div class="col-lg-8">
                        <div class="exec-card p-3 h-100">
                            <h6 class="fw-bold text-muted mb-3 small text-uppercase">Cost Structure Analysis</h6>
                            
                            <div class="row g-2"> 
                                
                                <div class="col-md-4 border-end">
                                    <div class="d-flex justify-content-center align-items-center mb-2">
                                        <span class="fw-bold text-dark small">Sale vs Cost</span>
                                    </div>
                                    <div style="height: 180px; position: relative;">
                                        <canvas id="saleCostPieChart"></canvas>
                                    </div>
                                </div>

                                <div class="col-md-4 border-end">
                                    <div class="d-flex justify-content-center align-items-center mb-2">
                                        <span class="fw-bold text-dark small">Cost Breakdown</span>
                                    </div>
                                    <div style="height: 180px; position: relative;">
                                        <canvas id="costBreakdownPieChart"></canvas>
                                    </div>
                                </div>

                                <div class="col-md-4">
                                    <div class="d-flex justify-content-center align-items-center mb-2">
                                        <span class="fw-bold text-dark small">Labor (Std vs Act)</span>
                                    </div>
                                    <div style="height: 180px; position: relative;">
                                        <canvas id="laborComparisonChart"></canvas>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="exec-card p-0 overflow-hidden h-100">
                            <div class="metric-grid h-100">
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-primary" id="metric-units">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.65rem;">Total Units</small>
                                </div>
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-info" id="metric-headcount">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.65rem;">Employees</small>
                                </div>
                                <div class="metric-box">
                                    <h3 class="mb-0 fw-bold text-warning" id="metric-lines">-</h3>
                                    <small class="text-muted text-uppercase" style="font-size: 0.65rem;">Active Lines</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-flex align-items-center mb-3">
                    <h6 class="fw-bold text-dark mb-0"><i class="fas fa-industry me-2 text-secondary"></i>Line Performance</h6>
                    <hr class="flex-grow-1 ms-3 my-0 border-secondary opacity-10">
                </div>
                <div class="row g-3" id="line-cards-container"></div>

            </div> 
            
            <div class="modal fade" id="explainerModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header bg-light border-bottom-0">
                            <h5 class="modal-title fw-bold text-dark" id="explainerTitle">Metric Detail</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="mb-4">
                                <label class="text-uppercase text-muted fw-bold small mb-2">Formula</label>
                                <div class="p-3 bg-dark text-white rounded font-monospace small" id="explainerFormula" style="border-left: 4px solid var(--bs-primary);">Waiting...</div>
                            </div>
                            <div class="mb-4">
                                <label class="text-uppercase text-muted fw-bold small mb-2">Description</label>
                                <p class="text-secondary small mb-0" id="explainerDesc">Waiting...</p>
                            </div>
                            <div>
                                <label class="text-uppercase text-muted fw-bold small mb-2">Data Sources</label>
                                <ul class="list-group list-group-flush small" id="explainerSources"></ul>
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-top-0 py-2">
                            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="lineDetailModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                    <div class="modal-content border-0 shadow">
                        <div class="modal-header bg-primary text-white">
                            <div>
                                <h5 class="modal-title fw-bold" id="lineDetailTitle">Line Detail</h5>
                                <small class="opacity-75" id="lineDetailSubtitle">Production Analysis</small>
                            </div>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0">
                            <ul class="nav nav-tabs nav-fill bg-light" id="lineTabs" role="tablist">
                                <li class="nav-item"><button class="nav-link active fw-bold" data-bs-toggle="tab" data-bs-target="#tabTrend"><i class="fas fa-chart-bar me-2 text-primary"></i>Output</button></li>
                                <li class="nav-item"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabDowntime"><i class="fas fa-exclamation-triangle me-2 text-warning"></i>Downtime</button></li>
                                <li class="nav-item"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabScrap"><i class="fas fa-trash-alt me-2 text-danger"></i>Waste</button></li>
                                <li class="nav-item"><button class="nav-link fw-bold" data-bs-toggle="tab" data-bs-target="#tabManpower"><i class="fas fa-users me-2 text-info"></i>People</button></li>
                            </ul>
                            <div class="tab-content p-3" id="lineTabContent">
                                <div class="tab-pane fade show active" id="tabTrend"><div style="height: 300px; position: relative;"><canvas id="lineHourlyChart"></canvas></div></div>
                                <div class="tab-pane fade" id="tabDowntime"><div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead class="table-light"><tr><th>Time</th><th>Machine</th><th>Issue</th><th class="text-end">Mins</th></tr></thead><tbody id="tblDowntimeBody"></tbody></table></div></div>
                                <div class="tab-pane fade" id="tabScrap"><div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead class="table-light"><tr><th>Part No</th><th>Desc</th><th class="text-end">Qty</th><th class="text-end">Lost (฿)</th></tr></thead><tbody id="tblScrapBody"></tbody></table></div></div>
                                <div class="tab-pane fade" id="tabManpower">
                                    <div class="d-flex justify-content-between align-items-center mb-2"><span class="badge bg-info text-dark">Staff List</span><small class="text-muted">Source: Scan In Log</small></div>
                                    <div class="table-responsive" style="max-height: 300px;"><table class="table table-sm table-striped mb-0"><thead class="table-light sticky-top"><tr><th>ID</th><th>Name</th><th>Position</th><th class="text-end">Time</th></tr></thead><tbody id="tblManpowerBody"></tbody></table></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal fade" id="execHelpModal" tabindex="-1">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold"><i class="fas fa-info-circle me-2 text-primary"></i>Executive Dashboard Help</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-secondary">
                            <h6 class="fw-bold text-dark border-bottom pb-2"><i class="fas fa-chart-line me-2 text-primary"></i>สรุปผลการดำเนินงาน</h6>
                            <ul class="small mb-3">
                                <li><strong>Sale:</strong> รายได้จากการผลิตจริง (FG Qty x Price x Ex. Rate)</li>
                                <li><strong>Cost:</strong> ต้นทุนรวม (Material + Labor + OH + Scrap)</li>
                                <li><strong>Gross Profit:</strong> กำไรขั้นต้น (ยังไม่หักภาษีและค่าบริหาร)</li>
                            </ul>

                            <h6 class="fw-bold text-dark border-bottom pb-2 mt-4"><i class="fas fa-tools me-2 text-warning"></i>ฟังก์ชันพิเศษ (Admin & AI)</h6>
                            <div class="small">
                                <div class="mb-3">
                                    <div class="d-flex align-items-center mb-1">
                                        <span class="badge bg-warning text-dark me-2"><i class="fas fa-users-cog"></i> Sync Labor</span>
                                        <strong>ระบบคำนวณต้นทุนค่าแรงจริง</strong>
                                    </div>
                                    <p class="text-muted ms-4 mb-2">ใช้สำหรับดึงข้อมูล Headcount และค่าแรง (DL/OT) จากระบบสแกนนิ้ว Manpower</p>
                                    
                                    <div class="alert alert-warning border-0 shadow-sm p-3 ms-4 mb-0" style="font-size: 0.8rem; border-left: 4px solid #ffc107 !important;">
                                        <i class="fas fa-exclamation-triangle me-1"></i>
                                        <strong>Working Date Logic:</strong> 
                                        <ul class="mb-2 mt-1 ps-3">
                                            <li>คำนวณยอดตาม <strong>"วันที่เริ่มงาน"</strong> (กะดึกที่เลิกงานตอนเช้าจะถูกนับเป็นยอดของเมื่อวาน)</li>
                                            <li>ระหว่างวัน: ระบบจะนำจำนวนคนที่สแกนเข้า (Check-in) คูณกับค่าแรงพื้นฐานเพื่อแสดงยอด <strong>"ประมาณการ"</strong> ทันที</li>
                                            <li>ยอดสมบูรณ์: จะเกิดขึ้นหลังพนักงานสแกนออก (Check-out) และมีการกดปุ่ม Sync หลังจบกะ</li>
                                        </ul>
                                    </div>
                                </div>

                                <div class="mb-2">
                                    <div class="d-flex align-items-center mb-1">
                                        <span class="badge bg-info text-white me-2"><i class="fas fa-robot"></i> AI Forecast</span>
                                        <strong>ระบบทำนายยอดล่วงหน้า</strong>
                                    </div>
                                    <p class="text-muted ms-4 mb-0">ใช้ระบบ <strong>Hybrid Regression AI</strong> วิเคราะห์แนวโน้มจากข้อมูลย้อนหลัง 30 วัน ร่วมกับโมเมนตัมปัจจุบัน เพื่อพยากรณ์ยอดขายล่วงหน้า 7 วัน</p>
                                </div>
                            </div>

                            <div class="alert alert-info small mt-4 mb-0 border-0 bg-light">
                                <i class="fas fa-lightbulb me-1 text-primary"></i>
                                <strong>Tip:</strong> หากต้องการทราบสูตรคำนวณเชิงลึก ให้คลิกที่ไอคอน <i class="fas fa-info-circle mx-1"></i> บนหัวการ์ดแต่ละใบ
                            </div>
                        </div>
                        <div class="modal-footer bg-light border-0">
                            <button type="button" class="btn btn-sm btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <div id="syncLoader" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; color:white; backdrop-filter: blur(8px);">
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; max-width: 400px;">
            <div class="spinner-border text-warning" role="status" style="width: 4rem; height: 4rem; border-width: 0.25em;"></div>
            
            <h3 style="margin-top:25px; font-weight: 700; letter-spacing: 1px;" id="syncStatusText">กำลังเริ่มต้น...</h3>
            
            <div class="mt-3 p-3 rounded" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">
                <p id="syncProgressDetailText" class="mb-0" style="font-size: 0.95rem; color: #ffe082;">ระบบกำลังคำนวณต้นทุนค่าแรงจริงจาก Manpower...</p>
            </div>
            
            <p class="mt-4 text-muted small"><i class="fas fa-exclamation-triangle me-2"></i>กรุณาอย่าปิดหน้าต่างนี้จนกว่าระบบจะประมวลผลเสร็จ</p>
        </div>
    </div>

    <script src="script/executiveDashboard.js?v=<?php echo time(); ?>"></script>
</body>
</html>