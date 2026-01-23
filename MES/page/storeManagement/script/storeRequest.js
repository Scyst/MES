"use strict";

let allItems = [];
let debounceTimer;

document.addEventListener('DOMContentLoaded', async () => {
    await initData();
    
    // ตั้งค่า Default Status
    if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE) {
        const filterEl = document.getElementById('filterStatus');
        if (filterEl) filterEl.value = 'PENDING';
    }

    loadRequests();

    // Event Listener Search Box
    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
        filterSearch.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadRequests, 600); 
        });
    }
});

// --- LOAD REQUESTS (Parallel Mode) ---
// ฟังก์ชันนี้ถูกแก้ใหม่ ให้ยิง 2 API พร้อมกันเพื่อความเร็ว
async function loadRequests() {
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = document.getElementById('filterSearch')?.value.trim() || '';
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';

    // 1. เตรียม Params
    const params = new URLSearchParams({
        status: status,
        search: search,
        start_date: startDate,
        end_date: endDate
    });

    showSpinner(); // หมุนรอ

    // 2. Reset ตัวเลขสรุปให้เป็นขีด - รอไว้ก่อน
    const spinnerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';

    document.getElementById('sumCount').innerHTML = spinnerHTML;
    document.getElementById('sumQty').innerHTML   = spinnerHTML;
    document.getElementById('sumCost').innerHTML  = spinnerHTML;

    try {
        // 3. 🔥 ยิง API 2 ตัวพร้อมกัน (ไม่ต้องรอ)
        // ตัวที่ 1: เอาข้อมูลตาราง (action=get_requests)
        const promiseTable = fetch(`${API_URL}?action=get_requests&${params.toString()}`).then(r => r.json());
        
        // ตัวที่ 2: เอาตัวเลขสรุปเงิน (action=get_request_summary)
        const promiseSummary = fetch(`${API_URL}?action=get_request_summary&${params.toString()}`).then(r => r.json());

        // 4. รอให้ "ตาราง" มาก่อน (สำคัญสุด)
        const resTable = await promiseTable;
        
        // วาดตารางทันที!
        renderTableHTML(resTable.data);

        // ✅ ปิด Spinner ทันทีที่ตารางมา (User จะรู้สึกว่าเร็วมาก)
        hideSpinner();

        // 5. รอ "ยอดเงิน" ตามมาทีหลัง (User จะเห็นตัวเลขดีดขึ้นมาเอง)
        const resSum = await promiseSummary;
        if (resSum.success && resSum.summary) {
            const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const fmtMoney = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            document.getElementById('sumCount').innerText = fmt.format(resSum.summary.total_count);
            document.getElementById('sumQty').innerText = fmt.format(resSum.summary.total_qty);
            document.getElementById('sumCost').innerText = fmtMoney.format(resSum.summary.total_cost);
        }

    } catch (e) { 
        console.error(e);
        showToast('Error loading requests', 'var(--bs-danger)');
        hideSpinner(); // กันตาย กรณี Error ก็ต้องปิด Spinner
    }
}

