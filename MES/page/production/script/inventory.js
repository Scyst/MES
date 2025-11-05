"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES & CONSTANTS
// =================================================================
const INVENTORY_API_URL = 'api/inventoryManage.php';
const ROWS_PER_PAGE = 50;

// State variables
let productionHistoryCurrentPage = 1;
let receiptHistoryCurrentPage = 1;
let wipByLotCurrentPage = 1;
let varianceCurrentPage = 1;
let wipOnHandCurrentPage = 1;
let stockCountCurrentPage = 1;
let transactionLogCurrentPage = 1;

let allItems = [];
let selectedInItem = null;
let selectedOutItem = null;

// =================================================================
// SECTION: CORE & UTILITY FUNCTIONS
// =================================================================

function saveFiltersToLocalStorage() {
    const filters = {
        search_term: document.getElementById('filterSearch').value,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    localStorage.setItem('inventoryUIFilters', JSON.stringify(filters));
}

function initializeFilters() {
    const savedFilters = localStorage.getItem('inventoryUIFilters');
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        document.getElementById('filterSearch').value = filters.search_term || '';
        document.getElementById('filterCountType').value = filters.count_type || '';
        document.getElementById('filterStartDate').value = filters.startDate || dateStr;
        document.getElementById('filterEndDate').value = filters.endDate || dateStr;
    } else {
        document.getElementById("filterStartDate").value = dateStr;
        document.getElementById("filterEndDate").value = dateStr;
    }
}

function handleFilterChange() {
    saveFiltersToLocalStorage();
    const activeTabId = document.querySelector('#mainTab .nav-link.active')?.id;
    if (!activeTabId) return;

    // Reset page to 1 on any filter change
    switch (activeTabId) {
        case 'production-variance-tab':
            fetchProductionVarianceReport(1);
            break;
        case 'wip-by-lot-tab':
            fetchWipReportByLot(1);
            break;
        case 'entry-history-tab':
            fetchReceiptHistory(1);
            break;
        case 'production-history-tab':
            fetchProductionHistory(1);
            break;
        case 'wip-onhand-tab':
            fetchWipOnHandReport(1);
            break;
        case 'stock-count-tab':
            fetchStockInventoryReport(1);
            break;
        case 'transaction-log-tab':
            fetchAllTransactions(1);
            break;
    }
}

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

function updateFilterVisibility(activeTabId) {
    const searchEl = document.getElementById('filterSearch');
    const typeEl = document.getElementById('filterCountType');
    const dateRangeEl = document.getElementById('date-range-filter');

    // Default state: hide everything then show what's needed
    searchEl.style.display = 'none';
    typeEl.style.display = 'none';
    dateRangeEl.style.display = 'none';
    
    searchEl.placeholder = 'Search...'; 

    switch (activeTabId) {
        case 'production-variance-tab':
        case 'wip-by-lot-tab':
        case 'entry-history-tab':
        case 'transaction-log-tab':
            searchEl.style.display = 'block';
            dateRangeEl.style.display = 'flex';
            searchEl.placeholder = 'Search Part No, SAP, Lot, Location...';
            break;
            
        case 'production-history-tab':
            searchEl.style.display = 'block';
            typeEl.style.display = 'block';
            dateRangeEl.style.display = 'flex';
            searchEl.placeholder = 'Search Part No, SAP, Lot, Location...';
            break;

        case 'wip-onhand-tab':
            searchEl.style.display = 'block';
            searchEl.placeholder = 'Search Part No, SAP, Location...';
            break;

        case 'stock-count-tab':
            searchEl.style.display = 'block';
            searchEl.placeholder = 'Search Part No, SAP, Description...';
            break;
    }
}

function updateControls(activeTabId) {
    const buttonGroup = document.getElementById('dynamic-button-group');
    const summaryContainer = document.getElementById('dynamic-summary-container');
    if (!buttonGroup || !summaryContainer) return;

    buttonGroup.innerHTML = '';
    summaryContainer.innerHTML = '';

    switch (activeTabId) {
        case 'production-history-tab':
            buttonGroup.innerHTML = `
                <button class="btn btn-info" onclick="openSummaryModal(this)">Summary</button>
                <button class="btn btn-primary" onclick="exportProductionHistoryToExcel()">Export</button>
                ${canAdd ? '<button class="btn btn-success" onclick="openAddPartModal(this)">Add (OUT)</button>' : ''}
            `;
            summaryContainer.innerHTML = '<div id="grandSummary" class="summary-grand-total"></div>';
            break;
        case 'entry-history-tab':
            buttonGroup.innerHTML = `
                <button class="btn btn-info" onclick="openHistorySummaryModal()">Summary</button>
                <button class="btn btn-primary" onclick="exportHistoryToExcel()">Export</button>
                ${canAdd ? '<button class="btn btn-success" onclick="openAddEntryModal(this)">Add (IN)</button>' : ''}
            `;
            break;
        case 'wip-report-tab':
            buttonGroup.innerHTML = `<button class="btn btn-primary" onclick="exportWipReportToExcel()">Export</button>`;
            break;
    }
}

