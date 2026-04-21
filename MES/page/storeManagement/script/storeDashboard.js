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
    const btnExport = document.getElementById('btnExportCSV');
    const dp = document.getElementById('global-date-filter');

    layoutOrder.classList.add('d-none');
    layoutAnalytics.classList.add('d-none');
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

                // 🛡️ XSS Protection
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
            const defaultIssueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : reqQty;
            let issueClass = 'text-success';
            if (!isEditable && defaultIssueQty < reqQty) issueClass = 'text-warning text-dark';
            if (!isEditable && defaultIssueQty === 0) issueClass = 'text-danger';
            
            // 🛡️ XSS Protection
            const safeCategory = escapeHTML(item.item_category || 'OTHER');
            const safeDesc = escapeHTML(item.description || '-');
            const safeItemCode = escapeHTML(item.item_code);

            const imgHtml = item.image_path 
                ? `<img src="../../uploads/items/${item.image_path}" class="item-img-small" onerror="handleDashboardImageError(this, '${safeCategory}')">` 
                : getIconPlaceholder(safeCategory);

            itemsHtml += `
            <div class="card border border-light shadow-sm mb-2">
                <div class="card-body p-2 d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2">
                    <div class="d-flex align-items-center gap-2 flex-grow-1 min-w-0 w-100">
                        <div class="flex-shrink-0">${imgHtml}</div>
                        <div class="min-w-0 flex-grow-1">
                            <div class="fw-bold text-dark text-truncate mb-1 small" title="${safeDesc}">${safeDesc}</div>
                            <div class="small text-muted" style="font-size:0.75rem;">
                                SAP: ${safeItemCode} ${isEditable ? `<span class="mx-1">|</span><span class="${isStockShort ? 'text-danger fw-bold' : 'text-success'}">คลัง: ${onHand}</span>` : ''}
                            </div>
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
                                <input type="number" 
                                    class="text-center fw-bold ${isEditable ? 'text-success' : issueClass} issue-qty-input p-0 m-0 border-0 bg-transparent w-100" 
                                    data-rowid="${item.row_id}" data-itemid="${item.item_id}" data-itemcode="${safeItemCode}" value="${defaultIssueQty}" min="0" max="${onHand}" ${!isEditable ? 'disabled' : ''} 
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
                Swal.fire('Rejected', 'ยกเลิกออเดอร์เรียบร้อย', 'success'); loadActiveQueue(true); openStockOrder(reqId); 
            } catch (error) {}
        }
    });
};

window.confirmIssue = async function(reqId) {
    let issueData = []; let hasError = false;
    const inputs = document.querySelectorAll('.issue-qty-input');
    for (const input of inputs) {
        const rowId = input.dataset.rowid; const itemId = input.dataset.itemid; const itemCode = input.dataset.itemcode;
        const issueQty = parseFloat(input.value); const maxQty = parseFloat(input.getAttribute('max')); 
        if (isNaN(issueQty) || issueQty < 0) { hasError = `กรุณากรอกจำนวนให้ถูกต้อง (SAP: ${itemCode})`; break; }
        if (issueQty > maxQty) { hasError = `สต๊อกมีไม่พอจ่าย! (SAP: ${itemCode} จ่ายได้สูงสุด ${maxQty})`; break; }
        issueData.push({ row_id: rowId, item_id: itemId, item_code: itemCode, qty_issued: issueQty });
    }
    if (hasError) { Swal.fire('ข้อมูลไม่ถูกต้อง', hasError, 'warning'); return; }
    Swal.fire({ title: 'ยืนยันการจ่ายของ?', text: 'ระบบจะทำการหักสต๊อกทันที', icon: 'question', showCancelButton: true, confirmButtonColor: '#198754', confirmButtonText: 'Yes, Confirm!'
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

// ==========================================
// 🟢 K2 Methods 🟢
// ==========================================
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
                
                // 🛡️ XSS Protection
                const safeK2Ref = escapeHTML(item.k2_ref || '');
                const safeDesc = escapeHTML(item.description || '-');
                const safeDescJS = safeDesc.replace(/&#39;/g, "\\'"); // กัน error ใน onclick JS param
                const safeItemCode = escapeHTML(item.item_code);
                const safeCategory = escapeHTML(item.item_category || 'OTHER');
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
    document.getElementById('k2_disp_desc').innerText = description; // innerText is safe
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

// ==========================================
// 🟢 Analytics 🟢
// ==========================================
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
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};