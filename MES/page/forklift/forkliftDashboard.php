<?php
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

require_once '../components/init.php';

$pageTitle = "Forklift Command Center";
$pageIcon = "fas fa-map-marked-alt"; 
$pageHeaderTitle = "Forklift Command Center";
$pageHeaderSubtitle = "ระบบติดตามและจัดการรถโฟล์คลิฟต์แบบ Real-time";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <?php require_once '../components/common_head.php'; ?>
    <?php include_once '../components/chart_head.php'; ?>
    
    <title><?php echo $pageTitle; ?></title>
    
    <link rel="stylesheet" href="../../utils/libs/leaflet.css" />
    <link rel="stylesheet" href="css/forklift.css?v=<?php echo filemtime(__DIR__ . '/css/forklift.css'); ?>">
    
    <script>
        const CURRENT_USER_ID = <?php echo $_SESSION['user']['id']; ?>;
        const CURRENT_USER_NAME = "<?php echo $_SESSION['user']['fullname'] ?? $_SESSION['user']['username']; ?>";
        const IS_ADMIN = <?php echo in_array($_SESSION['user']['role'], ['admin', 'supervisor', 'creator']) ? 'true' : 'false'; ?>;
    </script>
    <style>
        @media (min-width: 992px) {
            body { height: 100vh; overflow: hidden; display: flex; flex-direction: column; }
            #main-content { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
            .map-column { max-height: calc(100% - 10px); }
            .sidebar-column { max-height: calc(100% - 10px); }
            .map-wrapper { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
        }
        @media (max-width: 991.98px) {
            body { display: flex; flex-direction: column; min-height: 100vh; }
            #main-content { flex: 1; display: flex; flex-direction: column; }
            .map-column { height: 60vh; flex-shrink: 0; }
            .sidebar-column { flex: 1; min-height: 600px; }
            .map-wrapper { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
        }

        .map-wrapper { 
            background-color: var(--bs-tertiary-bg); 
            border-bottom-left-radius: 8px; 
            border-bottom-right-radius: 8px; 
            overflow: hidden; 
        }
        #map-container { 
            position: absolute; 
            top: 0; left: 0; right: 0; bottom: 0; 
            z-index: 1; 
        }
        
        .d-flex.flex-column { min-height: 0; }

        /* List Item Redesign */
        .fleet-list-item { transition: all 0.2s ease; border-left: 4px solid transparent; }
        .fleet-list-item:hover { background-color: rgba(13, 110, 253, 0.05); border-left-color: var(--bs-primary); }
        .fleet-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 0.8rem; color: var(--bs-gray-600); margin: 8px 0; }
        .fleet-info-grid i { width: 14px; text-align: center; margin-right: 4px; }
        
        /* KPI Cards */
        .kpi-card { border-radius: 10px; padding: 15px; display: flex; align-items: center; border: 1px solid var(--bs-border-color); background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: transform 0.2s; }
        .kpi-card:hover { transform: translateY(-3px); }
        .kpi-icon { width: 45px; height: 45px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; margin-right: 15px; }
        
        .custom-grid-label { pointer-events: none; }
        .custom-leaflet-icon { background: transparent; border: none; }
        .forklift-marker-wrapper { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.3); font-size: 14px; transition: transform 0.3s ease; }
        .marker-label-floating { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap; pointer-events: none; border: 1px solid rgba(255,255,255,0.2); }
    </style>
</head>

