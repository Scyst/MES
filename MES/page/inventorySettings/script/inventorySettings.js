"use strict";

// --- API Endpoints ---
const LOCATIONS_API = 'api/locationsManage.php';
const TRANSFER_API = 'api/stockTransferManage.php';
const OPENING_BALANCE_API = 'api/openingBalanceManage.php';

// --- Global Variables ---
let allItems = []; // ใช้ร่วมกันระหว่าง Transfer และ Opening Balance
let currentEditingLocation = null;
let selectedItem = null;
let debounceTimer;
let currentPage = 1;
const ROWS_PER_PAGE = 50;


// --- Shared Utility Function ---
async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            url += `&${new URLSearchParams(params).toString()}`;
        }
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
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
    }
}


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

function openLocationModal(location = null) {
    currentEditingLocation = location;
    const form = document.getElementById('locationForm');
    const modalLabel = document.getElementById('locationModalLabel');
    const deleteBtn = document.getElementById('deleteLocationBtn');
    
    form.reset();
    
    if (location) {
        modalLabel.textContent = 'Edit Location';
        document.getElementById('location_id').value = location.location_id;
        document.getElementById('location_name').value = location.location_name;
        document.getElementById('location_description').value = location.location_description;
        document.getElementById('is_active').checked = location.is_active == 1; // ** แก้ไขตรงนี้ด้วย **
        deleteBtn.classList.remove('d-none');
    } else {
        modalLabel.textContent = 'Add New Location';
        document.getElementById('location_id').value = '0';
        document.getElementById('is_active').checked = true;
        deleteBtn.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('locationModal'));
    modal.show();
}

async function handleLocationFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    data.is_active = document.getElementById('is_active').checked;

    showSpinner();
    try {
        const result = await sendRequest(LOCATIONS_API, 'save_location', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
            await loadLocations();
        }
    } finally {
        hideSpinner();
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
            // ** CHANGED: แก้ไขการเรียกใช้ renderPagination **
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
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transfer history found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(row.transaction_timestamp).toLocaleString()}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-end">${parseFloat(row.quantity).toLocaleString()}</td>
            <td>${row.from_location || 'N/A'}</td>
            <td>${row.to_location || 'N/A'}</td>
            <td>${row.created_by || 'N/A'}</td>
            <td>${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
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
    const searchInput = document.getElementById('itemSearch');
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

function renderItemsTable(items) {
    const tableBody = document.getElementById('stockTakeTableBody');
    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No items found to display.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.itemId = item.item_id;
        tr.innerHTML = `
            <td>${item.sap_no}</td>
            <td>${item.part_no}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-end">${parseFloat(item.onhand_qty).toLocaleString()}</td>
            <td>
                <input type="number" class="form-control form-control-sm stock-input" 
                       value="${parseFloat(item.onhand_qty)}"
                       min="0" step="any">
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function filterItems() {
    const searchTerm = document.getElementById('itemSearch').value.toLowerCase();
    const filteredItems = allItems.filter(item => 
        item.sap_no.toLowerCase().includes(searchTerm) ||
        item.part_no.toLowerCase().includes(searchTerm) ||
        (item.part_description || '').toLowerCase().includes(searchTerm)
    );
    renderItemsTable(filteredItems);
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

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Location Manager Init
    loadLocations();
    document.getElementById('addLocationBtn').addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm').addEventListener('submit', handleLocationFormSubmit);
    document.getElementById('deleteLocationBtn').addEventListener('click', deleteLocation);

    // Stock Transfer Init
    populateTransferInitialData();
    setupTransferAutocomplete();
    fetchTransferHistory();
    document.getElementById('addTransferBtn').addEventListener('click', openTransferModal);
    document.getElementById('transferForm').addEventListener('submit', handleTransferFormSubmit);
    document.getElementById('from_location_id').addEventListener('change', () => updateStockDisplay('from_location_id', 'fromStock'));
    document.getElementById('to_location_id').addEventListener('change', () => updateStockDisplay('to_location_id', 'toStock'));
    const filterIds = ['filterPartNo', 'filterFromLocation', 'filterToLocation', 'filterStartDate', 'filterEndDate'];
    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchTransferHistory(1), 500);
            });
        }
    });

    // Opening Balance Init
    populateOpeningBalanceLocations();
    document.getElementById('locationSelect').addEventListener('change', loadItemsForLocation);
    document.getElementById('itemSearch').addEventListener('input', filterItems);
    document.getElementById('saveStockBtn').addEventListener('click', saveStockTake);
}); 