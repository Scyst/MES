"use strict";

// =================================================================
// SECTION 1: API & GLOBAL VARIABLES
// =================================================================
const LOCATIONS_API = 'api/locationsManage.php';
const ITEM_MASTER_API = 'api/itemMasterManage.php';
const BOM_API_ENDPOINT = 'api/bomManager.php';

let allItems = [];
let currentPage = 1;
const ROWS_PER_PAGE = 50;
let selectedItemId = null;

let allSchedules = [];
let validatedBulkBomImportData = []; // สำหรับเก็บข้อมูลก่อนกดยืนยัน Import BOM

// =================================================================
// SECTION 2: CORE & SHARED FUNCTIONS
// =================================================================
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function formatCurrency(value, digits = 4) {
    const num = parseFloat(value || 0);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: digits });
}

function toggleButtonState(btnElement, isLoading, loadingText = 'Processing...') {
    if (!btnElement) return;
    if (isLoading) {
        btnElement.dataset.originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i> ${loadingText}`;
    } else {
        btnElement.disabled = false;
        if (btnElement.dataset.originalText) {
            btnElement.innerHTML = btnElement.dataset.originalText;
        }
    }
}

async function fetchAPI(endpoint, action, method = 'GET', body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) url += `&${new URLSearchParams(params).toString()}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const options = { method, headers: {} };
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorResult.message);
        }
        return await response.json();
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        if (typeof showToast === 'function') showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: error.message || "Network or server error." };
    }
}

function openModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
        modal.show();
    }
}

function closeModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }
}

// =================================================================
// SECTION 3: LOCATIONS TAB FUNCTIONS
// =================================================================
async function loadLocations() {
    try {
        const result = await fetchAPI(LOCATIONS_API, 'get_locations', 'GET');
        const tbody = document.getElementById('locationsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(location => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.innerHTML = `
                    <td>${escapeHtml(location.location_name)}</td>
                    <td>${escapeHtml(location.location_description || '')}</td>
                    <td class="text-center">${location.production_line ? escapeHtml(location.production_line) : '<span class="text-muted">N/A</span>'}</td>
                    <td class="text-center">${escapeHtml(location.location_type || 'WIP')}</td> 
                    <td class="text-center">
                        <span class="badge ${location.is_active == 1 ? 'bg-success' : 'bg-secondary'}">
                            ${location.is_active == 1 ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                `;
                tr.addEventListener('click', () => openLocationModal(location));
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No locations found. Click "Add New Location" to start.</td></tr>';
        }
    } catch (e) {}
}

async function openLocationModal(location = null) {
    const form = document.getElementById('locationForm');
    if (!form) return;
    form.reset();
    document.getElementById('location_id').value = '0';
    const modalTitle = document.getElementById('locationModalLabel');
    const lineSelect = document.getElementById('location_production_line');
    lineSelect.innerHTML = '<option value="">-- Loading Lines... --</option>';
    
    try {
        const linesResult = await fetchAPI(ITEM_MASTER_API, 'get_lines', 'GET');
        if (linesResult.success && linesResult.data.length > 0) {
            lineSelect.innerHTML = '<option value="">-- Not a Production Area --</option>';
            linesResult.data.forEach(lineName => {
                const option = document.createElement('option');
                option.value = lineName;
                option.textContent = lineName;
                lineSelect.appendChild(option);
            });
        } else {
             lineSelect.innerHTML = '<option value="">-- No Lines Found --</option>';
        }
    } catch (error) {
        lineSelect.innerHTML = '<option value="">-- Error loading lines --</option>';
    }

    if (location) {
        modalTitle.textContent = 'Edit Location';
        document.getElementById('location_id').value = location.location_id;
        document.getElementById('location_name').value = location.location_name;
        document.getElementById('location_description').value = location.location_description || '';
        document.getElementById('location_is_active').checked = location.is_active;
        if (location.production_line) lineSelect.value = location.production_line;
        document.getElementById('location_type').value = location.location_type || 'WIP'; 
    } else {
        modalTitle.textContent = 'Add New Location';
        document.getElementById('location_type').value = 'WIP'; 
    }
    openModal('locationModal');
}

async function handleLocationFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const btnSubmit = form.querySelector('button[type="submit"]');
    toggleButtonState(btnSubmit, true, 'Saving...');
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.is_active = document.getElementById('location_is_active').checked ? 1 : 0;
        
        const result = await fetchAPI(LOCATIONS_API, 'save_location', 'POST', data);
        if (result.success) {
            showToast(result.message, 'var(--bs-success)');
            closeModal('locationModal');
            await loadLocations();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        toggleButtonState(btnSubmit, false);
    }
}

// =================================================================
// SECTION 4: ITEM MASTER TAB FUNCTIONS
// =================================================================
async function fetchItems(page = 1) {
    currentPage = page;
    
    // 1. ดึง Elements มาจากหน้าจอ (ป้องกัน Error กรณีหา Element ไม่เจอ)
    const searchInput = document.getElementById('itemMasterSearch');
    const toggleInactiveBtn = document.getElementById('toggleInactiveBtn');
    const modelFilterValue = document.getElementById('modelFilterValue');
    const materialTypeFilter = document.getElementById('materialTypeFilter'); // 🌟 เพิ่มตัวแปรนี้
    
    // 2. สกัดค่า (Value) ออกมาเตรียมส่งให้ API
    const searchTerm = searchInput ? searchInput.value : '';
    const showInactive = toggleInactiveBtn ? toggleInactiveBtn.classList.contains('active') : false;
    const selectedModel = modelFilterValue ? modelFilterValue.value : '';
    const selectedMaterial = materialTypeFilter ? materialTypeFilter.value : ''; // 🌟 ดึงค่าประเภทสินค้า
    
    try {
        // 3. ส่งข้อมูลไปให้ Backend
        const result = await fetchAPI(ITEM_MASTER_API, 'get_items', 'GET', null, { 
            page: page, 
            search: searchTerm, 
            show_inactive: showInactive,
            filter_model: selectedModel,
            filter_material: selectedMaterial // 🌟 แนบประเภทสินค้าไปกับ API ตรงนี้!
        });

        if (result.success) {
            renderItemsTable(result.data, result.total, page);
        } else {
            const tbody = document.getElementById('itemsTableBody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="22" class="text-center text-danger">${escapeHtml(result.message)}</td></tr>`;
        }
    } catch (e) {
        console.error("Error fetching items:", e);
    }
}

function setupItemMasterAutocomplete() {
    const searchInput = document.getElementById('itemMasterSearch');
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        clearTimeout(window.debounceTimer);
        window.debounceTimer = setTimeout(() => fetchItems(1), 500);
    });
}

function setupModelFilterAutocomplete() {
    const searchInput = document.getElementById('modelFilterSearch');
    const valueInput = document.getElementById('modelFilterValue');
    if (!searchInput || !valueInput) return;
    searchInput.addEventListener('input', () => {
        clearTimeout(window.modelDebounceTimer);
        valueInput.value = searchInput.value;
        window.modelDebounceTimer = setTimeout(() => fetchItems(1), 500);
    });
}

