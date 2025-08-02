"use strict";

const API_ENDPOINT = 'api/openingBalanceManage.php';
let allItems = []; // Store all items for the selected location

async function sendRequest(action, method, body = null, params = null) {
    try {
        let url = `${API_ENDPOINT}?action=${action}`;
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

async function populateLocations() {
    const locationSelect = document.getElementById('locationSelect');
    const result = await sendRequest('get_locations', 'GET');
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
        const result = await sendRequest('get_items_for_location', 'GET', null, { location_id: locationId });
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
        const result = await sendRequest('save_stock_take', 'POST', { location_id: locationId, stock_data: stock_data });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            await loadItemsForLocation(); // Refresh data
        }
    } finally {
        hideSpinner();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    populateLocations();
    
    document.getElementById('locationSelect').addEventListener('change', loadItemsForLocation);
    document.getElementById('itemSearch').addEventListener('input', filterItems);
    document.getElementById('saveStockBtn').addEventListener('click', saveStockTake);
});