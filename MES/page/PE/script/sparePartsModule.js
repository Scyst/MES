// sparePartsModule.js — Spare Parts & Inventory Module
const SparePartsModule = (() => {
    let allData = [];
    let allMasterData = [];
    let allHistoryData = [];
    let txCart = [];
    let compressedImageBlob = null;

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

    let currentView = 'grid'; // default view
    let currentMasterView = 'grid';

    function toggleView(view) {
        currentView = view;
        document.getElementById('spGridBody').style.display = view === 'grid' ? 'flex' : 'none';
        document.getElementById('spTableContainer').style.display = view === 'table' ? 'block' : 'none';
        
        document.getElementById('btnViewGrid').classList.toggle('active', view === 'grid');
        document.getElementById('btnViewTable').classList.toggle('active', view === 'table');
    }

    function renderTable(searchQuery = '') {
        const gridBody = document.getElementById('spGridBody');
        const tableBody = document.getElementById('spTableBody');
        if (!gridBody || !tableBody) return;
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
            gridBody.innerHTML = `<div class="col-12 text-center text-muted py-5">No items found</div>`;
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">No items found</td></tr>`;
            return;
        }

        let gridHtml = '';
        let tableHtml = '';

        filtered.forEach(r => {
            const minStock = parseFloat(r.min_stock) || 0;
            const onHand = parseFloat(r.onhand_qty) || 0;
            const isLow = minStock > 0 && onHand <= minStock;
            
            // Grid HTML
            let imagePath = r.image_path || (allMasterData && allMasterData.find(x => x.item_id == r.item_id)?.image_path) || null;
            const imgHtml = imagePath 
                ? `<img src="../../${imagePath}" style="width:100%; height:180px; object-fit:cover;" class="card-img-top" alt="Item">` 
                : `<div class="d-flex align-items-center justify-content-center bg-light text-muted" style="width:100%; height:180px; font-size:3rem;"><i class="fas fa-box-open"></i></div>`;

            gridHtml += `
            <div class="col">
                <div class="card h-100 shadow-sm border-0 position-relative ${isLow ? 'border border-danger' : ''}">
                    ${isLow ? '<span class="badge bg-danger position-absolute top-0 start-0 m-2 shadow" style="z-index:2;"><i class="fas fa-exclamation-triangle"></i> Low Stock</span>' : ''}
                    ${imgHtml}
                    <div class="card-body d-flex flex-column p-3">
                        <div class="text-muted pe-text-xs fw-bold mb-1">${PEApp.escapeHtml(r.item_code)}</div>
                        <h6 class="card-title fw-bold text-dark text-truncate mb-1" title="${PEApp.escapeHtml(r.item_name)}">${PEApp.escapeHtml(r.item_name)}</h6>
                        <p class="card-text pe-text-xs text-muted mb-2 text-truncate" title="${PEApp.escapeHtml(r.description || '')}">${PEApp.escapeHtml(r.description || '-')}</p>
                        
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-end mb-2">
                                <div class="pe-text-xs text-muted">
                                    <i class="fas fa-map-marker-alt text-primary"></i> ${PEApp.escapeHtml(r.location_name || '-')}
                                </div>
                                <div class="text-end">
                                    <span class="fs-5 fw-bold ${isLow ? 'text-danger' : 'text-success'}">${PEApp.formatNumber(r.onhand_qty)}</span>
                                    <span class="pe-text-xs text-muted">${PEApp.escapeHtml(r.uom || '')}</span>
                                </div>
                            </div>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-success w-50" onclick="SparePartsModule.openReceiveModal('${r.item_id}', '${r.location_id}')"><i class="fas fa-arrow-down"></i> รับ</button>
                                <button class="btn btn-sm btn-outline-danger w-50" onclick="SparePartsModule.openIssueModal('${r.item_id}', '${r.location_id}')"><i class="fas fa-arrow-up"></i> เบิก</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            // Table HTML
            tableHtml += `
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
        });

        gridBody.innerHTML = gridHtml;
        tableBody.innerHTML = tableHtml;
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

    async function openModal(type, initialItemId = null, initialLocationId = null) {
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
        
        if (initialItemId) {
            const itemObj = allMasterData.find(x => x.item_id == initialItemId);
            if (itemObj) {
                document.getElementById('spTxItemInput').value = `[${itemObj.item_code}] ${itemObj.item_name}`;
                document.getElementById('spTxItem').value = initialItemId;
                await onItemInput();
                
                if (initialLocationId) {
                    document.getElementById('spTxLocation').value = initialLocationId;
                }
            }
        }
        
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

    function openReceiveModal(itemId = null, locationId = null) {
        openModal('RECEIVE', itemId, locationId);
    }

    function openIssueModal(itemId = null, locationId = null) {
        openModal('ISSUE', itemId, locationId);
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

    function toggleMasterView(view) {
        currentMasterView = view;
        document.getElementById('spMasterGridBody').style.display = view === 'grid' ? 'flex' : 'none';
        document.getElementById('spMasterTableContainer').style.display = view === 'table' ? 'block' : 'none';
        
        document.getElementById('btnMasterViewGrid').classList.toggle('active', view === 'grid');
        document.getElementById('btnMasterViewTable').classList.toggle('active', view === 'table');
    }

    function renderMasterTable(searchQuery = '') {
        const gridBody = document.getElementById('spMasterGridBody');
        const tableBody = document.getElementById('spMasterTableBody');
        if (!gridBody || !tableBody) return;

        let filtered = allMasterData;
        if (searchQuery) {
            filtered = filtered.filter(r =>
                (r.item_code || '').toLowerCase().includes(searchQuery) ||
                (r.item_name || '').toLowerCase().includes(searchQuery) ||
                (r.supplier || '').toLowerCase().includes(searchQuery)
            );
        }

        if (!filtered.length) {
            gridBody.innerHTML = `<div class="col-12 text-center text-muted py-5">No items found</div>`;
            tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-5">No items found</td></tr>`;
            return;
        }

        let gridHtml = '';
        let tableHtml = '';

        filtered.forEach(r => {
            const isActive = parseInt(r.is_active) === 1;
            const imgHtml = r.image_path 
                ? `<img src="../../${r.image_path}" style="width:100%; height:180px; object-fit:cover;" class="card-img-top" alt="Item">` 
                : `<div class="d-flex align-items-center justify-content-center bg-light text-muted" style="width:100%; height:180px; font-size:3rem;"><i class="fas fa-image"></i></div>`;
            
            // Grid HTML
            gridHtml += `
            <div class="col">
                <div class="card h-100 shadow-sm border-0 position-relative ${!isActive ? 'opacity-50' : ''}">
                    ${!isActive ? '<span class="badge bg-secondary position-absolute top-0 start-0 m-2 shadow" style="z-index:2;">Inactive</span>' : ''}
                    ${imgHtml}
                    <div class="card-body d-flex flex-column p-3">
                        <div class="text-muted pe-text-xs fw-bold mb-1">${PEApp.escapeHtml(r.item_code)}</div>
                        <h6 class="card-title fw-bold text-dark text-truncate mb-1" title="${PEApp.escapeHtml(r.item_name)}">${PEApp.escapeHtml(r.item_name)}</h6>
                        <p class="card-text pe-text-xs text-muted mb-2 text-truncate" title="${PEApp.escapeHtml(r.description || '')}">${PEApp.escapeHtml(r.description || '-')}</p>
                        
                        <div class="mt-auto">
                            <div class="d-flex justify-content-between align-items-end mb-2">
                                <div class="text-primary fw-bold pe-text-sm">
                                    ฿${PEApp.formatCurrency(r.unit_price || 0)}
                                </div>
                                <div class="pe-text-xs text-muted">
                                    Min: ${PEApp.formatNumber(r.min_stock)}
                                </div>
                            </div>
                            <div class="d-flex gap-1">
                                <button class="btn btn-sm btn-outline-primary w-50" onclick="SparePartsModule.openItemModal('${r.item_id}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn btn-sm ${isActive ? 'btn-outline-danger' : 'btn-outline-success'} w-50" onclick="SparePartsModule.toggleItemStatus('${r.item_id}')">
                                    <i class="fas fa-power-off"></i> ${isActive ? 'Disable' : 'Enable'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            // Table HTML
            const statusBadge = isActive ? '<span class="pe-badge pe-status-active">Active</span>' : '<span class="pe-badge pe-status-inactive">Inactive</span>';
            const tableImgHtml = r.image_path ? `<img src="../../${r.image_path}" class="rounded me-2" style="width:40px;height:40px;object-fit:cover;border:1px solid #ddd;">` : `<div class="rounded me-2 d-inline-flex align-items-center justify-content-center text-muted" style="width:40px;height:40px;background:#f8f9fa;border:1px dashed #ddd;"><i class="fas fa-image"></i></div>`;
            tableHtml += `
            <tr>
                <td class="pe-fw-bold">${PEApp.escapeHtml(r.item_code)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        ${tableImgHtml}
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
        });

        gridBody.innerHTML = gridHtml;
        tableBody.innerHTML = tableHtml;
    }

    function openItemModal(id = null) {
        const form = document.getElementById('formMtItem');
        form.reset();
        
        compressedImageBlob = null;
        
        const preview = document.getElementById('mt_image_preview');
        const previewContainer = document.getElementById('mt_image_preview_container');
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
                    preview.src = '../../' + item.image_path;
                    previewContainer.style.display = 'block';
                    placeholder.style.display = 'none';
                } else {
                    preview.src = '';
                    previewContainer.style.display = 'none';
                    placeholder.style.display = 'flex';
                }
            }
        } else {
            document.getElementById('mt_item_id').value = '';
            preview.src = '';
            previewContainer.style.display = 'none';
            placeholder.style.display = 'flex';
        }

        form.onsubmit = saveItem;
        PEApp.showModal('modalMtItem');
    }

    function previewImage(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        compressedImageBlob = blob;
                    }, 'image/jpeg', 0.8);

                    const preview = document.getElementById('mt_image_preview');
                    const previewContainer = document.getElementById('mt_image_preview_container');
                    const placeholder = document.getElementById('mt_image_placeholder');
                    preview.src = e.target.result;
                    previewContainer.style.display = 'block';
                    placeholder.style.display = 'none';
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    }

    function removeImage(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        compressedImageBlob = null;
        document.getElementById('mt_image').value = '';
        document.getElementById('mt_image_preview').src = '';
        document.getElementById('mt_image_preview_container').style.display = 'none';
        document.getElementById('mt_image_placeholder').style.display = 'flex';
    }

    async function saveItem(e) {
        e.preventDefault();
        
        const form = document.getElementById('formMtItem');
        const formData = new FormData(form);
        formData.append('action', 'save_mt_item');
        
        if (compressedImageBlob) {
            formData.set('image', compressedImageBlob, 'image.jpg');
        }

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
        loadData, filterTable, toggleView, openReceiveModal, openIssueModal, submitTransaction, exportExcel, onItemInput,
        switchTab, loadMasterList, filterMasterTable, toggleMasterView, renderMasterTable, openItemModal, saveItem, toggleItemStatus, exportMasterExcel, importMasterExcel,
        loadHistory, filterHistoryTable, renderHistoryTable, previewImage, removeImage, addToCart, removeCartItem
    };
})();

window.SparePartsModule = SparePartsModule;
export default SparePartsModule;
