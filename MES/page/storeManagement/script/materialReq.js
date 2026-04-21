"use strict";

let cart = {}; 
let historyModal, trackingModal, editItemModalInst; 
let currentPage = 1;
const itemLimit = 40; 
let isLoading = false;
let hasMoreItems = true;
let searchTimeout;

document.addEventListener('DOMContentLoaded', () => {
    loadCatalog('ALL'); 

    const searchInput = document.getElementById('searchItem');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => { loadCatalog(false); }, 500);
        });
    }

    const histEl = document.getElementById('historyModal');
    const trackEl = document.getElementById('trackingModal');
    if (histEl) historyModal = new bootstrap.Modal(histEl);
    if (trackEl) trackingModal = new bootstrap.Modal(trackEl);

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        const loadMoreTrigger = document.createElement('div');
        loadMoreTrigger.id = 'infinite-scroll-trigger';
        loadMoreTrigger.style.height = '20px';
        document.getElementById('catalogGrid').after(loadMoreTrigger);

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading && hasMoreItems) {
                loadCatalog(true);
            }
        }, { rootMargin: "200px" });

        observer.observe(loadMoreTrigger);
    }

    document.querySelectorAll('input[name="reqType"]').forEach(radio => {
        radio.addEventListener('change', renderCartUI);
    });

    const globalUploadInput = document.getElementById('globalImageUpload');
    if (globalUploadInput) {
        globalUploadInput.addEventListener('change', handleImageUploadEvent);
    }
});

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

const subCategories = {
    'RM': [
        { id: 'STEEL', name: 'เหล็ก' },
        { id: 'PLASTIC', name: 'พลาสติก' },
        { id: 'CHEMICAL', name: 'เคมีภัณฑ์' },
        { id: 'OTHER', name: 'อื่นๆ' }
    ],
    'PKG': [
        { id: 'BOX', name: 'กล่องกระดาษ' },
        { id: 'PALLET', name: 'พาเลท' },
        { id: 'LABEL', name: 'สติ๊กเกอร์/ฉลาก' },
        { id: 'OTHER', name: 'อื่นๆ' }
    ],
    'CON': [
        { id: 'ACC', name: 'อุปกรณ์ประกอบ' },
        { id: '5S', name: 'อุปกรณ์ 5ส.' },
        { id: 'PROD', name: 'สิ้นเปลืองไลน์ผลิต' },
        { id: 'OFFICE', name: 'เครื่องเขียน' },
        { id: 'PPE', name: 'อุปกรณ์เซฟตี้' }
    ],
    'SP': [
        { id: 'MECHANICAL', name: 'อะไหล่เครื่องกล' },
        { id: 'ELECTRICAL', name: 'อะไหล่ไฟฟ้า' },
        { id: 'OTHER', name: 'อื่นๆ' }
    ],
    'TOOL': [
        { id: 'HANDTOOL', name: 'เครื่องมือช่าง' },
        { id: 'MACHINE', name: 'เครื่องจักร' }
    ],
    'FG': [ { id: 'STANDARD', name: 'สินค้าสำเร็จรูปมาตรฐาน' } ],
    'SEMI': [ { id: 'STANDARD', name: 'สินค้าระหว่างผลิต' } ]
};

let currentMainCategory = 'ALL';
let currentSubCategory = 'ALL';

window.filterCategory = function(category, element) {
    document.querySelectorAll('.category-chip').forEach(el => {
        el.classList.remove('active', 'btn-primary');
        el.classList.add('btn-outline-primary');
    });
    
    element.classList.add('active', 'btn-primary');
    element.classList.remove('btn-outline-primary');
    
    currentMainCategory = category;
    currentSubCategory = 'ALL';
    
    renderSubCategories(category);
    
    const searchInput = document.getElementById('searchItem');
    if (searchInput) searchInput.value = ''; 
    loadCatalog(false); 
};