<body class="dashboard-page layout-top-header bg-light">

    <?php include('../components/php/top_header.php'); ?>

    <main id="main-content">
        <div class="container-fluid p-3 d-flex flex-column h-100" style="max-width: 1800px;">
            
            <div class="row g-3 mb-3 flex-shrink-0">
                <div class="col-6 col-md-3"><div class="kpi-card border-primary border-start border-4"><div class="kpi-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-truck-loading"></i></div><div><div class="text-muted small fw-bold text-uppercase">Total Fleet</div><h4 class="mb-0 fw-bold" id="kpi-total">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-success border-start border-4"><div class="kpi-icon bg-success bg-opacity-10 text-success"><i class="fas fa-check-circle"></i></div><div><div class="text-muted small fw-bold text-uppercase">Available</div><h4 class="mb-0 fw-bold" id="kpi-avail">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-info border-start border-4"><div class="kpi-icon bg-info bg-opacity-10 text-info"><i class="fas fa-cogs"></i></div><div><div class="text-muted small fw-bold text-uppercase">In Use</div><h4 class="mb-0 fw-bold" id="kpi-use">0</h4></div></div></div>
                <div class="col-6 col-md-3"><div class="kpi-card border-secondary border-start border-4"><div class="kpi-icon bg-secondary bg-opacity-10 text-secondary"><i class="fas fa-tools"></i></div><div><div class="text-muted small fw-bold text-uppercase">Maintenance</div><h4 class="mb-0 fw-bold" id="kpi-maint">0</h4></div></div></div>
            </div>

            <div class="row g-3 flex-grow-1" style="min-height: 0;"> 
                
                <div class="col-lg-8 col-xl-9 d-flex flex-column map-column">
                    <div class="card border-0 shadow-sm flex-grow-1 position-relative rounded-3 d-flex flex-column">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom-0 flex-shrink-0">
                            <h6 class="mb-0 fw-bold"><i class="fas fa-map-marked-alt text-primary me-2"></i>Live Tracking Map</h6>
                            <div>
                                <button class="btn btn-sm btn-outline-secondary fw-bold" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('historyModal')).show()"><i class="fas fa-history me-1"></i> ประวัติ</button>
                                <?php if (in_array($_SESSION['user']['role'], ['admin', 'supervisor', 'creator'])): ?>
                                <button class="btn btn-sm btn-outline-dark fw-bold ms-1" onclick="openManageModal()"><i class="fas fa-cog me-1"></i> จัดการ</button>
                                <?php endif; ?>
                            </div>
                        </div>
                        <div class="card-body p-0 position-relative flex-grow-1 map-card-body">
                            <div class="map-wrapper rounded-bottom">
                                <div id="map-container"></div>
                                
                                <div class="btn-group shadow" style="position: absolute; bottom: 30px; left: 15px; z-index: 1000; background: white; border-radius: 6px;">
                                    <button class="btn btn-light d-flex align-items-center border-end px-3 py-2" onclick="toggleGrid()" title="เปิด/ปิด ตารางกริด (Grid)"><i class="fas fa-th text-secondary"></i></button>
                                    <button class="btn btn-light d-flex align-items-center border-end px-3 py-2" onclick="toggleHeatmap()" title="ดูความหนาแน่น (Heatmap)"><i class="fas fa-fire text-danger"></i></button>
                                    <button class="btn btn-light d-flex align-items-center px-3 py-2" onclick="toggleSimulatorMode()" title="โหมดจำลองการวิ่ง (Simulator)"><i class="fas fa-gamepad text-success"></i></button>
                                </div>

                                <div class="btn-group-vertical shadow" style="position: absolute; bottom: 30px; right: 15px; z-index: 1000; background: white; border-radius: 6px;">
                                    <button class="btn btn-light border-bottom p-2" onclick="resetMapView()" title="กลับจุดเริ่มต้น"><i class="fas fa-crosshairs text-primary"></i></button>
                                    <button class="btn btn-light border-bottom p-2" onclick="map.zoomIn()" title="ซูมเข้า"><i class="fas fa-plus text-dark"></i></button>
                                    <button class="btn btn-light p-2" onclick="map.zoomOut()" title="ซูมออก"><i class="fas fa-minus text-dark"></i></button>
                                </div>

                                <div id="playback-controls" class="card shadow-lg d-none" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1000; width: 90%; max-width: 400px; border: 2px solid #0d6efd; border-radius: 8px;">
                                    <div class="card-header bg-primary text-white py-2 d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0" id="playback-title">Playback</h6>
                                        <button type="button" class="btn-close btn-close-white" onclick="closePlayback()"></button>
                                    </div>
                                    <div class="card-body p-2 text-center">
                                        <p id="playback-time" class="small mb-2 fw-bold text-muted">🕒 --:-- | 📍 --</p>
                                        <input type="range" id="playback-slider" class="form-range" min="0" max="100" value="0" oninput="seekPlayback()">
                                        <div class="mt-2">
                                            <button class="btn btn-primary btn-sm rounded-circle shadow" onclick="togglePlayback()" style="width: 40px; height: 40px;">
                                                <i class="fas fa-play" id="icon-play"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div id="simulator-controls" class="card shadow-lg d-none" style="position: absolute; top: 15px; left: 15px; z-index: 1000; width: 300px; border: 2px solid #198754;">
                                    <div class="card-header bg-success text-white py-2 d-flex justify-content-between align-items-center">
                                        <h6 class="mb-0"><i class="fas fa-gamepad"></i> Simulator Control</h6>
                                        <button type="button" class="btn-close btn-close-white" onclick="toggleSimulatorMode()" aria-label="Close"></button>
                                    </div>
                                    <div class="card-body p-2 bg-white">
                                        <p class="small text-muted mb-2">คลิกบนแผนที่เพื่อสร้างจุดเส้นทาง (Waypoints)</p>
                                        <div class="mb-2">
                                            <select id="sim-forklift-select" class="form-select form-select-sm" disabled>
                                                <option value="">-- กำลังโหลดข้อมูล... --</option>
                                            </select>
                                        </div>
                                        <div class="mb-2">
                                            <label class="small">ความเร็วการจำลอง</label>
                                            <input type="range" id="sim-speed" class="form-range" min="1" max="10" value="3">
                                        </div>
                                        <div class="d-flex justify-content-between mt-2">
                                            <button class="btn btn-sm btn-outline-info" onclick="toggleIndoorSetupMode()" id="indoor-setup-btn" title="ตั้งค่าพื้นที่อาคาร"><i class="fas fa-cog"></i></button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="clearSimRoute()" title="ล้างเส้นทาง"><i class="fas fa-trash"></i></button>
                                            <button class="btn btn-sm btn-outline-secondary" onclick="hideSimUI()"><i class="fas fa-eye-slash"></i> ซ่อน UI</button>
                                            <button id="sim-start-btn" class="btn btn-sm btn-success" onclick="toggleSimPlaying()">
                                                <i class="fas fa-play" id="sim-play-icon"></i> เริ่มจำลอง
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4 col-xl-3 d-flex flex-column sidebar-column">
                    <div class="card border-0 shadow-sm d-flex flex-column rounded-3 flex-grow-1">
                        <div class="card-header bg-white py-3 border-bottom-0 flex-shrink-0">
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
                        
                        <div class="card-body p-0 flex-grow-1" style="overflow-y: auto;">
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
    <?php include 'components/forkliftMapModal.php'; ?>
    
    <script src="../../utils/libs/leaflet.js"></script>
    <script src="../../utils/libs/leaflet-heat.js"></script>
    <script src="../../utils/libs/qrcode.min.js"></script>
    <script src="script/forkliftTracking.js?v=<?php echo filemtime(__DIR__ . '/script/forkliftTracking.js'); ?>" defer></script>
</body>
</html>
