// MES/page/storeManagement/script/rmReceiving.js
"use strict";

let parsedData = [];
let previewData = [];
let importModalInstance;
let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let searchTimer;

async function fetchAPI(action, method = 'GET', bodyData = null, buttonId = null) {
    let btn = null;
    let originalHtml = '';
    
    if (buttonId) {
        btn = document.getElementById(buttonId);
        if (btn) {
            if (btn.disabled) return null; 
            originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
    }

    try {
        const url = `api/api_store.php?action=${action}`;
        const options = { method: method };

        if (method === 'POST') {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const csrfToken = csrfMeta ? csrfMeta.getAttribute('content') : '';
            
            if (bodyData instanceof FormData) {
                bodyData.append('csrf_token', csrfToken);
                options.body = bodyData;
            } else {
                bodyData = bodyData || {};
                bodyData.csrf_token = csrfToken;
                options.headers = { 'Content-Type': 'application/json' };
                options.body = JSON.stringify(bodyData);
            }
        }

        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || `HTTP Error: ${response.status}`);
        }
        return result;
        
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
        throw error;
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHtml;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const importModalEl = document.getElementById('importModal');
    if (importModalEl) {
        importModalInstance = new bootstrap.Modal(importModalEl);
        importModalEl.addEventListener('hidden.bs.modal', clearModalData);
    }

    document.getElementById('searchInput')?.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            currentPage = 1;
            loadHistory();
        }, 500);
    });

    document.getElementById('filterStartDate')?.addEventListener('change', () => { currentPage = 1; loadHistory(); });
    document.getElementById('filterEndDate')?.addEventListener('change', () => { currentPage = 1; loadHistory(); });

    loadHistory();
});

