"use strict";
let allLocations = [];
let selectedItem = null; 
let searchTimeout = null;

const TRANSFER_API_URL = 'api/transferManage.php';
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            url += `&${new URLSearchParams(params).toString()}`;
        }
        
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const options = { 
            method: method, 
            headers: {} 
        };
        
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'HTTP error occurred');
        }
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        if (typeof showToast === 'function') {
            showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        } else {
            alert(error.message || 'An unexpected error occurred.');
        }
        return { success: false, message: error.message };
    }
}

function setupAjaxAutocomplete() {
    const searchInput = document.getElementById('item_search');
    const resultsWrapper = document.getElementById('item_search-results');
    
    if (!searchInput || !resultsWrapper) return;
    
    searchInput.addEventListener('input', () => {
        const value = searchInput.value.trim();
        clearTimeout(searchTimeout);
        
        if (value.length < 2) {
            resultsWrapper.innerHTML = '';
            resultsWrapper.style.display = 'none';
            selectedItem = null; 
            document.getElementById('item_id').value = '';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            const res = await sendRequest(TRANSFER_API_URL, 'search_items', 'GET', null, { q: value });
            resultsWrapper.innerHTML = '';
            
            if (res.success && res.data.length > 0) {
                res.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerHTML = `<strong class="text-primary">${item.sap_no}</strong> | ${item.part_no} <br><small class="text-muted">${item.part_description || ''}</small>`;
                    
                    div.addEventListener('click', () => {
                        searchInput.value = `${item.sap_no} | ${item.part_no}`;
                        selectedItem = item; 
                        document.getElementById('item_id').value = item.item_id;
                        resultsWrapper.style.display = 'none';
                    });
                    resultsWrapper.appendChild(div);
                });
                resultsWrapper.style.display = 'block';
            } else {
                resultsWrapper.innerHTML = '<div class="autocomplete-item text-muted text-center">ไม่พบข้อมูล</div>';
                resultsWrapper.style.display = 'block';
            }
        }, 400);
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

async function populateInitialData() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
    if (result.success) {
        allLocations = result.locations || [];
        const opts = allLocations.map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');
        
        const fromLocationSelect = document.getElementById('from_location_id');
        if (fromLocationSelect) {
            fromLocationSelect.innerHTML = '<option value="" disabled selected>-- เลือกคลังต้นทาง --</option>' + opts;
        }
    }
}

let historyCurrentPage = 1;
let historyTotalPages = 1;
let historySearchTimer = null;

document.getElementById('historySearch')?.addEventListener('input', () => {
    clearTimeout(historySearchTimer);
    historySearchTimer = setTimeout(() => {
        loadLabelHistory(1);
    }, 500);
});

