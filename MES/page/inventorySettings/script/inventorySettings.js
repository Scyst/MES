"use strict";

// =================================================================
// SECTION 1: API & GLOBAL VARIABLES
// =================================================================
const LOCATIONS_API = 'api/locationsManage.php';
const ITEM_MASTER_API = 'api/itemMasterManage.php';
const BOM_API_ENDPOINT = 'api/bomManager.php';

// --- Global Variables ---
let allItems = [];
let currentPage = 1;
const ROWS_PER_PAGE = 50;
let selectedItemId = null;

// Variables from paraManage.js
let allSchedules = [], allMissingParams = [], allBomFgs = [];
let bomCurrentPage = 1;
let currentEditingBom = null;
let manageBomModal;
let validatedBomImportData = [];
let validatedBulkBomImportData = [];

// =================================================================
// SECTION 2: CORE & SHARED FUNCTIONS
// =================================================================
async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) url += `&${new URLSearchParams(params).toString()}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
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
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
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
// SECTION 3: TAB-SPECIFIC FUNCTIONS
// =================================================================

// --- LOCATIONS TAB FUNCTIONS ---
async function loadLocations() {
    showSpinner();
    try {
        const result = await sendRequest(LOCATIONS_API, 'get_locations', 'GET');
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(location => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to edit';
                
                tr.innerHTML = `
                    <td>${location.location_name}</td>
                    <td>${location.location_description || ''}</td>
                    <td>${location.production_line || '<span class="text-muted">N/A</span>'}</td>
                    <td>${location.location_type || 'WIP'}</td> 
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
    } finally {
        hideSpinner();
    }
}

async function openLocationModal(location = null) {
    const form = document.getElementById('locationForm');
    form.reset();
    document.getElementById('location_id').value = '0';
    const modal = new bootstrap.Modal(document.getElementById('locationModal'));
    const modalTitle = document.getElementById('locationModalLabel');
    
    const lineSelect = document.getElementById('location_production_line');
    lineSelect.innerHTML = '<option value="">-- Loading Lines... --</option>';
    
    try {
        const linesResult = await sendRequest(ITEM_MASTER_API, 'get_lines', 'GET');
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
        if (location.production_line) {
            lineSelect.value = location.production_line;
        }
        document.getElementById('location_type').value = location.location_type || 'WIP'; 
    } else {
        modalTitle.textContent = 'Add New Location';
        document.getElementById('location_type').value = 'WIP'; 
    }
    
    modal.show();
}

async function handleLocationFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.is_active = document.getElementById('location_is_active').checked ? 1 : 0;
    
    const result = await sendRequest(LOCATIONS_API, 'save_location', 'POST', data);
    
    if (result.success) {
        showToast(result.message, 'var(--bs-success)');
        closeModal('locationModal');
        await loadLocations();
    } else {
        showToast(result.message, 'var(--bs-danger)');
    }
}

// --- ITEM MASTER & ROUTES TAB FUNCTIONS ---
async function fetchItems(page = 1) {
    showSpinner();
    const searchTerm = document.getElementById('itemMasterSearch').value;
    const showInactive = document.getElementById('toggleInactiveBtn').classList.contains('active');
    const selectedModel = document.getElementById('modelFilterValue').value;
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
            page, 
            search: searchTerm, 
            show_inactive: showInactive,
            filter_model: selectedModel
        });
        if (result.success) {
            renderItemsTable(result.data, result.total, page);
        } else {
            document.getElementById('itemsTableBody').innerHTML = `<tr><td colspan="11" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
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
    if (!searchInput) return;
    searchInput.addEventListener('input', () => {
        clearTimeout(window.debounceTimer);
        valueInput.value = searchInput.value;
        window.debounceTimer = setTimeout(() => fetchItems(1), 500);
    });
}

function renderItemsTable(items, totalItems, page) {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">No items found.</td></tr>`; 
        renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.itemId = item.item_id;

        const formatCurrency = (value) => {
            const num = parseFloat(value || 0);
            return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
        };

        tr.innerHTML = `
            <td><span class="fw-bold">${item.sap_no}</span> ${!item.is_active ? '<span class="badge bg-danger ms-2">Inactive</span>' : ''}</td>
            <td>${item.part_no}</td>
            <td class="text-center">${item.sku || '-'}</td>
            <td>${item.used_in_models || ''}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${item.route_speed_range || 'N/A'}</td>
            <td class="text-center">${parseFloat(item.min_stock || 0).toFixed(3)}</td>
            <td class="text-center">${parseFloat(item.max_stock || 0).toFixed(3)}</td>
            <td class="text-end">${formatCurrency(item.Cost_Total)}</td>
            <td class="text-end">${formatCurrency(item.StandardPrice)}</td>
            <td class="text-end">${item.created_at}</td>
        `;

        if (item.is_active != 1) {
            tr.classList.add('table-secondary', 'text-muted');
        }

        tr.addEventListener('click', () => {
            openItemModal(item);
        });

        tbody.appendChild(tr);
    });
    
    renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
}

async function selectItem(itemId, selectedRow) {
    if (selectedItemId === itemId) {
        selectedItemId = null;
        document.getElementById('selectedItemDisplay').textContent = 'Select an item to view its routes';
        document.getElementById('addNewRouteBtn').disabled = true;
        selectedRow.classList.remove('table-info');
        renderRoutesTable([]);
        return;
    }
    selectedItemId = itemId;
    document.querySelectorAll('#itemsTableBody tr.table-info').forEach(row => row.classList.remove('table-info'));
    selectedRow.classList.add('table-info');
    const sapNo = selectedRow.cells[0].textContent.trim();
    document.getElementById('selectedItemDisplay').textContent = `Routes for: ${sapNo}`;
    document.getElementById('addNewRouteBtn').disabled = false;
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'get_item_routes', 'GET', null, { item_id: itemId });
        renderRoutesTable(result.success ? result.data : []);
    } finally {
        hideSpinner();
    }
}

