<?php 
    // 1. --- บังคับ Login ---
    include_once("../../auth/check_auth.php");
    $currentUserForJS = $_SESSION['user'] ?? null;
    $canAdd = hasRole(['operator', 'supervisor', 'admin', 'creator']);
    
    // 2. --- ตรวจสอบสิทธิ์ (เผื่อไว้) ---
    if (!$canAdd) {
        header("HTTP/1.0 403 Forbidden");
        echo "Access Denied, insufficient role.";
        exit;
    }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Label Printer</title>
    <?php include_once '../components/common_head.php'; ?>
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
        
        .footer-controls { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; }
        #theme-switcher-btn { font-size: 1.2rem; cursor: pointer; color: var(--bs-secondary-color); }
        #theme-switcher-btn:hover { color: var(--bs-primary); }
        [data-bs-theme="light"] #theme-icon-sun { display: none; }
        [data-bs-theme="dark"] #theme-icon-moon { display: none; }
    </style>
</head>
<body id="printer-container"> <div class="container">
        <?php include_once('../components/php/spinner.php'); ?>
        <div id="toast"></div>

        <h3 class="text-center mb-4">Label Printer Tool</h3>
        <p class="text-center text-muted">กรอกข้อมูลสำหรับ 1 ฉลาก (Pallet/Box) แล้วกด Generate</p>

        <form id="label-generator-form">
            <div class="mb-3 position-relative">
                <label for="item_search" class="form-label">ค้นหาชิ้นส่วน (SAP No. / Part No.)</label>
                <input type="text" id="item_search" class="form-control" autocomplete="off" required>
                <input type="hidden" id="item_id" name="item_id">
            </div>
            
            <div class="row">
                <div class="col-md-8 mb-3">
                    <label for="location_id" class="form-label">สถานที่ผลิต</label>
                    <select id="location_id" name="location_id" class="form-select" required></select>
                </div>
                <div class="col-md-4 mb-3">
                    <label for="count_type" class="form-label">ประเภท</label>
                    <select id="count_type" name="count_type" class="form-select" required>
                        <option value="FG">FG</option>
                        <option value="HOLD">HOLD</option>
                        <option value="SCRAP">SCRAP</option>
                    </select>
                </div>
            </div>

            <div class="row">
                <div class="col-md-8 mb-3">
                    <label for="lot_no" class="form-label">เลข Lot / Pallet / อ้างอิง</label>
                    <input type="text" id="lot_no" name="lot_no" class="form-control" required>
                </div>
                <div class="col-md-4 mb-3">
                    <label for="quantity" class="form-label">จำนวน (ใน Pallet นี้)</label>
                    <input type="number" id="quantity" name="quantity" class="form-control" min="1" required>
                </div>
            </div>

            <div class="mb-3">
                <label for="notes" class="form-label">หมายเหตุ (Optional)</label>
                <textarea id="notes" name="notes" class="form-control" rows="2"></textarea>
            </div>

            <div class="d-grid gap-2">
                <button type="submit" id="generate-label-btn" class="btn btn-success btn-lg">
                    <i class="fas fa-print"></i> Generate & Print Label
                </button>
            </div>
        </form>
        
        <div class="footer-controls">
            <a href="mobile_entry.php" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left"></i> กลับไปหน้ากรอกข้อมูล</a>
            <div id="theme-switcher-btn" title="Toggle Theme">
                <i class="fas fa-moon" id="theme-icon-moon"></i>
                <i class="fas fa-sun" id="theme-icon-sun"></i>
            </div>
        </div>
    </div>

    <script>
        const INVENTORY_API_URL = 'api/inventoryManage.php';
        const currentUser = <?php echo json_encode($currentUserForJS); ?>;
    </script>
    <script src="../../utils/libs/qrcode.min.js"></script>
    <script src="script/label_printer.js?v=<?php echo time(); ?>"></script>
</body>
</html>