function renderItemsTable(items, totalItems, page) {
    const tbody = document.getElementById('itemsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="22" class="text-center text-muted py-4"><i class="fas fa-inbox fa-2x mb-2 d-block"></i> ไม่พบข้อมูล Master Data</td></tr>`; 
        if (typeof renderPagination === 'function') renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.itemId = item.item_id;

        const statusClass = item.is_active == 1 ? 'text-success' : 'text-danger';
        const statusText = item.is_active == 1 ? 'Active' : 'Inactive';
        
        const fNum = (val) => parseFloat(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
        const fQty = (val) => parseFloat(val || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const fPlan = (val) => parseInt(val || 0).toLocaleString();

        tr.innerHTML = `
            <td class="sticky-col-left px-3 py-1">
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-primary" style="font-size: 0.85rem;">${escapeHtml(item.sap_no)}</span>
                    <span class="badge bg-secondary" style="font-size: 0.6rem;">${escapeHtml(item.material_type || 'FG')}</span>
                </div>
                <div class="text-muted" style="font-size: 0.7rem;">${escapeHtml(item.part_no || '-')}</div>
            </td>
            <td>
                <div class="text-truncate text-dark" style="max-width: 200px;" title="${escapeHtml(item.part_description)}">
                    ${escapeHtml(item.part_description || '-')}
                </div>
            </td>
            <td class="text-center bg-secondary bg-opacity-10 fw-bold text-dark">${fPlan(item.planned_output)}</td>
            <td class="text-end bg-warning bg-opacity-10">${fQty(item.min_stock)}</td>
            <td class="text-end bg-warning bg-opacity-10">${fQty(item.max_stock)}</td>
            <td class="text-center bg-info bg-opacity-10 fw-bold">${item.CTN || 0}</td>
            <td class="text-end bg-info bg-opacity-10">${fQty(item.net_weight)}</td>
            <td class="text-end bg-info bg-opacity-10">${fQty(item.gross_weight)}</td>
            <td class="text-end bg-info bg-opacity-10">${fQty(item.cbm)}</td>
            <td class="text-end bg-success bg-opacity-10 fw-bold text-success">${fNum(item.StandardPrice)}</td>
            <td class="text-end bg-success bg-opacity-10">${fNum(item.Price_USD)}</td>
            <td class="text-end bg-danger bg-opacity-10">${fNum(item.Cost_RM)}</td>
            <td class="text-end bg-danger bg-opacity-10">${fNum(item.Cost_PKG)}</td>
            <td class="text-end bg-danger bg-opacity-10">${fNum(item.Cost_SUB)}</td>
            <td class="text-end bg-danger bg-opacity-10 fw-bold">${fNum(item.Cost_DL)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Machine)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Utilities)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Indirect)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Staff)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Accessory)}</td>
            <td class="text-end bg-primary bg-opacity-10">${fNum(item.Cost_OH_Others)}</td>
            <td class="text-center px-3 fw-bold ${statusClass}">${statusText}</td>
        `;

        if (item.is_active != 1) tr.style.opacity = '0.5';

        tr.addEventListener('click', () => openItemModal(item));
        tbody.appendChild(tr);
    });
    
    if (typeof renderPagination === 'function') renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
}

async function openItemModal(item = null) {
    const form = document.getElementById('itemAndRoutesForm');
    if (!form) return;
    form.reset();
    const modalTitle = document.getElementById('itemModalLabel');
    const routesTbody = document.getElementById('modalRoutesTableBody');
    if (routesTbody) routesTbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading routes...</td></tr>';
    
    const deleteBtn = document.getElementById('deleteItemBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    const btnWhereUsed = document.getElementById('btnWhereUsed');
    if (item && item.item_id !== '0') {
        if (btnWhereUsed) {
            btnWhereUsed.style.display = 'inline-block';
            btnWhereUsed.onclick = () => openWhereUsedModal(item.item_id, item.sap_no);
        }
    } else {
        if (btnWhereUsed) btnWhereUsed.style.display = 'none';
    }

    const triggerEl = document.querySelector('#itemFormTabs button[data-bs-target="#basic-pane"]');
    if (triggerEl) {
        const tabInstance = bootstrap.Tab.getInstance(triggerEl) || new bootstrap.Tab(triggerEl);
        tabInstance.show();
    }

    const setInputValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            let val = value ? parseFloat(value) : 0;
            if (id === 'planned_output' || id === 'CTN') {
                element.value = parseInt(val);
            } else {
                element.value = val === 0 ? "0" : val; 
            }
        }
    };

    if (item) {
        modalTitle.textContent = `Edit Item: ${item.sap_no}`;
        document.getElementById('item_id').value = item.item_id;
        
        document.getElementById('sap_no').value = item.sap_no || '';
        document.getElementById('part_no').value = item.part_no || '';
        document.getElementById('sku').value = item.sku || '';
        document.getElementById('material_type').value = item.material_type || 'FG';
        document.getElementById('part_description').value = item.part_description || '';
        
        setInputValue('planned_output', item.planned_output);
        setInputValue('min_stock', item.min_stock);
        setInputValue('max_stock', item.max_stock);
        document.getElementById('is_active').checked = (item.is_active == 1);
        
        setInputValue('CTN', item.CTN);
        setInputValue('net_weight', item.net_weight);
        setInputValue('gross_weight', item.gross_weight);
        setInputValue('cbm', item.cbm);
        document.getElementById('invoice_product_type').value = item.invoice_product_type || '';
        document.getElementById('invoice_description').value = item.invoice_description || '';

        setInputValue('Cost_RM', item.Cost_RM);
        setInputValue('Cost_PKG', item.Cost_PKG);
        setInputValue('Cost_SUB', item.Cost_SUB);
        setInputValue('Cost_DL', item.Cost_DL);
        setInputValue('Cost_OH_Machine', item.Cost_OH_Machine);
        setInputValue('Cost_OH_Utilities', item.Cost_OH_Utilities);
        setInputValue('Cost_OH_Indirect', item.Cost_OH_Indirect);
        setInputValue('Cost_OH_Staff', item.Cost_OH_Staff);
        setInputValue('Cost_OH_Accessory', item.Cost_OH_Accessory);
        setInputValue('Cost_OH_Others', item.Cost_OH_Others);
        setInputValue('StandardPrice', item.StandardPrice);
        setInputValue('Price_USD', item.Price_USD);

        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
            if (item.is_active == 0) {
                // ถ้าไอเท็มถูกลบไปแล้ว ให้เปลี่ยนปุ่มเป็นสีเขียวและใช้คำว่า Restore
                deleteBtn.innerHTML = '<i class="fas fa-trash-restore me-1"></i> Restore';
                deleteBtn.className = 'btn btn-sm btn-success fw-bold px-3 me-2';
                deleteBtn.onclick = restoreItem; // เปลี่ยนไปเรียกฟังก์ชันกู้คืน
            } else {
                // ถ้าไอเท็มยังใช้งานได้ ให้เป็นปุ่ม Delete สีแดงเหมือนเดิม
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Deactivate';
                deleteBtn.className = 'btn btn-sm btn-danger fw-bold px-3 me-2';
                deleteBtn.onclick = deleteItem;
            }
        }

        const result = await fetchAPI(ITEM_MASTER_API, 'get_item_routes', 'GET', null, { item_id: item.item_id });
        const routes = result.success ? result.data : [];
        if (routesTbody) renderRoutesInModal(routes);

    } else {
        modalTitle.textContent = 'Add New Item';
        document.getElementById('item_id').value = '0';
        document.getElementById('is_active').checked = true;
        document.getElementById('sku').value = '';
        
        setInputValue('planned_output', 0); setInputValue('min_stock', 0); setInputValue('max_stock', 0);
        setInputValue('CTN', 0); setInputValue('net_weight', 0); setInputValue('gross_weight', 0); setInputValue('cbm', 0);
        
        setInputValue('Cost_RM', 0); setInputValue('Cost_PKG', 0); setInputValue('Cost_SUB', 0); setInputValue('Cost_DL', 0);
        setInputValue('Cost_OH_Machine', 0); setInputValue('Cost_OH_Utilities', 0); setInputValue('Cost_OH_Indirect', 0);
        setInputValue('Cost_OH_Staff', 0); setInputValue('Cost_OH_Accessory', 0); setInputValue('Cost_OH_Others', 0);
        setInputValue('StandardPrice', 0); setInputValue('Price_USD', 0);
        
        if (routesTbody) renderRoutesInModal([]);
    }
    openModal('itemModal');
}

// 🌟 ฟังก์ชันใหม่สำหรับปลุกชีพข้อมูล (Restore)
async function restoreItem() {
    const itemId = document.getElementById('item_id').value;
    const sapNo = document.getElementById('sap_no').value;
    
    if (confirm(`คุณต้องการกู้คืน (Restore) สินค้ารหัส SAP: ${sapNo} ใช่หรือไม่?`)) {
        const btnSave = document.getElementById('btnSaveItem');
        toggleButtonState(btnSave, true, 'Restoring...');
        try {
            const result = await fetchAPI(ITEM_MASTER_API, 'restore_item', 'POST', { item_id: itemId });
            if (result.success) {
                closeModal('itemModal');
                await fetchItems(currentPage);
                showToast(result.message, 'var(--bs-success)');
            } else {
                showToast(result.message, 'var(--bs-danger)');
            }
        } finally {
            toggleButtonState(btnSave, false);
        }
    }
}

function renderRoutesInModal(routes) {
    const tbody = document.getElementById('modalRoutesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (routes.length === 0) {
        tbody.innerHTML = `<tr class="no-routes-row"><td colspan="4" class="text-center text-muted">No routes defined. Click 'Add New Route' to begin.</td></tr>`;
    } else {
        routes.forEach(route => addRouteRow(route));
    }
}

