"use strict";

// =================================================================
// SECTION 1: API & GLOBAL VARIABLES
// =================================================================
const LOCATIONS_API = 'api/locationsManage.php';
const TRANSFER_API = 'api/stockTransferManage.php';
const OPENING_BALANCE_API = 'api/openingBalanceManage.php';
const ITEM_MASTER_API = 'api/itemMasterManage.php';
const BOM_API_ENDPOINT = 'api/bomManager.php';

// --- Global Variables ---
let allItems = [];
let currentPage = 1;
const ROWS_PER_PAGE = 50;
let selectedItemId = null; 
let selectedItem = null;

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
// SECTION 3: TAB-SPECIFIC FUNCTIONS (ฟังก์ชันสำหรับแต่ละแท็บ)
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
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No locations found. Click "Add New Location" to start.</td></tr>';
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
    } else {
        modalTitle.textContent = 'Add New Location';
    }
    
    modal.show();
}

async function handleLocationFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    data.is_active = document.getElementById('location_is_active').checked;
    
    const result = await sendRequest(LOCATIONS_API, 'save_location', 'POST', data);
    
    if (result.success) {
        showToast(result.message, 'var(--bs-success)');
        closeModal('locationModal');
        await loadLocations();
    } else {
        showToast(result.message, 'var(--bs-danger)');
    }
}


// --- STOCK TRANSFER TAB FUNCTIONS ---
async function fetchTransferHistory(page = 1) {
    currentPage = page;
    showSpinner();
    const params = {
        page: currentPage,
        part_no: document.getElementById('filterPartNo').value,
        from_location: document.getElementById('filterFromLocation').value,
        to_location: document.getElementById('filterToLocation').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(TRANSFER_API, 'get_transfer_history', 'GET', null, params);
        if (result.success) {
            const tbody = document.getElementById('transferTableBody');
            tbody.innerHTML = '';
            if (result.data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transfer history found.</td></tr>';
            } else {
                result.data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.dataset.transactionId = row.transaction_id;
                    tr.innerHTML = `
                        <td>${new Date(row.transaction_timestamp).toLocaleString()}</td>
                        <td>${row.part_no}</td>
                        <td>${row.part_description || ''}</td>
                        <td class="text-center">${parseFloat(row.quantity).toLocaleString()}</td>
                        <td class="text-center">${row.transfer_path}</td>
                        <td>${row.created_by || 'N/A'}</td>
                        <td class="editable-cell" contenteditable="true" data-field="notes">${row.notes || ''}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
            renderPagination('paginationControls', result.total, result.page, ROWS_PER_PAGE, fetchTransferHistory);
        }
    } finally {
        hideSpinner();
    }
}

function openTransferModal() {
    document.getElementById('transferForm').reset();
    document.getElementById('fromStock').textContent = '--';
    document.getElementById('toStock').textContent = '--';
    selectedItem = null;
    openModal('transferModal');
}

async function populateTransferInitialData() {
    const result = await sendRequest(TRANSFER_API, 'get_initial_data', 'GET');
    if (!result.success) return;

    const fromSelect = document.getElementById('from_location_id');
    const toSelect = document.getElementById('to_location_id');
    const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
    fromSelect.innerHTML = '<option value="">-- Select Source --</option>' + optionsHtml;
    toSelect.innerHTML = '<option value="">-- Select Destination --</option>' + optionsHtml;

    allItems = result.items;
}

async function updateStockDisplay(locationSelectId, displaySpanId) {
    const locationId = document.getElementById(locationSelectId).value;
    const displaySpan = document.getElementById(displaySpanId);
    if (!locationId || !selectedItem) {
        displaySpan.textContent = '--';
        return;
    }
    const result = await sendRequest(TRANSFER_API, 'get_stock_onhand', 'GET', null, { item_id: selectedItem.item_id, location_id: locationId });
    if (result.success) {
        displaySpan.textContent = parseFloat(result.quantity).toLocaleString();
    }
}

const updateBothStockDisplays = () => {
    updateStockDisplay('from_location_id', 'fromStock');
    updateStockDisplay('to_location_id', 'toStock');
};

function setupTransferAutocomplete() {
    const searchInput = document.getElementById('transfer_part_no');
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        if (value.length < 2) {
            selectedItem = null;
            return;
        }
        const filteredItems = allItems.filter(item => 
            item.sap_no.toLowerCase().includes(value) ||
            item.part_no.toLowerCase().includes(value) ||
            (item.part_description || '').toLowerCase().includes(value)
        ).slice(0, 10);
        filteredItems.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'autocomplete-item';
            resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no} <br><small>${item.part_description || ''}</small>`;
            resultItem.addEventListener('click', () => {
                searchInput.value = `${item.sap_no} | ${item.part_no}`;
                selectedItem = item;
                resultsWrapper.innerHTML = '';
                updateBothStockDisplays();
            });
            resultsWrapper.appendChild(resultItem);
        });
        resultsWrapper.style.display = filteredItems.length > 0 ? 'block' : 'none';
    });
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