function renderSubCategories(mainCat) {
    const container = document.getElementById('subCategoryContainer');
    
    if (mainCat === 'ALL' || !subCategories[mainCat] || subCategories[mainCat].length === 0) {
        container.classList.add('d-none');
        container.classList.remove('d-flex');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('d-none');
    container.classList.add('d-flex');
    
    let html = `<button type="button" class="btn btn-sm btn-info text-white sub-category-chip active text-nowrap" style="border-radius: 20px;" data-sub="ALL" onclick="filterSubCategory('ALL', this)">รวมทั้งหมด</button>`;
    
    subCategories[mainCat].forEach(sub => {
        html += `<button type="button" class="btn btn-sm btn-outline-info sub-category-chip text-nowrap" style="border-radius: 20px;" data-sub="${sub.id}" onclick="filterSubCategory('${sub.id}', this)">${sub.name}</button>`;
    });
    
    container.innerHTML = html;
}

window.filterSubCategory = function(subCategory, element) {
    document.querySelectorAll('.sub-category-chip').forEach(el => {
        el.classList.remove('active', 'btn-info', 'text-white');
        el.classList.add('btn-outline-info');
    });
    
    element.classList.add('active', 'btn-info', 'text-white');
    element.classList.remove('btn-outline-info');
    
    currentSubCategory = subCategory;
    loadCatalog(false);
};

window.loadCatalog = async function(isLoadMore = false) {
    if (isLoading) return;

    const search = document.getElementById('searchItem')?.value.trim() || '';
    const sort = document.getElementById('sortItem')?.value || 'DEFAULT';
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
        const actionUrl = `get_catalog&category=${encodeURIComponent(currentMainCategory)}&sub_category=${encodeURIComponent(currentSubCategory)}&search=${encodeURIComponent(search)}&sort=${encodeURIComponent(sort)}&page=${currentPage}&limit=${itemLimit}`;
        const res = await fetchAPI(actionUrl, 'GET');
        
        isLoading = false;
        document.getElementById('loadMoreSpinner')?.remove();

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
                const onHand = parseFloat(item.onhand_qty || 0);
                const isOutOfStock = onHand <= 0;
                
                // 🛡️ ป้องกัน XSS & การหลุด Quote ของ JS Function Call
                const displayDesc = escapeHTML(item.description || '-');
                const displayCode = escapeHTML(item.item_code);
                const safeCategory = escapeHTML(item.item_category || 'OTHER');
                const safeDescForJS = escapeHTML(item.description || 'N/A').replace(/&#39;/g, "\\'"); 
                
                const imgHtml = item.image_path 
                        ? `<img src="../../uploads/items/${item.image_path}?v=${new Date().getTime()}" id="img_element_${displayCode}" class="product-img" loading="lazy" onerror="handleImageError(this, '${safeCategory}', '${displayCode}')">` 
                        : getPlaceholderHTML(safeCategory, displayCode, `img_element_${displayCode}`);

                const badgeHtml = isOutOfStock 
                    ? `<span class="badge bg-danger stock-badge px-2 py-1"><i class="fas fa-times-circle me-1"></i> สินค้าหมด</span>`
                    : `<span class="badge bg-success stock-badge px-2 py-1"><i class="fas fa-check-circle me-1"></i> สต๊อก: ${onHand.toLocaleString()}</span>`;

                const editBtnHtml = typeof CAN_MANAGE_IMAGE !== 'undefined' && CAN_MANAGE_IMAGE 
                    ? `<div class="position-absolute top-0 end-0 p-2 z-3 d-flex gap-1">
                           <button class="btn btn-sm btn-light border shadow-sm text-secondary rounded-circle" style="width: 32px; height: 32px; padding: 0;" onclick="openEditItemModal('${displayCode}')" title="ตั้งค่าข้อมูลสินค้า"><i class="fas fa-cog"></i></button>
                           <button class="btn btn-sm btn-light border shadow-sm text-primary rounded-circle" style="width: 32px; height: 32px; padding: 0;" onclick="triggerImageUpload('${displayCode}')" title="เปลี่ยน/อัปโหลดรูปภาพ"><i class="fas fa-camera"></i></button>
                       </div>` : '';

                const cardOpacity = isOutOfStock ? 'opacity: 0.85;' : '';
                const currentCartQty = cart[item.item_code] ? cart[item.item_code].qty : 1;

                html += `
                <div class="col-6 col-sm-6 col-md-4 col-lg-3 col-xl-2 col-xxl-2">
                    <div class="product-card" style="${cardOpacity}">
                        <div class="product-img-wrapper" id="img_wrapper_${displayCode}">
                            ${badgeHtml}${editBtnHtml}${imgHtml}
                        </div>
                        <div class="d-none badge-alt-container p-2 pb-0">${badgeHtml.replace('stock-badge', 'stock-badge-alt')}</div>
                        <div class="card-body-flex pt-2">
                            <div class="small text-primary fw-bold mb-1">SAP: ${displayCode}</div>
                            <div class="product-title" title="${displayDesc}">${displayDesc}</div>
                            <div class="mt-auto pt-3 border-top">
                                <div class="input-group input-group-sm shadow-sm">
                                    <button class="btn btn-light border px-2 text-secondary fw-bold" type="button" onclick="updateInputQty('${displayCode}', -1)"><i class="fas fa-minus"></i></button>
                                    <input type="number" id="input_qty_${displayCode}" class="form-control text-center fw-bold text-primary px-1" value="${currentCartQty}" min="1" max="99999">
                                    <button class="btn btn-light border px-2 text-secondary fw-bold" type="button" onclick="updateInputQty('${displayCode}', 1)"><i class="fas fa-plus"></i></button>
                                    <button class="btn btn-primary px-2 fw-bold" type="button" onclick="addToCart('${displayCode}', '${safeDescForJS}', ${onHand})"><i class="fas fa-cart-plus"></i></button>
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
        isLoading = false;
        document.getElementById('loadMoreSpinner')?.remove();
    }
};

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
        let displayDesc = escapeHTML(item.description);
        let displayCode = escapeHTML(code);

        let warningHtml = (reqType === 'STOCK' && item.qty > item.maxQty) 
            ? `<div class="small text-danger fw-bold mt-1"><i class="fas fa-exclamation-triangle"></i> สต๊อกมีแค่ ${item.maxQty} ชิ้น (ต้องเปิด K2)</div>` : '';

        html += `
        <div class="card shadow-sm border-0 mb-2">
            <div class="card-body p-2 d-flex justify-content-between align-items-center">
                <div class="pe-2" style="width: 70%;">
                    <div class="fw-bold text-dark text-truncate" style="font-size:0.9rem;" title="${displayDesc}">${displayDesc}</div>
                    <small class="text-primary fw-bold">${displayCode}</small>
                    ${warningHtml}
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                    <span class="badge bg-light text-dark border px-2 py-1 fs-6 shadow-sm">x ${item.qty}</span>
                    <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" onclick="removeFromCart('${displayCode}')"><i class="fas fa-trash"></i></button>
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
                    html: `คุณกำลังขอเบิก <b>"${escapeHTML(item.description)}"</b> จำนวน ${item.qty} ชิ้น<br>แต่ในคลังมีเพียง <b class="text-danger">${item.maxQty}</b> ชิ้น<br><br><span class="text-muted small">หากต้องการสั่งซื้อ กรุณาเปลี่ยนประเภทคำขอเป็น "ขอสั่งซื้อ (K2)" ด้านล่างครับ</span>`,
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
            const payloadCart = itemCodes.map(code => ({ item_code: code, qty: cart[code].qty }));

            try {
                const res = await fetchAPI('submit_requisition', 'POST', { 
                    cart: JSON.stringify(payloadCart), 
                    remark: remark, 
                    request_type: reqType 
                }, 'btnCheckout');

                cart = {}; 
                if (remarkEl) remarkEl.value = ''; 
                renderCartUI();
                
                const offcanvasEl = document.getElementById('cartOffcanvas');
                if (offcanvasEl) bootstrap.Offcanvas.getInstance(offcanvasEl)?.hide();
                
                loadCatalog(false); 

                Swal.fire({ 
                    title: 'Success!', 
                    html: `ส่งคำขอสำเร็จ<br><b class="text-success fs-3 mt-2 d-block">${escapeHTML(res.req_number)}</b>`, 
                    icon: 'success' 
                });
            } catch (error) {
                // Error ถูกจัดการโดย fetchAPI อัตโนมัติ
            }
        }
    });
};

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
        const actionUrl = `get_my_orders&start_date=${startEl.value}&end_date=${endEl.value}`;
        const res = await fetchAPI(actionUrl, 'GET');
        
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
                            <h6 class="fw-bold text-dark mb-0">${escapeHTML(order.req_number)}</h6>
                            <span class="badge ${badgeClass}"><i class="fas ${icon}"></i> ${statusTH}</span>
                        </div>
                        <small class="text-muted mb-2"><i class="far fa-clock"></i> ${escapeHTML(order.req_time)}</small>
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
        if (listContainer) listContainer.innerHTML = '<div class="col-12 text-center text-danger py-5">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>';
    }
};

