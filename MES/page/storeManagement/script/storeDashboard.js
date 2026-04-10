"use strict";

const API_URL = 'api/manageStoreDashboard.php';
let currentItems = [];

// ========================================================
// 🟢 Custom Fetch Wrapper สำหรับ storeDashboard 🟢
// ========================================================
async function fetchDashboardAPI(params, method = 'GET') {
    let url = API_URL;
    const options = { method: method };

    if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        url += `?${qs}`;
    } else if (method === 'POST') {
        // รองรับทั้ง FormData (อัปโหลดรูป) และ Object ธรรมดา
        if (params instanceof FormData) {
            options.body = params;
        } else {
            const formData = new FormData();
            for (const key in params) {
                formData.append(key, params[key]);
            }
            options.body = formData;
        }
        
        // แนบ CSRF Token
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta && options.body instanceof FormData) {
            options.body.append('csrf_token', csrfMeta.getAttribute('content'));
        }
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
}

function handleFetchError(error, defaultMsg = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์") {
    document.getElementById('loadingOverlay').style.display = 'none';
    Swal.fire('Error', error.message || defaultMsg, 'error');
}

// ========================================================
// 🟢 INIT & EVENT LISTENERS 🟢
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    let d = new Date(); d.setDate(d.getDate() - 30);
    
    const startFilter = document.getElementById('filter_start');
    const endFilter = document.getElementById('filter_end');
    
    if (startFilter) startFilter.value = d.toISOString().split('T')[0];
    if (endFilter) endFilter.value = new Date().toISOString().split('T')[0];

    loadActiveQueue();
    
    // Auto Refresh 
    setInterval(() => { 
        const filterStatus = document.getElementById('filter_status');
        if (filterStatus && (filterStatus.value === 'ACTIVE' || filterStatus.value === 'WAITING')) {
            loadActiveQueue(true); 
        }
    }, 30000);

    window.addEventListener('resize', () => {
        const reqId = document.getElementById('current_req_id')?.value;
        switchView(reqId !== '' ? 'form' : 'list');
    });
});

function getIconPlaceholder(category) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 
    return `<div class="ph-small"><i class="fas ${icon}" style="color:${color}; opacity:0.5;"></i></div>`;
}

function getPlaceholderHTML(category, sapNo) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 

    return `
        <div class="d-flex flex-column align-items-center justify-content-center" style="background: radial-gradient(circle, #ffffff 0%, #f0f3f8 100%); position:absolute; top:0; left:0; width:100%; height:100%;">
            <i class="fas ${icon} fa-3x mb-2" style="color: ${color}; opacity: 0.3;"></i>
            <span class="small fw-bold px-2 w-100 text-center text-truncate" style="color: ${color}; opacity: 0.4; letter-spacing: 1px;">
                ${sapNo}
            </span>
        </div>
    `;
}

window.toggleDateFilter = function() {
    const val = document.getElementById('filter_status').value;
    const container = document.getElementById('date_filter_container');
    if (val === 'ALL' || val === 'K2_OPENED') { 
        container.classList.remove('d-none'); 
    } else { 
        container.classList.add('d-none'); 
    }
};

window.loadActiveQueue = function(isSilent = false) {
    const mode = document.getElementById('current_dashboard_mode').value;
    if (mode === 'STOCK') loadStockOrders(isSilent);
    else loadK2Summary(isSilent);
};