async function handleTransferFormSubmit(event) {
    event.preventDefault();
    if (!selectedItem) {
        showToast('Please select a valid item from the list.', 'var(--bs-warning)');
        return;
    }
    const data = Object.fromEntries(new FormData(event.target).entries());
    data.item_id = selectedItem.item_id;
    const result = await sendRequest(TRANSFER_API, 'execute_transfer', 'POST', data);
    showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
    if (result.success) {
        closeModal('transferModal');
        await fetchTransferHistory(1);
    }
}

async function handleCellEdit(event) {
    const cell = event.target;
    const tr = cell.closest('tr');
    const transactionId = tr.dataset.transactionId;
    const fieldName = cell.dataset.field;
    const newValue = cell.textContent;
    const result = await sendRequest(TRANSFER_API, 'update_transfer', 'POST', {
        transaction_id: transactionId,
        [fieldName]: newValue
    });
    showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
    if (!result.success) {
        await fetchTransferHistory(currentPage); 
    }
}


// --- OPENING BALANCE TAB FUNCTIONS ---
async function populateOpeningBalanceLocations() {
    const locationSelect = document.getElementById('locationSelect');
    const result = await sendRequest(OPENING_BALANCE_API, 'get_locations', 'GET');
    if (result.success) {
        locationSelect.innerHTML = '<option value="">-- Please select a location --</option>';
        result.data.forEach(loc => {
            locationSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
        });
    }
}

async function loadItemsForLocation() {
    const locationId = document.getElementById('locationSelect').value;
    const tableBody = document.getElementById('stockTakeTableBody');
    const searchInput = document.getElementById('addItemSearch');
    const saveBtn = document.getElementById('saveStockBtn');
    if (!locationId) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Please select a location to begin.</td></tr>';
        searchInput.disabled = true;
        saveBtn.disabled = true;
        return;
    }
    searchInput.disabled = false;
    saveBtn.disabled = false;
    showSpinner();
    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'get_items_for_location', 'GET', null, { location_id: locationId });
        if (result.success) {
            renderOpeningBalanceItemsTable(result.data);
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load items.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

function renderOpeningBalanceItemsTable(items) {
    const tableBody = document.getElementById('stockTakeTableBody');
    tableBody.innerHTML = '';
    if (items.length === 0) {
        tableBody.innerHTML = '<tr class="no-items-row"><td colspan="5" class="text-center">No items found. Use search to add items.</td></tr>';
        return;
    }
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.itemId = item.item_id;
        const originalQty = parseFloat(item.onhand_qty);
        tr.innerHTML = `
            <td>${item.sap_no}</td>
            <td>${item.part_no}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${originalQty.toLocaleString()}</td>
            <td>
                <input type="number" class="form-control form-control-sm stock-input text-center" 
                       value="${originalQty}" data-original-value="${originalQty}" min="0" step="any"> 
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function setupStockAdjustmentAutocomplete() {
    const searchInput = document.getElementById('addItemSearch');
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);
    searchInput.addEventListener('input', () => {
        clearTimeout(window.debounceTimer);
        const value = searchInput.value;
        const locationId = document.getElementById('locationSelect').value;
        resultsWrapper.innerHTML = '';
        if (value.length < 2 || !locationId) return;
        window.debounceTimer = setTimeout(async () => {
            const result = await sendRequest(OPENING_BALANCE_API, 'search_all_items', 'GET', null, { 
                search: value,
                location_id: locationId
            });
            if (result.success) {
                result.data.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small>${item.part_description || ''}</small>`;
                    resultItem.addEventListener('click', () => {
                        addItemToTable(item);
                        searchInput.value = '';
                        resultsWrapper.style.display = 'none';
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
            }
        }, 300);
    });
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