function addRouteRow(route = {}) {
    const tbody = document.getElementById('modalRoutesTableBody');
    if (!tbody) return;
    const noRoutesRow = tbody.querySelector('.no-routes-row');
    if (noRoutesRow) noRoutesRow.remove();
    
    const tr = document.createElement('tr');
    tr.dataset.routeId = route.route_id || '0'; 
    tr.dataset.status = route.route_id ? 'existing' : 'new';
    
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" name="route_line" value="${escapeHtml(route.line || '')}" required></td>
        <td><input type="text" class="form-control form-control-sm" name="route_model" value="${escapeHtml(route.model || '')}" required></td>
        <td><input type="number" class="form-control form-control-sm text-center" name="route_planned_output" value="${route.planned_output || '0'}" min="0" required></td>
        <td class="text-center">
            <button type="button" class="btn btn-danger btn-sm btn-delete-route"><i class="fas fa-trash-alt"></i></button>
        </td>
    `;
    
    tr.querySelector('.btn-delete-route').addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this route?')) {
            if (tr.dataset.status === 'new') {
                tr.remove();
            } else {
                tr.style.display = 'none';
                tr.dataset.status = 'deleted';
            }
        }
    });
    tbody.appendChild(tr);
}

async function handleItemFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    
    // 🌟 เพิ่มเช็คค่าว่างตรงนี้ก่อน (Manual Validation)
    const sapNo = form.querySelector('#sap_no').value.trim();
    if (!sapNo) {
        Swal.fire('Warning', 'กรุณาระบุรหัส SAP No.', 'warning');
        // บังคับสลับกลับไปที่แท็บแรกที่มีช่อง SAP No. อยู่
        const triggerEl = document.querySelector('#itemFormTabs button[data-bs-target="#basic-pane"]');
        if (triggerEl) bootstrap.Tab.getOrCreateInstance(triggerEl).show();
        form.querySelector('#sap_no').focus();
        return;
    }

    const btnSave = document.getElementById('btnSaveItem');
    toggleButtonState(btnSave, true, 'Saving...');
    
    try {
        const itemDetails = {
            item_id: form.querySelector('#item_id').value,
            sap_no: sapNo,
            part_no: form.querySelector('#part_no').value,
            sku: form.querySelector('#sku').value,
            material_type: form.querySelector('#material_type').value,
            part_description: form.querySelector('#part_description').value,
            planned_output: form.querySelector('#planned_output').value,
            min_stock: form.querySelector('#min_stock').value,
            max_stock: form.querySelector('#max_stock').value,
            is_active: form.querySelector('#is_active').checked ? 1 : 0,

            CTN: form.querySelector('#CTN').value,
            net_weight: form.querySelector('#net_weight').value,
            gross_weight: form.querySelector('#gross_weight').value,
            cbm: form.querySelector('#cbm').value,
            invoice_product_type: form.querySelector('#invoice_product_type').value,
            invoice_description: form.querySelector('#invoice_description').value,

            Cost_RM: form.querySelector('#Cost_RM').value,
            Cost_PKG: form.querySelector('#Cost_PKG').value,
            Cost_SUB: form.querySelector('#Cost_SUB').value,
            Cost_DL: form.querySelector('#Cost_DL').value,
            Cost_OH_Machine: form.querySelector('#Cost_OH_Machine').value,
            Cost_OH_Utilities: form.querySelector('#Cost_OH_Utilities').value,
            Cost_OH_Indirect: form.querySelector('#Cost_OH_Indirect').value,
            Cost_OH_Staff: form.querySelector('#Cost_OH_Staff').value,
            Cost_OH_Accessory: form.querySelector('#Cost_OH_Accessory').value,
            Cost_OH_Others: form.querySelector('#Cost_OH_Others').value,
            StandardPrice: form.querySelector('#StandardPrice').value,
            Price_USD: form.querySelector('#Price_USD').value
        };

        const routesData = [];
        const routeRows = document.querySelectorAll('#modalRoutesTableBody tr:not(.no-routes-row)');     
        routeRows.forEach(tr => {
            routesData.push({
                route_id: tr.dataset.routeId,
                status: tr.dataset.status,
                line: tr.querySelector('[name="route_line"]').value,
                model: tr.querySelector('[name="route_model"]').value,
                planned_output: tr.querySelector('[name="route_planned_output"]').value
            });
        });

        const payload = { item_details: itemDetails, routes_data: routesData };
        const result = await fetchAPI(ITEM_MASTER_API, 'save_item_and_routes', 'POST', payload);
        
        if (result.success) {
            closeModal('itemModal');
            await fetchItems(currentPage);
            showToast(result.message, 'var(--bs-success)');
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        toggleButtonState(btnSave, false);
    }
}

async function deleteItem() {
    const itemId = document.getElementById('item_id').value;
    const sapNo = document.getElementById('sap_no').value;
    
    if (!itemId || itemId === '0') {
        showToast("Cannot delete an unsaved item.", 'var(--bs-warning)');
        return;
    }

    if (confirm(`Are you sure you want to deactivate item SAP: ${sapNo}?`)) {
        const btnSave = document.getElementById('btnSaveItem');
        toggleButtonState(btnSave, true, 'Deleting...');
        try {
            const result = await fetchAPI(ITEM_MASTER_API, 'delete_item', 'POST', { item_id: itemId });
            if (result.success) {
                closeModal('itemModal');
                await fetchItems(currentPage);
                showToast(result.message, 'var(--bs-success)');
            } else {
                showToast(result.message, 'var(--bs-danger)');
            }
        } finally {
            toggleButtonState(btnSave, false);
        }
    }
}

// === Item Master Import/Export ===
async function exportItemsMaster() {
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const result = await fetchAPI(ITEM_MASTER_API, 'get_items', 'GET', null, { page: 1, limit: -1 });
        if (result.success) {
            const wsData = [[
                "SAP No", "Part No", "Customer SKU", "Material Type", "Description", "Planned Output", "Min Stock", "Max Stock", "Is Active",
                "CTN", "Net Weight", "Gross Weight", "CBM", "Invoice Product Type", "Invoice Description",
                "Standard Price", "Price USD", "Cost RM", "Cost PKG", "Cost SUB", "Cost DL",
                "OH Machine", "OH Utilities", "OH Indirect", "OH Staff", "OH Accessory", "OH Others"
            ]];

            result.data.forEach(item => {
                wsData.push([
                    item.sap_no || '', item.part_no || '', item.sku || '', item.material_type || 'FG', item.part_description || '', item.planned_output || 0, item.min_stock || 0, item.max_stock || 0, item.is_active == 1 ? 'Yes' : 'No',
                    item.CTN || 0, item.net_weight || 0, item.gross_weight || 0, item.cbm || 0, item.invoice_product_type || '', item.invoice_description || '',
                    item.StandardPrice || 0, item.Price_USD || 0, item.Cost_RM || 0, item.Cost_PKG || 0, item.Cost_SUB || 0, item.Cost_DL || 0,
                    item.Cost_OH_Machine || 0, item.Cost_OH_Utilities || 0, item.Cost_OH_Indirect || 0, item.Cost_OH_Staff || 0, item.Cost_OH_Accessory || 0, item.Cost_OH_Others || 0
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "ItemMaster");
            XLSX.writeFile(wb, `ItemMaster_${new Date().toISOString().split('T')[0]}.xlsx`);
            Swal.close();
        } else {
            throw new Error(result.message);
        }
    } catch (e) {
        Swal.fire('Error', e.message || 'Export failed', 'error');
    }
}

async function handleItemMasterImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const btnImport = document.getElementById('importItemsBtn');
    if (btnImport) btnImport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (jsonRows.length === 0) throw new Error("Empty file");

        const payload = jsonRows.map(row => ({
            sap_no: row["SAP No"] || '',
            part_no: row["Part No"] || '',
            sku: row["Customer SKU"] || '',
            material_type: row["Material Type"] || 'FG',
            part_description: row["Description"] || '',
            planned_output: parseInt(row["Planned Output"]) || 0,
            min_stock: parseFloat(row["Min Stock"]) || 0,
            max_stock: parseFloat(row["Max Stock"]) || 0,
            is_active: (row["Is Active"] && String(row["Is Active"]).trim().toLowerCase() === 'no') ? 0 : 1,
            
            ctn: parseInt(row["CTN"]) || 0,
            net_weight: parseFloat(row["Net Weight"]) || 0,
            gross_weight: parseFloat(row["Gross Weight"]) || 0,
            cbm: parseFloat(row["CBM"]) || 0,
            invoice_product_type: row["Invoice Product Type"] || '',
            invoice_description: row["Invoice Description"] || '',

            StandardPrice: parseFloat(row["Standard Price"]) || 0,
            Price_USD: parseFloat(row["Price USD"]) || 0,
            Cost_RM: parseFloat(row["Cost RM"]) || 0,
            Cost_PKG: parseFloat(row["Cost PKG"]) || 0,
            Cost_SUB: parseFloat(row["Cost SUB"]) || 0,
            Cost_DL: parseFloat(row["Cost DL"]) || 0,
            Cost_OH_Machine: parseFloat(row["OH Machine"]) || 0,
            Cost_OH_Utilities: parseFloat(row["OH Utilities"]) || 0,
            Cost_OH_Indirect: parseFloat(row["OH Indirect"]) || 0,
            Cost_OH_Staff: parseFloat(row["OH Staff"]) || 0,
            Cost_OH_Accessory: parseFloat(row["OH Accessory"]) || 0,
            Cost_OH_Others: parseFloat(row["OH Others"]) || 0
        })).filter(r => r.sap_no !== '');

        if (payload.length === 0) return Swal.fire('Error', 'No valid SAP No. found', 'error');

        const result = await fetchAPI(ITEM_MASTER_API, 'unified_bulk_import', 'POST', payload);
        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Import Complete', text: result.message });
            await fetchItems(currentPage);
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        Swal.fire('Error', err.message || 'Invalid File Format', 'error');
    } finally {
        if (btnImport) btnImport.innerHTML = '<i class="fas fa-file-import me-2 w-15px text-info"></i> Import Excel';
        e.target.value = '';
    }
}

async function openWhereUsedModal(itemId, sapNo) {
    document.getElementById('wuTargetSap').textContent = sapNo;
    const tbody = document.getElementById('wuTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-info"></i><br><small class="text-muted mt-2 d-block">กำลังค้นหาข้อมูล...</small></td></tr>';
    
    openModal('whereUsedModal'); 

    const result = await fetchAPI(BOM_API_ENDPOINT, 'get_where_used', 'GET', null, { component_item_id: itemId });
    
    tbody.innerHTML = '';
    if (result.success && result.data.length > 0) {
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            let badgeClass = 'bg-secondary';
            if (row.material_type === 'FG') badgeClass = 'bg-primary';
            if (row.material_type === 'SEMI') badgeClass = 'bg-warning text-dark';

            tr.innerHTML = `
                <td class="px-3 py-2 fw-bold text-primary">${escapeHtml(row.fg_sap_no)}</td>
                <td class="text-truncate" style="max-width: 250px; font-size: 0.8rem;">${escapeHtml(row.part_description || '-')}</td>
                <td class="text-center"><span class="badge ${badgeClass}" style="font-size: 0.6rem;">${escapeHtml(row.material_type)}</span></td>
                <td class="text-end px-3 fw-bold bg-warning bg-opacity-10">${parseFloat(row.quantity_required).toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted"><i class="fas fa-unlink fa-3x mb-3 d-block opacity-25"></i> ไม่พบการใช้งาน (Not Used) <br><small>วัตถุดิบนี้ยังไม่ถูกนำไปผูกในสูตรการผลิตใดๆ</small></td></tr>';
    }
}

