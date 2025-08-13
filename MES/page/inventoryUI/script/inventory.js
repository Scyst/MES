"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES & CONSTANTS
// =================================================================
const INVENTORY_API_URL = 'api/inventoryManage.php';
const ROWS_PER_PAGE = 50;

// State variables for different sections/tabs
let productionHistoryCurrentPage = 1;
let receiptHistoryCurrentPage = 1;
let wipCurrentPage = 1;
let stockCurrentPage = 1;

let allItems = []; // Master list of all items for autocomplete modals
let selectedInItem = null; 
let selectedOutItem = null;
let currentlyEditingData = null;

// =================================================================
// SECTION: CORE & UTILITY FUNCTIONS
// =================================================================

function saveFiltersToLocalStorage() {
    const filters = {
        part_no: document.getElementById('filterPartNo').value,
        lot_no: document.getElementById('filterLotNo').value,
        line: document.getElementById('filterLine').value,
        model: document.getElementById('filterModel').value,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };
    localStorage.setItem('inventoryUIFilters', JSON.stringify(filters));
}

function loadFiltersFromLocalStorage() {
    const savedFilters = localStorage.getItem('inventoryUIFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        document.getElementById('filterPartNo').value = filters.part_no || '';
        document.getElementById('filterLotNo').value = filters.lot_no || '';
        document.getElementById('filterLine').value = filters.line || '';
        document.getElementById('filterModel').value = filters.model || '';
        document.getElementById('filterCountType').value = filters.count_type || '';
        
        if (filters.startDate) {
            document.getElementById('filterStartDate').value = filters.startDate;
        }
        if (filters.endDate) {
            document.getElementById('filterEndDate').value = filters.endDate;
        }
    }
}

function handleFilterChange() {
    saveFiltersToLocalStorage();
    const activeTabId = document.querySelector('#mainTab .nav-link.active')?.id;
    if (!activeTabId) return;

    switch (activeTabId) {
        case 'wip-onhand-tab':
            fetchWipOnHandReport(1);
            break;
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
        case 'stock-count-tab': 
            fetchStockInventoryReport(1);
            break;
    }
}

/**
 * ฟังก์ชันกลางสำหรับส่ง Request ไปยัง API (จำเป็นสำหรับทุกไฟล์ JS ในหน้านี้)
 */
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