// ==========================================
// 🟢 ฟังก์ชันฝั่ง STOCK (จ่ายของปกติ) 🟢
// ==========================================
async function loadStockOrders(isSilent) {
    const container = document.getElementById('orderListContainer');
    if (!isSilent) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    try {
        const res = await fetchDashboardAPI({
            action: 'get_orders',
            status: document.getElementById('filter_status').value,
            start_date: document.getElementById('filter_start').value,
            end_date: document.getElementById('filter_end').value
        }, 'GET');

        if (!res.success) return;

        let html = '';
        if (res.data.length === 0) {
            let emptyText = document.getElementById('filter_status').value === 'ACTIVE' ? 'ไม่มีออเดอร์ค้างจัด' : 'ไม่มีประวัติการเบิกในช่วงนี้';
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-clipboard-check fa-4x mb-3 opacity-25"></i><br>${emptyText}</div>`;
        } else {
            const currentReqId = document.getElementById('current_req_id').value;
            res.data.forEach(order => {
                let sClass = '', sBadge = '', isPulse = '';
                if (order.status === 'NEW ORDER') { sClass = 'status-new'; sBadge = '<span class="badge bg-danger">NEW</span>'; isPulse = 'pulse-alert'; }
                else if (order.status === 'PREPARING') { sClass = 'status-prep'; sBadge = '<span class="badge bg-warning text-dark">PREPARING</span>'; }
                else if (order.status === 'COMPLETED') { sClass = 'status-comp'; sBadge = '<span class="badge bg-success">COMPLETED</span>'; }
                else { sClass = 'status-rej'; sBadge = '<span class="badge bg-secondary">REJECTED</span>'; }
                
                const isActive = (currentReqId == order.id) ? 'active' : '';

                html += `
                <div class="order-card ${sClass} ${isActive} ${isPulse} w-100 p-3" id="order-card-${order.id}" onclick="openStockOrder(${order.id})">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="fw-bold text-dark mb-0">${order.req_number}</h6><div>${sBadge}</div>
                    </div>
                    <div class="small text-muted mb-1"><i class="fas fa-user me-2 text-primary w-15px"></i> ${order.requester_name || 'Unknown'}</div>
                    <div class="d-flex justify-content-between align-items-center small text-muted">
                        <span><i class="far fa-clock me-2 w-15px"></i> ${order.req_time}</span>
                        <span class="fw-bold text-secondary">${order.total_items} Items</span>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    } catch (error) {
        if (!isSilent) handleFetchError(error);
    }
}

window.openStockOrder = async function(reqId) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active'));
    const activeCard = document.getElementById(`order-card-${reqId}`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.classList.remove('pulse-alert');
    }
    document.getElementById('current_req_id').value = reqId;

    try {
        const res = await fetchDashboardAPI({ action: 'get_order_details', req_id: reqId }, 'GET');
        document.getElementById('loadingOverlay').style.display = 'none';
        
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }

        const h = res.header; 
        currentItems = res.items;

        document.getElementById('disp_req_no').innerText = h.req_number;
        document.getElementById('disp_time').innerHTML = `<i class="far fa-clock"></i> ${h.req_time}`;
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

        let itemsHtml = ''; 
        const isEditable = (h.status === 'PREPARING'); 

        currentItems.forEach(item => {
            const reqQty = parseFloat(item.qty_requested);
            const onHand = parseFloat(item.onhand_qty);
            const isStockShort = onHand < reqQty; 
            const defaultIssueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : reqQty;
            
            let issueClass = 'text-success';
            if (!isEditable && defaultIssueQty < reqQty) issueClass = 'text-warning text-dark';
            if (!isEditable && defaultIssueQty === 0) issueClass = 'text-danger';

            const imgHtml = item.image_path ? `<img src="../../uploads/items/${item.image_path}" class="item-img-small" onerror="this.outerHTML='${getIconPlaceholder(item.item_category)}'">'` : getIconPlaceholder(item.item_category);

            itemsHtml += `
            <div class="card border border-light shadow-sm">
                <div class="card-body p-2 p-md-3 d-flex flex-column flex-md-row align-items-md-center gap-3">
                    <div class="d-flex align-items-center gap-3 flex-grow-1">
                        ${imgHtml}
                        <div><div class="fw-bold text-dark" style="font-size:0.9rem;">${item.description}</div>
                        <div class="small text-muted">SAP: ${item.item_code} ${isEditable ? `| <span class="${isStockShort ? 'text-danger fw-bold' : 'text-success'}">คลัง: ${onHand}</span>` : ''}</div></div>
                    </div>
                    <div class="d-flex align-items-center justify-content-between justify-content-md-end gap-3 flex-shrink-0" style="min-width: 250px;">
                        <div class="text-center bg-light rounded px-3 py-1 border"><small class="text-muted d-block" style="font-size:0.7rem;">ขอเบิก</small><span class="fw-bold text-primary fs-5">${reqQty}</span></div>
                        <i class="fas fa-arrow-right text-muted d-none d-md-inline"></i>
                        <div class="text-center w-100 w-md-auto"><small class="text-muted d-block mb-1" style="font-size:0.7rem;">จ่ายจริง</small>
                            <div class="input-group input-group-sm w-100">
                                <input type="number" class="form-control text-center fw-bold ${isEditable ? 'text-success' : issueClass} issue-qty-input" data-rowid="${item.row_id}" data-itemid="${item.item_id}" data-itemcode="${item.item_code}" value="${defaultIssueQty}" min="0" max="${onHand}" ${!isEditable ? 'disabled' : ''}>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('itemsContainer').innerHTML = itemsHtml;

        const issuerContainer = document.getElementById('issuerContainer');
        if (h.status === 'COMPLETED' && h.issuer_name) {
            document.getElementById('disp_issuer').innerText = h.issuer_name; 
            document.getElementById('disp_issue_time').innerText = h.issue_time; 
            issuerContainer.classList.remove('d-none');
        } else { 
            issuerContainer.classList.add('d-none'); 
        }

        const actionBar = document.getElementById('action-bar-mobile');
        let btnHtml = '';
        if (h.status === 'NEW ORDER') {
            btnHtml = `<button class="btn btn-outline-danger fw-bold px-4" onclick="rejectOrder(${reqId})"><i class="fas fa-times me-1"></i> ปฏิเสธ (Reject)</button>
                       <button class="btn btn-warning text-dark fw-bold px-5 fs-5" onclick="acceptOrder(${reqId})"><i class="fas fa-hand-paper me-2"></i> รับออเดอร์</button>`;
            actionBar.classList.remove('d-none');
            actionBar.innerHTML = btnHtml;
        } else if (h.status === 'PREPARING') {
            btnHtml = `<button class="btn btn-success fw-bold px-5 fs-5 w-100 w-md-auto" onclick="confirmIssue(${reqId})"><i class="fas fa-check-double me-2"></i> ยืนยันจ่ายของ</button>`;
            actionBar.classList.remove('d-none');
            actionBar.innerHTML = btnHtml;
        } else { 
            actionBar.classList.add('d-none'); 
        }

        switchView('form-stock');
    } catch (error) {
        handleFetchError(error);
    }
};

window.acceptOrder = async function(reqId) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try {
        const res = await fetchDashboardAPI({ action: 'accept_order', req_id: reqId }, 'POST');
        if (res.success) { 
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'รับออเดอร์แล้ว!', showConfirmButton: false, timer: 1500 }); 
            loadActiveQueue(true); 
            openStockOrder(reqId); 
        } else { 
            document.getElementById('loadingOverlay').style.display = 'none'; 
            Swal.fire('Error', res.message, 'error'); 
        }
    } catch (error) {
        handleFetchError(error);
    }
};

window.rejectOrder = function(reqId) {
    Swal.fire({ title: 'ปฏิเสธคำขอเบิก?', input: 'text', inputPlaceholder: 'ระบุเหตุผล...', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'ยืนยัน Reject'
    }).then(async (result) => {
        if (result.isConfirmed) {
            document.getElementById('loadingOverlay').style.display = 'flex';
            try {
                const res = await fetchDashboardAPI({ action: 'reject_order', req_id: reqId, reason: result.value }, 'POST');
                document.getElementById('loadingOverlay').style.display = 'none';
                if (res.success) { 
                    Swal.fire('Rejected', 'ยกเลิกออเดอร์เรียบร้อย', 'success'); 
                    loadActiveQueue(true); 
                    openStockOrder(reqId); 
                } else { 
                    Swal.fire('Error', res.message, 'error'); 
                }
            } catch (error) {
                handleFetchError(error);
            }
        }
    });
};

window.confirmIssue = async function(reqId) {
    let issueData = []; 
    let hasError = false;
    
    const inputs = document.querySelectorAll('.issue-qty-input');
    for (const input of inputs) {
        const rowId = input.dataset.rowid;
        const itemId = input.dataset.itemid;
        const itemCode = input.dataset.itemcode;
        const issueQty = parseFloat(input.value);
        const maxQty = parseFloat(input.getAttribute('max')); 
        
        if (isNaN(issueQty) || issueQty < 0) { 
            hasError = `กรุณากรอกจำนวนให้ถูกต้อง (SAP: ${itemCode})`; break; 
        }
        if (issueQty > maxQty) { 
            hasError = `สต๊อกมีไม่พอจ่าย! (SAP: ${itemCode} จ่ายได้สูงสุด ${maxQty})`; break; 
        }
        issueData.push({ row_id: rowId, item_id: itemId, item_code: itemCode, qty_issued: issueQty });
    }

    if (hasError) { Swal.fire('ข้อมูลไม่ถูกต้อง', hasError, 'warning'); return; }

    Swal.fire({ title: 'ยืนยันการจ่ายของ?', text: 'ระบบจะทำการหักสต๊อกทันที', icon: 'question', showCancelButton: true, confirmButtonColor: '#198754', confirmButtonText: 'Yes, Confirm!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            document.getElementById('loadingOverlay').style.display = 'flex';
            try {
                const reqNumber = document.getElementById('disp_req_no').innerText;
                const res = await fetchDashboardAPI({ 
                    action: 'confirm_issue', 
                    req_id: reqId, 
                    req_number: reqNumber, 
                    items: JSON.stringify(issueData) 
                }, 'POST');

                document.getElementById('loadingOverlay').style.display = 'none';
                if (res.success) { 
                    Swal.fire('Success', 'จ่ายของและตัดสต๊อกสำเร็จ!', 'success').then(() => { 
                        loadActiveQueue(true); 
                        switchView('list'); 
                    }); 
                } else { 
                    Swal.fire('Error', res.message, 'error'); 
                }
            } catch (error) {
                handleFetchError(error);
            }
        }
    });
};

// ==========================================
// 🟢 ฟังก์ชันฝั่ง K2 (รวบรวมเปิด K2) 🟢
// ==========================================
async function loadK2Summary(isSilent) {
    const container = document.getElementById('orderListContainer');
    if (!isSilent) container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>';
    
    try {
        const res = await fetchDashboardAPI({ action: 'get_k2_summary', status: document.getElementById('filter_status').value }, 'GET');
        if (!res.success) return;
        
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-shopping-basket fa-4x mb-3 opacity-25"></i><br>ไม่มีรายการรอเปิด K2</div>`;
        } else {
            const currentReqId = document.getElementById('current_req_id').value;
            const filterStatus = document.getElementById('filter_status').value;

            res.data.forEach(item => {
                const isActive = (currentReqId === item.item_code) ? 'active' : '';
                const isPulse = (filterStatus === 'WAITING') ? 'pulse-alert' : '';
                
                let badge = filterStatus === 'WAITING' 
                            ? `<span class="badge bg-warning text-dark"><i class="fas fa-hourglass-half"></i> รอสโตร์เปิด K2</span>`
                            : `<span class="badge bg-success"><i class="fas fa-check"></i> ${item.k2_ref}</span>`;

                html += `
                <div class="order-card ${isActive} ${isPulse} w-100 p-3" id="k2-card-${item.item_code}" onclick="openK2Detail('${item.item_code}', '${item.description.replace(/'/g, "\\'")}', '${item.item_category}', '${item.image_path}')">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="pe-2 text-truncate" style="max-width: 70%;"><h6 class="fw-bold text-dark mb-0 text-truncate">${item.description}</h6></div>
                        <div>${badge}</div>
                    </div>
                    <div class="small text-muted mb-2 fw-bold text-primary">SAP: ${item.item_code}</div>
                    <div class="border-top pt-2 d-flex justify-content-between align-items-center small text-muted">
                        <span><i class="fas fa-users me-1 text-info w-15px"></i> ${item.request_count} ใบขอเบิก</span>
                        <span class="fw-bold text-warning-emphasis fs-6"><i class="fas fa-plus-circle me-1"></i>รวม: ${item.total_qty}</span>
                    </div>
                </div>`;
            });
        }
        container.innerHTML = html;
    } catch (error) {
        if (!isSilent) handleFetchError(error);
    }
}

window.openK2Detail = async function(itemCode, description, category, imgPath) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active'));
    
    const activeCard = document.getElementById(`k2-card-${itemCode}`);
    if (activeCard) {
        activeCard.classList.add('active');
        activeCard.classList.remove('pulse-alert');
    }
    document.getElementById('current_req_id').value = itemCode;

    // Render Header
    const imgHtml = imgPath && imgPath !== 'null' ? `<img src="../../uploads/items/${imgPath}" class="item-img-small">` : getIconPlaceholder(category);
    document.getElementById('k2_disp_img').innerHTML = imgHtml;
    document.getElementById('k2_disp_desc').innerText = description;
    document.getElementById('k2_disp_sap').innerText = itemCode;
    document.getElementById('input_k2_pr').value = '';

    try {
        const res = await fetchDashboardAPI({ 
            action: 'get_k2_item_details', 
            item_code: itemCode, 
            status: document.getElementById('filter_status').value 
        }, 'GET');

        document.getElementById('loadingOverlay').style.display = 'none';
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }

        let html = ''; let totalQty = 0;
        res.data.forEach(u => {
            totalQty += parseFloat(u.qty_requested);
            html += `
            <tr>
                <td class="text-muted">${u.req_date}</td>
                <td class="fw-bold text-dark">${u.req_number}</td>
                <td><i class="fas fa-user text-primary me-1"></i>${u.fullname || 'Unknown'}</td>
                <td class="text-end fw-bold text-warning-emphasis fs-6">${parseFloat(u.qty_requested)}</td>
            </tr>`;
        });
        document.getElementById('k2UsersList').innerHTML = html;
        document.getElementById('k2_disp_total').innerText = totalQty;

        const k2ActionBar = document.getElementById('k2-action-bar');
        if (document.getElementById('filter_status').value === 'WAITING') {
            k2ActionBar.classList.remove('d-none');
        } else {
            k2ActionBar.classList.add('d-none');
        }

        switchView('form-k2');
    } catch (error) {
        handleFetchError(error);
    }
};

