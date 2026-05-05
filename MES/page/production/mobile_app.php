<?php 
    include_once("../../auth/check_auth.php");
    
    $canManage = hasPermission('manage_production'); 
    $canAdd = hasPermission('add_production') || hasPermission('manage_production');
    
    if (!$canAdd) { 
        header("HTTP/1.0 403 Forbidden");
        echo "Access Denied: You do not have permission to access the mobile app.";
        exit;
    }

    $currentUserForJS = $_SESSION['user'] ?? null;
    $location_id = $_SESSION['location_id'] ?? 0;
    date_default_timezone_set('Asia/Bangkok');
    $current_hour = (int)date('H');

    $active_type = $_GET['type'] ?? 'production';
    $scanned_transfer_id = $_GET['transfer_id'] ?? null;
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Scanner App</title>
    <?php include_once '../components/common_head.php'; ?>
    <style>
        /* 🌟 GLOBAL MOBILE UI & COMPACT TYPOGRAPHY 🌟 */
        body { 
            background-color: #f4f6f9; 
            font-size: 0.9rem; /* ปรับฟอนต์พื้นฐานให้กระชับขึ้น */
            padding-bottom: 85px; /* เผื่อที่ให้เมนูด้านล่าง */
            overflow-x: hidden;
        }
        
        /* App Header */
        .app-header {
            position: sticky; top: 0; z-index: 1040;
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            padding: 15px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);
            display: flex; justify-content: space-between; align-items: center;
        }
        .app-title { font-size: 1.15rem; font-weight: 800; margin: 0; color: #343a40; }

        /* Unified Cards */
        .app-card {
            background: #fff; border-radius: 16px; padding: 15px; margin: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #edf2f7;
        }
        
        /* Compact Form Controls */
        .form-label { font-size: 0.75rem; font-weight: 700; color: #6c757d; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px; }
        .form-control, .form-select { 
            font-size: 0.9rem; padding: 0.5rem 0.75rem; border-radius: 8px; 
            border: 1px solid #ced4da; background-color: #fff;
        }
        .form-control:focus, .form-select:focus { border-color: #86b7fe; box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15); }
        .input-group-text { font-size: 0.9rem; border-radius: 8px; }
        .form-control-readonly { background-color: #f8f9fa !important; opacity: 1; }

        /* Touch-Friendly Primary Buttons */
        .btn-app-primary {
            border-radius: 12px; padding: 12px; font-size: 1rem; font-weight: bold;
            box-shadow: 0 4px 12px rgba(13, 110, 253, 0.2); width: 100%;
        }

        /* Grouped Inputs for Production Qty */
        .qty-group { background: #f8f9fa; border-radius: 12px; padding: 10px; border: 1px solid #e9ecef; }
        .qty-group .form-control { text-align: center; font-size: 1.1rem; font-weight: bold; }

        /* 🌟 NATIVE BOTTOM NAVIGATION 🌟 */
        .bottom-nav {
            position: fixed; bottom: 0; left: 0; right: 0;
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            border-top: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-around;
            padding-bottom: env(safe-area-inset-bottom); z-index: 1050; box-shadow: 0 -4px 20px rgba(0,0,0,0.04);
            height: calc(65px + env(safe-area-inset-bottom));
        }
        .nav-item-btn {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #adb5bd; text-decoration: none; font-size: 0.65rem; font-weight: 700;
            transition: 0.2s; border: none; background: transparent; padding: 0;
        }
        .nav-item-btn i { font-size: 1.3rem; margin-bottom: 3px; transition: 0.2s; }
        .nav-item-btn.active { color: #0d6efd; }
        .nav-item-btn.active i { transform: translateY(-2px) scale(1.1); }

        /* Hide logic for SPA */
        .app-section { display: none; animation: fadeIn 0.3s ease; }
        .app-section.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

        /* Autocomplete & Scanner */
        .autocomplete-results { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; position: absolute; width: 100%; z-index: 1050; max-height: 200px; overflow-y: auto; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .autocomplete-item { padding: 10px 12px; font-size: 0.85rem; cursor: pointer; border-bottom: 1px solid #f1f3f5; }
        .autocomplete-item:active { background: #e9ecef; }
        
        /* History Cards */
        .review-card { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 10px; border: 1px solid #edf2f7; font-size: 0.85rem; }
        .review-card .badge { font-size: 0.7rem; }
    </style>
</head>
<body>
    <?php include_once('../components/php/spinner.php'); ?>

    <header class="app-header">
        <h1 class="app-title" id="appHeaderTitle">บันทึกผลิต (OUT)</h1> 
        <button class="btn btn-light btn-sm rounded-circle shadow-sm" type="button" data-bs-toggle="offcanvas" data-bs-target="#globalMobileMenu">
            <i class="fas fa-bars"></i>
        </button>
    </header>

    <?php include_once '../components/php/nav_dropdown.php'; ?>

    <div id="section-in" class="app-section <?php echo $active_type === 'receipt' ? 'active' : ''; ?>">
        
        <div class="app-card p-3 mb-3 text-center">
            <h6 class="fw-bold text-secondary mb-3"><i class="fas fa-qrcode me-1"></i> สแกน QR หรือระบุ Transfer ID</h6>
            
            <div id="qr-reader-container" class="mb-3">
                <div id="qr-reader" style="width:100%; border-radius: 8px; overflow: hidden; border: 2px dashed #ced4da;"></div>
            </div>
            
            <div class="d-flex flex-column gap-2">
                <label for="scan-image-file" class="btn btn-outline-secondary btn-sm rounded-pill w-100 fw-bold">
                    <i class="fas fa-image me-1"></i> อัปโหลดรูป QR จากคลังภาพ
                </label>
                <input type="file" id="scan-image-file" accept="image/*" style="display: none;">
                
                <div class="d-flex align-items-center mt-2 mb-2">
                    <hr class="flex-grow-1"><span class="mx-2 text-muted small">หรือ</span><hr class="flex-grow-1">
                </div>
                
                <div class="input-group">
                    <input type="text" id="manual_scan_id_input" class="form-control text-uppercase fw-bold text-primary" placeholder="T-XXXXXX...">
                    <button class="btn btn-primary fw-bold px-3" type="button" id="manual_scan_id_btn">โหลด</button>
                </div>
            </div>
        </div>

        <form id="mobileReceiptForm" data-action="addEntry" class="app-card">
            <div class="row g-2 mb-2">
                <div class="col-6"><label class="form-label">วันที่</label><input type="date" class="form-control" id="entry_log_date" name="log_date" required></div>
                <div class="col-6"><label class="form-label">เวลา</label><input type="time" class="form-control" id="entry_log_time" name="log_time" step="1" required></div>
            </div>

            <div class="mb-2 position-relative">
                <label class="form-label">ชิ้นส่วน (SAP No. / Part) <span class="text-danger">*</span></label>
                <input type="text" class="form-control fw-bold" id="entry_item_search" name="item_search" autocomplete="off" placeholder="ค้นหาชิ้นส่วน..." required>
                <input type="hidden" id="entry_item_id" name="item_id" required>
            </div>

            <div class="mb-2"><label class="form-label">รับจาก (From)</label><select class="form-select bg-light" id="entry_from_location_id" name="from_location_id"></select></div>
            
            <?php if ($location_id <= 0): ?>
                <div class="mb-3"><label class="form-label text-success">เก็บเข้าคลัง (To) <span class="text-danger">*</span></label><select class="form-select border-success fw-bold" id="location_display" name="to_location_id" required></select></div>
            <?php endif; ?>

            <div class="qty-group mb-3 row align-items-center mx-0">
                <div class="col-7 px-1">
                    <label class="form-label text-success mb-1">จำนวนรับเข้า <span class="text-danger">*</span></label>
                    <input type="number" class="form-control text-success border-success" id="entry_quantity_in" name="confirmed_quantity" min="1" step="any" required>
                </div>
                <div class="col-5 px-1 text-center border-start">
                    <label class="form-label text-muted mb-0">สต็อกต้นทาง</label>
                    <div id="entry_available_stock" class="fw-bold text-dark fs-5 mt-1">--</div>
                </div>
            </div>

            <div class="mb-2">
                <label class="form-label">Transfer ID / Lot</label>
                <input type="text" class="form-control bg-light" id="entry_lot_no" name="lot_no" readonly placeholder="Auto-filled">
                <input type="hidden" id="entry_transfer_uuid" name="transfer_uuid">
            </div>

            <button type="submit" class="btn btn-success btn-app-primary mt-3"><i class="fas fa-save me-1"></i> ยืนยันรับของเข้า</button>
        </form>
    </div>

    <div id="section-out" class="app-section <?php echo $active_type === 'production' ? 'active' : ''; ?>">
        <form id="mobileProductionForm" data-action="addPart" class="app-card">
            <div class="row g-2 mb-2">
                <div class="col-6"><label class="form-label">วันที่</label><input type="date" id="out_log_date" name="log_date" class="form-control" required></div>
                <div class="col-6">
                    <label class="form-label">เวลาผลิต</label>
                    <select id="out_time_slot" name="time_slot" class="form-select text-primary fw-bold bg-light">
                        <?php
                            for ($h = 0; $h < 24; $h++) {
                                $start_h = str_pad($h, 2, '0', STR_PAD_LEFT);
                                $end_h = str_pad(($h + 1) % 24, 2, '0', STR_PAD_LEFT);
                                $slot_value = "{$start_h}:00:00|{$start_h}:59:59"; 
                                $selected = ($h == $current_hour) ? 'selected' : '';
                                echo "<option value=\"{$slot_value}\" {$selected}>{$start_h}:00 - {$end_h}:00</option>";
                            }
                        ?>
                    </select>
                </div>
            </div>

            <div class="mb-2 position-relative">
                <label class="form-label">สินค้า FG (SAP No.) <span class="text-danger">*</span></label>
                <input type="text" class="form-control fw-bold" id="out_item_search" name="item_search" autocomplete="off" placeholder="ค้นหาสินค้า..." required>
                <input type="hidden" id="out_item_id" name="item_id" required>
            </div>

            <?php if ($location_id <= 0): ?>
                <div class="mb-3"><label class="form-label">จุดจัดเก็บ (To) <span class="text-danger">*</span></label><select class="form-select bg-light" id="out_location_id_custom" name="location_id" required></select></div>
            <?php endif; ?>

            <div class="qty-group mb-3">
                <label class="form-label text-dark mb-2"><i class="fas fa-boxes me-1"></i> ระบุจำนวน (PCS)</label>
                <div class="row g-2">
                    <div class="col-4">
                        <label class="form-label text-success mb-1 text-center d-block">FG</label>
                        <input type="number" id="out_qty_fg" name="quantity_fg" class="form-control text-success border-success" min="0" step="any" placeholder="0">
                    </div>
                    <div class="col-4">
                        <label class="form-label text-warning mb-1 text-center d-block">HOLD</label>
                        <input type="number" id="out_qty_hold" name="quantity_hold" class="form-control text-warning border-warning" min="0" step="any" placeholder="0">
                    </div>
                    <div class="col-4">
                        <label class="form-label text-danger mb-1 text-center d-block">SCRAP</label>
                        <input type="number" id="out_qty_scrap" name="quantity_scrap" class="form-control text-danger border-danger" min="0" step="any" placeholder="0">
                    </div>
                </div>
            </div>

            <div class="mb-2"><label class="form-label">Lot (Optional)</label><input type="text" class="form-control" id="out_lot_no" name="lot_no" placeholder="ระบุเลข Lot"></div>
            <div class="mb-3"><label class="form-label">หมายเหตุ</label><textarea class="form-control" id="out_notes" name="notes" rows="2" placeholder="สาเหตุการเสีย..."></textarea></div>

            <button type="submit" class="btn btn-primary btn-app-primary"><i class="fas fa-paper-plane me-1"></i> บันทึกการผลิต</button>
        </form>
    </div>

    <div id="section-review" class="app-section">
        <div class="px-3 pt-2 pb-1">
            <ul class="nav nav-pills nav-fill bg-white rounded-pill p-1 shadow-sm border" id="reviewTab" role="tablist">
                <li class="nav-item"><button class="nav-link active rounded-pill fw-bold" id="review-out-tab" data-bs-toggle="tab" type="button" style="font-size: 0.8rem;"><i class="fas fa-upload"></i> ประวัติ (OUT)</button></li>
                <li class="nav-item"><button class="nav-link rounded-pill fw-bold" id="review-in-tab" data-bs-toggle="tab" type="button" style="font-size: 0.8rem;"><i class="fas fa-download"></i> ประวัติ (IN)</button></li>
            </ul>
        </div>
        <div id="review-list-container" class="px-3 pb-4 pt-2">
            </div>
    </div>

    <div id="section-settings" class="app-section">
        <div class="app-card p-0 overflow-hidden">
            <div class="p-3 border-bottom d-flex justify-content-between align-items-center" id="theme-switcher-btn" style="cursor: pointer;">
                <div class="fw-bold text-dark"><i class="fas fa-adjust me-2 text-secondary"></i>โหมดหน้าจอ (Theme)</div>
                <div class="fs-5 text-primary"><i class="fas fa-moon" id="theme-icon-moon"></i><i class="fas fa-sun" id="theme-icon-sun"></i></div>
            </div>
            <div class="p-3 border-bottom bg-light">
                <div class="fw-bold text-dark mb-1"><i class="fas fa-user me-2 text-secondary"></i>รหัสผู้ใช้งาน</div>
                <div class="text-muted small ms-4"><?php echo htmlspecialchars($currentUserForJS['username']); ?></div>
            </div>
            <div class="p-3 bg-light">
                <div class="fw-bold text-dark mb-1"><i class="fas fa-industry me-2 text-secondary"></i>สังกัดไลน์ / คลัง</div>
                <div class="text-muted small ms-4"><?php echo htmlspecialchars($currentUserForJS['line'] ?? 'N/A'); ?></div>
            </div>
        </div>
        <div class="px-3 mt-4">
            <a href="../../auth/logout.php" class="btn btn-danger btn-app-primary"><i class="fas fa-sign-out-alt me-1"></i> ออกจากระบบ</a>
        </div>
    </div>

    <nav class="bottom-nav">
        <button class="nav-item-btn <?php echo $active_type === 'receipt' ? 'active' : ''; ?>" data-target="section-in" data-title="รับของเข้า (IN)"> 
            <i class="fas fa-download"></i><span>RECEIPT</span>
        </button>
        <button class="nav-item-btn <?php echo $active_type === 'production' ? 'active' : ''; ?>" data-target="section-out" data-title="บันทึกผลิต (OUT)"> 
            <i class="fas fa-upload"></i><span>PRODUCTION</span>
        </button>
        <button class="nav-item-btn" data-target="section-review" data-title="ประวัติการบันทึก">
            <i class="fas fa-history"></i><span>HISTORY</span>
        </button>
        <button class="nav-item-btn" data-target="section-settings" data-title="ตั้งค่า (Settings)">
            <i class="fas fa-cog"></i><span>SETTINGS</span>
        </button>
    </nav>

    <?php
        if ($canAdd) {
            include('components/allProductionModals.php');
        }
    ?>

    <script>
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const TRANSFER_API_URL = 'api/transferManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        
        document.addEventListener('DOMContentLoaded', () => {
            const navBtns = document.querySelectorAll('.nav-item-btn');
            const sections = document.querySelectorAll('.app-section');
            const headerTitle = document.getElementById('appHeaderTitle');

            navBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const targetSectionId = btn.dataset.target;

                    // Update Buttons
                    navBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');

                    // Update Header
                    headerTitle.textContent = btn.dataset.title;

                    // Switch Sections
                    sections.forEach(sec => sec.classList.remove('active'));
                    const targetSection = document.getElementById(targetSectionId);
                    if(targetSection) targetSection.classList.add('active');
                    if (targetSectionId === 'section-in') {
                        startScanning();
                    } else {
                        stopScanning();
                    }

                    if (targetSectionId === 'section-review' && typeof fetchReviewData === 'function') {
                        const isOutTab = document.getElementById('review-out-tab').classList.contains('active');
                        currentReviewType = isOutTab ? 'production' : 'receipt';
                        fetchReviewData();
                    }
                });
            });
        });

        const g_EntryType = <?php echo json_encode($active_type); ?>;
        const g_LocationId = <?php echo json_encode($location_id); ?>; 
        const g_AutoFillData_OLD = null; 
        const g_TransferId_NEW = <?php echo json_encode($scanned_transfer_id); ?>;
    </script>
    <script src="https://unpkg.com/html5-qrcode"></script>
    <script src="script/mobile.js?v=<?php echo filemtime('script/mobile.js'); ?>"></script>
</body>
</html>