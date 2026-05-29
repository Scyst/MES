//MES/page/storeManagement/script/storeDashboard.js
"use strict";

let currentItems = [];
let chartTrendInst = null;
let chartCatInst = null;
let chartItemsInst = null;
let chartUsersInst = null;

document.addEventListener('DOMContentLoaded', () => {
    let d = new Date(); d.setDate(d.getDate() - 30);
    const startFilter = document.getElementById('global_start');
    const endFilter = document.getElementById('global_end');
    
    if (startFilter) startFilter.value = d.toISOString().split('T')[0];
    if (endFilter) endFilter.value = new Date().toISOString().split('T')[0];

    loadActiveQueue();
    
    setInterval(() => { 
        if (!document.hidden) {
            const filterStatus = document.getElementById('filter_status')?.value;
            if (filterStatus === 'ACTIVE' || filterStatus === 'WAITING') {
                loadActiveQueue(true); 
            }
        }
    }, 60000);

    window.addEventListener('resize', () => {
        const reqId = document.getElementById('current_req_id')?.value;
        switchView(reqId !== '' ? 'form' : 'list');
    });
});

function getIconPlaceholder(category) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CON')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SP')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 
    else if (cat.includes('TOOL')) { icon = 'fa-wrench'; color = '#0dcaf0'; }
    return `<div class="ph-small"><i class="fas ${icon}" style="color:${color}; opacity:0.5; font-size: 1.5rem;"></i></div>`;
}

window.handleDashboardImageError = function(imgElement, category) {
    imgElement.outerHTML = getIconPlaceholder(category);
};

window.triggerGlobalReload = function() {
    const mode = document.getElementById('current_dashboard_mode').value;
    if (mode === 'ANALYTICS') loadAnalytics();
    else if (mode === 'FULFILLMENT') loadFulfillmentData();
    else loadActiveQueue();
};

window.toggleDateFilter = function() {
    const dp = document.getElementById('global-date-filter');
    dp.style.opacity = '1'; 
    dp.style.pointerEvents = 'auto';
};

window.switchDashboardMode = function(mode) {
    document.getElementById('current_dashboard_mode').value = mode;
    document.getElementById('current_req_id').value = ''; 
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    
    const layoutOrder = document.getElementById('order-layout');
    const layoutAnalytics = document.getElementById('analytics-layout');
    const layoutFulfill = document.getElementById('fulfillment-layout');
    const btnExport = document.getElementById('btnExportCSV');
    const dp = document.getElementById('global-date-filter');

    layoutOrder.classList.add('d-none');
    layoutAnalytics.classList.add('d-none');
    if(layoutFulfill) layoutFulfill.classList.add('d-none');
    btnExport.classList.add('d-none');

    dp.style.opacity = '1'; 
    dp.style.pointerEvents = 'auto';

    if (mode === 'STOCK') {
        document.getElementById('tab-stock').classList.add('active');
        layoutOrder.classList.remove('d-none');
        document.querySelectorAll('.opt-k2').forEach(el => el.classList.add('d-none')); 
        document.querySelectorAll('.opt-stock').forEach(el => el.classList.remove('d-none'));
        document.getElementById('filter_status').value = 'ACTIVE'; 
        switchView('list'); loadActiveQueue();
    } 
    else if (mode === 'K2') {
        document.getElementById('tab-k2').classList.add('active');
        layoutOrder.classList.remove('d-none');
        document.querySelectorAll('.opt-stock').forEach(el => el.classList.add('d-none')); 
        document.querySelectorAll('.opt-k2').forEach(el => el.classList.remove('d-none'));
        document.getElementById('filter_status').value = 'WAITING';
        switchView('list'); loadActiveQueue();
    }
    else if (mode === 'ANALYTICS') {
        document.getElementById('tab-analytics').classList.add('active');
        layoutAnalytics.classList.remove('d-none');
        btnExport.classList.remove('d-none');
        loadAnalytics();
    }
    else if (mode === 'FULFILLMENT') {
        document.getElementById('tab-fulfillment').classList.add('active');
        if(layoutFulfill) layoutFulfill.classList.remove('d-none');
        dp.style.opacity = '0.3'; 
        dp.style.pointerEvents = 'none';
        
        const lineSelect = document.getElementById('fulfill_line');
        if (lineSelect && lineSelect.options.length <= 1) {
            fetchAPI('get_master_data', 'GET').then(res => {
                if (res.success && res.data.locations) {
                    const lines = [...new Set(res.data.locations.filter(l => l.production_line).map(l => l.production_line))].sort();
                    lines.forEach(line => {
                        const opt = document.createElement('option');
                        opt.value = line; opt.textContent = line;
                        lineSelect.appendChild(opt);
                    });
                }
            }).catch(e => console.error(e));
        }
    }
};

window.loadActiveQueue = function(isSilent = false) {
    const mode = document.getElementById('current_dashboard_mode').value;
    if (mode === 'STOCK') loadStockOrders(isSilent);
    else loadK2Summary(isSilent);
};

