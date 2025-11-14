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
            const encodeParam = (key, value) => {
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            };
            const paramStrings = Object.entries(params).flatMap(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.map(item => encodeParam(key, item));
                } else {
                    return [encodeParam(key, value)];
                }
            });
            if (paramStrings.length > 0) {
                 url += `&${paramStrings.join('&')}`;
            }
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const options = { method, headers: {} };
        if (method.toUpperCase() !== 'GET' && csrfToken) {
            options.headers['X-CSRF-TOKEN'] = csrfToken;
        }
        if (body) {
            options.headers['Content-Type'] = 'application/json;charset=UTF-8';
            
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
                <div class="btn-group">
                  <button type="button" class="btn btn-info dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                    <i class="fas fa-chart-pie me-2"></i> Summaries
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="#" onclick="openSummaryModal(this); return false;">Summary by Part</a></li>
                    <li><a class="dropdown-item" href="#" onclick="openHourlyProductionModal(); return false;">Hourly Summary</a></li>
                  </ul>
                </div>
                
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
        //document.getElementById('entry_item_id').value = '';

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
        //document.getElementById('out_item_id').value = '';

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
            <td class="text-center">${row.sap_no}</td>
            <td class="text-center">${row.part_no}</td>
            <td class="text-center">${row.model || ''}</td>
            <td class="text-start" style="padding-left: 1rem;">${row.part_description || ''}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
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
            <td class="text-start" style="padding-left: 1rem;">${row.part_description || ''}</td>
            <td class="text-center">${row.lot_no}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
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
            <td class="text-start">${transactionDate.toLocaleDateString('en-GB')}</td>
            <td class="text-start">${transactionDate.toTimeString().substring(0, 8)}</td>
            <td class="text-center">${row.source_location || 'External'}</td>
            <td class="text-center">${row.destination_location || 'N/A'}</td>
            <td class="text-center">${row.sap_no}</td>
            <td class="text-center">${row.part_no}</td>
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

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',')      // 1. แยกด้วยจุลภาค
                                .map(term => term.trim())  // 2. ตัดช่องว่างหน้า-หลัง
                                .filter(term => term.length > 0); // 3. กรองคำว่างๆ ทิ้ง
    
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
    
    // ( colspan="10" ยังคงถูกต้อง เพราะ Layout ใหม่ของเราก็มี 10 คอลัมน์)
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

        // --- [แก้ไข] ส่วนของการเตรียมข้อมูล Date/Time ---
        const transactionDate = new Date(row.transaction_timestamp);
        
        // (Date): ใช้ Date object หลัก
        const dateStr = transactionDate.toLocaleDateString('en-GB');

        // (Time): เราจะใช้ 'end_time' ถ้ามี, 
        // ถ้าไม่มี (หรือเป็น 00:00:00) ให้ใช้เวลาจาก 'transaction_timestamp' หลักแทน
        const timeStr = (row.end_time && row.end_time.substring(0, 8) !== '00:00:00')
                        ? row.end_time.substring(0, 8)
                        : transactionDate.toTimeString().substring(0, 8);
        
        // (ลบการคำนวณ 'timeRange' และ 'durationInMinutes' ออกทั้งหมด)
        // --- [จบส่วนแก้ไข] ---
        
        
        // --- [แก้ไข] ส่วนของ tr.innerHTML ---
        // (จัดเรียงใหม่ตาม Layout ที่ตกลงกัน)
        tr.innerHTML = `
            <td class="text-start">${dateStr}</td>
            <td class="text-start">${timeStr}</td>
            <td class="text-center">${row.sap_no}</td> <td class="text-center">${row.part_no}</td>
            <td class="text-center">${row.model || ''}</td>
            <td class="text-center">${row.lot_no || ''}</td>
            <td class="text-center">${row.location_name || 'N/A'}</td> <td class="text-center">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.count_type}</td>
            <td class="text-center">${row.notes || ''}</td>
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

        const onHandQty = parseFloat(row.quantity) || 0;
        tr.innerHTML = `
            <td class="text-start">${row.location_name}</td>
            <td class="text-center">${row.sap_no}</td>
            <td class="text-center">${row.part_no}</td>
            <td class="text-center">${row.model || ''}</td>
            <td class="text-start" style="padding-left: 1rem;">${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
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

        const onHandQty = parseFloat(row.total_onhand) || 0;

        tr.innerHTML = `
            <td class="text-start">${row.sap_no}</td>
            <td class="text-start">${row.part_no}</td>
            <td class="text-start">${row.used_models || '-'}</td>
            <td class="text-start" style="padding-left: 1rem;">${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
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
            
            <td class="text-center">${row.created_by || 'N/A'}</td> 
            
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

    // 🛑 [แก้ไข] อ่านจาก Key "_OUT"
    const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry_OUT')); 
    if (lastData) {
        const locationSelect = document.getElementById('out_location_id');
        if (locationSelect) locationSelect.value = lastData.location_id || ''; // (แก้ชื่อ key ให้ตรง)
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
    
    updateAvailableStockDisplay();
    new bootstrap.Modal(document.getElementById('addEntryModal')).show();
}

function lockEntryForm() {
    // (Input)
    document.getElementById('entry_item_search').readOnly = true;
    document.getElementById('entry_item_search').classList.add('form-control-readonly');
    document.getElementById('entry_lot_no').readOnly = true;
    document.getElementById('entry_lot_no').classList.add('form-control-readonly');
    // (Select)
    document.getElementById('entry_from_location_id').disabled = true;
    document.getElementById('entry_from_location_id').classList.add('form-control-readonly');
    document.getElementById('entry_to_location_id').disabled = true;
    document.getElementById('entry_to_location_id').classList.add('form-control-readonly');
}

function unlockEntryForm() {
    // (Input)
    document.getElementById('entry_item_search').readOnly = false;
    document.getElementById('entry_item_search').classList.remove('form-control-readonly');
    document.getElementById('entry_lot_no').readOnly = false;
    document.getElementById('entry_lot_no').classList.remove('form-control-readonly');
    // (Select)
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

        // --- กรอกข้อมูลลงฟอร์ม ---
        selectedInItem = { 
            item_id: order.item_id, 
            sap_no: order.sap_no, 
            part_no: order.part_no, 
            part_description: order.part_description 
        };
        
        document.getElementById('entry_item_search').value = `${order.sap_no} | ${order.part_no}`;
        document.getElementById('entry_item_id').value = order.item_id;
        document.getElementById('entry_lot_no').value = order.transfer_uuid;
        document.getElementById('entry_quantity_in').value = order.quantity;
        document.getElementById('entry_from_location_id').value = order.from_location_id;
        document.getElementById('entry_to_location_id').value = order.to_location_id;
        document.getElementById('entry_notes').value = order.notes || '';
        document.getElementById('entry_transfer_uuid').value = order.transfer_uuid;

        // --- ล็อกฟอร์ม ---
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
                <td class="text-end">${parseFloat(detail.quantity).toLocaleString()}</td>
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

    const searchString = document.getElementById('filterSearch').value;
    const searchTerms = searchString.split(',').map(term => term.trim()).filter(term => term.length > 0);
    const params = {
        'search_terms[]': searchTerms,
        count_type: document.getElementById('filterCountType').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    // 2. [แก้ไข] เรียก API ใหม่ (get_production_summary)
    const result = await sendRequest(INVENTORY_API_URL, 'get_production_summary', 'GET', null, params);

    // 3. [แก้ไข] ตรวจสอบ result.summary
    if (result.success && result.summary && result.summary.length > 0) {
        modalBody.innerHTML = '';
        
        // 4. [แก้ไข] วนลูป summary ที่ได้จาก API (ไม่ต้องคำนวณเอง)
        result.summary.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.sap_no}</td>
                <td>${row.part_no}</td>
                <td>${row.count_type}</td>
                <td class="text-end">${parseFloat(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        // 5. [แก้ไข] สร้าง Grand Total จาก result.grand_total (ที่ API คำนวณมาให้)
        let overallGrandTotal = 0;
        
        // (เพิ่มแถวสำหรับแต่ละ Type)
        result.grand_total.forEach(row => {
            const quantity = parseFloat(row.total_quantity) || 0;
            overallGrandTotal += quantity;
            const tr = document.createElement('tr');
            tr.className = 'table-dark fw-bold';
            tr.innerHTML = `
                <td colspan="3" class="text-start">Grand Total (${row.count_type})</td>
                <td class="text-end">${quantity.toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        // (เพิ่มแถวสำหรับยอดรวมทั้งหมด)
        if (result.grand_total.length > 1) { // แสดงยอดรวมก็ต่อเมื่อมีมากกว่า 1 Type
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
    if (!modalBody) {
        console.error('History Summary modal body not found!');
        return;
    }
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
                <td class="text-end">${parseFloat(row.total_quantity).toLocaleString()}</td>
            `;
            modalBody.appendChild(tr);
        });

        const grandTotalRow = document.createElement('tr');
        grandTotalRow.className = 'table-group-divider fw-bold';
        let grandTotal = 0;
        result.grand_total.forEach(row => grandTotal += parseFloat(row.total_quantity));
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
    display.classList.remove('text-danger');
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
            
            const qtyFg = parseFloat(data.quantity_fg) || 0;
            const qtyHold = parseFloat(data.quantity_hold) || 0;
            const qtyScrap = parseFloat(data.quantity_scrap) || 0;

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
                showToast("บันทึกสำเร็จ", 'var(--bs-success)');
                
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
                    confirmed_quantity: data.confirmed_quantity 
                };
                
                const res = await sendRequest(TRANSFER_API_URL, 'confirm_transfer', 'POST', body);
                if (!res.success) throw new Error(res.message);

                showToast("ยืนยันการรับของสำเร็จ!", 'var(--bs-success)');
                
                bootstrap.Modal.getInstance(form.closest('.modal')).hide();
                await fetchReceiptHistory(receiptHistoryCurrentPage); 
                selectedInItem = null;

            } else {
                if (!data.to_location_id) throw new Error("กรุณาเลือก Location ปลายทาง (To)");
                
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
            const res = await sendRequest(INVENTORY_API_URL, 'update_transaction', 'POST', Object.fromEntries(formData));
            if (!res.success) throw new Error(res.message);

            showToast("แก้ไขสำเร็จ", 'var(--bs-success)');
            bootstrap.Modal.getInstance(form.closest('.modal'))?.hide();
            if (action === 'editEntry') await fetchReceiptHistory(receiptHistoryCurrentPage);
            if (action === 'editProduction') await fetchProductionHistory(productionHistoryCurrentPage);
        }
        hideSpinner();
    } catch (error) {
        hideSpinner();
        const errorMessage = error.message || 'An unexpected error occurred.';
        
        if (errorMessage.includes("ใบโอนย้ายนี้ถูกประมวลผลไปแล้ว") || errorMessage.includes("ไม่พบใบโอนย้ายนี้")) {
            showToast(errorMessage, 'var(--bs-danger)');
            unlockEntryForm();
            document.getElementById('entry_transfer_id_input').value = '';
            document.getElementById('entry_transfer_uuid').value = '';
            g_CurrentPCTransferOrder = null;
            selectedInItem = null; 

        } else if (errorMessage === 'SCAN_ALREADY_USED') {
            showToast("Scan ID นี้ถูกใช้งานไปแล้ว", 'var(--bs-warning)');
        } else {
            showToast(errorMessage, 'var(--bs-danger)');
        }
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
            if (type === 'entry') {
                fetchReceiptHistory(receiptHistoryCurrentPage);
            } else if (type === 'production') {
                fetchProductionHistory(productionHistoryCurrentPage);
            }
        }
    } finally {
        hideSpinner();
    }
    console.warn("deleteTransaction is deprecated. Use deleteOrReverseTransaction via handleDeleteFromModal.");
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
                saveBtn = modal._element.querySelector('button[type="submit"]');
                document.getElementById('edit_entry_transaction_id').value = data.transaction_id;
                document.getElementById('edit_entry_item_display').value = `${data.sap_no} | ${data.part_no}`;
                document.getElementById('edit_entry_location_id').value = data.to_location_id;
                document.getElementById('edit_entry_quantity').value = data.quantity;
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
                document.getElementById('edit_production_quantity').value = data.quantity;
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
            } else {
                deleteBtn.textContent = 'Delete';
                deleteBtn.classList.remove('btn-warning');
                deleteBtn.classList.add('btn-danger');
                deleteBtn.dataset.transferUuid = '';
                if (saveBtn) saveBtn.style.display = 'inline-block';
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

async function openHourlySummaryModal() {
    const modalBody = document.getElementById('hourlySummaryTableBody');
    if (!modalBody) {
        console.error('Hourly Summary modal body not found!');
        return;
    }
    modalBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading hourly data...</td></tr>';

    const summaryModal = new bootstrap.Modal(document.getElementById('hourlySummaryModal'));
    summaryModal.show();

    // 1. รวบรวมฟิลเตอร์
    // (สำคัญ: SP ตัวนี้ใช้แค่ 'endDate' เป็นหลัก)
    const params = {
        endDate: document.getElementById('filterEndDate').value,
        // (เราสามารถส่งฟิลเตอร์อื่นไปได้ ถ้า SP รองรับ)
        // search_term: document.getElementById('filterSearch').value, 
    };

    // 2. เรียก API ใหม่
    const result = await sendRequest(INVENTORY_API_URL, 'get_production_hourly_summary', 'GET', null, params);

    // 3. แสดงผลข้อมูล
    if (result.success && result.data && result.data.length > 0) {
        modalBody.innerHTML = '';
        
        result.data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-center">${row.hour}</td>
                <td class="text-end">${parseFloat(row.availability).toFixed(1)}%</td>
                <td class="text-end">${parseFloat(row.performance).toFixed(1)}%</td>
                <td class="text-end">${parseFloat(row.quality).toFixed(1)}%</td>
                <td class="text-end fw-bold">${parseFloat(row.oee).toFixed(1)}%</td>
            `;
            modalBody.appendChild(tr);
        });

    } else {
        modalBody.innerHTML = '<tr><td colspan="5" class="text-center">No hourly data available for this date.</td></tr>';
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
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No hourly data available for this date/filter.</td></tr>';
        return;
    }

    const dataByDate = {};

    result.data.forEach(row => {
        const dateKey = row.ProductionDate;
        const hour = parseInt(row.hour_of_day);
        const pivotKey = `${row.part_no} (${row.sap_no})`; 
        
        const counts = {
            fg: parseFloat(row.Qty_FG),
            hold: parseFloat(row.Qty_HOLD),
            scrap: parseFloat(row.Qty_SCRAP)
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

    const loadTransferBtn = document.getElementById('entry_load_transfer_btn');
    if (loadTransferBtn) {
        loadTransferBtn.addEventListener('click', autoFillFromTransferOrder_PC);
    }

    const transferIdInput = document.getElementById('entry_transfer_id_input');
    if (transferIdInput) {
        transferIdInput.addEventListener('keypress', (e) => {
            e.target.value = e.target.value.toUpperCase(); // (บังคับพิมพ์ใหญ่)
            if (e.key === 'Enter') {
                e.preventDefault(); // (กันฟอร์ม Submit)
                autoFillFromTransferOrder_PC();
            }
        });
    }

    // Time Mask for time inputs
    const timeInputs = document.querySelectorAll('input[name="start_time"], input[name="end_time"], input[name="log_time"]');
    timeInputs.forEach(input => {
        input.addEventListener('input', applyTimeMask);
    });
});
