"use strict";

// =========================================================
// 1. API SERVICE (จัดการการเชื่อมต่อ Backend)
// =========================================================
const MtAPI = {
    url: 'api/mtStockAPI.php',
    
    async getOnhand() {
        try {
            const res = await fetch(`${this.url}?action=get_onhand`);
            return await res.json();
        } catch (e) {
            console.error('API Error (getOnhand):', e);
            return { success: false, message: 'Network Error' };
        }
    },

    async getMasterData() {
        try {
            const res = await fetch(`${this.url}?action=get_master_data`);
            return await res.json();
        } catch (e) {
            console.error('API Error (getMasterData):', e);
            return { success: false, message: 'Network Error' };
        }
    },

    async processTransaction(payload) {
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch(this.url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken 
                },
                body: JSON.stringify(payload)
            });
            return await res.json();
        } catch (e) {
            console.error('API Error (processTransaction):', e);
            return { success: false, message: 'Network Error' };
        }
    }
};

// =========================================================
// 2. UI RENDERER (จัดการการวาดตารางและสถิติ สำหรับ On-Hand)
// =========================================================
const MtUI = {
    renderTable(data, searchTerm = '') {
        const tbody = document.querySelector('#onhandTable tbody');
        if (!tbody) return;

        const filtered = data.filter(item => 
            item.item_code.toLowerCase().includes(searchTerm) ||
            item.item_name.toLowerCase().includes(searchTerm) ||
            (item.location_name && item.location_name.toLowerCase().includes(searchTerm))
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 opacity-25"></i><br>ไม่พบรายการอะไหล่ที่ค้นหา</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(row => {
            const isLow = row.onhand_qty <= row.min_stock;
            return `
                <tr>
                    <td class="font-monospace fw-bold text-primary">${row.item_code}</td>
                    <td><div class="fw-bold text-dark">${row.item_name}</div></td>
                    <td><span class="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">${row.location_name || 'N/A'}</span></td>
                    <td class="text-center small text-muted">${parseFloat(row.min_stock).toLocaleString()} / ${parseFloat(row.max_stock).toLocaleString()}</td>
                    <td class="text-end">
                        <span class="h6 mb-0 fw-bold ${isLow ? 'text-danger badge-min-alert px-2 py-1 rounded' : 'text-success'}">
                            ${parseFloat(row.onhand_qty).toLocaleString()}
                        </span>
                    </td>
                    <td class="text-center"><span class="small text-muted text-uppercase">${row.uom}</span></td>
                </tr>
            `;
        }).join('');
    },

    updateStats(data) {
        const elTotal = document.getElementById('stat_total_items');
        const elLow = document.getElementById('stat_low_stock');
        if (elTotal) elTotal.textContent = data.length.toLocaleString();
        if (elLow) elLow.textContent = data.filter(i => i.onhand_qty <= i.min_stock).length.toLocaleString();
    },

    setButtonLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังบันทึก...';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        }
    }
};