function addItemToTable(item) {
    const tableBody = document.getElementById('stockTakeTableBody');
    const noItemsRow = tableBody.querySelector('.no-items-row');
    if (noItemsRow) tableBody.innerHTML = '';
    if (tableBody.querySelector(`tr[data-item-id="${item.item_id}"]`)) {
        showToast('This item is already in the list.', 'var(--bs-warning)');
        return;
    }
    const tr = document.createElement('tr');
    tr.dataset.itemId = item.item_id;
    const originalQty = parseFloat(item.onhand_qty);
    tr.innerHTML = `
        <td>${item.sap_no}</td>
        <td>${item.part_no}</td>
        <td>${item.part_description || ''}</td>
        <td class="text-center">${originalQty.toLocaleString()}</td>
        <td>
            <input type="number" class="form-control form-control-sm stock-input text-center is-changed" 
                   value="0" data-original-value="0" min="0" step="any">
        </td>
    `;
    tableBody.prepend(tr);
    tr.querySelector('.stock-input').focus();
}

async function saveStockTake() {
    const locationId = document.getElementById('locationSelect').value;
    if (!locationId) return;
    const rows = document.querySelectorAll('#stockTakeTableBody tr');
    const stock_data = [];
    rows.forEach(row => {
        const input = row.querySelector('.stock-input');
        if (input) {
            stock_data.push({
                item_id: row.dataset.itemId,
                quantity: parseFloat(input.value) || 0
            });
        }
    });
    if (stock_data.length === 0) return;
    if (!confirm(`Are you sure you want to save stock levels for ${stock_data.length} items? This will overwrite existing values.`)) return;
    showSpinner();
    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'save_stock_take', 'POST', { location_id: locationId, stock_data: stock_data });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) await loadItemsForLocation();
    } finally {
        hideSpinner();
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
            document.getElementById('itemsTableBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">${result.message}</td></tr>`;
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
    
    // ✅ แก้ไข colspan เป็น 8 ให้ตรงกับจำนวนคอลัมน์ใหม่
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No items found.</td></tr>`; // <-- แก้ไข colspan
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
        
        // ✅ นำโครงสร้างเดิมของคุณมาเพิ่มแค่ Min/Max Stock
        tr.innerHTML = `
            <td><span class="fw-bold">${item.sap_no}</span> ${!item.is_active ? '<span class="badge bg-danger ms-2">Inactive</span>' : ''}</td>
            <td>${item.part_no}</td>
            <td>${item.used_in_models || ''}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${item.planned_output || 0}</td>
            
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
    routesTbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading routes...</td></tr>';
    
    document.getElementById('deleteItemBtn').style.display = 'none';

    const setInputValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            const numValue = parseFloat(value || 0); 
            element.value = numValue.toFixed(6); 
        } else {
            console.warn(`Element with ID ${id} not found in modal.`);
        }
    };

    if (item) {
        modalTitle.textContent = `Edit Item: ${item.sap_no}`;
        document.getElementById('item_id').value = item.item_id;
        document.getElementById('sap_no').value = item.sap_no;
        document.getElementById('part_no').value = item.part_no;
        document.getElementById('planned_output').value = item.planned_output;
        document.getElementById('part_description').value = item.part_description;
        document.getElementById('min_stock').value = parseFloat(item.min_stock || 0).toFixed(3);
        document.getElementById('max_stock').value = parseFloat(item.max_stock || 0).toFixed(3);
        document.getElementById('deleteItemBtn').style.display = 'inline-block';

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
        setInputValue('Cost_Total', item.Cost_Total);
        setInputValue('StandardPrice', item.StandardPrice);
        setInputValue('StandardGP', item.StandardGP);
        setInputValue('Price_USD', item.Price_USD);

        const result = await sendRequest(ITEM_MASTER_API, 'get_item_routes', 'GET', null, { item_id: item.item_id });
        const routes = result.success ? result.data : [];
        renderRoutesInModal(routes);

        if (routes.length > 0) {
            const validOutputs = routes.map(r => r.planned_output).filter(p => p > 0);
            if (validOutputs.length > 0) {
                const minOutput = Math.min(...validOutputs);
                document.getElementById('planned_output').value = minOutput;
            }
        }

    } else {
        modalTitle.textContent = 'Add New Item';
        document.getElementById('item_id').value = '0';
        setInputValue('Cost_RM', 0);
        setInputValue('Cost_PKG', 0);
        setInputValue('Cost_SUB', 0);
        setInputValue('Cost_DL', 0);
        setInputValue('Cost_OH_Machine', 0);
        setInputValue('Cost_OH_Utilities', 0);
        setInputValue('Cost_OH_Indirect', 0);
        setInputValue('Cost_OH_Staff', 0);
        setInputValue('Cost_OH_Accessory', 0);
        setInputValue('Cost_OH_Others', 0);
        setInputValue('Cost_Total', 0);
        setInputValue('StandardPrice', 0);
        setInputValue('StandardGP', 0);
        setInputValue('Price_USD', 0);
        renderRoutesInModal([]);
    }
    
    modal.show();
}

