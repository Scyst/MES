"use strict";

const API_URL = 'api/manageStoreDashboard.php';
let currentItems = [];

$(document).ready(function() {
    let d = new Date(); d.setDate(d.getDate() - 30);
    $('#filter_start').val(d.toISOString().split('T')[0]);
    $('#filter_end').val(new Date().toISOString().split('T')[0]);

    loadActiveQueue();
    
    // Auto Refresh 
    setInterval(() => { 
        if ($('#filter_status').val() === 'ACTIVE' || $('#filter_status').val() === 'WAITING') {
            loadActiveQueue(true); 
        }
    }, 30000);
});

function handleAjaxError(xhr, defaultMsg = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์") {
    $('#loadingOverlay').hide();
    let errorMsg = defaultMsg;
    try { const res = JSON.parse(xhr.responseText); if (res.message) errorMsg = res.message; } catch (e) {}
    Swal.fire('Error', errorMsg, 'error');
}

function getIconPlaceholder(category) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 
    return `<div class="ph-small"><i class="fas ${icon}" style="color:${color}; opacity:0.5;"></i></div>`;
}

// 🟢 ฟังก์ชันสำหรับสร้างรูปภาพ Placeholder เมื่อสินค้ายังไม่มีรูปภาพ 🟢
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

window.switchDashboardMode = function(mode) {
    $('#current_dashboard_mode').val(mode);
    $('#current_req_id').val(''); // เคลียร์ของเก่า

    if (mode === 'STOCK') {
        $('.opt-k2').addClass('d-none'); $('.opt-stock').removeClass('d-none');
        $('#filter_status').val('ACTIVE'); 
    } else {
        $('.opt-stock').addClass('d-none'); $('.opt-k2').removeClass('d-none');
        $('#filter_status').val('WAITING');
    }
    
    toggleDateFilter();
    switchView('list');
    loadActiveQueue();
};

window.toggleDateFilter = function() {
    const val = $('#filter_status').val();
    if (val === 'ALL' || val === 'K2_OPENED') { $('#date_filter_container').removeClass('d-none'); } 
    else { $('#date_filter_container').addClass('d-none'); }
};

window.loadActiveQueue = function(isSilent = false) {
    const mode = $('#current_dashboard_mode').val();
    if (mode === 'STOCK') loadStockOrders(isSilent);
    else loadK2Summary(isSilent);
};

