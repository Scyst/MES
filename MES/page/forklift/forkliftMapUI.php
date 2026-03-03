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
    <style>
        .map-container {
            position: relative;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background-color: var(--bs-tertiary-bg);
            border: 2px solid var(--bs-border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        /* แผนที่จำลอง (Placeholder) */
        .svg-floorplan {
            width: 100%;
            height: auto;
            display: block;
        }
        /* จุด Marker ของโฟล์คลิฟต์ */
        .forklift-marker {
            position: absolute;
            width: 24px;
            height: 24px;
            background-color: var(--mes-chart-color-3); /* สีส้ม */
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%); /* ให้จุดศูนย์กลางอยู่ตรงพิกัดพอดี */
            transition: all 0.5s ease-in-out; /* อนิเมชั่นเวลาขยับจุด */
            z-index: 10;
            cursor: pointer;
        }
        .forklift-marker.offline {
            background-color: #6c757d; /* สีเทาถ้า Offline */
        }
        .marker-label {
            position: absolute;
            top: -25px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            white-space: nowrap;
            pointer-events: none;
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
                            <h6 class="mb-0 fw-bold"><i class="fas fa-map me-2"></i> Factory Floorplan</h6>
                            <span class="badge bg-success" id="sync-status">Live <i class="fas fa-circle-notch fa-spin ms-1"></i></span>
                        </div>
                        <div class="card-body p-2 text-center">
                            <div class="map-container position-relative" id="map-container" style="max-width: 1200px; display: inline-block;">
                                
                                <img src="../components/images/ZoneMasterLayout.jpg" id="factory-map-img" class="img-fluid w-100" alt="Factory Layout" style="display: block;">
                                
                                <div id="grid-layer" class="position-absolute top-0 start-0 w-100 h-100" style="pointer-events: none;"></div>

                                <div id="markers-layer" class="position-absolute top-0 start-0 w-100 h-100" style="pointer-events: none;"></div>
                                
                            </div>
                            
                            <div class="mt-2 text-end">
                                <button class="btn btn-sm btn-outline-secondary" onclick="toggleGrid()">
                                    <i class="fas fa-th me-1"></i> แสดง/ซ่อน Grid
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card shadow-sm h-100">
                        <div class="card-header bg-white">
                            <h6 class="mb-0 fw-bold"><i class="fas fa-list me-2"></i> Forklift Status</h6>
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

    <?php include_once('../components/php/mobile_menu.php'); ?>
    <?php include 'components/forkliftMapModal.php'; ?>
    <script src="script/forkliftTracking.js?v=<?php echo filemtime(__DIR__ . '/script/forkliftTracking.js'); ?>" defer></script>
</body>
</html>