/**
 * script/shipping_loading.js
 * จัดการ Logic ทั้งหมดของหน้า Shipping Schedule
 */

let allData = [];

$(document).ready(function() {
    loadData();

    // ระบบค้นหา
    $('#universalSearch').on('keyup', function() {
        const val = $(this).val().toLowerCase();
        const filtered = allData.filter(row => {
            return (row.po_number && row.po_number.toLowerCase().includes(val)) ||
                   (row.sku && row.sku.toLowerCase().includes(val)) ||
                   (row.container_no && row.container_no.toLowerCase().includes(val)) ||
                   (row.remark && row.remark.toLowerCase().includes(val));
        });
        renderTable(filtered);
        initDatePickers(); // รีเซ็ตปฏิทินหลังกรองข้อมูล
    });
});

function showLoading(show) {
    if(show) $('#loadingOverlay').css('display', 'flex');
    else $('#loadingOverlay').hide();
}

function loadData() {
    showLoading(true);
    $.ajax({
        url: 'api/manage_shipping.php?action=read',
        method: 'GET', 
        dataType: 'json',
        success: function(res) {
            showLoading(false);
            if(res.success) {
                allData = res.data;
                renderTable(allData);
                initDatePickers(); // เปิดใช้งานปฏิทิน dd/mm/yyyy
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

// ฟังก์ชันแปลง YYYY-MM-DD เป็น DD/MM/YYYY สำหรับแสดงผล
const fnDateDisplay = (d) => {
    if (!d || d === '0000-00-00' || d === '1900-01-01' || d === 'null') return '';
    const datePart = d.split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length !== 3) return d; // ถ้าไม่ใช่ฟอร์แมต Y-M-D ให้คืนค่าเดิม
    const [y, m, day] = parts;
    return `${day}/${m}/${y}`;
};

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
            : `<button class="status-badge ${loadClass}" onclick="toggleStatus(${row.id}, 'loading', ${row.is_loading_done})">${loadTxt}</button>`;
        
        let prodBtn = isCustomer ? `<span class="status-badge ${prodClass}">${prodTxt}</span>` 
            : `<button class="status-badge ${prodClass}" onclick="toggleStatus(${row.id}, 'production', ${row.is_production_done})">${prodTxt}</button>`;
        
        let ro = isCustomer ? 'readonly' : '';

        html += `<tr>
            <td class="sticky-col-left-1 text-center bg-white">${loadBtn}</td>
            <td class="sticky-col-left-2 text-center bg-white">${prodBtn}</td>
            <td class="sticky-col-left-3 fw-bold text-primary bg-white">${row.po_number || '-'}</td>

            <td class="text-center">${row.shipping_week||''}</td>
            <td><input class="editable-input" value="${row.shipping_customer_status||''}" onchange="upd(${row.id}, 'shipping_customer_status', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.inspect_type||''}" onchange="upd(${row.id}, 'inspect_type', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.inspection_result||''}" onchange="upd(${row.id}, 'inspection_result', this.value)" ${ro}></td>
            
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.snc_load_day)}" data-field="snc_load_day" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td class="bg-warning bg-opacity-10"><input type="text" class="editable-input datepicker fw-bold" value="${fnDateDisplay(row.etd)}" data-field="etd" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            
            <td><input class="editable-input" value="${row.dc_location||''}" onchange="upd(${row.id}, 'dc_location', this.value)" ${ro}></td>
            <td>${row.sku||''}</td>
            <td><input class="editable-input" value="${row.booking_no||''}" onchange="upd(${row.id}, 'booking_no', this.value)" ${ro}></td>
            <td><input class="editable-input" value="${row.invoice_no||''}" onchange="upd(${row.id}, 'invoice_no', this.value)" ${ro}></td>
            <td title="${row.description||''}"><div class="text-truncate" style="max-width:150px;">${row.description||''}</div></td>
            <td class="text-center">${(row.ctns_qty || row.quantity) ? parseInt(row.ctns_qty || row.quantity).toLocaleString() : 0}</td>
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
            
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.si_vgm_cut_off)}" data-field="si_vgm_cut_off" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.pickup_date)}" data-field="pickup_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td><input type="text" class="editable-input datepicker" value="${fnDateDisplay(row.return_date)}" data-field="return_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            
            <td><input class="editable-input" value="${row.remark||''}" onchange="upd(${row.id}, 'remark', this.value)" ${ro}></td>

            <td class="sticky-col-right-2 bg-white"><input type="text" class="editable-input datepicker text-danger fw-bold" value="${fnDateDisplay(row.cutoff_date)}" data-field="cutoff_date" data-id="${row.id}" placeholder="dd/mm/yyyy" ${ro}></td>
            <td class="sticky-col-right-1 bg-white"><input type="time" class="editable-input text-danger fw-bold" value="${row.cutoff_time ? row.cutoff_time.substring(0,5) : ''}" onchange="upd(${row.id}, 'cutoff_time', this.value)" ${ro}></td>
        </tr>`;
    });
    $('#tableBody').html(html);
}

function initDatePickers() {
    flatpickr(".datepicker", {
        dateFormat: "d/m/Y",
        allowInput: true,
        disableMobile: "true",
        onChange: function(selectedDates, dateStr, instance) {
            if (!dateStr) return;
            const id = instance.element.getAttribute('data-id');
            const field = instance.element.getAttribute('data-field');
            const [d, m, y] = dateStr.split('/');
            const apiDate = `${y}-${m}-${d}`;
            upd(id, field, apiDate);
        }
    });
}

function upd(id, field, val) {
    if(isCustomer) return;
    if (field === 'cutoff_time' && val) {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(val)) return;
    }
    $.post('api/manage_shipping.php', {action:'update_cell', id:id, field:field, value:val});
}

function toggleStatus(id, type, currentVal) {
    if(isCustomer) return;
    let fieldName = (type === 'loading') ? 'is_loading_done' : 'is_production_done';
    let newVal = (currentVal == 1) ? 0 : 1;
    showLoading(true);
    $.post('api/manage_shipping.php', {
        action: 'update_check',
        id: id, 
        field: fieldName, 
        checked: newVal
    }, function(res){
        showLoading(false);
        if(res.success) loadData();
        else alert('Update Failed: ' + res.message);
    }, 'json');
}

async function uploadFile() {
    const fileInput = document.getElementById('csv_file'); 
    if (!fileInput || !fileInput.files[0]) return;

    const file = fileInput.files[0];
    showLoading(true);

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

        let rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        let cleanedData = rawData.map(row => {
            let newRow = {};
            for (let key in row) {
                let cleanKey = key.trim().replace(/\s+/g, ' '); 
                newRow[cleanKey] = row[key];
            }
            return newRow;
        });

        cleanedData = cleanedData.filter(row => row['PO'] || row['po_number']);

        $.post('api/manage_shipping.php', {
            action: 'import_json',
            data: JSON.stringify(cleanedData)
        }, function(res) {
            showLoading(false);
            if (res.success) {
                alert(res.message);
                loadData();
                fileInput.value = '';
            } else {
                alert('Import Error: ' + (res.message || "Unknown Error"));
            }
        }, 'json').fail(function() {
            showLoading(false);
            alert('Server Error');
        });

    } catch (e) {
        showLoading(false);
        alert("Error reading file: " + e.message);
    }
}

function exportToCSV() { window.location.href = 'api/manage_shipping.php?action=export'; }