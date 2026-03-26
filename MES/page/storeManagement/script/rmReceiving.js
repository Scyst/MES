// MES/page/storeManagement/script/rmReceiving.js
"use strict";

let parsedData = [];
let previewData = [];
let importModalInstance;
let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;
let searchTimer;

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
    document.getElementById('statusFilter')?.addEventListener('change', () => { currentPage = 1; loadHistory(); }); // ดักจับตอนเปลี่ยนสถานะ

    loadHistory();
});

async function loadHistory() {
    const tbody = document.getElementById('historyTbody');
    const cardContainer = document.getElementById('historyCardContainer');
    
    if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted py-4"><i class="fas fa-spinner fa-spin fa-2x mb-2 text-primary"></i><br>กำลังโหลดข้อมูล...</td></tr>';
    if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-2x mb-3 text-primary"></i><br>กำลังโหลดข้อมูล...</div>';
    
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBatchPrintBtn();
    
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'ALL'; // อ่านค่า Status
    const search = encodeURIComponent(document.getElementById('searchInput')?.value.trim() || '');
    
    try {
        const queryParams = `get_rm_history&start_date=${startDate}&end_date=${endDate}&status=${statusFilter}&search=${search}&page=${currentPage}&limit=${rowsPerPage}`;
        const result = await fetchAPI(queryParams, 'GET');
        
        if (result.kpi) {
            document.getElementById('kpi-total-tags').innerText = (parseInt(result.kpi.total_tags) || 0).toLocaleString();
            document.getElementById('kpi-total-qty').innerText = (parseFloat(result.kpi.total_qty) || 0).toLocaleString();
            document.getElementById('kpi-printed').innerText = (parseInt(result.kpi.printed_tags) || 0).toLocaleString();
            document.getElementById('kpi-pending').innerText = (parseInt(result.kpi.pending_tags) || 0).toLocaleString();
        }

        if (!result.data || result.data.length === 0) {
            if (tbody) tbody.innerHTML = '<tr><td colspan="14" class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูล</td></tr>';
            if (cardContainer) cardContainer.innerHTML = '<div class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูล</div>';
            document.getElementById('paginationControls').innerHTML = '';
            document.getElementById('paginationInfo').innerText = 'แสดง 0 ถึง 0 จาก 0 รายการ';
            return;
        }

        let htmlTable = '';
        let htmlCards = '';

        result.data.forEach(row => {
            let badgeClass = row.status === 'AVAILABLE' ? 'bg-success' : (row.status === 'EMPTY' ? 'bg-secondary' : (row.status === 'PENDING' ? 'bg-warning text-dark' : 'bg-info'));
            let displayTime = row.created_at ? row.created_at.substring(0,16) : '-';
            let receiveDate = '-';
            if (row.actual_receive_date) {
                receiveDate = typeof formatDateForPrint === 'function' ? formatDateForPrint(row.actual_receive_date) : String(row.actual_receive_date).substring(0,10);
            }
            let rowDataEncoded = encodeURIComponent(JSON.stringify(row));
            
            // 1. สร้าง ROW สำหรับ Desktop
            htmlTable += `
                <tr class="align-middle">
                    <td class="text-center"><input class="form-check-input row-checkbox" type="checkbox" value="${rowDataEncoded}" onchange="syncCheckbox(this); updateBatchPrintBtn()" style="cursor:pointer; transform:scale(1.2);"></td>
                    <td class="text-muted"><small>${displayTime}</small></td>
                    <td>${receiveDate}</td>
                    <td class="text-center fw-bold text-primary">
                        ${escapeHTML(row.serial_no)}
                        ${row.master_pallet_no ? `<br><span class="badge bg-primary bg-opacity-10 text-primary border border-primary mt-1" title="Pallet Tag"><i class="fas fa-boxes"></i> ${escapeHTML(row.master_pallet_no)}</span>` : ''}
                    </td>
                    <td class="text-truncate text-center" style="max-width: 100px;" title="${escapeHTML(row.item_no)} | ${escapeHTML(row.category || '')}">
                        ${escapeHTML(row.item_no)} <br> <small class="text-muted">${escapeHTML(row.category || '')}</small>
                    </td>
                    <td class="text-truncate text-center" style="max-width: 350px;">${escapeHTML(row.po_number) || '-'}</td>
                    <td class="text-truncate text-center" style="max-width: 120px;">${escapeHTML(row.warehouse_no) || '-'}</td>
                    <td class="text-center">${escapeHTML(row.pallet_no) || '-'} / ${escapeHTML(row.ctn_number) || '-'}</td>
                    <td class="text-center">${escapeHTML(row.week_no) || '-'}</td>
                    <td class="text-center fw-bold">${parseFloat(row.qty_per_pallet).toLocaleString()}</td>
                    <td class="text-center text-truncate text-danger small" style="max-width: 250px;" title="${escapeHTML(row.remark || '')}">${escapeHTML(row.remark || '')}</td>
                    <td class="text-center">
                        ${row.print_count > 0 ? `<span class="badge bg-info text-dark"><i class="fas fa-print me-1"></i>${row.print_count}</span>` : `<span class="badge bg-light text-muted border"><i class="fas fa-print"></i> 0</span>`}
                    </td>
                    <td class="text-center"><span class="badge ${badgeClass}">${escapeHTML(row.status === 'AVAILABLE' ? 'COMPLETED' : row.status)}</span></td>
                    <td class="text-center align-middle">
                        <div class="dropdown">
                            <button class="btn btn-sm btn-light border-0 text-secondary shadow-sm" type="button" data-bs-toggle="dropdown"><i class="fas fa-ellipsis-v"></i></button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="font-size: 0.9rem;">
                                <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="printSingleTag('${rowDataEncoded}'); return false;"><i class="fas fa-print text-dark fa-fw me-2"></i> พิมพ์ Tag</a></li>
                                ${row.master_pallet_no ? `<li><a class="dropdown-item py-2 fw-bold text-primary bg-primary bg-opacity-10" href="#" onclick="reprintMasterPallet('${escapeHTML(row.master_pallet_no)}'); return false;"><i class="fas fa-boxes text-primary fa-fw me-2"></i> พิมพ์ Pallet</a></li>` : ''}
                                ${typeof CAN_MANAGE_RM !== 'undefined' && CAN_MANAGE_RM ? `
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item py-2 fw-bold" href="#" onclick="editTag('${rowDataEncoded}'); return false;"><i class="fas fa-edit text-primary fa-fw me-2"></i> แก้ไขข้อมูล</a></li>
                                <li><a class="dropdown-item py-2 text-danger fw-bold" href="#" onclick="deleteTag('${escapeHTML(row.serial_no)}'); return false;"><i class="fas fa-trash fa-fw me-2"></i> ลบข้อมูล</a></li>
                                ` : ''}
                            </ul>
                        </div>
                    </td>
                </tr>
            `;

            // 2. สร้าง CARD สำหรับ Mobile
            let borderLeftColor = row.status === 'AVAILABLE' ? 'var(--bs-success)' : (row.status === 'PENDING' ? 'var(--bs-warning)' : 'var(--bs-info)');
            htmlCards += `
                <div class="card shadow-sm mb-3 border-0" style="border-left: 4px solid ${borderLeftColor} !important; border-radius: 0.5rem;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="d-flex align-items-center gap-2">
                                <input class="form-check-input mt-0 row-checkbox" type="checkbox" value="${rowDataEncoded}" onchange="syncCheckbox(this); updateBatchPrintBtn()" style="transform: scale(1.3);">
                                <span class="badge ${badgeClass}">${escapeHTML(row.status === 'AVAILABLE' ? 'COMPLETED' : row.status)}</span>
                            </div>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-light border-0 shadow-sm" data-bs-toggle="dropdown" style="width: 30px; height: 30px; border-radius: 50%;"><i class="fas fa-ellipsis-v"></i></button>
                                <ul class="dropdown-menu dropdown-menu-end shadow-sm">
                                    <li><a class="dropdown-item fw-bold py-2" href="#" onclick="printSingleTag('${rowDataEncoded}'); return false;"><i class="fas fa-print me-2 text-dark"></i>พิมพ์ Tag</a></li>
                                    ${row.master_pallet_no ? `<li><a class="dropdown-item fw-bold text-primary py-2 bg-primary bg-opacity-10" href="#" onclick="reprintMasterPallet('${escapeHTML(row.master_pallet_no)}'); return false;"><i class="fas fa-boxes me-2"></i>พิมพ์ Pallet</a></li>` : ''}
                                    ${typeof CAN_MANAGE_RM !== 'undefined' && CAN_MANAGE_RM ? `
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item fw-bold py-2" href="#" onclick="editTag('${rowDataEncoded}'); return false;"><i class="fas fa-edit me-2 text-primary"></i>แก้ไขข้อมูล</a></li>
                                    <li><a class="dropdown-item fw-bold text-danger py-2" href="#" onclick="deleteTag('${escapeHTML(row.serial_no)}'); return false;"><i class="fas fa-trash me-2"></i>ลบข้อมูล</a></li>
                                    ` : ''}
                                </ul>
                            </div>
                        </div>
                        
                        <h6 class="fw-bold text-primary mb-1" style="font-size: 1.1rem;">${escapeHTML(row.serial_no)}</h6>
                        
                        <div class="row g-2 text-muted mt-1" style="font-size: 0.85rem;">
                            <div class="col-8 text-truncate fw-bold text-dark"><i class="fas fa-cube me-1 text-secondary"></i> ${escapeHTML(row.item_no)}</div>
                            <div class="col-4 text-end fw-bold text-dark" style="font-size: 1rem;">${parseFloat(row.qty_per_pallet).toLocaleString()}</div>
                            
                            <div class="col-6 text-truncate"><i class="fas fa-file-invoice me-1"></i> ${escapeHTML(row.po_number) || '-'}</div>
                            <div class="col-6 text-end"><i class="far fa-calendar-alt me-1"></i> ${receiveDate}</div>
                            
                            <div class="col-12 text-truncate"><i class="fas fa-pallet me-1"></i> Pallet: ${escapeHTML(row.pallet_no) || '-'} / CTN: ${escapeHTML(row.ctn_number) || '-'}</div>
                            
                            ${row.remark ? `
                            <div class="col-12 mt-2">
                                <div class="p-2 bg-danger bg-opacity-10 text-danger rounded border border-danger border-opacity-25 small">
                                    <i class="fas fa-exclamation-circle me-1"></i> ${escapeHTML(row.remark)}
                                </div>
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        if (tbody) tbody.innerHTML = htmlTable;
        if (cardContainer) cardContainer.innerHTML = htmlCards;

        if (result.pagination) {
            totalPages = result.pagination.total_pages || 1;
            renderPaginationControls(result.pagination.total_records);
        }

    } catch (err) {
        console.error("Load History Error:", err); 
        if (tbody) tbody.innerHTML = `<tr><td colspan="14" class="text-center text-danger py-4"><i class="fas fa-exclamation-triangle me-2"></i> โหลดประวัติล้มเหลว: ${err.message}</td></tr>`;
        if (cardContainer) cardContainer.innerHTML = `<div class="text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-3x mb-3 opacity-50"></i><br>โหลดประวัติล้มเหลว<br><small>${err.message}</small></div>`;
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

// อัปเดตให้รองรับ Status Filter
window.exportToExcel = async function() {
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || 'ALL'; 
    const search = encodeURIComponent(document.getElementById('searchInput')?.value.trim() || '');
    
    const queryParams = `get_rm_history&start_date=${startDate}&end_date=${endDate}&status=${statusFilter}&search=${search}&export=true`;
    
    const result = await fetchAPI(queryParams, 'GET', null, 'btnExportExcel');
    if (!result || !result.data || result.data.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับส่งออก', 'info');
        return;
    }

    let ws_data = [
        ["Item No.", "Category", "Des.", "Purchase Order", "Carton/Package", "Package QTY", "Invoice No.", "Pallet/Carton", "CTN Number", "Week", "Date", "Remark", "Serial No.", "Status", "Imported At"]
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
    document.getElementById('previewTbody').innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-muted align-middle" style="height: 280px;">
                <i class="fas fa-file-excel fa-3x mb-3 opacity-25"></i><br>
                <span class="fw-bold">กรุณาเลือกไฟล์ Excel เพื่อดูตัวอย่างข้อมูล</span>
            </td>
        </tr>`;
    document.getElementById('previewCount').innerText = `พบข้อมูล: 0 พาเลท`;
    document.getElementById('btnSave').classList.add('d-none');
}

function renderPreview() {
    let tbody = document.getElementById('previewTbody');
    let htmlContent = '';

    if (previewData.length === 0) {
        tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-danger align-middle" style="height: 280px;">
                <i class="fas fa-exclamation-triangle fa-3x mb-3 opacity-50"></i><br>
                <span class="fw-bold">ไม่พบข้อมูลที่ถูกต้องในไฟล์</span><br>
                <small class="text-muted">กรุณาตรวจสอบคอลัมน์ให้ตรงกับ Template</small>
            </td>
        </tr>`;
        document.getElementById('btnSave').classList.add('d-none');
        return;
    }

    previewData.forEach(row => {
        htmlContent += `
            <tr>
                <td class="px-3 fw-bold text-primary">${escapeHTML(row.item_no)}</td>
                <td>${escapeHTML(row.category)}</td>
                <td class="text-truncate" style="max-width: 250px;" title="${escapeHTML(row.des)}">${escapeHTML(row.des)}</td>
                <td>${escapeHTML(row.po_number)}</td>
                <td class="text-end fw-bold text-dark">${row.qty.toLocaleString()}</td>
                <td class="text-end">${row.pack}</td>
                <td class="px-2">${escapeHTML(row.wh)}</td>
                <td class="px-3 text-danger" style="font-size: 0.8rem;">${escapeHTML(row.remark)}</td> 
            </tr>
        `;
    });
    
    tbody.innerHTML = htmlContent;
    document.getElementById('previewCount').innerText = `เตรียมสร้าง Tag จำนวน: ${parsedData.length} ใบ`;
    document.getElementById('btnSave').classList.remove('d-none');
}

function downloadTemplate() {
    const ws_data = [
        ["Item No.", "英文名称", "Des.", "Purchase Order", "Carton/Package", "Package QTY", "Invoice No.", "Pallet/Carton", "CTN Number", "Week", "Date", "Remark"],
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
    
    if (!file) { 
        clearModalData(); 
        return; 
    }

    document.getElementById('previewTbody').innerHTML = `
        <tr>
            <td colspan="8" class="text-center text-primary align-middle" style="height: 280px;">
                <i class="fas fa-circle-notch fa-spin fa-3x mb-3"></i><br>
                <span class="fw-bold fs-5">กำลังอ่านข้อมูลจากไฟล์ Excel...</span><br>
                <small class="text-muted">ไฟล์ขนาดใหญ่อาจใช้เวลาสักครู่ กรุณารอหน้าต่างโหลดข้อมูล</small>
            </td>
        </tr>`;
    document.getElementById('previewCount').innerText = `กำลังประมวลผล...`;
    document.getElementById('btnSave').classList.add('d-none');
    setTimeout(() => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                const firstSheetName = workbook.SheetNames[0];
                const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {header: 1, defval: ""});
                extractData(rawRows);
                
            } catch (error) {
                console.error("Excel Parsing Error: ", error);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถอ่านไฟล์ Excel ได้ หรือไฟล์อาจเสียหาย', 'error');
                clearModalData();
            }
        };
        reader.readAsArrayBuffer(file);
        
    }, 100); 
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
                else if (colName.includes('carton/package') || colName.includes('carton/pallet') || colName.includes('每箱')) colMap['qty'] = index;
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

async function submitToDatabase() {
    if (parsedData.length === 0) return;
    const formData = new FormData();
    formData.append('data', JSON.stringify(parsedData));

    const result = await fetchAPI('import_excel', 'POST', formData, 'btnSave');
    
    if (result) {
        importModalInstance.hide();
        loadHistory();
        
        Swal.fire({ 
            title: 'สำเร็จ', text: 'นำเข้าข้อมูลเรียบร้อย กำลังเปิดหน้าต่างพิมพ์...', icon: 'success', 
            timer: 1500, showConfirmButton: false 
        }).then(() => {
            if (result.data && result.data.length > 0) {
                renderPrintTags(result.data);
                setTimeout(() => { window.print(); }, 300);
            }
        });
    }
}

window.syncCheckbox = function(source) {
    const matchingCheckboxes = document.querySelectorAll(`.row-checkbox[value="${source.value}"]`);
    matchingCheckboxes.forEach(cb => cb.checked = source.checked);
};

function toggleSelectAll(source) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBatchPrintBtn();
}

function updateBatchPrintBtn() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    const uniqueChecked = new Set(Array.from(checkedBoxes).map(cb => cb.value));
    const checkedCount = uniqueChecked.size;
    
    const allBoxes = document.querySelectorAll('.row-checkbox');
    const uniqueAll = new Set(Array.from(allBoxes).map(cb => cb.value));
    const totalCount = uniqueAll.size;
    
    const btnPrintDropdown = document.getElementById('btnBatchPrintDropdown');
    const selectAllCb = document.getElementById('selectAllCheckbox');
    const actionWrapper = document.getElementById('actionWrapper');
    
    if(checkedCount > 0) {
        if(btnPrintDropdown) { btnPrintDropdown.classList.remove('d-none'); document.getElementById('selectedCount').innerText = checkedCount; }
        
        if(actionWrapper) { 
            actionWrapper.classList.remove('d-none', 'd-md-flex'); 
            actionWrapper.classList.add('d-flex'); 
        }
    } else {
        if(btnPrintDropdown) btnPrintDropdown.classList.add('d-none');
        
        if(actionWrapper) { 
            actionWrapper.classList.remove('d-flex'); 
            actionWrapper.classList.add('d-none', 'd-md-flex'); 
        }
    }
    
    if(selectAllCb) selectAllCb.checked = (checkedCount === totalCount && totalCount > 0);
}

