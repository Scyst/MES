"use strict";

const API_ENDPOINT = 'api/stockTransferManage.php';
let allItems = []; 
let selectedItem = null; 
let debounceTimer;
let currentPage = 1;
const ROWS_PER_PAGE = 50;

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
        const result = await sendRequest('get_transfer_history', 'GET', null, params);
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

async function populateInitialData() {
    const result = await sendRequest('get_initial_data', 'GET');
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

    const result = await sendRequest('get_stock_onhand', 'GET', null, { item_id: selectedItem.item_id, location_id: locationId });
    if (result.success) {
        displaySpan.textContent = parseFloat(result.quantity).toLocaleString();
    }
}

async function handleFormSubmit(event) {
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
        const result = await sendRequest('execute_transfer', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
            fetchTransferHistory(); // Refresh history
        }
    } finally {
        hideSpinner();
    }
}

// ** MOVED: Moved this function before setupAutocomplete to fix the error **
const updateBothStockDisplays = () => {
    updateStockDisplay('from_location_id', 'fromStock');
    updateStockDisplay('to_location_id', 'toStock');
};

function setupAutocomplete() {
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
        const result = await sendRequest('get_transfer_history', 'GET', null, params);
        if (result.success) {
            renderTransferTable(result.data);
            renderPagination('paginationControls', result.total, result.page, ROWS_PER_PAGE, fetchTransferHistory);
        }
    } finally {
        hideSpinner();
    }
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

document.addEventListener('DOMContentLoaded', () => {
    populateInitialData();
    setupAutocomplete();
    fetchTransferHistory(); // Load initial history

    document.getElementById('addTransferBtn').addEventListener('click', openTransferModal);
    document.getElementById('transferForm').addEventListener('submit', handleFormSubmit);
    
    const fromSelect = document.getElementById('from_location_id');
    const toSelect = document.getElementById('to_location_id');
    fromSelect.addEventListener('change', () => updateStockDisplay('from_location_id', 'fromStock'));
    toSelect.addEventListener('change', () => updateStockDisplay('to_location_id', 'toStock'));
    
    // Add event listeners for filters
    const filterIds = ['filterPartNo', 'filterFromLocation', 'filterToLocation', 'filterStartDate', 'filterEndDate'];
    filterIds.forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fetchTransferHistory(1), 500);
        });
    });
});