// ==========================================
// 🟢 ฟังก์ชันฝั่ง STOCK (จ่ายของปกติ) 🟢
// ==========================================
function loadStockOrders(isSilent) {
    if (!isSilent) $('#orderListContainer').html('<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>');
    
    const payload = { action: 'get_orders', status: $('#filter_status').val(), start_date: $('#filter_start').val(), end_date: $('#filter_end').val() };

    $.getJSON(API_URL, payload, function(res) {
        if (!res.success) return;
        let html = '';
        if (res.data.length === 0) {
            let emptyText = $('#filter_status').val() === 'ACTIVE' ? 'ไม่มีออเดอร์ค้างจัด' : 'ไม่มีประวัติการเบิกในช่วงนี้';
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-clipboard-check fa-4x mb-3 opacity-25"></i><br>${emptyText}</div>`;
        } else {
            res.data.forEach(order => {
                let sClass = '', sBadge = '', isPulse = '';
                if (order.status === 'NEW ORDER') { sClass = 'status-new'; sBadge = '<span class="badge bg-danger">NEW</span>'; isPulse = 'pulse-alert'; }
                else if (order.status === 'PREPARING') { sClass = 'status-prep'; sBadge = '<span class="badge bg-warning text-dark">PREPARING</span>'; }
                else if (order.status === 'COMPLETED') { sClass = 'status-comp'; sBadge = '<span class="badge bg-success">COMPLETED</span>'; }
                else { sClass = 'status-rej'; sBadge = '<span class="badge bg-secondary">REJECTED</span>'; }
                const isActive = ($('#current_req_id').val() == order.id) ? 'active' : '';

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
        $('#orderListContainer').html(html);
    }).fail((xhr) => { if(!isSilent) handleAjaxError(xhr); });
}

window.openStockOrder = function(reqId) {
    $('#loadingOverlay').css('display', 'flex');
    $('.order-card').removeClass('active');
    $(`#order-card-${reqId}`).addClass('active').removeClass('pulse-alert'); 
    $('#current_req_id').val(reqId);

    $.getJSON(API_URL, { action: 'get_order_details', req_id: reqId }, function(res) {
        $('#loadingOverlay').hide();
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }

        const h = res.header; currentItems = res.items;

        $('#disp_req_no').text(h.req_number);
        $('#disp_time').html(`<i class="far fa-clock"></i> ${h.req_time}`);
        $('#disp_requester').text(h.requester_name || '-');
        $('#disp_remark').text(h.remark || '-');
        
        let headerColor = 'bg-dark', statusText = h.status;
        if (h.status === 'NEW ORDER') { headerColor = 'bg-danger'; }
        else if (h.status === 'PREPARING') { headerColor = 'bg-warning text-dark'; }
        else if (h.status === 'COMPLETED') { headerColor = 'bg-success'; }
        
        $('#header-bg').removeClass('bg-dark bg-danger bg-warning bg-success text-dark text-white').addClass(headerColor);
        if(h.status !== 'PREPARING') $('#header-bg').addClass('text-white');
        $('#disp_status').text(statusText).removeClass('text-dark text-white').addClass(h.status==='PREPARING' ? 'text-dark' : 'text-primary');

        let itemsHtml = ''; const isEditable = (h.status === 'PREPARING'); 

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
        $('#itemsContainer').html(itemsHtml);

        if (h.status === 'COMPLETED' && h.issuer_name) {
            $('#disp_issuer').text(h.issuer_name); $('#disp_issue_time').text(h.issue_time); $('#issuerContainer').removeClass('d-none');
        } else { $('#issuerContainer').addClass('d-none'); }

        let btnHtml = '';
        if (h.status === 'NEW ORDER') {
            btnHtml = `<button class="btn btn-outline-danger fw-bold px-4" onclick="rejectOrder(${reqId})"><i class="fas fa-times me-1"></i> ปฏิเสธ (Reject)</button>
                       <button class="btn btn-warning text-dark fw-bold px-5 fs-5" onclick="acceptOrder(${reqId})"><i class="fas fa-hand-paper me-2"></i> รับออเดอร์</button>`;
            $('#action-bar-mobile').removeClass('d-none').html(btnHtml);
        } else if (h.status === 'PREPARING') {
            btnHtml = `<button class="btn btn-success fw-bold px-5 fs-5 w-100 w-md-auto" onclick="confirmIssue(${reqId})"><i class="fas fa-check-double me-2"></i> ยืนยันจ่ายของ</button>`;
            $('#action-bar-mobile').removeClass('d-none').html(btnHtml);
        } else { $('#action-bar-mobile').addClass('d-none'); }

        switchView('form-stock');
    }).fail(handleAjaxError);
};

window.acceptOrder = function(reqId) {
    $('#loadingOverlay').css('display', 'flex');
    $.post(API_URL, { action: 'accept_order', req_id: reqId }, function(res) {
        if (res.success) { Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'รับออเดอร์แล้ว!', showConfirmButton: false, timer: 1500 }); loadActiveQueue(true); openStockOrder(reqId); }
        else { $('#loadingOverlay').hide(); Swal.fire('Error', res.message, 'error'); }
    }, 'json').fail(handleAjaxError);
};

window.rejectOrder = function(reqId) {
    Swal.fire({ title: 'ปฏิเสธคำขอเบิก?', input: 'text', inputPlaceholder: 'ระบุเหตุผล...', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc3545', confirmButtonText: 'ยืนยัน Reject'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex');
            $.post(API_URL, { action: 'reject_order', req_id: reqId, reason: result.value }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) { Swal.fire('Rejected', 'ยกเลิกออเดอร์เรียบร้อย', 'success'); loadActiveQueue(true); openStockOrder(reqId); }
                else { Swal.fire('Error', res.message, 'error'); }
            }, 'json').fail(handleAjaxError);
        }
    });
};

window.confirmIssue = function(reqId) {
    let issueData = []; let hasError = false;
    $('.issue-qty-input').each(function() {
        const rowId = $(this).data('rowid'), itemId = $(this).data('itemid'), itemCode = $(this).data('itemcode'), issueQty = parseFloat($(this).val()), maxQty = parseFloat($(this).attr('max')); 
        if (isNaN(issueQty) || issueQty < 0) { hasError = `กรุณากรอกจำนวนให้ถูกต้อง (SAP: ${itemCode})`; return false; }
        if (issueQty > maxQty) { hasError = `สต๊อกมีไม่พอจ่าย! (SAP: ${itemCode} จ่ายได้สูงสุด ${maxQty})`; return false; }
        issueData.push({ row_id: rowId, item_id: itemId, item_code: itemCode, qty_issued: issueQty });
    });

    if (hasError) { Swal.fire('ข้อมูลไม่ถูกต้อง', hasError, 'warning'); return; }

    Swal.fire({ title: 'ยืนยันการจ่ายของ?', text: 'ระบบจะทำการหักสต๊อกทันที', icon: 'question', showCancelButton: true, confirmButtonColor: '#198754', confirmButtonText: 'Yes, Confirm!'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex');
            $.post(API_URL, { action: 'confirm_issue', req_id: reqId, req_number: $('#disp_req_no').text(), items: JSON.stringify(issueData) }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) { Swal.fire('Success', 'จ่ายของและตัดสต๊อกสำเร็จ!', 'success').then(() => { loadActiveQueue(true); switchView('list'); }); } 
                else { Swal.fire('Error', res.message, 'error'); }
            }, 'json').fail(handleAjaxError);
        }
    });
};