function renderTableHTML(data) {
    const tbody = document.getElementById('reqTableBody');
    const cardCon = document.getElementById('reqCardContainer');
    
    // เตรียมตัวแปรเก็บ HTML ก้อนใหญ่ (Buffer)
    let tableRowsHTML = '';
    let mobileCardsHTML = '';

    if (data && data.length > 0) {
        const fmtNum = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        data.forEach(row => {
            // ... (Logic เตรียมตัวแปร reason, badgeClass, totalCost เหมือนเดิม) ...
            let reason = row.notes || '-';
            if (reason.includes('Reason: ')) reason = reason.split('Reason: ')[1];
            else if (reason.includes('Defect: ')) reason = reason.split('Defect: ')[1];
            else if (reason.includes('Replacement: ')) reason = reason.split('Replacement: ')[1];

            let badgeClass = '';
            let icon = '';
            if (row.status === 'PENDING') {
                badgeClass = 'bg-warning bg-opacity-50 text-dark border border-warning';
                icon = '<i class="fas fa-clock me-1"></i>';
            } else if (row.status === 'COMPLETED') {
                badgeClass = 'bg-success bg-opacity-50 text-dark border border-success';
                icon = '<i class="fas fa-check-circle me-1"></i>';
            } else if (row.status === 'REJECTED') {
                badgeClass = 'bg-danger bg-opacity-50 text-dark border border-danger';
                icon = '<i class="fas fa-times-circle me-1"></i>';
            }

            const statusBadge = `<span class="badge ${badgeClass} rounded-pill fw-normal text-dark px-2 py-1">${icon}${row.status}</span>`;
            const createdDate = row.created_at ? row.created_at.substring(0, 16) : '-';
            const requesterName = row.requester || '-';
            const unitCost = parseFloat(row.unit_cost || 0);
            const totalCost = parseFloat(row.quantity) * unitCost;

            let btnAction = '';
            if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE && row.status === 'PENDING') {
                btnAction = `
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-success rounded-circle me-1" style="width:32px;height:32px;" onclick="approveReq(${row.transfer_id})" title="อนุมัติ"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px;height:32px;" onclick="rejectReq(${row.transfer_id})" title="ปฏิเสธ"><i class="fas fa-times"></i></button>
                </div>`;
            }

            // --- A. สะสม HTML Table Row (อย่าเพิ่งยัดใส่ DOM) ---
            tableRowsHTML += `
                <tr>
                    <td class="text-secondary small text-nowrap">${createdDate}</td>
                    <td class="fw-bold text-primary">${row.sap_no}</td>
                    <td class="text-dark">${row.part_no}</td>
                    <td class="small text-secondary text-truncate" style="max-width: 150px;" title="${row.part_description || ''}">
                        ${row.part_description || '-'}
                    </td>
                    <td class="fw-bold text-center text-danger fs-6">
                        ${fmtNum.format(row.quantity)}
                    </td>
                    <td class="text-end small text-muted">
                        ${fmtNum.format(totalCost)}
                    </td>
                    <td class="small text-secondary text-truncate" style="max-width: 120px;" title="${reason}">
                        ${reason}
                    </td>
                    <td class="small text-secondary text-nowrap text-center">${requesterName}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">${btnAction}</td>
                </tr>`;

            // --- B. สะสม HTML Mobile Card ---
            mobileCardsHTML += `
                <div class="card req-card status-${row.status} border-0 shadow-sm mb-3">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="text-truncate pe-2">
                                <strong class="text-primary d-block" style="font-size: 1.1rem;">${row.sap_no}</strong>
                                <span class="small text-secondary">${row.part_no}</span>
                            </div>
                            <div class="flex-shrink-0 ms-2">${statusBadge}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3 p-2 rounded border bg-light">
                            <div class="small text-secondary text-truncate me-2" style="max-width: 60%;">
                                ${row.part_description || '-'}
                            </div>
                            <div class="text-end">
                                <div class="fw-bold fs-4 text-danger" style="line-height: 1;">
                                    ${fmtNum.format(row.quantity)}
                                </div>
                                <small class="text-muted" style="font-size: 0.7rem;">Est: ${fmtNum.format(totalCost)} ฿</small>
                            </div>
                        </div>
                        <div class="mb-2 small">
                            <span class="text-muted">Req:</span> <strong class="text-dark ms-1">${requesterName}</strong>
                        </div>
                        <div class="mb-3 small text-secondary text-truncate">
                            <span class="text-muted me-1">Note:</span> ${reason}
                        </div>
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                            <small class="text-muted">${createdDate}</small>
                            <div>${btnAction}</div>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        const empty = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-3x mb-3 opacity-25"></i><br>ไม่พบรายการในช่วงเวลานี้</div>';
        tableRowsHTML = `<tr><td colspan="10">${empty}</td></tr>`;
        mobileCardsHTML = empty;
    }

    // ✅ Perform DOM Update ONCE (ทำทีเดียวตอนจบ เร็วขึ้น 50-100 เท่า)
    if (tbody) tbody.innerHTML = tableRowsHTML;
    if (cardCon) cardCon.innerHTML = mobileCardsHTML;
}

function openRequestModal() {
    const form = document.getElementById('scrapForm');
    if (form) form.reset();
    
    document.getElementById('selected_item_id').value = '';
    document.getElementById('source_snc').checked = true;

    // Reset Submit Button State
    const submitBtn = form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.disabled = false;

    // Reset Store Select
    const storeContainer = document.getElementById('store_buttons_container');
    if(storeContainer) {
        const allBtns = storeContainer.querySelectorAll('.btn-custom-select');
        allBtns.forEach(b => b.classList.remove('active'));
        const firstBtn = storeContainer.querySelector('.btn-custom-select');
        if (firstBtn) firstBtn.click();
    }
    
    const listDiv = document.getElementById('autocomplete-list');
    if(listDiv) listDiv.style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('addRequestModal'));
    modal.show();
    
    setTimeout(() => {
        const searchInput = document.getElementById('item_search');
        if(searchInput) searchInput.focus();
    }, 500);
}

async function initData() {
    try {
        const res = await fetch(`${API_URL}?action=get_initial_data`).then(r => r.json());
        if (res.success) {
            allItems = res.items || [];
            const wipSelect = document.getElementById('wip_loc');
            
            const storeContainer = document.getElementById('store_buttons_container');
            const storeInput = document.getElementById('store_loc');

            if (wipSelect && storeContainer) {
                wipSelect.innerHTML = '<option value="">-- เลือก --</option>';
                storeContainer.innerHTML = '';

                res.locations.forEach(loc => {
                    if (loc.location_type === 'STORE' || loc.location_type === 'WAREHOUSE') {
                        
                        const btn = document.createElement('div');
                        btn.className = 'btn-custom-select'; 
                        btn.innerText = loc.location_name;
                        
                        btn.onclick = () => {
                            storeInput.value = loc.location_id;
                            
                            // ล้าง Active Class
                            const allBtns = storeContainer.querySelectorAll('.btn-custom-select');
                            allBtns.forEach(b => b.classList.remove('active'));
                            
                            // ใส่ Active Class
                            btn.classList.add('active');
                        };
                        storeContainer.appendChild(btn);
                    } else {
                        const opt = new Option(loc.location_name, loc.location_id);
                        wipSelect.add(opt);
                    }
                });
            }
        }
    } catch (e) { console.error(e); }
}

const searchInp = document.getElementById('item_search');
const listDiv = document.getElementById('autocomplete-list');

if (searchInp && listDiv) {
    searchInp.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        listDiv.innerHTML = '';
        document.getElementById('selected_item_id').value = '';
        
        // ถ้าไม่มีค่า ให้ซ่อนกล่อง
        if (!val) {
            listDiv.style.display = 'none';
            return;
        }

        const matches = allItems.filter(i =>
            (i.sap_no && i.sap_no.toLowerCase().includes(val)) ||
            (i.part_no && i.part_no.toLowerCase().includes(val)) ||
            (i.part_description && i.part_description.toLowerCase().includes(val))
        ).slice(0, 10);

        if (matches.length === 0) {
            listDiv.style.display = 'none'; // ไม่เจอให้ซ่อน
            return;
        }

        // เจอข้อมูล -> แสดงกล่อง
        listDiv.style.display = 'block';

        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item'; // ใช้คลาสที่เราตั้งใน CSS
            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="fw-bold text-dark">${item.sap_no}</span>
                    <span class="text-secondary small">${item.part_no}</span>
                </div>
                <div class="small text-muted text-truncate">${item.part_description || '-'}</div>
            `;
            div.onclick = () => {
                searchInp.value = `${item.sap_no} | ${item.part_no}`;
                document.getElementById('selected_item_id').value = item.item_id;
                listDiv.innerHTML = '';
                listDiv.style.display = 'none'; // เลือกเสร็จซ่อนทันที
            };
            listDiv.appendChild(div);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInp) {
            listDiv.style.display = 'none';
        }
    });
}