// =================================================================
// SECTION 5: BOM MANAGER (Master-Detail, Catalog & Versioning)
// =================================================================
const BomManagerModule = {
    allFgs: [],
    catalogItems: [],
    selectedFg: null,
    debounceTimer: null,
    catalogDebounceTimer: null,
    
    // 🌟 ตัวแปรใหม่สำหรับระบบ Versioning
    currentVersion: 0,
    currentStatus: '',

    cacheDOM() {
        this.masterList = document.getElementById('bomMasterList');
        this.masterSearch = document.getElementById('bomMasterSearch');
        
        this.detailTitle = document.getElementById('bomDetailTitle');
        this.detailSubtitle = document.getElementById('bomDetailSubtitle');
        this.detailActions = document.getElementById('bomDetailActions');
        
        this.detailTbody = document.getElementById('bomDetailTbody');
        this.detailFooter = document.getElementById('bomDetailFooter'); 
        this.totalCostLabel = document.getElementById('bomTotalCost');
        
        this.btnDeleteAll = document.getElementById('btnDeleteFullBom');
        this.btnOpenCatalog = document.getElementById('btnOpenCatalog');

        // Catalog Modal
        this.catalogSearch = document.getElementById('catalogSearch');
        this.catalogTypeFilter = document.getElementById('catalogTypeFilter');
        this.catalogTbody = document.getElementById('catalogTbody');
        this.catalogTargetFg = document.getElementById('catalogTargetFg');

        // 🌟 Versioning UI Elements
        this.versionSelect = document.getElementById('bomVersionSelect');
        this.statusBadge = document.getElementById('bomStatusBadge');
        this.ecnLabel = document.getElementById('bomEcnLabel');
        this.ecnText = document.getElementById('bomEcnText');
        this.btnCreateRevision = document.getElementById('btnCreateRevision');
        this.btnApproveRevision = document.getElementById('btnApproveRevision');
        this.btnCloneBom = document.getElementById('btnCloneBom');
        this.btnRollupCost = document.getElementById('btnRollupCost');
        this.btnViewHistory = document.getElementById('btnViewHistory');
    },

    bindEvents() {
        // Master List Search
        this.masterSearch?.addEventListener('input', () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.renderMasterList(), 300);
        });

        this.btnDeleteAll?.addEventListener('click', () => this.deleteFullBom());
        this.btnOpenCatalog?.addEventListener('click', () => this.openCatalog());

        // Inline Edit Quantity (เปลี่ยนปุ๊บ Save ปั๊บ)
        this.detailTbody?.addEventListener('change', (e) => {
            if (e.target.classList.contains('inline-qty-edit')) {
                this.updateCompQty(e.target);
            }
        });

        // ปุ่ม Delete Component
        this.detailTbody?.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-delete-comp');
            if (btn) this.deleteComp(btn.dataset.bomId);
        });

        // Catalog Search & Filter
        this.catalogSearch?.addEventListener('input', () => {
            clearTimeout(this.catalogDebounceTimer);
            this.catalogDebounceTimer = setTimeout(() => this.renderCatalog(), 300);
        });
        this.catalogTypeFilter?.addEventListener('change', () => this.renderCatalog());

        // Modal Close Event -> Refresh Detail Table
        document.getElementById('catalogModal')?.addEventListener('hidden.bs.modal', () => {
            if (this.selectedFg) this.loadBomDetails();
        });

        // ปุ่ม Action อื่นๆ
        this.btnCloneBom?.addEventListener('click', () => this.cloneBom());
        this.btnRollupCost?.addEventListener('click', () => this.rollupCost());
        this.btnViewHistory?.addEventListener('click', () => this.viewHistory());

        // 🌟 Versioning Events
        this.versionSelect?.addEventListener('change', (e) => {
            this.currentVersion = parseInt(e.target.value);
            this.loadBomDetails(); // โหลดสูตรตามเวอร์ชันที่เลือก
        });

        this.btnCreateRevision?.addEventListener('click', () => openModal('ecnModal'));
        document.getElementById('ecnForm')?.addEventListener('submit', (e) => this.createRevision(e));
        this.btnApproveRevision?.addEventListener('click', () => this.approveRevision());
    },

    async init() {
        this.cacheDOM();
        this.bindEvents();
        await this.loadFgs();
        await this.loadCatalogItems(); // โหลด Item ทั้งหมดมารอไว้เลย
    },

    // --- 1. Master List View ---
    async loadFgs() {
        this.masterList.innerHTML = '<div class="text-center p-4 text-muted"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        const result = await fetchAPI(BOM_API_ENDPOINT, 'get_bom_master_list', 'GET');
        if (result.success) {
            this.allFgs = result.data;
            this.renderMasterList();
        }
    },

    renderMasterList() {
        if (!this.masterList) return;
        const term = (this.masterSearch?.value || '').toLowerCase();
        
        let filtered = this.allFgs;
        if (term) {
            filtered = this.allFgs.filter(fg => 
                (fg.sap_no || '').toLowerCase().includes(term) || 
                (fg.part_no || '').toLowerCase().includes(term)
            );
        }

        const typeWeight = { 'FG': 1, 'WIP': 2, 'SEMI': 2, 'PKG': 3 };
        filtered.sort((a, b) => {
            const wA = typeWeight[a.material_type] || 99;
            const wB = typeWeight[b.material_type] || 99;
            
            if (wA !== wB) return wA - wB;
            if (a.has_bom !== b.has_bom) return a.has_bom - b.has_bom;
            return (a.sap_no || '').localeCompare(b.sap_no || '');
        });

        this.masterList.innerHTML = '';
        if (filtered.length === 0) {
            this.masterList.innerHTML = '<div class="p-3 text-center text-muted small">ไม่พบข้อมูล</div>';
            return;
        }

        filtered.forEach(fg => {
            if (fg.material_type === 'RM') return;

            const a = document.createElement('a');
            a.href = '#';
            a.className = `list-group-item list-group-item-action py-2 px-3 border-bottom ${this.selectedFg?.item_id === fg.item_id ? 'active' : ''}`;
            
            let typeColor = 'bg-secondary';
            if (fg.material_type === 'FG') typeColor = 'bg-primary';
            if (fg.material_type === 'WIP' || fg.material_type === 'SEMI') typeColor = 'bg-warning text-dark';

            const noBomIcon = parseInt(fg.has_bom) === 0 
                ? '<i class="fas fa-exclamation-circle text-danger ms-1" title="ยังไม่มีสูตรผลิต (NO BOM)"></i>' 
                : '';

            a.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div>
                        <span class="fw-bold" style="font-size: 0.85rem;">${escapeHtml(fg.sap_no)}</span>${noBomIcon}
                    </div>
                    <span class="badge ${typeColor}" style="font-size: 0.6rem;">${escapeHtml(fg.material_type || 'FG')}</span>
                </div>
                <div class="text-truncate text-muted mb-1" style="font-size: 0.75rem;">${escapeHtml(fg.part_description || fg.part_no || '-')}</div>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted" style="font-size: 0.65rem;"><i class="fas fa-tachometer-alt me-1"></i> UPH: ${fg.planned_output || 0}</small>
                    <i class="fas fa-chevron-right text-muted opacity-50" style="font-size: 0.6rem;"></i>
                </div>
            `;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectFg(fg);
            });
            this.masterList.appendChild(a);
        });
    },

    async selectFg(fg) {
        this.selectedFg = fg;
        this.renderMasterList(); 

        this.detailTitle.innerHTML = `<i class="fas fa-cube text-primary me-2"></i>${escapeHtml(fg.sap_no)}`;
        this.detailSubtitle.innerHTML = `${escapeHtml(fg.part_description || fg.part_no || '-')} 
            <span class="badge bg-light text-dark border ms-2">Standard UPH: ${fg.planned_output || 0}</span>`;
        
        this.detailActions.classList.remove('d-none');
        this.detailFooter.classList.remove('d-none');

        // 🌟 โหลดประวัติ Version ก่อนที่จะโหลดรายละเอียด BOM
        await this.loadVersions(fg.item_id);
    },

    // --- 🌟 Versioning Management ---
    async loadVersions(fg_id) {
        const res = await fetchAPI(BOM_API_ENDPOINT, 'get_bom_versions', 'GET', null, { fg_item_id: fg_id });
        if (res.success && res.data.length > 0) {
            this.versionSelect.classList.remove('d-none');
            this.statusBadge.classList.remove('d-none');
            this.versionSelect.innerHTML = '';
            
            res.data.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.bom_version;
                opt.textContent = `Rev ${v.bom_version}.0`;
                opt.dataset.status = v.bom_status;
                opt.dataset.ecn = v.ecn_number || '';
                this.versionSelect.appendChild(opt);
            });

            // ค่าเริ่มต้นเป็นเวอร์ชันล่าสุด (DRAFT หรือ ACTIVE ล่าสุด)
            let defaultVer = res.data[0];
            const draftVer = res.data.find(v => v.bom_status === 'DRAFT');
            if (draftVer) defaultVer = draftVer;

            this.versionSelect.value = defaultVer.bom_version;
            this.currentVersion = defaultVer.bom_version;
            
            await this.loadBomDetails();
        } else {
            // กรณียังไม่เคยมีสูตรเลย
            this.currentVersion = 1;
            this.currentStatus = 'DRAFT';
            this.versionSelect.classList.add('d-none');
            this.statusBadge.classList.add('d-none');
            this.ecnLabel.classList.add('d-none');
            this.loadBomDetails();
        }
    },

    updateUIByStatus() {
        const opt = this.versionSelect.options[this.versionSelect.selectedIndex];
        this.currentStatus = opt ? opt.dataset.status : 'DRAFT';
        const ecn = opt ? opt.dataset.ecn : '';

        // อัปเดตสี Badge ตามสถานะ
        this.statusBadge.className = 'badge ms-2 ' + 
            (this.currentStatus === 'ACTIVE' ? 'bg-success' : 
             this.currentStatus === 'DRAFT' ? 'bg-warning text-dark' : 'bg-secondary');
        this.statusBadge.textContent = this.currentStatus;

        if (ecn) {
            this.ecnLabel.classList.remove('d-none');
            this.ecnText.textContent = ecn;
        } else {
            this.ecnLabel.classList.add('d-none');
        }

        // จัดการปุ่มต่างๆ ตามสิทธิ์ (Read-Only)
        if (this.currentStatus === 'ACTIVE') {
            this.btnCreateRevision.classList.remove('d-none');
            this.btnApproveRevision.classList.add('d-none');
            this.btnOpenCatalog.classList.add('d-none'); // 🔒 ซ่อนปุ่มเลือกวัตถุดิบ
            this.btnDeleteAll.classList.add('d-none');   // 🔒 ซ่อนปุ่มล้างสูตร
            this.btnRollupCost.classList.remove('d-none'); 
        } else if (this.currentStatus === 'DRAFT') {
            this.btnCreateRevision.classList.add('d-none');
            this.btnApproveRevision.classList.remove('d-none');
            this.btnOpenCatalog.classList.remove('d-none'); // เปิดให้แก้สูตรได้
            this.btnDeleteAll.classList.remove('d-none');
            this.btnRollupCost.classList.add('d-none');     
        } else {
            // OBSOLETE ดูได้อย่างเดียว
            this.btnCreateRevision.classList.add('d-none');
            this.btnApproveRevision.classList.add('d-none');
            this.btnOpenCatalog.classList.add('d-none');
            this.btnDeleteAll.classList.add('d-none');
            this.btnRollupCost.classList.add('d-none');
        }
    },

    // --- 2. Detail View (Right Side) ---
    async loadBomDetails() {
        if (!this.selectedFg) return;
        this.detailTbody.innerHTML = '<tr><td colspan="5" class="text-center p-4"><i class="fas fa-spinner fa-spin"></i> Loading BOM...</td></tr>';
        
        this.updateUIByStatus(); // 🌟 อัปเดตการแสดงผลปุ่มก่อน

        // 🌟 ดึงข้อมูลโดยส่ง bom_version ไปด้วย
        const result = await fetchAPI(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { 
            fg_item_id: this.selectedFg.item_id,
            bom_version: this.currentVersion
        });

        if (result.success) {
            this.renderBomDetails(result.data);
        }
    },

    renderBomDetails(components) {
        this.detailTbody.innerHTML = '';
        let totalCost = 0;
        const isReadOnly = (this.currentStatus !== 'DRAFT'); // 🔒 เช็คสถานะ ReadOnly

        if (components.length === 0) {
            this.detailTbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger"><i class="fas fa-exclamation-triangle fa-2x mb-3 d-block opacity-50"></i> ยังไม่ได้กำหนดสูตรการผลิต (BOM ว่างเปล่า) ${isReadOnly ? '' : '<br>คลิกปุ่ม "เลือกวัตถุดิบ" ด้านบนเพื่อเริ่มสร้างสูตร'}</td></tr>`;
            this.totalCostLabel.textContent = '฿0.0000';
            return;
        }

        components.forEach(comp => {
            const tr = document.createElement('tr');
            
            // ใช้ต้นทุนจาก API ที่ส่งมา (สมมติว่าเป็น Cost_RM) ถ้าไม่มีค่อยหาจาก Catalog
            let unitCost = parseFloat(comp.Cost_RM || 0);
            if (unitCost === 0) {
                const catItem = this.catalogItems.find(i => i.item_id === comp.component_item_id);
                unitCost = catItem ? (parseFloat(catItem.Cost_RM) || parseFloat(catItem.Cost_Total) || 0) : 0;
            }

            const qty = parseFloat(comp.quantity_required || 0);
            const estCost = unitCost * qty;
            totalCost += estCost;

            // 🔒 ควบคุมกล่อง Input (ถ้า ReadOnly ให้โชว์เป็นตัวอักษรธรรมดา)
            const qtyHtml = isReadOnly 
                ? `<span class="fw-bold px-2 py-1 bg-light border rounded text-dark">${qty.toLocaleString(undefined, {maximumFractionDigits:4})}</span>`
                : `<input type="number" class="form-control form-control-sm text-center fw-bold border-warning text-dark inline-qty-edit mx-auto" 
                          data-bom-id="${comp.bom_id}" value="${qty}" min="0.000001" step="any" style="background: transparent; width: 100px;">`;

            // 🔒 ควบคุมปุ่มลบ
            const actionHtml = isReadOnly 
                ? `<span class="text-muted small"><i class="fas fa-lock"></i> Locked</span>`
                : `<button class="btn btn-sm btn-outline-danger border-0 btn-delete-comp" data-bom-id="${comp.bom_id}" title="Remove"><i class="fas fa-trash-alt"></i></button>`;

            tr.innerHTML = `
                <td class="px-3 py-2 fw-bold text-primary" style="font-size: 0.85rem;">${escapeHtml(comp.sap_no || comp.component_sap_no)}</td>
                <td class="py-2 text-truncate" style="max-width: 200px; font-size: 0.8rem;">${escapeHtml(comp.part_description || '-')}</td>
                <td class="py-2 bg-warning bg-opacity-10 text-center">${qtyHtml}</td>
                <td class="text-end py-2 px-3 fw-bold" style="font-size: 0.85rem;">฿${formatCurrency(estCost)}</td>
                <td class="text-center py-2">${actionHtml}</td>
            `;
            this.detailTbody.appendChild(tr);
        });

        this.totalCostLabel.textContent = `฿${formatCurrency(totalCost)}`;
    },

    // --- 🌟 ECN Revision Actions ---
    async createRevision(e) {
        e.preventDefault();
        const ecnNo = e.target.ecn_number.value;
        const btn = e.target.querySelector('button[type="submit"]');
        toggleButtonState(btn, true, 'Creating...');

        try {
            const res = await fetchAPI(BOM_API_ENDPOINT, 'create_bom_revision', 'POST', {
                fg_item_id: this.selectedFg.item_id,
                ecn_number: ecnNo
            });
            if (res.success) {
                closeModal('ecnModal');
                Swal.fire('Success!', res.message, 'success');
                await this.loadVersions(this.selectedFg.item_id); // อัปเดต Dropdown
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } finally {
            toggleButtonState(btn, false);
        }
    },

    async approveRevision() {
        const result = await Swal.fire({
            title: 'Approve & Release?',
            html: `คุณกำลังจะนำสูตร <b>Rev ${this.currentVersion}.0</b> ขึ้นใช้งานจริง<br><small class="text-danger">*สูตรเก่าทั้งหมดจะถูกปรับเป็น Obsolete (ยกเลิก) อัตโนมัติ</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            confirmButtonText: 'ใช่, อนุมัติใช้งาน!'
        });

        if (result.isConfirmed) {
            toggleButtonState(this.btnApproveRevision, true, 'Approving...');
            try {
                const res = await fetchAPI(BOM_API_ENDPOINT, 'approve_bom_revision', 'POST', {
                    fg_item_id: this.selectedFg.item_id,
                    bom_version: this.currentVersion
                });
                if (res.success) {
                    Swal.fire('Approved!', res.message, 'success');
                    await this.loadVersions(this.selectedFg.item_id);
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } finally {
                toggleButtonState(this.btnApproveRevision, false);
            }
        }
    },

    // --- 3. Catalog Picker Modal ---
    async loadCatalogItems() {
        const result = await fetchAPI(ITEM_MASTER_API, 'get_items', 'GET', null, { page: 1, limit: -1, show_inactive: false });
        if (result.success) {
            this.catalogItems = result.data;
        }
    },

    openCatalog() {
        if (!this.selectedFg || this.currentStatus !== 'DRAFT') return; // 🔒 เช็คสิทธิ์ก่อนเปิด
        this.catalogTargetFg.textContent = `For: ${this.selectedFg.sap_no}`;
        this.catalogSearch.value = '';
        this.renderCatalog();
        openModal('catalogModal');
    },

    renderCatalog() {
        const term = this.catalogSearch.value.toLowerCase();
        const filterType = this.catalogTypeFilter.value;
        const tbody = this.catalogTbody;
        tbody.innerHTML = '';

        let filtered = this.catalogItems.filter(item => {
            if (item.item_id === this.selectedFg.item_id) return false;
            let matchType = filterType === '' ? true : item.material_type === filterType;
            let matchSearch = term === '' ? true : (
                (item.sap_no || '').toLowerCase().includes(term) ||
                (item.part_description || '').toLowerCase().includes(term)
            );
            return matchType && matchSearch;
        });

        filtered.sort((a, b) => (a.sap_no || '').localeCompare(b.sap_no || ''));

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">ไม่พบวัตถุดิบ</td></tr>';
            return;
        }

        filtered.slice(0, 100).forEach(item => {
            const tr = document.createElement('tr');
            
            let badgeClass = 'bg-secondary';
            if (item.material_type === 'RM') badgeClass = 'bg-success';
            if (item.material_type === 'PKG') badgeClass = 'bg-info text-dark';
            if (item.material_type === 'WIP' || item.material_type === 'SEMI') badgeClass = 'bg-warning text-dark';

            tr.innerHTML = `
                <td class="px-3 fw-bold text-primary" style="font-size: 0.85rem;">${escapeHtml(item.sap_no)}</td>
                <td class="text-truncate" style="max-width: 200px; font-size: 0.8rem;">${escapeHtml(item.part_description || '-')}</td>
                <td class="text-center"><span class="badge ${badgeClass}" style="font-size: 0.65rem;">${escapeHtml(item.material_type || 'N/A')}</span></td>
                <td class="text-center px-2">
                    <input type="number" class="form-control form-control-sm text-center border-primary cat-qty-input" placeholder="Qty" min="0.000001" step="any">
                </td>
                <td class="text-center px-3">
                    <button class="btn btn-sm btn-primary fw-bold w-100 btn-add-from-cat" data-comp-id="${item.item_id}">
                        <i class="fas fa-plus"></i>
                    </button>
                </td>
            `;
            
            const btn = tr.querySelector('.btn-add-from-cat');
            const input = tr.querySelector('.cat-qty-input');
            
            btn.addEventListener('click', () => this.addFromCatalog(btn, input, item.item_id));
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addFromCatalog(btn, input, item.item_id);
            });

            tbody.appendChild(tr);
        });
    },

    async addFromCatalog(btnElement, inputElement, compId) {
        if (this.currentStatus !== 'DRAFT') return; // 🔒 เช็คสิทธิ์

        const qty = parseFloat(inputElement.value);
        if (isNaN(qty) || qty <= 0) {
            inputElement.classList.add('is-invalid');
            setTimeout(() => inputElement.classList.remove('is-invalid'), 1000);
            return;
        }

        toggleButtonState(btnElement, true, '');
        try {
            // 🌟 ส่ง bom_version เข้าไปด้วย
            const res = await fetchAPI(BOM_API_ENDPOINT, 'add_bom_component', 'POST', {
                fg_item_id: this.selectedFg.item_id,
                component_item_id: compId,
                quantity_required: qty,
                bom_version: this.currentVersion 
            });
            
            if (res.success) {
                btnElement.classList.replace('btn-primary', 'btn-success');
                btnElement.innerHTML = '<i class="fas fa-check"></i>';
                inputElement.value = ''; 
                
                setTimeout(() => {
                    btnElement.classList.replace('btn-success', 'btn-primary');
                    btnElement.innerHTML = '<i class="fas fa-plus"></i>';
                    btnElement.disabled = false;
                }, 1500);
            } else {
                showToast(res.message, 'var(--bs-danger)');
                btnElement.disabled = false;
                btnElement.innerHTML = '<i class="fas fa-plus"></i>';
            }
        } catch(e) {
            btnElement.disabled = false;
            btnElement.innerHTML = '<i class="fas fa-plus"></i>';
        }
    },

    // --- 4. Detail Actions ---
    async updateCompQty(inputEl) {
        if (this.currentStatus !== 'DRAFT') return; // 🔒 เช็คสิทธิ์

        const bomId = inputEl.dataset.bomId;
        const newQty = parseFloat(inputEl.value);
        if (!bomId || isNaN(newQty) || newQty <= 0) return;

        const ogBg = inputEl.style.backgroundColor;
        inputEl.style.backgroundColor = '#d1e7dd';

        const res = await fetchAPI(BOM_API_ENDPOINT, 'update_bom_component', 'POST', {
            bom_id: bomId,
            quantity_required: newQty
        });

        setTimeout(() => inputEl.style.backgroundColor = ogBg, 500);

        if (!res.success) {
            showToast(res.message, 'var(--bs-danger)');
        }
        this.loadBomDetails(); // โหลดใหม่เสมอเพื่ออัปเดตราคา
    },

    async deleteComp(bomId) {
        if (this.currentStatus !== 'DRAFT') return; // 🔒 เช็คสิทธิ์

        if (!confirm('ยืนยันการลบวัตถุดิบนี้ออกจากสูตร?')) return;
        const res = await fetchAPI(BOM_API_ENDPOINT, 'delete_bom_component', 'POST', { bom_id: bomId });
        if (res.success) {
            await this.loadBomDetails();
        } else {
            showToast(res.message, 'var(--bs-danger)');
        }
    },

    async deleteFullBom() {
        if (this.currentStatus !== 'DRAFT') return; // 🔒 เช็คสิทธิ์

        const result = await Swal.fire({
            title: '⚠️ ยืนยันการล้างสูตร?',
            html: `คุณกำลังจะลบส่วนประกอบทั้งหมดของ <b class="text-danger">${this.selectedFg.sap_no} (Rev ${this.currentVersion}.0)</b><br>การกระทำนี้ <b class="text-danger">ไม่สามารถย้อนกลับได้!</b>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ใช่, ลบทั้งหมด!',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            toggleButtonState(this.btnDeleteAll, true, 'Deleting...');
            try {
                const res = await fetchAPI(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', { 
                    fg_item_id: this.selectedFg.item_id,
                    bom_version: this.currentVersion
                });
                if (res.success) {
                    Swal.fire('Deleted!', 'สูตรการผลิตถูกล้างข้อมูลเรียบร้อยแล้ว', 'success');
                    await this.loadBomDetails(); 
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } finally {
                toggleButtonState(this.btnDeleteAll, false);
            }
        }
    },

    async cloneBom() {
        if (!this.selectedFg) return;
        const sourceSap = this.selectedFg.sap_no;

        const { value: targetSap, isConfirmed } = await Swal.fire({
            title: '<i class="fas fa-copy text-info"></i> Clone BOM',
            html: `
                <div class="text-start mt-2">
                    <label class="form-label small text-muted mb-1">คัดลอกสูตร <span class="badge bg-secondary">Rev ${this.currentVersion}.0</span> ของต้นฉบับ:</label>
                    <input type="text" class="form-control bg-light fw-bold text-primary mb-3" value="${sourceSap}" readonly>
                    <label class="form-label small text-muted mb-1">ไปยังเป้าหมาย (Target SAP No.): <span class="text-danger">*</span></label>
                </div>
            `,
            input: 'text',
            inputPlaceholder: 'กรอกรหัส SAP No. ปลายทาง...',
            showCancelButton: true,
            confirmButtonText: 'Clone Now',
            confirmButtonColor: '#0dcaf0',
            cancelButtonText: 'Cancel',
            inputValidator: (value) => {
                if (!value || value.trim() === '') return 'กรุณาระบุรหัส SAP No. ปลายทาง';
                if (value.trim().toUpperCase() === sourceSap.toUpperCase()) return 'ไม่สามารถคัดลอกทับตัวเองได้!';
            }
        });

        if (isConfirmed && targetSap) {
            const btnClone = document.getElementById('btnCloneBom');
            toggleButtonState(btnClone, true, 'Cloning...');
            try {
                const res = await fetchAPI(BOM_API_ENDPOINT, 'copy_bom', 'POST', {
                    source_fg_sap_no: sourceSap,
                    target_fg_sap_no: targetSap.trim().toUpperCase(),
                    bom_version: this.currentVersion // 🌟 ส่งเวอร์ชันที่จะก๊อปปี้ไปด้วย
                });

                if (res.success) {
                    Swal.fire('Success!', res.message, 'success');
                    await this.loadFgs();
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } finally {
                toggleButtonState(btnClone, false);
                btnClone.innerHTML = '<i class="fas fa-copy me-1"></i> Clone';
            }
        }
    },

    async rollupCost() {
        if (!this.selectedFg || this.currentStatus !== 'ACTIVE') return; // 🔒 Rollup ได้เฉพาะตอนเป็น ACTIVE
        
        const totalAmount = this.totalCostLabel.textContent;

        const result = await Swal.fire({
            title: 'อัปเดตต้นทุนมาตรฐาน?',
            html: `คุณต้องการนำยอดรวม <b class="text-success">${totalAmount}</b><br>จากสูตร <b>Rev ${this.currentVersion}.0</b> ไปบันทึกลงใน Item Master ใช่หรือไม่?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ยืนยันอัปเดต'
        });

        if (result.isConfirmed) {
            const btn = document.getElementById('btnRollupCost');
            toggleButtonState(btn, true, 'Updating...');
            try {
                const res = await fetchAPI(BOM_API_ENDPOINT, 'rollup_bom_cost', 'POST', {
                    fg_item_id: this.selectedFg.item_id,
                    bom_version: this.currentVersion
                });

                if (res.success) {
                    Swal.fire('Updated!', res.message, 'success');
                } else {
                    Swal.fire('Error', res.message, 'error');
                }
            } finally {
                toggleButtonState(btn, false);
                btn.innerHTML = '<i class="fas fa-calculator me-1"></i> Update Cost';
            }
        }
    },

    async viewHistory() {
        if (!this.selectedFg) return;
        
        const tbody = document.getElementById('auditTrailTbody');
        document.getElementById('auditTargetName').textContent = this.selectedFg.sap_no;
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5"><i class="fas fa-spinner fa-spin fa-2x text-secondary mb-2"></i><br>กำลังดึงข้อมูลประวัติ...</td></tr>';
        
        openModal('auditTrailModal');

        const res = await fetchAPI(BOM_API_ENDPOINT, 'get_audit_trail', 'GET', null, {
            target_id: this.selectedFg.item_id,
            target_sap: this.selectedFg.sap_no
        });

        tbody.innerHTML = '';
        if (res.success && res.data.length > 0) {
            res.data.forEach(log => {
                tbody.innerHTML += `
                    <tr>
                        <td class="text-nowrap text-muted small px-3 py-2">${escapeHtml(log.log_time)}</td>
                        <td class="fw-bold text-dark py-2"><i class="fas fa-user-circle text-secondary me-1"></i> ${escapeHtml(log.username)}</td>
                        <td class="py-2"><span class="badge bg-info bg-opacity-10 text-info border border-info">${escapeHtml(log.action)}</span></td>
                        <td class="small text-truncate px-3 py-2" style="max-width: 300px;" title="${escapeHtml(log.details)}">${escapeHtml(log.details || '-')}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted"><i class="fas fa-history fa-3x mb-3 d-block opacity-25"></i> ไม่มีประวัติการแก้ไข</td></tr>';
        }
    }
};

// =================================================================
// SECTION 6: BOM EXPORT & IMPORT (GLOBAL)
// =================================================================
async function exportAllBoms() {
    Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const result = await fetchAPI(BOM_API_ENDPOINT, 'export_all_boms', 'GET');
        if (result.success && result.data && result.data.length > 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(result.data);
            XLSX.utils.book_append_sheet(wb, ws, "All_BOMs");
            XLSX.writeFile(wb, `BOM_Export_All_${new Date().toISOString().split('T')[0]}.xlsx`);
            Swal.close();
            showToast('Exported successfully!', 'var(--bs-success)');
        } else {
            Swal.close();
            showToast(result.message || 'No BOMs found.', 'var(--bs-warning)');
        }
    } catch(e) {
        Swal.fire('Error', 'Export failed', 'error');
    }
}

async function handleInitialBomImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm("This will create NEW BOMs and SKIP existing ones. Proceed?")) {
        event.target.value = ''; 
        return;
    }
    
    Swal.fire({ title: 'Importing...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData, { type: 'array' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
        
        if (rows.length === 0) throw new Error("Empty file");

        const result = await fetchAPI(BOM_API_ENDPOINT, 'create_initial_boms', 'POST', { rows });
        if (result.success) {
            Swal.fire({ icon: 'success', title: 'Complete', text: result.message });
            BomManagerModule.loadFgs(); 
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        Swal.fire('Error', error.message || 'Import failed', 'error');
    } finally {
        event.target.value = '';
    }
}

async function handleBulkBomImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    Swal.fire({ title: 'Validating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData, { type: 'array' });
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
            sheets[sheetName] = { rows: XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null }) };
        });
        
        const result = await fetchAPI(BOM_API_ENDPOINT, 'validate_bulk_import', 'POST', { sheets });
        Swal.close();

        if (result.success) {
            displayBulkImportPreview(result.data);
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } catch(e) {
        Swal.fire('Error', 'Validation failed', 'error');
    } finally {
        event.target.value = '';
    }
}