// =========================================================
// 3. MODAL CONTROLLER (จัดการฟอร์ม รับเข้า/เบิกออก)
// =========================================================
const MtModal = {
    masterData: null,

    async prepareMasterData() {
        const json = await MtAPI.getMasterData();
        if (json.success) {
            this.masterData = json.data;
            this.populateDatalists();
        } else {
            if(typeof showToast === 'function') showToast('ไม่สามารถโหลด Master Data ได้', 'danger');
        }
    },

    populateDatalists() {
        if (!this.masterData) return;

        const itemOpts = this.masterData.items.map(i => `<option data-id="${i.item_id}" data-uom="${i.uom}" value="${i.item_code} | ${i.item_name}"></option>`).join('');
        const jobOpts = this.masterData.active_jobs.map(j => `<option data-id="${j.id}" value="JOB-${j.id.toString().padStart(4,'0')} | ${j.machine} [${j.status}]"></option>`).join('');
        const locOpts = this.masterData.locations.map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');

        const rcvItemOptsEl = document.getElementById('rcvItemOptions');
        const issItemOptsEl = document.getElementById('issItemOptions');
        const issJobOptsEl = document.getElementById('issJobOptions');

        if(rcvItemOptsEl) rcvItemOptsEl.innerHTML = itemOpts;
        if(issItemOptsEl) issItemOptsEl.innerHTML = itemOpts;
        if(issJobOptsEl) issJobOptsEl.innerHTML = jobOpts;
        
        document.querySelectorAll('select[name="location_id"]').forEach(s => s.innerHTML = '<option value="">-- เลือกคลัง --</option>' + locOpts);
    },

    bindDatalistEvents() {
        // [Receive] Item
        document.getElementById('rcv_item_input')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const options = document.getElementById('rcvItemOptions').options;
            document.getElementById('rcv_hidden_item_id').value = '';
            document.getElementById('receive_uom_display').value = '-';
            
            for(let i=0; i<options.length; i++) {
                if(options[i].value === val) {
                    document.getElementById('rcv_hidden_item_id').value = options[i].dataset.id;
                    document.getElementById('receive_uom_display').value = options[i].dataset.uom;
                    break;
                }
            }
        });

        // [Issue] Job
        document.getElementById('iss_job_input')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const options = document.getElementById('issJobOptions').options;
            document.getElementById('iss_hidden_job_id').value = '';
            for(let i=0; i<options.length; i++) {
                if(options[i].value === val) {
                    document.getElementById('iss_hidden_job_id').value = options[i].dataset.id;
                    break;
                }
            }
        });

        // [Issue] Item (มีโชว์ยอดคงเหลือ)
        document.getElementById('iss_item_input')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const options = document.getElementById('issItemOptions').options;
            const hintEl = document.querySelector('#issue_onhand_hint span');
            
            document.getElementById('iss_hidden_item_id').value = '';
            document.getElementById('issue_uom_display').value = '-';
            if(hintEl) { hintEl.textContent = '-'; hintEl.className = 'fw-bold'; }
            
            for(let i=0; i<options.length; i++) {
                if(options[i].value === val) {
                    const itemId = options[i].dataset.id;
                    const uom = options[i].dataset.uom;
                    
                    document.getElementById('iss_hidden_item_id').value = itemId;
                    document.getElementById('issue_uom_display').value = uom;
                    
                    const stockItem = MtApp.stockData.find(item => item.item_id == itemId);
                    if (hintEl) {
                        hintEl.textContent = stockItem ? `${parseFloat(stockItem.onhand_qty).toLocaleString()} ${uom}` : `0 ${uom}`;
                        hintEl.className = (stockItem && stockItem.onhand_qty > 0) ? 'fw-bold text-success' : 'fw-bold text-danger';
                    }
                    break;
                }
            }
        });
    },

    async openModal(type) {
        await this.prepareMasterData();
        
        const modalId = type === 'RECEIVE' ? 'modalReceive' : 'modalIssue';
        const modalEl = document.getElementById(modalId);
        
        if (!modalEl) {
            console.error(`Component ${modalId} not found.`);
            return;
        }

        if (type === 'ISSUE') {
            const hintEl = document.querySelector('#issue_onhand_hint span');
            if(hintEl) { hintEl.textContent = '-'; hintEl.className = 'fw-bold'; }
        }

        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    },

    async submitTransaction(event, formId, transactionType) {
        event.preventDefault();
        const form = document.getElementById(formId);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        const hiddenItemId = form.querySelector('input[name="item_id"]').value;
        if (!hiddenItemId) {
            if(typeof showToast === 'function') showToast('กรุณาเลือกอะไหล่จากรายการค้นหาให้ถูกต้อง', 'warning');
            return;
        }

        MtUI.setButtonLoading(submitBtn, true);

        const formData = new FormData(form);
        const payload = {
            action: 'process_transaction',
            item_id: hiddenItemId,
            location_id: formData.get('location_id'),
            quantity: formData.get('quantity'),
            ref_job_id: formData.get('ref_job_id') || null,
            notes: formData.get('notes'),
            transaction_type: transactionType
        };

        const result = await MtAPI.processTransaction(payload);

        if (result.success) {
            if(typeof showToast === 'function') showToast(result.message, 'success');
            form.reset();
            const uomDisplay = form.querySelector('input[readonly]');
            if(uomDisplay) uomDisplay.value = '';
            
            bootstrap.Modal.getInstance(document.getElementById(formId)).hide();
            MtApp.refreshData(); 
        } else {
            if(typeof showToast === 'function') showToast(result.message, 'danger');
        }
        
        MtUI.setButtonLoading(submitBtn, false);
    }
};