function renderRoutesTable(routes) {
    const tbody = document.getElementById('routesTableBody');
    tbody.innerHTML = '';
    if (routes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No manufacturing routes found. Click "Add" to start.</td></tr>`;
        return;
    }
    routes.forEach(route => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${route.line}</td>
            <td>${route.model}</td>
            <td>${route.planned_output}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick='openRouteModal(${JSON.stringify(route)})'>Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoute(${route.route_id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openRouteModal(route = null) {
    const form = document.getElementById('routeForm');
    form.reset();
    const modal = new bootstrap.Modal(document.getElementById('routeModal'));
    document.getElementById('route_item_id').value = selectedItemId;
    if (route) {
        document.getElementById('routeModalLabel').textContent = 'Edit Manufacturing Route';
        document.getElementById('route_id').value = route.route_id;
        document.getElementById('route_line').value = route.line;
        document.getElementById('route_model').value = route.model;
        document.getElementById('route_planned_output').value = route.planned_output;
    } else {
        document.getElementById('routeModalLabel').textContent = 'Add New Manufacturing Route';
        document.getElementById('route_id').value = '0';
    }
    modal.show();
}

async function handleRouteFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const result = await sendRequest(ITEM_MASTER_API, 'save_route', 'POST', data);
    if (result.success) {
        closeModal('routeModal');
        const selectedRow = document.querySelector(`#itemsTableBody tr[data-item-id="${selectedItemId}"]`);
        if (selectedRow) await selectItem(selectedItemId, selectedRow);
        showToast(result.message, 'var(--bs-success)');
    } else {
        showToast(result.message, 'var(--bs-danger)');
    }
}

