"use strict";

// --- API Endpoints ---
const LOCATIONS_API = 'api/locationsManage.php';
const TRANSFER_API = 'api/stockTransferManage.php';
const OPENING_BALANCE_API = 'api/openingBalanceManage.php';
const ITEM_MASTER_API = 'api/itemMasterManage.php';
const PARA_API_ENDPOINT = 'api/paraManage.php';
const BOM_API_ENDPOINT = 'api/bomManager.php';

// --- Global Variables ---
let allItems = []; // ใช้ร่วมกันระหว่าง Transfer และ Opening Balance
let currentEditingLocation = null;
let selectedItem = null;
let debounceTimer;
let currentPage = 1;
const ROWS_PER_PAGE = 100;
let selectedItemId = null;

// --- Location Manager Functions ---
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
        const linesResult = await sendRequest('../paraManage/api/paraManage.php', 'get_lines', 'GET');
        if (linesResult.success && linesResult.data.length > 0) {
            lineSelect.innerHTML = '<option value="">-- ไม่ใช่พื้นที่การผลิต --</option>';
            linesResult.data.forEach(lineName => {
                const option = document.createElement('option');
                option.value = lineName;
                option.textContent = lineName;
                lineSelect.appendChild(option);
            });
        } else {
             lineSelect.innerHTML = '<option value="">-- ไม่พบข้อมูล Line --</option>';
        }
    } catch (error) {
        lineSelect.innerHTML = '<option value="">-- Error loading lines --</option>';
    }

    if (location) {
        modalTitle.textContent = 'แก้ไขสถานที่';
        document.getElementById('location_id').value = location.location_id;
        document.getElementById('location_name').value = location.location_name;
        document.getElementById('location_description').value = location.location_description || '';
        document.getElementById('location_is_active').checked = location.is_active;
        if (location.production_line) {
            lineSelect.value = location.production_line;
        }
    } else {
        modalTitle.textContent = 'เพิ่มสถานที่ใหม่';
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
        bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
        fetchLocations(currentPage);
    } else {
        showToast(result.message, 'var(--bs-danger)');
    }
}

async function deleteLocation() {
    if (!currentEditingLocation) return;
    
    if (confirm(`Are you sure you want to delete the location "${currentEditingLocation.location_name}"? This action cannot be undone.`)) {
        showSpinner();
        try {
            const result = await sendRequest(LOCATIONS_API, 'delete_location', 'POST', { location_id: currentEditingLocation.location_id });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
                await loadLocations();
            }
        } finally {
            hideSpinner();
        }
    }
}


// --- Stock Transfer Functions ---
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
            renderTransferTable(result.data);
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
    const modal = new bootstrap.Modal(document.getElementById('transferModal'));
    modal.show();
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

