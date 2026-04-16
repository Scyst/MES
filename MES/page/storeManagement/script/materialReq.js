"use strict";

// ========================================================
// 🟢 1. GLOBAL VARIABLES & CONFIG 🟢
// ========================================================
const API_URL = 'api/manageMaterial.php';
let cart = {}; 
let historyModal, trackingModal, editItemModalInst; 

// Pagination & Fetch Control
let currentPage = 1;
const itemLimit = 40; 
let isLoading = false;
let hasMoreItems = true;
let searchTimeout;
let currentSearchController = null;

// ========================================================
// 🟢 2. CUSTOM FETCH WRAPPER 🟢
// ========================================================
async function fetchMaterialAPI(params, method = 'GET', signal = null) {
    let url = API_URL;
    const options = { method: method, signal: signal };

    if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        url += `?${qs}`;
    } else if (method === 'POST') {
        let formData;
        if (params instanceof FormData) {
            formData = params;
        } else {
            formData = new FormData();
            for (const key in params) {
                formData.append(key, params[key]);
            }
        }
        
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta && !formData.has('csrf_token')) {
            formData.append('csrf_token', csrfMeta.getAttribute('content'));
        }
        options.body = formData;
    }

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return await response.json();
}

function handleFetchError(error, defaultMsg = "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์") {
    document.getElementById('loadingOverlay').style.display = 'none';
    isLoading = false;
    Swal.fire('Error', error.message || defaultMsg, 'error');
}

// ========================================================
// 🟢 3. INITIALIZATION & EVENT LISTENERS 🟢
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    // 3.1 Load Initial Data
    loadCatalog('ALL');

    // 3.2 Search Debounce
    const searchInput = document.getElementById('searchItem');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { loadCatalog(null, false); }, 500);
        });
    }

    // 3.3 Initialize Modals
    const histEl = document.getElementById('historyModal');
    const trackEl = document.getElementById('trackingModal');
    if (histEl) historyModal = new bootstrap.Modal(histEl);
    if (trackEl) trackingModal = new bootstrap.Modal(trackEl);

    // 3.4 Infinite Scroll (แก้ไขให้ตรวจจับที่ main-content แทน body)
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        mainContent.addEventListener('scroll', () => {
            if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 300) {
                if (!isLoading && hasMoreItems) loadCatalog(null, true);
            }
        });
    } else {
        window.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            if (scrollTop + clientHeight >= scrollHeight - 300) {
                if (!isLoading && hasMoreItems) loadCatalog(null, true);
            }
        });
    }

    // 3.5 Radio Buttons
    document.querySelectorAll('input[name="reqType"]').forEach(radio => {
        radio.addEventListener('change', renderCartUI);
    });

    // 3.6 Global Image Upload Listener
    const globalUploadInput = document.getElementById('globalImageUpload');
    if (globalUploadInput) {
        globalUploadInput.addEventListener('change', handleImageUploadEvent);
    }
});

// ========================================================
// 🟢 4. CATALOG & UI RENDERING 🟢
// ========================================================
window.toggleImages = function() {
    document.body.classList.toggle('hide-images');
    const isHidden = document.body.classList.contains('hide-images');
    const btn = document.getElementById('toggleImageBtn');
    
    if (btn) {
        if (isHidden) {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-image-slash text-secondary"></i> <span class="d-none d-sm-inline">ซ่อนรูป</span>';
        } else {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-image"></i> <span class="d-none d-sm-inline">แสดงรูป</span>';
        }
    }
};

window.filterCategory = function(category, element) {
    document.querySelectorAll('.category-chip').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    element.dataset.category = category;
    
    const searchInput = document.getElementById('searchItem');
    if (searchInput) searchInput.value = ''; 
    
    loadCatalog(category, false); 
};