async function deleteRoute(routeId) {
    if (confirm('Are you sure you want to delete this route?')) {
        const result = await sendRequest(ITEM_MASTER_API, 'delete_route', 'POST', { route_id: routeId });
        if (result.success) {
            const selectedRow = document.querySelector(`#itemsTableBody tr[data-item-id="${selectedItemId}"]`);
            if (selectedRow) await selectItem(selectedItemId, selectedRow);
            showToast(result.message, 'var(--bs-success)');
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    }
}

async function openItemModal(item = null) {
    const form = document.getElementById('itemAndRoutesForm');
    form.reset();
    const modal = new bootstrap.Modal(document.getElementById('itemModal'));
    const modalTitle = document.getElementById('itemModalLabel');
    const routesTbody = document.getElementById('modalRoutesTableBody');
    if (routesTbody) routesTbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading routes...</td></tr>';
    
    if(document.getElementById('deleteItemBtn')) document.getElementById('deleteItemBtn').style.display = 'none';

    // Reset Tab to first page
    const triggerEl = document.querySelector('#itemFormTabs button[data-bs-target="#basic-pane"]');
    if (triggerEl) bootstrap.Tab.getInstance(triggerEl)?.show() || new bootstrap.Tab(triggerEl).show();

    // Helper Function สำหรับใส่ค่าตัวเลขให้สวยงาม
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
        
        // Basic Info
        document.getElementById('sap_no').value = item.sap_no || '';
        document.getElementById('part_no').value = item.part_no || '';
        document.getElementById('sku').value = item.sku || '';
        document.getElementById('material_type').value = item.material_type || 'FG';
        document.getElementById('part_description').value = item.part_description || '';
        
        setInputValue('planned_output', item.planned_output);
        setInputValue('min_stock', item.min_stock);
        setInputValue('max_stock', item.max_stock);
        document.getElementById('is_active').checked = (item.is_active == 1);
        
        // Logistics
        setInputValue('CTN', item.CTN);
        setInputValue('net_weight', item.net_weight);
        setInputValue('gross_weight', item.gross_weight);
        setInputValue('cbm', item.cbm);
        document.getElementById('invoice_product_type').value = item.invoice_product_type || '';
        document.getElementById('invoice_description').value = item.invoice_description || '';

        // Costing
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

        if(document.getElementById('deleteItemBtn')) document.getElementById('deleteItemBtn').style.display = 'inline-block';

        const result = await sendRequest(ITEM_MASTER_API, 'get_item_routes', 'GET', null, { item_id: item.item_id });
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
    
    modal.show();
}

function renderRoutesInModal(routes) {
    const tbody = document.getElementById('modalRoutesTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (routes.length === 0) {
        tbody.innerHTML = `<tr class="no-routes-row"><td colspan="4" class="text-center text-muted">No routes defined. Click 'Add New Route' to begin.</td></tr>`;
    } else {
        routes.forEach(route => addRouteRow(route));
    }
}

function addRouteRow(route = {}) {
    const tbody = document.getElementById('modalRoutesTableBody');
    if(!tbody) return;
    
    const noRoutesRow = tbody.querySelector('.no-routes-row');
    if (noRoutesRow) noRoutesRow.remove();
    
    const tr = document.createElement('tr');
    tr.dataset.routeId = route.route_id || '0'; 
    tr.dataset.status = 'existing';
    if (!route.route_id) tr.dataset.status = 'new';
    
    tr.innerHTML = `
        <td><input type="text" class="form-control form-control-sm" name="route_line" value="${route.line || ''}" required></td>
        <td><input type="text" class="form-control form-control-sm" name="route_model" value="${route.model || ''}" required></td>
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
    const form = document.getElementById('itemAndRoutesForm');
    const btnSave = document.getElementById('btnSaveItem');
    
    if (btnSave && btnSave.disabled) return;
    
    try {
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        const itemDetails = {
            item_id: form.querySelector('#item_id').value,
            sap_no: form.querySelector('#sap_no').value,
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

        const payload = {
            item_details: itemDetails,
            routes_data: routesData
        };
        
        const result = await sendRequest(ITEM_MASTER_API, 'save_item_and_routes', 'POST', payload);
        
        if (result.success) {
            closeModal('itemModal');
            await fetchItems(currentPage);
            showToast(result.message, 'var(--bs-success)');
            if (typeof fetchAlerts === 'function') fetchAlerts();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

async function deleteItem() {
    const itemId = document.getElementById('item_id').value;
    const sapNo = document.getElementById('sap_no').value;
    
    if (!itemId || itemId === '0') {
        showToast("Cannot delete an unsaved item.", 'var(--bs-warning)');
        return;
    }

    if (confirm(`Are you sure you want to deactivate item SAP: ${sapNo}? This action cannot be undone directly.`)) {
        const result = await sendRequest(ITEM_MASTER_API, 'delete_item', 'POST', { item_id: itemId });
        
        if (result.success) {
            closeModal('itemModal');
            await fetchItems(currentPage);
            showToast(result.message, 'var(--bs-success)');
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    }
}


// --- BOM MANAGER TAB FUNCTIONS (from paraManage.js) ---
function initializeBomManager() {
    const searchInput = document.getElementById('bomSearchInput');
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    if(document.getElementById('manageBomModal')) manageBomModal = new bootstrap.Modal(document.getElementById('manageBomModal'));
    
    async function loadAndRenderBomFgTable() {
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'get_all_fgs_with_bom', 'GET');
            if (result.success) {
                allBomFgs = result.data;
                filterAndRenderBomFgTable();
            }
        } finally { hideSpinner(); }
    }

    function filterAndRenderBomFgTable() {
        bomCurrentPage = 1;
        const filteredData = getFilteredBoms(searchInput ? searchInput.value : '');
        renderBomFgTable(filteredData);
    }

    searchInput?.addEventListener('input', () => {
        clearTimeout(window.debounceTimer);
        window.debounceTimer = setTimeout(filterAndRenderBomFgTable, 300);
    });

    loadAndRenderBomFgTable();
}

function initializeCreateBomModal() {
    const modalEl = document.getElementById('createBomModal');
    if (!modalEl) return;

    const searchInput = document.getElementById('fg_item_search');
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;

    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        if (value.length < 2) return;

        debounce = setTimeout(async () => {
            const result = await sendRequest(BOM_API_ENDPOINT, 'get_fgs_without_bom', 'GET', null, { search: value });
            
            if (result.success) {
                resultsWrapper.innerHTML = '';
                if (result.data.length > 0) {
                    result.data.slice(0, 10).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                        
                        resultItem.addEventListener('click', () => {
                            const createModalInstance = bootstrap.Modal.getInstance(modalEl);
                            createModalInstance.hide();
                            
                            const fgDataForModal = {
                                fg_item_id: item.item_id,
                                fg_sap_no: item.sap_no,
                                fg_part_no: item.part_no,
                                fg_part_description: item.part_description,
                                line: null, 
                                model: null,
                                updated_by: null,
                                updated_at: null
                            };
                            manageBom(fgDataForModal);
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                } else {
                    resultsWrapper.innerHTML = `<div class="autocomplete-item text-muted">No items found or they already have a BOM.</div>`;
                }
                resultsWrapper.style.display = 'block';
            }
        }, 300);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
        searchInput.value = '';
        resultsWrapper.innerHTML = '';
        resultsWrapper.style.display = 'none';
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

function setupBomComponentAutocomplete() {
    const searchInput = document.getElementById('modalComponentSearch');
    if (!searchInput) return;

    let resultsWrapper = searchInput.parentNode.querySelector('.autocomplete-results');
    if (!resultsWrapper) {
        resultsWrapper = document.createElement('div');
        resultsWrapper.className = 'autocomplete-results';
        searchInput.parentNode.appendChild(resultsWrapper);
    }

    let componentDebounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(componentDebounce);
        const value = searchInput.value.toLowerCase();
        document.getElementById('modalComponentItemId').value = '';
        resultsWrapper.innerHTML = '';
        if (value.length < 2) return;

        componentDebounce = setTimeout(async () => {
            const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
            
            if (result.success) {
                resultsWrapper.innerHTML = '';
                if(result.data.length > 0) {
                    result.data.slice(0, 10).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                        
                        resultItem.addEventListener('click', () => {
                            searchInput.value = `${item.sap_no} | ${item.part_no}`;
                            document.getElementById('modalComponentItemId').value = item.item_id;
                            resultsWrapper.innerHTML = '';
                            resultsWrapper.style.display = 'none';
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                } else {
                     resultsWrapper.innerHTML = `<div class="autocomplete-item text-muted">No items found.</div>`;
                }
                resultsWrapper.style.display = 'block';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });

    const modalAddComponentForm = document.getElementById('modalAddComponentForm');
    if (modalAddComponentForm) {
        modalAddComponentForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 

            const data = {
                fg_item_id: document.getElementById('modalSelectedFgItemId').value,
                component_item_id: document.getElementById('modalComponentItemId').value,
                quantity_required: document.getElementById('modalQuantityRequired').value
            };

            if (!data.component_item_id) {
                showToast('Please select a valid component from the search results.', 'var(--bs-warning)');
                return;
            }

            const result = await sendRequest(BOM_API_ENDPOINT, 'add_bom_component', 'POST', data);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            
            if (result.success) {
                if (currentEditingBom) {
                    await loadBomForModal(currentEditingBom); 
                }
                e.target.reset();
                document.getElementById('modalComponentSearch').focus();
            }
        });
    }
}

function getFilteredBoms(searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) return allBomFgs;
    return allBomFgs.filter(fg =>
        (fg.fg_sap_no && String(fg.fg_sap_no).toLowerCase().includes(term)) ||
        (fg.fg_part_no && fg.fg_part_no.toLowerCase().includes(term)) ||
        (fg.fg_part_description && fg.fg_part_description.toLowerCase().includes(term))
    );
}

function renderBomFgTable(fgData) {
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    if(!fgListTableBody) return;
    fgListTableBody.innerHTML = '';
    const start = (bomCurrentPage - 1) * ROWS_PER_PAGE;
    const pageData = fgData.slice(start, start + ROWS_PER_PAGE);

    if (pageData.length > 0) {
        pageData.forEach(fg => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.addEventListener('click', (event) => {
                if (event.target.closest('.form-check-input')) return;
                manageBom(fg);
            });
            tr.innerHTML = `
                <td class="text-center"><input class="form-check-input bom-row-checkbox" type="checkbox" value='${JSON.stringify(fg)}'></td>
                <td>${fg.fg_sap_no || 'N/A'}</td>
                <td>${fg.fg_part_no || ''}</td>
                <td>${fg.fg_part_description || ''}</td>
                <td>${fg.updated_by || 'N/A'}</td>
                <td class="text-end">${fg.updated_at || 'N/A'}</td>
            `;
            fgListTableBody.appendChild(tr);
        });
    } else {
        fgListTableBody.innerHTML = `<tr><td colspan="6" class="text-center">No BOMs found.</td></tr>`;
    }
    renderPagination('bomPaginationControls', fgData.length, bomCurrentPage, ROWS_PER_PAGE, (page) => {
        bomCurrentPage = page;
        renderBomFgTable(getFilteredBoms(document.getElementById('bomSearchInput').value));
    });
}

function manageBom(fg) {
    currentEditingBom = fg;
    if(manageBomModal) manageBomModal.show();
    loadBomForModal(fg);
};

function initializeManageBomModalListeners() {
    const modalBomTableBody = document.getElementById('modalBomTableBody');
    const deleteBomFromModalBtn = document.getElementById('deleteBomFromModalBtn');
    let bomDebounceTimer;

    if (!modalBomTableBody) return;

    modalBomTableBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const bomId = button.dataset.compId;

        if (action === 'delete-comp') {
            if (confirm('Are you sure you want to delete this component?')) {
                showSpinner();
                try {
                    const result = await sendRequest(BOM_API_ENDPOINT, 'delete_bom_component', 'POST', { bom_id: bomId });
                    showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                    if (result.success && currentEditingBom) {
                        await loadBomForModal(currentEditingBom);
                    }
                } finally {
                    hideSpinner();
                }
            }
        } else if (action === 'edit-comp') {
            const input = button.closest('tr').querySelector('.bom-quantity-input');
            input.readOnly = !input.readOnly;
            input.classList.toggle('bom-input-readonly');
            if (!input.readOnly) {
                button.textContent = 'Done';
                button.classList.replace('btn-warning', 'btn-success');
                input.focus();
                input.select();
            } else {
                button.textContent = 'Edit';
                button.classList.replace('btn-success', 'btn-warning');
            }
        }
    });

    modalBomTableBody.addEventListener('input', (e) => {
        const input = e.target;
        if (!input.classList.contains('bom-quantity-input') || input.readOnly) {
            return;
        }
        
        clearTimeout(bomDebounceTimer);
        const bomId = input.dataset.bomId;
        const newQuantity = input.value;

        if (!bomId || newQuantity === '' || newQuantity <= 0) {
            return;
        }

        bomDebounceTimer = setTimeout(async () => {
            const result = await sendRequest(BOM_API_ENDPOINT, 'update_bom_component', 'POST', {
                bom_id: bomId,
                quantity_required: newQuantity
            });

            if (!result.success) {
                showToast(result.message, 'var(--bs-danger)');
                if (currentEditingBom) {
                    await loadBomForModal(currentEditingBom);
                }
            } else {
                showToast('Quantity saved!', 'var(--bs-success)', 1500);
            }
        }, 800);
    });

    if(deleteBomFromModalBtn) {
        deleteBomFromModalBtn.addEventListener('click', async () => {
             if (!currentEditingBom || !currentEditingBom.fg_item_id) return;
             if (confirm(`Are you sure you want to DELETE the entire BOM for ${currentEditingBom.fg_part_no}?`)) {
                 showSpinner();
                 try {
                     const result = await sendRequest(BOM_API_ENDPOINT, 'delete_full_bom', 'POST', {
                         fg_item_id: currentEditingBom.fg_item_id
                     });
                     showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                     if (result.success) {
                         if(manageBomModal) manageBomModal.hide();
                         await initializeBomManager();
                     }
                 } finally {
                     hideSpinner();
                 }
             }
        });
    }
}

async function loadBomForModal(fg) {
    showSpinner();
    try {
        const modalTitle = document.getElementById('bomModalTitle');
        const modalBomTableBody = document.getElementById('modalBomTableBody');
        
        if(modalTitle) modalTitle.textContent = `Managing BOM for: ${fg.fg_part_no || fg.fg_sap_no}`;
        if(document.getElementById('modalSelectedFgItemId')) document.getElementById('modalSelectedFgItemId').value = fg.fg_item_id;
        
        if(modalBomTableBody) modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading components...</td></tr>';
        
        const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_item_id: fg.fg_item_id });

        if(modalBomTableBody) {
            modalBomTableBody.innerHTML = '';
            if (bomResult.success && bomResult.data.length > 0) {
                bomResult.data.forEach(comp => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${comp.component_sap_no}</td> 
                        <td>${comp.part_description || ''}</td>
                        <td class="text-center">
                            <input 
                                type="number" 
                                class="form-control form-control-sm text-center bom-quantity-input bom-input-readonly" 
                                value="${parseFloat(comp.quantity_required)}" 
                                data-bom-id="${comp.bom_id}" 
                                min="0.0001" 
                                step="any" 
                                readonly>
                        </td>
                        <td class="text-center">
                            <button class="btn btn-warning btn-sm" data-action="edit-comp">Edit</button>
                            <button class="btn btn-danger btn-sm" data-action="delete-comp" data-comp-id="${comp.bom_id}">Delete</button>
                        </td>
                    `;
                    modalBomTableBody.appendChild(tr);
                });
            } else {
                modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No components found. Use the form below to add one.</td></tr>';
            }
        }
    } finally {
        hideSpinner();
    }
}