window.bulkReceiveTags = async function() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkedBoxes.length === 0) {
        Swal.fire('แจ้งเตือน', 'กรุณาติ๊กเลือกรายการที่ต้องการรับเข้า', 'warning');
        return;
    }

    let serialsSet = new Set();
    let hasNonPending = false; 

    checkedBoxes.forEach(cb => {
        let tag = JSON.parse(decodeURIComponent(cb.value));
        if (tag.status !== 'PENDING') {
            hasNonPending = true;
        }
        serialsSet.add(tag.serial_no);
    });

    if (hasNonPending) {
        Swal.fire('คำเตือน', 'คุณเลือกรายการที่รับเข้าสต็อกไปแล้ว หรือไม่สามารถรับเข้าได้ กรุณาเลือกเฉพาะสถานะ "รอรับเข้า"', 'warning');
        return;
    }

    let serials = Array.from(serialsSet);
    let locOptions = {};
    let defaultStoreId = '';

    try {
        Swal.fire({ title: 'กำลังโหลดข้อมูลคลัง...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await fetchAPI('get_master_data', 'GET');
        Swal.close();
        
        if (res && res.data && res.data.locations) {
            res.data.locations.forEach(loc => {
                locOptions[loc.location_id] = loc.location_name;

                if (!defaultStoreId) {
                    const type = (loc.location_type || '').toUpperCase();
                    const name = (loc.location_name || '').toUpperCase();
                    if (type === 'STORE' || name.includes('STORE') || name.includes('RM')) {
                        defaultStoreId = loc.location_id;
                    }
                }
            });
        }
    } catch(e) {
        console.error(e);
        Swal.fire('Error', 'ไม่สามารถโหลดรายชื่อคลังได้', 'error');
        return;
    }

    const { value: locationId } = await Swal.fire({
        title: `รับเข้าสต็อก ${serials.length} พาเลท/กล่อง`,
        text: "กรุณาเลือกคลังปลายทางที่ของจะไปวาง:",
        icon: 'question',
        input: 'select',
        inputOptions: locOptions,
        inputValue: defaultStoreId,
        inputPlaceholder: '-- เลือกคลังปลายทาง --',
        showCancelButton: true,
        confirmButtonColor: 'var(--bs-success)',
        confirmButtonText: '<i class="fas fa-download"></i> ยืนยันรับเข้า',
        cancelButtonText: 'ยกเลิก',
        inputValidator: (value) => {
            if (!value) return 'คุณต้องเลือกคลังปลายทางก่อนยืนยัน!';
        }
    });

    if (locationId) {
        Swal.fire({
            title: 'กำลังรับเข้าสต็อก...',
            text: 'กรุณารอสักครู่ ระบบกำลังอัปเดตยอดคงเหลือ',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const formData = new FormData();
        formData.append('serials', JSON.stringify(serials));
        formData.append('location_id', locationId);

        try {
            const result = await fetchAPI('bulk_receive_tags', 'POST', formData);
            if (result) {
                Swal.fire('สำเร็จ!', result.message, 'success');
                document.getElementById('selectAllCheckbox').checked = false;
                updateBatchPrintBtn(); 
                loadHistory(); 
            }
        } catch(e) {
            console.error(e);
        }
    }
};

window.groupToMasterPallet = async function() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkedBoxes.length === 0) return;
    
    let serialsSet = new Set();
    checkedBoxes.forEach(cb => { 
        let rowData = JSON.parse(decodeURIComponent(cb.value));
        serialsSet.add(rowData.serial_no); 
    });
    let serials = Array.from(serialsSet);

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
                if(typeof renderMasterPalletTag === 'function') renderMasterPalletTag(res.data);
                loadHistory();
                Swal.fire({ title: 'สำเร็จ!', text: 'จัดกลุ่มพาเลทเรียบร้อย', icon: 'success', timer: 1500, showConfirmButton: false });
            }
        }
    });
};

