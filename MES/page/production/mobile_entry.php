<?php 
    include_once("../../auth/check_auth.php");
    
    $canAdd = hasRole(['operator', 'supervisor', 'admin', 'creator']);
    $currentUserForJS = $_SESSION['user'] ?? null;
    
    // ⭐️ --- LOGIC ใหม่ เริ่มต้นตรงนี้ --- ⭐️
    $g_autofill = null;
    $entry_type = $_GET['type'] ?? 'production'; // (ค่า Default เดิม)
    
    if (isset($_GET['scan']) && !empty($_GET['scan'])) {
        $scan_id = $_GET['scan'];
        $entry_type = 'receipt';
        
        require_once __DIR__ . '/../db.php';
        require_once __DIR__ . '/../../config/config.php';

        try {
            // ดึงข้อมูล (เหมือนเดิม)
            $sql = "SELECT job_data FROM " . SCAN_JOBS_TABLE . " WHERE scan_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$scan_id]);
            $job_data_json = $stmt->fetchColumn();

            if ($job_data_json) {
                $g_autofill = json_decode($job_data_json, true);
                
            } else {
                // (ถ้าไม่เจอ ก็แค่ไม่เติม, ปล่อย g_autofill เป็น null)
            }
        } catch (Exception $e) {
            error_log("Failed to get scan job data: " . $e->getMessage());
        }

    } else if ($entry_type === 'receipt') {
        $g_autofill = [
            'sap_no' => $_GET['sap_no'] ?? null,
            'lot' => $_GET['lot'] ?? null,
            'qty' => $_GET['qty'] ?? null,
            'from_loc_id' => $_GET['from_loc_id'] ?? null
        ];
    }
    // ⭐️ --- LOGIC ใหม่ สิ้นสุดตรงนี้ --- ⭐️

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
        body { padding-top: 20px; }
        .container { max-width: 600px; }
        .form-control, .form-select { margin-bottom: 15px; }
        
        .autocomplete-results {
             background: #fff;
             color: #000; list-style: none; padding: 0; margin: 0;
             position: absolute; width: calc(100% - 2px);
             z-index: 1050; max-height: 250px; overflow-y: auto;
        }
        .autocomplete-item { padding: 8px; cursor: pointer; }
        .autocomplete-item:hover { background: #eee; }
        .autocomplete-item small { color: #555; }

        .footer-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1.5rem;
        }

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
            display: none; /* (ซ่อนไว้ก่อน) */
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: rgba(0, 0, 0, 0.85);
            z-index: 1045; /* (ให้อยู่เหนือ Spinner) */
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
        .status-box i {
            font-size: 3rem;
            color: var(--bs-warning);
        }
        .status-box h4 {
            margin-top: 15px;
            margin-bottom: 10px;
        }
        #qr-reader-container {
            display: none; /* (ซ่อนไว้ก่อน) */
            padding: 10px;
            border: 1px solid var(--bs-border-color);
            background: var(--bs-secondary-bg);
            border-radius: 8px;
            margin-bottom: 15px;
        }
        #qr-reader {
            width: 100%;
            border: 1px solid #555;
            border-radius: 8px;
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
                <h4>สถานะ: รับเข้าแล้ว</h4>
                <p id="status-details">Lot นี้ถูกรับเข้าแล้วโดย...</p>
                <button id="close-overlay-btn" class="btn btn-outline-secondary mt-3">ปิด</button>
            </div>
        </div>

        <h3 class="text-center mb-4">
            <?php echo ($entry_type == 'production') ? 'บันทึกของออก (OUT)' : 'บันทึกของเข้า (IN)'; ?>
        </h3>

        <div class_mb-3>
            <label class="form-label">Location:</label>
            <select id="location_display" class="form-select" <?php echo (!$is_manual_mode) ? 'disabled' : ''; ?>>
                <?php if ($is_manual_mode): ?>
                    <option value="">-- กรุณาเลือก Location --</option>
                <?php else: ?>
                    <option value="<?php echo $location_id; ?>">Loading location...</option>
                <?php endif; ?>
            </select>
        </div>

        <?php if ($entry_type == 'production'): ?>
            <form id="mobileProductionForm" data-action="addPart">
                <input type="hidden" id="out_location_id" name="location_id" value="<?php echo $location_id; ?>">
                <input type="hidden" id="out_item_id" name="item_id">

                <div class="row">
                    <div class="col-md-6 col-12 mb-3">
                        <label for="out_log_date" class="form-label">วันที่</label>
                        <input type="date" id="out_log_date" name="log_date" class="form-control" required>
                    </div>
                    <div class="col-md-6 col-12 mb-3">
                        <label for="out_time_slot" class="form-label">ช่วงเวลาการผลิต</label>
                        <select id="out_time_slot" name="time_slot" class="form-select">
                            <?php
                                // วน Loop สร้าง 24 ชั่วโมง
                                for ($h = 0; $h < 24; $h++) {
                                    $start_time = sprintf('%02d:00:00', $h);
                                    $end_time = sprintf('%02d:59:59', $h);
                                    $display_text = sprintf('%02d:00 - %02d:59', $h, $h);
                                    
                                    // (สำคัญ) เราจะเก็บค่าทั้งสองไว้ใน value โดยคั่นด้วย |
                                    $value = $start_time . '|' . $end_time;
                                    
                                    // (สำคัญ) เลือกชั่วโมงปัจจุบันเป็น Default
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
                
                <label for="out_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                <input type="text" id="out_lot_no" name="lot_no" class="form-control">
                <hr>
                <label for="out_qty_fg" class="form-label text-success">FG (งานดี)</label>
                <input type="number" id="out_qty_fg" name="quantity_fg" class="form-control" min="0" placeholder="0">
                <label for="out_qty_hold" class="form-label text-warning">HOLD (งานรอซ่อม)</label>
                <input type="number" id="out_qty_hold" name="quantity_hold" class="form-control" min="0" placeholder="0">
                <label for="out_qty_scrap" class="form-label text-danger">SCRAP (งานเสีย)</label>
                <input type="number" id="out_qty_scrap" name="quantity_scrap" class="form-control" min="0" placeholder="0">
                <hr>
                <label for="out_notes" class="form-label">หมายเหตุ</label>
                <textarea id="out_notes" name="notes" class="form-control" rows="2"></textarea>
                <button type="submit" class="btn btn-primary w-100 mt-3 btn-lg">บันทึก</button>
            </form>

        <?php else: // (entry_type == 'receipt') ?>
            <div class="d-grid gap-2 mb-3">
                <button type="button" id="start-scan-btn" class="btn btn-outline-info">
                    <i class="fas fa-qrcode"></i> เปิดกล้องสแกน
                </button>
            </div>

            <div id="qr-reader-container">
                <div id="qr-reader"></div>
                <button type="button" id="stop-scan-btn" class="btn btn-sm btn-danger w-100 mt-2">ปิดกล้อง</button>
            </div>

            <div id="manual-scan-entry" class="input-group mb-3">
                <input type="text" id="manual_scan_id_input" class="form-control" placeholder="หรือกรอก Scan ID (เช่น A7B9C1)" aria-label="Scan ID" style="text-transform: uppercase;">
                <button class="btn btn-secondary" type="button" id="manual_scan_id_btn">
                    <i class="fas fa-search"></i> โหลด
                </button>
            </div>
            <form id="mobileReceiptForm" data-action="addEntry">
                <input type="hidden" id="entry_to_location_id" name="to_location_id" value="<?php echo $location_id; ?>">
                <input type="hidden" id="entry_item_id" name="item_id">
                <input type="hidden" name="scan_job_id" value="<?php echo htmlspecialchars($_GET['scan'] ?? ''); ?>">
                
                <div class="row">
                    <div class="col-md-6 col-12 mb-3">
                        <label for="entry_log_date" class="form-label">วันที่</label>
                        <input type="date" class="form-control" id="entry_log_date" name="log_date" required>
                    </div>
                    <div class="col-md-6 col-12 mb-3">
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
                <div class="row align-items-end">
                    <div class="col-8">
                        <label for="entry_quantity_in" class="form-label">จำนวน</label>
                        <input type="number" class="form-control" id="entry_quantity_in" name="quantity" min="1" step="1" required>
                    </div>
                    <div class="col-4">
                        <label class="form-label">สต็อกคงเหลือ</label>
                        <div id="entry_available_stock" class="form-control-plaintext ps-2 fw-bold text-white">--</div>
                    </div>
                </div>
                <label for="entry_lot_no" class="form-label">ล็อต / เลขอ้างอิง</label>
                <input type="text" class="form-control" id="entry_lot_no" name="lot_no">
                <label for="entry_notes" class="form-label">หมายเหตุ</label>
                <textarea class="form-control" id="entry_notes" name="notes" rows="2"></textarea>
                <button type="submit" class="btn btn-success w-100 mt-3 btn-lg">บันทึก</button>
            </form>
        <?php endif; ?>
        
        <div class="d-grid gap-2 mt-4">
            <a href="mobile_review.php" class="btn btn-info btn-lg">
                <i class="fas fa-history"></i> ตรวจสอบ/แก้ไข 
            </a>
        </div>
        <div class="footer-controls">
            <a href="../../auth/logout.php" class="btn btn-outline-secondary btn-sm">Logout (<?php echo htmlspecialchars($currentUserForJS['username']); ?>)</a>
            
            <div id="theme-switcher-btn" title="Toggle Theme">
                <i class="fas fa-moon" id="theme-icon-moon"></i>
                <i class="fas fa-sun" id="theme-icon-sun"></i>
            </div>
        </div>
    </div>

    <script>
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
        const g_EntryType = <?php echo json_encode($entry_type); ?>;
        const g_LocationId = <?php echo json_encode($location_id); ?>; 
        const g_AutoFillData = <?php echo json_encode($g_autofill); ?>;
    </script>
    <script src="script/mobile.js?v=<?php echo time(); ?>"></script>
</body>
</html>