async function exportAllBoms() {
    showToast('Exporting all BOMs (Consolidated)...', 'var(--bs-info)');
    showSpinner();
    try {
        const result = await sendRequest(BOM_API_ENDPOINT, 'export_all_boms', 'GET');
        if (result.success && result.data && result.data.length > 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(result.data);
            XLSX.utils.book_append_sheet(wb, ws, "All_BOMs");
            const fileName = `BOM_Export_All_Consolidated_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            showToast('All BOMs exported successfully!', 'var(--bs-success)');
        } else {
            showToast(result.message || 'No BOMs found to export.', 'var(--bs-warning)');
        }
    } finally {
        hideSpinner();
    }
}

async function exportSelectedBoms() {
    const selectedCheckboxes = document.querySelectorAll('.bom-row-checkbox:checked');
    const bomsToExport = Array.from(selectedCheckboxes).map(cb => JSON.parse(cb.value));
    if (bomsToExport.length === 0) {
        showToast('Please select at least one BOM to export.', 'var(--bs-warning)');
        return;
    }

    showToast(`Exporting ${bomsToExport.length} selected BOM(s)...`, 'var(--bs-info)');
    showSpinner();
    try {
        const result = await sendRequest(BOM_API_ENDPOINT, 'export_selected_boms', 'POST', { boms: bomsToExport });
        if (result.success && Object.keys(result.data).length > 0) {
            const wb = XLSX.utils.book_new();
            for (const fgSapNo in result.data) {
                const sheetData = result.data[fgSapNo].map(row => ({
                    LINE: row.LINE,
                    MODEL: row.MODEL,
                    COMPONENT_SAP_NO: row.COMPONENT_SAP_NO,
                    QUANTITY_REQUIRED: row.QUANTITY_REQUIRED
                }));
                const ws = XLSX.utils.json_to_sheet(sheetData);
                const safeSheetName = fgSapNo.replace(/[\*:\/\\?\[\]]/g, "_").substring(0, 31);
                XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
            }
            const fileName = `BOM_Export_Selected_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            showToast('Selected BOMs exported successfully!', 'var(--bs-success)');
        } else {
            showToast(result.message || 'Could not export selected BOMs.', 'var(--bs-warning)');
        }
    } finally {
        hideSpinner();
    }
}

