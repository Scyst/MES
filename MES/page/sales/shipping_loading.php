<?php
// shipping_loading.php
require_once 'check_auth.php'; // ระบบ Login เดิม
require_once 'common_head.php'; // CSS/Header เดิม
require_once 'config.php';
?>
<!DOCTYPE html>
<html lang="th">
<head>
    <title>Shipping Loading</title>
    <link rel="stylesheet" href="salesDashboard.css">
    <link rel="stylesheet" href="mobile.css">
    <style>
        /* CSS เสริมเฉพาะหน้านี้ */
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            cursor: pointer;
            text-transform: uppercase;
            border: none;
            transition: all 0.3s;
        }
        .status-pending { background-color: #ffeeba; color: #856404; } /* สีเหลือง */
        .status-done { background-color: #c3e6cb; color: #155724; }   /* สีเขียว */
        
        .editable-date {
            border: 1px solid #ced4da;
            border-radius: 4px;
            padding: 4px;
            width: 140px;
        }
        
        @media (max-width: 768px) {
            .table-responsive {
                overflow-x: auto;
            }
            .status-badge {
                display: block;
                width: 100%;
                margin-bottom: 5px;
                text-align: center;
            }
        }
    </style>
</head>
<body>

<?php include 'top_header.php'; ?>

<div class="main-container">
    <div class="dashboard-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2><i class="fa fa-ship"></i> Shipping Loading Control</h2>
        
        <div class="action-bar">
            <form id="importForm" style="display:inline-block; margin-right:10px;">
                <input type="file" name="csv_file" id="csvFile" accept=".csv" style="display:none;" onchange="uploadFile()">
                <button type="button" class="btn-primary" onclick="document.getElementById('csvFile').click()" style="background:#007bff; color:white; padding:8px 15px; border:none; border-radius:5px;">
                    <i class="fa fa-upload"></i> Import CSV
                </button>
            </form>
            
            <button onclick="exportExcel()" class="btn-success" style="background:#28a745; color:white; padding:8px 15px; border:none; border-radius:5px;">
                <i class="fa fa-file-excel-o"></i> Export
            </button>
        </div>
    </div>

    <div class="table-responsive" style="background:white; padding:15px; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
        <table class="table table-hover" id="shippingTable" style="width:100%">
            <thead>
                <tr style="background:#f8f9fa;">
                    <th>PO Number</th>
                    <th>SKU</th>
                    <th class="text-center">Production</th>
                    <th class="text-center">Loading</th>
                    <th>Week</th>
                    <th>Container</th>
                    <th>ETD</th>
                    <th>Pickup Date</th>
                    <th>Return Date</th>
                    <th>Remark</th>
                </tr>
            </thead>
            <tbody id="tableBody">
                </tbody>
        </table>
    </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
$(document).ready(function() {
    loadData();
});

function loadData() {
    // โหลดข้อมูลจาก API (สร้างไฟล์ api_get_shipping.php แยก)
    $.ajax({
        url: 'api_get_shipping.php', 
        method: 'GET',
        success: function(response) {
            let html = '';
            if(response.data) {
                response.data.forEach(row => {
                    // กำหนดสีปุ่มตามสถานะ (0 = Pending, 1 = Done)
                    let prodClass = row.is_production_done == 1 ? 'status-done' : 'status-pending';
                    let loadClass = row.is_loading_done == 1 ? 'status-done' : 'status-pending';
                    let prodText = row.is_production_done == 1 ? 'Finished' : 'Pending';
                    let loadText = row.is_loading_done == 1 ? 'Completed' : 'Wait';

                    html += `
                        <tr>
                            <td style="font-weight:bold; color:#0056b3;">${row.po_number}</td>
                            <td>${row.sku || '-'}</td>
                            
                            <td class="text-center">
                                <button class="status-badge ${prodClass}" 
                                    onclick="toggleStatus(${row.id}, 'is_production_done', ${row.is_production_done})">
                                    ${prodText}
                                </button>
                            </td>

                            <td class="text-center">
                                <button class="status-badge ${loadClass}" 
                                    onclick="toggleStatus(${row.id}, 'is_loading_done', ${row.is_loading_done})">
                                    ${loadText}
                                </button>
                            </td>

                            <td>${row.shipping_week || ''}</td>
                            <td>${row.container_no || ''}</td>
                            <td>${formatDate(row.etd)}</td>
                            
                            <td><input type="date" class="editable-date" value="${formatDateYMD(row.pickup_date)}" onchange="updateField(${row.id}, 'pickup_date', this.value)"></td>
                            <td><input type="date" class="editable-date" value="${formatDateYMD(row.return_date)}" onchange="updateField(${row.id}, 'return_date', this.value)"></td>
                            
                            <td><input type="text" style="width:100%; padding:4px; border:1px solid #ddd;" value="${row.remark || ''}" onchange="updateField(${row.id}, 'remark', this.value)"></td>
                        </tr>
                    `;
                });
            }
            $('#tableBody').html(html);
        }
    });
}

// ฟังก์ชันเปลี่ยนสถานะ (Production / Loading)
function toggleStatus(id, field, currentValue) {
    let newValue = currentValue == 1 ? 0 : 1; // สลับ 0 <-> 1
    updateField(id, field, newValue);
}

// ฟังก์ชันอัพเดตข้อมูลลงฐานข้อมูล
function updateField(id, field, value) {
    $.post('api_update_shipping_field.php', {
        id: id,
        field: field,
        value: value
    }, function(res) {
        // ถ้ายิงสำเร็จ ให้โหลดข้อมูลใหม่เฉพาะปุ่มเพื่อให้สีเปลี่ยน
        if(field.includes('is_')) loadData();
        console.log("Updated " + field);
    });
}

function uploadFile() {
    var formData = new FormData($('#importForm')[0]);
    // แสดง Loading...
    $('#tableBody').html('<tr><td colspan="10" class="text-center">Importing... Please wait.</td></tr>');
    
    $.ajax({
        url: 'api_import_shipping.php',
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function(response) {
            alert(response.message);
            loadData();
        },
        error: function() {
            alert("Error uploading file.");
            loadData();
        }
    });
}

// Helper Format วันที่
function formatDate(dateString) {
    if(!dateString) return '-';
    // แปลงให้แสดงผลสวยงาม (แล้วแต่ชอบ)
    if(typeof dateString === 'object') return dateString.date.substring(0, 10); 
    return dateString.substring(0, 10);
}
function formatDateYMD(dateString) {
    if(!dateString) return '';
    if(typeof dateString === 'object') return dateString.date.substring(0, 10);
    return dateString.substring(0, 10);
}
</script>

<?php include 'mobile_menu.php'; ?>
</body>
</html>