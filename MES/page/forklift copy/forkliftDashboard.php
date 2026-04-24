<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require_once __DIR__ . '/../components/init.php';

$pageTitle = "Forklift Command Center";
$pageIcon = "fas fa-map-marked-alt"; 
$pageHeaderTitle = "Forklift Command Center";
$pageHeaderSubtitle = "ระบบติดตามและจัดการรถโฟล์คลิฟต์แบบครบวงจร";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once __DIR__ . '/../components/common_head.php'; ?>
    <?php include_once __DIR__ . '/../components/chart_head.php'; ?>
    
    <title><?php echo $pageTitle; ?></title>
    
    <link rel="stylesheet" href="../../utils/libs/leaflet.css" />
    <link rel="stylesheet" href="css/forklift.css?v=<?php echo filemtime(__DIR__ . '/css/forklift.css'); ?>">
    
    <script>
        const CURRENT_USER_ID = <?php echo $_SESSION['user']['id']; ?>;
        const CURRENT_USER_NAME = "<?php echo $_SESSION['user']['fullname'] ?? $_SESSION['user']['username']; ?>";
        const IS_ADMIN = <?php echo in_array($_SESSION['user']['role'], ['admin', 'supervisor', 'creator']) ? 'true' : 'false'; ?>;
    </script>
    <style>
        /* Map Styles */
        .map-wrapper { position: relative; width: 100%; height: 100%; margin: 0 auto; background-color: var(--bs-tertiary-bg); border: 1px solid var(--bs-border-color); border-radius: 8px; overflow: hidden; min-height: 450px; }
        .custom-grid-label { pointer-events: none; }
        .custom-leaflet-icon { background: transparent; border: none; }
        .forklift-marker-wrapper { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-size: 14px; transition: transform 0.3s ease; }
        .forklift-marker-wrapper:hover { transform: scale(1.15); }
        .marker-label-floating { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap; pointer-events: none; border: 1px solid rgba(255,255,255,0.2); }
        
        /* List Item Redesign */
        .fleet-list-item { transition: all 0.2s ease; border-left: 4px solid transparent; }
        .fleet-list-item:hover { background-color: rgba(13, 110, 253, 0.05); border-left-color: var(--bs-primary); }
        .fleet-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.8rem; color: var(--bs-gray-600); margin: 8px 0; }
        .fleet-info-grid i { width: 14px; text-align: center; margin-right: 4px; }
        
        /* Timeline Redesign */
        .timeline-container { position: relative; overflow-x: auto; background: #fff; border-radius: 6px; border: 1px solid var(--bs-border-color); }
        .timeline-header { display: flex; position: sticky; top: 0; background: #f8f9fa; z-index: 10; border-bottom: 2px solid var(--bs-border-color); }
        .time-slot { flex: 1; min-width: 60px; text-align: center; font-size: 0.75rem; font-weight: bold; color: var(--bs-gray-600); padding: 8px 0; border-right: 1px dashed var(--bs-gray-300); }
        .timeline-label-col { width: 120px; min-width: 120px; position: sticky; left: 0; background: #f8f9fa; z-index: 11; font-weight: bold; font-size: 0.8rem; padding: 8px 10px; border-right: 2px solid var(--bs-border-color); display: flex; align-items: center; }
        .timeline-row { display: flex; border-bottom: 1px solid var(--bs-gray-200); position: relative; min-height: 40px; }
        .timeline-track { flex: 1; display: flex; position: relative; background: repeating-linear-gradient(to right, transparent, transparent 59px, rgba(0,0,0,0.03) 59px, rgba(0,0,0,0.03) 60px); }
        .booking-bar { position: absolute; top: 5px; height: 30px; border-radius: 4px; font-size: 0.7rem; color: #fff; font-weight: bold; display: flex; align-items: center; padding: 0 8px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; box-shadow: 0 2px 4px rgba(0,0,0,0.15); cursor: pointer; transition: filter 0.2s; }
        .booking-bar:hover { filter: brightness(1.1); }
        .booking-bar.active { background-color: #0d6efd; border-left: 3px solid #0a58ca; }
        .booking-bar.booked { background-color: #8b0faa; border-left: 3px solid #6f0c88; opacity: 0.85; }
        .booking-bar.completed { background-color: #6c757d; border-left: 3px solid #495057; opacity: 0.7; }
        .current-time-line { position: absolute; top: 0; bottom: 0; width: 2px; background-color: #dc3545; z-index: 5; box-shadow: 0 0 5px rgba(220, 53, 69, 0.6); }
        .current-time-line::after { content: ''; position: absolute; top: 0; left: -4px; width: 10px; height: 10px; border-radius: 50%; background-color: #dc3545; border: 2px solid #fff; }
        
        /* KPI Cards */
        .kpi-card { border-radius: 10px; padding: 15px; display: flex; align-items: center; border: 1px solid var(--bs-border-color); background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s; }
        .kpi-card:hover { transform: translateY(-3px); }
        .kpi-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-right: 15px; }
        
        #map-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; min-height: 450px; z-index: 1; }
    </style>
</head>

<body class="dashboard-page layout-top-header bg-light">

    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        <div class="container-fluid p-3 h-100 d-flex flex-column" style="max-width: 1800px;">
            
            <div class="row g-3 mb-3">
                <div class="col-6 col-md-3"><div class="kpi-card border-primary border-start border-4"><div class="kpi-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-truck-loading"></i></div><div><div class="text-muted small fw-bold text-uppercase">Total Fleet</div><h4 class="mb-0 fw-bold" id="kpi-total">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-success border-start border-4"><div class="kpi-icon bg-success bg-opacity-10 text-success"><i class="fas fa-check-circle"></i></div><div><div class="text-muted small fw-bold text-uppercase">Available</div><h4 class="mb-0 fw-bold" id="kpi-avail">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-info border-start border-4"><div class="kpi-icon bg-info bg-opacity-10 text-info"><i class="fas fa-cogs"></i></div><div><div class="text-muted small fw-bold text-uppercase">In Use</div><h4 class="mb-0 fw-bold" id="kpi-use">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-secondary border-start border-4"><div class="kpi-icon bg-secondary bg-opacity-10 text-secondary"><i class="fas fa-tools"></i></div><div><div class="text-muted small fw-bold text-uppercase">Maintenance</div><h4 class="mb-0 fw-bold" id="kpi-maint">0</h4></div></div></div>
            </div>

            <div class="row g-3 flex-grow-1 overflow-hidden">
                <div class="col-lg-8 col-xl-9 d-flex flex-column">
                    <div class="card border-0 shadow-sm flex-grow-1 position-relative rounded-3">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom-0">
                            <h6 class="mb-0 fw-bold"><i class="fas fa-map-marked-alt text-primary me-2"></i>Live Tracking Map</h6>
                        </div>
                        <div class="card-body p-0 position-relative">
                            <div class="map-wrapper rounded-bottom">
                                <div id="map-container"></div>
                                
                                <div class="btn-group shadow" style="position: absolute; bottom: 30px; left: 15px; z-index: 1000; background: white; border-radius: 6px;">
                                    <button class="btn btn-light d-flex align-items-center border-end px-3 py-2" onclick="toggleGrid()" title="เปิด/ปิด ตารางกริด (Grid)"><i class="fas fa-th text-secondary"></i></button>
                                    <button class="btn btn-light d-flex align-items-center px-3 py-2" onclick="toggleHeatmap()" title="ดูความหนาแน่น (Heatmap)"><i class="fas fa-fire text-danger"></i></button>
                                </div>

                                <div class="btn-group-vertical shadow" style="position: absolute; bottom: 30px; right: 15px; z-index: 1000; background: white; border-radius: 6px;">
                                    <button class="btn btn-light border-bottom p-2" onclick="resetMapView()" title="กลับจุดเริ่มต้น"><i class="fas fa-crosshairs text-primary"></i></button>
                                    <button class="btn btn-light border-bottom p-2" onclick="map.zoomIn()" title="ซูมเข้า"><i class="fas fa-plus text-dark"></i></button>
                                    <button class="btn btn-light p-2" onclick="map.zoomOut()" title="ซูมออก"><i class="fas fa-minus text-dark"></i></button>
                                </div>

                                <div id="playback-controls" class="card shadow-lg d-none" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1000; width: 90%; max-width: 400px; border: 2px solid #0d6efd; border-radius: 8px;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4 col-xl-3 d-flex flex-column">
                    <div class="card border-0 shadow-sm h-100 d-flex flex-column rounded-3">
                        <div class="card-header bg-white py-3 border-bottom-0">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="mb-0 fw-bold"><i class="fas fa-list text-primary me-2"></i>Fleet Status</h6>
                                <small class="text-muted" style="font-size: 0.75rem;"><i class="far fa-clock me-1"></i><span id="last-update-time">-</span></small>
                            </div>
                            
                            <div class="btn-group w-100 mb-2 shadow-sm" role="group">
                                <button type="button" class="btn btn-outline-secondary btn-sm active" onclick="filterByStatus('ALL', this)">ทั้งหมด</button>
                                <button type="button" class="btn btn-outline-success btn-sm" onclick="filterByStatus('ONLINE', this)">Online</button>
                                <button type="button" class="btn btn-outline-danger btn-sm" onclick="filterByStatus('LOW_BAT', this)">แบตต่ำ</button>
                            </div>
                            
                            <div class="input-group input-group-sm mb-0 shadow-sm">
                                <span class="input-group-text bg-light border-end-0"><i class="fas fa-search text-muted"></i></span>
                                <input type="text" id="search-forklift" class="form-control border-start-0 ps-0 bg-light" placeholder="ค้นหารหัสรถ หรือโซน..." onkeyup="filterForkliftList()">
                            </div>
                        </div>
                        
                        <div class="card-body p-0 overflow-auto" style="height: 450px;">
                            <ul class="list-group list-group-flush" id="forklift-list">
                                <li class="list-group-item text-center text-muted py-5">
                                    <div class="spinner-border text-primary mb-3"></div><br>
                                    <span class="fw-bold">กำลังโหลดข้อมูลกองรถ...</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <?php include 'components/forkliftModals.php'; ?>
    
    <script src="../../utils/libs/leaflet.js"></script>
    <script src="../../utils/libs/leaflet-heat.js"></script>
    <script src="script/forkliftDashboard.js?v=<?php echo filemtime(__DIR__ . '/script/forkliftDashboard.js'); ?>" defer></script>
</body>
</html>