function applyTimeMask(event) {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); 

    if (value.length > 2) {
        value = value.substring(0, 2) + ':' + value.substring(2);
    }
    if (value.length > 5) {
        value = value.substring(0, 5) + ':' + value.substring(5);
    }
    input.value = value.substring(0, 8);
}

// =================================================================
// SECTION: NEW INVENTORY SYSTEM FUNCTIONS
// =================================================================

// --- Functions for Entry History Tab (IN) ---

function setupEntryAutocomplete() {
    const searchInput = document.getElementById('entry_item_search');
    if (!searchInput) return;

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        selectedInItem = null;
        document.getElementById('entry_item_id').value = '';

        if (value.length < 2) return;

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
                selectedInItem = item;
                document.getElementById('entry_item_id').value = item.item_id;
                updateAvailableStockDisplay(); // <-- เพิ่มบรรทัดนี้
                resultsWrapper.innerHTML = '';
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

// --- Functions for Production History Tab (OUT) ---
function setupProductionAutocomplete() {
    const searchInput = document.getElementById('out_item_search');
    if (!searchInput) return;

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        selectedOutItem = null;
        document.getElementById('out_item_id').value = '';

        if (value.length < 2) return;

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
                selectedOutItem = item;
                document.getElementById('out_item_id').value = item.item_id;
                resultsWrapper.innerHTML = '';
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

// =================================================================
// SECTION: REPORTING FUNCTIONS
// =================================================================
// --- Functions for Production Variance Tab ---
async function fetchProductionVarianceReport(page = 1) {
    varianceCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_production_variance_report', 'GET', null, params);
        if (result.success) {
            renderProductionVarianceTable(result.data);
            renderPagination('productionVariancePagination', result.total, result.page, ROWS_PER_PAGE, fetchProductionVarianceReport);
        }
    } finally {
        hideSpinner();
    }
}

function renderProductionVarianceTable(data) {
    const tbody = document.getElementById('productionVarianceTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No production variance data found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to see transaction details';
        if (row.location_id) {
            tr.addEventListener('click', () => openVarianceDetailModal(row.item_id, row.location_id, row.part_no));
        }

        const variance = parseFloat(row.variance) || 0;
        let textColorClass = '';

        if (variance < 0) {
            textColorClass = 'text-danger'; 
        } else if (variance === 0) {
            textColorClass = 'text-success';
        } else {
            textColorClass = 'text-warning';
        }

        tr.innerHTML = `
            <td class="text-start">${row.location_name}</td>
            <td class="text-start">${row.sap_no}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.model || ''}</td>
            <td class="text-center">${row.part_description || ''}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for WIP By Lot Tab ---
async function fetchWipReportByLot(page = 1) {
    wipByLotCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_wip_report_by_lot', 'GET', null, params);
        if (result.success) {
            renderWipReportByLotTable(result.data);
            renderPagination('wipByLotPagination', result.total, result.page, ROWS_PER_PAGE, fetchWipReportByLot);
        }
    } finally {
        hideSpinner();
    }
}

function renderWipReportByLotTable(data) {
    const tbody = document.getElementById('wipByLotTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No active WIP lots found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        const variance = parseFloat(row.variance) || 0;
        let textColorClass = '';

        if (variance < 0) {
            textColorClass = 'text-danger'; 
        } else if (variance === 0) {
            textColorClass = 'text-success';
        } else {
            textColorClass = 'text-warning';
        }
        
        tr.innerHTML = `
            <td class="text-start">${row.sap_no}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.model || ''}</td>
            <td class="text-start">${row.part_description || ''}</td>
            <td class="text-center">${row.lot_no}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for Entry History Tab (IN) ---
async function fetchReceiptHistory(page = 1) {
    receiptHistoryCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history', 'GET', null, params);
        if (result.success) {
            renderReceiptHistoryTable(result.data);
            renderPagination('entryHistoryPagination', result.total, result.page, ROWS_PER_PAGE, fetchReceiptHistory);
        }
    } finally {
        hideSpinner();
    }
}

function renderReceiptHistoryTable(data) {
    const tbody = document.getElementById('entryHistoryTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No IN transactions found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to edit';
        tr.addEventListener('click', () => editTransaction(row.transaction_id, 'entry'));

        const transactionDate = new Date(row.transaction_timestamp);
        
        tr.innerHTML = `
            <td class="text-start">${transactionDate.toLocaleDateString('en-GB')}</td>
            <td class="text-start">${transactionDate.toTimeString().substring(0, 8)}</td>
            <td class="text-center">${row.source_location || 'External'}</td>
            <td class="text-center">${row.destination_location || 'N/A'}</td>
            <td class="text-center">${row.sap_no}</td>
            <td class="text-center">${row.part_no}</td>
            <td class="text-center">${row.model || ''}</td>
            <td class="text-center">${row.lot_no || ''}</td>
            <td  class="text-center">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for Production History Tab (OUT) ---
async function fetchProductionHistory(page = 1) {
    productionHistoryCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);
        if (result.success) {
            renderProductionHistoryTable(result.data);
            renderPagination('paginationControls', result.total, result.page, ROWS_PER_PAGE, fetchProductionHistory);
        }
    } finally {
        hideSpinner();
    }
}

function renderProductionHistoryTable(data) {
    const tbody = document.getElementById('partTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No production history found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = row.transaction_id;
        tr.style.cursor = 'pointer';
        tr.title = 'Click to edit';
        tr.addEventListener('click', () => editTransaction(row.transaction_id, 'production'));

        const transactionDate = new Date(row.transaction_timestamp);

        const startTimeStr = row.start_time || '00:00:00';
        const endTimeStr = row.end_time || '00:00:00';
        const timeRange = (row.start_time && row.end_time) ? `${startTimeStr} - ${endTimeStr}` : (transactionDate.toTimeString().substring(0, 8));
        let durationInMinutes = '-';
        if (row.start_time && row.end_time) {
            const startDate = new Date(`1970-01-01T${startTimeStr}Z`);
            const endDate = new Date(`1970-01-01T${endTimeStr}Z`);
            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            const diffMs = endDate - startDate;
            durationInMinutes = Math.round(diffMs / 60000);
        }
        
        tr.innerHTML = `
            <td class="text-start">${transactionDate.toLocaleDateString('en-GB')}</td>
            <td class="text-start">${timeRange}</td>
            <td class="text-center">${durationInMinutes}</td>
            <td class="text-center">${row.location_name || 'N/A'}</td>
            <td class="text-center">${row.part_no}</td>
            <td class="text-center">${row.model || ''}</td>
            <td class="text-center">${row.lot_no || ''}</td>
            <td class="text-center">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.count_type}</td>
            <td class="text-center">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for WIP On-Hand Tab ---
async function fetchWipOnHandReport(page = 1) {
    wipOnHandCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_wip_onhand_report', 'GET', null, params);
        if (result.success) {
            renderWipOnHandTable(result.data);
            renderPagination('wipOnHandPagination', result.total, result.page, ROWS_PER_PAGE, fetchWipOnHandReport);
        }
    } finally {
        hideSpinner();
    }
}

function renderWipOnHandTable(data) {
    const tbody = document.getElementById('wipOnHandTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No Work-in-Progress items found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to adjust stock';
        tr.addEventListener('click', () => openAdjustStockModal(row));

        const onHandQty = parseFloat(row.quantity) || 0;
        tr.innerHTML = `
            <td class="text-start">${row.location_name}</td>
            <td class="text-start">${row.sap_no}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.model || ''}</td>
            <td class="text-start">${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for Stock Count Tab ---
async function fetchStockInventoryReport(page = 1) {
    stockCountCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_stock_inventory_report', 'GET', null, params);
        if (result.success) {
            renderStockInventoryTable(result.data);
            renderPagination('stockCountPagination', result.total, result.page, ROWS_PER_PAGE, fetchStockInventoryReport);
        }
    } finally {
        hideSpinner();
    }
}

function renderStockInventoryTable(data) {
    const tbody = document.getElementById('stockCountTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No stock found for the current filter.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');

        tr.style.cursor = 'pointer';
        tr.title = 'Click to see details by location';
        tr.addEventListener('click', () => openStockDetailModal(row.item_id, row.part_no));

        const onHandQty = parseFloat(row.total_onhand) || 0;

        tr.innerHTML = `
            <td class="text-start">${row.sap_no}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.used_models || '-'}</td>
            <td class="text-start">${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Functions for Transaction Log Tab ---
async function fetchAllTransactions(page = 1) {
    transactionLogCurrentPage = page;
    showSpinner();
    const params = {
        page: page,
        search_term: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_all_transactions', 'GET', null, params);
        if (result.success) {
            renderAllTransactionsTable(result.data);
            renderPagination('transactionLogPagination', result.total, result.page, ROWS_PER_PAGE, fetchAllTransactions);
        }
    } finally {
        hideSpinner();
    }
}

function renderAllTransactionsTable(data) {
    const tbody = document.getElementById('transactionLogTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No transactions found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        const transactionDate = new Date(row.transaction_timestamp);
        const quantity = parseFloat(row.quantity);

        let quantityClass = '';
        let quantityPrefix = '';
        if (quantity > 0) {
            quantityClass = 'text-success';
            quantityPrefix = '+';
        } else if (quantity < 0) {
            quantityClass = 'text-danger';
        }
        
        tr.innerHTML = `
            <td class="text-start">${transactionDate.toLocaleString('en-GB')}</td>
            <td class="text-start">${row.source_location || 'N/A'}</td>
            <td class="text-start">${row.destination_location || 'N/A'}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.model || ''}</td>
            <td class="text-center">${row.lot_no || ''}</td>
            <td class="text-center fw-bold ${quantityClass}">${quantityPrefix}${quantity.toLocaleString()}</td>
            <td class="text-center"><span class="badge bg-secondary">${row.transaction_type}</span></td>
            <td class="text-center">${row.username || 'N/A'}</td>
            <td class="text-center">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =================================================================
// SECTION: MODAL HANDLING
// =================================================================

async function populateModalDatalists() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
     if (result.success) {
        allItems = result.items;

        const inToLocationSelect = document.getElementById('entry_to_location_id');
        const inFromLocationSelect = document.getElementById('entry_from_location_id');
        const outLocationSelect = document.getElementById('out_location_id');
        const editInLocationSelect = document.getElementById('edit_entry_location_id');
        const editOutLocationSelect = document.getElementById('edit_production_location_id');

        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        if (inToLocationSelect) {
            inToLocationSelect.innerHTML = '<option value="">-- Select Destination --</option>' + optionsHtml;
        }
        if (outLocationSelect) {
            outLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
        if (editInLocationSelect) {
            editInLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
        if (editOutLocationSelect) {
            editOutLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }

        if (inFromLocationSelect) {
            const fromOptionsHtml = `<option value="">-- From Warehouse / External --</option>` + optionsHtml;
            inFromLocationSelect.innerHTML = fromOptionsHtml;
        }
    }
}

function openAddPartModal() {
    const form = document.getElementById('addPartForm');
    if (form) form.reset();

    selectedOutItem = null;
    document.getElementById('out_item_id').value = '';
    const searchInput = document.getElementById('out_item_search');
    searchInput.value = '';

    const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry'));
    if (lastData) {
        const locationSelect = document.getElementById('out_location_id');
        if (locationSelect) locationSelect.value = lastData.location_id || '';
        searchInput.value = lastData.item_display_text || '';
        document.getElementById('out_item_id').value = lastData.item_id || '';
        if (lastData.item_id) {
            selectedOutItem = allItems.find(item => item.item_id == lastData.item_id) || null;
        }
    }
    const now = new Date();
    document.getElementById('out_log_date').value = now.toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('addPartModal')).show();
}

function openAddEntryModal() {
    // 1. รีเซ็ตฟอร์มและค่า state ต่างๆ
    const form = document.getElementById('addEntryForm');
    if(form) form.reset();
    
    selectedInItem = null;
    document.getElementById('entry_item_id').value = '';
    document.getElementById('entry_item_search').value = '';

    const stockDisplay = document.getElementById('entry_available_stock');
    if(stockDisplay) stockDisplay.textContent = '--';

    // 2. ตั้งค่าวันที่และเวลาปัจจุบันเป็นค่าเริ่มต้นเสมอ
    const now = new Date();
    document.getElementById('entry_log_date').value = now.toISOString().split('T')[0];
    document.getElementById('entry_log_time').value = now.toTimeString().substring(0, 8);

    // 3. โหลดข้อมูลล่าสุดจาก localStorage (ถ้ามี)
    const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry'));
    if (lastData) {
        // 3.1 ตั้งค่า Item ที่เคยเลือกไว้
        document.getElementById('entry_item_search').value = lastData.item_display_text || '';
        document.getElementById('entry_item_id').value = lastData.item_id || '';
        if (lastData.item_id) {
            selectedInItem = allItems.find(item => item.item_id == lastData.item_id) || null;
        }
        
        // 3.2 ตั้งค่า Dropdown Location ทั้งสองช่อง
        if (lastData.from_location_id) {
            document.getElementById('entry_from_location_id').value = lastData.from_location_id;
        }
        if (lastData.to_location_id) {
            document.getElementById('entry_to_location_id').value = lastData.to_location_id;
        }
    }
    
    // 4. อัปเดตการแสดงผล Available Stock หลังจากตั้งค่าเริ่มต้นทั้งหมดแล้ว
    updateAvailableStockDisplay();
    
    // 5. แสดง Modal
    new bootstrap.Modal(document.getElementById('addEntryModal')).show();
}

async function openStockDetailModal(itemId, partNo) {
    const modalElement = document.getElementById('stockDetailModal');
    const modalTitle = document.getElementById('stockDetailModalLabel');
    const modalBody = document.getElementById('stockDetailTableBody');

    modalTitle.textContent = `Stock Details for: ${partNo}`;
    modalBody.innerHTML = '<tr><td colspan="2" class="text-center">Loading details...</td></tr>';
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    const result = await sendRequest(INVENTORY_API_URL, 'get_stock_details_by_item', 'GET', null, { item_id: itemId });

    modalBody.innerHTML = '';
    if (result.success && result.data.length > 0) {
        result.data.forEach(detail => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${detail.location_name}</td>
                <td class="text-end">${parseFloat(detail.quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });
    } else {
        modalBody.innerHTML = '<tr><td colspan="2" class="text-center">No stock found in any location.</td></tr>';
    }
}

function handleDeleteFromModal(type) {
    let transactionId;
    let modalId;

    if (type === 'entry') {
        transactionId = document.getElementById('edit_entry_transaction_id').value;
        modalId = 'editEntryModal';
    } else {
        transactionId = document.getElementById('edit_production_transaction_id').value;
        modalId = 'editProductionModal';
    }

    if (!transactionId) {
        showToast('Cannot find Transaction ID to delete.', 'var(--bs-danger)');
        return;
    }

    const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modalInstance) {
        modalInstance.hide();
    }
    deleteTransaction(transactionId, type);
}

async function openVarianceDetailModal(itemId, locationId, partNo, lotNo = null) {
    const modalElement = document.getElementById('varianceDetailModal');
    const modalTitle = document.getElementById('varianceDetailModalLabel');
    const inTableBody = document.getElementById('detailInTableBody');
    const outTableBody = document.getElementById('detailOutTableBody');
    const totalInSpan = document.getElementById('detailTotalIn');
    const totalOutSpan = document.getElementById('detailTotalOut');

    let title = `Details for: ${partNo}`;
    if (lotNo) title += ` (Lot: ${lotNo})`;
    modalTitle.textContent = title;

    inTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
    outTableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
    
    const modal = new bootstrap.Modal(modalElement);
    modal.show();

    const params = {
        item_id: itemId,
        location_id: locationId,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value
    };
    if (lotNo) params.lot_no = lotNo; // (ยังไม่ได้ใช้ใน backend แต่เผื่อไว้)

    const result = await sendRequest(INVENTORY_API_URL, 'get_variance_details', 'GET', null, params);

    // Render IN table
    inTableBody.innerHTML = '';
    let totalIn = 0;
    if (result.success && result.data.in_records.length > 0) {
        result.data.in_records.forEach(rec => {
            const qty = parseFloat(rec.quantity);
            totalIn += qty;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(rec.transaction_timestamp).toLocaleString()}</td>
                <td><span class="badge bg-secondary">${rec.transaction_type}</span></td>
                <td class="text-end">${qty.toLocaleString()}</td>
            `;
            inTableBody.appendChild(tr);
        });
    } else {
        inTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No IN records found.</td></tr>';
    }
    totalInSpan.textContent = totalIn.toLocaleString();
    
    // Render OUT table
    outTableBody.innerHTML = '';
    let totalOut = 0;
    if (result.success && result.data.out_records.length > 0) {
        result.data.out_records.forEach(rec => {
            const qty = Math.abs(parseFloat(rec.quantity));
            totalOut += qty;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(rec.transaction_timestamp).toLocaleString()}</td>
                <td><span class="badge bg-secondary">${rec.transaction_type.replace('PRODUCTION_', '')}</span></td>
                <td class="text-end">${qty.toLocaleString()}</td>
            `;
            outTableBody.appendChild(tr);
        });
    } else {
        outTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No OUT records found.</td></tr>';
    }
    totalOutSpan.textContent = totalOut.toLocaleString();
}

function openAdjustStockModal(itemData) {
    const modal = document.getElementById('adjustStockModal');
    if (!modal) return;

    // Populate hidden fields
    modal.querySelector('#adjust_item_id').value = itemData.item_id;
    // location_id อาจมาจากคนละ field name ขึ้นอยู่กับตาราง
    modal.querySelector('#adjust_location_id').value = itemData.location_id || itemData.onhand_location_id; 

    // Populate display fields
    modal.querySelector('#adjust_item_display').value = `${itemData.sap_no} | ${itemData.part_no}`;
    modal.querySelector('#adjust_location_display').value = itemData.location_name;
    modal.querySelector('#adjust_current_onhand').value = parseFloat(itemData.quantity || itemData.total_onhand).toLocaleString();

    // Reset interactive fields
    modal.querySelector('#adjust_physical_count').value = '';
    modal.querySelector('#adjust_notes').value = '';

    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

async function openSummaryModal() {
    const modalBody = document.getElementById('summaryTableBody');
    if (!modalBody) {
        console.error('Summary modal body not found!');
        return;
    }
    modalBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading summary...</td></tr>';

    const summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
    summaryModal.show();

    const params = {
        limit: -1, // Request all data
        search_term: document.getElementById('filterSearch').value,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    // <== [แก้ไข] เรียก get_production_history เหมือนเดิม
    const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);

    // <== [แก้ไข] เช็ค result.data แทน result.summary
    if (result.success && result.data && result.data.length > 0) {
        modalBody.innerHTML = '';
        
        // --- คำนวณ Summary จาก result.data ---
        const summary = {}; // ใช้ Object เพื่อรวมยอดตาม Item และ Type
        let grandTotal = 0;

        // <== [แก้ไข] วนลูป result.data
        result.data.forEach(row => {
            const key = `${row.sap_no}|${row.part_no}|${row.count_type}`; // สร้าง Key เฉพาะตัว
            if (!summary[key]) {
                summary[key] = {
                    sap_no: row.sap_no,
                    part_no: row.part_no,
                    count_type: row.count_type,
                    total_quantity: 0
                };
            }
            const quantity = parseFloat(row.quantity) || 0;
            summary[key].total_quantity += quantity;
            grandTotal += quantity; // รวมยอด Grand Total ไปด้วยเลย
        });
        
        // --- แสดงผล Summary ที่คำนวณได้ ---
        // แปลง Object summary เป็น Array แล้วเรียงลำดับ
        const sortedSummary = Object.values(summary).sort((a, b) => {
            if (a.sap_no !== b.sap_no) return a.sap_no.localeCompare(b.sap_no);
            if (a.part_no !== b.part_no) return a.part_no.localeCompare(b.part_no);
            return a.count_type.localeCompare(b.count_type);
        });

        sortedSummary.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.sap_no}</td>
                <td>${row.part_no}</td>
                <td>${row.count_type}</td>
                <td class="text-end">${parseFloat(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });
        // --- สิ้นสุดการแสดงผล Summary ---


        // --- Grand Total ---
        const grandTotalRow = document.createElement('tr');
        grandTotalRow.className = 'table-group-divider fw-bold';
        grandTotalRow.innerHTML = `
            <td colspan="3" class="text-end">Grand Total</td>
            <td class="text-end">${grandTotal.toLocaleString()}</td>
        `;
        modalBody.appendChild(grandTotalRow);

    } else {
        modalBody.innerHTML = '<tr><td colspan="4" class="text-center">No summary data available.</td></tr>';
    }
}

async function openHistorySummaryModal() {
    const modalBody = document.getElementById('historySummaryTableBody');
    if (!modalBody) {
        console.error('History Summary modal body not found!');
        return;
    }
    modalBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading summary...</td></tr>';
    
    const summaryModal = new bootstrap.Modal(document.getElementById('historySummaryModal'));
    summaryModal.show();

    const params = {
        limit: -1, // ขอข้อมูลทั้งหมดเพื่อทำ Summary
        search_term: document.getElementById('filterSearch').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    // เราจะเรียก API เดิม แต่ต้องไปแก้ API ให้ส่งค่า Summary กลับมาด้วย
    const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history_summary', 'GET', null, params);

    if (result.success && result.summary.length > 0) {
        modalBody.innerHTML = '';
        result.summary.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.sap_no}</td>
                <td>${row.part_no}</td>
                <td><span class="badge bg-secondary">${row.transaction_type}</span></td>
                <td class="text-end">${parseFloat(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        const grandTotalRow = document.createElement('tr');
        grandTotalRow.className = 'table-group-divider fw-bold';
        let grandTotal = 0;
        result.grand_total.forEach(row => grandTotal += parseFloat(row.total_quantity));
        grandTotalRow.innerHTML = `
            <td colspan="3" class="text-end">Grand Total</td>
            <td class="text-end">${grandTotal.toLocaleString()}</td>
        `;
        modalBody.appendChild(grandTotalRow);

    } else {
        modalBody.innerHTML = '<tr><td colspan="4" class="text-center">No summary data available.</td></tr>';
    }
}

async function handleAdjustStockSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());

    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'adjust_single_stock', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');

        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('adjustStockModal')).hide();
            // Refresh the currently active tab's data
            handleFilterChange();
        }
    } finally {
        hideSpinner();
    }
}

async function updateAvailableStockDisplay() {
    const display = document.getElementById('entry_available_stock');
    const fromLocationId = document.getElementById('entry_from_location_id').value;

    display.textContent = '--';
    display.classList.remove('text-danger', 'text-white'); 

    if (!selectedInItem || !fromLocationId) {
        return;
    }

    display.textContent = 'Loading...';
    const result = await sendRequest(INVENTORY_API_URL, 'get_stock_onhand', 'GET', null, { 
        item_id: selectedInItem.item_id, 
        location_id: fromLocationId 
    });

    if (result.success) {
        const quantity = parseFloat(result.quantity);
        display.textContent = quantity.toLocaleString();
        if (quantity < 0) {
            display.classList.add('text-danger');
        } else {
            display.classList.add('text-white');
        }
    } else {
        display.textContent = 'Error';
        display.classList.add('text-danger');
    }
}

// --- Central Form Submission Handler ---
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;

    // === ⭐️ 1. Logic สำหรับ "ADD" (ยังคงใช้ Dropdown) ⭐️ ===
    if (action === 'addPart') {
        showSpinner();
        
        // (อ่านค่าจาก Dropdown "time_slot")
        const timeSlot = form.querySelector('#out_time_slot').value; 
        const [startTime, endTime] = timeSlot.split('|');
        if (!startTime || !endTime) {
            showToast('Invalid time slot selected.', 'var(--bs-danger)');
            hideSpinner(); return;
        }

        // (สร้าง baseData โดยใช้ startTime/endTime ที่แปลงแล้ว)
        const baseData = {
            item_id: form.querySelector('#out_item_id').value,
            location_id: form.querySelector('#out_location_id').value,
            lot_no: form.querySelector('#out_lot_no').value,
            log_date: form.querySelector('#out_log_date').value,
            start_time: startTime, // ⭐️
            end_time: endTime,     // ⭐️
            notes: form.querySelector('#out_notes').value
        };

        if (!baseData.item_id || !baseData.location_id) {
            showToast('Please select a valid item and location.', 'var(--bs-warning)');
            hideSpinner();
            return;
        }

        const transactions = [];
        const qtyFg = parseFloat(form.querySelector('#out_qty_fg').value) || 0;
        const qtyHold = parseFloat(form.querySelector('#out_qty_hold').value) || 0;
        const qtyScrap = parseFloat(form.querySelector('#out_qty_scrap').value) || 0;

        if (qtyFg > 0) transactions.push({ quantity: qtyFg, count_type: 'FG' });
        if (qtyHold > 0) transactions.push({ quantity: qtyHold, count_type: 'HOLD' });
        if (qtyScrap > 0) transactions.push({ quantity: qtyScrap, count_type: 'SCRAP' });

        if (transactions.length === 0) {
            showToast('Please enter a quantity for at least one type.', 'var(--bs-warning)');
            hideSpinner();
            return;
        }
        
        let allSuccess = true;
        let lastErrorMessage = '';
        for (const trans of transactions) {
            const dataToSend = { ...baseData, ...trans };
            const result = await sendRequest(INVENTORY_API_URL, 'execute_production', 'POST', dataToSend);
            if (!result.success) { allSuccess = false; lastErrorMessage = result.message; break; }
        }
        hideSpinner();
        if (allSuccess) {
            showToast('All production records saved successfully.', 'var(--bs-success)');
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await fetchProductionHistory();
        } else {
            showToast(`An error occurred: ${lastErrorMessage}. Some records may not have been saved.`, 'var(--bs-danger)');
        }
        return;
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    let endpoint = INVENTORY_API_URL;
    let apiAction = '';
    let successCallback = null;

    if (action === 'editProduction') {
        apiAction = 'update_transaction';
        successCallback = () => fetchProductionHistory(productionHistoryCurrentPage);

    } else if (action === 'addEntry') {
        apiAction = 'execute_receipt';
        successCallback = fetchReceiptHistory;
    } else if (action === 'editEntry') {
        apiAction = 'update_transaction';
        successCallback = () => fetchReceiptHistory(receiptHistoryCurrentPage);
    }

    if (!apiAction) {
        showToast('Form configuration error.', 'var(--bs-danger)');
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(endpoint, apiAction, 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            if (action === 'addPart' || action === 'addEntry') {
                const searchInputId = (action === 'addPart') ? 'out_item_search' : 'entry_item_search';
                const searchInputValue = document.getElementById(searchInputId).value;

                let lastEntryData = {
                    item_id: data.item_id,
                    item_display_text: searchInputValue
                };

                if (action === 'addEntry') {
                    lastEntryData.from_location_id = data.from_location_id;
                    lastEntryData.to_location_id = data.to_location_id;
                } else {
                    lastEntryData.out_location_id = data.location_id;
                }

                localStorage.setItem('inventoryUILastEntry', JSON.stringify(lastEntryData));
            }

            const modalId = form.closest('.modal').id;
            bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
            if (successCallback) await successCallback();
        }
    } finally {
        hideSpinner();
    }
}

async function deleteTransaction(transactionId, type) {
    if (!confirm('Are you sure you want to delete this transaction record? This action cannot be undone.')) {
        return;
    }
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'delete_transaction', 'POST', { transaction_id: transactionId });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            // โหลดข้อมูลของ Tab ที่เกี่ยวข้องใหม่
            if (type === 'entry') {
                fetchReceiptHistory(receiptHistoryCurrentPage);
            } else if (type === 'production') {
                fetchProductionHistory(productionHistoryCurrentPage);
            }
        }
    } finally {
        hideSpinner();
    }
}

async function editTransaction(transactionId, type) {
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_transaction_details', 'GET', null, { transaction_id: transactionId });

        if (result.success) {
            const data = result.data;
            let modalId, modal;

            if (type === 'entry') {
                modalId = 'editEntryModal';
                document.getElementById('edit_entry_transaction_id').value = data.transaction_id;
                document.getElementById('edit_entry_item_display').value = `${data.sap_no} | ${data.part_no}`;
                document.getElementById('edit_entry_location_id').value = data.to_location_id;
                document.getElementById('edit_entry_quantity').value = data.quantity;
                document.getElementById('edit_entry_lot_no').value = data.reference_id;
                document.getElementById('edit_entry_notes').value = data.notes;

                if (data.transaction_timestamp) {
                    const dateObj = new Date(data.transaction_timestamp);

                    // แยกวันที่เป็น YYYY-MM-DD
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    document.getElementById('edit_entry_log_date').value = `${year}-${month}-${day}`;

                    // แยกเวลาเป็น HH:MM:SS
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    document.getElementById('edit_entry_log_time').value = `${hours}:${minutes}:${seconds}`;
                }

            } else if (type === 'production') {
                modalId = 'editProductionModal';
                document.getElementById('edit_production_transaction_id').value = data.transaction_id;
                document.getElementById('edit_production_item_display').value = `${data.sap_no} | ${data.part_no}`;
                document.getElementById('edit_production_location_id').value = data.to_location_id; 
                document.getElementById('edit_production_quantity').value = data.quantity;
                document.getElementById('edit_production_lot_no').value = data.reference_id;
                document.getElementById('edit_production_count_type').value = data.transaction_type.replace('PRODUCTION_', '');
                document.getElementById('edit_production_notes').value = data.notes;

                // --- ส่วนที่เพิ่มเข้ามา: จัดการข้อมูลวันที่และเวลา ---
                if (data.transaction_timestamp) {
                    // แยกวันที่จาก timestamp หลัก (YYYY-MM-DD)
                    const datePart = data.transaction_timestamp.split(' ')[0];
                    document.getElementById('edit_production_log_date').value = datePart;
                }
                // ตั้งค่าเวลา (HH:MM:SS)
                // ใช้ .substring(0, 8) เพื่อให้แน่ใจว่าได้แค่ HH:mm:ss
                document.getElementById('edit_production_start_time').value = data.start_time ? data.start_time.substring(0, 8) : '';
                document.getElementById('edit_production_end_time').value = data.end_time ? data.end_time.substring(0, 8) : '';
            }

            modal = new bootstrap.Modal(document.getElementById(modalId));
            modal.show();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        hideSpinner();
    }
}

// =================================================================
// SECTION: INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    let debounceTimer;

    initializeFilters();
    populateModalDatalists();
    setupEntryAutocomplete();
    setupProductionAutocomplete();

    // Event Listeners for Forms
    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    document.getElementById('adjustStockForm')?.addEventListener('submit', handleAdjustStockSubmit);
    document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
    document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));

    // Debounce function for search input
    const debouncedFilterChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFilterChange, 500);
    };

    // Event Listeners for new Filters
    document.getElementById('filterSearch').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterCountType').addEventListener('change', handleFilterChange);
    document.getElementById('filterStartDate').addEventListener('change', handleFilterChange);
    document.getElementById('filterEndDate').addEventListener('change', handleFilterChange);
    document.getElementById('entry_from_location_id')?.addEventListener('change', updateAvailableStockDisplay);

    // Event Listener for Tab changes
    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.id;
            updateFilterVisibility(activeTabId);
            handleFilterChange();
            updateControls(activeTabId);
        });
    });

    // Initial data load for the active tab
    const activeTab = document.querySelector('#mainTab .nav-link.active');
    if (activeTab) {
        const activeTabId = activeTab.id;
        updateFilterVisibility(activeTabId);
        handleFilterChange();
        updateControls(activeTabId);
    }

    // Time Mask for time inputs
    const timeInputs = document.querySelectorAll('input[name="start_time"], input[name="end_time"], input[name="log_time"]');
    timeInputs.forEach(input => {
        input.addEventListener('input', applyTimeMask);
    });
});
