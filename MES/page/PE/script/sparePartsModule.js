// sparePartsModule.js — Spare Parts & Inventory Module
const SparePartsModule = (() => {
    let allData = [];
    let allMasterData = [];
    let allHistoryData = [];
    let txCart = [];

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
            const minStock = parseFloat(r.min_stock) || 0;
            const onHand = parseFloat(r.onhand_qty) || 0;
            const isLow = minStock > 0 && onHand <= minStock;
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
            window.spMasterLocations = res.data.locations || [];
            
            const datalist = document.getElementById('spTxItemList');
            datalist.innerHTML = '';
            window.spTextToIdMap = new Map();
            (res.data.items || []).forEach(i => {
                const text = `[${i.item_code}] ${i.item_name}`;
                window.spTextToIdMap.set(text, i.item_id);
                const opt = document.createElement('option');
                    opt.value = text;
                    datalist.appendChild(opt);
            });
                
            const locSel = document.getElementById('spTxLocation');
            locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>' + 
                window.spMasterLocations.map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');
                
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
        document.getElementById('spTxSaveBtn').innerHTML = type === 'RECEIVE' ? '<i class="fas fa-check-circle me-1"></i> ยืนยันรับเข้า (Receive)' : '<i class="fas fa-check-circle me-1"></i> ยืนยันการเบิก (Issue)';
        
        // Reset form & cart
        txCart = [];
        resetAddItemForm();
        document.getElementById('spTxNotes').value = '';
        document.getElementById('spTxWoId').value = '';
        renderCart();
        
        document.getElementById('spTxWoGroup').style.display = type === 'ISSUE' ? 'block' : 'none';
        
        await loadMasterData();
        if (type === 'ISSUE') await loadActiveWorkOrders();
        
        PEApp.showModal('spTxModal');
    }

    function resetAddItemForm() {
        document.getElementById('spTxItemInput').value = '';
        document.getElementById('spTxItem').value = '';
        document.getElementById('spTxLocation').innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
        document.getElementById('spTxQty').value = '';
        const imgWrapper = document.getElementById('spTxItemImageWrapper');
        if (imgWrapper) imgWrapper.innerHTML = '<i class="fas fa-image text-muted"></i>';
    }

    async function onItemInput() {
        const text = document.getElementById('spTxItemInput').value;
        const itemId = window.spTextToIdMap?.get(text) || '';
        document.getElementById('spTxItem').value = itemId;

        const imgWrapper = document.getElementById('spTxItemImageWrapper');
        if (itemId) {
            const itemObj = allMasterData.find(x => x.item_id == itemId);
            if (itemObj && itemObj.image_path) {
                imgWrapper.innerHTML = `<img src="${itemObj.image_path}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
            } else {
                imgWrapper.innerHTML = '<i class="fas fa-image text-muted"></i>';
            }
        } else {
            imgWrapper.innerHTML = '<i class="fas fa-image text-muted"></i>';
        }

        const txType = document.getElementById('spTxType').value;
        const locSel = document.getElementById('spTxLocation');
        
        if (!itemId) {
            locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>' + 
                (window.spMasterLocations || []).map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('');
            return;
        }

        if (txType === 'ISSUE') {
            try {
                const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_available_parts' });
                const parts = (res.data || []).filter(p => p.item_id == itemId);
                
                locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
                if (parts.length > 0) {
                    parts.forEach(loc => {
                        locSel.add(new Option(`${loc.location_name} (คงเหลือ: ${parseFloat(loc.onhand_qty)} ${loc.uom || ''})`, loc.location_id));
                    });
                    if (parts.length === 1) {
                        locSel.value = parts[0].location_id;
                    }
                } else {
                    locSel.innerHTML += '<option value="" disabled>-- ไม่มีสต๊อกในทุกคลัง --</option>';
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            // RECEIVE - Show all locations, optionally fetch current stock to display
            try {
                const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_available_parts' });
                const parts = (res.data || []).filter(p => p.item_id == itemId);
                
                locSel.innerHTML = '<option value="">-- เลือกคลังจัดเก็บ --</option>';
                (window.spMasterLocations || []).forEach(l => {
                    const stock = parts.find(p => p.location_id == l.location_id);
                    const qtyStr = stock ? ` (คงเหลือ: ${parseFloat(stock.onhand_qty)} ${stock.uom || ''})` : '';
                    locSel.add(new Option(`${l.location_name}${qtyStr}`, l.location_id));
                });
            } catch(e) {
                console.error(e);
            }
        }
    }

    function openReceiveModal() {
        openModal('RECEIVE');
    }

    function openIssueModal() {
        openModal('ISSUE');
    }
    
    function addToCart() {
        const itemId = document.getElementById('spTxItem').value;
        const locationId = document.getElementById('spTxLocation').value;
        let qty = parseFloat(document.getElementById('spTxQty').value);
        
        if (!itemId || !locationId || !qty || qty <= 0) {
            PEApp.showToast('กรุณากรอกข้อมูลให้ครบถ้วน (Item, Location, Quantity)', 'warning');
            return;
        }

        const itemObj = allMasterData.find(x => x.item_id == itemId);
        const locObj = window.spMasterLocations.find(x => x.location_id == locationId);
        
        const itemName = itemObj ? itemObj.item_name : document.getElementById('spTxItemInput').value;
        const locName = locObj ? locObj.location_name : 'Unknown Location';
        const imagePath = itemObj ? itemObj.image_path : null;

        // Check if exists in cart
        const existingIdx = txCart.findIndex(x => x.item_id == itemId && x.location_id == locationId);
        if (existingIdx !== -1) {
            txCart[existingIdx].quantity += qty;
        } else {
            txCart.push({
                item_id: itemId,
                item_name: itemName,
                image_path: imagePath,
                location_id: locationId,
                location_name: locName,
                quantity: qty
            });
        }
        
        renderCart();
        resetAddItemForm();
    }

    function renderCart() {
        const tbody = document.getElementById('spTxCartBody');
        const countSpan = document.getElementById('spTxCartCount');
        
        countSpan.textContent = txCart.length;
        
        if (txCart.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No items added yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = txCart.map((item, index) => {
            const imgHtml = item.image_path 
                ? `<img src="${item.image_path}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px;">` 
                : `<div style="width: 32px; height: 32px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image text-muted" style="font-size:12px;"></i></div>`;
            return `
            <tr>
                <td>${imgHtml}</td>
                <td class="text-truncate" style="max-width: 150px;" title="${PEApp.escapeHtml(item.item_name)}">${PEApp.escapeHtml(item.item_name)}</td>
                <td>${PEApp.escapeHtml(item.location_name)}</td>
                <td class="text-end fw-bold">${PEApp.formatNumber(item.quantity)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger" onclick="SparePartsModule.removeCartItem(${index})"><i class="fas fa-times"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    function removeCartItem(index) {
        txCart.splice(index, 1);
        renderCart();
    }
    
    async function submitTransaction() {
        if (txCart.length === 0) {
            PEApp.showToast('รายการเบิก/รับว่างเปล่า กรุณาเพิ่มอะไหล่อย่างน้อย 1 รายการ', 'warning');
            return;
        }

        const payload = {
            action: 'process_transaction',
            transaction_type: document.getElementById('spTxType').value,
            items: txCart,
            notes: document.getElementById('spTxNotes').value,
            ref_job_id: document.getElementById('spTxWoId').value || null
        };
        
        const btn = document.getElementById('spTxSaveBtn');
        btn.disabled = true;
        
        try {
            await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', payload);
            PEApp.showToast(`ทำรายการ ${payload.transaction_type} สำเร็จ (${txCart.length} รายการ)`, 'success');
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

    function switchTab(tab) {
        if (tab === 'master') {
            loadMasterList();
        } else if (tab === 'history') {
            loadHistory();
        }
    }

    async function loadMasterList() {
        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_mt_items' });
            allMasterData = res.data || [];
            renderMasterTable();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function filterMasterTable() {
        const q = (document.getElementById('spMasterSearchInput')?.value || '').toLowerCase();
        renderMasterTable(q);
    }

    function renderMasterTable(searchQuery = '') {
        const tbody = document.getElementById('spMasterTableBody');
        if (!tbody) return;

        let filtered = allMasterData;
        if (searchQuery) {
            filtered = filtered.filter(r =>
                (r.item_code || '').toLowerCase().includes(searchQuery) ||
                (r.item_name || '').toLowerCase().includes(searchQuery) ||
                (r.supplier || '').toLowerCase().includes(searchQuery)
            );
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="pe-text-center pe-text-muted" style="padding:60px;">No items found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            const isActive = parseInt(r.is_active) === 1;
            const statusBadge = isActive ? '<span class="pe-badge pe-status-active">Active</span>' : '<span class="pe-badge pe-status-inactive">Inactive</span>';
            const imgHtml = r.image_path ? `<img src="../../../${r.image_path}" class="rounded me-2" style="width:40px;height:40px;object-fit:cover;border:1px solid #ddd;">` : `<div class="rounded me-2 d-inline-flex align-items-center justify-content-center text-muted" style="width:40px;height:40px;background:#f8f9fa;border:1px dashed #ddd;"><i class="fas fa-image"></i></div>`;
            return `
            <tr>
                <td class="pe-fw-bold">${PEApp.escapeHtml(r.item_code)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        ${imgHtml}
                        <span>${PEApp.escapeHtml(r.item_name)}</span>
                    </div>
                </td>
                <td class="pe-text-sm pe-text-muted">${PEApp.escapeHtml(r.description || '-')}</td>
                <td class="pe-text-sm">${PEApp.escapeHtml(r.supplier || '-')}</td>
                <td class="pe-text-end">${PEApp.formatCurrency(r.unit_price || 0)}</td>
                <td class="pe-text-center pe-text-sm">${PEApp.formatNumber(r.min_stock)} / ${PEApp.formatNumber(r.max_stock)}</td>
                <td class="pe-text-center">${statusBadge}</td>
                <td class="pe-text-center">
                    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SparePartsModule.openItemModal('${r.item_id}')" title="Edit"><i class="fas fa-edit pe-text-primary"></i></button>
                    <button class="pe-btn pe-btn-ghost pe-btn-sm" onclick="SparePartsModule.toggleItemStatus('${r.item_id}')" title="Toggle Status"><i class="fas fa-power-off ${isActive ? 'pe-text-danger' : 'pe-text-success'}"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    function openItemModal(id = null) {
        const form = document.getElementById('formMtItem');
        form.reset();
        
        const preview = document.getElementById('mt_image_preview');
        const placeholder = document.getElementById('mt_image_placeholder');
        
        if (id) {
            const item = allMasterData.find(x => x.item_id == id);
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
                
                if (item.image_path) {
                    preview.src = '../../../' + item.image_path;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';
                } else {
                    preview.src = '';
                    preview.style.display = 'none';
                    placeholder.style.display = 'flex';
                }
            }
        } else {
            document.getElementById('mt_item_id').value = '';
            preview.src = '';
            preview.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        form.onsubmit = saveItem;
        PEApp.showModal('modalMtItem');
    }

    function previewImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('mt_image_preview');
                const placeholder = document.getElementById('mt_image_placeholder');
                preview.src = e.target.result;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    async function saveItem(e) {
        e.preventDefault();
        
        const form = document.getElementById('formMtItem');
        const formData = new FormData(form);
        formData.append('action', 'save_mt_item');

        try {
            const response = await fetch('api/sparePartsAPI.php', {
                method: 'POST',
                body: formData
            });
            const res = await response.json();
            
            if (!res.success) {
                throw new Error(res.message || 'Unknown error');
            }
            
            PEApp.showToast(res.message || 'บันทึกข้อมูลสำเร็จ', 'success');
            PEApp.hideModal('modalMtItem');
            loadMasterList();
            loadData(); 
        } catch(err) {
            PEApp.showToast(err.message, 'error');
        }
    }

    async function toggleItemStatus(id) {
        if (!confirm('ยืนยันการเปลี่ยนสถานะการใช้งาน?')) return;
        try {
            await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', { action: 'toggle_mt_item', item_id: id });
            PEApp.showToast('เปลี่ยนสถานะเรียบร้อย', 'success');
            loadMasterList();
            loadData();
        } catch(err) {
            PEApp.showToast(err.message, 'error');
        }
    }

    function exportMasterExcel() {
        if (!allMasterData.length) { PEApp.showToast('No data', 'warning'); return; }
        if (typeof XLSX === 'undefined') return;

        const ws = XLSX.utils.json_to_sheet(allMasterData.map(r => ({
            'Item Code': r.item_code, 'Item Name': r.item_name, 'Description': r.description,
            'Supplier': r.supplier, 'Unit Price': r.unit_price, 'UoM': r.uom,
            'Min': r.min_stock, 'Max': r.max_stock, 'Active': parseInt(r.is_active) === 1 ? 'Y' : 'N'
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Item Master');
        XLSX.writeFile(wb, `ItemMaster_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    async function importMasterExcel(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (!json || json.length === 0) {
                    throw new Error("No data found in the Excel file.");
                }

                // Check columns
                const firstRow = json[0];
                if (!('Item Code' in firstRow)) {
                    throw new Error("Invalid format: 'Item Code' column is missing.");
                }

                // Call API
                PEApp.showToast('กำลังนำเข้าข้อมูล...', 'info');
                await PEApp.apiCall('sparePartsAPI.php', {}, 'POST', {
                    action: 'import_mt_items',
                    data: json
                });

                PEApp.showToast('นำเข้าข้อมูลเรียบร้อยแล้ว', 'success');
                loadMasterList();
                loadData();
            } catch (err) {
                PEApp.showToast(err.message, 'error');
            } finally {
                event.target.value = ''; // Reset input
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function loadHistory() {
        try {
            const res = await PEApp.apiCall('sparePartsAPI.php', { action: 'get_transactions' });
            allHistoryData = res.data || [];
            renderHistoryTable();
        } catch (e) {
            PEApp.showToast(e.message, 'error');
        }
    }

    function filterHistoryTable() {
        const q = (document.getElementById('spHistorySearchInput')?.value || '').toLowerCase();
        renderHistoryTable(q);
    }

    function renderHistoryTable(searchQuery = '') {
        const tbody = document.getElementById('spHistoryTableBody');
        if (!tbody) return;

        let filtered = allHistoryData;
        if (searchQuery) {
            filtered = filtered.filter(r =>
                (r.item_code || '').toLowerCase().includes(searchQuery) ||
                (r.item_name || '').toLowerCase().includes(searchQuery) ||
                (r.created_by_name || '').toLowerCase().includes(searchQuery) ||
                (r.wo_number || '').toLowerCase().includes(searchQuery) ||
                (r.machine_code || '').toLowerCase().includes(searchQuery)
            );
        }

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="pe-text-center pe-text-muted" style="padding:60px;">No transactions found</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(r => {
            let typeBadge = '';
            let qtyClass = '';
            if (r.transaction_type === 'RECEIVE') {
                typeBadge = '<span class="pe-badge pe-status-active"><i class="fas fa-arrow-down me-1"></i>IN</span>';
                qtyClass = 'text-success fw-bold';
            } else if (r.transaction_type === 'ISSUE') {
                typeBadge = '<span class="pe-badge pe-status-inactive"><i class="fas fa-arrow-up me-1"></i>OUT</span>';
                qtyClass = 'text-danger fw-bold';
            } else {
                typeBadge = `<span class="pe-badge" style="background:#6c757d;color:#fff;">${r.transaction_type}</span>`;
                qtyClass = 'pe-text-muted';
            }
            
            const jobStr = r.wo_number ? `<b>[${r.wo_number}]</b> ${r.machine_code}<br><small class="text-muted">${r.issue_title}</small>` : '-';
            const dateStr = new Date(r.created_at).toLocaleString('en-GB');

            return `
            <tr>
                <td class="pe-text-sm">${dateStr}</td>
                <td>${typeBadge}</td>
                <td>
                    <b>${PEApp.escapeHtml(r.item_code)}</b><br>
                    <span class="pe-text-sm pe-text-muted">${PEApp.escapeHtml(r.item_name)}</span>
                </td>
                <td class="pe-text-sm">${PEApp.escapeHtml(r.location_name || '-')}</td>
                <td class="pe-text-end ${qtyClass}">${PEApp.formatNumber(Math.abs(r.quantity))} <span class="pe-text-xs pe-text-muted">${PEApp.escapeHtml(r.uom)}</span></td>
                <td class="pe-text-sm">${PEApp.escapeHtml(r.created_by_name || 'System')}</td>
                <td class="pe-text-sm">${r.notes ? `<i>${PEApp.escapeHtml(r.notes)}</i><br>` : ''}${jobStr}</td>
            </tr>`;
        }).join('');
    }

    return { 
        loadData, filterTable, openReceiveModal, openIssueModal, submitTransaction, exportExcel, onItemInput,
        switchTab, loadMasterList, filterMasterTable, renderMasterTable, openItemModal, saveItem, toggleItemStatus, exportMasterExcel, importMasterExcel,
        loadHistory, filterHistoryTable, renderHistoryTable, previewImage, addToCart, removeCartItem
    };
})();

window.SparePartsModule = SparePartsModule;
export default SparePartsModule;