async function handleTransferFormSubmit(event) {
    event.preventDefault();
    if (!selectedItem) {
        showToast('Please select a valid item from the list.', 'var(--bs-warning)');
        return;
    }

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    data.item_id = selectedItem.item_id;

    showSpinner();
    try {
        const result = await sendRequest(TRANSFER_API, 'execute_transfer', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
            fetchTransferHistory(); // Refresh history
        }
    } finally {
        hideSpinner();
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
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

function renderTransferTable(data) {
    const tbody = document.getElementById('transferTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transfer history found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = row.transaction_id;
        
        tr.innerHTML = `
            <td>${new Date(row.transaction_timestamp).toLocaleString()}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-center">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.transfer_path}</td>
            <td>${row.created_by || 'N/A'}</td>
            <td class="editable-cell" contenteditable="false" data-field="notes">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Function to handle saving an edited cell
async function handleCellEdit(event) {
    const cell = event.target;
    const tr = cell.closest('tr');
    const transactionId = tr.dataset.transactionId;
    const fieldName = cell.dataset.field;
    const newValue = cell.textContent;

    showSpinner();
    try {
        const result = await sendRequest(TRANSFER_API, 'update_transfer', 'POST', {
            transaction_id: transactionId,
            [fieldName]: newValue // ES6 computed property name
        });

        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        
        if (!result.success) {
            // If saving fails, refresh the data to revert the change
            fetchTransferHistory(currentPage); 
        }
    } finally {
        hideSpinner();
    }
}

// --- Opening Balance Functions ---
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
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading items...</td></tr>';
    showSpinner();

    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'get_items_for_location', 'GET', null, { location_id: locationId });
        if (result.success) {
            allItems = result.data;
            renderItemsTable(allItems);
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load items.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

async function selectItem(itemId, selectedRow) {
    if (selectedItemId === itemId) {
        selectedItemId = null;
        document.getElementById('selectedItemDisplay').textContent = 'Select an item to view its routes';
        document.getElementById('addNewRouteBtn').disabled = true;
        document.querySelectorAll('#itemsTableBody tr.table-info').forEach(row => row.classList.remove('table-info'));
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
                <button class="btn btn-sm btn-warning" onclick='openRouteModal(${JSON.stringify(route).replace(/"/g, "&quot;")})'>Edit</button>
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
        bootstrap.Modal.getInstance(document.getElementById('routeModal')).hide();
        const selectedRow = document.querySelector(`#itemsTableBody tr[data-item-id="${selectedItemId}"]`);
        if (selectedRow) selectItem(selectedItemId, selectedRow);
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
            if (selectedRow) selectItem(selectedItemId, selectedRow);
            showToast(result.message, 'var(--bs-success)');
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    }
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
            tr.style.textDecoration = 'line-through';
        }
        tr.addEventListener('click', () => {
            selectItem(item.item_id, tr);
        });
        tbody.appendChild(tr);
    });
    renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
}