async function loadHistory() {
    const tbody = document.getElementById('historyTbody');
    if (!tbody) return; 
    
    tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</td></tr>';
    document.getElementById('selectAllCheckbox').checked = false;
    updateBatchPrintBtn();
    
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const search = encodeURIComponent(document.getElementById('searchInput').value.trim());
    
    try {
        const queryParams = `get_rm_history&start_date=${startDate}&end_date=${endDate}&search=${search}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');
        
        if (result.kpi) {
            document.getElementById('kpi-total-tags').innerText = (parseInt(result.kpi.total_tags) || 0).toLocaleString();
            document.getElementById('kpi-total-qty').innerText = (parseFloat(result.kpi.total_qty) || 0).toLocaleString();
            document.getElementById('kpi-printed').innerText = (parseInt(result.kpi.printed_tags) || 0).toLocaleString();
            document.getElementById('kpi-pending').innerText = (parseInt(result.kpi.pending_tags) || 0).toLocaleString();
        }

        tbody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        result.data.forEach(row => {
            let badgeClass = row.status === 'AVAILABLE' ? 'bg-success' : (row.status === 'EMPTY' ? 'bg-secondary' : (row.status === 'PENDING' ? 'bg-warning' : 'bg-info'));
            let displayTime = row.created_at ? row.created_at.substring(0,16) : '-';
            let receiveDate = row.actual_receive_date ? formatDateForPrint(row.actual_receive_date) : '-';
            let rowDataEncoded = encodeURIComponent(JSON.stringify(row));
            
            tbody.innerHTML += `
                <tr class="align-middle">
                    <td class="text-center">
                        <input class="form-check-input row-checkbox" type="checkbox" value="${rowDataEncoded}" onchange="updateBatchPrintBtn()">
                    </td>
                    <td class="text-muted"><small>${displayTime}</small></td>
                    <td>${receiveDate}</td>
                    <td class="text-center fw-bold text-primary">
                        ${escapeHTML(row.serial_no)}
                        ${row.master_pallet_no ? `<br><span class="badge bg-primary bg-opacity-10 text-primary border border-primary mt-1" title="Pallet Tag"><i class="fas fa-boxes"></i> ${escapeHTML(row.master_pallet_no)}</span>` : ''}
                    </td>
                    <td class="text-truncate text-center" style="max-width: 100px;" title="${escapeHTML(row.item_no)} | ${escapeHTML(row.category || '')}">
                        ${escapeHTML(row.item_no)} <br> <small class="text-muted">${escapeHTML(row.category || '')}</small>
                    </td>
                    <td class="text-truncate text-center" style="max-width: 350px;" title="${escapeHTML(row.po_number)}">
                        ${escapeHTML(row.po_number) || '-'}
                    </td>
                    <td class="text-truncate text-center" style="max-width: 120px;" title="${escapeHTML(row.warehouse_no)}">
                        ${escapeHTML(row.warehouse_no) || '-'}
                    </td>
                    <td class="text-center">${escapeHTML(row.pallet_no) || '-'} / ${escapeHTML(row.ctn_number) || '-'}</td>
                    <td class="text-center">${escapeHTML(row.week_no) || '-'}</td>
                    <td class="text-center fw-bold">${parseFloat(row.qty_per_pallet).toLocaleString()}</td>
                    <td class="text-center text-truncate text-danger small" style="max-width: 250px;" title="${escapeHTML(row.remark || '')}">
                        ${escapeHTML(row.remark || '')}
                    </td>
                    <td class="text-center">
                        ${row.print_count > 0 
                            ? `<span class="badge bg-info text-dark" title="พิมพ์ล่าสุด: ${row.last_printed_at}"><i class="fas fa-print me-1"></i>${row.print_count}</span>` 
                            : `<span class="badge bg-light text-muted border"><i class="fas fa-print"></i> 0</span>`
                        }
                    </td>
                    <td class="text-center"><span class="badge ${badgeClass}">${escapeHTML(row.status)}</span></td>
                    <td class="text-center align-middle">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-light border-0 text-secondary shadow-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="width: 32px; height: 32px; border-radius: 50%;">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="font-size: 0.9rem; z-index: 1050;">
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="#" onclick="printSingleTag('${rowDataEncoded}'); return false;">
                                        <i class="fas fa-print text-dark fa-fw me-2"></i> พิมพ์ Tag (ใบย่อย)
                                    </a>
                                </li>
                                ${row.master_pallet_no ? `
                                <li>
                                    <a class="dropdown-item py-2 fw-bold text-primary bg-primary bg-opacity-10" href="#" onclick="reprintMasterPallet('${row.master_pallet_no}'); return false;">
                                        <i class="fas fa-boxes text-primary fa-fw me-2"></i> พิมพ์ Pallet Tag
                                    </a>
                                </li>
                                ` : ''}
                                ${typeof CAN_MANAGE_RM !== 'undefined' && CAN_MANAGE_RM ? `
                                <li><hr class="dropdown-divider"></li>
                                <li>
                                    <a class="dropdown-item py-2 fw-bold" href="#" onclick="editTag('${rowDataEncoded}'); return false;">
                                        <i class="fas fa-edit text-primary fa-fw me-2"></i> แก้ไขข้อมูล
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item py-2 text-danger fw-bold" href="#" onclick="deleteTag('${row.serial_no}'); return false;">
                                        <i class="fas fa-trash fa-fw me-2"></i> ลบข้อมูล
                                    </a>
                                </li>
                                ` : ''}
                            </ul>
                        </div>
                    </td>
                </tr>
            `;
        });

        if (result.pagination) {
            totalPages = result.pagination.total_pages || 1;
            renderPaginationControls(result.pagination.total_records);
        }

    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="14" class="text-center text-danger">โหลดประวัติล้มเหลว</td></tr>';
    }
}

function changeRowsPerPage() {
    rowsPerPage = parseInt(document.getElementById('rowsPerPage').value);
    currentPage = 1;
    loadHistory();
}

function renderPaginationControls(totalRecords) {
    const start = totalRecords === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRecords);
    document.getElementById('paginationInfo').innerText = `แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`;

    const paginationUl = document.getElementById('paginationControls');
    paginationUl.innerHTML = '';
    if (totalPages <= 1) return;

    paginationUl.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}, event)">ก่อนหน้า</a></li>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        paginationUl.innerHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a></li>`;
    }
    paginationUl.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}, event)">ถัดไป</a></li>`;
}

function changePage(page, event) {
    if (event) event.preventDefault();
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadHistory();
}

