"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES & CONSTANTS
// =================================================================
const INVENTORY_API_URL = 'api/inventoryManage.php';
const TRANSFER_API_URL = 'api/transferManage.php';
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
let g_CurrentPCTransferOrder = null;

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
        try {
            const filters = JSON.parse(savedFilters);
            document.getElementById('filterSearch').value = filters.search_term || '';
            document.getElementById('filterCountType').value = filters.count_type || '';
            document.getElementById('filterStartDate').value = filters.startDate || dateStr;
            document.getElementById('filterEndDate').value = filters.endDate || dateStr;
        } catch(e) {
            document.getElementById("filterStartDate").value = dateStr;
            document.getElementById("filterEndDate").value = dateStr;
        }
    } else {
        document.getElementById("filterStartDate").value = dateStr;
        document.getElementById("filterEndDate").value = dateStr;
    }
}

function handleFilterChange() {
    saveFiltersToLocalStorage();
    const activeTabId = document.querySelector('#mainTab .nav-link.active')?.id;
    if (!activeTabId) return;

    switch (activeTabId) {
        case 'production-variance-tab': fetchProductionVarianceReport(1); break;
        case 'wip-by-lot-tab': fetchWipReportByLot(1); break;
        case 'entry-history-tab': fetchReceiptHistory(1); break;
        case 'production-history-tab': fetchProductionHistory(1); break;
        case 'wip-onhand-tab': fetchWipOnHandReport(1); break;
        case 'stock-count-tab': fetchStockInventoryReport(1); break;
        case 'transaction-log-tab': fetchAllTransactions(1); break;
    }
}

async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) {
            const encodeParam = (key, value) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            const paramStrings = Object.entries(params).flatMap(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.map(item => encodeParam(key, item));
                } else {
                    return [encodeParam(key, value)];
                }
            });
            if (paramStrings.length > 0) url += `&${paramStrings.join('&')}`;
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const options = { method, headers: {} };
        
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body) {
            options.headers['Content-Type'] = 'application/json;charset=UTF-8';
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const textResponse = await response.text();
            console.error("Non-JSON Response from Server:", textResponse);
            throw new Error("ระบบเครือข่ายขัดข้อง หรือเซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON");
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `HTTP Error: ${response.status}`);
        }
        
        return result;
        
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        
        if (typeof showToast === 'function') {
            showToast(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'var(--bs-danger)');
        } else if (typeof alert === 'function') {
            alert(error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        }
        
        return { success: false, message: error.message };
    }
}