async function handleBulkBomImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    showSpinner();
    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData);
        const sheets = {};
        workbook.SheetNames.forEach(sheetName => {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
            sheets[sheetName] = { rows };
        });
        const result = await sendRequest(BOM_API_ENDPOINT, 'validate_bulk_import', 'POST', { sheets });
        if (result.success) {
            displayBulkImportPreview(result.data);
        } else {
            showToast(result.message || 'Validation failed.', 'var(--bs-danger)');
        }
    } catch (error) {
        showToast('Failed to process file.', 'var(--bs-danger)');
        console.error(error);
    } finally {
        event.target.value = '';
        hideSpinner();
    }
}

function displayBulkImportPreview(validationData) {
    const { summary, sheets } = validationData;
    validatedBulkBomImportData = sheets;
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('bomBulkImportPreviewModal'));
    
    document.getElementById('bulk-summary-create-count').textContent = summary.create;
    document.getElementById('bulk-summary-overwrite-count').textContent = summary.overwrite;
    document.getElementById('bulk-summary-skipped-count').textContent = summary.skipped;
    document.getElementById('create-tab-count').textContent = summary.create;
    document.getElementById('overwrite-tab-count').textContent = summary.overwrite;
    document.getElementById('skipped-tab-count').textContent = summary.skipped;

    const lists = {
        CREATE: document.getElementById('create-preview-list'),
        OVERWRITE: document.getElementById('overwrite-preview-list'),
        SKIPPED: document.getElementById('skipped-preview-accordion')
    };
    for (const key in lists) { lists[key].innerHTML = ''; }

    sheets.forEach((sheet, index) => {
        if (sheet.status === 'CREATE' || sheet.status === 'OVERWRITE') {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = `FG SAP: ${sheet.sheet_name}`;
            lists[sheet.status].appendChild(li);
        } else if (sheet.status === 'SKIPPED') {
            const accordionItem = `
                <div class="accordion-item">
                    <h2 class="accordion-header" id="heading-${index}"><button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}">${sheet.sheet_name}</button></h2>
                    <div id="collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#skipped-preview-accordion">
                        <div class="accordion-body"><ul>${sheet.errors.map(err => `<li>${err}</li>`).join('')}</ul></div>
                    </div>
                </div>`;
            lists.SKIPPED.innerHTML += accordionItem;
        }
    });

    if (lists.CREATE.children.length === 0) lists.CREATE.innerHTML = '<li class="list-group-item text-muted">No new BOMs to create.</li>';
    if (lists.OVERWRITE.children.length === 0) lists.OVERWRITE.innerHTML = '<li class="list-group-item text-muted">No existing BOMs to overwrite.</li>';
    if (lists.SKIPPED.children.length === 0) lists.SKIPPED.innerHTML = '<div class="p-3 text-muted">No sheets were skipped.</div>';

    document.getElementById('confirmBulkImportBtn').disabled = !validationData.isValid;
    modal.show();
}