window.submitK2Batch = function() {
    const prNumber = document.getElementById('input_k2_pr').value.trim();
    const itemCode = document.getElementById('current_req_id').value;

    if (!prNumber) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเลขที่ K2 PR เพื่อใช้อ้างอิง', 'warning'); return; }

    Swal.fire({
        title: 'ยืนยันการเปิด K2?', text: `คุณได้สร้างใบขอซื้อใน K2 ระบบด้วยเลข: ${prNumber} ใช่หรือไม่?`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#ffc107', confirmButtonText: 'ใช่, อัปเดตเลย!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            document.getElementById('loadingOverlay').style.display = 'flex';
            try {
                const res = await fetchDashboardAPI({ action: 'submit_k2_pr', item_code: itemCode, k2_pr_no: prNumber }, 'POST');
                document.getElementById('loadingOverlay').style.display = 'none';
                
                if (res.success) {
                    Swal.fire('Success', 'อัปเดตสถานะสำเร็จ ฝ่ายผลิตจะเห็นเลข PR ของคุณแล้ว', 'success').then(() => {
                        loadActiveQueue(true); 
                        switchView('list');
                    });
                } else { 
                    Swal.fire('Error', res.message, 'error'); 
                }
            } catch (error) {
                handleFetchError(error);
            }
        }
    });
};