function updateFilterVisibility(activeTabId) {
    const searchEl = document.getElementById('filterSearch');
    const typeEl = document.getElementById('filterCountType');
    const dateRangeEl = document.getElementById('date-range-filter');

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
                <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="exportProductionHistoryToExcel()"><i class="fas fa-file-excel me-1"></i> Export</button>
                <div class="dropdown d-inline-block">
                    <button class="btn btn-sm btn-info fw-bold shadow-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="fas fa-chart-pie me-1"></i> Summaries
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="font-size: 0.85rem;">
                        <li><a class="dropdown-item fw-bold text-secondary" href="#" onclick="openSummaryModal(this); return false;"><i class="fas fa-list me-2"></i> Summary by Part</a></li>
                        <li><a class="dropdown-item fw-bold text-secondary" href="#" onclick="openHourlyProductionModal(); return false;"><i class="fas fa-clock me-2"></i> Hourly Summary</a></li>
                    </ul>
                </div>
                ${canAdd ? '<button class="btn btn-sm btn-primary fw-bold shadow-sm" onclick="openAddPartModal(this)"><i class="fas fa-plus me-1"></i> Add (OUT)</button>' : ''}
            `;
            summaryContainer.innerHTML = '<div id="grandSummary" class="summary-grand-total"></div>';
            break;
            
        case 'entry-history-tab':
            buttonGroup.innerHTML = `
                <button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="exportHistoryToExcel()"><i class="fas fa-file-excel me-1"></i> Export</button>
                <button class="btn btn-sm btn-info fw-bold shadow-sm" onclick="openHistorySummaryModal()"><i class="fas fa-chart-bar me-1"></i> Summary</button>
                ${canAdd ? '<button class="btn btn-sm btn-success fw-bold shadow-sm" onclick="openAddEntryModal(this)"><i class="fas fa-plus me-1"></i> Add (IN)</button>' : ''}
            `;
            break;
            
        case 'wip-onhand-tab':
        case 'wip-by-lot-tab':
            buttonGroup.innerHTML = `<button class="btn btn-sm btn-outline-primary fw-bold shadow-sm" onclick="exportWipReportToExcel()"><i class="fas fa-file-excel me-1"></i> Export</button>`;
            break;
    }
}

function applyTimeMask(event) {
    const input = event.target;
    let value = input.value.replace(/\D/g, ''); 

    if (value.length > 2) value = value.substring(0, 2) + ':' + value.substring(2);
    if (value.length > 5) value = value.substring(0, 5) + ':' + value.substring(5);
    input.value = value.substring(0, 8);
}

// =================================================================
// SECTION: NEW INVENTORY SYSTEM FUNCTIONS
// =================================================================

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
                updateAvailableStockDisplay();
                resultsWrapper.innerHTML = '';
            });
            resultsWrapper.appendChild(resultItem);
        });
        resultsWrapper.style.display = filteredItems.length > 0 ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

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
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

// =================================================================
// SECTION: REPORTING FUNCTIONS
// =================================================================

async function fetchProductionVarianceReport(page = 1) {
    varianceCurrentPage = page;
    showSpinner();
    
    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
                                
    const params = {
        page: page,
        'search_terms[]': searchTerms,
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

        const variance = Math.floor(row.variance) || 0;
        let textColorClass = '';

        if (variance < 0) textColorClass = 'text-danger'; 
        else if (variance === 0) textColorClass = 'text-success';
        else textColorClass = 'text-warning';

        tr.innerHTML = `
            <td class="text-start" data-label="Location">${row.location_name}</td>
            <td class="text-center" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-center" data-label="Part No.">${row.part_no}</td>
            <td class="text-center" data-label="Model">${row.model || ''}</td>
            <td class="text-start" style="padding-left: 1rem;" data-label="Part Description">${row.part_description || ''}</td>
            <td class="text-end" data-label="Total IN">${Math.floor(row.total_in).toLocaleString()}</td>
            <td class="text-end" data-label="Total OUT">${Math.floor(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}" data-label="Variance (OUT - IN)">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchWipReportByLot(page = 1) {
    wipByLotCurrentPage = page;
    showSpinner();
    
    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
                                
    const params = {
        page: page,
        'search_terms[]': searchTerms,
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
        const variance = Math.floor(row.on_hand_by_lot) || 0; // Using on_hand_by_lot from updated API
        let textColorClass = '';

        if (variance < 0) textColorClass = 'text-danger'; 
        else if (variance === 0) textColorClass = 'text-success';
        else textColorClass = 'text-warning';
        
        tr.innerHTML = `
            <td class="text-start" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-start" data-label="Part Number">${row.part_no}</td>
            <td class="text-start" data-label="Model">${row.model || ''}</td>
            <td class="text-start" style="padding-left: 1rem;" data-label="Part Description">${row.part_description || ''}</td>
            <td class="text-center" data-label="Lot Number">${row.lot_no}</td>
            <td class="text-end" data-label="Total IN">${Math.floor(row.total_in).toLocaleString()}</td>
            <td class="text-end" data-label="Total OUT">${Math.floor(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}" data-label="Variance (OUT - IN)">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchReceiptHistory(page = 1) {
    receiptHistoryCurrentPage = page;
    showSpinner();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

    const params = {
        page: page,
        'search_terms[]': searchTerms,
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
            <td class="text-start" data-label="Date">${transactionDate.toLocaleDateString('en-GB')}</td>
            <td class="text-start" data-label="Time">${transactionDate.toTimeString().substring(0, 8)}</td>
            <td class="text-center" data-label="From">${row.source_location || 'External'}</td>
            <td class="text-center" data-label="To">${row.destination_location || 'N/A'}</td>
            <td class="text-center" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-center" data-label="Part No.">${row.part_no}</td>
            <td class="text-center" data-label="Lot. / Ref.">${row.lot_no || ''}</td>
            <td class="text-center" data-label="Quantity">${Math.floor(row.quantity).toLocaleString()}</td>
            <td class="text-center" data-label="Notes">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchProductionHistory(page = 1) {
    productionHistoryCurrentPage = page;
    showSpinner();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
    
    const params = {
        page: page,
        'search_terms[]': searchTerms, 
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
        const dateStr = transactionDate.toLocaleDateString('en-GB');
        const timeStr = (row.end_time && row.end_time.substring(0, 8) !== '00:00:00')
                        ? row.end_time.substring(0, 8)
                        : transactionDate.toTimeString().substring(0, 8);
        
        tr.innerHTML = `
            <td class="text-start" data-label="Date">${dateStr}</td>
            <td class="text-start" data-label="Time">${timeStr}</td>
            <td class="text-center" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-center" data-label="Part No.">${row.part_no}</td>
            <td class="text-center" data-label="Model">${row.model || ''}</td>
            <td class="text-center" data-label="Lot / Ref.">${row.lot_no || ''}</td>
            <td class="text-center" data-label="Location">${row.location_name || 'N/A'}</td>
            <td class="text-center" data-label="Quantity">${Math.floor(row.quantity).toLocaleString()}</td>
            <td class="text-center" data-label="Type">${row.count_type}</td>
            <td class="text-center" data-label="Notes">${row.notes || ''}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

async function fetchWipOnHandReport(page = 1) {
    wipOnHandCurrentPage = page;
    showSpinner();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

    const params = {
        page: page,
        'search_terms[]': searchTerms
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

        const onHandQty = Math.floor(row.quantity) || 0;
        
        tr.innerHTML = `
            <td class="text-start" data-label="Location">${row.location_name}</td>
            <td class="text-center" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-center" data-label="Part No.">${row.part_no}</td>
            <td class="text-center" data-label="Model">${row.model || ''}</td>
            <td class="text-start" style="padding-left: 1rem;" data-label="Part Description">${row.part_description || ''}</td>
            <td class="text-end fw-bold" data-label="On-Hand Quantity (WIP)">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchStockInventoryReport(page = 1) {
    stockCountCurrentPage = page;
    showSpinner();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

    const params = {
        page: page,
        'search_terms[]': searchTerms
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

        const onHandQty = Math.floor(row.total_onhand) || 0;

        tr.innerHTML = `
            <td class="text-start" data-label="SAP No.">${row.sap_no}</td>
            <td class="text-start" data-label="Part No.">${row.part_no}</td>
            <td class="text-start" data-label="Models">${row.used_models || '-'}</td>
            <td class="text-start" style="padding-left: 1rem;" data-label="Part Description">${row.part_description || ''}</td>
            <td class="text-end fw-bold" data-label="Total On-Hand">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchAllTransactions(page = 1) {
    transactionLogCurrentPage = page;
    showSpinner();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
                                
    const params = {
        page: page,
        'search_terms[]': searchTerms,
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
        const quantity = Math.floor(row.quantity);

        let quantityClass = '';
        let quantityPrefix = '';
        if (quantity > 0) {
            quantityClass = 'text-success';
            quantityPrefix = '+';
        } else if (quantity < 0) {
            quantityClass = 'text-danger';
        }
        
        tr.innerHTML = `
            <td class="text-start" data-label="Date & Time">${transactionDate.toLocaleString('en-GB')}</td>
            <td class="text-start" data-label="From">${row.source_location || 'N/A'}</td>
            <td class="text-start" data-label="To">${row.destination_location || 'N/A'}</td>
            <td class="text-start" data-label="Part No.">${row.part_no}</td>
            <td class="text-start" data-label="Model">${row.model || ''}</td>
            <td class="text-center" data-label="Lot / Ref.">${row.lot_no || ''}</td>
            <td class="text-center fw-bold ${quantityClass}" data-label="Change">${quantityPrefix}${quantity.toLocaleString()}</td>
            <td class="text-center" data-label="Type"><span class="badge bg-secondary">${row.transaction_type}</span></td>
            <td class="text-center" data-label="User">${row.created_by || 'N/A'}</td> 
            <td class="text-center" data-label="Notes">${row.notes || ''}</td>
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
        
        const editInFromLocationSelect = document.getElementById('edit_entry_from_location_id');
        const editInToLocationSelect = document.getElementById('edit_entry_to_location_id');
        const editOutLocationSelect = document.getElementById('edit_production_location_id');

        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        if (inToLocationSelect) {
            inToLocationSelect.innerHTML = '<option value="">-- Select Destination --</option>' + optionsHtml;
        }
        if (outLocationSelect) {
            outLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
        
        if (editInFromLocationSelect) {
            editInFromLocationSelect.innerHTML = '<option value="">-- Select Source --</option>' + optionsHtml;
        }
        if (editInToLocationSelect) {
            editInToLocationSelect.innerHTML = '<option value="">-- Select Destination --</option>' + optionsHtml;
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

    try {
        const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry_OUT')); 
        if (lastData) {
            const locationSelect = document.getElementById('out_location_id');
            if (locationSelect) locationSelect.value = lastData.location_id || '';
            searchInput.value = lastData.item_display_text || '';
            document.getElementById('out_item_id').value = lastData.item_id || '';
            if (lastData.item_id) {
                selectedOutItem = allItems.find(item => item.item_id == lastData.item_id) || null;
            }
        }
    } catch(e) {}
    
    const now = new Date();
    document.getElementById('out_log_date').value = now.toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('addPartModal')).show();
}

function openAddEntryModal() {
    const form = document.getElementById('addEntryForm');
    if(form) form.reset();
    
    selectedInItem = null;
    document.getElementById('entry_item_id').value = '';
    document.getElementById('entry_item_search').value = '';
    
    g_CurrentPCTransferOrder = null;
    const transferInput = document.getElementById('entry_transfer_id_input');
    const transferUuidHidden = document.getElementById('entry_transfer_uuid');
    if (transferInput) transferInput.value = '';
    if (transferUuidHidden) transferUuidHidden.value = '';
    
    unlockEntryForm();

    const now = new Date();
    document.getElementById('entry_log_date').value = now.toISOString().split('T')[0];
    document.getElementById('entry_log_time').value = now.toTimeString().substring(0, 8);
    
    try {
        const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry_IN'));
        if (lastData) {
            document.getElementById('entry_item_search').value = lastData.item_display_text || '';
            document.getElementById('entry_item_id').value = lastData.item_id || '';
            if (lastData.item_id) {
                selectedInItem = allItems.find(item => item.item_id == lastData.item_id) || null;
            }
            if (lastData.from_location_id) {
                document.getElementById('entry_from_location_id').value = lastData.from_location_id;
            }
            if (lastData.to_location_id) {
                document.getElementById('entry_to_location_id').value = lastData.to_location_id;
            }
        }
    } catch(e) {}
    
    updateAvailableStockDisplay();
    new bootstrap.Modal(document.getElementById('addEntryModal')).show();
}

function lockEntryForm() {
    document.getElementById('entry_item_search').readOnly = true;
    document.getElementById('entry_item_search').classList.add('form-control-readonly');
    document.getElementById('entry_lot_no').readOnly = true;
    document.getElementById('entry_lot_no').classList.add('form-control-readonly');
    document.getElementById('entry_from_location_id').disabled = true;
    document.getElementById('entry_from_location_id').classList.add('form-control-readonly');
    document.getElementById('entry_to_location_id').disabled = true;
    document.getElementById('entry_to_location_id').classList.add('form-control-readonly');
}

function unlockEntryForm() {
    document.getElementById('entry_item_search').readOnly = false;
    document.getElementById('entry_item_search').classList.remove('form-control-readonly');
    document.getElementById('entry_lot_no').readOnly = false;
    document.getElementById('entry_lot_no').classList.remove('form-control-readonly');
    document.getElementById('entry_from_location_id').disabled = false;
    document.getElementById('entry_from_location_id').classList.remove('form-control-readonly');
    document.getElementById('entry_to_location_id').disabled = false;
    document.getElementById('entry_to_location_id').classList.remove('form-control-readonly');
}

async function autoFillFromTransferOrder_PC() {
    const transferId = document.getElementById('entry_transfer_id_input').value.trim();
    if (!transferId) {
        showToast("Please enter a Transfer ID.", 'var(--bs-warning)');
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: transferId });
        if (!result.success) throw new Error(result.message);

        const order = result.data;
        g_CurrentPCTransferOrder = order; 

        if (order.status !== 'PENDING') {
            throw new Error(`This transfer is already ${order.status}.`);
        }

        selectedInItem = { 
            item_id: order.item_id, 
            sap_no: order.sap_no, 
            part_no: order.part_no, 
            part_description: order.part_description 
        };
        
        document.getElementById('entry_item_search').value = `${order.sap_no} | ${order.part_no}`;
        document.getElementById('entry_item_id').value = order.item_id;
        document.getElementById('entry_lot_no').value = order.transfer_uuid;
        document.getElementById('entry_quantity_in').value = Math.floor(order.quantity);
        document.getElementById('entry_from_location_id').value = order.from_location_id;
        document.getElementById('entry_to_location_id').value = order.to_location_id;
        document.getElementById('entry_notes').value = order.notes || '';
        document.getElementById('entry_transfer_uuid').value = order.transfer_uuid;

        lockEntryForm();
        
        await updateAvailableStockDisplay();
        showToast("Transfer order loaded. Please confirm.", 'var(--bs-success)');

    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
        g_CurrentPCTransferOrder = null;
        document.getElementById('entry_transfer_uuid').value = '';
        unlockEntryForm(); 
        selectedInItem = null; 
    } finally {
        hideSpinner();
    }
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
                <td class="text-end">${Math.floor(detail.quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });
    } else {
        modalBody.innerHTML = '<tr><td colspan="2" class="text-center">No stock found in any location.</td></tr>';
    }
}

function handleDeleteFromModal(type) {
    let transactionId, modalId, deleteBtn, transferUuid;

    if (type === 'entry') {
        modalId = 'editEntryModal';
        const modal = document.getElementById(modalId);
        transactionId = modal.querySelector('#edit_entry_transaction_id').value;
        deleteBtn = modal.querySelector('#deleteEntryFromModalBtn');
        transferUuid = deleteBtn.dataset.transferUuid || null;
        
    } else {
        modalId = 'editProductionModal';
        const modal = document.getElementById(modalId);
        transactionId = modal.querySelector('#edit_production_transaction_id').value;
        deleteBtn = modal.querySelector('#deleteProductionFromModalBtn');
        transferUuid = deleteBtn.dataset.transferUuid || null;
    }

    if (!transactionId) {
        showToast('Cannot find Transaction ID.', 'var(--bs-danger)');
        return;
    }

    const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modalInstance) modalInstance.hide();
    
    deleteOrReverseTransaction(transactionId, transferUuid, type);
}

async function deleteOrReverseTransaction(transactionId, transferUuid, type) {
    let confirmMessage = 'Are you sure you want to delete this transaction record?';
    let apiEndpoint = INVENTORY_API_URL;
    let action = 'delete_transaction';
    let body = { transaction_id: transactionId };

    if (transferUuid) {
        confirmMessage = 'Are you sure you want to REVERSE this transfer? Stock will be returned to the origin.';
        apiEndpoint = TRANSFER_API_URL;
        action = 'reverse_transfer';
        body = { transfer_uuid: transferUuid };
    }

    if (!confirm(confirmMessage)) return;

    showSpinner();
    try {
        const result = await sendRequest(apiEndpoint, action, 'POST', body);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        
        if (result.success) {
            if (type === 'entry' || transferUuid) {
                await fetchReceiptHistory(receiptHistoryCurrentPage);
            } else if (type === 'production') {
                await fetchProductionHistory(productionHistoryCurrentPage);
            }
        }
    } finally {
        hideSpinner();
    }
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
    if (lotNo) params.lot_no = lotNo;

    const result = await sendRequest(INVENTORY_API_URL, 'get_variance_details', 'GET', null, params);

    inTableBody.innerHTML = '';
    let totalIn = 0;
    if (result.success && result.data.in_records.length > 0) {
        result.data.in_records.forEach(rec => {
            const qty = Math.floor(rec.quantity);
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
    
    outTableBody.innerHTML = '';
    let totalOut = 0;
    if (result.success && result.data.out_records.length > 0) {
        result.data.out_records.forEach(rec => {
            const qty = Math.abs(Math.floor(rec.quantity));
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

    modal.querySelector('#adjust_item_id').value = itemData.item_id;
    modal.querySelector('#adjust_location_id').value = itemData.location_id || itemData.onhand_location_id; 

    modal.querySelector('#adjust_item_display').value = `${itemData.sap_no} | ${itemData.part_no}`;
    modal.querySelector('#adjust_location_display').value = itemData.location_name;
    modal.querySelector('#adjust_current_onhand').value = Math.floor(itemData.quantity || itemData.total_onhand).toLocaleString();

    modal.querySelector('#adjust_physical_count').value = '';
    modal.querySelector('#adjust_notes').value = '';

    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
}

async function openSummaryModal() {
    const modalBody = document.getElementById('summaryTableBody');
    if (!modalBody) return;
    modalBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading summary...</td></tr>';

    const summaryModal = new bootstrap.Modal(document.getElementById('summaryModal'));
    summaryModal.show();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
    const params = {
        'search_terms[]': searchTerms,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    const result = await sendRequest(INVENTORY_API_URL, 'get_production_summary', 'GET', null, params);

    if (result.success && result.summary && result.summary.length > 0) {
        modalBody.innerHTML = '';
        
        result.summary.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.sap_no}</td>
                <td>${row.part_no}</td>
                <td>${row.count_type}</td>
                <td class="text-end">${Math.floor(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        let overallGrandTotal = 0;
        
        result.grand_total.forEach(row => {
            const quantity = Math.floor(row.total_quantity) || 0;
            overallGrandTotal += quantity;
            const tr = document.createElement('tr');
            tr.className = 'table-dark fw-bold';
            tr.innerHTML = `
                <td colspan="3" class="text-start">Grand Total (${row.count_type})</td>
                <td class="text-end">${quantity.toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        if (result.grand_total.length > 1) { 
            const tr = document.createElement('tr');
            tr.className = 'table-dark fw-bold';
            tr.innerHTML = `
                <td colspan="3" class="text-start">OVERALL GRAND TOTAL</td>
                <td class="text-end">${overallGrandTotal.toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        }
    } else {
        modalBody.innerHTML = '<tr><td colspan="4" class="text-center">No summary data available.</td></tr>';
    }
}

async function openHistorySummaryModal() {
    const modalBody = document.getElementById('historySummaryTableBody');
    if (!modalBody) return;
    modalBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading summary...</td></tr>';
    
    const summaryModal = new bootstrap.Modal(document.getElementById('historySummaryModal'));
    summaryModal.show();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);

    const params = {
        limit: -1,
        'search_terms[]': searchTerms,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history_summary', 'GET', null, params);

    if (result.success && result.summary.length > 0) {
        modalBody.innerHTML = '';
        result.summary.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.sap_no}</td>
                <td>${row.part_no}</td>
                <td><span class="badge bg-secondary">${row.transaction_type}</span></td>
                <td class="text-end">${Math.floor(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        const grandTotalRow = document.createElement('tr');
        grandTotalRow.className = 'table-group-divider fw-bold';
        let grandTotal = 0;
        result.grand_total.forEach(row => grandTotal += Math.floor(row.total_quantity));
        grandTotalRow.innerHTML = `
            <td colspan="3" class="text-start">Grand Total</td>
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
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true;
    showSpinner();
    
    try {
        const data = Object.fromEntries(new FormData(form).entries());
        const result = await sendRequest(INVENTORY_API_URL, 'adjust_single_stock', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');

        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('adjustStockModal')).hide();
            handleFilterChange();
        }
    } finally {
        hideSpinner();
        submitBtn.disabled = false;
    }
}

async function updateAvailableStockDisplay() {
    const display = document.getElementById('entry_available_stock');
    const fromLocationId = document.getElementById('entry_from_location_id').value;

    display.textContent = '--';
    display.classList.remove('text-danger');
    if (!selectedInItem || !fromLocationId) return;

    display.textContent = 'Loading...';
    const result = await sendRequest(INVENTORY_API_URL, 'get_stock_onhand', 'GET', null, { 
        item_id: selectedInItem.item_id, 
        location_id: fromLocationId 
    });

    if (result.success) {
        const quantity = Math.floor(result.quantity);
        display.textContent = quantity.toLocaleString();
        if (quantity < 0) {
            display.classList.add('text-danger');
        }
    } else {
        display.textContent = 'Error';
        display.classList.add('text-danger');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true; 
    showSpinner();
    
    try {
        if (action === 'addPart') {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const locationId = document.getElementById('out_location_id').value;
            if (!locationId) throw new Error("กรุณาเลือก Location");
            
            const timeSlot = formData.get('time_slot');
            if (!timeSlot || !timeSlot.includes('|')) throw new Error("ช่วงเวลาไม่ถูกต้อง");
            const [startTime, endTime] = timeSlot.split('|');

            const baseData = {
                item_id: data.item_id,
                location_id: locationId, 
                lot_no: data.lot_no,
                log_date: data.log_date,
                start_time: startTime,
                end_time: endTime,
                notes: data.notes
            };
            
            const transactions = [];
            const qtyFg = Math.floor(data.quantity_fg) || 0;
            const qtyHold = Math.floor(data.quantity_hold) || 0;
            const qtyScrap = Math.floor(data.quantity_scrap) || 0;

            if (qtyFg > 0) transactions.push({ ...baseData, quantity: qtyFg, count_type: 'FG' });
            if (qtyHold > 0) transactions.push({ ...baseData, quantity: qtyHold, count_type: 'HOLD' });
            if (qtyScrap > 0) transactions.push({ ...baseData, quantity: qtyScrap, count_type: 'SCRAP' });

            if (transactions.length === 0) throw new Error("กรุณากรอกจำนวนอย่างน้อย 1 ประเภท");

            let allSuccess = true;
            for (const trans of transactions) {
                const res = await sendRequest(INVENTORY_API_URL, 'execute_production', 'POST', trans);
                if (!res.success) { allSuccess = false; throw new Error(res.message); }
            }
            
            if (allSuccess) { 
                Swal.fire({
                    title: 'บันทึกการผลิตสำเร็จ!',
                    text: 'ระบบได้ตัดสต็อกวัตถุดิบตามสูตรเรียบร้อยแล้ว',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                const searchInputValue = document.getElementById('out_item_search').value;
                let lastEntryData = {
                    item_id: baseData.item_id,
                    item_display_text: searchInputValue,
                    location_id: baseData.location_id
                };
                localStorage.setItem('inventoryUILastEntry_OUT', JSON.stringify(lastEntryData));
                
                bootstrap.Modal.getInstance(form.closest('.modal')).hide();
                await fetchProductionHistory(productionHistoryCurrentPage); 
            }

        } else if (action === 'addEntry') {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const transferUuid = data.transfer_uuid; 

            if (transferUuid) {
                if (!data.to_location_id) throw new Error("กรุณาเลือก Location ปลายทาง (To)");

                if (g_CurrentPCTransferOrder && g_CurrentPCTransferOrder.to_location_id != data.to_location_id) {
                     throw new Error(`Location ไม่ตรงกับใบโอน (ใบโอนนี้สำหรับ ${g_CurrentPCTransferOrder.to_location_name})`);
                }

                const body = {
                    transfer_uuid: transferUuid,
                    confirmed_quantity: Math.floor(data.confirmed_quantity)
                };
                
                const res = await sendRequest(TRANSFER_API_URL, 'confirm_transfer', 'POST', body);
                if (!res.success) throw new Error(res.message);

                showToast("ยืนยันการรับของสำเร็จ!", 'var(--bs-success)');
                
                bootstrap.Modal.getInstance(form.closest('.modal')).hide();
                await fetchReceiptHistory(receiptHistoryCurrentPage); 
                selectedInItem = null;

            } else {
                if (!data.to_location_id) throw new Error("กรุณาเลือก Location ปลายทาง (To)");
                
                data.quantity = Math.floor(data.confirmed_quantity); // For receiving without transfer order
                const res = await sendRequest(INVENTORY_API_URL, 'execute_receipt', 'POST', data);
                if (!res.success) throw new Error(res.message);

                showToast("บันทึกสำเร็จ", 'var(--bs-success)');

                const searchInputValue = document.getElementById('entry_item_search').value;
                let lastEntryData = {
                    item_id: data.item_id,
                    item_display_text: searchInputValue,
                    from_location_id: data.from_location_id,
                    to_location_id: data.to_location_id
                };
                localStorage.setItem('inventoryUILastEntry_IN', JSON.stringify(lastEntryData));
                
                bootstrap.Modal.getInstance(form.closest('.modal')).hide();
                await fetchReceiptHistory(receiptHistoryCurrentPage);
                selectedInItem = null;
            }

        } else if (action === 'editEntry' || action === 'editProduction') {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.quantity = Math.floor(data.quantity); // Parse Int

            const res = await sendRequest(INVENTORY_API_URL, 'update_transaction', 'POST', data);
            if (!res.success) throw new Error(res.message);

            showToast("แก้ไขสำเร็จ", 'var(--bs-success)');
            bootstrap.Modal.getInstance(form.closest('.modal'))?.hide();
            if (action === 'editEntry') await fetchReceiptHistory(receiptHistoryCurrentPage);
            if (action === 'editProduction') await fetchProductionHistory(productionHistoryCurrentPage);
        }
    } catch (error) {
        const errorMessage = error.message || 'An unexpected error occurred.';
        
        if (errorMessage.includes("ใบโอนย้ายนี้ถูกประมวลผลไปแล้ว") || errorMessage.includes("ไม่พบใบโอนย้ายนี้")) {
            showToast(errorMessage, 'var(--bs-danger)');
            unlockEntryForm();
            document.getElementById('entry_transfer_id_input').value = '';
            document.getElementById('entry_transfer_uuid').value = '';
            g_CurrentPCTransferOrder = null;
            selectedInItem = null; 

        } else if (errorMessage.includes('วัตถุดิบในจุดจัดเก็บ')) {
            const errorHtml = errorMessage.replace(/\n/g, '<br>');
            Swal.fire({
                title: '<i class="fas fa-exclamation-triangle text-warning"></i> วัตถุดิบไม่พอผลิต!',
                html: `
                    <div class="text-start alert alert-warning border-warning mt-3" style="font-size: 0.95rem; max-height: 250px; overflow-y: auto;">
                        ${errorHtml}
                    </div>
                    <div class="small text-muted mt-2">
                        <i class="fas fa-info-circle"></i> กรุณาเบิกของเข้าไลน์ให้ครบก่อนทำการบันทึก
                    </div>
                `,
                icon: 'warning',
                confirmButtonColor: '#d33',
                confirmButtonText: 'รับทราบ',
                allowOutsideClick: false
            });
        } else {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: errorMessage,
                icon: 'error',
                confirmButtonColor: '#d33'
            });
        }
    } finally {
        hideSpinner();
        submitBtn.disabled = false; 
    }
}

function setEntryModalReadOnly(isReadOnly) {
    const modal = document.getElementById('editEntryModal');
    if (!modal) return;
    const fieldsToToggle = [
        'edit_entry_log_date',
        'edit_entry_log_time',
        'edit_entry_to_location_id',
        'edit_entry_quantity',
        'edit_entry_notes'
    ];

    fieldsToToggle.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                el.disabled = isReadOnly;
            } else {
                el.readOnly = isReadOnly;
            }

            if (isReadOnly) {
                el.classList.add('form-control-readonly');
            } else {
                el.classList.remove('form-control-readonly');
            }
        }
    });
}

async function editTransaction(transactionId, type) {
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_transaction_details', 'GET', null, { transaction_id: transactionId });

        if (result.success) {
            const data = result.data;
            let modalId, modal, deleteBtn, saveBtn;

            if (type === 'entry') {
                modalId = 'editEntryModal';
                modal = new bootstrap.Modal(document.getElementById(modalId));
                
                deleteBtn = document.getElementById('deleteEntryFromModalBtn');
                saveBtn = document.querySelector('#editEntryForm button[data-action="save"]');

                document.getElementById('edit_entry_transaction_id').value = data.transaction_id;
                document.getElementById('edit_entry_item_display').value = `${data.sap_no} | ${data.part_no}`;
                
                document.getElementById('edit_entry_from_location_id').value = data.from_location_id || "";
                document.getElementById('edit_entry_to_location_id').value = data.to_location_id;
                
                document.getElementById('edit_entry_quantity').value = Math.floor(data.quantity);
                document.getElementById('edit_entry_lot_no').value = data.reference_id;
                document.getElementById('edit_entry_notes').value = data.notes;
                
                if (data.transaction_timestamp) {
                    const dateObj = new Date(data.transaction_timestamp);
                    const year = dateObj.getFullYear();
                    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const day = String(dateObj.getDate()).padStart(2, '0');
                    document.getElementById('edit_entry_log_date').value = `${year}-${month}-${day}`;
                    const hours = String(dateObj.getHours()).padStart(2, '0');
                    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
                    document.getElementById('edit_entry_log_time').value = `${hours}:${minutes}:${seconds}`;
                }

            } else if (type === 'production') {
                modalId = 'editProductionModal';
                modal = new bootstrap.Modal(document.getElementById(modalId));
                deleteBtn = document.getElementById('deleteProductionFromModalBtn');
                saveBtn = modal._element.querySelector('button[type="submit"]');
                
                document.getElementById('edit_production_transaction_id').value = data.transaction_id;
                document.getElementById('edit_production_item_display').value = `${data.sap_no} | ${data.part_no}`;
                document.getElementById('edit_production_location_id').value = data.to_location_id; 
                document.getElementById('edit_production_quantity').value = Math.floor(data.quantity);
                document.getElementById('edit_production_lot_no').value = data.reference_id;
                document.getElementById('edit_production_count_type').value = data.transaction_type.replace('PRODUCTION_', '');
                document.getElementById('edit_production_notes').value = data.notes;
                if (data.transaction_timestamp) {
                    const datePart = data.transaction_timestamp.split(' ')[0];
                    document.getElementById('edit_production_log_date').value = datePart;
                }
                document.getElementById('edit_production_start_time').value = data.start_time ? data.start_time.substring(0, 8) : '';
                document.getElementById('edit_production_end_time').value = data.end_time ? data.end_time.substring(0, 8) : '';
            }

            if (data.transaction_type === 'INTERNAL_TRANSFER' || data.transaction_type === 'REVERSAL_TRANSFER') {
                deleteBtn.textContent = 'Reversal'; 
                deleteBtn.classList.remove('btn-danger');
                deleteBtn.classList.add('btn-warning');
                deleteBtn.dataset.transferUuid = data.reference_id; 
                if (saveBtn) saveBtn.style.display = 'none'; 

                if (type === 'entry') setEntryModalReadOnly(true);

            } else {
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.remove('btn-warning');
                deleteBtn.classList.add('btn-danger');
                deleteBtn.dataset.transferUuid = ''; 
                if (saveBtn) saveBtn.style.display = 'inline-block'; 

                if (type === 'entry') setEntryModalReadOnly(false);
            }

            modal.show();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
    } finally {
        hideSpinner();
    }
}

async function openHourlyProductionModal() {
    const tableHead = document.getElementById('hourly-production-thead');
    const tableBody = document.getElementById('hourly-production-tbody');
    const tableFoot = document.getElementById('hourly-production-tfoot');
    const subTitle = document.getElementById('hourly-production-subtitle');
    const navContainer = document.getElementById('hourly-production-nav');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading hourly data...</td></tr>';
    tableFoot.innerHTML = '';
    navContainer.innerHTML = '';
    
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    subTitle.textContent = `แสดงผลสรุปยอดรวม ตั้งแต่วันที่: ${startDate} ถึง ${endDate} (อ้างอิงกะ 8:00 - 8:00)`;

    const summaryModal = new bootstrap.Modal(document.getElementById('hourlyProductionModal'));
    summaryModal.show();

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
                                
    const params = {
        startDate: startDate,
        endDate: endDate,
        'search_terms[]': searchTerms,
    };
    const result = await sendRequest(INVENTORY_API_URL, 'get_production_hourly_counts', 'GET', null, params);

    if (!result.success || !result.data || result.data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No production data found for this period.</td></tr>';
        return;
    }

    const dataByDate = {};

    result.data.forEach(row => {
        const dateKey = row.ProductionDate;
        const hour = parseInt(row.hour_of_day);
        const pivotKey = `${row.part_no} (${row.sap_no})`; 
        
        const counts = {
            fg: Math.floor(row.Qty_FG),
            hold: Math.floor(row.Qty_HOLD),
            scrap: Math.floor(row.Qty_SCRAP)
        };
        
        if (!dataByDate[dateKey]) {
            dataByDate[dateKey] = {
                pivotData: {},      
                pivotKeys: new Set(),
                totalsByPivotKey: {}
            };
        }
        
        const dayData = dataByDate[dateKey];
        dayData.pivotKeys.add(pivotKey);
        
        if (!dayData.totalsByPivotKey[pivotKey]) dayData.totalsByPivotKey[pivotKey] = { fg: 0, hold: 0, scrap: 0 };
        if (!dayData.pivotData[hour]) dayData.pivotData[hour] = {};

        dayData.pivotData[hour][pivotKey] = counts;
        
        dayData.totalsByPivotKey[pivotKey].fg += counts.fg;
        dayData.totalsByPivotKey[pivotKey].hold += counts.hold;
        dayData.totalsByPivotKey[pivotKey].scrap += counts.scrap;
    });

    function createCellHtml(counts, isHeader = false) {
        const c = counts || { fg: 0, hold: 0, scrap: 0 };
        const total = c.fg + c.hold + c.scrap;
        if (total === 0) {
            return isHeader ? '<th>-</th>' : '<td class="text-end">-</td>';
        }
        const tag = isHeader ? 'th' : 'td';
        const breakdownHtml = `
            <small class="ms-1 text-muted">
                (<span class="text-success fw-medium">${c.fg.toLocaleString()}</span>/
                 <span class="text-warning fw-medium">${c.hold.toLocaleString()}</span>/
                 <span class="text-danger fw-medium">${c.scrap.toLocaleString()}</span>)
            </small>
        `;
        return `<${tag} class="text-end">
                    ${total.toLocaleString()}
                    ${breakdownHtml}
                </${tag}>`;
    }

    function renderTableForDate(dateKey) {
        const dayData = dataByDate[dateKey];
        const sortedPivotKeys = Array.from(dayData ? dayData.pivotKeys : new Set()).sort(); 
        
        let headerHtml = '<tr><th class="text-center" style="width: 150px;">Time</th>';
        sortedPivotKeys.forEach(key => {
            headerHtml += `<th class="text-center" style="min-width: 180px;">${key}</th>`;
        });
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;

        let bodyHtml = '';
        const hoursInDay = [];
        const startHour = 8;
        for (let i = 0; i < 24; i++) hoursInDay.push((startHour + i) % 24);

        hoursInDay.forEach(hour => {
            const hourLabel = `${String(hour).padStart(2, '0')}:00 - ${String(hour).padStart(2, '0')}:59`;
            bodyHtml += `<tr><td class="text-center fw-medium" style="width: 150px;">${hourLabel}</td>`;
            
            const hourData = dayData ? (dayData.pivotData[hour] || {}) : {};

            sortedPivotKeys.forEach(key => {
                bodyHtml += createCellHtml(hourData[key], false);
            });
            bodyHtml += '</tr>';
        });
        tableBody.innerHTML = bodyHtml;

        let footerHtml = '<tr><th class="text-end" style="width: 150px;">Total</th>';
        const totals = dayData ? dayData.totalsByPivotKey : {};
        
        sortedPivotKeys.forEach(key => {
            footerHtml += createCellHtml(totals[key], true);
        });
        footerHtml += '</tr>';
        tableFoot.innerHTML = footerHtml;
    }

    navContainer.innerHTML = '';
    const dates = Object.keys(dataByDate).sort();

    dates.forEach((dateKey, index) => {
        const isActive = (index === 0);
        const button = document.createElement('button');
        button.className = `nav-link ${isActive ? 'active' : ''}`;
        button.dataset.bsToggle = 'pill';
        button.dataset.dateKey = dateKey;
        button.textContent = dateKey;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            renderTableForDate(e.target.dataset.dateKey); 
        });
        navContainer.appendChild(button);
    });
    if (dates.length > 0) {
        renderTableForDate(dates[0]);
    } else {
         tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No production data found for this period.</td></tr>';
    }
}

function updateMobileFab(activeTabId) {
    const fabContainer = document.getElementById('mobileFabContainer');
    const fabBtn = document.getElementById('mobileFabBtn');
    
    if (!fabContainer || !fabBtn) return;

    const newFabBtn = fabBtn.cloneNode(true);
    fabBtn.parentNode.replaceChild(newFabBtn, fabBtn);

    if (activeTabId === 'production-history-tab' && typeof openAddPartModal === 'function') {
        fabContainer.style.display = 'block';
        newFabBtn.onclick = () => openAddPartModal();
    } else if (activeTabId === 'entry-history-tab' && typeof openAddEntryModal === 'function') {
        fabContainer.style.display = 'block';
        newFabBtn.onclick = () => openAddEntryModal();
    } else {
        fabContainer.style.display = 'none';
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

    // Attach listeners for action forms
    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    
    document.getElementById('adjustStockForm')?.addEventListener('submit', handleAdjustStockSubmit);
    document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
    document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));

    const debouncedFilterChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleFilterChange, 500);
    };

    document.getElementById('filterSearch').addEventListener('input', debouncedFilterChange);
    document.getElementById('filterCountType').addEventListener('change', handleFilterChange);
    document.getElementById('filterStartDate').addEventListener('change', handleFilterChange);
    document.getElementById('filterEndDate').addEventListener('change', handleFilterChange);
    document.getElementById('entry_from_location_id')?.addEventListener('change', updateAvailableStockDisplay);
    
    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.id;
            updateFilterVisibility(activeTabId);
            handleFilterChange();
            updateControls(activeTabId);
            updateMobileFab(activeTabId);
        });
    });

    const activeTab = document.querySelector('#mainTab .nav-link.active');
    if (activeTab) {
        const activeTabId = activeTab.id;
        updateFilterVisibility(activeTabId);
        handleFilterChange();
        updateControls(activeTabId);
        updateMobileFab(activeTabId);
    }

    const loadTransferBtn = document.getElementById('entry_load_transfer_btn');
    if (loadTransferBtn) {
        loadTransferBtn.addEventListener('click', autoFillFromTransferOrder_PC);
    }

    const transferIdInput = document.getElementById('entry_transfer_id_input');
    if (transferIdInput) {
        transferIdInput.addEventListener('keypress', (e) => {
            e.target.value = e.target.value.toUpperCase();
            if (e.key === 'Enter') {
                e.preventDefault();
                autoFillFromTransferOrder_PC();
            }
        });
    }

    const timeInputs = document.querySelectorAll('input[name="start_time"], input[name="end_time"], input[name="log_time"]');
    timeInputs.forEach(input => {
        input.addEventListener('input', applyTimeMask);
    });
});