function setupStockAdjustmentAutocomplete() {
    const searchInput = document.getElementById('addItemSearch');
    const tableBody = document.getElementById('stockTakeTableBody');
    if (!searchInput) return;

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        const locationId = document.getElementById('locationSelect').value;
        resultsWrapper.innerHTML = '';

        if (value.length < 2 || !locationId) return;

        debounce = setTimeout(async () => {
            const result = await sendRequest(OPENING_BALANCE_API, 'search_all_items', 'GET', null, { 
                search: value,
                location_id: locationId
            });
            if (result.success) {
                resultsWrapper.innerHTML = '';
                result.data.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                    resultItem.addEventListener('click', () => {
                        addItemToTable(item); // เรียกใช้ฟังก์ชันเพิ่มไอเทม
                        searchInput.value = ''; // เคลียร์ช่องค้นหา
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
    if (noItemsRow) {
        tableBody.innerHTML = '';
    }

    if (tableBody.querySelector(`tr[data-item-id="${item.item_id}"]`)) {
        showToast('This item is already in the list.', 'var(--bs-warning)');
        const existingInput = tableBody.querySelector(`tr[data-item-id="${item.item_id}"] .stock-input`);
        existingInput.focus();
        existingInput.select();
        return;
    }

    const tr = document.createElement('tr');
    tr.dataset.itemId = item.item_id;
    tr.style.cursor = 'pointer';

    const originalQty = parseFloat(item.onhand_qty);

    tr.innerHTML = `
        <td>${item.sap_no}</td>
        <td>${item.part_no}</td>
        <td>${item.part_description || ''}</td>
        <td class="text-center">${originalQty.toLocaleString()}</td>
        <td>
            <input type="number" class="form-control form-control-sm stock-input text-center" 
                   value="${originalQty}"
                   data-original-value="${originalQty}"
                   min="0" step="any"
                   readonly>
        </td>
    `;

    const inputField = tr.querySelector('.stock-input');

    tr.addEventListener('click', () => {
        if (inputField.readOnly === false) {
            return;
        }
        inputField.readOnly = false;
        inputField.focus();
        inputField.select();
    });

    inputField.addEventListener('blur', () => {
        const currentValue = parseFloat(inputField.value);
        const originalValue = parseFloat(inputField.dataset.originalValue);

        if (currentValue !== originalValue) {
            inputField.classList.add('is-changed');
        } else {
            inputField.classList.remove('is-changed');
        }
        inputField.readOnly = true;
    });

    tableBody.prepend(tr);
}

async function saveStockTake() {
    const locationId = document.getElementById('locationSelect').value;
    if (!locationId) {
        showToast('Please select a location first.', 'var(--bs-warning)');
        return;
    }

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

    if (stock_data.length === 0) {
        showToast('No items to save.', 'var(--bs-info)');
        return;
    }

    if (!confirm(`Are you sure you want to save stock levels for ${stock_data.length} items in this location? This will overwrite existing values.`)) {
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'save_stock_take', 'POST', { location_id: locationId, stock_data: stock_data });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            await loadItemsForLocation(); // Refresh data
        }
    } finally {
        hideSpinner();
    }
}

// --- Item Master Functions ---
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

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        resultsWrapper.innerHTML = '';

        debounce = setTimeout(async () => {
            fetchItems(1);

            if (value.length > 1) { 
                const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
                    page: 1, 
                    search: value 
                });
                
                if (result.success && result.data.length > 0) {
                    resultsWrapper.innerHTML = '';
                    result.data.slice(0, 7).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                        resultItem.addEventListener('click', () => {
                            searchInput.value = item.sap_no;
                            resultsWrapper.style.display = 'none';
                            fetchItems(1);
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                    resultsWrapper.style.display = 'block';
                } else {
                    resultsWrapper.style.display = 'none';
                }
            } else {
                resultsWrapper.style.display = 'none';
            }
        }, 500);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

function setupModelFilterAutocomplete() {
    const searchInput = document.getElementById('modelFilterSearch');
    const valueInput = document.getElementById('modelFilterValue');
    if (!searchInput) return;

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        
        valueInput.value = value;
        resultsWrapper.innerHTML = '';
        
        debounce = setTimeout(async () => {
            fetchItems(1);

            if (value.length > 0) {
                const result = await sendRequest(ITEM_MASTER_API, 'get_models', 'GET', null, { search: value });
                if (result.success) {
                    resultsWrapper.innerHTML = '';
                    result.data.slice(0, 10).forEach(model => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.textContent = model;
                        resultItem.addEventListener('click', () => {
                            searchInput.value = model;
                            valueInput.value = model;
                            resultsWrapper.style.display = 'none';
                            fetchItems(1);
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                    resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
                }
            } else {
                resultsWrapper.style.display = 'none';
            }
        }, 500); 
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
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
            <td>
                <span class="fw-bold">${item.sap_no}</span>
                ${!item.is_active ? '<span class="badge bg-danger ms-2">Inactive</span>' : ''}
            </td>
            <td>${item.part_no}</td>
            <td>${item.used_in_models || ''}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${item.planned_output || 0}</td>
            <td class="text-end">${item.created_at}</td>
        `;

        if (item.is_active != 1) {
            tr.classList.add('table-secondary', 'text-muted');
            tr.style.textDecoration = 'line-through';
        }

        tr.addEventListener('click', () => {
            selectItem(item.item_id, tr); 
        });

        tbody.appendChild(tr);
    });

    renderPagination('itemMasterPagination', totalItems, page, ROWS_PER_PAGE, fetchItems);
}

function openItemModal(item = null) {
    const form = document.getElementById('itemForm');
    form.reset();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('itemModal'));
    const modalLabel = document.getElementById('itemModalLabel');
    const deleteBtn = document.getElementById('deleteItemBtn');
    const manageBomBtn = document.getElementById('manageBomBtn');

    if (item) { // Edit mode
        modalLabel.textContent = `Edit Item: ${item.sap_no}`;
        document.getElementById('item_id').value = item.item_id;
        document.getElementById('sap_no').value = item.sap_no;
        document.getElementById('part_no').value = item.part_no;
        document.getElementById('part_description').value = item.part_description || '';
        
        // --- ★★★ นี่คือบรรทัดที่ขาดหายไป ★★★ ---
        document.getElementById('planned_output').value = item.planned_output || 0;
        
        deleteBtn.classList.remove('d-none');
        manageBomBtn.classList.remove('d-none');
    } else { // Add mode
        modalLabel.textContent = 'Add New Item';
        document.getElementById('item_id').value = '0';
        deleteBtn.classList.add('d-none');
        manageBomBtn.classList.add('d-none');
    }
    
    modal.show();
}

async function handleItemFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const itemId = data.item_id;

    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn.textContent === 'Restore') {
        restoreItem(itemId);
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'save_item', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
            await fetchItems(1);
        }
    } finally {
        hideSpinner();
    }
}



async function deleteItem() {
    const itemId = document.getElementById('item_id').value;
    if (!itemId || itemId === '0') return;
    
    if (confirm(`Are you sure you want to delete this item? This action cannot be undone.`)) {
        showSpinner();
        try {
            const result = await sendRequest(ITEM_MASTER_API, 'delete_item', 'POST', { item_id: itemId });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
                await fetchItems(1);
            }
        } finally {
            hideSpinner();
        }
    }
}

function manageBomForItem(item) {
    if (!item || !item.part_no) {
        showToast('Cannot manage BOM without a valid item.', 'var(--bs-danger)');
        return;
    }
    const url = `../paraManage/paraManageUI.php?search=${encodeURIComponent(item.part_no)}&tab=bom`;
    showToast(`Loading BOM Manager for ${item.part_no}...`, 'var(--bs-info)');
    
    setTimeout(() => {
        window.location.href = url;
    }, 500);
}

async function restoreItem(itemId) {
    if (!itemId) return;
    
    if (confirm(`Are you sure you want to restore this item?`)) {
        showSpinner();
        try {
            const result = await sendRequest(ITEM_MASTER_API, 'restore_item', 'POST', { item_id: itemId });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                await fetchItems(1);
            }
        } finally {
            hideSpinner();
        }
    }
}

async function exportItemsToExcel() {
    showSpinner();
    showToast('Preparing data for export...', 'var(--bs-info)');
    try {
        // ดึงข้อมูลทั้งหมดโดยไม่แบ่งหน้า
        const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
            page: 1, 
            search: '', 
            show_inactive: true,
            limit: -1 // ส่ง limit = -1 เพื่อบอก backend ว่าต้องการข้อมูลทั้งหมด
        });

        if (result.success && result.data.length > 0) {
            // --- ★★★ START: แก้ไขส่วนนี้ ★★★ ---
            const worksheetData = result.data.map(item => ({
                'sap_no': item.sap_no,
                'part_no': item.part_no,
                'part_description': item.part_description,
                'planned_output': item.planned_output || 0, // เพิ่ม planned_output
                'is_active': item.is_active ? '1' : '0'
            }));
            // --- ★★★ END: แก้ไขส่วนนี้ ★★★ ---

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ItemMaster");
            XLSX.writeFile(workbook, `ItemMaster_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            showToast('No items to export.', 'var(--bs-warning)');
        }
    } catch (error) {
        showToast('Failed to export data.', 'var(--bs-danger)');
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
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const itemsToImport = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (itemsToImport.length === 0) {
                showToast('No data found in the file to import.', 'var(--bs-warning)');
                return;
            }

            if (confirm(`Are you sure you want to import/update ${itemsToImport.length} items?`)) {
                const result = await sendRequest(ITEM_MASTER_API, 'bulk_import_items', 'POST', itemsToImport);
                showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                if (result.success) {
                    await fetchItems(1); // รีเฟรชตาราง
                }
            }
        } catch (error) {
            console.error("Import failed:", error);
            showToast('Failed to process the import file.', 'var(--bs-danger)');
        } finally {
            event.target.value = ''; // เคลียร์ค่าใน input file
            hideSpinner();
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    
    // =================================================================
    // 1. STATE MANAGEMENT & CORE FUNCTIONS (ส่วนจัดการสถานะและฟังก์ชันหลัก)
    // =================================================================

    // ตัวแปรสำหรับเช็คว่าแท็บไหนเคยโหลดข้อมูลไปแล้วบ้าง
    const tabLoadedState = {
        '#locations-pane': false,
        '#transfer-pane': false,
        '#opening-balance-pane': false,
        '#item-master-pane': false,
        '#bom-manager-pane': false,
        '#lineSchedulesPane': false,
        '#healthCheckPane': false,
        '#standard-params-pane': false
    };

    /**
     * ฟังก์ชันกลางสำหรับโหลดข้อมูลตามแท็บที่ถูกเปิด
     * @param {string} targetTabId - ID ของ tab-pane (e.g., '#item-master-pane')
     */
    function loadTabData(targetTabId) {
        if (!targetTabId || tabLoadedState[targetTabId]) {
            return; // ถ้าไม่มี ID หรือเคยโหลดแล้ว ให้หยุด
        }

        console.log(`Initializing Tab: ${targetTabId}`);

        // เลือกทำงานตาม ID ของแท็บ
        switch (targetTabId) {
            case '#locations-pane':
                loadLocations();
                break;
            case '#transfer-pane':
                populateTransferInitialData();
                fetchTransferHistory(1);
                break;
            case '#opening-balance-pane':
                populateOpeningBalanceLocations();
                break;
            case '#item-master-pane':
                fetchItems(1);
                break;
            case '#bom-manager-pane':
                if (typeof initializeBomManager === 'function') {
                    initializeBomManager();
                    initializeCreateBomModal();
                }
                break;
            case '#lineSchedulesPane':
                if (canManage && typeof loadSchedules === 'function') {
                    loadSchedules();
                }
                break;
            case '#healthCheckPane':
                if (canManage && typeof loadHealthCheckData === 'function') {
                    loadHealthCheckData();
                }
                break;
            case '#standard-params-pane':
                if (typeof loadStandardParams === 'function') {
                    loadStandardParams();
                    populateLineDatalist();
                }
                break;
        }

        // อัปเดตสถานะว่าแท็บนี้ถูกโหลดแล้ว
        tabLoadedState[targetTabId] = true;
    }

    // =================================================================
    // 2. SETUP EVENT LISTENERS (ติดตั้ง Event Listener ทั้งหมด)
    // =================================================================

    function showCorrectPagination(activeTabId) {
        const paginations = document.querySelectorAll('.sticky-bottom[data-tab-target]');
        paginations.forEach(pagination => {
            const isVisible = pagination.dataset.tabTarget === activeTabId;
            pagination.style.display = isVisible ? 'block' : 'none';
        });
    }

    // --- Tab Listener (จัดการการคลิกเปลี่ยนแท็บ) ---
    document.querySelectorAll('#settingsTab button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', event => {
            const targetPaneId = event.target.getAttribute('data-bs-target');
            loadTabData(targetPaneId);
            showCorrectPagination(targetPaneId);
        });
    });

    // --- Listeners for Locations Tab ---
    document.getElementById('addLocationBtn')?.addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm')?.addEventListener('submit', handleLocationFormSubmit);

    // --- Listeners for Stock Transfer Tab ---
    setupTransferAutocomplete();
    document.getElementById('addTransferBtn')?.addEventListener('click', openTransferModal);
    document.getElementById('transferForm')?.addEventListener('submit', handleTransferFormSubmit);
    document.getElementById('from_location_id')?.addEventListener('change', updateBothStockDisplays);
    document.getElementById('to_location_id')?.addEventListener('change', updateBothStockDisplays);
    ['filterPartNo', 'filterFromLocation', 'filterToLocation', 'filterStartDate', 'filterEndDate'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => {
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(() => fetchTransferHistory(1), 500);
        });
    });
    document.getElementById('transferTableBody')?.addEventListener('blur', (event) => {
        if (event.target.classList.contains('editable-cell')) {
            handleCellEdit(event);
        }
    }, true);


    // --- Listeners for Opening Balance Tab ---
    setupStockAdjustmentAutocomplete();
    document.getElementById('locationSelect')?.addEventListener('change', loadItemsForLocation);
    document.getElementById('saveStockBtn')?.addEventListener('click', saveStockTake);

    // --- Listeners for Item Master & Routes Tab ---
    setupItemMasterAutocomplete();
    setupModelFilterAutocomplete(); // **เพิ่ม: เรียกใช้ Autocomplete ของ Model**

    // Buttons for Item Master
    document.getElementById('addNewItemBtn')?.addEventListener('click', () => openItemModal());
    document.getElementById('exportItemsBtn')?.addEventListener('click', exportItemsToExcel);
    document.getElementById('importItemsBtn')?.addEventListener('click', () => document.getElementById('itemImportFile')?.click());
    document.getElementById('itemImportFile')?.addEventListener('change', handleItemImport);
    document.getElementById('toggleInactiveBtn')?.addEventListener('click', (event) => {
        const toggleBtn = event.currentTarget;
        toggleBtn.classList.toggle('active');
        fetchItems(1); // Re-fetch items with new filter
    });

    // Forms & Modals for Item Master
    document.getElementById('itemForm')?.addEventListener('submit', handleItemFormSubmit);
    document.getElementById('deleteItemBtn')?.addEventListener('click', deleteItem);

    // **[REFACTORED]** Logic for "Manage BOM" button
    document.getElementById('manageBomBtn')?.addEventListener('click', () => {
        const sap_no = document.getElementById('sap_no').value;
        const itemModalInstance = bootstrap.Modal.getInstance(document.getElementById('itemModal'));
        if (itemModalInstance) {
            itemModalInstance.hide();
        }
        
        // Switch to BOM Manager Tab and search for the item
        const bomTab = document.getElementById('bom-manager-tab');
        if (bomTab) {
            new bootstrap.Tab(bomTab).show();
            // Use a short timeout to ensure the tab is shown before manipulating its content
            setTimeout(() => {
                const searchInput = document.getElementById('bomSearchInput');
                if (searchInput) {
                    searchInput.value = sap_no;
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }, 150);
        }
    });

    // Forms & Modals for Routes
    document.getElementById('addNewRouteBtn')?.addEventListener('click', () => openRouteModal());
    document.getElementById('routeForm')?.addEventListener('submit', handleRouteFormSubmit);

    // --- Listeners for Schedule Modals (จาก modal_handler.js เดิม) ---
    document.getElementById('addScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.is_active = e.target.querySelector('[name="is_active"]').checked ? 1 : 0;
        const result = await sendRequest(PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);
        if (result.success) {
            closeModal('addScheduleModal');
            if (typeof loadSchedules === 'function') loadSchedules();
        }
    });
    document.getElementById('editScheduleForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = Object.fromEntries(new FormData(e.target).entries());
        payload.is_active = e.target.querySelector('[name="is_active"]').checked ? 1 : 0;
        const result = await sendRequest(PARA_API_ENDPOINT, 'save_schedule', 'POST', payload);
        if (result.success) {
            closeModal('editScheduleModal');
            if (typeof loadSchedules === 'function') loadSchedules();
        }
    });

    // =================================================================
    // 3. INITIAL PAGE LOAD (การทำงานเมื่อเปิดหน้าเว็บครั้งแรก)
    // =================================================================

    const urlParams = new URLSearchParams(window.location.search);
    const tabToOpen = urlParams.get('tab');

    // ถ้ามี 'tab' ใน URL ให้เปิดแท็บนั้นก่อน
    if (tabToOpen) {
        const tabElement = document.querySelector(`#settingsTab button[data-bs-target="#${tabToOpen}-pane"]`);
        if (tabElement) {
            new bootstrap.Tab(tabElement).show();
        }
    }

    // โหลดข้อมูลสำหรับแท็บที่ Active อยู่ (ไม่ว่าจะเป็น default หรือที่เปิดจาก URL)
    const activeTab = document.querySelector('#settingsTab button.active');
    if (activeTab) {
        const activePaneId = activeTab.getAttribute('data-bs-target');
        loadTabData(activePaneId);
    }
});