// ==========================================
// 🟢 View Switcher 🟢
// ==========================================
function switchView(view) {
    const mode = document.getElementById('current_dashboard_mode').value;
    const targetFormSelector = mode === 'STOCK' ? '#form-stock' : '#form-k2';
    const hideFormSelector = mode === 'STOCK' ? '#form-k2' : '#form-stock';

    const targetForm = document.querySelector(targetFormSelector);
    const hideForm = document.querySelector(hideFormSelector);
    const leftPane = document.getElementById('left-pane');
    const rightPane = document.getElementById('right-pane');
    const emptyState = document.getElementById('empty-state');

    if (hideForm) {
        hideForm.classList.add('d-none');
        hideForm.classList.remove('d-flex');
    }

    if (window.innerWidth < 992) { 
        if (view === 'list') {
            leftPane.classList.remove('d-none'); leftPane.classList.add('d-flex');
            rightPane.classList.remove('d-flex'); rightPane.classList.add('d-none');
            document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active')); 
            document.getElementById('current_req_id').value = '';
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
            document.querySelectorAll('.order-card').forEach(el => el.classList.remove('active')); 
            document.getElementById('current_req_id').value = '';
        }
    }

    if (view !== 'list' || document.getElementById('current_req_id').value !== '') {
        emptyState.classList.add('d-none'); emptyState.classList.remove('d-flex');
        if (targetForm) { targetForm.classList.remove('d-none'); targetForm.classList.add('d-flex'); }
    }
}