// =========================================================
// 4. MASTER DATA CONTROLLER (จัดการหน้า Item Master)
// =========================================================
const MtMasterCtrl = {
    masterDataList: [],

    async loadData() {
        try {
            const res = await fetch(`${MtAPI.url}?action=get_mt_items`);
            const json = await res.json();
            if (json.success) {
                this.masterDataList = json.data;
                this.renderTable();
            }
        } catch (e) {
            console.error('API Error (get_mt_items):', e);
        }
    },

    renderTable(searchTerm = '') {
        const tbody = document.querySelector('#masterTable tbody');
        if (!tbody) return;

        const filtered = this.masterDataList.filter(item => 
            item.item_code.toLowerCase().includes(searchTerm) ||
            item.item_name.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">ไม่พบข้อมูล Item Master</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(row => `
            <tr class="${row.is_active == 0 ? 'opacity-50' : ''}">
                <td class="font-monospace fw-bold ${row.is_active == 1 ? 'text-primary' : 'text-muted'}">${row.item_code}</td>
                <td>
                    <div class="fw-bold text-dark">${row.item_name}</div>
                    <div class="small text-muted text-truncate" style="max-width: 300px;" title="${row.description || '-'}">${row.description || '-'}</div>
                </td>
                <td><span class="small">${row.supplier || '-'}</span></td>
                <td class="text-end fw-bold">${parseFloat(row.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="text-center small"><span class="text-danger">${parseFloat(row.min_stock)}</span> / <span class="text-success">${parseFloat(row.max_stock)}</span> ${row.uom}</td>
                <td class="text-center">
                    ${row.is_active == 1 
                        ? '<span class="badge bg-success">Active</span>' 
                        : '<span class="badge bg-secondary">Inactive</span>'}
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary py-0 px-2 me-1" onclick="window.MtMasterCtrl.openModal(${row.item_id})" title="แก้ไข">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-${row.is_active == 1 ? 'danger' : 'success'} py-0 px-2" onclick="window.MtMasterCtrl.toggleStatus(${row.item_id})" title="${row.is_active == 1 ? 'ระงับ' : 'เปิดใช้'}">
                        <i class="fas fa-${row.is_active == 1 ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    openModal(itemId = null) {
        const form = document.getElementById('formMtItem');
        if(!form) {
            console.error("modalMtItem element not found.");
            return;
        }

        form.reset();
        document.getElementById('mt_item_id').value = '';

        if (itemId) {
            const item = this.masterDataList.find(i => i.item_id == itemId);
            if (item) {
                document.getElementById('mt_item_id').value = item.item_id;
                document.getElementById('mt_item_code').value = item.item_code;
                document.getElementById('mt_item_name').value = item.item_name;
                document.getElementById('mt_description').value = item.description || '';
                document.getElementById('mt_supplier').value = item.supplier || '';
                document.getElementById('mt_unit_price').value = item.unit_price || 0;
                document.getElementById('mt_uom').value = item.uom || 'PCS';
                document.getElementById('mt_min_stock').value = item.min_stock || 0;
                document.getElementById('mt_max_stock').value = item.max_stock || 0;
            }
        }

        const modal = new bootstrap.Modal(document.getElementById('modalMtItem'));
        modal.show();
    },

    async submit(event) {
        event.preventDefault();
        const form = document.getElementById('formMtItem');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        MtUI.setButtonLoading(submitBtn, true);

        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        payload.action = 'save_mt_item';

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch(MtAPI.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.success) {
                if(typeof showToast === 'function') showToast(result.message, 'success');
                bootstrap.Modal.getInstance(document.getElementById('modalMtItem')).hide();
                await this.loadData(); 
                MtApp.refreshData();   
            } else {
                if(typeof showToast === 'function') showToast(result.message, 'danger');
            }
        } catch (e) {
            if(typeof showToast === 'function') showToast('Network Error', 'danger');
        } finally {
            MtUI.setButtonLoading(submitBtn, false);
        }
    },

    async toggleStatus(itemId) {
        if (!confirm('ยืนยันการเปลี่ยนสถานะการใช้งานรายการนี้?')) return;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        try {
            const res = await fetch(MtAPI.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ action: 'toggle_mt_item', item_id: itemId })
            });
            const result = await res.json();

            if (result.success) {
                if(typeof showToast === 'function') showToast(result.message, 'success');
                await this.loadData();
            } else {
                if(typeof showToast === 'function') showToast(result.message, 'danger');
            }
        } catch (e) {
            if(typeof showToast === 'function') showToast('Network Error', 'danger');
        }
    }
};

// =========================================================
// 5. MAIN APP (ตัวควบคุมหลัก)
// =========================================================
const MtApp = {
    stockData: [],

    async init() {
        this.setupEvents();
        await this.refreshData();
        await MtMasterCtrl.loadData(); // โหลดข้อมูล Master เมื่อเปิดหน้า
        MtModal.bindDatalistEvents(); 
    },

    setupEvents() {
        // Search On-Hand Table
        document.getElementById('onhandSearch')?.addEventListener('input', (e) => {
            MtUI.renderTable(this.stockData, e.target.value.toLowerCase());
        });

        // Search Master Table
        document.getElementById('masterSearch')?.addEventListener('input', (e) => {
            MtMasterCtrl.renderTable(e.target.value.toLowerCase());
        });

        // Submit Forms
        document.getElementById('formReceive')?.addEventListener('submit', (e) => MtModal.submitTransaction(e, 'formReceive', 'RECEIVE'));
        document.getElementById('formIssue')?.addEventListener('submit', (e) => MtModal.submitTransaction(e, 'formIssue', 'ISSUE'));
        document.getElementById('formMtItem')?.addEventListener('submit', (e) => MtMasterCtrl.submit(e));
    },

    async refreshData() {
        if(typeof showSpinner === 'function') showSpinner();
        const json = await MtAPI.getOnhand();
        
        if (json.success) {
            this.stockData = json.data;
            MtUI.renderTable(this.stockData);
            MtUI.updateStats(this.stockData);
        } else {
            if(typeof showToast === 'function') showToast('ไม่สามารถโหลดข้อมูลสต๊อกได้', 'danger');
        }
        if(typeof hideSpinner === 'function') hideSpinner();
    }
};

// =========================================================
// 6. GLOBAL EXPORTS (เพื่อให้ HTML เรียกใช้งานผ่าน onclick ได้)
// =========================================================
window.StockManager = {
    openReceiveModal: () => MtModal.openModal('RECEIVE'),
    openIssueModal: () => MtModal.openModal('ISSUE')
};

window.MtMasterCtrl = MtMasterCtrl;
window.MtApp = MtApp;

// เริ่มต้นระบบ
document.addEventListener('DOMContentLoaded', () => MtApp.init());