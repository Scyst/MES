"use strict";

const API_URL = 'api/manageMaterial.php';
let cart = {}; 
let historyModal, trackingModal; 

// 🟢 ตัวแปรสำหรับจัดการ Infinite Scroll 🟢
let currentPage = 1;
const itemLimit = 40; // โหลดครั้งละ 40 ชิ้น
let isLoading = false;
let hasMoreItems = true;

$(document).ready(function() {
    loadCatalog('ALL');

    $('#searchItem').on('keyup', function() {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => { 
            // รีเซ็ตเพื่อโหลดหน้า 1 ใหม่เมื่อพิมพ์ค้นหา
            loadCatalog(null, false); 
        }, 500);
    });

    // Initialize Modals
    historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
    trackingModal = new bootstrap.Modal(document.getElementById('trackingModal'));

    // 🟢 ดักจับการเลื่อนหน้าจอ (Infinite Scroll) 🟢
    $(window).on('scroll', function() {
        // ถ้าเลื่อนมาจนเหลือระยะอีก 300px จะถึงขอบล่างสุด และยังมีของให้โหลดต่อ
        if ($(window).scrollTop() + $(window).height() >= $(document).height() - 300) {
            if (!isLoading && hasMoreItems) {
                loadCatalog(null, true); // โหลดเพิ่ม (isLoadMore = true)
            }
        }
    });

    // 🟢 ตรวจสอบแบบ Real-time เมื่อเปลี่ยนประเภทคำขอ (STOCK / K2) 🟢
    $('input[name="reqType"]').on('change', function() {
        renderCartUI();
    });
});

function handleAjaxError(xhr, defaultMsg = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์") {
    $('#loadingOverlay').hide(); isLoading = false;
    let errorMsg = defaultMsg;
    try { const res = JSON.parse(xhr.responseText); if (res.message) errorMsg = res.message; } catch (e) {}
    Swal.fire('Error', errorMsg, 'error');
}

window.toggleImages = function() {
    $('body').toggleClass('hide-images');
    const isHidden = $('body').hasClass('hide-images');
    const btn = $('#toggleImageBtn');
    
    if (isHidden) {
        btn.html('<i class="fas fa-image text-primary"></i> <span class="ms-1 text-primary">แสดงรูป</span>');
        btn.removeClass('btn-light text-secondary border').addClass('btn-primary bg-opacity-10 border-primary text-primary');
    } else {
        btn.html('<i class="fas fa-image-slash"></i> <span class="ms-1">ซ่อนรูป</span>');
        btn.removeClass('btn-primary bg-opacity-10 border-primary text-primary').addClass('btn-light text-secondary border');
    }
};

function getPlaceholderHTML(category, sapNo) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 

    return `
        <div class="placeholder-img d-flex flex-column align-items-center justify-content-center" 
             style="background: radial-gradient(circle, #ffffff 0%, #f0f3f8 100%);">
            <i class="fas ${icon} fa-4x mb-3" style="color: ${color}; opacity: 0.3;"></i>
            <span class="small fw-bold px-2 w-100 text-center text-truncate" 
                  style="color: ${color}; opacity: 0.4; letter-spacing: 1px;">
                ${sapNo}
            </span>
        </div>
    `;
}

// 🟢 ฟังก์ชันช่วยเหลือเมื่อรูปภาพโหลดไม่ขึ้น (ป้องกันเครื่องหมายคำพูดตีกัน) 🟢
window.handleImageError = function(imgElement, category, sapNo) {
    $(imgElement).replaceWith(getPlaceholderHTML(category, sapNo));
};

function getIconPlaceholder(category) {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 
    return `<div class="ph-mini d-flex align-items-center justify-content-center bg-light border rounded" style="width: 45px; height: 45px;"><i class="fas ${icon}" style="color:${color}; opacity:0.5; font-size: 1.2rem;"></i></div>`;
}