// ==========================================
// 🟢 ฟังก์ชันฝั่ง K2 (รวบรวมเปิด K2) 🟢
// ==========================================
function loadK2Summary(isSilent) {
    if (!isSilent) $('#orderListContainer').html('<div class="text-center py-5"><div class="spinner-border text-warning"></div></div>');
    
    $.getJSON(API_URL, { action: 'get_k2_summary', status: $('#filter_status').val() }, function(res) {
        if (!res.success) return;
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="text-center text-muted py-5 mt-4"><i class="fas fa-shopping-basket fa-4x mb-3 opacity-25"></i><br>ไม่มีรายการรอเปิด K2</div>`;
        } else {
            res.data.forEach(item => {
                const isActive = ($('#current_req_id').val() === item.item_code) ? 'active' : '';
                const isPulse = ($('#filter_status').val() === 'WAITING') ? 'pulse-alert' : '';
                
                let badge = $('#filter_status').val() === 'WAITING' 
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
        $('#orderListContainer').html(html);
    }).fail((xhr) => { if(!isSilent) handleAjaxError(xhr); });
}

window.openK2Detail = function(itemCode, description, category, imgPath) {
    $('#loadingOverlay').css('display', 'flex');
    $('.order-card').removeClass('active');
    $(`#k2-card-${itemCode}`).addClass('active').removeClass('pulse-alert'); 
    $('#current_req_id').val(itemCode);

    // Render Header
    const imgHtml = imgPath && imgPath !== 'null' ? `<img src="../../uploads/items/${imgPath}" class="item-img-small">` : getIconPlaceholder(category);
    $('#k2_disp_img').html(imgHtml);
    $('#k2_disp_desc').text(description);
    $('#k2_disp_sap').text(itemCode);
    $('#input_k2_pr').val('');

    // Fetch Users requested
    $.getJSON(API_URL, { action: 'get_k2_item_details', item_code: itemCode, status: $('#filter_status').val() }, function(res) {
        $('#loadingOverlay').hide();
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
        $('#k2UsersList').html(html);
        $('#k2_disp_total').text(totalQty);

        if ($('#filter_status').val() === 'WAITING') {
            $('#k2-action-bar').removeClass('d-none');
        } else {
            $('#k2-action-bar').addClass('d-none');
        }

        switchView('form-k2');
    }).fail(handleAjaxError);
};

window.submitK2Batch = function() {
    const prNumber = $('#input_k2_pr').val().trim();
    const itemCode = $('#current_req_id').val();

    if (!prNumber) { Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเลขที่ K2 PR เพื่อใช้อ้างอิง', 'warning'); return; }

    Swal.fire({
        title: 'ยืนยันการเปิด K2?', text: `คุณได้สร้างใบขอซื้อใน K2 ระบบด้วยเลข: ${prNumber} ใช่หรือไม่?`,
        icon: 'question', showCancelButton: true, confirmButtonColor: '#ffc107', confirmButtonText: 'ใช่, อัปเดตเลย!'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex');
            $.post(API_URL, { action: 'submit_k2_pr', item_code: itemCode, k2_pr_no: prNumber }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) {
                    Swal.fire('Success', 'อัปเดตสถานะสำเร็จ ฝ่ายผลิตจะเห็นเลข PR ของคุณแล้ว', 'success').then(() => {
                        loadActiveQueue(true); switchView('list');
                    });
                } else { Swal.fire('Error', res.message, 'error'); }
            }, 'json').fail(handleAjaxError);
        }
    });
};

