<?php
require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/../db.php';
requirePermission('view_warehouse');
if (!isset($_SESSION['user'])) {
    header("Location: ../../login.php");
    exit;
}

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

$locations = [];
$stmt = $pdo->query("
    SELECT 
        l.location_id, 
        l.location_name,
        l.zone_name,
        (SELECT TOP 1 status 
         FROM dbo.CYCLE_COUNT_SESSIONS s WITH (NOLOCK) 
         WHERE s.location_id = l.location_id 
           AND CAST(s.created_at AS DATE) = CAST(GETDATE() AS DATE)
         ORDER BY s.session_id DESC) as current_status
    FROM dbo.LOCATIONS l WITH (NOLOCK) 
    WHERE l.location_type = 'STORE' AND l.is_active = 1 
    ORDER BY l.location_name
");
$locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

$pageTitle = "Stock Check (Cycle Count)";
$pageIcon = "fas fa-clipboard-check"; 
$pageHeaderTitle = "Stock Check";
$pageHeaderSubtitle = "ระบบตรวจนับสินค้าในคลัง";
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <meta name="csrf-token" content="<?php echo $_SESSION['csrf_token'] ?? ''; ?>">
    <?php include_once '../components/common_head.php'; ?>
    <script src="../../utils/libs/html5-qrcode.min.js"></script>
    <style>
        .list-group-item { cursor: pointer; }
        .list-group-item:hover { background-color: #f1f3f5; }
        #reader { width: 100%; border: none !important; border-radius: 8px; overflow: hidden; }
        
        .cc-container { max-width: 800px; margin: 0 auto; }
        
        /* Zone Card */
        .zone-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            transition: border-color 0.2s;
        }
        .zone-card:hover {
            border-color: #cbd5e1;
        }
        .zone-card-header {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 12px;
        }
        .zone-card-body {
            padding: 10px;
        }

        /* Location Button (Grid Cell) */
        .location-btn {
            height: 52px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.95rem;
            letter-spacing: 0.3px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-width: 1.5px;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        .location-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.06);
        }

        /* Location Button States */
        .btn-loc-pending {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #334155;
            box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .btn-loc-pending:hover {
            background: #f8fafc;
            border-color: #94a3b8;
            color: #0f172a;
        }
        .location-btn.selected {
            background: #eff6ff !important;
            border-color: #2563eb !important;
            color: #1d4ed8 !important;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25) !important;
            transform: translateY(-1px);
        }
        .btn-loc-progress {
            background-color: #fef9c3 !important;
            border-color: #eab308 !important;
            color: #854d0e !important;
            box-shadow: 0 1px 3px rgba(234, 179, 8, 0.15);
            background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.4) 0, rgba(255,255,255,0.4) 10px, transparent 10px, transparent 20px) !important;
        }
        .btn-loc-completed {
            background-color: #dcfce7 !important;
            border-color: #22c55e !important;
            color: #15803d !important;
            box-shadow: 0 1px 3px rgba(34, 197, 94, 0.15);
        }

        /* Interactive Location Pill (Click to change location) */
        .btn-location-pill {
            background: #ffffff;
            border: 1.5px solid #cbd5e1;
            border-radius: 20px;
            padding: 5px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-weight: 700;
            color: #0f172a;
            font-size: 0.95rem;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
            user-select: none;
        }
        .btn-location-pill:hover {
            background: #eff6ff;
            border-color: #2563eb;
            color: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(37, 99, 235, 0.15);
        }
        .btn-location-pill:active {
            transform: translateY(0);
        }

        /* Start Session Button */
        .btn-start-cc {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
        }
        .btn-start-cc:hover:not(:disabled) {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
            transform: translateY(-1px);
        }
        .btn-start-cc:disabled {
            background: #e2e8f0;
            color: #94a3b8;
            box-shadow: none;
            cursor: not-allowed;
            transform: none;
        }

        /* Counting Session Header Card */
        .cc-header-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px 14px;
        }

        /* Scanner Options Bar */
        .cc-scanner-bar {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 8px 12px;
        }

        /* Unified Barcode Input Group */
        .cc-search-group {
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .cc-search-group:focus-within {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
        .cc-search-group .btn-scan {
            background: #1e293b;
            color: #ffffff;
            border: none;
            font-weight: 600;
            font-size: 0.85rem;
            padding: 0 14px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background 0.15s;
        }
        .cc-search-group .btn-scan:hover {
            background: #0f172a;
            color: #ffffff;
        }
        .cc-search-group input {
            border: none;
            box-shadow: none !important;
            font-size: 0.9rem;
            padding: 9px 12px;
            font-weight: 500;
        }
        .cc-search-group select {
            border: none;
            box-shadow: none !important;
            font-size: 0.9rem;
            padding: 9px 12px;
            font-weight: 500;
            color: #334155;
            background-color: transparent;
            cursor: pointer;
        }
        .custom-zone-chk {
            width: 1.15rem;
            height: 1.15rem;
            border: 1.5px solid #94a3b8;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.15s ease-in-out;
            background-color: #ffffff;
            vertical-align: middle;
        }
        .custom-zone-chk:hover {
            border-color: #2563eb;
        }
        .custom-zone-chk:checked {
            background-color: #2563eb;
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }
        .cc-search-group .btn-submit {
            background: #2563eb;
            color: #ffffff;
            border: none;
            padding: 0 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
        }
        .cc-search-group .btn-submit:hover {
            background: #1d4ed8;
            color: #ffffff;
        }

        /* Segmented Nav Tabs */
        .cc-nav-tabs {
            background: #f1f5f9;
            padding: 3px;
            border-radius: 10px;
            display: flex;
            border: 1px solid #e2e8f0;
        }
        .cc-nav-tabs .nav-link {
            flex: 1;
            text-align: center;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 600;
            color: #64748b;
            padding: 7px 10px;
            border: none;
            background: transparent;
            transition: all 0.2s;
        }
        .cc-nav-tabs .nav-link.active {
            background: #ffffff;
            color: #0f172a;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        /* Modern Part Card */
        .part-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 8px;
            background: #ffffff;
            transition: all 0.2s;
            position: relative;
        }
        .part-card:hover {
            transform: translateY(-1px);
            box-shadow: 0 3px 8px rgba(0,0,0,0.04) !important;
        }
        .part-card.pending {
            border-left: 4px solid #f59e0b;
        }
        .part-card.matched {
            border-left: 4px solid #10b981;
            background-color: #f8fcf9;
        }
        .part-card.wrong-loc {
            border-left: 4px solid #f97316;
            background-color: #fffdfa;
        }

        /* Finish Button */
        .btn-finish-cc {
            background: linear-gradient(135deg, #059669 0%, #10b981 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            padding: 12px 20px;
            font-weight: 700;
            font-size: 1rem;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            width: 100%;
        }
        .btn-finish-cc:hover {
            background: linear-gradient(135deg, #047857 0%, #059669 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
            transform: translateY(-1px);
        }
        .btn-finish-cc:active {
            transform: translateY(0);
        }

        .lh-2 {
            line-height: 1.35 !important;
        }

        /* Zone Settings Modal Styling */
        .modal-zone-header {
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            padding: 14px 18px;
        }
        .modal-zone-filter-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .modal-zone-batch-box {
            background: #f8fafc;
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            padding: 10px 12px;
        }
        .modal-zone-table-container {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
            background: #ffffff;
            box-shadow: 0 1px 3px rgba(0,0,0,0.02);
        }
        .modal-zone-table thead th {
            background: #f8fafc;
            border-bottom: 1.5px solid #e2e8f0;
            color: #64748b;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 700;
            padding: 10px 12px;
        }
        .modal-zone-table tbody tr {
            transition: background 0.15s ease;
            border-bottom: 1px solid #f1f5f9;
        }
        .modal-zone-table tbody tr:hover {
            background: #f8fafc;
        }
        .modal-zone-table tbody td {
            padding: 9px 12px;
            vertical-align: middle;
        }
        .loc-zone-input {
            border: 1.5px solid #e2e8f0;
            border-radius: 8px;
            font-size: 0.85rem;
            padding: 6px 10px;
            background: #ffffff;
            transition: all 0.2s;
            font-weight: 500;
            color: #1e293b;
        }
        .loc-zone-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
            outline: none;
        }
        .btn-apply-batch {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 6px 14px;
            font-weight: 600;
            font-size: 0.85rem;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }
        .btn-apply-batch:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
            transform: translateY(-1px);
        }
        .btn-modal-save {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: #ffffff;
            border: none;
            border-radius: 10px;
            padding: 9px 20px;
            font-weight: 700;
            font-size: 0.95rem;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .btn-modal-save:hover {
            background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
            color: #ffffff;
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
            transform: translateY(-1px);
        }
        .btn-modal-cancel {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            color: #64748b;
            border-radius: 10px;
            padding: 9px 18px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s;
        }
        .btn-modal-cancel:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
            color: #334155;
        }
    </style>
</head>

<body class="layout-top-header bg-body-tertiary">
    <?php include '../components/php/top_header.php'; ?>
    
    <div class="page-container">
        <div id="main-content" class="p-2">
            <div class="container-fluid p-0">
                <div class="row g-3">
                    <!-- Left Column: UI Controls -->
        <div class="col-12 col-lg-5">
            <div class="mobile-container cc-container d-flex flex-column bg-white shadow-sm" style="height: calc(100vh - 100px); max-width: 100%; border-radius: 12px; overflow: hidden; position: relative;">

                <div class="p-3 flex-grow-1 d-flex flex-column" id="mainContent" style="min-height: 0; overflow: hidden;">
                    <!-- View 1: Select Location (Visual Map) -->
                    <div id="viewSelectLocation" class="d-flex flex-column h-100" style="min-height: 0;">
                        <div class="flex-shrink-0">
                            <!-- Visual Map Header Bar -->
                            <div class="cc-header-bar mb-2">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2">
                                        <div class="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle" style="width: 36px; height: 36px;">
                                            <i class="fas fa-map-marked-alt fs-6"></i>
                                        </div>
                                        <div>
                                            <h6 class="fw-bold mb-0 text-dark">แผนผังคลังสินค้า</h6>
                                            <span class="text-muted" style="font-size: 0.72rem;">เลือกตำแหน่งเพื่อตรวจนับสต็อก</span>
                                        </div>
                                    </div>
                                    <?php if (hasPermission('manage_warehouse')): ?>
                                        <button class="btn btn-sm btn-light border shadow-xs fw-semibold rounded-pill px-2.5 py-1 text-primary d-inline-flex align-items-center gap-1" onclick="openZoneSettingsModal()" title="จัดการโซนคลังสินค้า" style="font-size: 0.78rem;">
                                            <i class="fas fa-sliders-h text-primary"></i> <span>ตั้งค่าโซน</span>
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>
                            
                            <!-- Legend Toolbar -->
                            <div class="cc-scanner-bar d-flex align-items-center justify-content-around mb-2.5 px-2 py-1.5" style="font-size: 0.75rem;">
                                <span class="d-inline-flex align-items-center text-secondary fw-semibold">
                                    <span class="d-inline-block rounded-circle bg-secondary me-1.5" style="width:8px;height:8px;"></span>รอตรวจ
                                </span>
                                <span class="d-inline-flex align-items-center text-warning-emphasis fw-semibold">
                                    <span class="d-inline-block rounded-circle bg-warning me-1.5" style="width:8px;height:8px;"></span>กำลังเช็ค
                                </span>
                                <span class="d-inline-flex align-items-center text-success fw-semibold">
                                    <span class="d-inline-block rounded-circle bg-success me-1.5" style="width:8px;height:8px;"></span>เสร็จสิ้น
                                </span>
                            </div>
                        </div>
                        
                        <div class="flex-grow-1 overflow-auto px-1" style="min-height: 0; padding-bottom: 20px;">
                            <?php 
                                // Group locations by Zone for visual map
                                $zones = [];
                                foreach ($locations as $loc) {
                                    $name = $loc['location_name'];
                                    if (!empty($loc['zone_name'])) {
                                        $zone = $loc['zone_name'];
                                    } else {
                                        $zone = 'อื่น ๆ (Others)';
                                        if (preg_match('/^([A-H])\d+$/', $name, $matches)) {
                                            $zone = 'โซน ' . $matches[1] . ' (Zone ' . $matches[1] . ')';
                                        } elseif (strpos($name, 'BR-') === 0 || strpos($name, 'BT-') === 0 || strpos($name, 'BWH-') === 0) {
                                            $zone = 'โซน B (ย่อย)';
                                        } elseif (strpos($name, 'AW') === 0) {
                                            $zone = 'โซน A (ย่อย)';
                                        }
                                    }
                                    if (!isset($zones[$zone])) $zones[$zone] = [];
                                    $zones[$zone][] = $loc;
                                }
                                ksort($zones); // A-Z sorting
                            ?>

                            <?php foreach($zones as $zoneName => $zoneLocs): ?>
                                <div class="zone-card mb-2.5">
                                    <div class="zone-card-header d-flex align-items-center justify-content-between">
                                        <div class="d-flex align-items-center gap-1.5">
                                            <i class="fas fa-layer-group text-primary" style="font-size: 0.82rem;"></i>
                                            <span class="fw-bold text-dark" style="font-size: 0.85rem;"><?= htmlspecialchars($zoneName) ?></span>
                                        </div>
                                        <span class="badge rounded-pill bg-light text-muted border px-2 py-0.5" style="font-size: 0.7rem;">
                                            <?= count($zoneLocs) ?> คลัง
                                        </span>
                                    </div>
                                    <div class="zone-card-body">
                                        <div class="row g-2">
                                            <?php foreach($zoneLocs as $loc): ?>
                                                <?php 
                                                    $statusClass = 'btn-loc-pending';
                                                    $icon = '';
                                                    if ($loc['current_status'] === 'IN_PROGRESS') {
                                                        $statusClass = 'btn-loc-progress';
                                                        $icon = '<i class="fas fa-spinner fa-spin position-absolute top-0 end-0 m-1.5" style="font-size: 10px;"></i>';
                                                    } elseif ($loc['current_status'] === 'COMPLETED') {
                                                        $statusClass = 'btn-loc-completed';
                                                        $icon = '<i class="fas fa-check position-absolute top-0 end-0 m-1.5" style="font-size: 10px;"></i>';
                                                    }
                                                ?>
                                                <div class="col-4 col-md-3 col-lg-2">
                                                    <button class="location-btn <?= $statusClass ?> w-100" 
                                                            onclick="selectLocationUI(<?= $loc['location_id'] ?>, '<?= htmlspecialchars($loc['location_name']) ?>', this)">
                                                        <?= $icon ?>
                                                        <span><?= htmlspecialchars($loc['location_name']) ?></span>
                                                    </button>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        
                        <div class="flex-shrink-0 pt-2.5 bg-white mt-auto position-sticky bottom-0 border-top" style="z-index: 10;">
                            <input type="hidden" id="locationSelect">
                            <button class="btn-start-cc" onclick="startSession()" id="btnStartSession" disabled>
                                <i class="fas fa-play-circle fs-5"></i>
                                <span>เริ่มตรวจนับคลังที่เลือก</span>
                            </button>
                        </div>
                    </div>

                    <!-- View 2: Counting Session -->
                    <div id="viewCounting" class="d-none flex-column h-100" style="min-height: 0;">
                        <div class="flex-shrink-0">
                            <!-- Clean Header Bar: Interactive Location Selector Pill + Status -->
                            <div class="cc-header-bar mb-2">
                                <div class="d-flex align-items-center justify-content-between">
                                    <div class="d-flex align-items-center gap-2 min-w-0">
                                        <!-- Clickable Location Pill to change location / go back -->
                                        <button type="button" class="btn-location-pill" onclick="backToLocationSelect()" title="กดเพื่อเปลี่ยนคลังสินค้า / ย้อนกลับ">
                                            <i class="fas fa-map-marker-alt text-primary"></i>
                                            <span id="currentLocationName">-</span>
                                            <i class="fas fa-chevron-down text-muted ms-0.5" style="font-size: 0.65rem;"></i>
                                        </button>

                                        <span class="badge rounded-pill bg-info-subtle text-info border border-info-subtle px-2 py-1" style="font-size: 0.7rem;" title="Blind Count: ระบบปิดบังยอดและเลขแท็กเพื่อให้นับจากของจริง">
                                            <i class="fas fa-eye-slash me-1"></i>Blind Count
                                        </span>
                                    </div>
                                    <div class="flex-shrink-0 ms-2">
                                        <span class="badge rounded-pill bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2.5 py-1.5 fw-semibold" id="sessionStatusBadge" style="font-size: 0.75rem;">
                                            <i class="fas fa-spinner fa-spin me-1"></i>กำลังเช็ค
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Scanner Options Bar: Switch + Indicator + Mute -->
                            <div class="cc-scanner-bar d-flex align-items-center justify-content-between mb-2">
                                <div class="form-check form-switch m-0 d-flex align-items-center gap-2">
                                    <input class="form-check-input mt-0 cursor-pointer" type="checkbox" id="switchContinuousScan" onchange="toggleContinuousScan(this.checked)" style="width: 2.2rem; height: 1.2rem; cursor: pointer;">
                                    <label class="form-check-label small fw-semibold text-dark cursor-pointer mb-0 user-select-none" for="switchContinuousScan">
                                        <i class="fas fa-bolt text-warning me-1"></i>นับต่อเนื่อง
                                    </label>
                                    <span class="text-muted" style="font-size: 0.75rem; cursor: pointer;" title="โหมดนับต่อเนื่อง: ยืนยันยอดให้อัตโนมัติเมื่อยิงบาร์โค้ด ไม่ต้องเด้งหน้าต่างกรอกยอด (หากพบของหลงคลังจะหยุดบังคับระบุสาเหตุ)">
                                        <i class="fas fa-question-circle"></i>
                                    </span>
                                </div>
                                <div class="d-flex align-items-center gap-2">
                                    <span class="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-2.5 py-1 small fw-medium" id="scannerStatusIndicator" title="สถานะโหมดตรวจนับ">
                                        <i class="fas fa-hand-paper me-1 text-primary"></i> นับจริง 100%
                                    </span>
                                    <button class="btn btn-sm btn-white border rounded-circle shadow-xs d-flex align-items-center justify-content-center text-muted p-0" 
                                            id="btnToggleSound" 
                                            onclick="toggleAudioMute()" 
                                            style="width: 30px; height: 30px;"
                                            title="เปิด/ปิดเสียง Beep">
                                        <i class="fas fa-volume-up text-primary" id="iconSoundStatus" style="font-size: 0.85rem;"></i>
                                    </button>
                                </div>
                            </div>

                            <!-- Barcode Search Input Group -->
                            <div class="input-group cc-search-group shadow-sm mb-2.5">
                                <button class="btn btn-scan" type="button" onclick="openScanner()" title="เปิดกล้องสแกน QR / Barcode">
                                    <i class="fas fa-camera text-info"></i>
                                    <span>สแกน</span>
                                </button>
                                <input type="text" class="form-control" id="manualTagInput" placeholder="ยิงบาร์โค้ด หรือพิมพ์เลขแท็ก..." onkeypress="if(event.key === 'Enter') handleManualTag()">
                                <button class="btn btn-submit" type="button" onclick="handleManualTag()" title="ค้นหา/ตรวจนับ">
                                    <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Segmented Navigation & Part Lists -->
                        <div class="flex-grow-1 d-flex flex-column" style="min-height: 0; overflow: hidden;">
                            <ul class="nav cc-nav-tabs mb-2 flex-shrink-0" id="pills-tab" role="tablist">
                                <li class="nav-item flex-fill" role="presentation">
                                    <button class="nav-link active w-100" id="pills-pending-tab" data-bs-toggle="pill" data-bs-target="#pills-pending" type="button" role="tab">
                                        <i class="fas fa-clock text-warning me-1"></i>ต้องหา
                                        <span class="badge rounded-pill bg-danger-subtle text-danger border border-danger-subtle ms-1 px-2" id="badgePending">0</span>
                                    </button>
                                </li>
                                <li class="nav-item flex-fill" role="presentation">
                                    <button class="nav-link w-100" id="pills-counted-tab" data-bs-toggle="pill" data-bs-target="#pills-counted" type="button" role="tab">
                                        <i class="fas fa-check-circle text-success me-1"></i>นับแล้ว
                                        <span class="badge rounded-pill bg-success-subtle text-success border border-success-subtle ms-1 px-2" id="badgeCounted">0</span>
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content flex-grow-1 overflow-auto pe-1" id="pills-tabContent" style="min-height: 0;">
                                <div class="tab-pane fade show active pb-3" id="pills-pending" role="tabpanel">
                                    <div id="expectedItemsList"></div>
                                </div>
                                <div class="tab-pane fade pb-3" id="pills-counted" role="tabpanel">
                                    <div id="countedItemsList"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Bottom Finish Button -->
                        <div class="flex-shrink-0 pt-2.5 bg-white mt-auto border-top">
                            <button class="btn-finish-cc" onclick="finishSession()">
                                <i class="fas fa-flag-checkered fs-5"></i>
                                <span>สรุปผลการตรวจนับคลังนี้</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Column: Visual Shelf (PC Only) -->
        <div class="col-12 col-lg-7 d-none d-lg-block">
            <div class="card border-0 shadow-sm" style="height: calc(100vh - 100px); border-radius: 12px; overflow: hidden;">
                <div class="card-header bg-white border-bottom py-3">
                    <h5 class="card-title fw-bold mb-0 text-dark"><i class="fas fa-layer-group text-primary me-2"></i> แผนผังจำลองชั้นวางสต็อก (Shelf Monitor)</h5>
                </div>
                <div class="card-body bg-body-tertiary" id="shelfContainer" style="overflow-y: auto;">
                    <div class="d-flex align-items-center justify-content-center h-100 text-muted">
                        <div class="text-center">
                            <i class="fas fa-box-open fa-3x mb-3 text-secondary opacity-50"></i>
                            <h5>เลือก Location ด้านซ้ายเพื่อแสดงข้อมูล</h5>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Scanner Modal -->
    <div class="modal fade" id="scannerModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-fullscreen-md-down">
            <div class="modal-content border-0">
                <div class="modal-header bg-dark text-white border-0 py-2">
                    <h6 class="modal-title fw-bold">สแกน QR Code (พาเลท)</h6>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-0 bg-black position-relative">
                    <div id="reader"></div>
                    <div class="position-absolute bottom-0 w-100 p-3 text-center" style="background: rgba(0,0,0,0.5);">
                        <button class="btn btn-outline-light btn-sm" onclick="toggleCamera()">สลับกล้อง</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Input Qty Modal -->
    <div class="modal fade" id="inputQtyModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static" style="z-index: 1070;">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-primary text-white py-2 border-0">
                    <h6 class="modal-title fw-bold">บันทึกยอดจริง (Actual Qty)</h6>
                </div>
                <div class="modal-body p-4 bg-light">
                    <div class="text-center mb-4 p-3 bg-white rounded border shadow-sm">
                        <div class="text-muted small mb-1">QR Code / แท็ก</div>
                        <h4 class="fw-bold text-dark mb-0" id="inputTagNo">-</h4>
                        <div class="badge bg-warning text-dark mt-2 d-none p-2" id="wrongLocationWarning">
                            <i class="fas fa-exclamation-triangle"></i> <strong>ของหลงคลัง!</strong> <br>ระบบจะบันทึกรับเข้าคลังนี้ให้
                        </div>
                    </div>
                    
                    <div class="form-group mb-4">
                        <label class="form-label fw-bold text-secondary">ยอดที่นับได้จริง (ชิ้น):</label>
                        <input type="number" class="form-control form-control-lg text-center fw-bold text-primary shadow-sm" id="inputActualQty" placeholder="0" inputmode="numeric" style="font-size: 2rem;">
                    </div>

                    <div class="form-group mb-3 d-none p-3 bg-danger bg-opacity-10 border border-danger rounded" id="inputReasonContainer">
                        <label class="form-label text-danger fw-bold"><i class="fas fa-exclamation-circle"></i> ยอดไม่ตรง! โปรดระบุสาเหตุ:</label>
                        <select class="form-select border-danger text-danger" id="inputReason">
                            <option value="">-- เลือกสาเหตุ --</option>
                            <option value="นับครั้งก่อนผิดพลาด">นับครั้งก่อนผิดพลาด</option>
                            <option value="ของหาย">ของหาย</option>
                            <option value="ของเกิน">ของเกิน</option>
                            <option value="เสียหาย/ชำรุด">เสียหาย/ชำรุด</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer bg-white border-top-0 p-3">
                    <button type="button" class="btn btn-light border fw-bold w-100 mb-2" onclick="cancelInputQty()">ยกเลิก</button>
                    <button type="button" class="btn btn-primary fw-bold w-100 py-2 shadow-sm" id="btnConfirmQty" onclick="submitActualQty()">
                        ยืนยันยอด <i class="fas fa-check ms-1"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Zone Settings Modal -->
    <div class="modal fade" id="zoneSettingsModal" tabindex="-1" aria-hidden="true" style="z-index: 1065;">
        <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                <!-- Modal Header -->
                <div class="modal-header modal-zone-header d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle flex-shrink-0" style="width: 40px; height: 40px;">
                            <i class="fas fa-layer-group" style="font-size: 1rem;"></i>
                        </div>
                        <div class="d-flex flex-column justify-content-center min-w-0">
                            <h6 class="fw-bold text-dark mb-0 lh-2" style="font-size: 1rem; letter-spacing: -0.2px;">ตั้งค่าโซนคลังสินค้า</h6>
                            <span class="text-muted mt-1.5 lh-2" style="font-size: 0.75rem;">จัดกลุ่มโซนสำหรับแผนผัง Visual Map</span>
                        </div>
                    </div>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>

                <div class="modal-body p-3" style="background-color: #f8fafc !important;">
                    <!-- Filter and Batch Assign Card -->
                    <div class="modal-zone-filter-card mb-3">
                        <div class="row g-2 align-items-center mb-2.5">
                            <div class="col-12 col-md-6">
                                <div class="input-group cc-search-group">
                                    <span class="input-group-text bg-transparent border-0 ps-3 pe-2 text-muted"><i class="fas fa-search" style="font-size: 0.85rem;"></i></span>
                                    <input type="text" id="zoneSearchInput" class="form-control ps-0" placeholder="ค้นหาชื่อคลังสินค้า..." oninput="filterZoneSettings()">
                                </div>
                            </div>
                            <div class="col-12 col-md-6">
                                <div class="input-group cc-search-group">
                                    <span class="input-group-text bg-transparent border-0 ps-3 pe-2 text-muted"><i class="fas fa-filter" style="font-size: 0.85rem;"></i></span>
                                    <select id="zoneFilterSelect" class="form-select border-0 ps-0 cursor-pointer" onchange="filterZoneSettings()">
                                        <option value="">-- กรองตามโซนทั้งหมด --</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Batch Assign Control -->
                        <div class="modal-zone-batch-box">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="small fw-bold text-dark d-inline-flex align-items-center gap-1.5">
                                    <i class="fas fa-layer-group text-primary" style="font-size: 0.8rem;"></i>
                                    <span>กำหนดโซนแบบกลุ่ม (Batch Assign)</span>
                                </span>
                                <span class="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 small fw-semibold" id="badgeSelectedZoneCount">เลือก 0 รายการ</span>
                            </div>

                            <div class="input-group cc-search-group w-100">
                                <span class="input-group-text bg-transparent border-0 ps-3 pe-2 text-muted">
                                    <i class="fas fa-tag" style="font-size: 0.82rem;"></i>
                                </span>
                                <input list="zoneListDatalist" id="batchZoneInput" class="form-control ps-0" placeholder="พิมพ์หรือเลือกชื่อโซนใหม่..." style="font-size: 0.88rem;">
                                <datalist id="zoneListDatalist"></datalist>
                                <button class="btn btn-submit text-nowrap px-3 fw-bold" type="button" onclick="applyBatchZone()" style="white-space: nowrap; font-size: 0.85rem; letter-spacing: 0.2px;">
                                    <i class="fas fa-check me-1"></i>ปรับใช้
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Locations Table -->
                    <div class="modal-zone-table-container">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table modal-zone-table align-middle mb-0 text-center">
                                <thead class="sticky-top">
                                    <tr>
                                        <th style="width: 44px;" class="text-center align-middle">
                                            <input class="form-check-input custom-zone-chk m-0" type="checkbox" id="chkSelectAllZones" onchange="toggleSelectAllZones(this.checked)" title="เลือกทั้งหมด">
                                        </th>
                                        <th class="text-start">รหัสคลัง (Location)</th>
                                        <th class="text-start">โซนที่กำหนด (Zone)</th>
                                    </tr>
                                </thead>
                                <tbody id="zoneTableBody">
                                    <tr>
                                        <td colspan="3" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin fa-2x"></i></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="modal-footer bg-white border-top py-2.5 px-3 d-flex justify-content-end gap-2">
                    <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn-modal-save" id="btnSaveZones" onclick="saveZoneSettings()">
                        <i class="fas fa-save"></i> <span>บันทึกการเปลี่ยนแปลง</span>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- API PATH -->
    <script>
        const API_STORE = 'api/api_store.php';
    </script>
    <script src="script/storeCommon.js?v=<?= time() ?>"></script>
    <script src="script/cycleCount.js?v=<?= time() ?>"></script>
            </div> <!-- End container-fluid -->
        </div> <!-- End main-content -->
    </div> <!-- End page-container -->
</body>
</html>