function displayBulkImportPreview(validationData) {
    const { summary, sheets } = validationData;
    validatedBulkBomImportData = sheets;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('bomBulkImportPreviewModal'));
    
    if (document.getElementById('bulk-summary-create-count')) document.getElementById('bulk-summary-create-count').textContent = summary.create;
    if (document.getElementById('bulk-summary-overwrite-count')) document.getElementById('bulk-summary-overwrite-count').textContent = summary.overwrite;
    if (document.getElementById('bulk-summary-skipped-count')) document.getElementById('bulk-summary-skipped-count').textContent = summary.skipped;

    const lists = {
        CREATE: document.getElementById('create-preview-list'),
        OVERWRITE: document.getElementById('overwrite-preview-list'),
        SKIPPED: document.getElementById('skipped-preview-accordion')
    };
    for (const key in lists) { if(lists[key]) lists[key].innerHTML = ''; }

    sheets.forEach((sheet, index) => {
        if (sheet.status === 'CREATE' || sheet.status === 'OVERWRITE') {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = `FG SAP: ${sheet.sheet_name}`;
            if(lists[sheet.status]) lists[sheet.status].appendChild(li);
        } else if (sheet.status === 'SKIPPED') {
            const accordionItem = `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading-${index}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}">${escapeHtml(sheet.sheet_name)}</button></h2>
                    <div id="collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#skipped-preview-accordion">
                        <div class="accordion-body"><ul>${sheet.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}</ul></div>
                    </div>
                </div>`;
            if(lists.SKIPPED) lists.SKIPPED.innerHTML += accordionItem;
        }
    });

    const confirmBtn = document.getElementById('confirmBulkImportBtn');
    if(confirmBtn) confirmBtn.disabled = !validationData.isValid;
    modal.show();
}