// ==========================================
// 🟢 View Switcher 🟢
// ==========================================
function switchView(view) {
    const mode = $('#current_dashboard_mode').val();
    const targetForm = mode === 'STOCK' ? '#form-stock' : '#form-k2';
    const hideForm = mode === 'STOCK' ? '#form-k2' : '#form-stock';

    $(hideForm).addClass('d-none').removeClass('d-flex');

    if (window.innerWidth < 992) { 
        if (view === 'list') {
            $('#left-pane').removeClass('d-none').addClass('d-flex');
            $('#right-pane').removeClass('d-flex').addClass('d-none');
            $('.order-card').removeClass('active'); $('#current_req_id').val('');
        } else {
            $('#left-pane').removeClass('d-flex').addClass('d-none');
            $('#right-pane').removeClass('d-none').addClass('d-flex');
            window.scrollTo(0,0);
        }
    } else { 
        $('#left-pane').removeClass('d-none').addClass('d-flex');
        $('#right-pane').removeClass('d-none').addClass('d-flex');
        if(view === 'list') {
            $('#empty-state').removeClass('d-none').addClass('d-flex');
            $(targetForm).addClass('d-none').removeClass('d-flex');
            $('.order-card').removeClass('active'); $('#current_req_id').val('');
        }
    }

    if (view !== 'list' || $('#current_req_id').val() !== '') {
        $('#empty-state').addClass('d-none').removeClass('d-flex');
        $(targetForm).removeClass('d-none').addClass('d-flex');
    }
}

$(window).resize(function() { switchView($('#current_req_id').val() !== '' ? 'form' : 'list'); });

// ==========================================
// 🟢 โหมด: จัดการรูปภาพสินค้า (IMAGE MANAGEMENT) 🟢
// ==========================================
let imgModal;
let imgPage = 1;
const imgLimit = 40;
let imgLoading = false;
let imgHasMore = true;

$(document).ready(function() {
    imgModal = new bootstrap.Modal(document.getElementById('imageManageModal'));

    $('#searchImgItem').on('keyup', function() {
        clearTimeout(window.searchImgTimeout);
        window.searchImgTimeout = setTimeout(() => { loadItemsForImage(true); }, 500);
    });

    // ดักการ Scroll เฉพาะใน Modal
    $('#imageModalBody').on('scroll', function() {
        const div = $(this);
        if (div[0].scrollHeight - div.scrollTop() <= div.outerHeight() + 300) {
            if (!imgLoading && imgHasMore) loadItemsForImage(false);
        }
    });
});

window.openImageManager = function() {
    $('#searchImgItem').val('');
    imgModal.show();
    loadItemsForImage(true);
};

