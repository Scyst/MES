// MES/page/maintenancePE/script/maintenanceStock.js
"use strict";

const MtAPI = {
    url: 'api/mtStockAPI.php',
    
    async getOnhand() {
        try {
            const res = await fetch(`${this.url}?action=get_onhand`);
            return await res.json();
        } catch (e) {
            console.error('API Error (getOnhand):', e);
            return { success: false, message: 'Network Error', data: [] };
        }
    },

    async getMasterData() {
        try {
            const res = await fetch(`${this.url}?action=get_master_data`);
            return await res.json();
        } catch (e) {
            console.error('API Error (getMasterData):', e);
            return { success: false, message: 'Network Error', data: {} };
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

const MtUI = {
    renderTable(data, searchTerm = '', locationFilter = '') {
        const tbody = document.getElementById('onhandTableBody');
        if (!tbody) return;

        if (!data || !Array.isArray(data)) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">ไม่พบข้อมูล</td></tr>`;
            this.updateStats([]);
            return;
        }

        const filtered = data.filter(item => {
            const matchSearch = (item.item_code || '').toLowerCase().includes(searchTerm) ||
                                (item.item_name || '').toLowerCase().includes(searchTerm) ||
                                (item.location_name || '').toLowerCase().includes(searchTerm);
            const matchLoc = locationFilter === '' || String(item.location_id) === locationFilter;
            return matchSearch && matchLoc;
        });

        this.updateStats(filtered);

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3 opacity-25"></i><br>ไม่พบรายการอะไหล่ที่ค้นหา</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(row => {
            const onhand = parseFloat(row.onhand_qty) || 0;
            const min = parseFloat(row.min_stock) || 0;
            const max = parseFloat(row.max_stock) || 0;
            const isLow = onhand <= min; 

            return `
                <tr>
                    <td class="font-monospace fw-bold text-primary ps-3">${row.item_code}</td>
                    <td><div class="fw-bold text-dark text-truncate" style="max-width: 200px;" title="${row.item_name}">${row.item_name}</div></td>
                    <td><div class="small text-muted text-truncate" style="max-width: 200px;" title="${row.description || '-'}">${row.description || '-'}</div></td>
                    <td><span class="badge bg-secondary bg-opacity-10 text-secondary border px-2 py-1">${row.location_name || 'N/A'}</span></td>
                    <td class="text-center small text-muted">${min.toLocaleString()} / ${max.toLocaleString()}</td>
                    <td class="text-end">
                        <span class="h6 mb-0 fw-bold ${isLow ? 'text-danger badge-min-alert px-2 py-1 rounded' : 'text-success'}">
                            ${onhand.toLocaleString()}
                        </span>
                    </td>
                    <td class="text-center"><span class="small text-muted text-uppercase">${row.uom || ''}</span></td>
                    <td class="text-center pe-3">
                        <button class="btn btn-sm btn-outline-warning py-0 px-2 shadow-none" 
                                onclick="window.StockManager.openSpecificAdjust(${row.item_id}, ${row.location_id})" 
                                title="ปรับปรุงยอด (Spot Check)">
                            <i class="fas fa-sliders-h"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    updateStats(data) {
        if (!data || !Array.isArray(data)) return;
        
        const elTotal = document.getElementById('stat_total_items');
        const elLow = document.getElementById('stat_low_stock');
        const elValue = document.getElementById('stat_total_value');
        
        let lowCount = 0;
        let totalValue = 0;

        data.forEach(i => {
            const qty = parseFloat(i.onhand_qty) || 0;
            const min = parseFloat(i.min_stock) || 0;
            const price = parseFloat(i.unit_price) || 0;
            
            if (qty <= min) lowCount++;
            totalValue += (qty * price);
        });

        if (elTotal) elTotal.textContent = data.length.toLocaleString();
        if (elLow) elLow.textContent = lowCount.toLocaleString();
        if (elValue) elValue.textContent = '฿' + totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    setButtonLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> กำลังบันทึก...';
        } else {
            btn.disabled = false;
            if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        }
    }
};

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

        const items = this.masterData.items || [];
        const jobs = this.masterData.active_jobs || [];
        const locations = this.masterData.locations || [];

        const itemOpts = items.map(i => `<option data-id="${i.item_id}" data-uom="${i.uom}" value="${i.item_code} | ${i.item_name}"></option>`).join('');
        const jobOpts = jobs.map(j => `<option data-id="${j.id}" value="JOB-${j.id.toString().padStart(4,'0')} | ${j.machine} [${j.status}]"></option>`).join('');
        const locOpts = locations.map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');

        const updateEl = (id, content) => { const el = document.getElementById(id); if (el) el.innerHTML = content; };

        updateEl('rcvItemOptions', itemOpts);
        updateEl('issItemOptions', itemOpts);
        updateEl('adjItemOptions', itemOpts);
        updateEl('issJobOptions', jobOpts);
        
        document.querySelectorAll('select[name="location_id"]').forEach(s => s.innerHTML = '<option value="">-- เลือกคลัง --</option>' + locOpts);
        const filterEl = document.getElementById('onhandLocationFilter');
        if (filterEl) filterEl.innerHTML = '<option value="">-- ทุกคลังเก็บ --</option>' + locOpts;
    },

    updateAdjustCalculation() {
        const itemId = document.getElementById('adj_hidden_item_id').value;
        const locId = document.querySelector('#formMtAdjust select[name="location_id"]').value;
        const actualInput = document.getElementById('adj_actual_qty');
        const actualQty = parseFloat(actualInput.value);

        let currentOnhand = 0;

        if (itemId) {
            if (locId) {
                const stockItem = MtApp.stockData.find(i => i.item_id == itemId && i.location_id == locId);
                currentOnhand = stockItem ? parseFloat(stockItem.onhand_qty) : 0;
            } else {
                const stockItems = MtApp.stockData.filter(i => i.item_id == itemId);
                currentOnhand = stockItems.reduce((sum, i) => sum + (parseFloat(i.onhand_qty) || 0), 0);
            }
        }

        const hintEl = document.querySelector('#adj_onhand_hint span');
        if (hintEl) hintEl.textContent = currentOnhand.toLocaleString();

        const diffDisplay = document.getElementById('adj_diff_value');
        const finalInput = document.getElementById('adj_final_diff');

        if (!isNaN(actualQty) && actualInput.value !== "") {
            const diff = actualQty - currentOnhand;
            if (diffDisplay) {
                diffDisplay.textContent = (diff > 0 ? '+' : '') + diff.toLocaleString();
                diffDisplay.className = diff >= 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
            }
            if (finalInput) finalInput.value = diff;
        } else {
            if (diffDisplay) {
                diffDisplay.textContent = '-';
                diffDisplay.className = 'fw-bold';
            }
            if (finalInput) finalInput.value = '';
        }
    },

    bindDatalistEvents() {
        const handleItemSelect = (inputId, hiddenId, uomId, optionsId) => {
            document.getElementById(inputId)?.addEventListener('input', (e) => {
                const val = e.target.value;
                const options = document.getElementById(optionsId).options;
                
                document.getElementById(hiddenId).value = '';
                if (uomId) document.getElementById(uomId).value = '-';
                
                for(let i=0; i<options.length; i++) {
                    if(options[i].value === val) {
                        document.getElementById(hiddenId).value = options[i].dataset.id;
                        if (uomId) document.getElementById(uomId).value = options[i].dataset.uom;
                        break;
                    }
                }
            });
        };

        handleItemSelect('rcv_item_input', 'rcv_hidden_item_id', 'receive_uom_display', 'rcvItemOptions');
        
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
                    
                    const stockItems = MtApp.stockData.filter(item => item.item_id == itemId);
                    const totalOnhand = stockItems.reduce((sum, itm) => sum + (parseFloat(itm.onhand_qty) || 0), 0);

                    if (hintEl) {
                        hintEl.textContent = `${totalOnhand.toLocaleString()} ${uom}`;
                        hintEl.className = totalOnhand > 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
                    }
                    break;
                }
            }
        });

        const updateAdjustCalculation = () => {
            const itemId = document.getElementById('adj_hidden_item_id').value;
            const locId = document.querySelector('#formMtAdjust select[name="location_id"]').value;
            const actualInput = document.getElementById('adj_actual_qty');
            const actualQty = parseFloat(actualInput.value);

            let currentOnhand = 0;

            if (itemId) {
                if (locId) {
                    const stockItem = MtApp.stockData.find(i => i.item_id == itemId && i.location_id == locId);
                    currentOnhand = stockItem ? parseFloat(stockItem.onhand_qty) : 0;
                } else {
                    const stockItems = MtApp.stockData.filter(i => i.item_id == itemId);
                    currentOnhand = stockItems.reduce((sum, i) => sum + (parseFloat(i.onhand_qty) || 0), 0);
                }
            }

            const hintEl = document.querySelector('#adj_onhand_hint span');
            if (hintEl) hintEl.textContent = currentOnhand.toLocaleString();

            const diffDisplay = document.getElementById('adj_diff_value');
            const finalInput = document.getElementById('adj_final_diff');

            if (!isNaN(actualQty) && actualInput.value !== "") {
                const diff = actualQty - currentOnhand;
                if (diffDisplay) {
                    diffDisplay.textContent = (diff > 0 ? '+' : '') + diff.toLocaleString();
                    diffDisplay.className = diff >= 0 ? 'fw-bold text-success' : 'fw-bold text-danger';
                }
                if (finalInput) finalInput.value = diff;
            } else {
                if (diffDisplay) {
                    diffDisplay.textContent = '-';
                    diffDisplay.className = 'fw-bold';
                }
                if (finalInput) finalInput.value = '';
            }
        };

        document.getElementById('adj_item_input')?.addEventListener('input', (e) => {
            const val = e.target.value;
            const options = document.getElementById('adjItemOptions').options;
            document.getElementById('adj_hidden_item_id').value = '';
            for(let i=0; i<options.length; i++) {
                if(options[i].value === val) {
                    document.getElementById('adj_hidden_item_id').value = options[i].dataset.id;
                    break;
                }
            }
            this.updateAdjustCalculation();
        });

        document.querySelector('#formMtAdjust select[name="location_id"]')?.addEventListener('change', () => this.updateAdjustCalculation());
        document.getElementById('adj_actual_qty')?.addEventListener('input', () => this.updateAdjustCalculation());
    },

    async openModal(type, extraItemId = null, extraLocId = null) {
        await this.prepareMasterData();
        
        let modalId = '';
        let formId = '';
        
        if (type === 'RECEIVE') { modalId = 'modalReceive'; formId = 'formReceive'; }
        else if (type === 'ISSUE') { modalId = 'modalIssue'; formId = 'formIssue'; }
        else if (type === 'ADJUST') { modalId = 'modalMtAdjust'; formId = 'formMtAdjust'; }
        
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;
    
        const formEl = document.getElementById(formId);
        if (formEl) formEl.reset();

        const resetHint = (selector) => {
            const el = document.querySelector(selector);
            if (el) { el.textContent = '-'; el.className = 'fw-bold fs-6'; }
        };

        if (type === 'ISSUE') {
            resetHint('#issue_onhand_hint span');
        } else if (type === 'ADJUST') {
            resetHint('#adj_onhand_hint span');
            resetHint('#adj_diff_value');
            const finalInput = document.getElementById('adj_final_diff');
            if(finalInput) finalInput.value = '';
            if (extraItemId && extraLocId) {
                const itemObj = this.masterData.items.find(i => i.item_id == extraItemId);
                if (itemObj) {
                    document.getElementById('adj_item_input').value = `${itemObj.item_code} | ${itemObj.item_name}`;
                    document.getElementById('adj_hidden_item_id').value = extraItemId;
                }
                const locSelect = document.querySelector('#formMtAdjust select[name="location_id"]');
                if (locSelect) locSelect.value = extraLocId;
                setTimeout(() => this.updateAdjustCalculation(), 100);
            }
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
            if(typeof showToast === 'function') showToast('กรุณาเลือกอะไหล่จากรายการให้ถูกต้อง', 'warning');
            return;
        }

        MtUI.setButtonLoading(submitBtn, true);
        const formData = new FormData(form);
        let qty = formData.get('quantity');
        
        if (transactionType === 'ADJUST') {
            qty = document.getElementById('adj_final_diff').value;
            if (parseFloat(qty) === 0 || qty === "") {
                Swal.fire('ยอดถูกต้องแล้ว', 'ยอดนับจริงตรงกับในระบบ ไม่จำเป็นต้องทำการปรับยอดครับ', 'info');
                MtUI.setButtonLoading(submitBtn, false);
                return;
            }
        }

        const payload = {
            action: 'process_transaction',
            item_id: hiddenItemId,
            location_id: formData.get('location_id'),
            quantity: qty, 
            ref_job_id: formData.get('ref_job_id') || null,
            notes: formData.get('notes'),
            transaction_type: transactionType
        };

        try {
            const result = await MtAPI.processTransaction(payload);
            if (result.success) {
                if(typeof showToast === 'function') showToast(result.message, 'success');
                form.reset();
                const uomDisplay = form.querySelector('input[readonly]');
                if(uomDisplay) uomDisplay.value = '';
            
                const modalElement = form.closest('.modal');
                if (modalElement) {
                    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
                    modalInstance.hide();
                }
                
                MtApp.refreshData(); 
                MtHistoryCtrl.loadData();
            } else {
                Swal.fire('ข้อผิดพลาด', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('ข้อผิดพลาด', 'ระบบเครือข่ายมีปัญหา', 'error');
        } finally {
            MtUI.setButtonLoading(submitBtn, false);
        }
    }
};

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

        if (!this.masterDataList || !Array.isArray(this.masterDataList)) {
             tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`;
             return;
        }

        const filtered = this.masterDataList.filter(item => 
            (item.item_code || '').toLowerCase().includes(searchTerm) ||
            (item.item_name || '').toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">ไม่พบข้อมูล Item Master</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(row => `
            <tr class="${row.is_active == 0 ? 'opacity-50' : ''}">
                <td class="font-monospace fw-bold ${row.is_active == 1 ? 'text-primary' : 'text-muted'}">${row.item_code}</td>
                <td><div class="fw-bold text-dark text-truncate" style="max-width: 200px;" title="${row.item_name}">${row.item_name}</div></td>
                <td><div class="small text-muted text-truncate" style="max-width: 250px;" title="${row.description || '-'}">${row.description || '-'}</div></td>
                <td><span class="small">${row.supplier || '-'}</span></td>
                <td class="text-end fw-bold">${parseFloat(row.unit_price).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td class="text-center small"><span class="text-danger">${parseFloat(row.min_stock)}</span> / <span class="text-success">${parseFloat(row.max_stock)}</span> ${row.uom || ''}</td>
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

    exportData() {
        if (!this.masterDataList || this.masterDataList.length === 0) {
            Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับส่งออก', 'info');
            return;
        }

        let ws_data = [
            ["Item Code", "Item Name", "Description", "Supplier", "Unit Price", "UOM", "Min Stock", "Max Stock", "Status"]
        ];

        this.masterDataList.forEach(item => {
            ws_data.push([
                item.item_code || "", 
                item.item_name || "", 
                item.description || "", 
                item.supplier || "",
                parseFloat(item.unit_price) || 0, 
                item.uom || "", 
                parseFloat(item.min_stock) || 0, 
                parseFloat(item.max_stock) || 0,
                item.is_active == 1 ? "Active" : "Inactive"
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Item_Master");
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `MT_Item_Master_${dateStr}.xlsx`);
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
                const modalElement = document.getElementById('modalMtItem');
                bootstrap.Modal.getOrCreateInstance(modalElement).hide();
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

const MtHistoryCtrl = {
    historyData: [],

    async loadData() {
        try {
            const res = await fetch(`${MtAPI.url}?action=get_transactions`);
            const json = await res.json();
            if (json.success) {
                this.historyData = json.data;
                this.renderTable();
            }
        } catch (e) {
            console.error(e);
        }
    },

    renderTable(searchTerm = '') {
        const tbody = document.querySelector('#historyTable tbody');
        if (!tbody) return;

        if (!this.historyData || !Array.isArray(this.historyData)) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบประวัติการทำรายการ</td></tr>`;
            return;
        }

        const filtered = this.historyData.filter(item => 
            (item.item_code || '').toLowerCase().includes(searchTerm) ||
            (item.item_name || '').toLowerCase().includes(searchTerm) ||
            (item.created_by_name || '').toLowerCase().includes(searchTerm) ||
            (item.machine || '').toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">ไม่พบประวัติการทำรายการ</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(row => {
            let typeBadge = '';
            if (row.transaction_type === 'RECEIVE') typeBadge = '<span class="badge bg-success bg-opacity-10 text-success border border-success"><i class="fas fa-arrow-down me-1"></i> IN</span>';
            else if (row.transaction_type === 'ISSUE') typeBadge = '<span class="badge bg-dark bg-opacity-10 text-dark border border-dark"><i class="fas fa-arrow-up me-1"></i> OUT</span>';
            else typeBadge = `<span class="badge bg-secondary">${row.transaction_type}</span>`;

            const dateObj = new Date(row.created_at);
            const dateStr = dateObj.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            let refHtml = row.notes || '-';
            if (row.machine) {
                refHtml = `<div class="fw-bold text-primary"><i class="fas fa-tools me-1"></i> ${row.machine}</div><div class="small text-muted text-truncate" style="max-width: 250px;" title="${row.issue_description || ''}">${row.issue_description || ''}</div>`;
            }

            return `
                <tr>
                    <td class="text-muted">${dateStr}</td>
                    <td>${typeBadge}</td>
                    <td>
                        <div class="fw-bold text-dark">${row.item_code}</div>
                        <div class="small text-muted text-truncate" style="max-width: 200px;" title="${row.item_name}">${row.item_name}</div>
                    </td>
                    <td class="text-end fw-bold ${parseFloat(row.quantity) > 0 ? 'text-success' : 'text-danger'}">
                        ${parseFloat(row.quantity).toLocaleString()} <span class="small fw-normal text-muted">${row.uom || ''}</span>
                    </td>
                    <td><span class="small"><i class="fas fa-user-circle text-muted me-1"></i> ${row.created_by_name || 'System'}</span></td>
                    <td>${refHtml}</td>
                </tr>
            `;
        }).join('');
    }
};

const MtStockTakeCtrl = {
    parsedData: [],

    exportCountSheet() {
        if (!MtApp.stockData || MtApp.stockData.length === 0) {
            Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสต๊อกคงเหลือให้ออกรายงาน', 'info');
            return;
        }

        let ws_data = [
            ["Item Code", "Item Name", "Location Name", "Location ID (ห้ามแก้)", "System QTY", "UOM", "Actual Count (กรอกเลขที่นับได้)", "Remark (หมายเหตุ)"]
        ];

        MtApp.stockData.forEach(item => {
            ws_data.push([
                item.item_code || "",
                item.item_name || "",
                item.location_name || "",
                item.location_id || "", 
                parseFloat(item.onhand_qty) || 0,
                item.uom || "",
                "", 
                ""  
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        ws['!cols'] = [{wch:15}, {wch:35}, {wch:15}, {wch:20, hidden:true}, {wch:12}, {wch:8}, {wch:25}, {wch:30}];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Stock_Take");
        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `MT_Stock_Count_${dateStr}.xlsx`);
    },

    openModal() {
        this.parsedData = [];
        document.getElementById('stExcelFile').value = '';
        document.getElementById('stPreviewTbody').innerHTML = `<tr><td colspan="6" class="text-center text-muted align-middle" style="height: 250px;"><i class="fas fa-file-excel fa-3x mb-3 opacity-25"></i><br><span class="fw-bold">อัปโหลดไฟล์นับสต๊อก</span></td></tr>`;
        document.getElementById('stPreviewCount').innerText = `พบข้อมูลปรับยอด: 0 รายการ`;
        document.getElementById('btnSaveStockTake').classList.add('d-none');
        new bootstrap.Modal(document.getElementById('importStockTakeModal')).show();
    },

    processExcel() {
        const file = document.getElementById('stExcelFile').files[0];
        if (!file) return;

        document.getElementById('stPreviewTbody').innerHTML = `<tr><td colspan="6" class="text-center text-warning align-middle" style="height: 250px;"><i class="fas fa-circle-notch fa-spin fa-3x mb-3"></i><br><span class="fw-bold">กำลังคำนวณส่วนต่าง...</span></td></tr>`;
        
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
                    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""});
                    this.extractData(rawRows);
                } catch (error) {
                    Swal.fire('Error', 'ไม่สามารถอ่านไฟล์ได้', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }, 100);
    },

    extractData(rawRows) {
        this.parsedData = [];
        let colMap = {};
        let isHeaderFound = false;

        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
            let rowStr = rawRows[i].join('').toLowerCase();
            if (rowStr.includes('item code') || rowStr.includes('actual count')) {
                isHeaderFound = true;
                rawRows[i].forEach((cell, index) => {
                    let colName = String(cell).toLowerCase();
                    if (colName.includes('item code')) colMap['code'] = index;
                    else if (colName.includes('location id')) colMap['loc_id'] = index;
                    else if (colName.includes('system qty')) colMap['sys_qty'] = index;
                    else if (colName.includes('actual count')) colMap['actual_qty'] = index;
                    else if (colName.includes('remark')) colMap['remark'] = index;
                });
                break;
            }
        }

        if (!isHeaderFound || colMap['actual_qty'] === undefined) {
            Swal.fire('ข้อผิดพลาด', 'ไม่พบคอลัมน์ Actual Count หรือไฟล์ไม่ถูกต้อง', 'error');
            return;
        }

        let stats = { total: 0, empty: 0, matched: 0, adjusted: 0 };
        for (let i = 0; i < rawRows.length; i++) {
            let row = rawRows[i];
            let itemCode = row[colMap['code']];
            if (!itemCode || String(itemCode).toLowerCase().includes('item code')) continue;

            stats.total++;
            let actualStr = String(row[colMap['actual_qty']] || "").trim();
            
            if (actualStr === "") {
                stats.empty++;
                continue; 
            }

            let actualQty = parseFloat(actualStr.replace(/,/g, '')) || 0;
            let sysQtyStr = String(row[colMap['sys_qty']] || "0");
            let sysQty = parseFloat(sysQtyStr.replace(/,/g, '')) || 0;
            
            let diff = actualQty - sysQty;
            if (diff === 0) {
                stats.matched++;
                continue;
            }

            stats.adjusted++;
            this.parsedData.push({
                item_code: String(itemCode).trim(),
                location_id: row[colMap['loc_id']],
                sys_qty: sysQty,
                actual_qty: actualQty,
                diff: diff,
                remark: String(row[colMap['remark']] || 'ปรับยอดจากการนับสต๊อก (Stock Take)').trim()
            });
        }
        
        this.importStats = stats;
        this.renderPreview();
    },

    renderPreview() {
        const tbody = document.getElementById('stPreviewTbody');
        const stats = this.importStats;

        if (this.parsedData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center align-middle" style="height: 250px;">
                        <i class="fas fa-search fa-3x mb-3 text-secondary opacity-50"></i><br>
                        <h5 class="fw-bold text-dark">สรุปผลการอ่านไฟล์ Excel</h5>
                        <p class="text-muted mb-1">สแกนทั้งหมด: <b>${stats.total}</b> รายการ</p>
                        <p class="text-warning mb-1">ไม่มียอดในช่อง Actual Count: <b>${stats.empty}</b> รายการ</p>
                        <p class="text-success mb-3">ยอดนับได้ ตรงกับระบบเป๊ะ: <b>${stats.matched}</b> รายการ</p>
                        <span class="badge bg-secondary p-2 fs-6">ไม่มีรายการใดที่ส่วนต่างต้องปรับปรุง</span>
                    </td>
                </tr>
            `;
            document.getElementById('btnSaveStockTake').classList.add('d-none');
            document.getElementById('stPreviewCount').innerText = `พบข้อมูลปรับยอด: 0 รายการ`;
            return;
        }

        tbody.innerHTML = this.parsedData.map(row => `
            <tr class="text-center">
                <td class="text-start fw-bold text-primary">${row.item_code}</td>
                <td class="text-start">${row.location_id}</td>
                <td class="text-muted">${row.sys_qty.toLocaleString()}</td>
                <td class="fw-bold text-dark">${row.actual_qty.toLocaleString()}</td>
                <td class="fw-bold ${row.diff > 0 ? 'text-success' : 'text-danger'}">${row.diff > 0 ? '+' : ''}${row.diff.toLocaleString()}</td>
                <td class="text-start text-truncate" style="max-width: 150px;">${row.remark}</td>
            </tr>
        `).join('');

        document.getElementById('stPreviewCount').innerText = `พบข้อมูลปรับยอด: ${this.parsedData.length} รายการ`;
        document.getElementById('btnSaveStockTake').classList.remove('d-none');
    },

    async submitToDatabase() {
        if (this.parsedData.length === 0) return;
        
        const btn = document.getElementById('btnSaveStockTake');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังปรับยอด...';
        btn.disabled = true;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch(`${MtAPI.url}?action=bulk_stock_take`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ adjustments: this.parsedData })
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('สำเร็จ', `ปรับปรุงยอดสต๊อกจำนวน ${this.parsedData.length} รายการ เรียบร้อยแล้ว`, 'success');
                const modalElement = document.getElementById('importStockTakeModal');
                bootstrap.Modal.getOrCreateInstance(modalElement).hide();
                MtApp.refreshData(); 
                MtHistoryCtrl.loadData();
            } else {
                Swal.fire('ข้อผิดพลาด', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('ข้อผิดพลาด', 'ระบบเครือข่ายมีปัญหา', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-save me-1"></i> ยืนยันการปรับยอดสต๊อก';
            btn.disabled = false;
        }
    }
};

const MtImportCtrl = {
    parsedData: [],
    
    openModal() {
        this.parsedData = [];
        document.getElementById('mtExcelFile').value = '';
        document.getElementById('mtPreviewTbody').innerHTML = `<tr><td colspan="7" class="text-center text-muted align-middle" style="height: 250px;"><i class="fas fa-file-excel fa-3x mb-3 opacity-25"></i><br><span class="fw-bold">กรุณาเลือกไฟล์ Excel เพื่อดูตัวอย่างข้อมูล</span></td></tr>`;
        document.getElementById('mtPreviewCount').innerText = `พบข้อมูล: 0 รายการ`;
        document.getElementById('btnSaveMtImport').classList.add('d-none');
        new bootstrap.Modal(document.getElementById('importMtItemModal')).show();
    },

    downloadTemplate() {
        const ws_data = [
            ["Item Code", "Item Name", "Description", "Supplier", "Unit Price", "UOM", "Min Stock", "Max Stock"],
            ["SP-0001", "Bearing 6204", "12x32x10", "SKF", 150.00, "PCS", 10, 50],
            ["EL-0042", "Cable VAF 2x2.5", "100m Roll", "Thai Yazaki", 1200.00, "ROLL", 2, 10]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "MasterData");
        XLSX.writeFile(wb, "MT_Item_Master_Template.xlsx");
    },

    processExcel() {
        const file = document.getElementById('mtExcelFile').files[0];
        if (!file) return;

        document.getElementById('mtPreviewTbody').innerHTML = `<tr><td colspan="7" class="text-center text-primary align-middle" style="height: 250px;"><i class="fas fa-circle-notch fa-spin fa-3x mb-3"></i><br><span class="fw-bold">กำลังอ่านข้อมูล...</span></td></tr>`;
        
        setTimeout(() => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const workbook = XLSX.read(new Uint8Array(e.target.result), {type: 'array'});
                    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, defval: ""});
                    this.extractData(rawRows);
                } catch (error) {
                    Swal.fire('Error', 'ไม่สามารถอ่านไฟล์ Excel ได้', 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        }, 100);
    },

    extractData(rawRows) {
        this.parsedData = [];
        let colMap = {};
        let isHeaderFound = false;

        for (let i = 0; i < Math.min(10, rawRows.length); i++) {
            let rowStr = rawRows[i].join('').toLowerCase();
            if (rowStr.includes('item code') || rowStr.includes('item name') || rowStr.includes('รหัส')) {
                isHeaderFound = true;
                rawRows[i].forEach((cell, index) => {
                    let colName = String(cell).toLowerCase();
                    if (colName.includes('item code') || colName.includes('รหัส')) colMap['code'] = index;
                    else if (colName.includes('item name') || colName.includes('ชื่อ')) colMap['name'] = index;
                    else if (colName.includes('desc')) colMap['desc'] = index;
                    else if (colName.includes('supplier') || colName.includes('ผู้ขาย')) colMap['sup'] = index;
                    else if (colName.includes('price') || colName.includes('ราคา')) colMap['price'] = index;
                    else if (colName.includes('uom') || colName.includes('หน่วย')) colMap['uom'] = index;
                    else if (colName.includes('min')) colMap['min'] = index;
                    else if (colName.includes('max')) colMap['max'] = index;
                });
                break;
            }
        }

        if (!isHeaderFound || colMap['code'] === undefined) {
            Swal.fire('ข้อผิดพลาด', 'รูปแบบไฟล์ไม่ถูกต้อง ไม่พบคอลัมน์ Item Code', 'error');
            return;
        }

        for (let i = 0; i < rawRows.length; i++) {
            let row = rawRows[i];
            let itemCode = row[colMap['code']];
            if (!itemCode || String(itemCode).toLowerCase().includes('item code')) continue;

            this.parsedData.push({
                item_code: String(itemCode).trim(),
                item_name: String(row[colMap['name']] || '').trim(),
                description: String(row[colMap['desc']] || '').trim(),
                supplier: String(row[colMap['sup']] || '').trim(),
                unit_price: parseFloat(row[colMap['price']]) || 0,
                uom: String(row[colMap['uom']] || 'PCS').trim().toUpperCase(),
                min_stock: parseFloat(row[colMap['min']]) || 0,
                max_stock: parseFloat(row[colMap['max']]) || 0
            });
        }
        this.renderPreview();
    },

    renderPreview() {
        const tbody = document.getElementById('mtPreviewTbody');
        if (this.parsedData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger align-middle" style="height: 250px;">ไม่พบข้อมูลที่ถูกต้อง</td></tr>`;
            return;
        }

        tbody.innerHTML = this.parsedData.map(row => `
            <tr>
                <td class="fw-bold text-primary">${row.item_code}</td>
                <td class="fw-bold">${row.item_name}</td>
                <td class="text-truncate" style="max-width: 150px;">${row.description}</td>
                <td>${row.supplier}</td>
                <td class="text-end text-success fw-bold">${row.unit_price.toLocaleString()}</td>
                <td class="text-center">${row.uom}</td>
                <td class="text-center">${row.min_stock} / ${row.max_stock}</td>
            </tr>
        `).join('');

        document.getElementById('mtPreviewCount').innerText = `พบข้อมูล: ${this.parsedData.length} รายการ`;
        document.getElementById('btnSaveMtImport').classList.remove('d-none');
    },

    async submitToDatabase() {
        if (this.parsedData.length === 0) return;
        
        const btn = document.getElementById('btnSaveMtImport');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';
        btn.disabled = true;

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const res = await fetch(`${MtAPI.url}?action=import_mt_items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ items: this.parsedData })
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('สำเร็จ', `นำเข้าข้อมูล ${this.parsedData.length} รายการเรียบร้อย`, 'success');
                const modalElement = document.getElementById('importMtItemModal');
                bootstrap.Modal.getOrCreateInstance(modalElement).hide();
                MtMasterCtrl.loadData(); 
            } else {
                Swal.fire('ข้อผิดพลาด', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('ข้อผิดพลาด', 'ระบบเครือข่ายมีปัญหา', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-save me-1"></i> บันทึกข้อมูล';
            btn.disabled = false;
        }
    }
};

const MtApp = {
    stockData: [],

    async init() {
        this.setupEvents();
        await MtModal.prepareMasterData(); 
        
        await this.refreshData();
        await MtMasterCtrl.loadData();
        await MtHistoryCtrl.loadData();
        MtModal.bindDatalistEvents(); 
    },

    setupEvents() {
        const triggerOnhandFilter = () => {
            const searchTerm = document.getElementById('onhandSearch')?.value.toLowerCase() || '';
            const locId = document.getElementById('onhandLocationFilter')?.value || '';
            MtUI.renderTable(this.stockData, searchTerm, locId);
        };

        document.getElementById('onhandSearch')?.addEventListener('input', triggerOnhandFilter);
        document.getElementById('onhandLocationFilter')?.addEventListener('change', triggerOnhandFilter);

        document.getElementById('masterSearch')?.addEventListener('input', (e) => {
            MtMasterCtrl.renderTable(e.target.value.toLowerCase());
        });

        document.getElementById('historySearch')?.addEventListener('input', (e) => {
            MtHistoryCtrl.renderTable(e.target.value.toLowerCase());
        });

        document.getElementById('formReceive')?.addEventListener('submit', (e) => MtModal.submitTransaction(e, 'formReceive', 'RECEIVE'));
        document.getElementById('formIssue')?.addEventListener('submit', (e) => MtModal.submitTransaction(e, 'formIssue', 'ISSUE'));
        document.getElementById('formMtAdjust')?.addEventListener('submit', (e) => MtModal.submitTransaction(e, 'formMtAdjust', 'ADJUST'));
        document.getElementById('formMtItem')?.addEventListener('submit', (e) => MtMasterCtrl.submit(e));
    },

    async refreshData() {
        if(typeof showSpinner === 'function') showSpinner();
        const json = await MtAPI.getOnhand();
        
        if (json.success) {
            this.stockData = json.data;
            const searchTerm = document.getElementById('onhandSearch')?.value.toLowerCase() || '';
            const locId = document.getElementById('onhandLocationFilter')?.value || '';
            MtUI.renderTable(this.stockData, searchTerm, locId);
            MtUI.updateStats(this.stockData);

            const timeEl = document.getElementById('lastSyncTime');
            if (timeEl) timeEl.textContent = new Date().toLocaleTimeString('th-TH');
        } else {
            if(typeof showToast === 'function') showToast('ไม่สามารถโหลดข้อมูลสต๊อกได้', 'danger');
        }
        if(typeof hideSpinner === 'function') hideSpinner();
    }
};

window.StockManager = {
    openReceiveModal: () => MtModal.openModal('RECEIVE'),
    openIssueModal: () => MtModal.openModal('ISSUE'),
    openAdjustModal: () => MtModal.openModal('ADJUST'),
    openSpecificAdjust: (itemId, locId) => MtModal.openModal('ADJUST', itemId, locId)
};

window.MtMasterCtrl = MtMasterCtrl;
window.MtHistoryCtrl = MtHistoryCtrl;
window.MtStockTakeCtrl = MtStockTakeCtrl;
window.MtImportCtrl = MtImportCtrl;
window.MtApp = MtApp;

document.addEventListener('DOMContentLoaded', () => MtApp.init());