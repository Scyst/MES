<?php
// page/forkliftMap/forkliftMapUI.php
require_once '../components/init.php';

$pageIcon = "fas fa-map-marked-alt";
$pageHeaderTitle = "Forklift Live Map";
$pageHeaderSubtitle = "ระบบติดตามตำแหน่งรถโฟล์คลิฟต์แบบ Real-time";
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <?php include '../components/common_head.php'; ?>
    
    <link rel="stylesheet" href="../../utils/libs/leaflet.css" />
    
    <style>
        .map-wrapper {
            position: relative;
            width: 100%;
            margin: 0 auto;
            background-color: var(--bs-tertiary-bg);
            border: 2px solid var(--bs-border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        /* CSS เพิ่มเติมเพื่อให้จุดบอกชื่อ Grid สวยงามตอนอยู่บน Leaflet */
        .custom-grid-label {
            pointer-events: none; /* ไม่ให้ตัวหนังสือบังการคลิก Grid */
        }

        .custom-leaflet-icon {
            background: transparent;
            border: none;
        }
        .forklift-marker-wrapper {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #fff;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            font-size: 14px;
            transition: all 0.3s ease;
        }
        .marker-label-floating {
            position: absolute;
            top: -22px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            pointer-events: none; /* ไม่ให้กล่องตัวหนังสือบังการคลิก */
        }
    </style>
</head>
<body class="layout-top-header">
    <?php include '../components/php/top_header.php'; ?>

    <main id="main-content">
        <div class="container-fluid p-3 h-100">
            <div class="row g-3">
                <div class="col-lg-8">
                    <div class="card shadow-sm h-100">
                        <div class="card-header bg-white d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 fw-bold"><i class="fas fa-map me-2"></i> Live Tracking Map</h6>
                        </div>
                        
                        <div class="card-body p-0 position-relative">
                            
                            <div class="map-wrapper">
                                <div id="map-container" style="width: 100%; height: 600px; z-index: 1;"></div>
                                
                                <div class="btn-group shadow-sm" style="position: absolute; bottom: 30px; left: 15px; z-index: 1000; background: white; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);">
                                    <button class="btn btn-light d-flex align-items-center" onclick="toggleGrid()" title="เปิด/ปิด ตารางกริด (Grid)" style="border-radius: 4px 0 0 4px; padding: 4px 8px; border-right: 1px solid #ddd;">
                                        <i class="fas fa-th text-secondary"></i>
                                    </button>
                                    <button class="btn btn-light d-flex align-items-center" onclick="toggleHeatmap()" title="ดูความหนาแน่น (Heatmap)" style="border-radius: 0 4px 4px 0; padding: 4px 8px;">
                                        <i class="fas fa-fire text-danger"></i>
                                    </button>
                                </div>

                                <div class="btn-group-vertical shadow-sm" style="position: absolute; bottom: 30px; right: 15px; z-index: 1000; background: white; border-radius: 4px; border: 1px solid rgba(0,0,0,0.1);">
                                    
                                    <button class="btn btn-light" onclick="resetMapView()" title="กลับจุดเริ่มต้น (Reset View)" style="border-radius: 4px 4px 0 0; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ddd;">
                                        <i class="fas fa-crosshairs text-primary"></i>
                                    </button>
                                    
                                    <button class="btn btn-light" onclick="map.zoomIn()" title="ซูมเข้า (Zoom In)" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #ddd; border-radius: 0;">
                                        <i class="fas fa-plus text-dark"></i>
                                    </button>
                                    
                                    <button class="btn btn-light" onclick="map.zoomOut()" title="ซูมออก (Zoom Out)" style="border-radius: 0 0 4px 4px; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-minus text-dark"></i>
                                    </button>
                                </div>

                                <div id="playback-controls" class="card shadow-lg d-none" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1000; width: 90%; max-width: 400px; border: 2px solid #0d6efd;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-header bg-white">
                            <h6 class="mb-2 fw-bold"><i class="fas fa-list me-2"></i> Forklift Status</h6>
                            
                            <div class="btn-group w-100 mb-2" role="group">
                                <button type="button" class="btn btn-outline-secondary btn-sm active" onclick="filterByStatus('ALL', this)">ทั้งหมด</button>
                                <button type="button" class="btn btn-outline-success btn-sm" onclick="filterByStatus('ONLINE', this)">Online</button>
                                <button type="button" class="btn btn-outline-danger btn-sm" onclick="filterByStatus('LOW_BAT', this)">แบตต่ำ</button>
                            </div>

                            <input type="text" id="search-forklift" class="form-control form-control-sm" placeholder="🔍 ค้นหารหัสรถ หรือโซน..." onkeyup="filterForkliftList()">
                        </div>
                        <div class="card-body p-0">
                            <ul class="list-group list-group-flush" id="forklift-list">
                                <li class="list-group-item text-center text-muted py-4">กำลังโหลดข้อมูล...</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>  
    </main>
    
    <?php include 'components/forkliftMapModal.php'; ?>
    
    <script src="../../utils/libs/leaflet.js"></script>
    <script src="../../utils/libs/leaflet-heat.js"></script>
    <script src="script/forkliftTracking.js?v=<?php echo filemtime(__DIR__ . '/script/forkliftTracking.js'); ?>" defer></script>
</body>
</html>