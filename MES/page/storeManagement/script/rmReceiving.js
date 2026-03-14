"use strict";

let parsedData = [];
let previewData = [];
let importModalInstance;

document.addEventListener('DOMContentLoaded', () => {
    importModalInstance = new bootstrap.Modal(document.getElementById('importModal'));
    loadHistory();
    
    document.getElementById('importModal').addEventListener('hidden.bs.modal', clearModalData);
});

window.addEventListener('beforeprint', () => {
    document.body.classList.remove('desktop-only-page');
});

window.addEventListener('afterprint', () => {
    document.body.classList.add('desktop-only-page');
});

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag])
    );
}

function openImportModal() {
    clearModalData();
    importModalInstance.show();
}

function clearModalData() {
    parsedData = [];
    previewData = [];
    document.getElementById('excelFile').value = '';
    document.getElementById('previewTbody').innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5">กรุณาเลือกไฟล์และกดแสดงตัวอย่าง</td></tr>';
    document.getElementById('previewCount').innerText = `พบข้อมูล: 0 พาเลท`;
    document.getElementById('btnSave').classList.add('d-none');
}

function processExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    if (!file) {
        Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ Excel', 'warning');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {header: 1, defval: ""});

        extractData(rawRows);
    };
    reader.readAsArrayBuffer(file);
}

function extractData(rawRows) {
    parsedData = [];
    previewData = [];
    let colMap = {};
    let isHeaderFound = false;

    for (let i = 0; i < Math.min(10, rawRows.length); i++) {
        let rowStr = rawRows[i].join('').toLowerCase();
        if (rowStr.includes('item no') || rowStr.includes('货号')) {
            isHeaderFound = true;
            rawRows[i].forEach((cell, index) => {
                let colName = String(cell).toLowerCase();
                if (colName.includes('item no') || colName.includes('货号')) colMap['item'] = index;
                else if (colName.includes('purchase order') || colName.includes('合同编号')) colMap['po'] = index;
                else if (colName.includes('英文名称') || colName.includes('category')) colMap['cat'] = index;
                else if (colName.includes('des.')) colMap['des'] = index;
                else if (colName.includes('date')) colMap['date'] = index;
                else if (colName.includes('warehouse')) colMap['wh'] = index;
                else if (colName.includes('carton/pallet') || colName.includes('每箱')) colMap['qty'] = index;
                else if (colName.includes('package qty') || colName === '件数') colMap['pack'] = index;
                else if (colName.includes('pallet/carton') || colName.includes('托号')) colMap['pallet'] = index;
                else if (colName.includes('ctn number')) colMap['ctn'] = index;
                else if (colName.includes('week')) colMap['week'] = index;
            });
            break;
        }
    }

    if (!isHeaderFound || colMap['item'] === undefined) {
        Swal.fire('ข้อผิดพลาด', 'รูปแบบไฟล์ไม่ถูกต้อง ไม่พบคอลัมน์ Item No.', 'error');
        return;
    }

    for (let i = 0; i < rawRows.length; i++) {
        let row = rawRows[i];
        let itemNo = row[colMap['item']];
        if (!itemNo || String(itemNo).toLowerCase().includes('item no')) continue;

        let poNo = row[colMap['po']] || '';
        let category = row[colMap['cat']] || ''; 
        let des = row[colMap['des']] || '';
        let whNo = row[colMap['wh']] || '';
        let palletNo = row[colMap['pallet']] || '';
        let ctnNo = row[colMap['ctn']] || '';
        let weekNo = row[colMap['week']] || '';
        
        let qtyPerPallet = parseFloat(row[colMap['qty']]) || 0;
        let packageQty = parseInt(row[colMap['pack']]) || 1;
        let formattedDate = formatExcelDate(row[colMap['date']]);

        if (qtyPerPallet > 0) {
            previewData.push({
                item_no: itemNo, category: category, des: des, po_number: poNo, qty: qtyPerPallet, pack: packageQty, wh: whNo
            });

            for (let p = 0; p < packageQty; p++) {
                parsedData.push({
                    item_no: String(itemNo).trim(),
                    po_number: String(poNo).trim(),
                    category: String(category).trim(), 
                    des: String(des).trim(),
                    received_date: formattedDate,
                    warehouse_no: String(whNo).trim(),
                    qty: qtyPerPallet,
                    pallet_no: String(palletNo).trim(),
                    ctn_number: String(ctnNo).trim(),
                    week: String(weekNo).trim()
                });
            }
        }
    }
    renderPreview();
}