async function executeBulkBomImport() {
    const validSheets = validatedBulkBomImportData.filter(s => s.status !== 'SKIPPED');
    if (validSheets.length === 0) return showToast('No valid data.', 'var(--bs-warning)');
    
    const btn = document.getElementById('confirmBulkImportBtn');
    toggleButtonState(btn, true, 'Importing...');
    try {
        const result = await fetchAPI(BOM_API_ENDPOINT, 'execute_bulk_import', 'POST', { sheets: validSheets });
        if (result.success) {
            showToast(result.message, 'var(--bs-success)');
            bootstrap.Modal.getInstance(document.getElementById('bomBulkImportPreviewModal'))?.hide();
            BomManagerModule.loadFgs();
        } else showToast(result.message, 'var(--bs-danger)');
    } finally {
        toggleButtonState(btn, false);
    }
}

// =================================================================
// SECTION 7: LINE SCHEDULES TAB FUNCTIONS
// =================================================================
async function loadSchedules() {
    try {
        const result = await fetchAPI(ITEM_MASTER_API, 'read_schedules', 'GET');
        if (result?.success) {
            const tbody = document.getElementById('schedulesTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fas fa-inbox fa-2x mb-2 d-block"></i> No schedules found.</td></tr>`;
                return;
            }
            result.data.forEach(schedule => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="fw-bold text-primary px-3">${escapeHtml(schedule.line || '')}</td>
                    <td>${escapeHtml(schedule.shift_name || '')}</td>
                    <td class="text-center">${escapeHtml(schedule.start_time || '')}</td>
                    <td class="text-center">${escapeHtml(schedule.end_time || '')}</td>
                    <td class="text-center bg-warning bg-opacity-10">${escapeHtml(schedule.planned_break_minutes || '')}</td>
                    <td class="text-center"><span class="badge ${schedule.is_active == 1 ? 'bg-success' : 'bg-danger'} bg-opacity-10 text-${schedule.is_active == 1 ? 'success' : 'danger'} border">${schedule.is_active == 1 ? 'Active' : 'Inactive'}</span></td>
                    <td class="text-center px-3">
                        <button class="btn btn-sm btn-outline-warning border-0" onclick='openScheduleModal(${JSON.stringify(schedule)})' title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteSchedule(${schedule.id})" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {}
}

function openScheduleModal(schedule = null) {
    if (schedule) {
        const form = document.getElementById('editScheduleForm');
        if(form) {
            form.reset();
            for (const key in schedule) {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) {
                    if (input.type === 'checkbox') input.checked = !!schedule[key];
                    else input.value = schedule[key];
                }
            }
        }
        openModal('editScheduleModal');
    } else {
        const addForm = document.getElementById('addScheduleForm');
        if(addForm) addForm.reset();
        openModal('addScheduleModal');
    }
}

async function handleScheduleFormSubmit(event, modalId) {
    event.preventDefault();
    const form = event.target;
    const btnSubmit = form.querySelector('button[type="submit"]');
    toggleButtonState(btnSubmit, true, 'Saving...');
    
    try {
        const payload = Object.fromEntries(new FormData(form).entries());
        payload.is_active = form.querySelector('[name="is_active"]').checked ? 1 : 0;
        const result = await fetchAPI(ITEM_MASTER_API, 'save_schedule', 'POST', payload);
        if (result.success) {
            closeModal(modalId);
            showToast(result.message || 'Schedule saved.', 'var(--bs-success)');
            await loadSchedules();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        toggleButtonState(btnSubmit, false);
    }
}

async function deleteSchedule(id) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        const result = await fetchAPI(ITEM_MASTER_API, 'delete_schedule', 'POST', { id });
        if (result.success) {
            showToast('Schedule deleted.', 'var(--bs-success)');
            await loadSchedules();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    }
}

// =================================================================
// 📥 EXCEL IMPORT & PREVIEW SYSTEM (SMART VALIDATION)
// =================================================================
let parsedImportData = []; 

async function processAndPreviewExcel(file) {
    Swal.fire({ title: 'Analyzing Data...', text: 'กำลังวิเคราะห์และตรวจสอบข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            
            let rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); 

            if (rawData.length === 0) {
                Swal.fire('Error', 'ไม่พบข้อมูลในไฟล์ Excel', 'error');
                return;
            }

            // กวาดหาชื่อคอลัมน์ที่เป็น SAP No
            const keys = Object.keys(rawData[0]);
            const sapColName = keys.find(k => k.toLowerCase().replace(/\s/g, '') === 'sapno') || keys[0]; 

            // ดึง SAP No ทั้งหมดเพื่อส่งไปถาม Database
            let sapNos = rawData.map(r => String(r[sapColName] || '').trim()).filter(s => s !== '');
            sapNos = [...new Set(sapNos)]; // ทำให้ไม่ซ้ำ

            // ยิงถาม Database
            const valRes = await fetchAPI(ITEM_MASTER_API, 'validate_import_saps', 'POST', { sap_nos: sapNos });
            const existingSaps = valRes.existing_saps ? valRes.existing_saps.map(s => String(s).toLowerCase()) : [];

            // ประมวลผลและติดป้ายสถานะ (Tagging)
            let seenSapsInFile = new Set();
            parsedImportData = [];
            let stats = { new: 0, update: 0, duplicate: 0, invalid: 0 };

            rawData.forEach(row => {
                let sap = String(row[sapColName] || '').trim();
                let status = '', statusLabel = '', statusClass = '';

                if (!sap) {
                    status = 'INVALID'; statusLabel = 'Missing SAP'; statusClass = 'bg-danger'; stats.invalid++;
                } else if (seenSapsInFile.has(sap.toLowerCase())) {
                    status = 'DUPLICATE'; statusLabel = 'Duplicate in File'; statusClass = 'bg-secondary'; stats.duplicate++;
                } else {
                    seenSapsInFile.add(sap.toLowerCase());
                    if (existingSaps.includes(sap.toLowerCase())) {
                        status = 'UPDATE'; statusLabel = 'Update (อัปเดต)'; statusClass = 'bg-info text-dark'; stats.update++;
                    } else {
                        status = 'NEW'; statusLabel = 'New (สร้างใหม่)'; statusClass = 'bg-success'; stats.new++;
                    }
                }

                // เก็บสถานะซ่อนไว้ใน Object
                row._status = status; row._statusLabel = statusLabel; row._statusClass = statusClass;
                parsedImportData.push(row);
            });

            Swal.close();
            renderImportPreview(parsedImportData, stats);
        } catch (err) {
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการวิเคราะห์ไฟล์', 'error');
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

function renderImportPreview(data, stats) {
    const thead = document.getElementById('importPreviewThead');
    const tbody = document.getElementById('importPreviewTbody');
    
    // อัปเดต Summary Badges
    document.getElementById('importRowCount').textContent = `${data.length} Rows`;
    const summaryDiv = document.getElementById('importStatsSummary');
    if(summaryDiv) {
        summaryDiv.innerHTML = `
            <span class="badge border border-success text-success bg-success bg-opacity-10 px-3 py-2"><i class="fas fa-plus-circle me-1"></i>สร้างใหม่: ${stats.new}</span>
            <span class="badge border border-info text-info bg-info bg-opacity-10 px-3 py-2"><i class="fas fa-edit me-1"></i>อัปเดต: ${stats.update}</span>
            <span class="badge border border-secondary text-secondary bg-secondary bg-opacity-10 px-3 py-2"><i class="fas fa-copy me-1"></i>ซ้ำในไฟล์: ${stats.duplicate}</span>
            <span class="badge border border-danger text-danger bg-danger bg-opacity-10 px-3 py-2"><i class="fas fa-exclamation-triangle me-1"></i>ไม่มีรหัส: ${stats.invalid}</span>
        `;
    }

    // ดึงหัวคอลัมน์ (ข้ามพวก _status ที่เราซ่อนไว้)
    let columns = [];
    data.forEach(row => {
        Object.keys(row).forEach(key => {
            if (!key.startsWith('_') && !columns.includes(key)) columns.push(key);
        });
    });

    let theadHtml = '<tr class="text-secondary"><th class="px-3 py-2 bg-light text-center sticky-col-left">Action Status</th>';
    columns.forEach(col => { theadHtml += `<th class="px-3 py-2 bg-light">${escapeHtml(col)}</th>`; });
    theadHtml += '</tr>';
    thead.innerHTML = theadHtml;

    let tbodyHtml = '';
    const displayLimit = Math.min(data.length, 100);
    
    for (let i = 0; i < displayLimit; i++) {
        const row = data[i];
        
        // ทำให้แถวที่มีปัญหาดูจางลง
        let trClass = (row._status === 'DUPLICATE' || row._status === 'INVALID') ? 'opacity-50' : '';
        
        tbodyHtml += `<tr class="${trClass}">`;
        // วาดคอลัมน์ Status เป็นอันดับแรก
        tbodyHtml += `<td class="px-3 py-2 text-center sticky-col-left"><span class="badge ${row._statusClass} w-100">${row._statusLabel}</span></td>`;
        
        // วาดข้อมูล Excel
        columns.forEach(col => {
            let val = row[col];
            let extraClass = (col.toLowerCase() === 'sap no' || col.toLowerCase() === 'sap_no') ? 'fw-bold text-primary' : '';
            tbodyHtml += `<td class="px-3 py-1 text-truncate ${extraClass}" style="max-width: 250px;">${escapeHtml(String(val || ''))}</td>`;
        });
        tbodyHtml += '</tr>';
    }

    if (data.length > 100) tbodyHtml += `<tr><td colspan="${columns.length + 1}" class="text-center text-muted py-4 bg-light fw-bold"><i class="fas fa-ellipsis-h fa-2x mb-2 d-block"></i>... แสดงตัวอย่างเพียง 100 รายการแรก ...</td></tr>`;
    
    tbody.innerHTML = tbodyHtml;
    openModal('importPreviewModal');
}

// =================================================================
// SECTION 8: DOMCONTENTLOADED (EVENT BINDINGS)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    const tabLoadedState = {};

    function loadTabData(targetTabId) {
        if (!targetTabId || tabLoadedState[targetTabId]) return;

        switch (targetTabId) {
            case 'locations-pane': 
                if (typeof canManage !== 'undefined' && canManage) loadLocations(); 
                break;
            case 'item-master-pane': 
                fetchItems(1); 
                break;
            case 'bom-manager-pane': 
                BomManagerModule.init(); 
                break;
            case 'lineSchedulesPane': 
                if (typeof canManage !== 'undefined' && canManage) loadSchedules(); 
                break;
        }
        tabLoadedState[targetTabId] = true;
    }

    function showCorrectPagination(activeTabId) {
        document.querySelectorAll('.pagination-footer[data-tab-target]').forEach(p => {
            p.style.display = p.dataset.tabTarget === `#${activeTabId}` ? 'block' : 'none';
        });
    }

    function switchModule(targetId, moduleName, triggerElement) {
        document.querySelectorAll('.module-switch').forEach(el => el.classList.remove('active', 'fw-bold'));
        if(triggerElement) triggerElement.classList.add('active', 'fw-bold');
        
        const labelEl = document.getElementById('currentModuleLabel');
        if(labelEl) labelEl.textContent = moduleName;

        document.querySelectorAll('.module-pane').forEach(pane => pane.classList.remove('active'));
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        document.querySelectorAll('.toolbar-group').forEach(tb => {
            if (tb.classList.contains(targetId)) {
                tb.classList.remove('d-none');
            } else {
                tb.classList.add('d-none');
            }
        });

        loadTabData(targetId);
        showCorrectPagination(targetId);
    }

    document.querySelectorAll('.module-switch').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const moduleName = this.textContent.trim();
            switchModule(targetId, moduleName, this);
        });
    });

    // =========================================================
    // LOCATIONS EVENTS
    // =========================================================
    document.getElementById('locationForm')?.addEventListener('submit', handleLocationFormSubmit);
    document.getElementById('addLocationBtn')?.addEventListener('click', () => openLocationModal());

    // =========================================================
    // ITEM MASTER & ROUTES EVENTS
    // =========================================================
    document.getElementById('addNewItemBtn')?.addEventListener('click', () => openItemModal());
    document.getElementById('itemAndRoutesForm')?.addEventListener('submit', handleItemFormSubmit);
    document.getElementById('materialTypeFilter')?.addEventListener('change', () => fetchItems(1));
    document.getElementById('modalAddNewRouteBtn')?.addEventListener('click', () => addRouteRow());
    
    document.getElementById('toggleInactiveBtn')?.addEventListener('click', (event) => {
        event.currentTarget.classList.toggle('active');
        fetchItems(1);
    });

    document.getElementById('exportItemsBtn')?.addEventListener('click', exportItemsMaster);

    // 🌟 ITEM MASTER IMPORT EVENTS 🌟
    document.getElementById('importItemsBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('itemImportFile');
        fileInput.value = '';
        fileInput.click(); 
    });

    document.getElementById('itemImportFile')?.addEventListener('change', function(e) {
        if (e.target.files.length > 0) processAndPreviewExcel(e.target.files[0]);
    });

    document.getElementById('btnConfirmImport')?.addEventListener('click', async function() {
        // กรองเอาเฉพาะ NEW และ UPDATE ทิ้งข้อมูลขยะ
        const validDataToImport = parsedImportData.filter(r => r._status === 'NEW' || r._status === 'UPDATE');
        
        if (validDataToImport.length === 0) {
            Swal.fire('Warning', 'ไม่มีข้อมูลที่สามารถนำเข้าได้ (อาจเป็นข้อมูลซ้ำหรือไม่มีรหัส SAP)', 'warning');
            return;
        }

        const btn = this;
        toggleButtonState(btn, true, 'Importing...');
        
        try {
            const res = await fetchAPI(ITEM_MASTER_API, 'unified_bulk_import', 'POST', validDataToImport);
            
            if (res.success) {
                Swal.fire('Success!', res.message, 'success').then(() => {
                    bootstrap.Modal.getInstance(document.getElementById('importPreviewModal')).hide();
                    window.location.reload(); 
                });
            } else {
                Swal.fire('Error', res.message, 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        } finally {
            toggleButtonState(btn, false);
            btn.innerHTML = '<i class="fas fa-cloud-upload-alt me-1"></i> Confirm Import';
        }
    });

    // =========================================================
    // BOM MANAGER EVENTS (Global Actions)
    // =========================================================
    document.getElementById('exportAllConsolidatedBtn')?.addEventListener('click', exportAllBoms);
    
    document.getElementById('importUpdateBomsBtn')?.addEventListener('click', () => {
        const fileInput = document.getElementById('bulkUpdateImportFile');
        if(fileInput) fileInput.click();
    });
    document.getElementById('bulkUpdateImportFile')?.addEventListener('change', handleBulkBomImport);
    
    document.getElementById('importCreateBomsBtn')?.addEventListener('click', () => {
        const fileInput = document.getElementById('initialCreateImportFile');
        if(fileInput) fileInput.click();
    });
    document.getElementById('initialCreateImportFile')?.addEventListener('change', handleInitialBomImport);
    
    document.getElementById('confirmBulkImportBtn')?.addEventListener('click', executeBulkBomImport);

    // =========================================================
    // LINE SCHEDULES EVENTS
    // =========================================================
    document.getElementById('addScheduleForm')?.addEventListener('submit', (e) => handleScheduleFormSubmit(e, 'addScheduleModal'));
    document.getElementById('editScheduleForm')?.addEventListener('submit', (e) => handleScheduleFormSubmit(e, 'editScheduleModal'));

    // =========================================================
    // INITIALIZATION
    // =========================================================
    setupItemMasterAutocomplete();
    setupModelFilterAutocomplete();

    const urlParams = new URLSearchParams(window.location.search);
    const tabToOpen = urlParams.get('tab');
    
    if (tabToOpen) {
        const targetElement = document.querySelector(`.module-switch[data-target="${tabToOpen}-pane"]`);
        if (targetElement) {
            switchModule(`${tabToOpen}-pane`, targetElement.textContent.trim(), targetElement);
        } else {
            loadTabData('item-master-pane');
        }
    } else {
        const defaultModule = document.querySelector('.module-switch.active');
        if (defaultModule) {
            switchModule(defaultModule.getAttribute('data-target'), defaultModule.textContent.trim(), defaultModule);
        } else {
            loadTabData('item-master-pane');
        }
    }
});