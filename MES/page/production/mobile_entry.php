<?php 
    include_once("../../auth/check_auth.php");
    
    $canAdd = hasRole(['operator', 'supervisor', 'admin', 'creator']);
    $currentUserForJS = $_SESSION['user'] ?? null;
    $g_autofill_data = null;
    $g_transfer_id = null;
    $entry_type = $_GET['type'] ?? 'production'; 

    if (isset($_GET['transfer_id']) && !empty($_GET['transfer_id'])) {
        $g_transfer_id = $_GET['transfer_id'];
        $entry_type = 'receipt';
    } else if (isset($_GET['scan']) && !empty($_GET['scan'])) {
        $scan_id = $_GET['scan'];
        $entry_type = 'receipt';
        
        require_once __DIR__ . '/../db.php';
        require_once __DIR__ . '/../../config/config.php';

        try {
            $sql = "SELECT job_data FROM " . SCAN_JOBS_TABLE . " WHERE scan_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$scan_id]);
            $job_data_json = $stmt->fetchColumn();

            if ($job_data_json) {
                $g_autofill_data = json_decode($job_data_json, true);
            }
        } catch (Exception $e) {
            error_log("Failed to get scan job data: " . $e->getMessage());
        }
    } else if ($entry_type === 'receipt') {
        $g_autofill_data = [
            'sap_no' => $_GET['sap_no'] ?? null,
            'lot' => $_GET['lot'] ?? null,
            'qty' => $_GET['qty'] ?? null,
            'from_loc_id' => $_GET['from_loc_id'] ?? null
        ];
    }
    $location_id = $_GET['location_id'] ?? 0;
    if (!$canAdd) { 
        header("HTTP/1.0 403 Forbidden");
        echo "Access Denied, insufficient role.";
        exit;
    }
    $is_manual_mode = ($location_id <= 0);

    date_default_timezone_set('Asia/Bangkok');
    $current_hour = (int)date('H'); 
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Mobile Data Entry</title>
    <?php include_once '../components/common_head.php'; ?>
    <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
    <style>
        /* --- 1. Layout พื้นฐาน --- */
        body {
            padding-top: 20px;
            padding-bottom: 80px !important; 
        }

        .container {
            max-width: 600px;
        }

        .form-control, .form-select {
            margin-bottom: 15px;
        }

        /* --- 2. แก้ปัญหาปุ่มใน Input Group ไม่เท่ากัน --- */
        .input-group .form-control {
            margin-bottom: 0;
        }

        /* --- 3. Mobile Nav Bar (เมนูล่าง) --- */
        .mobile-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            display: flex;
            justify-content: space-around;
            align-items: center;
            height: 60px;
            background-color: var(--bs-body-bg);
            border-top: 1px solid var(--bs-border-color);
            z-index: 1030;
        }

        .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--bs-secondary-color);
            font-size: 0.7rem;
            height: 100%;
        }

        /* (สำหรับ 4 ปุ่ม) */
        .mobile-nav.four-items .mobile-nav-item {
            width: 25%;
        }

        .mobile-nav-item i {
            font-size: 1.2rem;
            margin-bottom: 4px;
        }

        .mobile-nav-item.active {
            color: var(--bs-primary);
            font-weight: bold;
        }

        /* --- 4. Scanner Box (กล่องแท็บ สแกน/พิมพ์) --- */
        .scanner-box {
            margin-bottom: 0.5rem;
        }

        .scanner-box .nav-tabs {
            border-bottom: 1px solid var(--bs-border-color);
        }

        .scanner-box .nav-link {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
        }

        /* (ทำให้แท็บที่ไม่ Active โปร่งใส) */
        .scanner-box .nav-link:not(.active) {
            background-color: transparent;
            border-color: transparent;
            color: var(--bs-secondary-color);
        }

        /* (ทำให้เนื้อหาแท็บมีสีพื้นหลังเดียวกับแท็บที่ Active) */
        .scanner-box .tab-content {
            padding: 1rem;
            background-color: var(--bs-body-bg); 
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-top: 1px solid var(--bs-border-color);
        }

        /* --- 5. สไตล์อื่นๆ ของ Mobile (จาก mobile_entry.php/mobile_review.php) --- */
        .autocomplete-results {
            background: #fff;
            color: #000; list-style: none; padding: 0; margin: 0;
            position: absolute; width: calc(100% - 2px);
            z-index: 1050; max-height: 250px; overflow-y: auto;
        }
        .autocomplete-item { padding: 8px; cursor: pointer; }
        .autocomplete-item:hover { background: #eee; }
        .autocomplete-item small { color: #555; }

        #theme-switcher-btn { 
            font-size: 1.2rem;
            cursor: pointer;
            color: var(--bs-secondary-color);
        }
        #theme-switcher-btn:hover {
            color: var(--bs-primary);
        }
        [data-bs-theme="light"] #theme-icon-sun { display: none; }
        [data-bs-theme="dark"] #theme-icon-moon { display: none; }

        #status-overlay {
            display: none; position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.85);
            z-index: 1045;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
        }
        .status-box {
            background-color: var(--bs-secondary-bg);
            padding: 30px;
            border-radius: 8px;
            border: 1px solid var(--bs-border-color);
        }
        .status-box i { font-size: 3rem; color: var(--bs-warning); }
        .status-box h4 { margin-top: 15px; margin-bottom: 10px; }

        #qr-reader-container {
            display: none; 
            padding: 0;
            border: none;
            background: none;
            margin-bottom: 0;
            margin-top: 0;
            position: relative;
            overflow: hidden;
            border-radius: 8px;
        }

        #qr-reader {
            width: 100%;
            border: 1px solid #555;
            border-radius: 8px;
            z-index: 1;
        }

        .qr-file-scanner-overlay {
            position: absolute;
            bottom: 12px;
            left: 0;
            right: 0;
            text-align: center;
            z-index: 10;
        }

        .qr-file-scanner-overlay .btn {
            background-color: rgba(0, 0, 0, 0.4); 
            border-color: rgba(255, 255, 255, 0.5);
            color: #fff;
            backdrop-filter: blur(2px);
        }

        .qr-file-scanner-overlay .btn:hover {
            background-color: rgba(0, 0, 0, 0.6);
            border-color: rgba(255, 255, 255, 0.8);
        }

        .review-card {
            background-color: var(--bs-secondary-bg);
            border: 1px solid var(--bs-border-color);
            border-radius: 0.5rem;
            padding: 10px 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .review-card:hover { background-color: #495057; }
        .card-header {
            font-size: 1.1rem;
            font-weight: bold;
        }
        .card-body {
            font-size: 0.9rem;
            color: #adb5bd;
        }
        .card-body .item { color: #fff; }
        .card-footer {
            font-size: 0.8rem;
            color: #6c757d;
            text-align: right;
            padding-top: 5px;
            border-top: 1px solid var(--bs-border-color);
            margin-top: 8px;
        }
        .header-controls {
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 1.5rem;
            margin-bottom: 1rem;
        }

        /* --- 6. (ใหม่) ซ่อนปุ่ม UI ที่ไม่ต้องการของ Library --- */

        /* (ซ่อนกล่อง Dashboard ที่หุ้มปุ่ม Stop) */
        #qr-reader__dashboard {
            display: none !important;
        }

        /* ซ่อนปุ่ม "Stop Scanning" ที่ติดมากับกล้อง */
        #html5-qrcode-button-camera-stop {
            display: none !important;
        }

        /* ซ่อนลิงก์ "Scan an Image File" (เพราะเรามีปุ่มของเราเองแล้ว) */
        #html5-qrcode-anchor-scan-type-change {
            display: none !important;
        }

        /* (เผื่อไว้) ซ่อนส่วนเลือกกล้อง ถ้ามีหลายกล้อง */
        #html5-qrcode-select-camera {
            display: none !important;
        }
    </style>
