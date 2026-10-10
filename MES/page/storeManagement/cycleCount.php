<?php
require_once __DIR__ . '/../components/init.php';
require_once __DIR__ . '/../db.php';
requirePermission('view_warehouse');
if (!isset($_SESSION['user'])) {
    header("Location: ../../login.php");
    exit;
}

$locations = [];
$stmt = $pdo->query("
    SELECT 
        l.location_id, 
        l.location_name,
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
                    <!-- View 1: Select Location -->
                    <div id="viewSelectLocation" class="d-flex flex-column h-100" style="min-height: 0;">
                        <div class="flex-shrink-0">
                            <h5 class="fw-bold mb-4 text-dark"><i class="fas fa-map-marker-alt text-primary me-2"></i> เลือก Location ที่ต้องการตรวจ</h5>
                        </div>
                        
                        <div class="flex-grow-1 overflow-auto" style="min-height: 0; padding-bottom: 20px;">
                            <div class="row g-2" id="locationGrid">
                                <?php foreach($locations as $loc): ?>
                                    <?php 
                                        $statusClass = 'btn-outline-secondary';
                                        $icon = 'fa-box';
                                        if ($loc['current_status'] === 'IN_PROGRESS') {
                                            $statusClass = 'btn-warning text-dark border-warning';
                                            $icon = 'fa-spinner fa-spin';
                                        } elseif ($loc['current_status'] === 'COMPLETED') {
                                            $statusClass = 'btn-success text-white border-success';
                                            $icon = 'fa-check-circle';
                                        }
                                    ?>
                                    <div class="col-4 col-md-3">
                                        <button class="btn <?= $statusClass ?> w-100 py-3 fw-bold shadow-sm location-btn" onclick="selectLocationUI(<?= $loc['location_id'] ?>, '<?= htmlspecialchars($loc['location_name']) ?>', this)">
                                            <i class="fas <?= $icon ?> d-block mb-1 fs-3"></i>
                                            <?= htmlspecialchars($loc['location_name']) ?>
                                        </button>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        
                        <div class="flex-shrink-0 pt-3 bg-white mt-auto" style="border-top: 1px solid #eee;">
                            <input type="hidden" id="locationSelect">
                            <button class="btn btn-primary w-100 py-3 fw-bold shadow-sm rounded-3 fs-5" onclick="startSession()" id="btnStartSession" disabled>
                                เริ่มตรวจนับ <i class="fas fa-arrow-right ms-2"></i>
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

    <!-- API PATH -->
    <script>
        const API_STORE = 'api/api_store.php';
    </script>
    <script src="script/cycleCount.js?v=<?= time() ?>"></script>
            </div> <!-- End container-fluid -->
        </div> <!-- End main-content -->
    </div> <!-- End page-container -->
</body>
</html>