async function loadLabelHistory(page = historyCurrentPage) {
    const tbody = document.getElementById('labelHistoryBody');
    const btnRefresh = document.getElementById('btnRefreshHistory');
    const searchVal = document.getElementById('historySearch')?.value.trim() || '';
    const statusVal = document.getElementById('historyStatusFilter')?.value || 'ACTIVE'; 
    
    if (!tbody) return;
    if (btnRefresh) {
        btnRefresh.disabled = true;
        btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    try {
        const params = { page: page, limit: 100, search: searchVal, status: statusVal };
        const res = await sendRequest(TRANSFER_API_URL, 'get_label_history', 'GET', null, params);
        
        tbody.innerHTML = '';

        if (res.success && res.data.length > 0) {
            historyCurrentPage = parseInt(res.page);
            historyTotalPages = parseInt(res.total_pages);
            
            document.getElementById('historyPageInfo').innerText = `หน้า ${historyCurrentPage} / ${historyTotalPages} (รวม ${res.total} รายการ)`;
            document.getElementById('btnPrevPage').disabled = (historyCurrentPage <= 1);
            document.getElementById('btnNextPage').disabled = (historyCurrentPage >= historyTotalPages);

            if (page === 1 && searchVal === '') {
                document.getElementById('kpi_total').innerText = res.total;
                let pendingCount = 0; let completedCount = 0;
                res.data.forEach(r => {
                    if(r.status === 'PENDING') pendingCount++;
                    if(r.status === 'COMPLETED') completedCount++;
                });
                document.getElementById('kpi_pending').innerText = pendingCount + (res.total > 100 ? '+' : '');
                document.getElementById('kpi_completed').innerText = completedCount + (res.total > 100 ? '+' : '');
            }

            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) selectAllCheckbox.checked = false;
            updateBatchPrintBtn();

            res.data.forEach(row => {
                const safeUuid = escapeHTML(row.transfer_uuid);
                const mfgDate = row.prod_date ? escapeHTML(row.prod_date) : '-';
                const printTime = row.created_at ? escapeHTML(row.created_at.substring(0, 16)) : '-';
                const displayTimeHTML = `
                    <div class="text-nowrap">
                        <strong class="text-dark"><i class="far fa-calendar-alt text-secondary me-1"></i>${mfgDate}</strong><br>
                        <small class="text-muted" style="font-size: 0.7rem;" title="เวลาที่พิมพ์ Tag">พิมพ์: ${printTime}</small>
                    </div>
                `;

                let badgeClass = row.status === 'PENDING' ? 'bg-warning text-dark' : (row.status === 'COMPLETED' ? 'bg-success' : 'bg-danger');
                const statusBadge = `<span class="badge ${badgeClass}">${row.status}</span>`;
                
                let actionBtns = '';
                if (row.status === 'PENDING') {
                    actionBtns = `
                        <button type="button" class="btn btn-sm btn-warning py-0 px-2 text-dark" onclick="editLabel('${safeUuid}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button type="button" class="btn btn-sm btn-primary py-0 px-2 ms-1" onclick="reprintLabel('${row.transfer_uuid}')" title="Reprint"><i class="fas fa-print"></i></button>
                        <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 ms-1" onclick="cancelLabel('${row.transfer_uuid}')" title="Cancel"><i class="fas fa-times"></i></button>
                    `;
                }

                const checkboxHtml = `<input class="form-check-input row-checkbox" type="checkbox" value="${safeUuid}" onchange="updateBatchPrintBtn()" style="cursor:pointer; transform:scale(1.2);">`;
                const itemDisplay = `
                    <div class="text-truncate" style="max-width: 250px;" title="${escapeHTML(row.part_description || '')}">
                        <strong class="text-dark">${escapeHTML(row.sap_no)}</strong><br>
                        <span class="text-muted" style="font-size: 0.75rem;">
                            ${escapeHTML(row.part_no || '')} <span class="mx-1">|</span> ${escapeHTML(row.part_description || '-')}
                        </span>
                    </div>
                `;

                tbody.innerHTML += `
                    <tr class="align-middle">
                        <td class="text-center px-2">${checkboxHtml}</td>
                        <td class="px-2">${displayTimeHTML}</td>
                        <td class="fw-bold text-primary">${safeUuid}</td>
                        <td>${itemDisplay}</td>
                        <td class="text-end fw-bold fs-6">${Math.floor(row.quantity)}</td>
                        <td class="text-center">${statusBadge}</td>
                        <td class="text-center px-3">${actionBtns}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4"><i class="fas fa-box-open fa-3x mb-3 opacity-25"></i><br>ไม่พบข้อมูล</td></tr>';
            document.getElementById('historyPageInfo').innerText = `หน้า 1 / 1 (รวม 0 รายการ)`;
            document.getElementById('btnPrevPage').disabled = true;
            document.getElementById('btnNextPage').disabled = true;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-4"><i class="fas fa-exclamation-triangle me-2"></i>โหลดประวัติล้มเหลว: ${escapeHTML(err.message)}</td></tr>`;
    } finally {
        if (btnRefresh) {
            btnRefresh.disabled = false;
            btnRefresh.innerHTML = '<i class="fas fa-sync-alt"></i>';
        }
    }
}

function changeHistoryPage(step) {
    const newPage = historyCurrentPage + step;
    if (newPage >= 1 && newPage <= historyTotalPages) {
        loadLabelHistory(newPage);
    }
}

async function cancelLabel(uuid) {
    const confirmDelete = await Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        html: `คุณต้องการยกเลิก Label: <b class="text-danger">${uuid}</b> ใช่หรือไม่?<br><br><small class="text-muted">หากนี่คือเลขล่าสุด ระบบจะนำเลขนี้กลับมารันใหม่ให้อัตโนมัติ</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่, ยกเลิกเลย',
        cancelButtonText: 'ปิด'
    });

    if (confirmDelete.isConfirmed) {
        const res = await sendRequest(TRANSFER_API_URL, 'cancel_label', 'POST', { transfer_uuid: uuid });
        if (res.success) {
            if (typeof showToast === 'function') showToast(res.message, 'var(--bs-success)');
            loadLabelHistory();
        }
    }
}

function toggleBcRange() {
    const isChecked = document.getElementById('bc_is_range').checked;
    const rangeDiv = document.getElementById('bc_range_div');
    if (isChecked) {
        rangeDiv.classList.remove('d-none');
    } else {
        rangeDiv.classList.add('d-none');
        document.getElementById('bc_start_no').value = '';
        document.getElementById('bc_end_no').value = '';
    }
}

async function executeAdvancedBulkCancel() {
    const lotNo = document.getElementById('bc_lot_no').value.trim().toUpperCase();
    const isRange = document.getElementById('bc_is_range').checked;
    const startNo = document.getElementById('bc_start_no').value;
    const endNo = document.getElementById('bc_end_no').value;

    if (!lotNo) {
        if (typeof showToast === 'function') showToast("กรุณาระบุเลข Lot", 'var(--bs-warning)');
        else alert("กรุณาระบุเลข Lot");
        return;
    }

    let confirmMsg = `คุณต้องการยกเลิก PENDING สติ๊กเกอร์ทั้งหมดของ Lot: ${lotNo} ใช่หรือไม่?`;
    if (isRange) {
        if (!startNo || !endNo || parseInt(startNo) > parseInt(endNo)) {
            if (typeof showToast === 'function') showToast("ระบุช่วงตัวเลขให้ถูกต้อง", 'var(--bs-warning)');
            else alert("ระบุช่วงตัวเลขให้ถูกต้อง");
            return;
        }
        confirmMsg = `คุณต้องการยกเลิก Lot: ${lotNo}\nเฉพาะดวงที่ ${startNo} ถึงดวงที่ ${endNo} ใช่หรือไม่?`;
    }

    if (!confirm(confirmMsg)) return;

    const btn = document.getElementById('btnConfirmBulkCancel');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...';

    try {
        const payload = {
            lot_no: lotNo,
            is_range: isRange,
            start_no: startNo,
            end_no: endNo
        };

        const res = await sendRequest(TRANSFER_API_URL, 'cancel_batch_labels', 'POST', payload);
        
        if (res.success) {
            const modalEl = document.getElementById('bulkCancelModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            if (typeof Swal !== 'undefined') Swal.fire('สำเร็จ!', res.message, 'success');
            else alert(res.message);
            
            const searchInput = document.getElementById('historySearch');
            if(searchInput) searchInput.value = lotNo;
            
            document.getElementById('bc_lot_no').value = '';
            document.getElementById('bc_is_range').checked = false;
            toggleBcRange();

            loadLabelHistory(1);
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

async function openBulkEditMode() {
    const { value: formValues } = await Swal.fire({
        title: 'แก้ไขแบบกลุ่ม (Bulk Edit)',
        html: `
            <div class="mb-3 text-start">
                <label class="form-label fw-bold">เลข Lot / Master Pallet <span class="text-danger">*</span></label>
                <input id="swal-lot" class="form-control text-uppercase fw-bold" placeholder="เช่น L-202604">
            </div>
            <div class="form-check form-switch text-start mb-2">
                <input class="form-check-input" type="checkbox" id="swal-is-range" onchange="document.getElementById('swal-range-div').classList.toggle('d-none')">
                <label class="form-check-label fw-bold text-dark">ระบุช่วงเลขรัน (แก้เฉพาะบางดวง)</label>
            </div>
            <div id="swal-range-div" class="row g-2 d-none text-start bg-light p-2 rounded border">
                <div class="col-6">
                    <label class="form-label small fw-bold">ตั้งแต่ดวงที่</label>
                    <input type="number" id="swal-start" class="form-control text-center text-primary fw-bold" min="1" placeholder="เช่น 1">
                </div>
                <div class="col-6">
                    <label class="form-label small fw-bold">ถึงดวงที่</label>
                    <input type="number" id="swal-end" class="form-control text-center text-primary fw-bold" min="1" placeholder="เช่น 50">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'ดึงข้อมูลมาแก้ไข',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const lot = document.getElementById('swal-lot').value.trim().toUpperCase();
            const isRange = document.getElementById('swal-is-range').checked;
            const start = document.getElementById('swal-start').value;
            const end = document.getElementById('swal-end').value;
            
            if (!lot) {
                Swal.showValidationMessage('กรุณาระบุเลข Lot!');
                return false;
            }
            if (isRange && (!start || !end || parseInt(start) > parseInt(end))) {
                Swal.showValidationMessage('กรุณาระบุช่วงตัวเลขให้ถูกต้อง!');
                return false;
            }
            return { lot, isRange, start, end };
        }
    });

    if (formValues) {
        const previewSerial = formValues.isRange ? `${formValues.lot}-${formValues.start}` : `${formValues.lot}-1`;
        
        const res = await sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: previewSerial });
        
        if (res.success && res.data) {
            const data = res.data;
            document.getElementById('from_location_id').value = data.from_location_id;
            
            selectedItem = { item_id: data.item_id, sap_no: data.sap_no, part_no: data.part_no, part_description: data.part_description };
            document.getElementById('item_id').value = data.item_id;
            document.getElementById('item_search').value = `${data.sap_no} | ${data.part_no}`;
            
            document.getElementById('lot_no').value = formValues.lot;
            document.getElementById('lot_no').disabled = true; 
            document.getElementById('notes').value = data.notes || '';
            document.getElementById('quantity').value = Math.floor(data.quantity);
            if (data.prod_date) document.getElementById('prod_date').value = data.prod_date;

            const pc = document.getElementById('print_count');
            pc.value = 1;
            pc.disabled = true;

            document.getElementById('edit_transfer_uuid').value = 'BULK-' + JSON.stringify(formValues);
            
            document.getElementById('cancel-edit-btn').classList.remove('d-none');
            const btn = document.getElementById('generate-label-btn');
            btn.classList.replace('btn-primary', 'btn-warning');
            btn.classList.replace('text-white', 'text-dark');
            
            let btnText = formValues.isRange ? `บันทึกการแก้ไข (ดวงที่ ${formValues.start} ถึง ${formValues.end})` : `บันทึกการแก้ไข (ทั้ง Lot)`;
            btn.innerHTML = `<i class="fas fa-save me-2"></i> ${btnText}`;
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (typeof showToast === 'function') showToast('ดึงข้อมูลสำเร็จ กรุณาแก้ไขและกดบันทึก', 'var(--bs-info)');
        } else {
            Swal.fire('ไม่พบข้อมูล', `ไม่สามารถดึงข้อมูล ${previewSerial} ได้ อาจจะถูกลบหรือรับเข้าคลังไปแล้ว`, 'error');
        }
    }
}