async function executeBulkBomImport() {
    const validSheets = validatedBulkBomImportData.filter(s => s.status !== 'SKIPPED');
    if (validSheets.length === 0) {
        showToast('No valid data to import.', 'var(--bs-warning)');
        return;
    }
    showSpinner();
    const modal = bootstrap.Modal.getInstance(document.getElementById('bomBulkImportPreviewModal'));
    try {
        const result = await sendRequest(BOM_API_ENDPOINT, 'execute_bulk_import', 'POST', { sheets: validSheets });
        if (result.success) {
            showToast(result.message, 'var(--bs-success)');
            if(modal) modal.hide();
            await initializeBomManager();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        hideSpinner();
    }
}

async function handleInitialBomImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm("This action will only create NEW BOMs and will SKIP any existing BOMs. Are you sure?")) {
        event.target.value = '';
        return;
    }
    showSpinner();
    try {
        const fileData = await file.arrayBuffer();
        const workbook = XLSX.read(fileData);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
        if (rows.length === 0) {
            showToast('The selected file is empty.', 'var(--bs-warning)');
            return;
        }
        const result = await sendRequest(BOM_API_ENDPOINT, 'create_initial_boms', 'POST', { rows });
        if (result.success) {
            showToast(result.message, 'var(--bs-success)');
            await initializeBomManager();
        } else {
            showToast(result.message || 'Failed to create initial BOMs.', 'var(--bs-danger)');
        }
    } catch (error) {
        showToast('An error occurred while processing the file.', 'var(--bs-danger)');
        console.error(error);
    } finally {
        event.target.value = '';
        hideSpinner();
    }
}

// --- LINE SCHEDULES TAB FUNCTIONS ---
async function loadSchedules() {
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'read_schedules', 'GET');
        if (result?.success) {
            const tbody = document.getElementById('schedulesTableBody');
            if(!tbody) return;
            tbody.innerHTML = '';
            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center">No schedules found.</td></tr>`;
                return;
            }
            result.data.forEach(schedule => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${schedule.line || ''}</td>
                    <td>${schedule.shift_name || ''}</td>
                    <td>${schedule.start_time || ''}</td>
                    <td>${schedule.end_time || ''}</td>
                    <td>${schedule.planned_break_minutes || ''}</td>
                    <td><span class="badge ${schedule.is_active == 1 ? 'bg-success' : 'bg-secondary'}">${schedule.is_active == 1 ? 'Active' : 'Inactive'}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-warning" onclick='openScheduleModal(${JSON.stringify(schedule)})'>Edit</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${schedule.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } finally { hideSpinner(); }
}

function openScheduleModal(schedule = null) {
    if (schedule) {
        openModal('editScheduleModal');
        const form = document.getElementById('editScheduleForm');
        for (const key in schedule) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') input.checked = !!schedule[key];
                else input.value = schedule[key];
            }
        }
    } else {
        document.getElementById('addScheduleForm').reset();
        openModal('addScheduleModal');
    }
}

async function deleteSchedule(id) {
    if (confirm('Are you sure you want to delete this schedule?')) {
        const result = await sendRequest(ITEM_MASTER_API, 'delete_schedule', 'POST', { id });
        if (result.success) {
            showToast('Schedule deleted.', 'var(--bs-success)');
            await loadSchedules();
        }
    }
}