</head>
<body id="entry-container">
    <div class="container">
        <?php include_once('../components/php/spinner.php'); ?>
        <div id="toast"></div>

        <div id="status-overlay">
            <div class="status-box">
                <i class="fas fa-exclamation-triangle"></i>
                <h4>สถานะ: ประมวลผลแล้ว</h4>
                <p id="status-details">ใบโอนย้ายนี้ถูกประมวลผลไปแล้ว...</p>
                <button id="close-overlay-btn" class="btn btn-outline-secondary mt-3">ปิด</button>
            </div>
        </div>

        <h3 class="text-center mb-4">
            <?php echo ($entry_type == 'production') ? 'บันทึกของออก (OUT)' : 'บันทึกของเข้า (IN)'; ?>
        </h3>

        <?php if ($entry_type == 'production'): ?>
            
            <form id="mobileProductionForm" data-action="addPart">
                <input type="hidden" id="out_location_id" name="location_id" value="<?php echo $location_id; ?>">
                <input type="hidden" id="out_item_id" name="item_id">

                <div class="row">
                    <div class="col-md-6 col-12">
                        <label for="out_log_date" class="form-label">วันที่</label>
                        <input type="date" id="out_log_date" name="log_date" class="form-control" required>
                    </div>
                    <div class="col-md-6 col-12">
                        <label for="out_time_slot" class="form-label">ช่วงเวลาการผลิต</label>
                        <select id="out_time_slot" name="time_slot" class="form-select">
                            <?php
                                for ($h = 0; $h < 24; $h++) {
                                    $start_time = sprintf('%02d:00:00', $h);
                                    $end_time = sprintf('%02d:59:59', $h);
                                    $display_text = sprintf('%02d:00 - %02d:59', $h, $h);
                                    $value = $start_time . '|' . $end_time;
                                    $selected = ($h == $current_hour) ? 'selected' : '';
                                    echo "<option value=\"$value\" $selected>$display_text</option>";
                                }
                            ?>
                        </select>
                    </div>
                </div>
                <label for="out_item_search" class="form-label">ค้นหาชิ้นส่วน</label>
                <div class="position-relative">
                    <input type="text" id="out_item_search" class="form-control" autocomplete="off" required>
                </div>

                
                <div class_mb-3>
                    <label class="form-label">สถานที่ผลิต:</label>
                    <select id="location_display" class="form-select" <?php echo (!$is_manual_mode) ? 'disabled' : ''; ?>>
                        <?php if ($is_manual_mode): ?>
                            <option value="">-- เลือกสถานที่ --</option>
                        <?php else: ?>
                            <option value="<?php echo $location_id; ?>">Loading location...</option>
                        <?php endif; ?>
                    </select>
                </div>
                
                <label for="out_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                <input type="text" id="out_lot_no" name="lot_no" class="form-control">
                <label for="out_qty_fg" class="form-label text-success">FG (งานดี)</label>
                <input type="number" id="out_qty_fg" name="quantity_fg" class="form-control" min="0" placeholder="0">
                <label for="out_qty_hold" class="form-label text-warning">HOLD (งานรอซ่อม)</label>
                <input type="number" id="out_qty_hold" name="quantity_hold" class="form-control" min="0" placeholder="0">
                <label for="out_qty_scrap" class="form-label text-danger">SCRAP (งานเสีย)</label>
                <input type="number" id="out_qty_scrap" name="quantity_scrap" class="form-control" min="0" placeholder="0">
                <label for="out_notes" class="form-label">หมายเหตุ</label>
                <textarea id="out_notes" name="notes" class="form-control" rows="2"></textarea>
                <button type="submit" class="btn btn-primary w-100 mt-3">บันทึก</button>
            </form>

        <?php else: // (entry_type == 'receipt') ?>
            
            <div class="scanner-box">
                <ul class="nav nav-tabs nav-fill" id="scanTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <button class="nav-link active" id="scan-camera-tab" data-bs-toggle="tab" data-bs-target="#scan-camera-pane" type="button" role="tab">
                            <i class="fas fa-qrcode"></i> สแกน (กล้อง)
                        </button>
                    </li>
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" id="scan-manual-tab" data-bs-toggle="tab" data-bs-target="#scan-manual-pane" type="button" role="tab">
                            <i class="fas fa-keyboard"></i> พิมพ์รหัส
                        </button>
                    </li>
                </ul>
            
                <div class="tab-content" id="scanTabContent">
                    <div class="tab-pane fade show active" id="scan-camera-pane" role="tabpanel">
                        <div id="qr-reader-container">
                            <div id="qr-reader"></div>

                            <div class="qr-file-scanner-overlay">
                                <label for="scan-image-file" class="btn btn-lg btn-outline-light">
                                    <i class="fas fa-image"></i>
                                </label>
                                <input type="file" id="scan-image-file" accept="image/*" style="display: none;">
                            </div>
                        </div>
                    </div>
            
                    <div class="tab-pane fade" id="scan-manual-pane" role="tabpanel">
                        <div class="input-group">
                            <input type="text" id="manual_scan_id_input" class="form-control" placeholder="กรอก ID (ที่อยู่บนฉลาก) เช่น T-A7B9C1" style="text-transform: uppercase;">
                            <button class="btn btn-secondary" type="button" id="manual_scan_id_btn" title="โหลดข้อมูล">
                                <i class="fas fa-search"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <form id="mobileReceiptForm" data-action="addEntry">
                <input type="hidden" id="entry_transfer_uuid" name="transfer_uuid" value="<?php echo htmlspecialchars($g_transfer_id ?? ''); ?>">
                <input type="hidden" id="entry_to_location_id" name="to_location_id" value="<?php echo $location_id; ?>">
                <input type="hidden" id="entry_item_id" name="item_id">
                
                <div class="row">
                    <div class="col-md-6 col-12">
                        <label for="entry_log_date" class="form-label">วันที่</label>
                        <input type="date" class="form-control" id="entry_log_date" name="log_date" required>
                    </div>
                    <div class="col-md-6 col-12">
                        <label for="entry_log_time" class="form-label">เวลา</label>
                        <input type="text" pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]" placeholder="HH:MM:SS" class="form-control" id="entry_log_time" name="log_time" required>
                    </div>
                </div>
                <label for="entry_item_search" class="form-label">ค้นหาชิ้นส่วน</label>
                <div class="position-relative">
                    <input type="text" class="form-control" id="entry_item_search" name="item_search" autocomplete="off" required>
                </div>

                <label for="entry_from_location_id" class="form-label">จาก (From)</label>
                <select class="form-select" id="entry_from_location_id" name="from_location_id"></select>
                
                <div class_mb-3>
                    <label class="form-label">ไปยัง (To):</label>
                    <select id="location_display" class="form-select" <?php echo (!$is_manual_mode) ? 'disabled' : ''; ?>>
                        <?php if ($is_manual_mode): ?>
                            <option value="">-- สถานที่รับเข้า --</option>
                        <?php else: ?>
                            <option value="<?php echo $location_id; ?>">Loading location...</option>
                        <?php endif; ?>
                    </select>
                </div>
                <div class="row align-items-end">
                    <div class="col-8">
                        <label for="entry_quantity_in" class="form-label">จำนวน</label>
                        <input type="number" class="form-control" id="entry_quantity_in" name="confirmed_quantity" min="1" step="1" required>
                    </div>
                    <div class="col-4">
                        <sapn class="form-label">สต็อกคงเหลือ</span>
                        <div id="entry_available_stock" class="form-control-plaintext ps-2 fw-bold mb-3">--</div>
                    </div>
                </div>

                <label for="entry_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                <input type="text" class="form-control" id="entry_lot_no" name="lot_no">
                <label for="entry_notes" class="form-label">หมายเหตุ</label>
                <textarea class="form-control" id="entry_notes" name="notes" rows="2"></textarea>
                <button type="submit" class="btn btn-primary w-100 mt-3">บันทึก</button>
            </form>
        <?php endif; ?>
    </div>

    </div> <?php include_once('components/mobile_nav.php'); ?>

    <script>
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const TRANSFER_API_URL = 'api/transferManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const g_EntryType = <?php echo json_encode($entry_type); ?>;
        const g_LocationId = <?php echo json_encode($location_id); ?>; 
        const g_AutoFillData_OLD = <?php echo json_encode($g_autofill_data); ?>;
        const g_TransferId_NEW = <?php echo json_encode($g_transfer_id); ?>;
    </script>
    <script src="script/mobile.js?v=<?php echo time(); ?>"></script>
</body>
</html>