window.printSingleTag = async function(encodedRow) {
    const tag = JSON.parse(decodeURIComponent(encodedRow));
    if(typeof renderPrintTags === 'function') renderPrintTags([tag]);
    await logPrintStatus([tag.serial_no]);
    loadHistory(); 
}

window.printSelectedTags = async function() {
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkedBoxes.length === 0) return;
    
    let tagsMap = new Map();
    checkedBoxes.forEach(cb => { 
        let tag = JSON.parse(decodeURIComponent(cb.value));
        tagsMap.set(tag.serial_no, tag);
    });
    
    let tagsToPrint = Array.from(tagsMap.values());
    let serialsToLog = Array.from(tagsMap.keys());
    
    if(typeof renderPrintTags === 'function') renderPrintTags(tagsToPrint);
    await logPrintStatus(serialsToLog);
    loadHistory();
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
    const checkedBoxes = document.querySelectorAll('.row-checkbox:checked');
    if(checkedBoxes.length === 0) return;
    
    let serialsSet = new Set();
    checkedBoxes.forEach(cb => {
        let tag = JSON.parse(decodeURIComponent(cb.value));
        serialsSet.add(tag.serial_no);
    });
    let serials = Array.from(serialsSet);
    
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
                document.getElementById('selectAllCheckbox').checked = false;
                updateBatchPrintBtn();
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
                <input class="form-control form-control-sm mb-3 bg-light" value="${escapeHTML(row.serial_no)}" readonly>
                <div class="row g-2 mb-2">
                    <div class="col-sm-6"><label class="form-label fw-bold mb-1 text-primary">PO Number</label><input id="swal-edit-po" class="form-control form-control-sm" value="${escapeHTML(row.po_number || '')}"></div>
                    <div class="col-sm-6"><label class="form-label fw-bold mb-1 text-primary">Invoice No.</label><input id="swal-edit-inv" class="form-control form-control-sm" value="${escapeHTML(row.warehouse_no || '')}"></div>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">Pallet No.</label><input id="swal-edit-pallet" class="form-control form-control-sm" value="${escapeHTML(row.pallet_no || '')}"></div>
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">CTN No.</label><input id="swal-edit-ctn" class="form-control form-control-sm" value="${escapeHTML(row.ctn_number || '')}"></div>
                    <div class="col-sm-4"><label class="form-label fw-bold mb-1 text-primary">Week</label><input id="swal-edit-week" class="form-control form-control-sm" value="${escapeHTML(row.week_no || '')}"></div>
                </div>
                <label class="form-label fw-bold mb-1 text-primary">Remark</label>
                <textarea id="swal-edit-remark" class="form-control form-control-sm" rows="2">${escapeHTML(row.remark || '')}</textarea>
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

function toggleMobileCards() {
    const container = document.getElementById('kpiContainer');
    const btn = document.getElementById('btnToggleCards');
    const icon = btn.querySelector('i');
    
    if (container.classList.contains('d-none')) {
        container.classList.remove('d-none');
        btn.classList.remove('btn-primary', 'text-white');
        btn.classList.add('btn-outline-primary');
        icon.className = 'fas fa-eye-slash';
    } else {
        container.classList.add('d-none');
        btn.classList.remove('btn-outline-primary');
        btn.classList.add('btn-primary', 'text-white');
        icon.className = 'fas fa-eye';
    }
}