async function fetchReceiptHistory(page = 1) {
    receiptHistoryCurrentPage = page;
    showSpinner();
    
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history', 'GET', null, { page });
        if (result.success) {
            renderReceiptHistoryTable(result.data);
            renderPagination('entryHistoryPagination', result.total, result.page, ROWS_PER_PAGE, fetchReceiptHistory);
        } else {
            document.getElementById('entryHistoryTableBody').innerHTML = `<tr><td colspan="8" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

function renderReceiptHistoryTable(data) {
    const tbody = document.getElementById('entryHistoryTableBody');
    const thead = tbody.previousElementSibling.querySelector('tr');
    
    // เพิ่ม Header "Actions" ถ้ายังไม่มี
    if (!thead.querySelector('.actions-header')) {
        thead.innerHTML += `<th class="text-center actions-header">Actions</th>`;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No receipt history found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(row.transaction_timestamp).toLocaleString()}</td>
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-end">${parseFloat(row.quantity).toLocaleString()}</td>
            <td>${row.to_location || 'N/A'}</td>
            <td>${row.lot_no || ''}</td>
            <td>${row.created_by || 'N/A'}</td>
            <td class="text-center">
                ${canManage ? `
                    <button class="btn btn-sm btn-warning" onclick="editTransaction('${row.transaction_id}', 'entry')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${row.transaction_id}', 'entry')">Delete</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
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

async function fetchProductionHistory(page = 1) {
    productionHistoryCurrentPage = page;
    showSpinner();
    
    const params = {
        page: page,
        part_no: document.getElementById('filterPartNo').value,
        location: document.getElementById('filterLine').value, // The "Line" filter now acts as a Location filter
        lot_no: document.getElementById('filterLotNo').value,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_production_history', 'GET', null, params);
        if (result.success) {
            renderProductionHistoryTable(result.data);
            renderPagination('paginationControls', result.total, result.page, ROWS_PER_PAGE, fetchProductionHistory);
        } else {
             document.getElementById('partTableBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

function renderProductionHistoryTable(data) {
    const tbody = document.getElementById('partTableBody');
    const thead = tbody.previousElementSibling.querySelector('tr');

    // เพิ่ม Header "Actions" ถ้ายังไม่มี
    if (!thead.querySelector('.actions-header')) {
        thead.innerHTML += `<th class="text-center actions-header">Actions</th>`;
    }

    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">No production history found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = row.transaction_id;
        const transactionDate = new Date(row.transaction_timestamp);
        
        tr.innerHTML = `
            <td>${transactionDate.toLocaleDateString('en-GB')}</td>
            <td>${transactionDate.toTimeString().substring(0, 8)}</td>
            <td>${row.location_name || 'N/A'}</td>
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.lot_no || ''}</td>
            <td class="text-end">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.count_type}</td>
            <td>${row.notes || ''}</td>
            <td>${row.created_by || ''}</td>
            <td class="text-center">
                ${canManage ? `
                    <button class="btn btn-sm btn-warning" onclick="editTransaction('${row.transaction_id}', 'production')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteTransaction('${row.transaction_id}', 'production')">Delete</button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// =================================================================
// SECTION: REPORTING FUNCTIONS
// =================================================================

// --- For "WIP On-Hand" Tab ---
async function fetchWipOnHandReport(page = 1) {
    wipCurrentPage = page;
    showSpinner();
    try {
        const params = {
            page: page,
            part_no: document.getElementById('filterPartNo').value,
            line: document.getElementById('filterLine').value 
        };
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
    const tbody = document.getElementById('wipOnHandTableBody'); // <-- Corrected ID
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No Work-in-Progress items found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        const onHandQty = parseFloat(row.quantity) || 0;
        tr.innerHTML = `
            <td>${row.location_name}</td>
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}


// --- For "Production Variance" Tab ---
async function fetchProductionVarianceReport(page = 1) {
    wipCurrentPage = page;
    showSpinner();
    try {
        const params = {
            page: page,
            part_no: document.getElementById('filterPartNo').value,
            location: document.getElementById('filterLine').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };
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
    const tbody = document.getElementById('productionVarianceTableBody'); // Correct ID from your new HTML
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No production variance data found.</td></tr>';
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
            <td>${row.location_name}</td>
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchStockInventoryReport(page = 1) {
    stockCurrentPage = page;
    showSpinner();
    try {
        const searchTerm = document.getElementById('filterPartNo').value; 
        const result = await sendRequest(INVENTORY_API_URL, 'get_stock_inventory_report', 'GET', null, { page, search_term: searchTerm });
        
        if (result.success) {
            renderStockInventoryTable(result.data);
            renderPagination('stockCountPagination', result.total, result.page, ROWS_PER_PAGE, fetchStockInventoryReport);
        } else {
            document.getElementById('stockCountTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">${result.message}</td></tr>`;
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
        const onHandQty = parseFloat(row.total_onhand) || 0;
        tr.innerHTML = `
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info" onclick="alert('Drill-down by location feature coming soon!')">Details</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchWipReportByLot(page = 1) {
    showSpinner();
    try {
        const params = {
            page: page,
            part_no: document.getElementById('filterPartNo').value,
            lot_no: document.getElementById('filterLotNo').value,
            line: document.getElementById('filterLine').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };
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
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No active WIP lots found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td>${row.lot_no}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold text-warning">${parseFloat(row.variance).toLocaleString()}</td>
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

        const inLocationSelect = document.getElementById('entry_location_id');
        const outLocationSelect = document.getElementById('out_location_id');
        const editInLocationSelect = document.getElementById('edit_entry_location_id');
        const editOutLocationSelect = document.getElementById('edit_production_location_id');
        
        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        if (inLocationSelect) {
            inLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
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
    const currentTime = now.toTimeString().substring(0, 8);
    document.getElementById('out_start_time').value = currentTime;
    document.getElementById('out_end_time').value = currentTime;

    new bootstrap.Modal(document.getElementById('addPartModal')).show();
}

function openAddEntryModal() {
    const form = document.getElementById('addEntryForm');
    if(form) form.reset();
    
    selectedInItem = null;
    document.getElementById('entry_item_id').value = '';
    const searchInput = document.getElementById('entry_item_search');
    searchInput.value = '';

    const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry'));
    if (lastData) {
        const locationSelect = document.getElementById('entry_location_id');
        if(locationSelect) locationSelect.value = lastData.location_id || '';
        
        searchInput.value = lastData.item_display_text || '';
        document.getElementById('entry_item_id').value = lastData.item_id || '';
        
        if (lastData.item_id) {
            selectedInItem = allItems.find(item => item.item_id == lastData.item_id) || null;
        }
    }
    
    new bootstrap.Modal(document.getElementById('addEntryModal')).show();
}

// --- Central Form Submission Handler ---
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    let apiAction = '';
    let successCallback = null;
    // --- CORRECTED CODE STARTS HERE ---
    // Declare 'endpoint' once with 'let'
    let endpoint = INVENTORY_API_URL; 

    switch(action) {
        case 'addPart':
            apiAction = 'execute_production';
            if (!data.item_id) {
                showToast('Please select a valid item from the search results.', 'var(--bs-warning)');
                return;
            }
            successCallback = fetchProductionHistory;
            break;
        case 'addEntry':
            apiAction = 'execute_receipt';
            if (!data.item_id) {
                showToast('Please select a valid item from the search results.', 'var(--bs-warning)');
                return;
            }
            successCallback = fetchReceiptHistory;
            break;
        case 'editEntry':
            apiAction = 'update_transaction';
            successCallback = () => fetchReceiptHistory(receiptHistoryCurrentPage);
            break;
        case 'editProduction':
            apiAction = 'update_transaction';
            successCallback = () => fetchProductionHistory(productionHistoryCurrentPage);
            break;
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
                const searchInputId = action === 'addPart' ? 'out_item_search' : 'entry_item_search';
                const searchInputValue = document.getElementById(searchInputId).value;
                const locationInputId = action === 'addPart' ? 'out_location_id' : 'entry_location_id';

                const lastEntryData = {
                    item_id: data.item_id,
                    location_id: document.getElementById(locationInputId).value,
                    item_display_text: searchInputValue
                };
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
            } else if (type === 'production') {
                modalId = 'editProductionModal';
                document.getElementById('edit_production_transaction_id').value = data.transaction_id;
                document.getElementById('edit_production_item_display').value = `${data.sap_no} | ${data.part_no}`;
                document.getElementById('edit_production_location_id').value = data.to_location_id; 
                document.getElementById('edit_production_quantity').value = data.quantity;
                document.getElementById('edit_production_lot_no').value = data.reference_id;
                document.getElementById('edit_production_count_type').value = data.transaction_type.replace('PRODUCTION_', '');
                document.getElementById('edit_production_notes').value = data.notes;
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

    loadFiltersFromLocalStorage();
    populateModalDatalists();
    setupEntryAutocomplete();
    setupProductionAutocomplete();

    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    document.getElementById('editEntryForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('editProductionForm')?.addEventListener('submit', handleFormSubmit);

    const debouncedFilterChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFilterChange, 500);
    };

    document.getElementById('filterPartNo').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterLotNo').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterLine').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterModel').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterCountType').addEventListener('change', handleFilterChange);
    document.getElementById('filterStartDate').addEventListener('change', handleFilterChange);
    document.getElementById('filterEndDate').addEventListener('change', handleFilterChange);

    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', handleFilterChange);
    });

    const activeTab = document.querySelector('#mainTab .nav-link.active');
    if (activeTab) {
        handleFilterChange();
    }
});