window.viewOrderDetails = async function(reqId) {
    if (historyModal) historyModal.hide(); 
    
    setTimeout(async () => {
        if (trackingModal) trackingModal.show(); 
        const itemsList = document.getElementById('modalItemsList');
        if (itemsList) itemsList.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary spinner-border-sm"></div></div>';
        
        try {
            const res = await fetchAPI(`get_my_order_details&req_id=${reqId}`, 'GET');

            const h = res.header;
            document.getElementById('modalReqNo').innerText = h.req_number; // innerText is safe
            document.getElementById('modalReqTime').innerHTML = `<i class="far fa-clock"></i> สั่งเบิก: ${escapeHTML(h.req_time)}`;

            let step1 = 'completed', step2 = '', step3 = '';
            let step3Icon = 'fa-check', step3Label = 'เสร็จสิ้น';
            
            if (h.status === 'NEW ORDER') step1 = 'active'; 
            else if (h.status === 'PREPARING') step2 = 'active';
            else if (h.status === 'COMPLETED') { step2 = 'completed'; step3 = 'completed'; } 
            else if (h.status === 'REJECTED') { step2 = 'rejected'; step3 = 'rejected'; step3Icon = 'fa-times'; step3Label = 'ถูกปฏิเสธ'; }

            document.getElementById('trackingTimeline').innerHTML = `
                <div class="tracking-step ${step1}"><div class="step-icon"><i class="fas fa-clipboard-list"></i></div><div class="step-label">ส่งคำสั่ง</div><div class="step-time">${escapeHTML(h.req_time)}</div></div>
                <div class="tracking-step ${step2}"><div class="step-icon"><i class="fas fa-box-open"></i></div><div class="step-label">กำลังจัดของ</div><div class="step-time"></div></div>
                <div class="tracking-step ${step3}"><div class="step-icon"><i class="fas ${step3Icon}"></i></div><div class="step-label">${step3Label}</div><div class="step-time">${escapeHTML(h.issue_time || '')}</div></div>
            `;

            const rejectAlert = document.getElementById('rejectAlert');
            if (h.status === 'REJECTED') {
                if (rejectAlert) rejectAlert.classList.remove('d-none');
                const match = (h.remark || '').match(/\[Reject:\s(.*?)\]/);
                document.getElementById('rejectReason').innerText = match ? match[1] : 'ไม่ระบุเหตุผล'; // innerText is safe
            } else { 
                if (rejectAlert) rejectAlert.classList.add('d-none'); 
            }

            let itemsHtml = '';
            res.items.forEach(item => {
                const reqQty = parseFloat(item.qty_requested);
                const issueQty = item.qty_issued !== null ? parseFloat(item.qty_issued) : '-';
                let issueClass = (issueQty !== '-' && issueQty < reqQty) ? 'text-warning text-dark' : 'text-success';
                if (issueQty === 0) issueClass = 'text-danger';

                const displayDesc = escapeHTML(item.description);
                const displayCode = escapeHTML(item.item_code);
                const safeCategory = escapeHTML(item.item_category || 'OTHER');

                const imgHtml = item.image_path 
                    ? `<img src="../../uploads/items/${item.image_path}" class="item-img-mini" loading="lazy" onerror="handleImageError(this, '${safeCategory}', '${displayCode}')">` 
                    : getIconPlaceholder(safeCategory);

                itemsHtml += `
                <div class="d-flex align-items-center justify-content-between p-2 border rounded bg-white">
                    <div class="d-flex align-items-center gap-2">
                        ${imgHtml}
                        <div>
                            <div class="fw-bold text-dark text-truncate" style="font-size:0.85rem; max-width: 150px;" title="${displayDesc}">${displayDesc}</div>
                            <small class="text-primary">${displayCode}</small>
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
            if (itemsList) itemsList.innerHTML = '<div class="text-center text-danger py-4">ดึงข้อมูลไม่สำเร็จ</div>';
        }
    }, 300);
};

window.backToHistory = function() {
    if (trackingModal) trackingModal.hide();
    setTimeout(() => { if (historyModal) historyModal.show(); }, 300);
};

window.openEditItemModal = async function(itemCode) {
    if (!editItemModalInst) editItemModalInst = new bootstrap.Modal(document.getElementById('editItemModal'));
    
    try {
        const res = await fetchAPI(`get_item_info&item_code=${itemCode}`, 'GET');
        document.getElementById('edit_sap_no').value = res.data.sap_no;
        document.getElementById('edit_description').value = res.data.part_description || '';
        document.getElementById('edit_material_type').value = res.data.item_category || 'OTHER';
        document.getElementById('edit_std_price').value = res.data.StandardPrice ? parseFloat(res.data.StandardPrice).toFixed(2) : '0.00';
        editItemModalInst.show();
    } catch (error) {
        // error managed by fetchAPI
    }
};

window.saveItemConfig = async function() {
    const itemCode = document.getElementById('edit_sap_no').value;
    const desc = document.getElementById('edit_description').value.trim();
    const category = document.getElementById('edit_material_type').value;
    const price = document.getElementById('edit_std_price').value;

    try {
        await fetchAPI('update_item_info', 'POST', { 
            item_code: itemCode, 
            description: desc, 
            item_category: category, 
            std_price: price 
        });

        editItemModalInst.hide();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });
        loadCatalog(false); 
    } catch (error) {
        // error managed by fetchAPI
    }
};

window.triggerImageUpload = function(itemCode) {
    document.getElementById('uploadTargetItemCode').value = itemCode;
    
    Swal.fire({
        title: 'เปลี่ยนรูปภาพสินค้า',
        html: `คุณต้องการอัปเดตรูปภาพสำหรับ <b class="text-primary">${escapeHTML(itemCode)}</b> ด้วยวิธีใด?`,
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
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    if(loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const compressedFile = await compressImage(originalFile, 800, 800, 0.8);

        if (compressedFile.size > 5 * 1024 * 1024) {
            if(loadingOverlay) loadingOverlay.style.display = 'none';
            Swal.fire('ไฟล์ใหญ่เกินไป!', 'ระบบไม่สามารถบีบอัดภาพให้อยู่ในขนาดที่กำหนดได้', 'warning');
            this.value = ''; return;
        }

        let formData = new FormData();
        formData.append('item_code', itemCode);
        formData.append('image', compressedFile);

        const res = await fetchAPI('upload_image', 'POST', formData);
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปโหลดสำเร็จ', showConfirmButton: false, timer: 1500 });
        
        const wrapper = document.getElementById(`img_wrapper_${itemCode}`);
        if (wrapper) {
            const newImgUrl = `../../uploads/items/${res.image_path}?v=${new Date().getTime()}`;
            const existingImg = document.getElementById(`img_element_${itemCode}`);
            const safeCode = escapeHTML(itemCode);
            
            if (existingImg && existingImg.tagName === 'IMG') {
                existingImg.src = newImgUrl;
            } else {
                const newImgHtml = `<img src="${newImgUrl}" id="img_element_${safeCode}" class="product-img" loading="lazy" onerror="handleImageError(this, '', '${safeCode}')">`;
                if (existingImg) existingImg.remove(); 
                wrapper.insertAdjacentHTML('beforeend', newImgHtml);
            }
        }
    } catch (error) {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
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
                ${escapeHTML(sapNo)}
            </span>
        </div>
    `;
}

window.handleImageError = function(imgElement, category, sapNo) {
    imgElement.outerHTML = getPlaceholderHTML(category, sapNo, `img_element_${escapeHTML(sapNo)}`);
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