function renderRoutesInModal(routes) {
    const tbody = document.getElementById('modalRoutesTableBody');
    tbody.innerHTML = '';
    
    if (routes.length === 0) {
        tbody.innerHTML = `<tr class="no-routes-row"><td colspan="4" class="text-center text-muted">No routes defined. Click 'Add New Route' to begin.</td></tr>`;
    } else {
        routes.forEach(route => addRouteRow(route));
    }
}

function addRouteRow(route = {}) {
    const tbody = document.getElementById('modalRoutesTableBody');
    // ลบแถว 'No routes defined' ถ้ามี
    const noRoutesRow = tbody.querySelector('.no-routes-row');
    if (noRoutesRow) noRoutesRow.remove();
    
    const tr = document.createElement('tr');
    // เก็บข้อมูล route_id และสถานะของแถว (ใหม่/เก่า)
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
    
    // เพิ่ม Event Listener ให้ปุ่มลบ
    tr.querySelector('.btn-delete-route').addEventListener('click', () => {
        if (confirm('Are you sure you want to remove this route?')) {
            // ถ้าเป็นแถวที่สร้างใหม่ ให้ลบออกจาก DOM เลย
            if (tr.dataset.status === 'new') {
                tr.remove();
            } else {
                // ถ้าเป็นแถวเก่า ให้ซ่อนและเปลี่ยนสถานะเป็น 'deleted'
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
    
    const itemDetails = {
        item_id: form.querySelector('#item_id').value,
        sap_no: form.querySelector('#sap_no').value,
        part_no: form.querySelector('#part_no').value,
        planned_output: form.querySelector('#planned_output').value,
        part_description: form.querySelector('#part_description').value,
        min_stock: form.querySelector('#min_stock').value,
        max_stock: form.querySelector('#max_stock').value
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
        if (typeof fetchAlerts === 'function') {
            fetchAlerts();
        }
    } else {
        showToast(result.message, 'var(--bs-danger)');
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

async function exportItemsToExcel() {
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { page: 1, limit: -1, show_inactive: true });
        if (result.success && result.data.length > 0) {
            const worksheetData = result.data.map(item => ({
                'sap_no': item.sap_no, 'part_no': item.part_no, 'part_description': item.part_description,
                'planned_output': item.planned_output || 0, 'is_active': item.is_active ? '1' : '0'
            }));
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ItemMaster");
            XLSX.writeFile(workbook, `ItemMaster_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            showToast('No items to export.', 'var(--bs-warning)');
        }
    } finally {
        hideSpinner();
    }
}
async function handleItemImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        showSpinner();
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const itemsToImport = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            if (itemsToImport.length > 0 && confirm(`Import/update ${itemsToImport.length} items?`)) {
                const result = await sendRequest(ITEM_MASTER_API, 'bulk_import_items', 'POST', itemsToImport);
                showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                if (result.success) await fetchItems(1);
            }
        } finally {
            event.target.value = '';
            hideSpinner();
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- BOM MANAGER TAB FUNCTIONS (from paraManage.js) ---
function initializeBomManager() {
    const searchInput = document.getElementById('bomSearchInput');
    const fgListTableBody = document.getElementById('bomFgListTableBody');
    manageBomModal = new bootstrap.Modal(document.getElementById('manageBomModal'));
    
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
        const filteredData = getFilteredBoms(searchInput.value);
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

// ✅ เพิ่มฟังก์ชันนี้ หรือแทนที่ของเดิมใน inventorySettings.js
function setupBomComponentAutocomplete() {
    const searchInput = document.getElementById('modalComponentSearch');
    if (!searchInput) return;

    // สร้างกล่องแสดงผลลัพธ์ถ้ายังไม่มี
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
            // เราจะใช้ API จาก itemMasterManage เพราะมีฟังก์ชันค้นหา Item ที่สมบูรณ์อยู่แล้ว
            const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
            
            if (result.success) {
                resultsWrapper.innerHTML = '';
                if(result.data.length > 0) {
                    result.data.slice(0, 10).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        // ✅ แสดง Part Description ในผลการค้นหา
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
    manageBomModal.show();
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
                         manageBomModal.hide();
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
        
        modalTitle.textContent = `Managing BOM for: ${fg.fg_part_no || fg.fg_sap_no}`;
        document.getElementById('modalSelectedFgItemId').value = fg.fg_item_id;
        
        modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading components...</td></tr>';
        
        const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_item_id: fg.fg_item_id });

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
                // Sheet name ไม่ควรยาวเกิน 31 ตัวอักษรและไม่มีอักขระพิเศษ
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

// --- B. ฟังก์ชันสำหรับ Import ---

// B1. สำหรับ Multi-Sheet (Update)
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
    validatedBulkBomImportData = sheets; // เก็บข้อมูลไว้สำหรับส่งไป execute
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('bomBulkImportPreviewModal'));
    
    // Update summary counts
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

    // Handle empty states
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
            modal.hide();
            await initializeBomManager(); // Reload data
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        hideSpinner();
    }
}

// B2. สำหรับ Single-Sheet (Initial Create)
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
            await initializeBomManager(); // Reload data
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

// --- LINE SCHEDULES TAB FUNCTIONS (from paraManage.js) ---
async function loadSchedules() {
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'read_schedules', 'GET');
        if (result?.success) {
            const tbody = document.getElementById('schedulesTableBody');
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

// --- HEALTH CHECK TAB FUNCTIONS (from paraManage.js) ---
async function loadHealthCheckData() {
    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'health_check_parameters', 'GET');
        const listBody = document.getElementById('missingParamsList');
        listBody.innerHTML = '';
        if (result?.success) {
            if (result.data.length === 0) {
                listBody.innerHTML = `<tr><td colspan="4" class="text-center text-success">Excellent! No missing data found.</td></tr>`;
                return;
            }
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.line || ''}</td>
                    <td>${item.model || ''}</td>
                    <td>${item.part_no || ''}</td>
                    <td class="text-center"><button class="btn btn-sm btn-primary" onclick="jumpToItemMaster('${item.sap_no}')">Go to Item Master</button></td>
                `;
                listBody.appendChild(tr);
            });
        }
    } finally { hideSpinner(); }
}

function jumpToItemMaster(sapNo) {
    const tab = new bootstrap.Tab(document.getElementById('item-master-tab'));
    tab.show();
    setTimeout(() => {
        const searchInput = document.getElementById('itemMasterSearch');
        if (searchInput) {
            searchInput.value = sapNo;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, 150);
}

async function handleCostingImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    function parseCostValue(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleanedValue = value.replace(/,/g, '').trim();
            if (cleanedValue === '') return 0;
            const num = parseFloat(cleanedValue);
            return Number.isNaN(num) ? 0 : num;
        }
        return 0;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        showSpinner();
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // --- MES: Read header, trim, AND convert to lowercase ---
            const headerRowRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
            // Convert to lowercase AFTER trimming
            const headerRow = headerRowRaw.map(h => (typeof h === 'string' ? h.trim().toLowerCase() : h)); 
            // --- END MES ---

            // --- MES: Use the normalized (trimmed, lowercase) header row ---
            const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null, header: headerRow, range: 1 }); // range: 1 skips header row
            // --- END MES ---


            if (rawData.length === 0) {
                showToast('CSV file has no data rows.', 'var(--bs-warning)');
                return;
            }

            const costingPayload = [];
            let skippedRows = 0;

            for (const row of rawData) {
                // ----- MES: USE LOWERCASE KEYS FOR ACCESSING DATA -----
                // Convert expected keys to lowercase here for consistency
                const materialKey = 'material';
                const lotSizeKey = 'lot size'; // Assuming header is 'Lot Size' -> 'lot size'
                const rawMaterialKey = 'raw material';
                const packagingKey = 'packaging material';
                const subContractKey = 'sub contract';
                const directLaborKey = 'direct labor';
                const machineDepreKey = 'machine/tool depre';
                const utilitiesKey = 'utilities';
                const indirectLaborKey = 'indirect labor';
                const staffExpenseKey = 'staff expense oh';
                const accessoryKey = 'accessory';
                const othersOverheadKey = 'others overhead';
                const costKey = 'cost';
                const priceKey = 'price';
                const gpKey = 'gp';
                const usdKey = 'usd';

                const material = row[materialKey] ? String(row[materialKey]).trim() : null; 
                const lotSizeRaw = row[lotSizeKey]; 
                const lotSize = parseCostValue(lotSizeRaw);

                if (!material || lotSize <= 0) {
                    console.warn('Skipping row due to missing Material or invalid Lot Size:', row);
                    skippedRows++;
                    continue;
                }

                // Access row data using lowercase keys
                const costRM = parseCostValue(row[rawMaterialKey]) / lotSize;
                const costPKG = parseCostValue(row[packagingKey]) / lotSize;
                const costSUB = parseCostValue(row[subContractKey]) / lotSize;
                const costDL = parseCostValue(row[directLaborKey]) / lotSize; 
                const costOHMachine = parseCostValue(row[machineDepreKey]) / lotSize;
                const costOHUtilities = parseCostValue(row[utilitiesKey]) / lotSize;
                const costOHIndirect = parseCostValue(row[indirectLaborKey]) / lotSize;
                const costOHStaff = parseCostValue(row[staffExpenseKey]) / lotSize;
                const costOHAccessory = parseCostValue(row[accessoryKey]) / lotSize;
                const costOHOthers = parseCostValue(row[othersOverheadKey]) / lotSize;

                const costTotal = parseCostValue(row[costKey]);
                const standardPrice = parseCostValue(row[priceKey]);
                const standardGP = parseCostValue(row[gpKey]);
                const priceUSD = parseCostValue(row[usdKey]);
                // ----- END MES -----

                const costItem = {
                    sap_no: material, // Keep original case for sap_no if needed, or convert too
                    Cost_RM: costRM, Cost_PKG: costPKG, Cost_SUB: costSUB, Cost_DL: costDL,
                    Cost_OH_Machine: costOHMachine, Cost_OH_Utilities: costOHUtilities, Cost_OH_Indirect: costOHIndirect,
                    Cost_OH_Staff: costOHStaff, Cost_OH_Accessory: costOHAccessory, Cost_OH_Others: costOHOthers,
                    Cost_Total: costTotal, StandardPrice: standardPrice, StandardGP: standardGP, Price_USD: priceUSD
                };
                costingPayload.push(costItem);
            }

            if (costingPayload.length > 0) {
                if (confirm(`Import costing data for ${costingPayload.length} items? (Skipped ${skippedRows} rows)`)) {
                    const result = await sendRequest(ITEM_MASTER_API, 'import_costing_json', 'POST', costingPayload);
                    showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                    if (result.success) {
                        await fetchItems(1);
                    }
                }
            } else {
                 showToast(`No valid costing data found to import. Skipped ${skippedRows} rows.`, 'var(--bs-warning)');
            }

        } catch (error) {
            console.error("Error processing costing CSV:", error);
            showToast(`Error processing file: ${error.message}`, 'var(--bs-danger)');
        } finally {
            event.target.value = '';
            hideSpinner();
        }
    };
    reader.readAsArrayBuffer(file);
}

