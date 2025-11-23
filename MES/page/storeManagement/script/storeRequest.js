"use strict";

let allItems = [];

document.addEventListener('DOMContentLoaded', async () => {
    await initData();
    
    if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE) {
        const filterEl = document.getElementById('filterStatus');
        if (filterEl) filterEl.value = 'PENDING';
        loadRequests(); 
    } else {
        loadRequests();
    }

    // Event Listener Search Box
    const filterSearch = document.getElementById('filterSearch');
    if (filterSearch) {
        let debounceTimer;
        filterSearch.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(loadRequests, 500);
        });
    }
});

function openRequestModal() {
    const form = document.getElementById('scrapForm');
    if (form) form.reset();
    
    document.getElementById('selected_item_id').value = '';
    document.getElementById('source_snc').checked = true;

    const storeContainer = document.getElementById('store_buttons_container');
    
    if(storeContainer) {
        const allBtns = storeContainer.querySelectorAll('.btn-custom-select');
        allBtns.forEach(b => b.classList.remove('active'));

        const firstBtn = storeContainer.querySelector('.btn-custom-select');
        if (firstBtn) {
            firstBtn.click();
        }
    }
    
    const listDiv = document.getElementById('autocomplete-list');
    if(listDiv) listDiv.style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('addRequestModal'));
    modal.show();
    
    setTimeout(() => document.getElementById('item_search').focus(), 500);
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
    if (!confirm('ยืนยันการแจ้งของเสียและขอเบิก?')) return;

    const sourceVal = document.querySelector('input[name="defect_source"]:checked').value;

    const data = {
        item_id: document.getElementById('selected_item_id').value,
        wip_location_id: document.getElementById('wip_loc').value,
        store_location_id: document.getElementById('store_loc').value,
        quantity: document.getElementById('qty').value,
        reason: document.getElementById('reason').value,
        defect_source: sourceVal
    };

    if (!data.item_id) return showToast('กรุณาเลือกชิ้นงานจากรายการ', 'var(--bs-warning)');
    if (!data.store_location_id) return showToast('กรุณาเลือก Store ที่ต้องการเบิก', 'var(--bs-warning)');

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
        }
    } catch (e) {
        showToast('Connection Error', 'var(--bs-danger)');
    }
    hideSpinner();
}

// --- Load Requests ---
async function loadRequests() {
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = document.getElementById('filterSearch')?.value.toLowerCase() || '';

    showSpinner();
    try {
        const res = await fetch(`${API_URL}?action=get_requests&status=${status}`).then(r => r.json());
        const tbody = document.getElementById('reqTableBody');
        const cardCon = document.getElementById('reqCardContainer');
        
        if (tbody) tbody.innerHTML = '';
        if (cardCon) cardCon.innerHTML = '';

        if (res.success && res.data && res.data.length > 0) {
            const filteredData = res.data.filter(row => {
                if(!search) return true;
                const txt = (row.sap_no + row.part_no + (row.part_description||'') + (row.notes||'')).toLowerCase();
                return txt.includes(search);
            });

            if (filteredData.length === 0) {
                 const empty = '<div class="text-center text-muted py-4">ไม่พบข้อมูลที่ค้นหา</div>';
                 if (tbody) tbody.innerHTML = `<tr><td colspan="8">${empty}</td></tr>`;
                 if (cardCon) cardCon.innerHTML = empty;
            }

            filteredData.forEach(row => {
                let reason = row.notes || '-';
                if (reason.includes('Reason: ')) reason = reason.split('Reason: ')[1];
                else if (reason.includes('Defect: ')) reason = reason.split('Defect: ')[1];

                const badgeClass = `badge-${row.status}`;
                const statusBadge = `<span class="badge ${badgeClass} rounded-pill fw-normal">${row.status}</span>`;

                let btnAction = '';
                if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE && row.status === 'PENDING') {
                    btnAction = `
                    <button class="btn btn-sm btn-outline-success rounded-circle me-1" style="width:32px;height:32px;" onclick="approveReq(${row.transfer_id})" title="อนุมัติ"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px;height:32px;" onclick="rejectReq(${row.transfer_id})" title="ปฏิเสธ"><i class="fas fa-times"></i></button>`;
                }

                if (tbody) {
                    tbody.innerHTML += `
                        <tr>
                            <td class="text-muted small">${row.created_at ? row.created_at.substring(0, 16) : '-'}</td>
                            <td><span class="fw-bold text-dark">${row.sap_no}</span></td>
                            <td><div class="text-dark">${row.part_no}</div></td>
                            <td class="small text-muted text-truncate" style="max-width:200px;">${row.part_description || '-'}</td>
                            <td class="fw-bold text-end text-danger">${parseFloat(row.quantity)}</td>
                            <td class="small text-secondary">${reason}</td>
                            <td class="text-center">${statusBadge}</td>
                            <td class="text-center">${btnAction}</td>
                        </tr>`;
                }

                if (cardCon) {
                    cardCon.innerHTML += `
                        <div class="card req-card status-${row.status} border-0 shadow-sm">
                            <div class="card-body p-3">
                                <div class="d-flex justify-content-between mb-2">
                                    <div><strong class="text-dark">${row.sap_no}</strong></div>
                                    ${statusBadge}
                                </div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <div class="text-secondary small">${row.part_no}</div>
                                    <div class="fw-bold fs-5 text-dark">${parseFloat(row.quantity)}</div>
                                </div>
                                <div class="bg-light p-2 rounded small text-muted mb-2">
                                    <i class="fas fa-info-circle me-1"></i> ${reason}
                                </div>
                                <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <small class="text-muted">${row.created_at ? row.created_at.substring(5, 16) : ''}</small>
                                    <div>${btnAction}</div>
                                </div>
                            </div>
                        </div>`;
                }
            });
        } else {
            const empty = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-2x mb-2 opacity-50"></i><br>ไม่พบรายการ</div>';
            if (tbody) tbody.innerHTML = `<tr><td colspan="8">${empty}</td></tr>`;
            if (cardCon) cardCon.innerHTML = empty;
        }
    } catch (e) { console.error(e); }
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