// ==========================================
// 🟢 โหมด: จัดการรูปภาพสินค้า (IMAGE MANAGEMENT) 🟢
// ==========================================
let imgModal;
let imgPage = 1;
const imgLimit = 40;
let imgLoading = false;
let imgHasMore = true;
let searchImgTimeout;

document.addEventListener('DOMContentLoaded', () => {
    // ผูก Event Search
    const searchImgInput = document.getElementById('searchImgItem');
    if (searchImgInput) {
        searchImgInput.addEventListener('input', () => {
            clearTimeout(searchImgTimeout);
            searchImgTimeout = setTimeout(() => { loadItemsForImage(true); }, 500);
        });
    }

    // ผูก Event Scroll ให้ Workspace
    const workspace = document.getElementById('image-layout');
    if (workspace) {
        workspace.addEventListener('scroll', function() {
            if (this.scrollHeight - this.scrollTop <= this.clientHeight + 300) {
                if (!imgLoading && imgHasMore) loadItemsForImage(false);
            }
        });
    }
});

window.openImageManager = function() {
    const searchImgInput = document.getElementById('searchImgItem');
    if (searchImgInput) searchImgInput.value = '';
    if (imgModal) imgModal.show();
    loadItemsForImage(true);
};

window.loadItemsForImage = async function(reset = false) {
    if (imgLoading) return;
    const search = document.getElementById('searchImgItem').value.trim();
    const grid = document.getElementById('itemsImgGrid');

    if (reset) {
        imgPage = 1; imgHasMore = true;
        grid.innerHTML = '<div class="col-12 text-center py-5 mt-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div></div>';
    } else {
        grid.insertAdjacentHTML('beforeend', '<div id="imgLoadMore" class="col-12 text-center py-4"><div class="spinner-border text-secondary spinner-border-sm"></div></div>');
    }

    imgLoading = true;

    try {
        const res = await fetchDashboardAPI({ action: 'get_items', search: search, page: imgPage, limit: imgLimit }, 'GET');
        
        imgLoading = false; 
        const loadMoreIndicator = document.getElementById('imgLoadMore');
        if (loadMoreIndicator) loadMoreIndicator.remove();
        
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        
        if (res.data.length < imgLimit) imgHasMore = false;
        
        let html = '';
        if (res.data.length === 0 && reset) {
            html = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-search fa-4x mb-3 opacity-25"></i><h5 class="fw-bold">ไม่พบรายการสินค้า</h5></div>`;
            grid.innerHTML = html;
        } else {
            res.data.forEach(item => {
                const imgHtml = item.image_path 
                    ? `<img src="../../uploads/items/${item.image_path}?v=${new Date().getTime()}" class="product-img" id="img_tgt_${item.sap_no}" loading="lazy" onerror="this.outerHTML='${getPlaceholderHTML(item.item_category, item.sap_no)}'">` 
                    : getPlaceholderHTML(item.item_category, item.sap_no);

                html += `
                <div class="col-6 col-sm-4 col-md-3 col-xl-2">
                    <div class="card border border-light shadow-sm h-100">
                        
                        <div class="position-relative w-100 bg-light border-bottom" style="padding-top:100%; cursor:pointer;" onclick="document.getElementById('file_${item.sap_no}').click()">
                            <div id="img_container_${item.sap_no}">${imgHtml}</div>
                            <div class="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 text-white d-flex flex-column align-items-center justify-content-center opacity-0 transition-opacity" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
                                <i class="fas fa-camera fa-2x mb-1"></i><small class="fw-bold">อัปโหลดรูป</small>
                            </div>
                        </div>

                        <input type="file" id="file_${item.sap_no}" class="d-none" accept="image/jpeg, image/png, image/webp" onchange="uploadImage('${item.sap_no}', this)">

                        <div class="card-body p-2 d-flex flex-column">
                            <div class="small text-primary fw-bold mb-1 text-truncate">SAP: ${item.sap_no}</div>
                            <div class="fw-bold text-dark" style="font-size:0.8rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.part_description || '-'}</div>
                        </div>

                    </div>
                </div>`;
            });
            
            if (reset) grid.innerHTML = html; 
            else grid.insertAdjacentHTML('beforeend', html);
            
            imgPage++; 
        }
    } catch (error) {
        imgLoading = false; 
        const loadMoreIndicator = document.getElementById('imgLoadMore');
        if (loadMoreIndicator) loadMoreIndicator.remove();
    }
};

