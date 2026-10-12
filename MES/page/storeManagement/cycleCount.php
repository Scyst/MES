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
        #reader { width: 100%; border: none !important; }
        
        .part-card {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            background: #ffffff;
            transition: all 0.2s;
        }
        .part-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05) !important; }
        .part-card.matched { border-left: 6px solid #10b981; }
        .part-card.diff { border-left: 6px solid #ef4444; }
        .part-card.pending { border-left: 6px solid #f59e0b; }
        .part-card.wrong-loc { border-left: 6px solid #f97316; background-color: #fffaf0; }
        
        .cc-container { max-width: 800px; margin: 0 auto; }
        
        .location-btn {
            border-radius: 12px;
            transition: all 0.2s;
            border-width: 2px;
        }
        .location-btn:hover { transform: scale(1.02); }
        .location-btn.selected { border-color: #0d6efd; background-color: #e9ecef; }
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
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h5 class="fw-bold mb-0 text-dark"><i class="fas fa-map text-primary me-2"></i> แผนผังคลังสินค้า (Visual Map)</h5>
                                <?php if (hasPermission('manage_warehouse')): ?>
                                    <button class="btn btn-sm btn-outline-primary fw-bold rounded-pill px-3 shadow-sm" onclick="openZoneSettingsModal()" title="จัดการโซนคลังสินค้า">
                                        <i class="fas fa-layer-group me-1"></i> จัดการโซน
                                    </button>
                                <?php endif; ?>
                            </div>
                            
                            <!-- Legend -->
                            <div class="d-flex gap-2 mb-3 px-1" style="font-size: 0.75rem; overflow-x: auto; white-space: nowrap;">
                                <span class="d-inline-flex align-items-center"><span class="d-inline-block rounded-circle bg-secondary me-1" style="width:10px;height:10px;"></span>รอตรวจ (Pending)</span>
                                <span class="d-inline-flex align-items-center"><span class="d-inline-block rounded-circle bg-warning me-1" style="width:10px;height:10px;"></span>กำลังเช็ค (In Progress)</span>
                                <span class="d-inline-flex align-items-center"><span class="d-inline-block rounded-circle bg-success me-1" style="width:10px;height:10px;"></span>เสร็จสิ้น (Completed)</span>
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
                                <div class="card mb-3 border-0 shadow-sm rounded-3">
                                    <div class="card-header bg-light border-0 py-2">
                                        <h6 class="mb-0 fw-bold text-dark"><i class="fas fa-layer-group me-2 text-muted"></i><?= htmlspecialchars($zoneName) ?></h6>
                                    </div>
                                    <div class="card-body p-2">
                                        <div class="row g-2">
                                            <?php foreach($zoneLocs as $loc): ?>
                                                <?php 
                                                    $statusClass = 'btn-outline-secondary';
                                                    $bgStyle = '';
                                                    $icon = ''; // No icon for cleaner map look, just colors
                                                    if ($loc['current_status'] === 'IN_PROGRESS') {
                                                        $statusClass = 'btn-warning text-dark border-warning shadow-sm';
                                                        $bgStyle = 'background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0, rgba(255,255,255,0.2) 10px, transparent 10px, transparent 20px);';
                                                        $icon = '<i class="fas fa-spinner fa-spin position-absolute top-0 end-0 m-1" style="font-size: 10px;"></i>';
                                                    } elseif ($loc['current_status'] === 'COMPLETED') {
                                                        $statusClass = 'btn-success text-white border-success shadow-sm';
                                                        $icon = '<i class="fas fa-check position-absolute top-0 end-0 m-1" style="font-size: 10px;"></i>';
                                                    }
                                                ?>
                                                <div class="col-4 col-md-3 col-lg-2">
                                                    <button class="btn <?= $statusClass ?> w-100 fw-bold location-btn position-relative" 
                                                            style="height: 60px; border-radius: 8px; <?= $bgStyle ?>"
                                                            onclick="selectLocationUI(<?= $loc['location_id'] ?>, '<?= htmlspecialchars($loc['location_name']) ?>', this)">
                                                        <?= $icon ?>
                                                        <span class="fs-6"><?= htmlspecialchars($loc['location_name']) ?></span>
                                                    </button>
                                                </div>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                        
                        <div class="flex-shrink-0 pt-3 bg-white mt-auto position-sticky bottom-0" style="border-top: 1px solid #eee; z-index: 10;">
                            <input type="hidden" id="locationSelect">
                            <button class="btn btn-primary w-100 py-3 fw-bold shadow-sm rounded-3 fs-5" onclick="startSession()" id="btnStartSession" disabled>
                                เริ่มตรวจนับชั้นที่เลือก <i class="fas fa-arrow-right ms-2"></i>
                            </button>
                        </div>
                    </div>

                    <!-- View 2: Counting Session -->
                    <div id="viewCounting" class="d-none flex-column h-100" style="min-height: 0;">
                        <div class="flex-shrink-0">
                            <div class="d-flex justify-content-between align-items-center mb-3 p-2 bg-light rounded border">
                                <div>
                                    <span class="text-muted small d-block">Location</span>
                                    <h6 class="fw-bold mb-0 text-primary" id="currentLocationName">-</h6>
                                </div>
                                <div class="text-end">
                                    <span class="badge bg-warning text-dark" id="sessionStatusBadge">กำลังเช็ค</span>
                                </div>
                            </div>

                            <!-- Continuous Scan & Gun Status Toolbar -->
                            <div class="card mb-3 border-0 bg-light-subtle shadow-sm p-2 rounded-3">
                                <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                    <div class="form-check form-switch mb-0">
                                        <input class="form-check-input" type="checkbox" id="switchContinuousScan" onchange="toggleContinuousScan(this.checked)">
                                        <label class="form-check-label fw-bold small text-dark" for="switchContinuousScan">
                                            <i class="fas fa-bolt text-warning me-1"></i> โหมดนับต่อเนื่อง (Continuous Scan)
                                        </label>
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle small py-1 px-2" id="scannerStatusIndicator">
                                            <i class="fas fa-hand-paper me-1"></i> โหมดยืนยันด้วยมือ (นับจริง 100%)
                                        </span>
                                        <button class="btn btn-sm btn-outline-secondary border-0 p-1" id="btnToggleSound" onclick="toggleAudioMute()" title="เปิด/ปิดเสียง">
                                            <i class="fas fa-volume-up text-primary" id="iconSoundStatus"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="text-muted" style="font-size: 0.75rem; margin-top: 4px;">
                                    <i class="fas fa-info-circle me-1"></i> ยิงบาร์โค้ดได้ทันทีโดยไม่ต้องคลิกช่องค้นหา ระบบจะเปิดให้กรอกยอดที่นับได้จริง (เปิดสวิตช์หากต้องการนับต่อเนื่อง)
                                </div>
                            </div>

                            <div class="row g-2 mb-3">
                                <div class="col-12 col-md-4">
                                    <button class="btn btn-dark w-100 fw-bold py-2 shadow-sm" onclick="openScanner()">
                                        <i class="fas fa-qrcode me-2"></i> สแกนพาเลท
                                    </button>
                                </div>
                                <div class="col-12 col-md-8">
                                    <div class="input-group shadow-sm">
                                        <span class="input-group-text bg-white border-end-0"><i class="fas fa-keyboard text-muted"></i></span>
                                        <input type="text" class="form-control border-start-0 py-2 fw-bold" id="manualTagInput" placeholder="พิมพ์เลข Tag..." onkeypress="if(event.key === 'Enter') handleManualTag()">
                                        <button class="btn btn-primary px-4 fw-bold" onclick="handleManualTag()">ค้นหา</button>
                                    </div>
                                </div>
                            </div>

                            <div class="alert alert-info py-2 small mb-3 border-0 bg-opacity-10 bg-info text-info-emphasis">
                                <i class="fas fa-eye-slash me-1"></i> <strong>Blind Count:</strong> ระบบจะซ่อนเลข Tag ที่ยังไม่ถูกนับ
                            </div>
                        </div>

                        <!-- Part List -->
                        <div class="flex-grow-1 d-flex flex-column" style="min-height: 0; overflow: hidden;">
                            <ul class="nav nav-pills nav-fill mb-3 bg-light rounded p-1 flex-shrink-0" id="pills-tab" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active fw-bold" id="pills-pending-tab" data-bs-toggle="pill" data-bs-target="#pills-pending" type="button" role="tab">ต้องหา <span class="badge bg-danger ms-1" id="badgePending">0</span></button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link fw-bold" id="pills-counted-tab" data-bs-toggle="pill" data-bs-target="#pills-counted" type="button" role="tab">นับแล้ว <span class="badge bg-success ms-1" id="badgeCounted">0</span></button>
                                </li>
                            </ul>

                            <div class="tab-content flex-grow-1 overflow-auto" id="pills-tabContent" style="min-height: 0;">
                                <div class="tab-pane fade show active pb-3" id="pills-pending" role="tabpanel">
                                    <div id="expectedItemsList"></div>
                                </div>
                                <div class="tab-pane fade pb-3" id="pills-counted" role="tabpanel">
                                    <div id="countedItemsList"></div>
                                </div>
                            </div>
                        </div>

                        <div class="flex-shrink-0 pt-3 bg-white mt-auto" style="border-top: 1px solid #eee;">
                            <button class="btn btn-success w-100 py-3 fw-bold shadow-sm rounded-3 fs-5" onclick="finishSession()">
                                <i class="fas fa-flag-checkered me-1"></i> สรุปผลการตรวจนับคลังนี้
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
            <div class="modal-content border-0 shadow-lg">
                <div class="modal-header bg-primary text-white py-3">
                    <h5 class="modal-title fw-bold">
                        <i class="fas fa-layer-group me-2"></i> ตั้งค่าโซนคลังสินค้า (Warehouse Zone Settings)
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-3 bg-body-tertiary">
                    <!-- Filter and Batch Assign Card -->
                    <div class="card border-0 shadow-sm mb-3">
                        <div class="card-body p-3">
                            <div class="row g-2 align-items-center mb-2">
                                <div class="col-12 col-md-6">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
                                        <input type="text" id="zoneSearchInput" class="form-control" placeholder="ค้นหาชื่อคลังสินค้า..." oninput="filterZoneSettings()">
                                    </div>
                                </div>
                                <div class="col-12 col-md-6">
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text bg-white"><i class="fas fa-filter text-muted"></i></span>
                                        <select id="zoneFilterSelect" class="form-select fw-bold" onchange="filterZoneSettings()">
                                            <option value="">-- กรองตามโซนทั้งหมด --</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Batch Assign Control -->
                            <div class="p-2 bg-light rounded border d-flex flex-wrap align-items-center justify-content-between gap-2">
                                <div class="d-flex align-items-center gap-2">
                                    <div class="form-check mb-0">
                                        <input class="form-check-input" type="checkbox" id="chkSelectAllZones" onchange="toggleSelectAllZones(this.checked)">
                                        <label class="form-check-label fw-bold small" for="chkSelectAllZones">เลือกทั้งหมด</label>
                                    </div>
                                    <span class="badge bg-secondary" id="badgeSelectedZoneCount">เลือก 0 รายการ</span>
                                </div>
                                <div class="d-flex align-items-center gap-1 flex-grow-1 justify-content-end" style="max-width: 380px;">
                                    <input list="zoneListDatalist" id="batchZoneInput" class="form-control form-control-sm" placeholder="พิมพ์หรือเลือกชื่อโซนใหม่...">
                                    <datalist id="zoneListDatalist"></datalist>
                                    <button class="btn btn-sm btn-outline-primary fw-bold text-nowrap" onclick="applyBatchZone()">
                                        <i class="fas fa-check me-1"></i> ปรับใช้
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Locations Table -->
                    <div class="card border-0 shadow-sm">
                        <div class="table-responsive" style="max-height: 400px;">
                            <table class="table table-hover table-striped align-middle mb-0 text-center" style="font-size: 0.9rem;">
                                <thead class="table-light sticky-top">
                                    <tr>
                                        <th style="width: 40px;"></th>
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
                <div class="modal-footer bg-white border-top py-2">
                    <button type="button" class="btn btn-secondary fw-bold" data-bs-dismiss="modal">ยกเลิก</button>
                    <button type="button" class="btn btn-primary fw-bold shadow-sm" id="btnSaveZones" onclick="saveZoneSettings()">
                        <i class="fas fa-save me-1"></i> บันทึกการเปลี่ยนแปลง
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