window.loadCatalog = async function(category = null, isLoadMore = false) {
    if (!isLoadMore) {
        if (currentSearchController) currentSearchController.abort();
        currentSearchController = new AbortController();
    } else {
        if (isLoading) return;
    }
    
    // 🟢 [FIX] จัดการเรื่อง Default Category ให้รัดกุม 100% ป้องกันค่า 'undefined'
    if (!category) {
        const activeCategory = document.querySelector('.category-chip.active');
        // ใช้ getAttribute เพื่อความชัวร์ในการดึงค่าจาก HTML
        category = (activeCategory && activeCategory.getAttribute('data-category')) 
            ? activeCategory.getAttribute('data-category') 
            : 'ALL';
    }
    
    // ดักจับอีกชั้น เผื่อค่ากลายเป็นข้อความ 'undefined' หรือค่าว่าง
    if (category === 'undefined' || category === 'null' || !category) {
        category = 'ALL';
    }

    const searchInput = document.getElementById('searchItem');
    const sortInput = document.getElementById('sortItem');
    const search = searchInput ? searchInput.value.trim() : '';
    const sort = sortInput ? sortInput.value : 'DEFAULT'; 
    const catalogGrid = document.getElementById('catalogGrid');

    if (!isLoadMore) {
        currentPage = 1;
        hasMoreItems = true;
        catalogGrid.innerHTML = '<div class="col-12 text-center py-5 mt-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;"></div></div>';
    } else {
        catalogGrid.insertAdjacentHTML('beforeend', '<div id="loadMoreSpinner" class="col-12 text-center py-4"><div class="spinner-border text-secondary spinner-border-sm"></div></div>');
    }

    isLoading = true;

    try {
        const res = await fetchMaterialAPI({
            action: 'get_catalog',
            category: category,
            search: search,
            sort: sort,
            page: currentPage,
            limit: itemLimit
        }, 'GET', isLoadMore ? null : currentSearchController.signal);

        isLoading = false;
        const spinner = document.getElementById('loadMoreSpinner');
        if (spinner) spinner.remove();

        if (!res.success) { Swal.fire('Error', res.message, 'error'); return; }
        if (res.data.length < itemLimit) hasMoreItems = false;
        
        let html = '';
        if (res.data.length === 0 && !isLoadMore) {
            html = `<div class="col-12 text-center text-muted py-5 mt-5">
                        <i class="fas fa-search fa-4x mb-3 opacity-25"></i>
                        <h4 class="fw-bold">ไม่พบรายการสินค้า</h4>
                    </div>`;
            catalogGrid.innerHTML = html;
        } else {
            res.data.forEach(item => {
                const onHand = parseFloat(item.onhand_qty);
                const isOutOfStock = onHand <= 0;
                const safeDesc = item.description ? item.description.replace(/'/g, "\\'") : 'N/A';
                const safeCategory = item.item_category || 'OTHER'; 
                
                const imgHtml = item.image_path 
                        ? `<img src="../../uploads/items/${item.image_path}?v=${new Date().getTime()}" id="img_element_${item.item_code}" class="product-img" loading="lazy" onerror="handleImageError(this, '${safeCategory}', '${item.item_code}')">` 
                        : getPlaceholderHTML(safeCategory, item.item_code, `img_element_${item.item_code}`);

                const badgeHtml = isOutOfStock 
                    ? `<span class="badge bg-danger stock-badge px-2 py-1"><i class="fas fa-times-circle me-1"></i> สินค้าหมด</span>`
                    : `<span class="badge bg-success stock-badge px-2 py-1"><i class="fas fa-check-circle me-1"></i> สต๊อก: ${onHand.toLocaleString()}</span>`;

                const editBtnHtml = typeof CAN_MANAGE_IMAGE !== 'undefined' && CAN_MANAGE_IMAGE 
                    ? `<div class="position-absolute top-0 end-0 p-2 z-3 d-flex gap-1">
                           <button class="btn btn-sm btn-light border shadow-sm text-secondary rounded-circle" style="width: 32px; height: 32px; padding: 0;" onclick="openEditItemModal('${item.item_code}')" title="ตั้งค่าข้อมูลสินค้า"><i class="fas fa-cog"></i></button>
                           <button class="btn btn-sm btn-light border shadow-sm text-primary rounded-circle" style="width: 32px; height: 32px; padding: 0;" onclick="triggerImageUpload('${item.item_code}')" title="เปลี่ยน/อัปโหลดรูปภาพ"><i class="fas fa-camera"></i></button>
                       </div>` : '';

                const cardOpacity = isOutOfStock ? 'opacity: 0.85;' : '';
                const currentCartQty = cart[item.item_code] ? cart[item.item_code].qty : 1;

                html += `
                <div class="col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 col-xxl-2">
                    <div class="product-card" style="${cardOpacity}">
                        <div class="product-img-wrapper" id="img_wrapper_${item.item_code}">
                            ${badgeHtml}${editBtnHtml}${imgHtml}
                        </div>
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
            
            if (!isLoadMore) catalogGrid.innerHTML = html;
            else catalogGrid.insertAdjacentHTML('beforeend', html);

            if (!hasMoreItems && res.data.length > 0) {
                catalogGrid.insertAdjacentHTML('beforeend', '<div class="col-12 text-center text-muted py-4 small">--- แสดงรายการทั้งหมดแล้ว ---</div>');
            }
            currentPage++; 
        }
    } catch (error) {
        if (error.name === 'AbortError') return; 
        handleFetchError(error);
    }
};

// ========================================================
// 🟢 5. CART & CHECKOUT OPERATIONS 🟢
// ========================================================
window.updateInputQty = function(itemCode, change) {
    const input = document.getElementById(`input_qty_${itemCode}`);
    if (!input) return;
    let current = parseInt(input.value) || 1;
    let newVal = current + change;
    if(newVal >= 1) input.value = newVal; 
};

window.addToCart = function(itemCode, description, onHandQty) {
    const input = document.getElementById(`input_qty_${itemCode}`);
    let inputQty = parseInt(input ? input.value : 1) || 1;
    
    cart[itemCode] = { description: description, qty: inputQty, maxQty: onHandQty };
    
    const fab = document.querySelector('.cart-fab');
    if (fab) {
        fab.style.transform = 'scale(1.2)';
        setTimeout(() => fab.style.transform = 'scale(1)', 200);
    }
    
    Swal.fire({ toast: true, position: 'bottom-start', icon: 'success', title: 'หยิบใส่ตะกร้าแล้ว', showConfirmButton: false, timer: 1200 });
    renderCartUI();
};

window.removeFromCart = function(itemCode) { 
    delete cart[itemCode]; 
    const inputEl = document.getElementById(`input_qty_${itemCode}`);
    if (inputEl) inputEl.value = 1;
    renderCartUI(); 
};

function renderCartUI() {
    const itemCodes = Object.keys(cart);
    const totalItems = itemCodes.length;
    const badge = document.getElementById('cartItemCount');
    
    if (badge) {
        badge.innerText = totalItems;
        if(totalItems > 0) {
            badge.classList.add('animate__animated', 'animate__bounceIn');
            setTimeout(() => badge.classList.remove('animate__animated', 'animate__bounceIn'), 1000);
        }
    }

    const container = document.getElementById('cartItemsContainer');
    const btnCheckout = document.getElementById('btnCheckout');

    if (totalItems === 0) {
        container.innerHTML = `<div class="text-center text-muted py-5 mt-5"><i class="fas fa-box-open fa-4x mb-3 opacity-25"></i><h6>ตะกร้าว่างเปล่า</h6></div>`;
        if (btnCheckout) btnCheckout.disabled = true;
        return;
    }

    const reqTypeEl = document.querySelector('input[name="reqType"]:checked');
    const reqType = reqTypeEl ? reqTypeEl.value : 'STOCK';
    let html = '';
    
    itemCodes.forEach(code => {
        let item = cart[code];
        let warningHtml = (reqType === 'STOCK' && item.qty > item.maxQty) 
            ? `<div class="small text-danger fw-bold mt-1"><i class="fas fa-exclamation-triangle"></i> สต๊อกมีแค่ ${item.maxQty} ชิ้น (ต้องเปิด K2)</div>` : '';

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
    
    container.innerHTML = html;
    if (btnCheckout) btnCheckout.disabled = false;
}

window.submitRequisition = function() {
    const remarkEl = document.getElementById('reqRemark');
    const reqTypeEl = document.querySelector('input[name="reqType"]:checked');
    const remark = remarkEl ? remarkEl.value.trim() : '';
    const reqType = reqTypeEl ? reqTypeEl.value : 'STOCK';
    const itemCodes = Object.keys(cart);
    
    if (itemCodes.length === 0) return;

    if (reqType === 'STOCK') {
        for (let code of itemCodes) {
            let item = cart[code];
            if (item.qty > item.maxQty) {
                Swal.fire({
                    title: 'สต๊อกไม่เพียงพอ!',
                    html: `คุณกำลังขอเบิก <b>"${item.description}"</b> จำนวน ${item.qty} ชิ้น<br>แต่ในคลังมีเพียง <b class="text-danger">${item.maxQty}</b> ชิ้น<br><br><span class="text-muted small">หากต้องการสั่งซื้อ กรุณาเปลี่ยนประเภทคำขอเป็น "ขอสั่งซื้อ (K2)" ด้านล่างครับ</span>`,
                    icon: 'warning', confirmButtonText: 'เข้าใจแล้ว'
                });
                return; 
            }
        }
    }

    let typeName = reqType === 'K2' ? 'ขอสั่งซื้อ (K2)' : 'เบิกจากคลัง (Stock)';

    Swal.fire({
        title: 'ยืนยันการส่งคำขอ?', 
        text: `คุณต้องการส่งคำขอประเภท "${typeName}" จำนวน ${itemCodes.length} รายการ ใช่หรือไม่?`, 
        icon: 'question', showCancelButton: true, 
        confirmButtonColor: reqType === 'K2' ? '#ffc107' : '#198754', 
        confirmButtonText: 'Yes, Submit!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            document.getElementById('loadingOverlay').style.display = 'flex';
            const payloadCart = itemCodes.map(code => ({ item_code: code, qty: cart[code].qty }));

            try {
                const res = await fetchMaterialAPI({
                    action: 'submit_requisition', cart: JSON.stringify(payloadCart), remark: remark, request_type: reqType
                }, 'POST');

                document.getElementById('loadingOverlay').style.display = 'none';
                
                if (res.success) {
                    Swal.fire({ 
                        title: 'Success!', 
                        html: `ส่งคำขอสำเร็จ<br><b class="text-success fs-3 mt-2 d-block">${res.req_number}</b>`, 
                        icon: 'success' 
                    }).then(() => {
                        cart = {}; 
                        if (remarkEl) remarkEl.value = ''; 
                        renderCartUI();
                        
                        const offcanvasEl = document.getElementById('cartOffcanvas');
                        if (offcanvasEl) bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide();
                        
                        loadCatalog(null, false); 
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

// ========================================================
// 🟢 6. ORDER HISTORY & TRACKING 🟢
// ========================================================
window.openHistoryModal = async function() {
    const startEl = document.getElementById('histStartDate');
    const endEl = document.getElementById('histEndDate');

    if (startEl && !startEl.value) {
        let d = new Date(); d.setDate(d.getDate() - 30);
        startEl.value = d.toISOString().split('T')[0];
    }
    if (endEl && !endEl.value) endEl.value = new Date().toISOString().split('T')[0];

    const listContainer = document.getElementById('orderHistoryList');
    if (listContainer) listContainer.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div></div>';
    if (historyModal) historyModal.show();

    try {
        const res = await fetchMaterialAPI({ action: 'get_my_orders', start_date: startEl.value, end_date: endEl.value }, 'GET');
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
        if (listContainer) listContainer.innerHTML = html;
    } catch (error) {
        handleFetchError(error);
    }
};

window.viewOrderDetails = async function(reqId) {
    if (historyModal) historyModal.hide(); 
    
    setTimeout(async () => {
        if (trackingModal) trackingModal.show(); 
        const itemsList = document.getElementById('modalItemsList');
        if (itemsList) itemsList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        
        try {
            const res = await fetchMaterialAPI({ action: 'get_my_order_details', req_id: reqId }, 'GET');
            if (!res.success) { 
                if (trackingModal) trackingModal.hide(); 
                Swal.fire('Error', res.message, 'error'); return; 
            }

            const h = res.header;
            document.getElementById('modalReqNo').innerText = h.req_number;
            document.getElementById('modalReqTime').innerHTML = `<i class="far fa-clock"></i> สั่งเบิก: ${h.req_time}`;

            let step1 = 'completed', step2 = '', step3 = '';
            let step3Icon = 'fa-check', step3Label = 'เสร็จสิ้น';
            
            if (h.status === 'NEW ORDER') step1 = 'active'; 
            else if (h.status === 'PREPARING') step2 = 'active';
            else if (h.status === 'COMPLETED') { step2 = 'completed'; step3 = 'completed'; } 
            else if (h.status === 'REJECTED') { step2 = 'rejected'; step3 = 'rejected'; step3Icon = 'fa-times'; step3Label = 'ถูกปฏิเสธ'; }

            document.getElementById('trackingTimeline').innerHTML = `
                <div class="tracking-step ${step1}"><div class="step-icon"><i class="fas fa-clipboard-list"></i></div><div class="step-label">ส่งคำสั่ง</div><div class="step-time">${h.req_time}</div></div>
                <div class="tracking-step ${step2}"><div class="step-icon"><i class="fas fa-box-open"></i></div><div class="step-label">กำลังจัดของ</div><div class="step-time"></div></div>
                <div class="tracking-step ${step3}"><div class="step-icon"><i class="fas ${step3Icon}"></i></div><div class="step-label">${step3Label}</div><div class="step-time">${h.issue_time || ''}</div></div>
            `;

            const rejectAlert = document.getElementById('rejectAlert');
            if (h.status === 'REJECTED') {
                if (rejectAlert) rejectAlert.classList.remove('d-none');
                const match = (h.remark || '').match(/\[Reject:\s(.*?)\]/);
                document.getElementById('rejectReason').innerText = match ? match[1] : 'ไม่ระบุเหตุผล';
            } else { 
                if (rejectAlert) rejectAlert.classList.add('d-none'); 
            }

            let itemsHtml = '';
            res.items.forEach(item => {
                const reqQty = parseFloat(item.qty_requested);
                const issueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : '-';
                let issueClass = (issueQty !== '-' && issueQty < reqQty) ? 'text-warning text-dark' : 'text-success';
                if (issueQty === 0) issueClass = 'text-danger';

                const safeCategory = item.item_category || 'OTHER';
                const imgHtml = item.image_path 
                    ? `<img src="../../uploads/items/${item.image_path}" class="item-img-mini" loading="lazy" onerror="handleImageError(this, '${safeCategory}', '${item.item_code}')">` 
                    : getIconPlaceholder(safeCategory);

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
            
            if (itemsList) itemsList.innerHTML = itemsHtml;

            const issuerInfo = document.getElementById('issuerInfo');
            if (h.status === 'COMPLETED' && h.issuer_name) {
                document.getElementById('modalIssuerName').innerText = h.issuer_name; 
                document.getElementById('modalIssueTime').innerText = h.issue_time; 
                if (issuerInfo) issuerInfo.classList.remove('d-none');
            } else { 
                if (issuerInfo) issuerInfo.classList.add('d-none'); 
            }
        } catch (error) {
            handleFetchError(error);
        }
    }, 300);
};

window.backToHistory = function() {
    if (trackingModal) trackingModal.hide();
    setTimeout(() => { if (historyModal) historyModal.show(); }, 300);
};

// ========================================================
// 🟢 7. QUICK EDIT MASTER DATA 🟢
// ========================================================
window.openEditItemModal = async function(itemCode) {
    if (!editItemModalInst) editItemModalInst = new bootstrap.Modal(document.getElementById('editItemModal'));
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const res = await fetchMaterialAPI({ action: 'get_item_info', item_code: itemCode }, 'GET');
        document.getElementById('loadingOverlay').style.display = 'none';

        if (res.success && res.data) {
            document.getElementById('edit_sap_no').value = res.data.sap_no;
            document.getElementById('edit_description').value = res.data.part_description || '';
            document.getElementById('edit_material_type').value = res.data.item_category || 'OTHER';
            document.getElementById('edit_std_price').value = res.data.StandardPrice ? parseFloat(res.data.StandardPrice).toFixed(2) : '0.00';
            editItemModalInst.show();
        } else {
            Swal.fire('Error', 'ไม่พบข้อมูลสินค้าในระบบ', 'error');
        }
    } catch (error) {
        handleFetchError(error);
    }
};

window.saveItemConfig = async function() {
    const itemCode = document.getElementById('edit_sap_no').value;
    const desc = document.getElementById('edit_description').value.trim();
    const category = document.getElementById('edit_material_type').value;
    const price = document.getElementById('edit_std_price').value;

    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const res = await fetchMaterialAPI({ 
            action: 'update_item_info', item_code: itemCode, description: desc, item_category: category, std_price: price
        }, 'POST');

        document.getElementById('loadingOverlay').style.display = 'none';

        if (res.success) {
            editItemModalInst.hide();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });
            loadCatalog(null, false); 
        } else {
            Swal.fire('Error', res.message, 'error');
        }
    } catch (error) {
        handleFetchError(error);
    }
};

// ========================================================
// 🟢 8. IMAGE UPLOAD & COMPRESSION 🟢
// ========================================================
window.triggerImageUpload = function(itemCode) {
    document.getElementById('uploadTargetItemCode').value = itemCode;
    
    Swal.fire({
        title: 'เปลี่ยนรูปภาพสินค้า',
        html: `คุณต้องการอัปเดตรูปภาพสำหรับ <b class="text-primary">${itemCode}</b> ด้วยวิธีใด?`,
        icon: 'question',
        showCancelButton: true, showDenyButton: true,
        confirmButtonText: '<i class="fas fa-camera fa-lg mb-1 d-block"></i> ถ่ายรูป',
        denyButtonText: '<i class="fas fa-image fa-lg mb-1 d-block"></i> คลังภาพ',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#0d6efd', denyButtonColor: '#198754',
        customClass: {
            actions: 'd-flex gap-2 w-100 justify-content-center mt-3',
            confirmButton: 'btn btn-primary flex-fill py-2',
            denyButton: 'btn btn-success flex-fill py-2',
            cancelButton: 'btn btn-light border text-dark flex-fill py-2'
        }
    }).then((result) => {
        const inputEl = document.getElementById('globalImageUpload');
        if (!inputEl) return;
        if (result.isConfirmed) {
            inputEl.setAttribute('capture', 'environment');
            inputEl.click();
        } else if (result.isDenied) {
            inputEl.removeAttribute('capture');
            inputEl.click();
        }
    });
};

function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            } else {
                if (height > maxHeight) { width = Math.round((width * maxHeight) / height); height = maxHeight; }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() });
                resolve(compressedFile);
            }, 'image/jpeg', quality);
        };
        img.onerror = (error) => reject(error);
    });
}

async function handleImageUploadEvent() {
    if (!this.files || this.files.length === 0) return;
    
    const originalFile = this.files[0];
    const itemCode = document.getElementById('uploadTargetItemCode').value;
    
    document.getElementById('loadingOverlay').style.display = 'flex';

    try {
        const compressedFile = await compressImage(originalFile, 800, 800, 0.8);

        if (compressedFile.size > 5 * 1024 * 1024) {
            document.getElementById('loadingOverlay').style.display = 'none';
            Swal.fire('ไฟล์ใหญ่เกินไป!', 'ระบบไม่สามารถบีบอัดภาพให้อยู่ในขนาดที่กำหนดได้', 'warning');
            this.value = ''; return;
        }

        let formData = new FormData();
        formData.append('action', 'upload_image');
        formData.append('item_code', itemCode);
        formData.append('image', compressedFile);

        const res = await fetchMaterialAPI(formData, 'POST');
        document.getElementById('loadingOverlay').style.display = 'none';
        
        if (res.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปโหลดสำเร็จ', showConfirmButton: false, timer: 1500 });
            
            const wrapper = document.getElementById(`img_wrapper_${itemCode}`);
            if (wrapper) {
                const newImgUrl = `../../uploads/items/${res.image_path}?v=${new Date().getTime()}`;
                const existingImg = document.getElementById(`img_element_${itemCode}`);
                
                if (existingImg && existingImg.tagName === 'IMG') {
                    existingImg.src = newImgUrl;
                } else {
                    const newImgHtml = `<img src="${newImgUrl}" id="img_element_${itemCode}" class="product-img" loading="lazy" onerror="handleImageError(this, '', '${itemCode}')">`;
                    if (existingImg) existingImg.remove(); 
                    wrapper.insertAdjacentHTML('beforeend', newImgHtml);
                }
            }
        } else { 
            Swal.fire('Error', res.message, 'error'); 
        }
    } catch (error) {
        document.getElementById('loadingOverlay').style.display = 'none';
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการจัดการไฟล์ภาพ', 'error');
    } finally {
        this.value = ''; 
    }
}

function getPlaceholderHTML(category, sapNo, idAttr = '') {
    let icon = 'fa-box'; let color = '#6c757d'; 
    const cat = category ? category.toUpperCase() : '';
    if (cat.includes('RM')) { icon = 'fa-cubes'; color = '#0d6efd'; } 
    else if (cat.includes('CONSUMABLE')) { icon = 'fa-pump-soap'; color = '#198754'; } 
    else if (cat.includes('SPARE')) { icon = 'fa-cogs'; color = '#dc3545'; } 
    else if (cat.includes('PKG')) { icon = 'fa-box-open'; color = '#ffc107'; } 

    return `
        <div ${idAttr ? `id="${idAttr}"` : ''} class="placeholder-img d-flex flex-column align-items-center justify-content-center" 
             style="background: radial-gradient(circle, #ffffff 0%, #f0f3f8 100%);">
            <i class="fas ${icon} fa-4x mb-3" style="color: ${color}; opacity: 0.3;"></i>
            <span class="small fw-bold px-2 w-100 text-center text-truncate" 
                  style="color: ${color}; opacity: 0.4; letter-spacing: 1px;">
                ${sapNo}
            </span>
        </div>
    `;
}

window.handleImageError = function(imgElement, category, sapNo) {
    imgElement.outerHTML = getPlaceholderHTML(category, sapNo, `img_element_${sapNo}`);
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