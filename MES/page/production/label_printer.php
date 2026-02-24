<?php 
    include_once("../../auth/check_auth.php");
    $currentUserForJS = $_SESSION['user'] ?? null;
    $canAdd = hasRole(['operator', 'supervisor', 'admin', 'creator']);
    
    if (!$canAdd) {
        header("HTTP/1.0 403 Forbidden");
        echo "Access Denied, insufficient role.";
        exit;
    }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Transfer Label Printer</title>
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
    <button class="btn btn-outline-secondary mobile-hamburger-btn" type="button" 
            data-bs-toggle="offcanvas" 
            data-bs-target="#globalMobileMenu" 
            aria-controls="globalMobileMenu">
        <i class="fas fa-bars"></i>
    </button>

    <?php include_once('../components/php/spinner.php'); ?>
    
    <div id="toast"></div>

        <h3 class="text-center mb-4">Print Transfer Label</h3> 
        <p class="text-center text-muted">กรอกข้อมูลเพื่อสร้างใบโอนย้าย (สถานะ PENDING)</p>

        <form id="label-generator-form">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="from_location_id" class="form-label">คลังต้นทาง (จากที่ไหน)</label>
                    <select id="from_location_id" name="from_location_id" class="form-select" required>
                        <option value="" disabled selected>-- เลือกคลังต้นทาง --</option>
                    </select>
                </div>
                <div class="col-md-6 mb-3">
                    <label for="to_location_id" class="form-label">คลังปลายทาง (ไปที่ไหน)</label>
                    <select id="to_location_id" name="to_location_id" class="form-select" required>
                        <option value="" disabled selected>-- เลือกคลังปลายทาง --</option>
                    </select>
                </div>
            </div>

            <div class="mb-3 position-relative">
                <label for="item_search" class="form-label">ค้นหา Item (Part No / SAP No)</label>
                <input type="text" id="item_search" class="form-control" placeholder="พิมพ์เพื่อค้นหา..." autocomplete="off">
                <ul id="item_search-results" class="autocomplete-results border rounded shadow-sm" style="display: none;"></ul>
                <input type="hidden" id="item_id" name="item_id" required>
            </div>
            
            <div class="row">
                <div class="col-md-5 mb-3">
                    <label for="lot_no" class="form-label">เลข Lot / Pallet หลัก</label>
                    <input type="text" id="lot_no" name="lot_no" class="form-control" required placeholder="เช่น L-202602">
                </div>
                <div class="col-md-3 mb-3">
                    <label for="quantity" class="form-label">จำนวนชิ้น/กล่อง</label>
                    <input type="number" id="quantity" name="quantity" class="form-control" min="1" value="1" required>
                </div>
                <div class="col-md-4 mb-3">
                    <label for="print_count" class="form-label text-primary fw-bold">จำนวนสติ้กเกอร์ (ดวง)</label>
                    <input type="number" id="print_count" name="print_count" class="form-control border-primary bg-light" min="1" max="500" value="1" required>
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
            <a href="mobile_entry.php?type=receipt" class="btn btn-outline-secondary btn-sm"><i class="fas fa-arrow-left"></i> กลับไปหน้า Mobile</a>
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
    <script src="script/label_printer.js?v=<?php echo filemtime(__DIR__ . '/script/label_printer.js'); ?>" defer></script>
</body>
</html>