window.uploadImage = async function(sapNo, inputElement) {
    if (!inputElement.files || inputElement.files.length === 0) return;
    const file = inputElement.files[0];
    
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire('ไฟล์ใหญ่เกินไป!', 'กรุณาเลือกรูปขนาดไม่เกิน 5MB', 'warning');
        inputElement.value = ''; return;
    }

    let formData = new FormData();
    formData.append('action', 'upload_image');
    formData.append('sap_no', sapNo);
    formData.append('image', file);

    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const res = await fetchDashboardAPI(formData, 'POST');
        document.getElementById('loadingOverlay').style.display = 'none';
        
        if (res.success) {
            const newImg = `<img src="../../uploads/items/${res.image_path}?v=${new Date().getTime()}" class="product-img" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">`;
            document.getElementById(`img_container_${sapNo}`).innerHTML = newImg;
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปโหลดสำเร็จ', showConfirmButton: false, timer: 1500 });
        } else { 
            Swal.fire('Error', res.message, 'error'); 
        }
    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
        inputElement.value = ''; 
    }
};

// ==========================================
// 🟢 โหมด: สถิติวิเคราะห์ข้อมูล (DATA ANALYTICS) 🟢
// ==========================================
let chartItemsInst = null;
let chartUsersInst = null;
let rawExportData = [];