function formatExcelDate(excelDate) {
    if (!excelDate) {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    if (!isNaN(excelDate) && typeof excelDate === 'number') {
        let date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    }
    return String(excelDate).split(' ')[0].trim();
}

function formatDateForPrint(dateStr) {
    if (!dateStr) return '';
    
    const datePart = String(dateStr).split(' ')[0];
    const parts = datePart.split('-');
    
    if (parts.length !== 3) return dateStr;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = parts[0].substring(2);
    const month = months[parseInt(parts[1], 10) - 1];
    const day = parts[2].padStart(2, '0'); 
    
    return `${day}-${month}-${year}`;
}

function renderPreview() {
    let tbody = document.getElementById('previewTbody');
    tbody.innerHTML = '';

    if (previewData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">ไม่พบข้อมูลที่รับเข้าได้</td></tr>';
        document.getElementById('btnSave').classList.add('d-none');
        return;
    }

    previewData.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td><b>${escapeHTML(row.item_no)}</b></td>
                <td>${escapeHTML(row.category)}</td>
                <td class="text-truncate" style="max-width: 200px;" title="${escapeHTML(row.des)}">${escapeHTML(row.des)}</td>
                <td>${escapeHTML(row.po_number)}</td>
                <td class="text-end text-primary fw-bold">${row.qty.toLocaleString()}</td>
                <td class="text-end">${row.pack}</td>
                <td>${escapeHTML(row.wh)}</td>
            </tr>
        `;
    });

    document.getElementById('previewCount').innerText = `เตรียมสร้าง Tag จำนวน: ${parsedData.length} ใบ`;
    document.getElementById('btnSave').classList.remove('d-none');
}

async function submitToDatabase() {
    if (parsedData.length === 0) return;

    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

    const formData = new FormData();
    formData.append('action', 'import_excel');
    formData.append('data', JSON.stringify(parsedData));

    try {
        const res = await fetch('api/manageRmReceiving.php', { method: 'POST', body: formData });
        const json = await res.json();

        if (json.success) {
            importModalInstance.hide();
            loadHistory();
            renderPrintTags(json.data);
            
            Swal.fire({ 
                title: 'สำเร็จ', 
                text: 'บันทึกข้อมูลเรียบร้อย กำลังเปิดหน้าต่างพิมพ์...', 
                icon: 'success', 
                timer: 1500, 
                showConfirmButton: false 
            }).then(() => {
                setTimeout(() => { window.print(); }, 300);
            });

        } else {
            Swal.fire('ผิดพลาด', json.message, 'error');
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก';
        }
    } catch (err) {
        Swal.fire('System Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="fas fa-save me-1"></i> บันทึกรับเข้าสต็อก';
    } 
}

function renderPrintTags(tags) {
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = '';
    
    tags.forEach(tag => {
        // [NEW] รวมชื่อ Part Description จาก Master Data ถ้าไม่มีให้ใช้จาก Excel แทน
        let displayDesc = tag.part_description || tag.description_ref || '';

        let tagHTML = `
        <div class="tag-card">
            <div class="tag-details">
                <div class="t-title">${escapeHTML(tag.item_no)}</div>
                <div class="t-sub">${escapeHTML(tag.category || '')}</div>
                <div class="t-desc" title="${escapeHTML(displayDesc)}">${escapeHTML(displayDesc)}</div>
                
                <table class="t-table">
                    <tr>
                        <td style="width: 55%;"><b>QTY:</b> <span class="t-hl">${parseFloat(tag.qty_per_pallet).toLocaleString()}</span></td>
                        <td style="width: 45%;"><b>Inv:</b> ${escapeHTML(tag.warehouse_no)}</td>
                    </tr>
                    <tr>
                        <td><b>PO:</b> ${escapeHTML(tag.po_number)}</td>
                        <td><b>Pallet:</b> ${escapeHTML(tag.pallet_no)}</td>
                    </tr>
                    <tr>
                        <td><b>CTN:</b> ${escapeHTML(tag.ctn_number)}</td>
                        <td><b>Week:</b> ${escapeHTML(tag.week_no)}</td>
                    </tr>
                    <tr>
                        <td colspan="2"><b>Date:</b> ${escapeHTML(formatDateForPrint(tag.received_date))}</td>
                    </tr>
                </table>
            </div>

            <div class="tag-qr">
                <div id="qr-${tag.serial_no}"></div>
                <div class="t-serial">${tag.serial_no}</div>
            </div>
        </div>
        `;
        printArea.insertAdjacentHTML('beforeend', tagHTML);
        
        if(typeof QRCode !== 'undefined') {
            new QRCode(document.getElementById(`qr-${tag.serial_no}`), {
                text: tag.serial_no,
                width: 85,
                height: 85,
                colorDark : "#000000",
                colorLight : "#ffffff",
                correctLevel : QRCode.CorrectLevel.M 
            });
        }
    });
}

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBatchPrintBtn();
}

function updateBatchPrintBtn() {
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const btn = document.getElementById('btnBatchPrint');
    const countSpan = document.getElementById('selectedCount');
    const selectAllCb = document.getElementById('selectAllCheckbox');
    const totalCount = document.querySelectorAll('.row-checkbox').length;
    
    if(checkedCount > 0) {
        btn.classList.remove('d-none');
        countSpan.innerText = checkedCount;
    } else {
        btn.classList.add('d-none');
    }
    
    if(selectAllCb) {
        selectAllCb.checked = (checkedCount === totalCount && totalCount > 0);
    }
}

window.printSingleTag = function(encodedRow) {
    const tag = JSON.parse(decodeURIComponent(encodedRow));
    renderPrintTags([tag]);
    setTimeout(() => { window.print(); }, 200); 
}

window.printSelectedTags = function() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;
    
    let tagsToPrint = [];
    checkboxes.forEach(cb => {
        tagsToPrint.push(JSON.parse(decodeURIComponent(cb.value)));
    });
    
    renderPrintTags(tagsToPrint);
    setTimeout(() => { window.print(); }, 300);
}

async function loadHistory() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return; 
    
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
    document.getElementById('selectAllCheckbox').checked = false;
    updateBatchPrintBtn();
    
    try {
        const res = await fetch('api/manageRmReceiving.php?action=get_history');
        const json = await res.json();
        
        if(json.success) {
            tbody.innerHTML = '';
            if(json.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">ยังไม่มีประวัติการรับเข้า</td></tr>';
                return;
            }
            
            json.data.forEach(row => {
                let badgeClass = row.status === 'AVAILABLE' ? 'bg-success' : (row.status === 'EMPTY' ? 'bg-secondary' : 'bg-warning');
                let displayTime = row.created_at ? row.created_at.substring(0,16) : '-';
                let rowDataEncoded = encodeURIComponent(JSON.stringify(row));
                
                tbody.innerHTML += `
                    <tr>
                        <td class="text-center">
                            <input class="form-check-input row-checkbox" type="checkbox" value="${rowDataEncoded}" onchange="updateBatchPrintBtn()">
                        </td>
                        <td>${displayTime}</td>
                        <td class="fw-bold text-primary">${escapeHTML(row.serial_no)}</td>
                        <td>${escapeHTML(row.item_no)} <br> <small class="text-muted">${escapeHTML(row.category || '')}</small></td>
                        <td>${escapeHTML(row.po_number) || '-'}</td>
                        <td>${escapeHTML(row.pallet_no) || '-'}</td>
                        <td class="text-end">${parseFloat(row.qty_per_pallet).toLocaleString()}</td>
                        <td class="text-center"><span class="badge ${badgeClass}">${escapeHTML(row.status)}</span></td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-outline-dark" onclick="printSingleTag('${rowDataEncoded}')" title="พิมพ์ Tag ใบนี้">
                                <i class="fas fa-print"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">โหลดประวัติล้มเหลว</td></tr>';
    }
}