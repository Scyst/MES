// sparePartsModule.js — Spare Parts & Inventory Module
const SparePartsModule = (() => {
    let allData = [];

    async function loadData() {
        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_onhand' });
            allData = res.data || [];
            const kpi = res.kpi || {};

            // KPIs
            PEApp.animateValue(document.getElementById('kpiTotalSKU'), 0, kpi.total_sku || 0);
            PEApp.animateValue(document.getElementById('kpiLowStock'), 0, kpi.low_stock || 0);
            const valEl = document.getElementById('kpiTotalValue');
            if (valEl) valEl.textContent = PEApp.formatCurrency(kpi.total_value || 0);

            // Low stock badge
            const badge = document.getElementById('lowStockBadge');
            if (badge) {
                badge.textContent = kpi.low_stock || 0;
                badge.style.display = (kpi.low_stock || 0) > 0 ? '' : 'none';
            }

            // Locations filter
            const locSel = document.getElementById('spFilterLocation');
            if (locSel && locSel.options.length <= 1) {
                (res.locations || []).forEach(l => {
                    locSel.add(new Option(l.location_name, l.location_id));
                });
            }

            document.getElementById('spLastSync').textContent = new Date().toLocaleTimeString('th-TH');
            renderTable();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function filterTable() {
        const q = (document.getElementById('spSearchInput')?.value || '').toLowerCase();
        renderTable(q);
    }

    function renderTable(searchQuery = '') {
        const tbody = document.getElementById('spTableBody');
        if (!tbody) return;
        const locFilter = document.getElementById('spFilterLocation')?.value || '';

        let filtered = allData;
        if (locFilter) filtered = filtered.filter(r => r.location_id == locFilter);
        if (searchQuery) {
            filtered = filtered.filter(r =>
                (r.item_code || '').toLowerCase().includes(searchQuery) ||
                (r.item_name || '').toLowerCase().includes(searchQuery) ||
                (r.description || '').toLowerCase().includes(searchQuery));
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="pe-text-center pe-text-muted" style="padding:60px;">No items found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const isLow = r.min_stock > 0 && r.onhand_qty <= r.min_stock;
            return `
            <tr ${isLow ? 'style="background:var(--pe-danger-light);"' : ''}>
                <td class="pe-fw-bold">${PEApp.escapeHtml(r.item_code)}</td>
                <td>${PEApp.escapeHtml(r.item_name)}</td>
                <td class="pe-text-sm pe-text-muted">${PEApp.escapeHtml(r.description || '-')}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(r.location_name || '-')}</td>
                <td class="pe-text-center pe-text-sm">${PEApp.formatNumber(r.min_stock)} / ${PEApp.formatNumber(r.max_stock)}</td>
                <td class="pe-text-end pe-fw-bold ${isLow ? 'pe-text-danger' : ''}">${PEApp.formatNumber(r.onhand_qty)}</td>
                <td class="pe-text-center pe-text-sm">${PEApp.escapeHtml(r.uom || '-')}</td>
                <td class="pe-text-center">
                    ${isLow ? '<span class="pe-badge pe-priority-high" style="font-size:10px;"><i class="fas fa-exclamation-triangle me-1"></i>Low</span>' : '<span class="pe-badge pe-status-active" style="font-size:10px;">OK</span>'}
                </td>
            </tr>`;
        }).join('');
    }

    async function loadMasterData() {
        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_master_data' });
            
            const itemSel = document.getElementById('spTxItem');
            itemSel.innerHTML = '<option value="">-- เลือกอะไหล่ --</option>' + 
                (res.data.items || []).map(i => `<option value="${i.item_id}">[${i.item_code}] ${i.item_name} (${i.uom})</option>`).join('');
                
            const locSel = document.getElementById('spTxLocation');
            locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>' + 
                (res.data.locations || []).map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');
                
        } catch (e) {
            console.error('Error loading master data:', e);
        }
    }
    
    async function loadActiveWorkOrders() {
        try {
            const res = await PEApp.apiCall('workOrderAPI.php', { action: 'get_work_orders', status: 'Active' });
            const woSel = document.getElementById('spTxWoId');
            woSel.innerHTML = '<option value="">-- ไม่ระบุ --</option>' + 
                (res.data || []).map(w => `<option value="${w.wo_id}">[${w.wo_number}] ${w.machine_code} - ${w.issue_title}</option>`).join('');
        } catch (e) {
            console.error('Error loading WOs:', e);
        }
    }

    async function openModal(type) {
        document.getElementById('spTxType').value = type;
        document.getElementById('spTxModalTitle').innerHTML = type === 'RECEIVE' ? '<i class="fas fa-arrow-down pe-text-success"></i> รับอะไหล่เข้าคลัง (Receive)' : '<i class="fas fa-arrow-up pe-text-danger"></i> เบิกอะไหล่ (Issue)';
        document.getElementById('spTxSaveBtn').innerHTML = type === 'RECEIVE' ? '<i class="fas fa-plus me-1"></i> ยืนยันรับเข้า' : '<i class="fas fa-minus me-1"></i> ยืนยันการเบิก';
        
        // Reset form
        document.getElementById('spTxItem').value = '';
        document.getElementById('spTxLocation').value = '';
        document.getElementById('spTxQty').value = '';
        document.getElementById('spTxNotes').value = '';
        document.getElementById('spTxWoId').value = '';
        
        document.getElementById('spTxWoGroup').style.display = type === 'ISSUE' ? 'block' : 'none';
        
        await loadMasterData();
        if (type === 'ISSUE') await loadActiveWorkOrders();
        
        PEApp.showModal('spTxModal');
    }

    function openReceiveModal() {
        openModal('RECEIVE');
    }

    function openIssueModal() {
        openModal('ISSUE');
    }
    
    async function submitTransaction() {
        const payload = {
            action: 'process_transaction',
            transaction_type: document.getElementById('spTxType').value,
            item_id: document.getElementById('spTxItem').value,
            location_id: document.getElementById('spTxLocation').value,
            quantity: document.getElementById('spTxQty').value,
            notes: document.getElementById('spTxNotes').value,
            ref_job_id: document.getElementById('spTxWoId').value || null
        };
        
        if (!payload.item_id || !payload.location_id || !payload.quantity || payload.quantity <= 0) {
            PEApp.showToast('กรุณากรอกข้อมูลให้ครบถ้วน (Item, Location, Quantity)', 'warning');
            return;
        }

        const btn = document.getElementById('spTxSaveBtn');
        btn.disabled = true;
        
        try {
            await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', payload);
            PEApp.showToast(`ทำรายการ ${payload.transaction_type} สำเร็จ`, 'success');
            PEApp.hideModal('spTxModal');
            loadData();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        } finally {
            btn.disabled = false;
        }
    }

    function exportExcel() {
        if (!allData.length) { PEApp.showToast('No data', 'warning'); return; }
        if (typeof XLSX === 'undefined') return;

        const ws = XLSX.utils.json_to_sheet(allData.map(r => ({
            'Item Code': r.item_code, 'Item Name': r.item_name, 'Description': r.description,
            'Location': r.location_name, 'Min': r.min_stock, 'Max': r.max_stock,
            'On-Hand': r.onhand_qty, 'Unit': r.uom, 'Unit Price': r.unit_price
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Spare Parts');
        XLSX.writeFile(wb, `SpareParts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    return { loadData, filterTable, openReceiveModal, openIssueModal, submitTransaction, exportExcel };
})();