async function loadStockOrders(isSilent) {
    const container = document.getElementById('orderListContainer');
    if (!isSilent) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
    
    try {
        const qs = new URLSearchParams({
            status: document.getElementById('filter_status').value,
            start_date: document.getElementById('global_start').value,
            end_date: document.getElementById('global_end').value
        }).toString();

        const res = await fetchAPI(`get_orders&${qs}`, 'GET');
        let html = '';
        
        if (res.data.length === 0) {
            let emptyText = document.getElementById('filter_status').value === 'ACTIVE' ? 'ไม่มีออเดอร์ค้างจัด' : 'ไม่มีประวัติการเบิกในช่วงนี้';
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-clipboard-check fa-3x mb-2 opacity-25"></i><br><small>${emptyText}</small></div>`;
        } else {
            const currentReqId = document.getElementById('current_req_id').value;
            res.data.forEach(order => {
                let sClass = '', sBadge = '', isPulse = '';
                if (order.status === 'NEW ORDER') { sClass = 'status-new'; sBadge = '<span class="badge bg-danger">NEW</span>'; isPulse = 'pulse-alert'; }
                else if (order.status === 'PREPARING') { sClass = 'status-prep'; sBadge = '<span class="badge bg-warning text-dark">PREPARING</span>'; }
                else if (order.status === 'COMPLETED') { sClass = 'status-comp'; sBadge = '<span class="badge bg-success">COMPLETED</span>'; }
                else { sClass = 'status-rej'; sBadge = '<span class="badge bg-secondary">REJECTED</span>'; }
                const isActive = (currentReqId == order.id) ? 'active' : '';

                const safeReqNumber = escapeHTML(order.req_number);
                const safeRequester = escapeHTML(order.requester_name || 'Unknown');
                const safeReqTime = escapeHTML(order.req_time);
                const safeTotalItems = escapeHTML(order.total_items);

                html += `
                <div class="order-card ${sClass} ${isActive} ${isPulse} w-100 p-2" id="order-card-${order.id}" onclick="openStockOrder(${order.id})">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <span class="fw-bold text-dark mb-0 small">${safeReqNumber}</span><div>${sBadge}</div>
                    </div>
                    <div class="small text-muted mb-1 text-truncate" style="font-size:0.75rem;"><i class="fas fa-user me-1 text-primary"></i> ${safeRequester}</div>
                    <div class="d-flex justify-content-between align-items-center text-muted" style="font-size:0.7rem;">
                        <span><i class="far fa-clock me-1"></i> ${safeReqTime}</span>
                        <span class="fw-bold text-secondary">${safeTotalItems} Items</span>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    } catch (error) {}
}

window.openStockOrder = async function(reqId) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active'));
    
    const activeCard = document.getElementById(`order-card-${reqId}`);
    if (activeCard) { activeCard.classList.add('active'); activeCard.classList.remove('pulse-alert'); }
    document.getElementById('current_req_id').value = reqId;

    try {
        const res = await fetchAPI(`get_order_details&req_id=${reqId}`, 'GET');
        document.getElementById('loadingOverlay').style.display = 'none';
        
        const h = res.header; currentItems = res.items;

        document.getElementById('disp_req_no').innerText = h.req_number;
        document.getElementById('disp_time').innerHTML = `<i class="far fa-clock"></i> ${escapeHTML(h.req_time)}`;
        document.getElementById('disp_requester').innerText = h.requester_name || '-';
        document.getElementById('disp_remark').innerText = h.remark || '-';
        
        const dispReser = document.getElementById('disp_reser_no');
        if (dispReser) {
            dispReser.innerText = h.reservation_number || '-';
        }
        
        let headerColor = 'bg-dark', statusText = h.status;
        if (h.status === 'NEW ORDER') headerColor = 'bg-danger';
        else if (h.status === 'PREPARING') headerColor = 'bg-warning text-dark';
        else if (h.status === 'COMPLETED') headerColor = 'bg-success';
        
        const headerBg = document.getElementById('header-bg');
        headerBg.classList.remove('bg-dark', 'bg-danger', 'bg-warning', 'bg-success', 'text-dark', 'text-white');
        headerBg.classList.add(...headerColor.split(' '));
        if(h.status !== 'PREPARING') headerBg.classList.add('text-white');
        
        const dispStatus = document.getElementById('disp_status');
        dispStatus.innerText = statusText;
        dispStatus.classList.remove('text-dark', 'text-white', 'text-primary');
        dispStatus.classList.add(h.status === 'PREPARING' ? 'text-dark' : 'text-primary');

        let itemsHtml = ''; const isEditable = (h.status === 'PREPARING'); 

        currentItems.forEach(item => {
            const reqQty = parseFloat(item.qty_requested); const onHand = parseFloat(item.onhand_qty);
            const isStockShort = onHand < reqQty; 
            const defaultIssueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : Math.min(reqQty, onHand);
            let issueClass = 'text-success';
            if (!isEditable && defaultIssueQty < reqQty) issueClass = 'text-warning text-dark';
            if (!isEditable && defaultIssueQty === 0) issueClass = 'text-danger';
            
            const safeCategory = escapeHTML(item.material_sub_type || 'OTHER');
            const safeDesc = escapeHTML(item.description || '-');
            const safeItemCode = escapeHTML(item.item_code);

            const imgHtml = item.image_path 
                ? `<img src="../../uploads/items/${item.image_path}" class="item-img-small" onerror="handleDashboardImageError(this, '${safeCategory}')">` 
                : getIconPlaceholder(safeCategory);

            let reqTags = [];
            if (item.requested_tags) {
                try { reqTags = JSON.parse(item.requested_tags); } catch(e){}
            }
            const initialTagsJson = escapeHTML(JSON.stringify(reqTags));

            let inputId = `qty_input_${item.row_id}`;

            itemsHtml += `
            <div class="card border border-light shadow-sm mb-2">
                <div class="card-body p-2 d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2">
                    <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0 w-100">
                        <div class="flex-shrink-0">${imgHtml}</div>
                        <div class="min-w-0 flex-grow-1">
                            <div class="fw-bold text-dark text-truncate mb-1 small" title="${safeDesc}">${safeDesc}</div>
                            <div class="small text-muted" style="font-size:0.75rem;">
                                SAP: ${safeItemCode} ${isEditable ? `<span class="mx-1">|</span><span class="${isStockShort ? 'text-danger fw-bold' : 'text-success'}">คลังรวม: ${onHand}</span>` : ''}
                            </div>
                            ${reqTags.length > 0 ? `<div class="small text-success mt-1 fw-bold" style="font-size: 0.75rem;"><i class="fas fa-tags"></i> ลูกค้าระบุแท็ก: ${reqTags.join(', ')}</div>` : ''}
                            ${isEditable ? `
                            <div class="mt-1">
                                <span id="tag_display_${item.row_id}" 
                                      class="badge bg-secondary cursor-pointer" 
                                      onclick="openSelectTagModal('${item.row_id}', '${safeItemCode}')"
                                      style="font-size: 0.75rem;">
                                      <i class="fas fa-magic"></i> Auto FIFO (ยังไม่ผูก Tag)
                                </span>
                                <input type="hidden" class="issue-tags-hidden" data-rowid="${item.row_id}" value="${initialTagsJson}">
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="d-flex align-items-center justify-content-end gap-2 flex-shrink-0 ms-auto mt-2 mt-md-0 w-auto">
                        
                        <div class="bg-light border rounded d-flex flex-column align-items-center justify-content-center" style="width: 70px; height: 60px;">
                            <span class="text-muted fw-bold d-block" style="font-size:0.65rem; margin-bottom: 2px; line-height: 1;">ขอเบิก</span>
                            <div class="fw-bold text-primary d-flex align-items-center justify-content-center w-100" style="font-size: 1.25rem; height: 26px; line-height: 1;">
                                ${reqQty}
                            </div>
                        </div>
                        
                        <div class="border rounded d-flex flex-column align-items-center justify-content-center ${isEditable ? 'border-success bg-success bg-opacity-10' : 'bg-light'}" style="width: 70px; height: 60px;">
                            <span class="text-muted fw-bold d-block" style="font-size:0.65rem; margin-bottom: 2px; line-height: 1; ${isEditable ? 'color: #198754 !important;' : ''}">จ่ายจริง</span>
                            <div class="d-flex align-items-center justify-content-center w-100" style="height: 26px;">
                                <input type="number" id="${inputId}"
                                    class="text-center fw-bold ${isEditable ? 'text-success' : issueClass} issue-qty-input p-0 m-0 border-0 bg-transparent w-100" 
                                    data-rowid="${item.row_id}" data-itemid="${item.item_id}" data-itemcode="${safeItemCode}" data-category="${safeCategory}" data-requested="${reqQty}" value="${defaultIssueQty}" min="0" ${!isEditable ? 'readonly' : ''} 
                                    style="font-size: 1.25rem; line-height: 1; outline: none; box-shadow: none; -moz-appearance: textfield;">
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('itemsContainer').innerHTML = itemsHtml;
        const issuerContainer = document.getElementById('issuerContainer');
        if (h.status === 'COMPLETED' && h.issuer_name) {
            document.getElementById('disp_issuer').innerText = h.issuer_name; document.getElementById('disp_issue_time').innerText = h.issue_time; 
            issuerContainer.classList.remove('d-none');
        } else { issuerContainer.classList.add('d-none'); }

        const actionBar = document.getElementById('action-bar-mobile');
        let btnHtml = '';
        if (h.status === 'NEW ORDER') {
            btnHtml = `<button id="btnRejectOrder" class="btn btn-sm btn-outline-danger fw-bold px-3" onclick="rejectOrder(${reqId})"><i class="fas fa-times me-1"></i> Reject</button>
                       <button id="btnAcceptOrder" class="btn btn-sm btn-warning text-dark fw-bold px-4" onclick="acceptOrder(${reqId})"><i class="fas fa-hand-paper me-1"></i> รับออเดอร์</button>`;
            actionBar.classList.remove('d-none'); actionBar.innerHTML = btnHtml;
        } else if (h.status === 'PREPARING') {
            btnHtml = `<button id="btnConfirmIssue" class="btn btn-success fw-bold px-4 w-100 w-md-auto" onclick="confirmIssue(${reqId})"><i class="fas fa-check-double me-1"></i> ยืนยันจ่ายของ</button>`;
            actionBar.classList.remove('d-none'); actionBar.innerHTML = btnHtml;
        } else { actionBar.classList.add('d-none'); }
        switchView('form-stock');
    } catch (error) { document.getElementById('loadingOverlay').style.display = 'none'; }
};

window.acceptOrder = async function(reqId) {
    try {
        await fetchAPI('accept_order', 'POST', { req_id: reqId }, 'btnAcceptOrder');
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'รับออเดอร์แล้ว!', showConfirmButton: false, timer: 1500 }); 
        loadActiveQueue(true); openStockOrder(reqId); 
    } catch (error) {}
};

window.rejectOrder = function(reqId) {
    Swal.fire({ title: 'ปฏิเสธคำขอเบิก?', input: 'text', inputPlaceholder: 'ระบุเหตุผล...', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'ยืนยัน Reject'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await fetchAPI('reject_order', 'POST', { req_id: reqId, reason: result.value }, 'btnRejectOrder');
                Swal.fire('Rejected', 'ยกเลิกออเดอร์เรียบร้อย', 'success').then(() => { loadActiveQueue(true); switchView('list'); }); 
            } catch (error) {}
        }
    });
};

window.confirmIssue = async function(reqId) {
    let issueData = []; let hasError = false; let hasAutoDeduct = false;
    const inputs = document.querySelectorAll('.issue-qty-input');
    for (const input of inputs) {
        const rowId = input.dataset.rowid; const itemId = input.dataset.itemid; const itemCode = input.dataset.itemcode;
        const category = input.dataset.category;
        const issueQty = parseFloat(input.value); const maxQty = parseFloat(input.getAttribute('max')); 
        const reqQty = parseFloat(input.dataset.requested);
        if (isNaN(issueQty) || issueQty <= 0) { hasError = `กรุณากรอกจำนวนให้มากกว่า 0 (SAP: ${itemCode})`; break; }
        
        let scannedTags = [];
        const hiddenTags = document.querySelector(`.issue-tags-hidden[data-rowid="${rowId}"]`);
        if (hiddenTags && hiddenTags.value) {
            try { scannedTags = JSON.parse(hiddenTags.value); } catch(e){}
        }
        
        if (scannedTags.length === 0) {
            hasAutoDeduct = true;
        }
        
        issueData.push({ row_id: rowId, item_id: itemId, item_code: itemCode, qty_issued: issueQty, scanned_tags: scannedTags });
    }
    if (hasError) { Swal.fire('ข้อมูลไม่ถูกต้อง', hasError, 'warning'); return; }
    
    let confirmTitle = 'ยืนยันการจ่ายของ?';
    let confirmText = 'ระบบจะทำการหักสต๊อกทันที';
    if (hasAutoDeduct) {
        confirmTitle = 'จ่ายแบบตัดยอดอัตโนมัติ?';
        confirmText = 'มีบางรายการที่คุณไม่ได้ระบุแท็ก ระบบจะทำการหักยอดจาก "แท็กที่เก่าที่สุด" ให้อัตโนมัติ (Auto-FIFO) คุณแน่ใจหรือไม่?';
    }
    
    Swal.fire({ title: confirmTitle, text: confirmText, icon: 'question', showCancelButton: true, confirmButtonColor: '#198754', confirmButtonText: 'Yes, Confirm!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const reqNumber = document.getElementById('disp_req_no').innerText;
                await fetchAPI('confirm_issue', 'POST', { req_id: reqId, req_number: reqNumber, items: JSON.stringify(issueData) }, 'btnConfirmIssue');
                Swal.fire('Success', 'จ่ายของและตัดสต๊อกสำเร็จ!', 'success').then(() => { loadActiveQueue(true); switchView('list'); }); 
            } catch (error) {}
        }
    });
};

window.openSelectTagModal = async function(rowId, itemCode) {
    try {
        const res = await fetchAPI(`get_available_tags_for_item&item_code=${encodeURIComponent(itemCode)}`, 'GET');
        const tags = res.data;
        if (!tags || tags.length === 0) {
            Swal.fire('ไม่มีสินค้า', `ไม่พบแท็กที่พร้อมจ่ายสำหรับ SAP: ${itemCode}`, 'warning');
            return;
        }

        let html = `<div class="text-start mb-2 small text-muted">เลือกแท็กสินค้าที่ต้องการเบิก (SAP: ${itemCode}):</div>`;
        html += `<div class="list-group list-group-flush border rounded overflow-auto" style="max-height: 400px; text-align: left;">`;
        tags.forEach(t => {
            const dateStr = t.received_date ? t.received_date.substring(0, 10) : '-';
            html += `
            <label class="list-group-item d-flex justify-content-between align-items-center list-group-item-action cursor-pointer py-1 px-2">
                <div class="d-flex align-items-center gap-2">
                    <input class="form-check-input me-1 tag-checkbox" type="checkbox" value="${t.serial_no}" data-qty="${t.current_qty}" style="transform: scale(0.85);">
                    <div style="font-size: 0.85rem;">
                        <div class="fw-bold text-dark" style="font-size: 0.9rem;">${t.serial_no}</div>
                        <small class="text-muted" style="font-size: 0.75rem;">Loc: ${t.warehouse_no || '-'} | In: ${dateStr}</small>
                    </div>
                </div>
                <span class="badge bg-primary rounded-pill" style="font-size: 0.8rem;">${parseInt(t.current_qty, 10).toLocaleString()} ชิ้น</span>
            </label>`;
        });
        html += `</div>`;

        const hiddenInput = document.querySelector(`.issue-tags-hidden[data-rowid="${rowId}"]`);
        let selectedTags = JSON.parse(hiddenInput.value || '[]');

        const { value: confirmed } = await Swal.fire({
            title: `เลือกแท็ก (SAP: ${itemCode})`,
            html: html,
            showCancelButton: true,
            confirmButtonText: 'ยืนยันการเลือก',
            cancelButtonText: 'ยกเลิก',
            didOpen: () => {
                const checkboxes = document.querySelectorAll('.tag-checkbox');
                checkboxes.forEach(cb => {
                    if (selectedTags.includes(cb.value)) cb.checked = true;
                });
            },
            preConfirm: () => {
                const checkboxes = document.querySelectorAll('.tag-checkbox:checked');
                let newSelectedTags = [];
                let totalQty = 0;
                checkboxes.forEach(cb => {
                    newSelectedTags.push(cb.value);
                    totalQty += parseInt(cb.dataset.qty, 10);
                });
                return { tags: newSelectedTags, totalQty: totalQty };
            }
        });

        if (confirmed) {
            hiddenInput.value = JSON.stringify(confirmed.tags);
            const qtyInput = document.getElementById(`qty_input_${rowId}`);
            if (qtyInput) qtyInput.value = confirmed.totalQty;
            
            const tagDisplay = document.getElementById(`tag_display_${rowId}`);
            if (tagDisplay) {
                if (confirmed.tags.length > 0) {
                    tagDisplay.className = 'badge bg-primary cursor-pointer';
                    tagDisplay.innerHTML = `<i class="fas fa-cut"></i> ตัดออกจาก: ${confirmed.tags.join(', ')}`;
                } else {
                    tagDisplay.className = 'badge bg-secondary cursor-pointer';
                    tagDisplay.innerHTML = `<i class="fas fa-magic"></i> Auto FIFO (ยังไม่ผูก Tag)`;
                }
            }
            
            if (confirmed.tags.length > 0) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `เลือก ${confirmed.tags.length} แท็ก รวม ${confirmed.totalQty} ชิ้น`, showConfirmButton: false, timer: 1500 });
            }
        }
    } catch (err) {
        Swal.fire('Error', 'ไม่สามารถดึงข้อมูลแท็กสินค้าได้', 'error');
    }
};

async function loadK2Summary(isSilent) {
    const container = document.getElementById('orderListContainer');
    if (!isSilent) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-warning spinner-border-sm"></div></div>';
    try {
        const qs = new URLSearchParams({
            status: document.getElementById('filter_status').value,
            start_date: document.getElementById('global_start').value,
            end_date: document.getElementById('global_end').value
        }).toString();

        const res = await fetchAPI(`get_k2_summary&${qs}`, 'GET');
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-shopping-basket fa-3x mb-2 opacity-25"></i><br><small>ไม่มีรายการรอเปิด K2</small></div>`;
        } else {
            const currentReqId = document.getElementById('current_req_id').value;
            const filterStatus = document.getElementById('filter_status').value;
            res.data.forEach(item => {
                const isActive = (currentReqId === item.item_code) ? 'active' : '';
                const isPulse = (filterStatus === 'WAITING') ? 'pulse-alert border-warning' : '';
                const safeK2Ref = escapeHTML(item.k2_ref || '');
                const safeDesc = escapeHTML(item.description || '-');
                const safeDescJS = safeDesc.replace(/&#39;/g, "\\'");
                const safeItemCode = escapeHTML(item.item_code);
                const safeCategory = escapeHTML(item.material_sub_type || 'OTHER');
                const safeReqCount = escapeHTML(item.request_count);
                const safeTotalQty = escapeHTML(item.total_qty);
                const safeImgPath = item.image_path ? escapeHTML(item.image_path) : 'null';

                let badge = filterStatus === 'WAITING' 
                            ? `<span class="badge bg-warning text-dark">รอเปิด K2</span>`
                            : `<span class="badge bg-success"><i class="fas fa-check"></i> ${safeK2Ref}</span>`;

                html += `
                <div class="order-card ${isActive} ${isPulse} w-100 p-2" id="k2-card-${safeItemCode}" onclick="openK2Detail('${safeItemCode}', '${safeDescJS}', '${safeCategory}', '${safeImgPath}')">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="pe-2 text-truncate" style="max-width: 70%;"><span class="fw-bold text-dark mb-0 small text-truncate" title="${safeDesc}">${safeDesc}</span></div><div>${badge}</div>
                    </div>
                    <div class="small text-primary mb-1 fw-bold" style="font-size:0.75rem;">SAP: ${safeItemCode}</div>
                    <div class="d-flex justify-content-between align-items-center text-muted" style="font-size:0.7rem;">
                        <span><i class="fas fa-users me-1 text-info"></i> ${safeReqCount} ใบเบิก</span><span class="fw-bold text-warning-emphasis">รวม: ${safeTotalQty}</span>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    } catch (error) {}
}

window.openK2Detail = async function(itemCode, description, category, imgPath) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active'));
    const activeCard = document.getElementById(`k2-card-${itemCode}`);
    if (activeCard) { activeCard.classList.add('active'); activeCard.classList.remove('pulse-alert'); }
    document.getElementById('current_req_id').value = itemCode;

    const safeCategory = escapeHTML(category || 'OTHER');
    const safeImgPath = escapeHTML(imgPath || '');
    const imgHtml = safeImgPath && safeImgPath !== 'null' 
        ? `<img src="../../uploads/items/${safeImgPath}" class="item-img-small" onerror="handleDashboardImageError(this, '${safeCategory}')">` 
        : getIconPlaceholder(safeCategory);
        
    document.getElementById('k2_disp_img').innerHTML = imgHtml;
    document.getElementById('k2_disp_desc').innerText = description;
    document.getElementById('k2_disp_sap').innerText = itemCode;
    document.getElementById('input_k2_pr').value = '';

    try {
        const qs = new URLSearchParams({
            item_code: itemCode,
            status: document.getElementById('filter_status').value,
            start_date: document.getElementById('global_start').value,
            end_date: document.getElementById('global_end').value
        }).toString();

        const res = await fetchAPI(`get_k2_item_details&${qs}`, 'GET');
        document.getElementById('loadingOverlay').style.display = 'none';

        let html = ''; let totalQty = 0;
        res.data.forEach(u => {
            totalQty += parseFloat(u.qty_requested);
            html += `<tr><td class="text-muted">${escapeHTML(u.req_date)}</td><td class="fw-bold text-dark">${escapeHTML(u.req_number)}</td><td><i class="fas fa-user text-primary me-1"></i>${escapeHTML(u.fullname || 'Unknown')}</td><td class="text-end fw-bold text-warning-emphasis">${parseFloat(u.qty_requested)}</td></tr>`;
        });
        document.getElementById('k2UsersList').innerHTML = html;
        document.getElementById('k2_disp_total').innerText = totalQty;

        const k2ActionBar = document.getElementById('k2-action-bar');
        if (document.getElementById('filter_status').value === 'WAITING') k2ActionBar.classList.remove('d-none');
        else k2ActionBar.classList.add('d-none');
        switchView('form-k2');
    } catch (error) { document.getElementById('loadingOverlay').style.display = 'none'; }
};

window.submitK2Batch = function() {
    const prNumber = document.getElementById('input_k2_pr').value.trim();
    const itemCode = document.getElementById('current_req_id').value;
    if (!prNumber) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเลขที่ K2 PR เพื่อใช้อ้างอิง', 'warning'); return; }
    Swal.fire({
        title: 'ยืนยันการเปิด K2?', text: `สร้างใบขอซื้อในระบบด้วยเลข: ${prNumber} ใช่หรือไม่?`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#ffc107', confirmButtonText: 'อัปเดตเลย!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await fetchAPI('submit_k2_pr', 'POST', { item_code: itemCode, k2_pr_no: prNumber }, 'btnSubmitK2');
                Swal.fire('Success', 'อัปเดตสถานะสำเร็จ', 'success').then(() => { loadActiveQueue(true); switchView('list'); });
            } catch (error) {}
        }
    });
};

function switchView(view) {
    const mode = document.getElementById('current_dashboard_mode').value;
    const targetForm = document.querySelector(mode === 'STOCK' ? '#form-stock' : '#form-k2');
    const hideForm = document.querySelector(mode === 'STOCK' ? '#form-k2' : '#form-stock');
    const leftPane = document.getElementById('left-pane'); const rightPane = document.getElementById('right-pane'); const emptyState = document.getElementById('empty-state');

    if (hideForm) { hideForm.classList.add('d-none'); hideForm.classList.remove('d-flex'); }

    if (window.innerWidth < 992) { 
        if (view === 'list') {
            leftPane.classList.remove('d-none'); leftPane.classList.add('d-flex');
            rightPane.classList.remove('d-flex'); rightPane.classList.add('d-none');
            document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active')); document.getElementById('current_req_id').value = '';
        } else {
            leftPane.classList.remove('d-flex'); leftPane.classList.add('d-none');
            rightPane.classList.remove('d-none'); rightPane.classList.add('d-flex');
            window.scrollTo(0,0);
        }
    } else { 
        leftPane.classList.remove('d-none'); leftPane.classList.add('d-flex');
        rightPane.classList.remove('d-none'); rightPane.classList.add('d-flex');
        if(view === 'list') {
            emptyState.classList.remove('d-none'); emptyState.classList.add('d-flex');
            if (targetForm) { targetForm.classList.add('d-none'); targetForm.classList.remove('d-flex'); }
            document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active')); document.getElementById('current_req_id').value = '';
        }
    }

    if (view !== 'list' || document.getElementById('current_req_id').value !== '') {
        emptyState.classList.add('d-none'); emptyState.classList.remove('d-flex');
        if (targetForm) { targetForm.classList.remove('d-none'); targetForm.classList.add('d-flex'); }
    }
}

window.loadAnalytics = async function() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        const start = document.getElementById('global_start').value;
        const end = document.getElementById('global_end').value;
        const res = await fetchAPI(`get_analytics&start_date=${start}&end_date=${end}`, 'GET');

        document.getElementById('loadingOverlay').style.display = 'none';

        document.getElementById('stat_total_reqs').innerText = res.summary.total_reqs;
        document.getElementById('stat_total_issued').innerText = parseFloat(res.summary.total_issued_qty).toLocaleString();
        document.getElementById('stat_waiting_k2').innerText = res.summary.waiting_k2;
        document.getElementById('stat_total_rejects').innerText = res.summary.total_rejects;

        document.getElementById('adv_sla').innerText = parseFloat(res.summary.avg_sla_minutes || 0).toFixed(0) + ' นาที';
        document.getElementById('adv_fill_rate').innerText = parseFloat(res.summary.fill_rate_percent || 0).toFixed(1) + '%';
        document.getElementById('adv_ira').innerText = parseFloat(res.summary.ira_percent || 100).toFixed(1) + '%';
        document.getElementById('adv_dead_stock').innerText = '฿' + parseFloat(res.summary.dead_stock_value || 0).toLocaleString();
        document.getElementById('adv_turnover').innerText = parseFloat(res.summary.turnover_ratio || 0).toFixed(2);
        
        if(chartTrendInst) chartTrendInst.destroy();
        chartTrendInst = new Chart(document.getElementById('chartTrend').getContext('2d'), {
            type: 'line',
            data: {
                labels: res.trendData.map(d => d.req_date),
                datasets: [{ 
                    label: 'จำนวนบิลเบิกสำเร็จ', data: res.trendData.map(d => d.req_count), 
                    borderColor: '#0d6efd', backgroundColor: 'rgba(13, 110, 253, 0.15)', borderWidth: 2.5, 
                    pointBackgroundColor: '#ffffff', pointBorderColor: '#0d6efd', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6, fill: true, tension: 0.3 
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, interaction: { mode: 'index', intersect: false }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } } }
        });

        if(chartCatInst) chartCatInst.destroy();
        chartCatInst = new Chart(document.getElementById('chartCategory').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: res.categoryData.map(c => c.category),
                datasets: [{ data: res.categoryData.map(c => c.total_qty), backgroundColor: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0'], borderWidth: 2, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right' } } }
        });

        if(chartItemsInst) chartItemsInst.destroy();
        chartItemsInst = new Chart(document.getElementById('chartTopItems').getContext('2d'), {
            type: 'bar',
            data: {
                labels: res.topItems.map(i => (i.part_description || '').substring(0, 25) + '...'),
                datasets: [{ label: 'จำนวนชิ้นที่จ่าย', data: res.topItems.map(i => i.total_qty), backgroundColor: 'rgba(255, 193, 7, 0.85)', borderColor: '#ffc107', borderWidth: 1, borderRadius: 4 }]
            },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } }
        });

        if(chartUsersInst) chartUsersInst.destroy();
        chartUsersInst = new Chart(document.getElementById('chartTopUsers').getContext('2d'), {
            type: 'pie',
            data: {
                labels: res.topUsers.map(u => u.fullname.split(' ')[0]),
                datasets: [{ data: res.topUsers.map(u => u.req_count), backgroundColor: ['#0dcaf0', '#6610f2', '#d63384', '#fd7e14', '#20c997'], borderWidth: 2, borderColor: '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });

    } catch (error) { document.getElementById('loadingOverlay').style.display = 'none'; }
};

window.exportToCSV = async function() {
    const btn = document.getElementById('btnExportCSV');
    const start = document.getElementById('global_start').value;
    const end = document.getElementById('global_end').value;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> กำลังโหลด...';
    btn.disabled = true;

    try {
        const res = await fetchAPI(`export_analytics&start_date=${start}&end_date=${end}`, 'GET');
        
        if (!res.success || !res.exportData || res.exportData.length === 0) { 
            Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info'); 
            return; 
        }

        let csvContent = "\uFEFFวันที่เบิก,เลขที่บิล,ผู้เบิก,รหัส SAP,ชื่อวัสดุ,จำนวนขอเบิก,จำนวนจ่ายจริง,ประเภทคำขอ,สถานะ\n";
        res.exportData.forEach(r => {
            csvContent += `${r.date_req},${r.req_number},${r.requester},${r.sap_no},${(r.part_description || '-').replace(/,/g, " ")},${r.qty_requested},${r.qty_issued || 0},${r.request_type},${r.status}\n`;
        });
        
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `Store_Export_${start}_to_${end}.csv`;
        link.click();
        
    } catch (error) {
        Swal.fire('Error', error.message, 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

window.loadActiveJobsForFulfillment = function() {
    const line = document.getElementById('fulfill_line').value;
    const jobList = document.getElementById('fulfillJobList');
    const container = document.getElementById('fulfillmentListContainer');
    const jobNameLabel = document.getElementById('fulfillSelectedJobName');

    if (!line) {
        jobList.innerHTML = `<div class="p-3 text-center text-muted small">กรุณาเลือกไลน์การผลิต</div>`;
        container.innerHTML = `<tr><td colspan="4" class="text-muted py-4">คลิกเลือกงานจากรายการด้านซ้ายเพื่อดูรายละเอียด</td></tr>`;
        jobNameLabel.textContent = '-';
        return;
    }

    jobList.innerHTML = `<div class="p-3 text-center"><i class="fas fa-spinner fa-spin text-primary"></i> โหลดข้อมูล...</div>`;
    
    fetchAPI(`api_store.php?action=get_active_jobs_for_fulfillment&line=${encodeURIComponent(line)}`, 'GET')
    .then(res => {
        if (!res.success) throw new Error(res.message);
        
        if (!res.data || res.data.length === 0) {
            jobList.innerHTML = `<div class="p-3 text-center text-muted small"><i class="fas fa-info-circle mb-2 fa-2x"></i><br>ไม่มีงานที่กำลังผลิตหรือรอผลิตในไลน์นี้</div>`;
            return;
        }

        let html = '';
        res.data.forEach(job => {
            let statusColor = job.status === 'RUNNING' ? 'success' : (job.status === 'PAUSED' ? 'warning' : 'secondary');
            let statusIcon = job.status === 'RUNNING' ? 'play-circle' : (job.status === 'PAUSED' ? 'pause-circle' : 'clock');
            
            html += `
                <a href="javascript:void(0)" class="list-group-item list-group-item-action p-2" onclick="loadFulfillmentData(${job.job_id}, '${job.job_no}', ${job.target_qty})">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-primary small"><i class="fas fa-clipboard-check me-1"></i>${job.job_no}</span>
                        <span class="badge bg-${statusColor} text-${statusColor === 'warning' ? 'dark' : 'white'}"><i class="fas fa-${statusIcon} me-1"></i>${job.status}</span>
                    </div>
                    <div class="small fw-bold text-dark text-truncate" title="${job.part_description}">${job.part_no}</div>
                    <div class="d-flex justify-content-between align-items-center mt-1">
                        <small class="text-muted" style="font-size:0.75rem;">เป้า: <span class="fw-bold text-dark">${job.target_qty}</span> ชิ้น</small>
                        <i class="fas fa-chevron-right text-muted" style="font-size:0.7rem;"></i>
                    </div>
                </a>
            `;
        });
        jobList.innerHTML = html;
        container.innerHTML = `<tr><td colspan="4" class="text-muted py-4"><i class="fas fa-hand-pointer me-1"></i> คลิกเลือกงานจากรายการด้านซ้ายเพื่อดูรายละเอียด</td></tr>`;
        jobNameLabel.textContent = '-';
    })
    .catch(err => {
        jobList.innerHTML = `<div class="p-3 text-center text-danger small">เกิดข้อผิดพลาด: ${err.message}</div>`;
    });
};

window.loadFulfillmentData = function(job_id, job_no, target_qty) {
    const container = document.getElementById('fulfillmentListContainer');
    document.getElementById('fulfillSelectedJobName').innerHTML = `Job: <b>${job_no}</b> <span class="badge bg-secondary ms-1">เป้า ${target_qty}</span>`;

    container.innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>`;

    fetchAPI(`api_store.php?action=get_plan_fulfillment&job_id=${job_id}`, 'GET')
    .then(res => {
        if (!res.success) throw new Error(res.message || 'Error loading fulfillment');
        
        const data = res.data;
        if (!data || data.length === 0) {
            container.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">ไม่พบข้อมูลสูตรการผลิต (BOM) สำหรับชิ้นงานนี้</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            const pct = item.percent;
            const pending = item.pending_qty;
            
            let statusBadge = '';
            let bgClass = 'bg-primary';
            
            if (pct >= 100) {
                statusBadge = `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>ครบแล้ว</span>`;
                bgClass = 'bg-success';
            } else if (pct > 0) {
                statusBadge = `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>ขาด ${pending}</span>`;
                bgClass = 'bg-warning';
            } else {
                statusBadge = `<span class="badge bg-danger"><i class="fas fa-times-circle me-1"></i>ขาด ${pending}</span>`;
                bgClass = 'bg-danger';
            }

            html += `
                <tr>
                    <td class="text-start">
                        <div class="d-flex align-items-center gap-2">
                            ${getIconPlaceholder(item.sap_no)}
                            <div>
                                <div class="fw-bold text-dark">${item.part_no || '-'}</div>
                                <div class="small text-muted text-truncate" style="max-width:200px;" title="${item.part_description}">${item.part_description || '-'}</div>
                                <div class="small text-primary fw-bold">${item.sap_no || '-'}</div>
                            </div>
                        </div>
                    </td>
                    <td><h5 class="mb-0 fw-bold">${item.target_qty}</h5></td>
                    <td><h5 class="mb-0 fw-bold text-primary">${item.issued_qty}</h5></td>
                    <td>
                        <div class="d-flex flex-column align-items-center gap-1">
                            ${statusBadge}
                            <div class="progress w-100 mt-1" style="height: 6px;">
                                <div class="progress-bar ${bgClass}" role="progressbar" style="width: ${pct}%;"></div>
                            </div>
                            <small class="text-muted" style="font-size:0.7rem;">${pct}%</small>
                        </div>
                    </td>
                </tr>
            `;
        });
        container.innerHTML = html;
    })
    .catch(err => {
        console.error(err);
        container.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger"><i class="fas fa-exclamation-triangle me-2"></i>เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    });
};