window.switchDashboardMode = function(mode) {
    document.getElementById('current_dashboard_mode').value = mode;
    document.getElementById('current_req_id').value = ''; 

    // Reset Tabs
    document.querySelectorAll('.mode-tab').forEach(tab => tab.classList.remove('active'));
    
    const layoutOrder = document.getElementById('order-layout');
    const layoutAnalytics = document.getElementById('analytics-layout');
    const layoutImage = document.getElementById('image-layout');

    // ซ่อนทั้งหมดก่อน
    if(layoutOrder) layoutOrder.classList.add('d-none');
    if(layoutAnalytics) layoutAnalytics.classList.add('d-none');
    if(layoutImage) layoutImage.classList.add('d-none');

    if (mode === 'STOCK') {
        document.getElementById('tab-stock').classList.add('active');
        if(layoutOrder) layoutOrder.classList.remove('d-none');
        document.querySelectorAll('.opt-k2').forEach(el => el.classList.add('d-none')); 
        document.querySelectorAll('.opt-stock').forEach(el => el.classList.remove('d-none'));
        const filterStatus = document.getElementById('filter_status');
        if (filterStatus) filterStatus.value = 'ACTIVE'; 
        toggleDateFilter(); switchView('list'); loadActiveQueue();
    } 
    else if (mode === 'K2') {
        document.getElementById('tab-k2').classList.add('active');
        if(layoutOrder) layoutOrder.classList.remove('d-none');
        document.querySelectorAll('.opt-stock').forEach(el => el.classList.add('d-none')); 
        document.querySelectorAll('.opt-k2').forEach(el => el.classList.remove('d-none'));
        const filterStatus = document.getElementById('filter_status');
        if (filterStatus) filterStatus.value = 'WAITING';
        toggleDateFilter(); switchView('list'); loadActiveQueue();
    }
    else if (mode === 'ANALYTICS') {
        document.getElementById('tab-analytics').classList.add('active');
        if(layoutAnalytics) layoutAnalytics.classList.remove('d-none');
        
        let d = new Date();
        const startInput = document.getElementById('analytic_start');
        const endInput = document.getElementById('analytic_end');
        if (startInput) startInput.value = new Date(d.getFullYear(), d.getMonth(), 2).toISOString().split('T')[0];
        if (endInput) endInput.value = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0];
        loadAnalytics();
    }
    else if (mode === 'IMAGE') {
        document.getElementById('tab-image').classList.add('active');
        if(layoutImage) layoutImage.classList.remove('d-none');
        const searchImgInput = document.getElementById('searchImgItem');
        if (searchImgInput) searchImgInput.value = '';
        loadItemsForImage(true);
    }
};