window.loadItemsForImage = function(reset = false) {
    if (imgLoading) return;
    const search = $('#searchImgItem').val().trim();

    if (reset) {
        imgPage = 1; imgHasMore = true;
        $('#itemsImgGrid').html('<div class="col-12 text-center py-5 mt-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div></div>');
    } else {
        $('#itemsImgGrid').append('<div id="imgLoadMore" class="col-12 text-center py-4"><div class="spinner-border text-secondary spinner-border-sm"></div></div>');
    }

    imgLoading = true;

    $.getJSON(API_URL, { action: 'get_items', search: search, page: imgPage, limit: imgLimit }, function(res) {
        imgLoading = false; $('#imgLoadMore').remove();
        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        
        if (res.data.length < imgLimit) imgHasMore = false;
        
        let html = '';
        if (res.data.length === 0 && reset) {
            html = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-search fa-4x mb-3 opacity-25"></i><h5 class="fw-bold">ไม่พบรายการสินค้า</h5></div>`;
            $('#itemsImgGrid').html(html);
        } else {
            res.data.forEach(item => {
                const imgHtml = item.image_path 
                    ? `<img src="../../uploads/items/${item.image_path}?v=${new Date().getTime()}" class="product-img" id="img_tgt_${item.sap_no}" loading="lazy" onerror="this.outerHTML='${getPlaceholderHTML(item.item_category, item.sap_no)}'">` 
                    : getPlaceholderHTML(item.item_category, item.sap_no);

                html += `
                <div class="col-6 col-sm-4 col-md-3 col-xl-2">
                    <div class="card border border-light shadow-sm h-100">
                        
                        <div class="position-relative w-100 bg-light border-bottom" style="padding-top:100%; cursor:pointer;" onclick="$('#file_${item.sap_no}').click()">
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
            
            if (reset) $('#itemsImgGrid').html(html); else $('#itemsImgGrid').append(html);
            imgPage++; 
        }
    }).fail(() => { imgLoading = false; $('#imgLoadMore').remove(); });
};

window.uploadImage = function(sapNo, inputElement) {
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

    $('#loadingOverlay').css('display', 'flex');

    $.ajax({
        url: API_URL, type: 'POST', data: formData, contentType: false, processData: false, dataType: 'json',
        success: function(res) {
            $('#loadingOverlay').hide();
            if (res.success) {
                const newImg = `<img src="../../uploads/items/${res.image_path}?v=${new Date().getTime()}" class="product-img" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">`;
                $(`#img_container_${sapNo}`).html(newImg);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปโหลดสำเร็จ', showConfirmButton: false, timer: 1500 });
            } else { Swal.fire('Error', res.message, 'error'); }
            inputElement.value = ''; 
        },
        error: function() { $('#loadingOverlay').hide(); inputElement.value = ''; Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error'); }
    });
};

// ==========================================
// 🟢 โหมด: สถิติวิเคราะห์ข้อมูล (DATA ANALYTICS) 🟢
// ==========================================
let chartItemsInst = null;
let chartUsersInst = null;
let rawExportData = [];

// แทรกโค้ดนี้ลงในฟังก์ชัน switchDashboardMode เดิมของคุณ
window.switchDashboardMode = function(mode) {
    $('#current_dashboard_mode').val(mode);
    $('#current_req_id').val(''); 

    // ซ่อน/แสดง Layout หลัก
    if (mode === 'ANALYTICS') {
        $('.split-layout-height').addClass('d-none');
        $('#analytics-layout').removeClass('d-none');
        
        // เซ็ตวันที่เริ่มเป็นต้นเดือนปัจจุบัน
        let d = new Date();
        $('#analytic_start').val(new Date(d.getFullYear(), d.getMonth(), 2).toISOString().split('T')[0]);
        $('#analytic_end').val(new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().split('T')[0]);
        
        loadAnalytics();
        return; // ออกเลย ไม่ต้องรันโค้ดข้างล่าง
    } else {
        $('.split-layout-height').removeClass('d-none');
        $('#analytics-layout').addClass('d-none');
    }

    if (mode === 'STOCK') {
        $('.opt-k2').addClass('d-none'); $('.opt-stock').removeClass('d-none');
        $('#filter_status').val('ACTIVE'); 
    } else {
        $('.opt-stock').addClass('d-none'); $('.opt-k2').removeClass('d-none');
        $('#filter_status').val('WAITING');
    }
    toggleDateFilter(); switchView('list'); loadActiveQueue();
};

window.loadAnalytics = function() {
    $('#loadingOverlay').css('display', 'flex');
    
    $.getJSON(API_URL, { 
        action: 'get_analytics', 
        start_date: $('#analytic_start').val(), 
        end_date: $('#analytic_end').val() 
    }, function(res) {
        $('#loadingOverlay').hide();
        if(!res.success) { Swal.fire('Error', res.message, 'error'); return; }

        // อัปเดต Summary
        $('#stat_total_reqs').text(res.summary.total_reqs);
        $('#stat_total_issued').text(res.summary.total_issued_qty.toLocaleString());
        $('#stat_waiting_k2').text(res.summary.waiting_k2);

        rawExportData = res.exportData;

        // วาดกราฟ Top 5 Items
        if(chartItemsInst) chartItemsInst.destroy();
        const ctxItems = document.getElementById('chartTopItems').getContext('2d');
        chartItemsInst = new Chart(ctxItems, {
            type: 'bar',
            data: {
                labels: res.topItems.map(i => i.part_description.substring(0, 20) + '...'),
                datasets: [{ label: 'จำนวนชิ้นที่เบิก', data: res.topItems.map(i => i.total_qty), backgroundColor: '#0d6efd', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // วาดกราฟ Top 5 Users
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

    }).fail(handleAjaxError);
};

// ฟังก์ชันแปลง JSON เป็นไฟล์ CSV และดาวน์โหลด
window.exportToCSV = function() {
    if (rawExportData.length === 0) {
        Swal.fire('ไม่มีข้อมูล', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info'); return;
    }

    // หัวตาราง (Header)
    let csvContent = "\uFEFF"; // ป้องกันภาษาไทยเพี้ยนใน Excel (UTF-8 BOM)
    csvContent += "วันที่เบิก,เลขที่บิล,ผู้เบิก,รหัส SAP,ชื่อวัสดุ,จำนวนขอเบิก,จำนวนจ่ายจริง,ประเภทคำขอ,สถานะ\n";

    // ข้อมูลแต่ละแถว
    rawExportData.forEach(row => {
        let cleanDesc = row.part_description ? row.part_description.replace(/,/g, " ") : "-";
        let rowData = [row.date_req, row.req_number, row.requester, row.sap_no, cleanDesc, row.qty_requested, row.qty_issued || 0, row.request_type, row.status];
        csvContent += rowData.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Store_Export_${$('#analytic_start').val()}_to_${$('#analytic_end').val()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};