<?php
// page/sales/shipping_loading.php

// 1. เรียก init (ถอย 1 ชั้น)
require_once __DIR__ . '/../components/init.php';

// 2. ตั้งค่าหน้าเว็บ
$pageTitle = "Shipping Schedule Control";
$pageIcon = "fas fa-truck-loading"; 
$pageHeaderTitle = "Shipping Schedule";
$pageHeaderSubtitle = "ตารางแผนการโหลดตู้และสถานะขนส่ง";
$pageHelpId = "helpModal"; 

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
        .table-responsive-custom {
            height: calc(100vh - 200px); 
            overflow: auto;
            position: relative; 
        }
        .editable-input {
            border: 1px solid transparent; width: 100%;
            background: transparent; text-align: center; font-size: 0.85rem;
            padding: 2px; border-radius: 4px;
        }
        .editable-input:not([readonly]):hover { border: 1px solid #ced4da; background: #fff; }
        .editable-input:not([readonly]):focus { border: 1px solid #86b7fe; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(13,110,253,.25); }

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
                                    <input type="file" name="csv_file" id="csv_file" accept=".csv, .xlsx, .xls" style="display:none;" onchange="uploadFile()">
                                    <button type="button" class="btn btn-light border-secondary-subtle text-primary fw-bold btn-sm shadow-sm" onclick="document.getElementById('csv_file').click()">
                                        <i class="fas fa-file-import me-1"></i> Import Excel/CSV
                                    </button>
                                </form>
                                <?php endif; ?>

                                <button type="button" class="btn btn-success btn-sm fw-bold shadow-sm" onclick="exportToCSV()">
                                    <i class="fas fa-file-excel me-1"></i> Export CSV
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
                            <tbody id="tableBody" class="bg-white"></tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>

    <script>
    const isCustomer = <?php echo json_encode($isCustomer); ?>;
    let allData = []; 

    $(document).ready(function() {
        loadData();
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

    function showLoading(show) {
        if(show) $('#loadingOverlay').css('display', 'flex');
        else $('#loadingOverlay').hide();
    }

    function loadData() {
        showLoading(true);
        // [FIXED] ใช้ path สั้นๆ
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
            let loadClass = row.is_loading_done == 1 ? 'bg-success-custom' : 'bg-pending';
            let prodClass = row.is_production_done == 1 ? 'bg-success-custom' : 'bg-pending';
            let loadTxt = row.is_loading_done == 1 ? 'DONE' : 'WAIT';
            let prodTxt = row.is_production_done == 1 ? 'DONE' : 'WAIT';
            
            let loadBtn = isCustomer ? `<span class="status-badge ${loadClass}">${loadTxt}</span>` 
                : `<button class="status-badge ${loadClass}" onclick="toggleStatus(${row.id}, 'loading', '${loadTxt}')">${loadTxt}</button>`;
            
            let prodBtn = isCustomer ? `<span class="status-badge ${prodClass}">${prodTxt}</span>` 
                : `<button class="status-badge ${prodClass}" onclick="toggleStatus(${row.id}, 'production', '${prodTxt}')">${prodTxt}</button>`;
            
            let ro = isCustomer ? 'readonly' : '';
            let fnDate = (d) => (d && d != '0000-00-00') ? d.substring(0,10) : '';

            html += `<tr>
                <td class="sticky-col-left-1 text-center">${loadBtn}</td>
                <td class="sticky-col-left-2 text-center">${prodBtn}</td>
                <td class="sticky-col-left-3 fw-bold text-primary">${row.po_number || '-'}</td>

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

    function upd(id, field, val) {
        if(isCustomer) return;
        $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val});
    }

    function toggleStatus(id, type, curr) {
        if(isCustomer) return;
        let val = (curr === 'DONE') ? 0 : 1;
        let field = (type === 'loading') ? 'is_loading_done' : 'is_production_done';
        
        showLoading(true);
        $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val}, function(){
            loadData();
        });
    }

    async function uploadFile() {
        const fileInput = document.getElementById('csv_file'); 
        
        if (!fileInput || !fileInput.files[0]) {
            alert("กรุณาเลือกไฟล์ก่อนครับ");
            return;
        }

        const file = fileInput.files[0];
        let formData = new FormData();
        showLoading(true);

        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            try {
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                const csvOutput = XLSX.utils.sheet_to_csv(firstSheet, { 
                    dateNF: 'dd/mm/yyyy', 
                    defval: '' 
                });

                const csvBlob = new Blob([csvOutput], { type: 'text/csv' });
                formData.append('csv_file', csvBlob, 'converted_from_excel.csv');

            } catch (e) {
                showLoading(false);
                console.error(e);
                alert("เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: " + e.message);
                return;
            }
        } else {
            formData.append('csv_file', file);
        }

        formData.append('action', 'import'); 

        fetch('api/manage_shipping.php', { 
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(result => {
            showLoading(false);
            if (result.success) {
                alert(result.message);
                loadData(); 
                fileInput.value = '';
            } else {
                alert('Error: ' + result.message);
            }
        })
        .catch(error => {
            showLoading(false);
            console.error('Error:', error);
            alert('เกิดข้อผิดพลาดในการเชื่อมต่อ Server');
        });
    }
    
    function exportToCSV() { window.location.href = 'api/manage_shipping.php?action=export'; }
    </script>
</body>
</html>