window.loadAnalytics = async function() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        const res = await fetchDashboardAPI({ 
            action: 'get_analytics', 
            start_date: document.getElementById('analytic_start').value, 
            end_date: document.getElementById('analytic_end').value 
        }, 'GET');

        document.getElementById('loadingOverlay').style.display = 'none';
        if(!res.success) { Swal.fire('Error', res.message, 'error'); return; }

        document.getElementById('stat_total_reqs').innerText = res.summary.total_reqs;
        document.getElementById('stat_total_issued').innerText = res.summary.total_issued_qty.toLocaleString();
        document.getElementById('stat_waiting_k2').innerText = res.summary.waiting_k2;

        rawExportData = res.exportData;

        if(chartItemsInst) chartItemsInst.destroy();
        const ctxItems = document.getElementById('chartTopItems').getContext('2d');
        chartItemsInst = new Chart(ctxItems, {
            type: 'bar',
            data: {
                labels: res.topItems.map(i => (i.part_description || '').substring(0, 20) + '...'),
                datasets: [{ label: 'จำนวนชิ้นที่เบิก', data: res.topItems.map(i => i.total_qty), backgroundColor: '#0d6efd', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        if(chartUsersInst) chartUsersInst.destroy();
        const ctxUsers = document.getElementById('chartTopUsers').getContext('2d');
        chartUsersInst = new Chart(ctxUsers, {
            type: 'doughnut',
            data: {
                labels: res.topUsers.map(u => u.fullname),
                datasets: [{ data: res.topUsers.map(u => u.req_count), backgroundColor: ['#198754', '#ffc107', '#dc3545', '#0dcaf0', '#6c757d'] }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

    } catch (error) {
        handleFetchError(error);
    }
};

window.exportToCSV = function() {
    if (rawExportData.length === 0) {
        Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info'); return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "วันที่เบิก,เลขที่บิล,ผู้เบิก,รหัส SAP,ชื่อวัสดุ,จำนวนขอเบิก,จำนวนจ่ายจริง,ประเภทคำขอ,สถานะ\n";

    rawExportData.forEach(row => {
        let cleanDesc = row.part_description ? row.part_description.replace(/,/g, " ") : "-";
        let rowData = [row.date_req, row.req_number, row.requester, row.sap_no, cleanDesc, row.qty_requested, row.qty_issued || 0, row.request_type, row.status];
        csvContent += rowData.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Store_Export_${document.getElementById('analytic_start').value}_to_${document.getElementById('analytic_end').value}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};