window.exportToExcel = async function() {
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    const search = encodeURIComponent(document.getElementById('searchInput').value.trim());
    const queryParams = `get_rm_history&start_date=${startDate}&end_date=${endDate}&search=${search}&export=true`;
    
    const result = await fetchAPI(queryParams, 'GET', null, 'btnExportExcel');
    if (!result || !result.data || result.data.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับส่งออก', 'info');
        return;
    }

    let ws_data = [
        ["Item No.", "Category", "Des.", "Purchase Order", "Carton/Pallet", "Package QTY", "Invoice No.", "Pallet/Carton", "CTN Number", "Week", "Date", "Remark", "Serial No.", "Status", "Imported At"]
    ];

    result.data.forEach(row => {
        ws_data.push([
            row.item_no || "", row.category || "", row.part_description || row.description_ref || "", row.po_number || "",
            row.qty_per_pallet || "", "1", row.warehouse_no || "", row.pallet_no || "", row.ctn_number || "", row.week_no || "",
            row.received_date ? row.received_date.split(' ')[0] : "", row.remark || "", row.serial_no || "", row.status || "", row.created_at || ""
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RM_Receiving_Report");
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `RM_Report_${dateStr}.xlsx`);
};

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

function downloadTemplate() {
    const ws_data = [
        ["Item No.", "英文名称", "Des.", "Purchase Order", "Carton/Pallet", "Package QTY", "Invoice No.", "Pallet/Carton", "CTN Number", "Week", "Date", "Remark"],
        ["RM-12345", "RESISTOR", "10K OHM 1/4W", "PO-2026-001", "1000", "2", "INV-2603-001", "PL-001", "CTN-01", "12.26", "2026-03-16", "ขาด 50 ชิ้น"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [ {wch: 15}, {wch: 20}, {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 20} ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Import_Template");
    XLSX.writeFile(wb, "RM_Receiving_Template.xlsx");
}

function processExcel() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    if (!file) { Swal.fire('แจ้งเตือน', 'กรุณาเลือกไฟล์ Excel', 'warning'); return; }

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
                else if (colName.includes('warehouse') || colName.includes('invoice') || colName.includes('inv')) colMap['wh'] = index;
                else if (colName.includes('carton/pallet') || colName.includes('每箱')) colMap['qty'] = index;
                else if (colName.includes('package qty') || colName === '件数') colMap['pack'] = index;
                else if (colName.includes('pallet/carton') || colName.includes('托号')) colMap['pallet'] = index;
                else if (colName.includes('ctn number')) colMap['ctn'] = index;
                else if (colName.includes('week')) colMap['week'] = index;
                else if (colName.includes('remark') || colName.includes('note') || colName.includes('หมายเหตุ') || colName.includes('备注')) colMap['remark'] = index;
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

        let packageQty = parseInt(row[colMap['pack']]) || 1;
        let qtyPerPallet = parseFloat(row[colMap['qty']]) || 0;
        let formattedDate = formatExcelDate(row[colMap['date']]);

        if (qtyPerPallet > 0) {
            previewData.push({ 
                item_no: itemNo, category: row[colMap['cat']]||'', des: row[colMap['des']]||'', po_number: row[colMap['po']]||'', 
                qty: qtyPerPallet, pack: packageQty, wh: row[colMap['wh']]||'', remark: row[colMap['remark']]||'' 
            });

            for (let p = 0; p < packageQty; p++) {
                parsedData.push({
                    item_no: String(itemNo).trim(), po_number: String(row[colMap['po']]||'').trim(), category: String(row[colMap['cat']]||'').trim(), 
                    des: String(row[colMap['des']]||'').trim(), received_date: formattedDate, warehouse_no: String(row[colMap['wh']]||'').trim(),
                    qty: qtyPerPallet, pallet_no: String(row[colMap['pallet']]||'').trim(), ctn_number: String(row[colMap['ctn']]||'').trim(), week: String(row[colMap['week']]||'').trim(),
                    remark: String(row[colMap['remark']]||'').trim()
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
    return `${parts[2].padStart(2, '0')}-${months[parseInt(parts[1], 10) - 1]}-${parts[0].substring(2)}`;
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
                <td class="text-danger small">${escapeHTML(row.remark)}</td> 
            </tr>
        `;
    });

    document.getElementById('previewCount').innerText = `เตรียมสร้าง Tag จำนวน: ${parsedData.length} ใบ`;
    document.getElementById('btnSave').classList.remove('d-none');
}

async function submitToDatabase() {
    if (parsedData.length === 0) return;
    const formData = new FormData();
    formData.append('data', JSON.stringify(parsedData));

    const result = await fetchAPI('import_excel', 'POST', formData, 'btnSave');
    
    if (result) {
        importModalInstance.hide();
        loadHistory();
        renderPrintTags(result.data);
        
        Swal.fire({ 
            title: 'สำเร็จ', text: 'นำเข้าข้อมูลเรียบร้อย กำลังเปิดหน้าต่างพิมพ์...', icon: 'success', 
            timer: 1500, showConfirmButton: false 
        }).then(() => { setTimeout(() => { window.print(); }, 300); });
    }
}

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBatchPrintBtn();
}

function updateBatchPrintBtn() {
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const btnPrintDropdown = document.getElementById('btnBatchPrintDropdown');
    const btnDelete = document.getElementById('btnBatchDelete'); 
    const selectAllCb = document.getElementById('selectAllCheckbox');
    const totalCount = document.querySelectorAll('.row-checkbox').length;
    
    if(checkedCount > 0) {
        if(btnPrintDropdown) { btnPrintDropdown.classList.remove('d-none'); document.getElementById('selectedCount').innerText = checkedCount; }
        if(btnDelete) { btnDelete.classList.remove('d-none'); document.getElementById('selectedDeleteCount').innerText = checkedCount; }
    } else {
        if(btnPrintDropdown) btnPrintDropdown.classList.add('d-none');
        if(btnDelete) btnDelete.classList.add('d-none');
    }
    if(selectAllCb) selectAllCb.checked = (checkedCount === totalCount && totalCount > 0);
}

window.groupToMasterPallet = async function() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;
    
    let serials = [];
    checkboxes.forEach(cb => { 
        let rowData = JSON.parse(decodeURIComponent(cb.value));
        serials.push(rowData.serial_no); 
    });

    Swal.fire({
        title: 'จัดกลุ่ม Pallet Tag?',
        text: `คุณต้องการนำ Tag ทั้ง ${serials.length} รายการนี้ มัดรวมเป็นพาเลทเดียวกันใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true, confirmButtonColor: '#0d6efd', cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, จัดกลุ่มและพิมพ์ใบหน้า', cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('serials', JSON.stringify(serials));
            
            Swal.fire({ title: 'กำลังประมวลผล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            const res = await fetchAPI('group_master_pallet', 'POST', formData);
            
            if(res) {
                renderMasterPalletTag(res.data);
                loadHistory();
                Swal.fire({ title: 'สำเร็จ!', text: 'จัดกลุ่มพาเลทเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false })
                .then(() => { setTimeout(() => window.print(), 300); });
            }
        }
    });
};

window.printSingleTag = async function(encodedRow) {
    const tag = JSON.parse(decodeURIComponent(encodedRow));
    renderPrintTags([tag]);
    await logPrintStatus([tag.serial_no]);
    loadHistory(); 
    setTimeout(() => { window.print(); }, 200); 
}

window.printSelectedTags = async function() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;
    let tagsToPrint = [], serialsToLog = [];
    checkboxes.forEach(cb => { 
        let tag = JSON.parse(decodeURIComponent(cb.value));
        tagsToPrint.push(tag); 
        serialsToLog.push(tag.serial_no);
    });
    renderPrintTags(tagsToPrint);
    await logPrintStatus(serialsToLog);
    loadHistory();
    setTimeout(() => { window.print(); }, 300);
}

async function logPrintStatus(serials) {
    if(!serials || serials.length === 0) return;
    const formData = new FormData();
    formData.append('serials', JSON.stringify(serials));
    try {
        await fetchAPI('update_print_status', 'POST', formData);
    } catch(err) {}
}

window.deleteTag = function(serialNo) {
    Swal.fire({
        title: 'ยืนยันการลบข้อมูล?',
        text: `คุณต้องการลบ Tag: ${serialNo} ใช่หรือไม่?`,
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, ลบทิ้งเลย!', cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('serial_no', serialNo);
            const res = await fetchAPI('delete_tag', 'POST', formData);
            if(res) {
                Swal.fire('ลบสำเร็จ!', 'ข้อมูลถูกลบออกจากระบบแล้ว', 'success');
                loadHistory();
            }
        }
    });
};

window.deleteSelectedTags = function() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkboxes.length === 0) return;
    let serials = [];
    checkboxes.forEach(cb => serials.push(JSON.parse(decodeURIComponent(cb.value)).serial_no));
    
    Swal.fire({
        title: 'ยืนยันการลบหลายรายการ?', text: `คุณกำลังจะลบ Tag จำนวน ${serials.length} รายการ?`,
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, ลบทั้งหมดเลย!', cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('serials', JSON.stringify(serials)); 
            const res = await fetchAPI('delete_bulk_tags', 'POST', formData);
            if(res) {
                Swal.fire('ลบสำเร็จ!', `ข้อมูล ${serials.length} รายการถูกลบแล้ว`, 'success');
                loadHistory();
            }
        }
    });
};

window.editTag = function(encodedRow) {
    const row = JSON.parse(decodeURIComponent(encodedRow));
    Swal.fire({
        title: 'แก้ไขข้อมูลอ้างอิง', width: '600px',
        html: `
            <div class="text-start px-2" style="font-size: 0.9rem;">
                <label class="form-label fw-bold mb-1 text-muted">Serial No.</label>
                <input class="form-control form-control-sm mb-3 bg-light" value="${row.serial_no}" readonly>
                <div class="row g-2 mb-2">
                    <div class="col-sm-6"><label class="form-label fw-bold mb-1 text-primary">PO Number</label><input id="swal-edit-po" class="form-control form-control-sm" value="${row.po_number || ''}"></div>
                    <div class="col-sm-6"><label class="form-label fw-bold mb-1 text-primary">Invoice No.</label><input id="swal-edit-inv" class="form-control form-control-sm" value="${row.warehouse_no || ''}"></div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">Pallet No.</label><input id="swal-edit-pallet" class="form-control form-control-sm" value="${row.pallet_no || ''}"></div>
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">CTN No.</label><input id="swal-edit-ctn" class="form-control form-control-sm" value="${row.ctn_number || ''}"></div>
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">Week</label><input id="swal-edit-week" class="form-control form-control-sm" value="${row.week_no || ''}"></div>
                </div>
                <label class="form-label fw-bold mb-1 text-primary">Remark</label>
                <textarea id="swal-edit-remark" class="form-control form-control-sm" rows="2">${row.remark || ''}</textarea>
            </div>
        `,
        focusConfirm: false, showCancelButton: true, confirmButtonText: '<i class="fas fa-save"></i> บันทึก', cancelButtonText: 'ยกเลิก',
        preConfirm: () => ({
            po: document.getElementById('swal-edit-po').value.trim(),
            inv: document.getElementById('swal-edit-inv').value.trim(),
            pallet: document.getElementById('swal-edit-pallet').value.trim(),
            ctn: document.getElementById('swal-edit-ctn').value.trim(),
            week: document.getElementById('swal-edit-week').value.trim(),
            remark: document.getElementById('swal-edit-remark').value.trim()
        })
    }).then(async (result) => {
        if (result.isConfirmed) {
            const formData = new FormData();
            formData.append('serial_no', row.serial_no);
            formData.append('po_number', result.value.po);
            formData.append('warehouse_no', result.value.inv);
            formData.append('pallet_no', result.value.pallet);
            formData.append('ctn_number', result.value.ctn);
            formData.append('week_no', result.value.week);
            formData.append('remark', result.value.remark);
            
            const res = await fetchAPI('edit_tag', 'POST', formData);
            if(res) {
                Swal.fire({ title: 'บันทึกสำเร็จ!', icon: 'success', timer: 1500, showConfirmButton: false });
                loadHistory();
            }
        }
    });
};

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}