// 🟢 โหลดข้อมูลแคตตาล็อก (รองรับการแบ่งหน้า) 🟢
window.loadCatalog = function(category = null, isLoadMore = false) {
    if (isLoading) return;
    
    if (!category) category = $('.category-chip.active').data('category') || 'ALL';

    const search = $('#searchItem').val().trim();
    const sort = $('#sortItem').val() || 'DEFAULT'; 

    if (!isLoadMore) {
        // กรณีโหลดใหม่ (หน้า 1)
        currentPage = 1;
        hasMoreItems = true;
        $('#catalogGrid').html('<div class="col-12 text-center py-5 mt-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div></div>');
    } else {
        // กรณีเลื่อนจอเพื่อโหลดเพิ่ม ให้โชว์ Spinner เล็กๆ ต่อท้าย
        $('#catalogGrid').append('<div id="loadMoreSpinner" class="col-12 text-center py-4"><div class="spinner-border text-secondary spinner-border-sm"></div></div>');
    }

    isLoading = true;

    $.getJSON(API_URL, { action: 'get_catalog', category: category, search: search, sort: sort, page: currentPage, limit: itemLimit }, function(res) {
        isLoading = false;
        $('#loadMoreSpinner').remove();

        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        
        // เช็คว่ายังมีของให้โหลดต่อไหม (ถ้าได้มาน้อยกว่าลิมิต แปลว่าหมดแล้ว)
        if (res.data.length < itemLimit) {
            hasMoreItems = false;
        }
        
        let html = '';
        if (res.data.length === 0 && !isLoadMore) {
            html = `<div class="col-12 text-center text-muted py-5 mt-5">
                        <i class="fas fa-search fa-4x mb-3 opacity-25"></i>
                        <h4 class="fw-bold">ไม่พบรายการสินค้า</h4>
                        <p>ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่ด้านบนใหม่</p>
                    </div>`;
            $('#catalogGrid').html(html);
        } else {
            res.data.forEach(item => {
                const onHand = parseFloat(item.onhand_qty);
                const isOutOfStock = onHand <= 0;
                const safeDesc = item.description ? item.description.replace(/'/g, "\\'") : 'N/A';
                
                const imgHtml = item.image_path 
                    ? `<img src="../../uploads/items/${item.image_path}" class="product-img" loading="lazy" onerror="handleImageError(this, '${item.item_category}', '${item.item_code}')">` 
                    : getPlaceholderHTML(item.item_category, item.item_code);

                const badgeHtml = isOutOfStock 
                    ? `<span class="badge bg-danger stock-badge px-2 py-1"><i class="fas fa-times-circle me-1"></i> สินค้าหมด</span>`
                    : `<span class="badge bg-success stock-badge px-2 py-1"><i class="fas fa-check-circle me-1"></i> สต๊อก: ${onHand.toLocaleString()}</span>`;

                const cardOpacity = isOutOfStock ? 'opacity: 0.85;' : '';
                const currentCartQty = cart[item.item_code] ? cart[item.item_code].qty : 1;

                // 🟢 ปลดล็อค input แม้ของจะหมด เพื่อให้ขอซื้อ K2 ได้ 🟢
                html += `
                <div class="col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 col-xxl-2">
                    <div class="product-card" style="${cardOpacity}">
                        <div class="product-img-wrapper">${badgeHtml}${imgHtml}</div>
                        <div class="d-none badge-alt-container p-2 pb-0">${badgeHtml.replace('stock-badge', 'stock-badge-alt')}</div>

                        <div class="card-body-flex pt-2">
                            <div class="small text-primary fw-bold mb-1">SAP: ${item.item_code}</div>
                            <div class="product-title" title="${item.description}">${item.description || '-'}</div>
                            
                            <div class="mt-auto pt-3 border-top">
                                <div class="input-group input-group-sm shadow-sm">
                                    <button class="btn btn-light border px-2 text-secondary fw-bold" type="button" onclick="updateInputQty('${item.item_code}', -1)"><i class="fas fa-minus"></i></button>
                                    <input type="number" id="input_qty_${item.item_code}" class="form-control text-center fw-bold text-primary px-1" value="${currentCartQty}" min="1" max="99999">
                                    <button class="btn btn-light border px-2 text-secondary fw-bold" type="button" onclick="updateInputQty('${item.item_code}', 1)"><i class="fas fa-plus"></i></button>
                                    <button class="btn btn-primary px-2 fw-bold" type="button" onclick="addToCart('${item.item_code}', '${safeDesc}', ${onHand})"><i class="fas fa-cart-plus"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            });
            
            if (!isLoadMore) {
                $('#catalogGrid').html(html);
            } else {
                $('#catalogGrid').append(html);
            }

            // ถ้าไม่มีของให้โหลดแล้ว ให้ขึ้นข้อความบอกเบาๆ
            if (!hasMoreItems && res.data.length > 0) {
                $('#catalogGrid').append('<div class="col-12 text-center text-muted py-4 small">--- แสดงรายการทั้งหมดแล้ว ---</div>');
            }

            currentPage++; 
        }
    }).fail(handleAjaxError);
};

window.updateInputQty = function(itemCode, change) {
    let input = $(`#input_qty_${itemCode}`);
    let current = parseInt(input.val()) || 1;
    let newVal = current + change;
    if(newVal >= 1) input.val(newVal); 
};

window.addToCart = function(itemCode, description, onHandQty) {
    let inputQty = parseInt($(`#input_qty_${itemCode}`).val()) || 1;
    // เก็บ onHandQty ไว้ใน maxQty เพื่อเอาไว้เช็คตอนจบ
    cart[itemCode] = { description: description, qty: inputQty, maxQty: onHandQty };
    
    $('.cart-fab').css('transform', 'scale(1.2)');
    setTimeout(() => $('.cart-fab').css('transform', 'scale(1)'), 200);
    Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', title: 'หยิบใส่ตะกร้าแล้ว', showConfirmButton: false, timer: 1200 });
    renderCartUI();
};

window.removeFromCart = function(itemCode) { delete cart[itemCode]; renderCartUI(); };

function renderCartUI() {
    const itemCodes = Object.keys(cart);
    const totalItems = itemCodes.length;
    $('#cartItemCount').text(totalItems);
    if(totalItems > 0) {
        $('#cartItemCount').addClass('animate__animated animate__bounceIn');
        setTimeout(() => $('#cartItemCount').removeClass('animate__animated animate__bounceIn'), 1000);
    }

    if (totalItems === 0) {
        $('#cartItemsContainer').html(`<div class="text-center text-muted py-5 mt-5"><i class="fas fa-box-open fa-4x mb-3 opacity-25"></i><h6>ตะกร้าว่างเปล่า</h6></div>`);
        $('#btnCheckout').prop('disabled', true);
        return;
    }

    const reqType = $('input[name="reqType"]:checked').val(); // ดึงค่าประเภทคำขอปัจจุบัน
    let html = '';
    
    itemCodes.forEach(code => {
        let item = cart[code];
        
        // 🟢 แสดงแจ้งเตือนในตะกร้า ถ้าเลือก "เบิกของ" แต่จำนวนเกินสต๊อก 🟢
        let warningHtml = '';
        if (reqType === 'STOCK' && item.qty > item.maxQty) {
            warningHtml = `<div class="small text-danger fw-bold mt-1"><i class="fas fa-exclamation-triangle"></i> สต๊อกมีแค่ ${item.maxQty} ชิ้น (ต้องเปิด K2)</div>`;
        }

        html += `
        <div class="card shadow-sm border-0 mb-2">
            <div class="card-body p-2 d-flex justify-content-between align-items-center">
                <div class="pe-2" style="width: 70%;">
                    <div class="fw-bold text-dark text-truncate" style="font-size:0.9rem;">${item.description}</div>
                    <small class="text-primary fw-bold">SAP: ${code}</small>
                    ${warningHtml}
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <span class="badge bg-light text-dark border px-2 py-1 fs-6 shadow-sm">x ${item.qty}</span>
                    <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="removeFromCart('${code}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>`;
    });
    $('#cartItemsContainer').html(html);
    $('#btnCheckout').prop('disabled', false);
}

window.filterCategory = function(category, element) {
    $('.category-chip').removeClass('active');
    $(element).addClass('active').data('category', category); 
    $('#searchItem').val(''); 
    loadCatalog(category, false); 
};

// 🟢 ด่านตรวจ Validation ตอนกด Submit 🟢
window.submitRequisition = function() {
    const remark = $('#reqRemark').val().trim();
    const reqType = $('input[name="reqType"]:checked').val();
    const itemCodes = Object.keys(cart);
    
    if (itemCodes.length === 0) return;

    // ตรวจสอบสต๊อก หากเป็นการ "เบิกจากคลัง (STOCK)"
    if (reqType === 'STOCK') {
        for (let code of itemCodes) {
            let item = cart[code];
            if (item.qty > item.maxQty) {
                Swal.fire({
                    title: 'สต๊อกไม่เพียงพอ!',
                    html: `คุณกำลังขอเบิก <b>"${item.description}"</b> จำนวน ${item.qty} ชิ้น<br>แต่ในคลังมีเพียง <b class="text-danger">${item.maxQty}</b> ชิ้น<br><br><span class="text-muted small">หากต้องการสั่งซื้อ กรุณาเปลี่ยนประเภทคำขอเป็น "ขอสั่งซื้อ (K2)" ด้านล่างครับ</span>`,
                    icon: 'warning',
                    confirmButtonText: 'เข้าใจแล้ว'
                });
                return; // หยุดการทำงาน ไม่ให้ไปต่อ
            }
        }
    }

    let typeName = reqType === 'K2' ? 'ขอสั่งซื้อ (K2)' : 'เบิกจากคลัง (Stock)';

    Swal.fire({
        title: 'ยืนยันการส่งคำขอ?', 
        text: `คุณต้องการส่งคำขอประเภท "${typeName}" จำนวน ${itemCodes.length} รายการ ใช่หรือไม่?`, 
        icon: 'question',
        showCancelButton: true, 
        confirmButtonColor: reqType === 'K2' ? '#ffc107' : '#198754', 
        confirmButtonText: 'Yes, Submit!'
    }).then((result) => {
        if (result.isConfirmed) {
            $('#loadingOverlay').css('display', 'flex');
            const payloadCart = itemCodes.map(code => { return { itemCode: code, qty: cart[code].qty }; });

            $.post(API_URL, { 
                action: 'submit_requisition', 
                cart: JSON.stringify(payloadCart), 
                remark: remark,
                request_type: reqType
            }, function(res) {
                $('#loadingOverlay').hide();
                if (res.success) {
                    Swal.fire({ 
                        title: 'Success!', 
                        html: `ส่งคำขอสำเร็จ<br><b class="text-success fs-3 mt-2 d-block">${res.req_number}</b>`, 
                        icon: 'success' 
                    }).then(() => {
                        cart = {}; $('#reqRemark').val(''); renderCartUI();
                        bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'))?.hide();
                        loadCatalog(null, false); 
                    });
                } else { Swal.fire('Error', res.message, 'error'); }
            }, 'json').fail(handleAjaxError);
        }
    });
};

// ========================================================
// 🟢 ส่วนควบคุม Modal ประวัติการเบิก (History & Tracking)
// ========================================================
window.openHistoryModal = function() {
    if (!$('#histStartDate').val()) {
        let d = new Date();
        d.setDate(d.getDate() - 30);
        $('#histStartDate').val(d.toISOString().split('T')[0]);
    }
    if (!$('#histEndDate').val()) {
        $('#histEndDate').val(new Date().toISOString().split('T')[0]);
    }

    const startDate = $('#histStartDate').val();
    const endDate = $('#histEndDate').val();

    $('#orderHistoryList').html('<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>');
    historyModal.show();

    $.getJSON(API_URL, { action: 'get_my_orders', start_date: startDate, end_date: endDate }, function(res) {
        if (!res.success) return;
        let html = '';
        if (res.data.length === 0) {
            html = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-history fa-3x mb-3 opacity-25"></i><br><h6>ไม่มีประวัติการเบิกในช่วงเวลานี้</h6></div>`;
        } else {
            res.data.forEach(order => {
                let badgeClass = 'bg-secondary', icon = 'fa-clock', statusTH = '';
                if (order.status === 'NEW ORDER') { badgeClass = 'bg-warning text-dark'; icon = 'fa-hourglass-half'; statusTH = 'รอรับออเดอร์'; }
                else if (order.status === 'PREPARING') { badgeClass = 'bg-primary'; icon = 'fa-box-open'; statusTH = 'กำลังจัดของ'; }
                else if (order.status === 'COMPLETED') { badgeClass = 'bg-success'; icon = 'fa-check-circle'; statusTH = 'จัดเสร็จแล้ว'; }
                else if (order.status === 'REJECTED') { badgeClass = 'bg-danger'; icon = 'fa-times-circle'; statusTH = 'ถูกปฏิเสธ'; }

                html += `
                <div class="col-12 col-md-6">
                    <div class="order-card-hist p-3 h-100 d-flex flex-column" onclick="viewOrderDetails(${order.id})">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold text-dark mb-0">${order.req_number}</h6>
                            <span class="badge ${badgeClass}"><i class="fas ${icon}"></i> ${statusTH}</span>
                        </div>
                        <small class="text-muted mb-2"><i class="far fa-clock"></i> ${order.req_time}</small>
                        <div class="mt-auto border-top pt-2 d-flex justify-content-between align-items-center">
                            <span class="small fw-bold text-secondary">${order.total_items} รายการ</span>
                            <span class="small text-primary fw-bold">คลิกดู <i class="fas fa-chevron-right ms-1"></i></span>
                        </div>
                    </div>
                </div>`;
            });
        }
        $('#orderHistoryList').html(html);
    }).fail(handleAjaxError);
};

window.viewOrderDetails = function(reqId) {
    historyModal.hide(); 
    trackingModal.show(); 
    $('#modalItemsList').html('<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>');
    
    $.getJSON(API_URL, { action: 'get_my_order_details', req_id: reqId }, function(res) {
        if (!res.success) { trackingModal.hide(); Swal.fire('Error', res.message, 'error'); return; }

        const h = res.header;
        $('#modalReqNo').text(h.req_number);
        $('#modalReqTime').html(`<i class="far fa-clock"></i> สั่งเบิก: ${h.req_time}`);

        let step1 = 'completed', step2 = '', step3 = '';
        let step3Icon = 'fa-check', step3Label = 'เสร็จสิ้น';
        
        if (h.status === 'NEW ORDER') step1 = 'active'; 
        else if (h.status === 'PREPARING') step2 = 'active';
        else if (h.status === 'COMPLETED') { step2 = 'completed'; step3 = 'completed'; } 
        else if (h.status === 'REJECTED') { step2 = 'rejected'; step3 = 'rejected'; step3Icon = 'fa-times'; step3Label = 'ถูกปฏิเสธ'; }

        $('#trackingTimeline').html(`
            <div class="tracking-step ${step1}"><div class="step-icon"><i class="fas fa-clipboard-list"></i></div><div class="step-label">ส่งคำสั่ง</div><div class="step-time">${h.req_time}</div></div>
            <div class="tracking-step ${step2}"><div class="step-icon"><i class="fas fa-box-open"></i></div><div class="step-label">กำลังจัดของ</div><div class="step-time"></div></div>
            <div class="tracking-step ${step3}"><div class="step-icon"><i class="fas ${step3Icon}"></i></div><div class="step-label">${step3Label}</div><div class="step-time">${h.issue_time || ''}</div></div>
        `);

        if (h.status === 'REJECTED') {
            $('#rejectAlert').removeClass('d-none');
            const match = (h.remark || '').match(/\[Reject:\s(.*?)\]/);
            $('#rejectReason').text(match ? match[1] : 'ไม่ระบุเหตุผล');
        } else { $('#rejectAlert').addClass('d-none'); }

        let itemsHtml = '';
        res.items.forEach(item => {
            const reqQty = parseFloat(item.qty_requested);
            const issueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : '-';
            let issueClass = (issueQty !== '-' && issueQty < reqQty) ? 'text-warning text-dark' : 'text-success';
            if (issueQty === 0) issueClass = 'text-danger';

            const imgHtml = item.image_path 
                ? `<img src="../../uploads/items/${item.image_path}" class="item-img-mini" loading="lazy" onerror="this.outerHTML='${getIconPlaceholder(item.item_category)}'">'` 
                : getIconPlaceholder(item.item_category);

            itemsHtml += `
            <div class="d-flex align-items-center justify-content-between p-2 border rounded bg-white">
                <div class="d-flex align-items-center gap-2">
                    ${imgHtml}
                    <div>
                        <div class="fw-bold text-dark text-truncate" style="font-size:0.85rem; max-width: 150px;">${item.description}</div>
                        <small class="text-primary">SAP: ${item.item_code}</small>
                    </div>
                </div>
                <div class="text-end">
                    <div class="small text-muted mb-1">ขอเบิก: <b>${reqQty}</b></div>
                    <div class="small fw-bold ${issueClass}">จ่ายจริง: ${issueQty}</div>
                </div>
            </div>`;
        });
        $('#modalItemsList').html(itemsHtml);

        if (h.status === 'COMPLETED' && h.issuer_name) {
            $('#modalIssuerName').text(h.issuer_name); $('#modalIssueTime').text(h.issue_time); $('#issuerInfo').removeClass('d-none');
        } else { $('#issuerInfo').addClass('d-none'); }

    }).fail(handleAjaxError);
};

window.backToHistory = function() {
    trackingModal.hide();
    historyModal.show();
};