async function reprintLabel(uuid) {
    const res = await sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: uuid });
    if (res.success && res.data) {
        const data = res.data;
        const baseUrl = window.location.href.replace('label_printer.php', 'mobile_app.php');
        
        let parts = uuid.split('-');
        let serial = parts.pop();
        let manualLot = parts.join('-');

        const labelData = {
            sap_no: data.sap_no, 
            part_no: data.part_no, 
            description: data.part_description || '',
            quantity: Math.floor(data.quantity), 
            manual_lot: manualLot, 
            serial_no: serial,
            location_name: data.from_location_name || '', 
            prod_date: data.prod_date || "-",
            remark: data.notes || '',
            scan_id_display: data.transfer_uuid, 
            qr_url: `${baseUrl}?type=receipt&transfer_id=${data.transfer_uuid}`
        };

        executeHiddenPrint([labelData]);
    }
}

function toggleAllCheckboxes() {
    const selectAll = document.getElementById('selectAllCheckbox');
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBatchPrintBtn();
}

function updateBatchPrintBtn() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    const btn = document.getElementById('btnBatchPrint');
    const countSpan = document.getElementById('batchPrintCount');
    
    if (checkboxes.length > 0) {
        btn.classList.remove('d-none');
        countSpan.innerText = checkboxes.length;
    } else {
        btn.classList.add('d-none');
        countSpan.innerText = '0';
    }
}

