<?php
// page/sales/shipping_loading.php

// 1. เรียก init
require_once __DIR__ . '/../components/init.php';

// 2. ตั้งค่าหน้าเว็บ
$pageTitle = "Shipping Schedule Control";
$pageIcon = "fas fa-truck-loading"; 
$pageHeaderTitle = "Shipping Schedule";
$pageHeaderSubtitle = "ตารางแผนการโหลดตู้และสถานะขนส่ง";
$pageHelpId = "helpModal"; // (ถ้ามี)

// 3. ตรวจสอบสิทธิ์ (ลูกค้าดูได้อย่างเดียว)
$isCustomer = (isset($_SESSION['user']['role']) && $_SESSION['user']['role'] === 'CUSTOMER');
// $isCustomer = true; // ปลดคอมเมนต์เพื่อเทสโหมดลูกค้า
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title><?php echo $pageTitle; ?></title>
    <?php include_once '../components/common_head.php'; ?>
    
    <link rel="stylesheet" href="css/salesDashboard.css?v=<?php echo time(); ?>">
    
    <style>
        /* --- CSS จัดการ Layout และ Scroll --- */
        .table-responsive-custom {
            height: calc(100vh - 200px); 
            overflow: auto;
            position: relative; /* สำคัญ */
        }

        .editable-input {
            border: 1px solid transparent; width: 100%;
            background: transparent; text-align: center; font-size: 0.85rem;
            padding: 2px; border-radius: 4px;
        }
        .editable-input:not([readonly]):hover { border: 1px solid #ced4da; background: #fff; }
        .editable-input:not([readonly]):focus { border: 1px solid #86b7fe; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(13,110,253,.25); }

        /* --- STICKY COLUMN MAGIC SYSTEM --- */
        
        /* 1. Base Styles for Sticky Cells */
        .sticky-col-left-1, .sticky-col-left-2, .sticky-col-left-3,
        .sticky-col-right-1, .sticky-col-right-2 {
            position: sticky !important;
            z-index: 10; /* อยู่สูงกว่าข้อมูลปกติ (ข้อมูลปกติ z-index: auto) */
            opacity: 1 !important; /* บังคับไม่ให้โปร่งแสง */
        }

        /* 2. Fix Header Layers (หัวตารางต้องอยู่บนสุดเสมอ) */
        thead th {
            position: sticky;
            top: 0;
            z-index: 20; /* สูงกว่าข้อมูลปกติ */
            background-color: #f8f9fa; /* สีพื้นหัวตารางปกติ */
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }

        /* 3. Super Sticky Headers (หัวตารางของคอลัมน์ที่ถูกล็อค ต้องอยู่บนสุดของที่สุด) */
        thead th.sticky-col-left-1, thead th.sticky-col-left-2, thead th.sticky-col-left-3,
        thead th.sticky-col-right-1, thead th.sticky-col-right-2 {
            z-index: 30 !important; /* อยู่บนสุด ทับทุกอย่าง */
        }

        /* 4. Left Columns Config (สีเทาอ่อนทึบ) */
        .sticky-col-left-1 { left: 0;      width: 80px;  background-color: #f8f9fa !important; border-right: 1px solid #dee2e6; }
        .sticky-col-left-2 { left: 80px;   width: 80px;  background-color: #f8f9fa !important; border-right: 1px solid #dee2e6; }
        .sticky-col-left-3 { left: 160px;  min-width: 120px; background-color: #fff !important;    border-right: 2px solid #dee2e6; 
            box-shadow: 2px 0 5px rgba(0,0,0,0.05); /* เงาขวา */
        }

        /* 5. Right Columns Config (สีแดงอ่อนทึบ) */
        /* ใช้สี #fff0f0 (แดงจางแบบทึบ) แทนการใช้ opacity */
        .sticky-col-right-2 { right: 80px; width: 110px; background-color: #fff0f0 !important; border-left: 2px solid #dee2e6; 
            box-shadow: -2px 0 5px rgba(0,0,0,0.05); /* เงาซ้าย */
        }
        .sticky-col-right-1 { right: 0;    width: 80px;  background-color: #fff0f0 !important; }

        /* Status Badge */
        .status-badge { font-size: 0.7rem; width: 100%; padding: 4px; border-radius: 12px; border:none; font-weight: bold; text-transform: uppercase; }
        .bg-pending { background-color: #eee; color: #555; border: 1px solid #ccc; }
        .bg-success-custom { background-color: #198754; color: #fff; }
    </style>
</head>
<body class="layout-top-header">

    <div id="loadingOverlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
        <div class="spinner-border text-light mb-3" role="status"></div>
        <h5 class="fw-bold text-white">Processing...</h5>
    </div>

    <?php include('../components/php/top_header.php'); ?>
    <?php include('../components/php/mobile_menu.php'); ?>
    <?php include('../components/php/docking_sidebar.php'); ?>

    <div class="page-container">
        <div id="main-content">
            
            <div class="content-wrapper pt-3">
                
                <div class="card shadow-sm border-0 mb-3">
                    <div class="card-body p-2 bg-body-tertiary rounded">
                        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
                            
                            <div class="d-flex align-items-center gap-2 flex-grow-1">
                                <div class="input-group input-group-sm" style="max-width: 400px;">
                                    <span class="input-group-text bg-body border-secondary-subtle text-secondary"><i class="fas fa-search"></i></span>
                                    <input type="text" id="universalSearch" class="form-control border-secondary-subtle ps-2" placeholder="Search PO, SKU, Container...">
                                </div>
                                <button class="btn btn-outline-secondary btn-sm" onclick="loadData()" title="Refresh">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>

                            <div class="d-flex align-items-center gap-2">
                                <?php if (!$isCustomer): ?>
                                <form id="importForm" class="d-inline">
                                    <input type="file" name="csv_file" id="csvFile" accept=".csv" style="display:none;" onchange="uploadFile()">
                                    <button type="button" class="btn btn-light border-secondary-subtle text-primary fw-bold btn-sm shadow-sm" onclick="document.getElementById('csvFile').click()">
                                        <i class="fas fa-file-import me-1"></i> Import CSV
                                    </button>
                                </form>
                                <?php endif; ?>

                                <button type="button" class="btn btn-success btn-sm fw-bold shadow-sm" onclick="exportToCSV()">
                                    <i class="fas fa-file-excel me-1"></i> Export Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card shadow-sm border-0 table-card h-100">
                    <div class="table-responsive-custom">
                        <table class="table table-bordered table-hover mb-0 text-nowrap align-middle">
                            <thead class="bg-light sticky-top">
                                <tr class="text-center">
                                    <th class="sticky-col-left-1">Load Status</th>
                                    <th class="sticky-col-left-2">Prod Status</th>
                                    <th class="sticky-col-left-3">PO Number</th>
                                    
                                    <th>Week</th>
                                    <th>Status</th>
                                    <th>Inspect Type</th>
                                    <th>Inspect Res</th>
                                    <th>SNC Load Day</th>
                                    <th style="background-color: rgb(255 249 230)">ETD</th>
                                    <th>DC</th>
                                    <th>SKU</th>
                                    <th>Booking No.</th>
                                    <th>Invoice</th>
                                    <th>Description</th>
                                    <th>Q'ty (Pcs)</th>
                                    <th>CTN Size</th>
                                    <th>Container No.</th>
                                    <th>Seal No.</th>
                                    <th>Tare</th>
                                    <th>N.W.</th>
                                    <th>G.W.</th>
                                    <th>CBM</th>
                                    <th>Feeder Vsl</th>
                                    <th>Mother Vsl</th>
                                    <th>SNC CI No.</th>
                                    <th>SI/VGM Cut</th>
                                    <th>Pickup Date</th>
                                    <th>Return Date</th>
                                    <th>Remark</th>

                                    <th class="sticky-col-right-2 text-danger" style="background-color: rgb(255 240 240)">Cutoff Date</th>
                                    <th class="sticky-col-right-1 text-danger" style="background-color: rgb(255 240 240)">Cutoff Time</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody" class="bg-white">
                                </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div class="modal fade" id="importResultModal" tabindex="-1">
         <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-body-tertiary">
                    <h5 class="modal-title fw-bold"><i class="fas fa-file-import me-2"></i>Import Results</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div id="importSuccessMsg" class="text-center text-success py-3"></div>
                    <textarea id="importErrorLog" class="form-control form-control-sm font-monospace bg-body-secondary text-danger border-0 d-none" rows="5" readonly></textarea>
                </div>
                <div class="modal-footer bg-body-tertiary border-0">
                    <button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">ตกลง (OK)</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
    // Config
    const isCustomer = <?php echo json_encode($isCustomer); ?>;
    let allData = []; // เก็บข้อมูลดิบไว้ทำ Search Client-side

    $(document).ready(function() {
        loadData();
        
        // Search Filter Logic
        $('#universalSearch').on('keyup', function() {
            const val = $(this).val().toLowerCase();
            const filtered = allData.filter(row => {
                return (row.po_number && row.po_number.toLowerCase().includes(val)) ||
                       (row.sku && row.sku.toLowerCase().includes(val)) ||
                       (row.container_no && row.container_no.toLowerCase().includes(val)) ||
                       (row.remark && row.remark.toLowerCase().includes(val));
            });
            renderTable(filtered);
        });
    });

    // Helper: Show/Hide Overlay
    function showLoading(show) {
        if(show) $('#loadingOverlay').css('display', 'flex');
        else $('#loadingOverlay').hide();
    }

    function loadData() {
        showLoading(true);
        $.ajax({
            url: 'api/manage_shipping.php?action=read',
            method: 'GET', dataType: 'json',
            success: function(res) {
                showLoading(false);
                if(res.success) {
                    allData = res.data;
                    renderTable(allData);
                } else {
                    $('#tableBody').html('<tr><td colspan="31" class="text-center py-5 text-danger">Error: ' + res.message + '</td></tr>');
                }
            },
            error: function() {
                showLoading(false);
                $('#tableBody').html('<tr><td colspan="31" class="text-center py-5 text-danger">Connection Failed</td></tr>');
            }
        });
    }

    function renderTable(data) {
        if(data.length === 0) {
            $('#tableBody').html('<tr><td colspan="31" class="text-center py-5 text-muted">ไม่พบข้อมูล (No Data Found)</td></tr>');
            return;
        }

        let html = '';
        data.forEach(row => {
            // Status Logic
            let loadClass = row.is_loading_done == 1 ? 'bg-success-custom' : 'bg-pending';
            let prodClass = row.is_production_done == 1 ? 'bg-success-custom' : 'bg-pending';
            let loadTxt = row.is_loading_done == 1 ? 'DONE' : 'WAIT';
            let prodTxt = row.is_production_done == 1 ? 'DONE' : 'WAIT';
            
            let loadBtn = isCustomer ? `<span class="status-badge ${loadClass}">${loadTxt}</span>` 
                : `<button class="status-badge ${loadClass}" onclick="toggleStatus(${row.id}, 'loading', '${loadTxt}')">${loadTxt}</button>`;
            
            let prodBtn = isCustomer ? `<span class="status-badge ${prodClass}">${prodTxt}</span>` 
                : `<button class="status-badge ${prodClass}" onclick="toggleStatus(${row.id}, 'production', '${prodTxt}')">${prodTxt}</button>`;
            
            let ro = isCustomer ? 'readonly' : '';
            let fnDate = (d) => d ? d.substring(0,10) : '';

            html += `<tr>
                <td class="sticky-col-left-1 text-center">${loadBtn}</td>
                <td class="sticky-col-left-2 text-center">${prodBtn}</td>
                <td class="sticky-col-left-3 fw-bold text-primary">${row.po_number}</td>

                <td class="text-center">${row.shipping_week||''}</td>
                <td><input class="editable-input" value="${row.shipping_customer_status||''}" onchange="upd(${row.id}, 'shipping_customer_status', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.inspect_type||''}" onchange="upd(${row.id}, 'inspect_type', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.inspection_result||''}" onchange="upd(${row.id}, 'inspection_result', this.value)" ${ro}></td>
                <td><input type="date" class="editable-input" value="${fnDate(row.snc_load_day)}" onchange="upd(${row.id}, 'snc_load_day', this.value)" ${ro}></td>
                <td class="bg-warning bg-opacity-10"><input type="date" class="editable-input fw-bold" value="${fnDate(row.etd)}" onchange="upd(${row.id}, 'etd', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.dc_location||''}" onchange="upd(${row.id}, 'dc_location', this.value)" ${ro}></td>
                <td>${row.sku||''}</td>
                <td><input class="editable-input" value="${row.booking_no||''}" onchange="upd(${row.id}, 'booking_no', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.invoice_no||''}" onchange="upd(${row.id}, 'invoice_no', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.description||''}" onchange="upd(${row.id}, 'description', this.value)" ${ro}></td>
                <td class="text-center">${row.quantity ? parseInt(row.quantity).toLocaleString() : 0}</td>
                <td><input class="editable-input" value="${row.ctn_size||''}" onchange="upd(${row.id}, 'ctn_size', this.value)" ${ro}></td>
                <td><input class="editable-input fw-bold text-primary" value="${row.container_no||''}" onchange="upd(${row.id}, 'container_no', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.seal_no||''}" onchange="upd(${row.id}, 'seal_no', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.container_tare||''}" onchange="upd(${row.id}, 'container_tare', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.net_weight||''}" onchange="upd(${row.id}, 'net_weight', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.gross_weight||''}" onchange="upd(${row.id}, 'gross_weight', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.cbm||''}" onchange="upd(${row.id}, 'cbm', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.feeder_vessel||''}" onchange="upd(${row.id}, 'feeder_vessel', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.mother_vessel||''}" onchange="upd(${row.id}, 'mother_vessel', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.snc_ci_no||''}" onchange="upd(${row.id}, 'snc_ci_no', this.value)" ${ro}></td>
                <td><input type="date" class="editable-input" value="${fnDate(row.si_vgm_cut_off)}" onchange="upd(${row.id}, 'si_vgm_cut_off', this.value)" ${ro}></td>
                <td><input type="date" class="editable-input" value="${fnDate(row.pickup_date)}" onchange="upd(${row.id}, 'pickup_date', this.value)" ${ro}></td>
                <td><input type="date" class="editable-input" value="${fnDate(row.return_date)}" onchange="upd(${row.id}, 'return_date', this.value)" ${ro}></td>
                <td><input class="editable-input" value="${row.remark||''}" onchange="upd(${row.id}, 'remark', this.value)" ${ro}></td>

                <td class="sticky-col-right-2"><input type="date" class="editable-input text-danger fw-bold" value="${fnDate(row.cutoff_date)}" onchange="upd(${row.id}, 'cutoff_date', this.value)" ${ro}></td>
                <td class="sticky-col-right-1"><input class="editable-input text-danger" value="${row.cutoff_time||''}" placeholder="HH:mm" onchange="upd(${row.id}, 'cutoff_time', this.value)" ${ro}></td>
            </tr>`;
        });
        $('#tableBody').html(html);
    }

    // --- Action Functions ---

    function upd(id, field, val) {
        if(isCustomer) return;
        $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val});
    }

    function toggleStatus(id, type, curr) {
        if(isCustomer) return;
        let val = (curr === 'DONE') ? 0 : 1;
        let field = (type === 'loading') ? 'is_loading_done' : 'is_production_done';
        
        // Optimistic UI Update (เปลี่ยนสีก่อนแล้วค่อยส่ง request)
        showLoading(true);
        $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val}, function(){
            // Reload ข้อมูลจริงเพื่อให้ชัวร์
            loadData();
        });
    }

    function uploadFile() {
        if(!confirm('ยืนยันการนำเข้าไฟล์ CSV? ข้อมูลเดิมจะถูกอัปเดต')) return;
        
        var fd = new FormData($('#importForm')[0]);
        showLoading(true);
        
        $.ajax({
            url: 'api/manage_shipping.php?action=import', type: 'POST', data: fd, contentType:false, processData:false,
            success: function(res) {
                showLoading(false);
                document.getElementById('csvFile').value = '';
                
                // Show Result Modal
                const modal = new bootstrap.Modal(document.getElementById('importResultModal'));
                $('#importSuccessMsg').html(`<i class="fas fa-check-circle fa-2x mb-2"></i><br>${res.message}`);
                
                if(res.errors && res.errors.length > 0) {
                    $('#importErrorLog').removeClass('d-none').val(res.errors.join('\n'));
                } else {
                    $('#importErrorLog').addClass('d-none');
                }
                modal.show();
                loadData();
            },
            error: function() {
                showLoading(false);
                alert('Import Failed');
            }
        });
    }
    
    function exportToCSV() { window.location.href = 'api/manage_shipping.php?action=export'; }
    </script>
</body>
</html>