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

// Variables from paraManage.js
let allSchedules = [], allMissingParams = [], allBomFgs = [];
let bomCurrentPage = 1;
let currentEditingBom = null;
let manageBomModal;


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
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No items found.</td></tr>`;
        renderPagination('itemMasterPagination', 0, 1, ROWS_PER_PAGE, fetchItems);
        return;
    }
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.dataset.itemId = item.item_id;
        tr.innerHTML = `
            <td><span class="fw-bold">${item.sap_no}</span> ${!item.is_active ? '<span class="badge bg-danger ms-2">Inactive</span>' : ''}</td>
            <td>${item.part_no}</td>
            <td>${item.used_in_models || ''}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${item.planned_output || 0}</td>
            <td class="text-end">${item.created_at}</td>
        `;
        if (item.is_active != 1) {
            tr.classList.add('table-secondary', 'text-muted');
        }
        tr.addEventListener('click', (e) => {
            if (e.target.closest('.item-actions')) return;
            selectItem(item.item_id, tr);
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
function openItemModal(item = null) {
    const form = document.getElementById('itemForm');
    form.reset();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal'));
    if (item) {
        document.getElementById('itemModalLabel').textContent = `Edit Item: ${item.sap_no}`;
        for (const key in item) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = item[key];
        }
    } else {
        document.getElementById('itemModalLabel').textContent = 'Add New Item';
        document.getElementById('item_id').value = '0';
    }
    modal.show();
}
async function handleItemFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const result = await sendRequest(ITEM_MASTER_API, 'save_item', 'POST', data);
    if (result.success) {
        closeModal('itemModal');
        await fetchItems(1);
        showToast(result.message, 'var(--bs-success)');
    } else {
        showToast(result.message, 'var(--bs-danger)');
    }
}
async function deleteItem() {
    const itemId = document.getElementById('item_id').value;
    if (confirm(`Are you sure you want to delete this item?`)) {
        const result = await sendRequest(ITEM_MASTER_API, 'delete_item', 'POST', { item_id: itemId });
        if (result.success) {
            closeModal('itemModal');
            await fetchItems(1);
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
    const form = document.getElementById('createBomForm');
    const searchInput = document.getElementById('fg_item_search');
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);
    const detailsDiv = document.getElementById('selected_fg_details');
    const paramSelect = document.getElementById('parameter_select');
    const nextBtn = document.getElementById('createBomNextBtn');
    let selectedItem = null;
    let bomDataForNextStep = null;

    searchInput.addEventListener('input', () => {
        clearTimeout(window.debounceTimer);
        const value = searchInput.value.toLowerCase();
        if (value.length < 2) return;
        window.debounceTimer = setTimeout(async () => {
            const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { search: value });
            if (result.success) {
                resultsWrapper.innerHTML = '';
                result.data.slice(0, 10).forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}`;
                    resultItem.addEventListener('click', () => {
                        searchInput.value = `${item.sap_no} | ${item.part_no}`;
                        selectedItem = item;
                        resultsWrapper.style.display = 'none';
                        loadParametersForSelectedItem();
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = 'block';
            }
        }, 300);
    });

    async function loadParametersForSelectedItem() {
        if (!selectedItem) return;
        detailsDiv.classList.remove('d-none');
        paramSelect.innerHTML = '<option>Loading...</option>';
        nextBtn.disabled = true;
        
        const result = await sendRequest(ITEM_MASTER_API, 'get_parameters_for_item', 'GET', null, { item_id: selectedItem.item_id });
        
        if (result.success && result.data.length > 0) {
            paramSelect.innerHTML = '<option value="">-- Select Line/Model --</option>';
            result.data.forEach(param => {
                paramSelect.innerHTML += `<option value="${param.id}" data-line="${param.line}" data-model="${param.model}">Line: ${param.line} / Model: ${param.model}</option>`;
            });
        } else {
            paramSelect.innerHTML = '<option>-- No parameters found --</option>';
        }
    }
    paramSelect.addEventListener('change', () => { nextBtn.disabled = !paramSelect.value; });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedOption = paramSelect.options[paramSelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;
        bomDataForNextStep = {
            fg_item_id: selectedItem.item_id, fg_sap_no: selectedItem.sap_no,
            fg_part_no: selectedItem.part_no, line: selectedOption.dataset.line,
            model: selectedOption.dataset.model
        };
        closeModal('createBomModal');
    });
    modalEl.addEventListener('hidden.bs.modal', () => {
        if (bomDataForNextStep) manageBom(bomDataForNextStep);
        form.reset();
        detailsDiv.classList.add('d-none');
        nextBtn.disabled = true;
        bomDataForNextStep = null;
    });
}
function getFilteredBoms(searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) return allBomFgs;
    return allBomFgs.filter(fg =>
        (fg.fg_sap_no && String(fg.fg_sap_no).toLowerCase().includes(term)) ||
        (fg.fg_part_no && fg.fg_part_no.toLowerCase().includes(term)) ||
        (fg.line && fg.line.toLowerCase().includes(term)) ||
        (fg.model && fg.model.toLowerCase().includes(term))
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
                <td>${fg.line || 'N/A'}</td>
                <td>${fg.model || 'N/A'}</td>
                <td>${fg.fg_part_description || ''}</td>
                <td>${fg.updated_by || 'N/A'}</td>
                <td class="text-end">${fg.updated_at || 'N/A'}</td>
            `;
            fgListTableBody.appendChild(tr);
        });
    } else {
        fgListTableBody.innerHTML = `<tr><td colspan="8" class="text-center">No BOMs found.</td></tr>`;
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
async function loadBomForModal(fg) {
    showSpinner();
    try {
        const modalTitle = document.getElementById('bomModalTitle');
        const modalBomTableBody = document.getElementById('modalBomTableBody');
        modalTitle.textContent = `Managing BOM for: ${fg.fg_part_no} (SAP: ${fg.fg_sap_no})`;
        document.getElementById('modalSelectedFgItemId').value = fg.fg_item_id;
        document.getElementById('modalSelectedFgLine').value = fg.line;
        document.getElementById('modalSelectedFgModel').value = fg.model;
        modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
        const bomResult = await sendRequest(BOM_API_ENDPOINT, 'get_bom_components', 'GET', null, { fg_item_id: fg.fg_item_id, line: fg.line, model: fg.model });
        modalBomTableBody.innerHTML = '';
        if (bomResult.success && bomResult.data.length > 0) {
            bomResult.data.forEach(comp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${comp.component_sap_no}</td> 
                    <td>${comp.part_description || ''}</td>
                    <td class="text-center"><input type="number" class="form-control form-control-sm text-center" value="${parseFloat(comp.quantity_required)}" data-bom-id="${comp.bom_id}" min="0.0001" step="any"></td>
                    <td class="text-center"><button class="btn btn-danger btn-sm" data-action="delete-comp" data-comp-id="${comp.bom_id}">Delete</button></td>
                `;
                modalBomTableBody.appendChild(tr);
            });
        } else {
            modalBomTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No components. Add one now!</td></tr>';
        }
    } finally { hideSpinner(); }
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
        document.querySelectorAll('.sticky-bottom[data-tab-target]').forEach(p => {
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
    document.getElementById('itemForm')?.addEventListener('submit', handleItemFormSubmit);
    document.getElementById('addNewRouteBtn')?.addEventListener('click', () => openRouteModal());
    document.getElementById('routeForm')?.addEventListener('submit', handleRouteFormSubmit);
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