async function reprintSelectedLabels() {
    const checkboxes = document.querySelectorAll('.row-checkbox:checked');
    if (checkboxes.length === 0) return;

    const uuids = Array.from(checkboxes).map(cb => cb.value);
    const confirmPrint = await Swal.fire({
        title: 'ยืนยันการพิมพ์ซ้ำ?',
        text: `คุณกำลังสั่งพิมพ์สติ๊กเกอร์ที่เลือกจำนวน ${uuids.length} ดวง`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-print me-1"></i> ใช่, พิมพ์เลย',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmPrint.isConfirmed) return;

    const btn = document.getElementById('btnBatchPrint');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังพิมพ์...';

    try {
        await processAndPrintUUIDs(uuids); 
        
        const selectAll = document.getElementById('selectAllCheckbox');
        if(selectAll) selectAll.checked = false;
        toggleAllCheckboxes();
    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'var(--bs-danger)');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

async function executeAdvancedBulkPrint() {
    const lotNo = document.getElementById('bp_lot_no').value.trim().toUpperCase();
    const startNo = parseInt(document.getElementById('bp_start_no').value);
    const endNo = parseInt(document.getElementById('bp_end_no').value);

    if (!lotNo || isNaN(startNo) || isNaN(endNo) || startNo > endNo) {
        Swal.fire({
            title: 'ข้อมูลไม่ถูกต้อง',
            text: 'กรุณาระบุเลข Lot และช่วงตัวเลขเริ่มต้น-สิ้นสุดให้ถูกต้อง',
            icon: 'warning',
            confirmButtonColor: '#f39c12'
        });
        return;
    }

    const totalToPrint = (endNo - startNo) + 1;
    if (totalToPrint > 500) {
        Swal.fire({
            title: 'เกินจำนวนสูงสุด!',
            html: `ระบบอนุญาตให้พิมพ์สูงสุด <b>500 ดวงต่อครั้ง</b> เพื่อป้องกันเบราว์เซอร์ค้าง<br><br>แต่คุณระบุช่วงมาทั้งหมด <b class="text-danger">${totalToPrint} ดวง</b>`,
            icon: 'error',
            confirmButtonColor: '#d33'
        });
        return;
    }

    const confirmPrint = await Swal.fire({
        title: 'ยืนยันการพิมพ์กลุ่ม?',
        html: `คุณกำลังสั่งพิมพ์ Lot: <b class="text-primary">${lotNo}</b><br>ตั้งแต่ดวงที่ <b>${startNo}</b> ถึง <b>${endNo}</b><br><br>รวมทั้งหมด <b class="text-success">${totalToPrint} ดวง</b>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#0d6efd',
        cancelButtonColor: '#6c757d',
        confirmButtonText: '<i class="fas fa-print me-1"></i> ยืนยันคำสั่งพิมพ์',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirmPrint.isConfirmed) return;

    const btn = document.getElementById('btnConfirmBulkPrint');
    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>กำลังดึงข้อมูล...';

    try {
        const uuids = [];
        for (let i = startNo; i <= endNo; i++) {
            let padLength = Math.max(3, String(i).length);
            let serialSuffix = String(i).padStart(padLength, '0');
            uuids.push(`${lotNo}-${serialSuffix}`);
        }

        await processAndPrintUUIDs(uuids); 

        const modalEl = document.getElementById('bulkPrintModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
        
        document.getElementById('bp_start_no').value = '';
        document.getElementById('bp_end_no').value = '';

    } catch (error) {
        if (typeof showToast === 'function') showToast(error.message, 'var(--bs-danger)');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origHtml;
    }
}

async function processAndPrintUUIDs(uuids) {
    if (!uuids || uuids.length === 0) return;
    if (typeof showSpinner === 'function') showSpinner();

    try {
        const labelsToPrint = [];
        const baseUrl = window.location.href.replace('label_printer.php', 'mobile_app.php');
        const fetchPromises = uuids.map(uuid => sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: uuid }));
        const results = await Promise.allSettled(fetchPromises);
        let notFoundCount = 0;

        results.forEach((res) => {
            if (res.status === 'fulfilled' && res.value.success && res.value.data) {
                const data = res.value.data;
                let parts = data.transfer_uuid.split('-');
                let serial = parts.pop();
                let manualLot = parts.join('-');

                labelsToPrint.push({
                    sap_no: data.sap_no, 
                    part_no: data.part_no, 
                    description: data.part_description || '',
                    quantity: Math.floor(data.quantity), 
                    manual_lot: manualLot, 
                    serial_no: serial,
                    location_name: data.from_location_name || '', 
                    prod_date: data.prod_date || "-",
                    remark: data.notes || '',
                    scan_id_display: data.transfer_uuid, 
                    qr_url: `${baseUrl}?type=receipt&transfer_id=${data.transfer_uuid}`
                });
            } else {
                notFoundCount++;
            }
        });

        if (labelsToPrint.length > 0) {
            executeHiddenPrint(labelsToPrint); 
            if (notFoundCount > 0) {
                if (typeof showToast === 'function') showToast(`พิมพ์สำเร็จ ${labelsToPrint.length} ดวง (ข้ามใบที่ถูกลบ/หาไม่เจอ ${notFoundCount} ดวง)`, 'var(--bs-warning)');
            }
        } else {
            throw new Error('ไม่สามารถดึงข้อมูลเพื่อพิมพ์ได้ (อาจถูกลบไปแล้วทั้งหมด)');
        }
    } finally {
        if (typeof hideSpinner === 'function') hideSpinner();
    }
}

async function handleGenerateLabel(event) {
    event.preventDefault();
    
    const fromLocationId = document.getElementById('from_location_id').value;
    const qty = Math.floor(document.getElementById('quantity').value);
    const printCount = document.getElementById('print_count').value;
    const manualLot = document.getElementById('lot_no').value.trim().toUpperCase();
    const prodDate = document.getElementById('prod_date').value;
    const remark = document.getElementById('notes').value.trim();
    const editInput = document.getElementById('edit_transfer_uuid');
    const editUuid = editInput ? editInput.value : '';

    if (!selectedItem || !fromLocationId) { 
        if (typeof showToast === 'function') showToast("กรุณาเลือก Item และคลังต้นทางให้ครบถ้วน", 'var(--bs-danger)');
        return; 
    }
    
    if (printCount > 500) { 
        if (typeof showToast === 'function') showToast("เพื่อป้องกันเบราว์เซอร์ค้าง อนุญาตให้ปริ้นสูงสุด 500 ดวงต่อครั้ง", 'var(--bs-warning)');
        return; 
    }

    const btn = document.getElementById('generate-label-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังประมวลผล...';
    
    if (typeof showSpinner === 'function') showSpinner();

    try {
        if (editUuid) {
            if (editUuid.startsWith('BULK-')) {
                const settingsStr = editUuid.replace('BULK-', '');
                const settings = JSON.parse(settingsStr);
                
                const payload = {
                    lot_no: settings.lot,
                    is_range: settings.isRange,
                    start_no: settings.start,
                    end_no: settings.end,
                    item_id: selectedItem.item_id,
                    quantity: qty,
                    from_loc_id: fromLocationId,
                    prod_date: prodDate,
                    notes: remark
                };
                
                const res = await sendRequest(TRANSFER_API_URL, 'update_batch_labels', 'POST', payload);
                if (res.success) {
                    Swal.fire('สำเร็จ', res.message, 'success');
                    clearPrinterForm();
                    loadLabelHistory(1);
                } else {
                    if (typeof showToast === 'function') showToast(res.message, 'var(--bs-danger)');
                }
            } else {
                const payload = {
                    transfer_uuid: editUuid,
                    item_id: selectedItem.item_id,
                    quantity: qty,
                    from_loc_id: fromLocationId,
                    prod_date: prodDate,
                    notes: remark
                };
                const res = await sendRequest(TRANSFER_API_URL, 'update_label', 'POST', payload);
                if (res.success) {
                    if (typeof showToast === 'function') showToast('อัปเดตข้อมูลสำเร็จ', 'var(--bs-success)');
                    reprintLabel(editUuid); 
                    clearPrinterForm();
                    loadLabelHistory(1);
                } else {
                    if (typeof showToast === 'function') showToast(res.message, 'var(--bs-danger)');
                }
            }
        } else {
            let dummyToLocId = 1;
            if (allLocations && allLocations.length > 0) {
                const fallbackLoc = allLocations.find(loc => loc.location_id != fromLocationId);
                dummyToLocId = fallbackLoc ? fallbackLoc.location_id : allLocations[0].location_id;
            }

            const payload = {
                parent_lot: manualLot, 
                print_count: printCount, 
                item_id: selectedItem.item_id,
                quantity: qty, 
                from_loc_id: fromLocationId, 
                to_loc_id: dummyToLocId,
                prod_date: prodDate,
                notes: remark
            };
            
            const res = await sendRequest(TRANSFER_API_URL, 'create_batch_transfer_orders', 'POST', payload);
            
            if (res.success) {
                const baseUrl = window.location.href.replace('label_printer.php', 'mobile_app.php');
                const locObj = allLocations.find(l => l.location_id == fromLocationId);
                const locName = locObj ? locObj.location_name : '';

                const labelsToPrint = res.labels.map(l => ({
                    sap_no: selectedItem.sap_no, 
                    part_no: selectedItem.part_no, 
                    description: selectedItem.part_description || '',
                    quantity: qty, 
                    manual_lot: manualLot, 
                    serial_no: l.serial_no, 
                    location_name: locName,
                    prod_date: prodDate, 
                    remark: remark,
                    scan_id_display: l.transfer_uuid, 
                    qr_url: `${baseUrl}?type=receipt&transfer_id=${l.transfer_uuid}`
                }));

                executeHiddenPrint(labelsToPrint);
                clearPrinterForm();
                loadLabelHistory(1);
            } else {
                if (typeof showToast === 'function') showToast(res.message, 'var(--bs-danger)');
            }
        }
    } catch (error) {
        console.error(error);
        if (typeof showToast === 'function') showToast('เกิดข้อผิดพลาดในการประมวลผล', 'var(--bs-danger)');
    } finally {
        if (typeof hideSpinner === 'function') hideSpinner();
        btn.disabled = false; 
        btn.innerHTML = originalText;
    }
}

async function editLabel(uuid) {
    const res = await sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: uuid });
    if (res.success && res.data) {
        const data = res.data;  
        let parts = uuid.split('-');
        parts.pop();
        let manualLot = parts.join('-');

        document.getElementById('edit_transfer_uuid').value = uuid;
        document.getElementById('from_location_id').value = data.from_location_id;
        
        selectedItem = { item_id: data.item_id, sap_no: data.sap_no, part_no: data.part_no, part_description: data.part_description };
        document.getElementById('item_id').value = data.item_id;
        document.getElementById('item_search').value = `${data.sap_no} | ${data.part_no}`;
        
        document.getElementById('lot_no').value = manualLot;
        document.getElementById('lot_no').disabled = true;
        
        document.getElementById('notes').value = data.notes || '';
        document.getElementById('quantity').value = Math.floor(data.quantity);

        if (data.prod_date) document.getElementById('prod_date').value = data.prod_date;
        
        const pc = document.getElementById('print_count');
        pc.value = 1;
        pc.disabled = true;

        document.getElementById('cancel-edit-btn').classList.remove('d-none');
        const btn = document.getElementById('generate-label-btn');
        btn.classList.replace('btn-primary', 'btn-warning');
        btn.classList.replace('text-white', 'text-dark');
        btn.innerHTML = '<i class="fas fa-save me-2"></i> บันทึกการแก้ไข';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function clearPrinterForm() {
    document.getElementById('label-generator-form').reset();
    selectedItem = null;
    document.getElementById('item_id').value = '';
    document.getElementById('prod_date').valueAsDate = new Date();
    document.getElementById('edit_transfer_uuid').value = '';
    document.getElementById('lot_no').disabled = false;
    document.getElementById('print_count').disabled = false;
    document.getElementById('cancel-edit-btn').classList.add('d-none');
    
    const btn = document.getElementById('generate-label-btn');
    btn.classList.replace('btn-warning', 'btn-primary');
    btn.classList.remove('text-dark');
    btn.innerHTML = '<i class="fas fa-print me-2"></i> สร้างและพิมพ์แท็ก';
    
    document.getElementById('item_search').focus();
}

function executeHiddenPrint(labelsArray) {
    const printArea = document.getElementById('printArea');
    if (!printArea) return;
    
    printArea.innerHTML = '';
    printArea.classList.remove('d-none');
    
    let renderHTML = '';

    labelsArray.forEach((d, i) => {
        let displayDesc = d.description || '';
        let safeSerial = d.serial_no ? String(d.serial_no).replace(/[^a-zA-Z0-9-]/g, '') : 'unknown';
        let uniqueQrId = `qr-${safeSerial}-${i}`;
        renderHTML += `
        <div class="tag-card" style="flex-direction: column; align-items: stretch; padding: 2mm;">
            <div style="display: flex; flex-direction: row; height: 70%; width: 100%; overflow: hidden;">
                <div class="tag-details" style="width: 75%; height: 100%;">
                    <div class="t-title">${escapeHTML(d.part_no)}</div>
                    <div class="t-sub">${escapeHTML(d.sap_no)}</div>
                    <div class="t-desc" title="${escapeHTML(displayDesc)}">${escapeHTML(displayDesc)}</div>
                    
                    <table class="t-table">
                        <tr>
                            <td style="width: 55%;">
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <b>QTY:</b> 
                                    <span class="t-hl">${parseFloat(d.quantity).toLocaleString()}</span>
                                </div>
                            </td>
                            <td style="width: 45%;">
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <b>Date:</b> 
                                    <span>${escapeHTML(d.prod_date)}</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding-right: 5px;">
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <b>Lot:</b> 
                                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:115px;">${escapeHTML(d.manual_lot)}</span>
                                </div>
                            </td>
                            <td>
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <b>Loc:</b> 
                                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:100px;">${escapeHTML(d.location_name)}</span>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="2">
                                <div style="display: flex; align-items: baseline; gap: 4px;">
                                    <b>Remark:</b> 
                                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:230px;" title="${escapeHTML(d.remark || '')}">${escapeHTML(d.remark || '-')}</span>
                                </div>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="tag-qr" style="width: 25%; height: 100%; justify-content: flex-start; padding-top: 5px;">
                    <div id="${uniqueQrId}"></div>
                </div>
            </div>
            <div style="height: 35%; width: 100%; display: flex; flex-direction: row; justify-content: space-between; align-items: center; overflow: hidden; padding-top: 5px; border-top: 1px dashed #ccc;">
                <div style="display: flex; flex-direction: column; align-items: center; width: 60%;">
                    <div style="font-size: 14px; font-weight: bold; letter-spacing: 1px;">${escapeHTML(d.scan_id_display)}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 40%;">
                    <div style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">แสกนเข้าระบบ Web</div>
                    <div id="qr2-${uniqueQrId}"></div>
                </div>
            </div>
        </div>
        `;
    });

    printArea.innerHTML = renderHTML;
    if (typeof QRCode !== 'undefined') {
        labelsArray.forEach((d, i) => {
            let safeSerial = d.serial_no ? String(d.serial_no).replace(/[^a-zA-Z0-9-]/g, '') : 'unknown';
            let uniqueQrId = `qr-${safeSerial}-${i}`;
            
            new QRCode(document.getElementById(uniqueQrId), {
                text: String(d.qr_url), 
                width: 75, 
                height: 75,
                colorDark : "#000000", 
                colorLight : "#ffffff", 
                correctLevel : QRCode.CorrectLevel.M 
            });
            
            // Create second QR code for Web Scanner (Low density)
            new QRCode(document.getElementById("qr2-" + uniqueQrId), {
                text: String(d.scan_id_display), 
                width: 60, 
                height: 60,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
            });
        });
    }
    setTimeout(() => {
        window.print();
        printArea.classList.add('d-none');
        printArea.innerHTML = ''; 
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('printer-container') || document.getElementById('label-generator-form')) {
        populateInitialData();
        setupAjaxAutocomplete();
        loadLabelHistory();
        
        const form = document.getElementById('label-generator-form');
        if (form) {
            form.addEventListener('submit', handleGenerateLabel);
        }
    }
});