// --- HEALTH CHECK TAB FUNCTIONS ---
async function loadHealthCheckData() {
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'health_check_parameters', 'GET');
        const listBody = document.getElementById('missingParamsList');
        if(!listBody) return;
        listBody.innerHTML = '';
        if (result?.success) {
            if (result.data.length === 0) {
                listBody.innerHTML = `<tr><td colspan="4" class="text-center text-success">Excellent! No missing data found.</td></tr>`;
                return;
            }
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.line || 'N/A'}</td>
                    <td>${item.model || 'N/A'}</td>
                    <td>${item.part_no || ''}</td>
                    <td class="text-center"><button class="btn btn-sm btn-primary" onclick="jumpToItemMaster('${item.sap_no}')">Go to Item Master</button></td>
                `;
                listBody.appendChild(tr);
            });
        }
    } finally { hideSpinner(); }
}

function jumpToItemMaster(sapNo) {
    const tabElement = document.getElementById('item-master-tab');
    if(!tabElement) return;
    const tab = new bootstrap.Tab(tabElement);
    tab.show();
    setTimeout(() => {
        const searchInput = document.getElementById('itemMasterSearch');
        if (searchInput) {
            searchInput.value = sapNo;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 150);
}

// =================================================================
// SECTION 4: DOMCONTENTLOADED (ตัวควบคุมหลัก)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- 4.1 Internal State & Tab Management ---
    const tabLoadedState = {};

    function loadTabData(targetTabId) {
        if (!targetTabId || tabLoadedState[targetTabId]) return;

        switch (targetTabId) {
            case '#locations-pane': 
                loadLocations(); 
                break;
            case '#item-master-pane': 
                fetchItems(1); 
                break;
            case '#bom-manager-pane': 
                initializeBomManager(); 
                initializeCreateBomModal(); 
                break;
            case '#lineSchedulesPane': 
                if (typeof canManage !== 'undefined' && canManage) loadSchedules(); 
                break;
            case '#healthCheckPane': 
                if (typeof canManage !== 'undefined' && canManage) loadHealthCheckData(); 
                break;
        }
        tabLoadedState[targetTabId] = true;
    }

    function showCorrectPagination(activeTabId) {
        document.querySelectorAll('.pagination-footer[data-tab-target]').forEach(p => {
            p.style.display = p.dataset.tabTarget === activeTabId ? 'block' : 'none';
        });
    }

    // --- 4.3 Tab Event Listeners ---
    document.querySelectorAll('#settingsTab button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const targetPaneId = event.target.getAttribute('data-bs-target');
            loadTabData(targetPaneId);
            showCorrectPagination(targetPaneId);
        });
    });


    // --- 4.4 Item Master & Route Events ---
    document.getElementById('addNewItemBtn')?.addEventListener('click', () => {
        openItemModal();
    });
    
    document.getElementById('deleteItemBtn')?.addEventListener('click', deleteItem);
    
    document.getElementById('itemAndRoutesForm')?.addEventListener('submit', handleItemFormSubmit);
    
    document.getElementById('addNewRouteBtn')?.addEventListener('click', () => openRouteModal());
    
    document.getElementById('routeForm')?.addEventListener('submit', handleRouteFormSubmit);
    
    document.getElementById('modalAddNewRouteBtn')?.addEventListener('click', () => {
        addRouteRow();
    });

    document.getElementById('toggleInactiveBtn')?.addEventListener('click', (event) => {
        event.currentTarget.classList.toggle('active');
        fetchItems(1);
    });

    // --- EXPORT MASTER (Symmetric Template) ---
    document.getElementById('exportItemsBtn')?.addEventListener('click', async () => {
        Swal.fire({ title: 'Exporting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            // ดึงข้อมูลทั้งหมดโดยไม่ Limit
            const res = await fetch(`${ITEM_MASTER_API}?action=get_items&page=1&limit=-1`);
            const json = await res.json();
            
            if (json.success) {
                // โครงสร้าง Header 27 คอลัมน์ที่ตรงกับฐานข้อมูล
                const wsData = [[
                    "SAP No", "Part No", "Customer SKU", "Material Type", "Description", "Planned Output", "Min Stock", "Max Stock", "Is Active",
                    "CTN", "Net Weight", "Gross Weight", "CBM", "Invoice Product Type", "Invoice Description",
                    "Standard Price", "Price USD", "Cost RM", "Cost PKG", "Cost SUB", "Cost DL",
                    "OH Machine", "OH Utilities", "OH Indirect", "OH Staff", "OH Accessory", "OH Others"
                ]];

                json.data.forEach(item => {
                    wsData.push([
                        item.sap_no || '', item.part_no || '', item.sku || '', item.material_type || 'FG', item.part_description || '', item.planned_output || 0, item.min_stock || 0, item.max_stock || 0, item.is_active == 1 ? 'Yes' : 'No',
                        item.CTN || 0, item.net_weight || 0, item.gross_weight || 0, item.cbm || 0, item.invoice_product_type || '', item.invoice_description || '',
                        item.StandardPrice || 0, item.Price_USD || 0, item.Cost_RM || 0, item.Cost_PKG || 0, item.Cost_SUB || 0, item.Cost_DL || 0,
                        item.Cost_OH_Machine || 0, item.Cost_OH_Utilities || 0, item.Cost_OH_Indirect || 0, item.Cost_OH_Staff || 0, item.Cost_OH_Accessory || 0, item.Cost_OH_Others || 0
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // 🔥 [FIXED] ปรับความกว้างคอลัมน์ (Width) ให้พอดีและอ่านง่าย
                ws['!cols'] = [
                    { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 45 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
                    { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 22 }, { wch: 30 },
                    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
                    { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
                ];

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "ItemMaster");
                XLSX.writeFile(wb, `ItemMaster_${new Date().toISOString().split('T')[0]}.xlsx`);
                Swal.close();
            } else {
                throw new Error(json.message);
            }
        } catch (e) {
            Swal.fire('Error', e.message || 'Export failed', 'error');
        }
    });

    // --- IMPORT MASTER (Symmetric Template) ---
    document.getElementById('importItemsBtn')?.addEventListener('click', () => {
        document.getElementById('itemImportFile').click();
    });

    document.getElementById('itemImportFile')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (jsonRows.length === 0) throw new Error("Empty file");

                // Mapping ให้ตรงกับชื่อคอลัมน์ Excel Header
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
                })).filter(r => r.sap_no !== ''); // กรองตัวที่ไม่มี SAP No ทิ้ง

                if (payload.length === 0) return Swal.fire('Error', 'No valid SAP No. found', 'error');

                const btnImport = document.getElementById('importItemsBtn');
                btnImport.disabled = true;
                btnImport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';

                // ยิง API ตัวใหม่ ที่ยุบรวมเป็น Batch เดียว
                const result = await sendRequest(ITEM_MASTER_API, 'unified_bulk_import', 'POST', payload);
                if (result.success) {
                    Swal.fire({ icon: 'success', title: 'Import Complete', text: result.message });
                    await fetchItems(currentPage);
                } else {
                    throw new Error(result.message);
                }
            } catch (err) {
                Swal.fire('Error', err.message || 'Invalid File Format', 'error');
            } finally {
                const btnImport = document.getElementById('importItemsBtn');
                btnImport.disabled = false;
                btnImport.innerHTML = '<i class="fas fa-file-import"></i> Import';
                e.target.value = ''; // Reset file input
            }
        };
        reader.readAsArrayBuffer(file);
    });

    // --- 4.6 BOM Manager Events ---
    document.getElementById('createNewBomBtn')?.addEventListener('click', () => {
        openModal('createBomModal');
    });

    document.getElementById('exportAllConsolidatedBtn')?.addEventListener('click', exportAllBoms);

    document.getElementById('importUpdateBomsBtn')?.addEventListener('click', () => {
        document.getElementById('bulkUpdateImportFile').click();
    });
    document.getElementById('bulkUpdateImportFile')?.addEventListener('change', handleBulkBomImport);

    document.getElementById('importCreateBomsBtn')?.addEventListener('click', () => {
        document.getElementById('initialCreateImportFile').click();
    });
    document.getElementById('initialCreateImportFile')?.addEventListener('change', handleInitialBomImport);

    document.getElementById('confirmBulkImportBtn')?.addEventListener('click', executeBulkBomImport);


    // --- 4.7 BOM Table Selection & Bulk Actions ---
    const selectAllBomCheckbox = document.getElementById('selectAllBomCheckbox');
    const bomFgListTableBody = document.getElementById('bomFgListTableBody');
    const deleteSelectedBomBtn = document.getElementById('deleteSelectedBomBtn');
    const exportSelectedBtn = document.getElementById('exportSelectedDetailedBtn');

    function updateBomBulkActionButtons() {
        const selectedCount = document.querySelectorAll('#bomFgListTableBody .bom-row-checkbox:checked').length;
        if (selectedCount > 0) {
            deleteSelectedBomBtn?.classList.remove('d-none');
            exportSelectedBtn?.classList.remove('disabled');
        } else {
            deleteSelectedBomBtn?.classList.add('d-none');
            exportSelectedBtn?.classList.add('disabled');
        }
    }

    selectAllBomCheckbox?.addEventListener('change', (e) => {
        document.querySelectorAll('#bomFgListTableBody .bom-row-checkbox').forEach(cb => cb.checked = e.target.checked);
        updateBomBulkActionButtons();
    });

    bomFgListTableBody?.addEventListener('change', (e) => {
        if (e.target.classList.contains('bom-row-checkbox')) {
            updateBomBulkActionButtons();
        }
    });

    deleteSelectedBomBtn?.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('#bomFgListTableBody .bom-row-checkbox:checked');
        const bomsToDelete = Array.from(selectedCheckboxes).map(cb => JSON.parse(cb.value));
        if (bomsToDelete.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${bomsToDelete.length} selected BOM(s)?`)) return;

        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'bulk_delete_bom', 'POST', { boms: bomsToDelete });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                await initializeBomManager();
            }
        } finally {
            hideSpinner();
        }
    });

    exportSelectedBtn?.addEventListener('click', async (e) => {
        if (e.currentTarget.classList.contains('disabled')) return;
        exportSelectedBoms();
    });


    // --- 4.8 Schedule Form Events ---
    document.getElementById('addScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.is_active = e.target.querySelector('[name="is_active"]').checked ? 1 : 0;
        const result = await sendRequest(ITEM_MASTER_API, 'save_schedule', 'POST', payload);
        if (result.success) {
            closeModal('addScheduleModal');
            await loadSchedules();
        }
    });

    document.getElementById('editScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.is_active = e.target.querySelector('[name="is_active"]').checked ? 1 : 0;
        const result = await sendRequest(ITEM_MASTER_API, 'save_schedule', 'POST', payload);
        if (result.success) {
            closeModal('editScheduleModal');
            await loadSchedules();
        }
    });


    // --- 4.9 Initial Core Autocompletes & Listeners ---
    setupItemMasterAutocomplete();
    setupModelFilterAutocomplete();
    setupBomComponentAutocomplete();
    initializeManageBomModalListeners();


    // --- 4.10 Final Initialization ---
    // จัดการเปิด Tab ตาม URL หรือโหลด Tab แรกที่ Active
    const urlParams = new URLSearchParams(window.location.search);
    const tabToOpen = urlParams.get('tab');
    if (tabToOpen) {
        const tabElement = document.querySelector(`#settingsTab button[data-bs-target="#${tabToOpen}-pane"]`);
        if (tabElement) new bootstrap.Tab(tabElement).show();
    }
    
    const activeTab = document.querySelector('#settingsTab button.active');
    if (activeTab) {
        const activePaneId = activeTab.getAttribute('data-bs-target');
        loadTabData(activePaneId);
        showCorrectPagination(activePaneId);
    }
});