// --- Submit Request ---
async function submitRequest(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // 1. Double Submit Prevention
    if(submitBtn) submitBtn.disabled = true;

    if (!confirm('ยืนยันการแจ้งของเสียและขอเบิก?')) {
        if(submitBtn) submitBtn.disabled = false;
        return;
    }

    const sourceVal = document.querySelector('input[name="defect_source"]:checked').value;
    const itemId = document.getElementById('selected_item_id').value;
    const storeId = document.getElementById('store_loc').value;
    const qty = document.getElementById('qty').value;
    const reason = document.getElementById('reason').value;

    if (!itemId) {
        showToast('กรุณาเลือกชิ้นงานจากรายการที่ปรากฏ', 'var(--bs-warning)');
        if(submitBtn) submitBtn.disabled = false;
        return;
    }
    if (!storeId) {
        showToast('กรุณาเลือก Store ที่ต้องการเบิก', 'var(--bs-warning)');
        if(submitBtn) submitBtn.disabled = false;
        return;
    }

    const data = {
        item_id: itemId,
        wip_location_id: document.getElementById('wip_loc').value,
        store_location_id: storeId,
        quantity: qty,
        reason: reason,
        defect_source: sourceVal
    };

    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=create_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(r => r.json());

        if (res.success) {
            showToast('บันทึกสำเร็จ', 'var(--bs-success)');
            const modalEl = document.getElementById('addRequestModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
            loadRequests(); 
        } else {
            showToast(res.message, 'var(--bs-danger)');
            if(submitBtn) submitBtn.disabled = false; // Re-enable on error
        }
    } catch (err) {
        console.error(err);
        showToast('Connection Error', 'var(--bs-danger)');
        if(submitBtn) submitBtn.disabled = false;
    }
    hideSpinner();
}

window.approveReq = async (id) => {
    if (!confirm('ยืนยันการอนุมัติจ่ายของ?')) return;
    showSpinner();
    try {
        await fetch(`${API_URL}?action=approve_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transfer_id: id })
        });
    } catch (e) { console.error(e); }
    hideSpinner();
    loadRequests();
};

window.rejectReq = async (id) => {
    const r = prompt("ระบุเหตุผลที่ปฏิเสธ:");
    if (!r) return;
    showSpinner();
    try {
        await fetch(`${API_URL}?action=reject_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transfer_id: id, reject_reason: r })
        });
    } catch (e) { console.error(e); }
    hideSpinner();
    loadRequests();
};

function showSpinner() { document.getElementById('spinner')?.classList.remove('d-none'); }
function hideSpinner() { document.getElementById('spinner')?.classList.add('d-none'); }
function showToast(msg, color) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = msg;
        t.style.backgroundColor = color;
        t.style.display = 'block';
        setTimeout(() => t.style.display = 'none', 3000);
    }
}