// =================================================================
// SECTION 4: DOMCONTENTLOADED (ตัวควบคุมหลัก)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- State & Core Functions ---
    const tabLoadedState = {};
    function loadTabData(targetTabId) {
        if (!targetTabId || tabLoadedState[targetTabId]) return;
        
        switch (targetTabId) {
            case '#locations-pane': loadLocations(); break;
            case '#transfer-pane': populateTransferInitialData(); fetchTransferHistory(1); break;
            case '#opening-balance-pane': populateOpeningBalanceLocations(); break;
            case '#item-master-pane': fetchItems(1); break;
            case '#bom-manager-pane': initializeBomManager(); initializeCreateBomModal(); break;
            case '#lineSchedulesPane': if (canManage) loadSchedules(); break;
            case '#healthCheckPane': if (canManage) loadHealthCheckData(); break;
        }
        tabLoadedState[targetTabId] = true;
    }
    function showCorrectPagination(activeTabId) {
        document.querySelectorAll('.pagination-footer[data-tab-target]').forEach(p => {
            p.style.display = p.dataset.tabTarget === activeTabId ? 'block' : 'none';
        });
    }

    // --- Tab Event Listener ---
    document.querySelectorAll('#settingsTab button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const targetPaneId = event.target.getAttribute('data-bs-target');
            loadTabData(targetPaneId);
            showCorrectPagination(targetPaneId);
        });
    });
    
    // --- General Event Listeners Setup ---
    document.getElementById('addLocationBtn')?.addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm')?.addEventListener('submit', handleLocationFormSubmit);
    document.getElementById('addTransferBtn')?.addEventListener('click', openTransferModal);
    document.getElementById('transferForm')?.addEventListener('submit', handleTransferFormSubmit);
    document.getElementById('addNewItemBtn')?.addEventListener('click', () => openItemModal());
    document.getElementById('deleteItemBtn')?.addEventListener('click', deleteItem);
    document.getElementById('itemAndRoutesForm')?.addEventListener('submit', handleItemFormSubmit);
    document.getElementById('addNewRouteBtn')?.addEventListener('click', () => openRouteModal());
    document.getElementById('routeForm')?.addEventListener('submit', handleRouteFormSubmit);
    document.getElementById('modalAddNewRouteBtn')?.addEventListener('click', () => {
        addRouteRow();
    });
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

    document.getElementById('toggleInactiveBtn')?.addEventListener('click', (event) => {
        event.currentTarget.classList.toggle('active'); // สลับสถานะ active
        fetchItems(1); // โหลดข้อมูลใหม่ทันที
    });

    document.getElementById('exportItemsBtn')?.addEventListener('click', exportItemsToExcel);

    const importBtn = document.getElementById('importItemsBtn');
    const importFileInput = document.getElementById('itemImportFile');

    importBtn?.addEventListener('click', () => {
        importFileInput.click(); // ...ให้ไปกระตุ้นการทำงานของ input file ที่ซ่อนอยู่
    });

    // และเมื่อเลือกไฟล์ใน input file ที่ซ่อนอยู่แล้ว...
    importFileInput?.addEventListener('change', handleItemImport); // ...ให้เรียกใช้ฟังก์ชันนำเข้าข้อมูล

    const importCostingBtn = document.getElementById('importCostingBtn');
    const costImportFileInput = document.getElementById('costImportFile');

    importCostingBtn?.addEventListener('click', () => {
        costImportFileInput.click(); // Trigger the hidden file input
    });

    costImportFileInput?.addEventListener('change', handleCostingImport); // Call the new handler
    // END MES Additions

    // --- BOM Manager Tab ---
    // 1. ปุ่ม Create New BOM
    document.getElementById('createNewBomBtn')?.addEventListener('click', () => {
        openModal('createBomModal');
    });

    // 2. ปุ่ม Export
    document.getElementById('exportAllConsolidatedBtn')?.addEventListener('click', exportAllBoms);
    document.getElementById('exportSelectedDetailedBtn')?.addEventListener('click', (e) => {
        if(!e.currentTarget.classList.contains('disabled')) {
            exportSelectedBoms();
        }
    });

    // 3. ปุ่ม Import (Update - Multi-Sheet)
    document.getElementById('importUpdateBomsBtn')?.addEventListener('click', () => {
        document.getElementById('bulkUpdateImportFile').click();
    });
    document.getElementById('bulkUpdateImportFile')?.addEventListener('change', handleBulkBomImport);

    // 4. ปุ่ม Import (Initial Create - Single-Sheet)
    document.getElementById('importCreateBomsBtn')?.addEventListener('click', () => {
        document.getElementById('initialCreateImportFile').click();
    });
    document.getElementById('initialCreateImportFile')?.addEventListener('change', handleInitialBomImport);

    // 5. ปุ่มยืนยันในหน้า Preview ของ Bulk Import
    document.getElementById('confirmBulkImportBtn')?.addEventListener('click', executeBulkBomImport);

    // 6. จัดการ Checkbox และปุ่ม Delete Selected / Export Selected
    const selectAllBomCheckbox = document.getElementById('selectAllBomCheckbox');
    const bomFgListTableBody = document.getElementById('bomFgListTableBody');
    const deleteSelectedBomBtn = document.getElementById('deleteSelectedBomBtn');
    const exportSelectedBtn = document.getElementById('exportSelectedDetailedBtn');

    function updateBomBulkActionButtons() {
        const selectedCount = document.querySelectorAll('#bomFgListTableBody .bom-row-checkbox:checked').length;
        if (selectedCount > 0) {
            deleteSelectedBomBtn.classList.remove('d-none');
            exportSelectedBtn.classList.remove('disabled');
        } else {
            deleteSelectedBomBtn.classList.add('d-none');
            exportSelectedBtn.classList.add('disabled');
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

    document.getElementById('locationSelect')?.addEventListener('change', loadItemsForLocation);
    document.getElementById('saveStockBtn')?.addEventListener('click', saveStockTake);
    document.getElementById('exportAllConsolidatedBtn')?.addEventListener('click', async () => {
        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'export_all_boms', 'GET');
            if (result.success && result.data.length > 0) {
                const worksheet = XLSX.utils.json_to_sheet(result.data);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "All_BOMs");
                XLSX.writeFile(workbook, `BOM_Export_All_${new Date().toISOString().split('T')[0]}.xlsx`);
            } else {
                showToast(result.message || 'No BOMs found to export.', 'var(--bs-warning)');
            }
        } finally {
            hideSpinner();
        }
    });

    document.getElementById('exportSelectedDetailedBtn')?.addEventListener('click', async (e) => {
        if (e.currentTarget.classList.contains('disabled')) return;

        const selectedCheckboxes = document.querySelectorAll('#bomFgListTableBody .bom-row-checkbox:checked');
        const bomsToExport = Array.from(selectedCheckboxes).map(cb => JSON.parse(cb.value));

        if (bomsToExport.length === 0) {
            showToast('Please select at least one BOM to export.', 'var(--bs-warning)');
            return;
        }

        showSpinner();
        try {
            const result = await sendRequest(BOM_API_ENDPOINT, 'export_selected_boms', 'POST', { boms: bomsToExport });
            if (result.success && Object.keys(result.data).length > 0) {
                const wb = XLSX.utils.book_new();
                for (const fgSapNo in result.data) {
                    const sheetData = result.data[fgSapNo].map(row => ({
                        COMPONENT_SAP_NO: row.COMPONENT_SAP_NO,
                        QUANTITY_REQUIRED: row.QUANTITY_REQUIRED
                    }));
                    const ws = XLSX.utils.json_to_sheet(sheetData);
                    const safeSheetName = fgSapNo.replace(/[\*:\/\\?\[\]]/g, "_").substring(0, 31);
                    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
                }
                const fileName = `BOM_Export_Selected_${new Date().toISOString().split('T')[0]}.xlsx`;
                XLSX.writeFile(wb, fileName);
            } else {
                showToast(result.message || 'Could not export selected BOMs.', 'var(--bs-warning)');
            }
        } finally {
            hideSpinner();
        }
    });
    
    setupItemMasterAutocomplete();
    setupModelFilterAutocomplete();
    setupBomComponentAutocomplete();
    setupStockAdjustmentAutocomplete();
    initializeManageBomModalListeners(); 

    // --- Initial Page Load ---
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