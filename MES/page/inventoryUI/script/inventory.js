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

function initializeFilters() {
    const savedFilters = localStorage.getItem('inventoryUIFilters');

    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        document.getElementById('filterPartNo').value = filters.part_no || '';
        document.getElementById('filterLotNo').value = filters.lot_no || '';
        document.getElementById('filterLine').value = filters.line || '';
        document.getElementById('filterModel').value = filters.model || '';
        document.getElementById('filterCountType').value = filters.count_type || '';

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        document.getElementById('filterStartDate').value = filters.startDate || dateStr;
        document.getElementById('filterEndDate').value = filters.endDate || dateStr;

    } else {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        document.getElementById("filterStartDate").value = dateStr;
        document.getElementById("filterEndDate").value = dateStr;
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
        case 'transaction-log-tab':
            fetchAllTransactions(1);
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

function updateFilterVisibility(activeTabId) {
    // แสดงทุกฟิลเตอร์เป็นค่าเริ่มต้น
    document.getElementById('filterPartNo').style.display = 'block';
    document.getElementById('filterLotNo').style.display = 'block';
    document.getElementById('filterLine').style.display = 'block';
    document.getElementById('filterModel').style.display = 'block';
    document.getElementById('filterCountType').style.display = 'block';
    document.getElementById('filterStartDate').style.display = 'block';
    document.getElementById('filterEndDate').style.display = 'block';
    document.querySelector('#main-filters span').style.display = 'inline';

    // ถ้า Tab ที่เลือกคือ Stock/Inventory
    if (activeTabId === 'stock-count-tab') {
        document.getElementById('filterPartNo').placeholder = 'Search SAP, Part No, Description';
        // ซ่อนฟิลเตอร์ที่ไม่เกี่ยวข้อง
        document.getElementById('filterLotNo').style.display = 'none';
        document.getElementById('filterLine').style.display = 'none';
        document.getElementById('filterModel').style.display = 'none';
        document.getElementById('filterCountType').style.display = 'none';
        document.getElementById('filterStartDate').style.display = 'none';
        document.getElementById('filterEndDate').style.display = 'none';
        document.querySelector('#main-filters span').style.display = 'none'; // ซ่อนขีด "-"
    } else {
        document.getElementById('filterPartNo').placeholder = 'Part No.';
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
        case 'wip-report-tab': // Although this tab might not be in use, we keep the logic
            buttonGroup.innerHTML = `<button class="btn btn-primary" onclick="exportWipReportToExcel()">Export</button>`;
            break;
    }
}

function applyTimeMask(event) {
    const input = event.target;
    // 1. เอาทุกอย่างที่ไม่ใช่ตัวเลขออกไป
    let value = input.value.replace(/\D/g, ''); 

    // 2. ถ้ามีความยาวเกิน 2 ตัวอักษร ให้ใส่ : หลังตัวที่ 2
    if (value.length > 2) {
        value = value.substring(0, 2) + ':' + value.substring(2);
    }
    // 3. ถ้ามีความยาวเกิน 5 ตัวอักษร ให้ใส่ : หลังตัวที่ 5 (นับรวม :)
    if (value.length > 5) {
        value = value.substring(0, 5) + ':' + value.substring(5);
    }
    // 4. จำกัดความยาวสูงสุดไม่ให้เกิน 8 ตัวอักษร (HH:MM:SS)
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

async function fetchReceiptHistory(page = 1) {
    receiptHistoryCurrentPage = page;
    showSpinner();
    
    const params = {
        page: page,
        part_no: document.getElementById('filterPartNo').value,
        line: document.getElementById('filterLine').value,
        lot_no: document.getElementById('filterLotNo').value,
        startDate: document.getElementById('filterStartDate').value,
        endDate: document.getElementById('filterEndDate').value,
    };

    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_receipt_history', 'GET', null, params);
        if (result.success) {
            renderReceiptHistoryTable(result.data);
            renderPagination('entryHistoryPagination', result.total, result.page, ROWS_PER_PAGE, fetchReceiptHistory);
        } else {
            document.getElementById('entryHistoryTableBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

function renderReceiptHistoryTable(data) {
    const tbody = document.getElementById('entryHistoryTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No IN transactions found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to edit';
        tr.addEventListener('click', () => editTransaction(row.transaction_id, 'entry'));

        const transactionDate = new Date(row.transaction_timestamp);
        tr.innerHTML = `
            <td>${transactionDate.toLocaleDateString('en-GB')}</td>
            <td>${transactionDate.toTimeString().substring(0, 8)}</td>
            <td>${row.source_location || 'External'}</td>
            <td>${row.destination_location || 'N/A'}</td>
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.lot_no || ''}</td>
            <td class="text-end">${parseFloat(row.quantity).toLocaleString()}</td>
            <td>${row.notes || ''}</td>
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
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No production history found.</td></tr>`;
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = row.transaction_id;
        tr.style.cursor = 'pointer';
        tr.title = 'Click to edit';
        tr.addEventListener('click', () => editTransaction(row.transaction_id, 'production'));

        const transactionDate = new Date(row.transaction_timestamp);

        // --- ส่วน Logic ใหม่ ---
        const startTimeStr = row.start_time || '00:00:00';
        const endTimeStr = row.end_time || '00:00:00';

        // 1. จัดรูปแบบช่วงเวลา
        const timeRange = (row.start_time && row.end_time) ? `${startTimeStr} - ${endTimeStr}` : (transactionDate.toTimeString().substring(0, 8));

        // 2. คำนวณ Duration
        let durationInMinutes = '-';
        if (row.start_time && row.end_time) {
            const startDate = new Date(`1970-01-01T${startTimeStr}Z`);
            const endDate = new Date(`1970-01-01T${endTimeStr}Z`);
            // Handle overnight case
            if (endDate < startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }
            const diffMs = endDate - startDate;
            durationInMinutes = Math.round(diffMs / 60000);
        }
        // --- สิ้นสุด Logic ใหม่ ---

        tr.innerHTML = `
            <td>${transactionDate.toLocaleDateString('en-GB')}</td>
            <td>${timeRange}</td>
            <td class="text-center">${durationInMinutes}</td>
            <td>${row.location_name || 'N/A'}</td>
            <td>${row.part_no}</td>
            <td>${row.lot_no || ''}</td>
            <td class="text-end">${parseFloat(row.quantity).toLocaleString()}</td>
            <td class="text-center">${row.count_type}</td>
            <td>${row.notes || ''}</td>
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
    const tbody = document.getElementById('wipOnHandTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No Work-in-Progress items found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to adjust stock';
        tr.addEventListener('click', () => openAdjustStockModal(row));

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
    const tbody = document.getElementById('productionVarianceTableBody');
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No production variance data found.</td></tr>';
        return;
    }
    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to see transaction details';
        // --- ส่วนที่แก้ไข ---
        // เพิ่มการตรวจสอบว่า row.location_id มีค่าหรือไม่ก่อนเพิ่ม Event
        if (row.location_id) {
            tr.addEventListener('click', () => openVarianceDetailModal(row.item_id, row.location_id, row.part_no));
        }
        // --- สิ้นสุด ---

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

        tr.style.cursor = 'pointer';
        tr.title = 'Click to see details by location';
        tr.addEventListener('click', () => openStockDetailModal(row.item_id, row.part_no));

        const onHandQty = parseFloat(row.total_onhand) || 0;

        tr.innerHTML = `
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td><small>${row.used_models || '-'}</small></td>
            <td>${row.part_description || ''}</td>
            <td class="text-end fw-bold">${onHandQty.toLocaleString()}</td>
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
        const tr = document.createElement('tr'); // << เพิ่มบรรทัดที่หายไปกลับเข้ามา
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
            <td>${row.sap_no}</td>
            <td>${row.part_no}</td>
            <td>${row.part_description || ''}</td>
            <td>${row.lot_no}</td>
            <td class="text-end">${parseFloat(row.total_in).toLocaleString()}</td>
            <td class="text-end">${parseFloat(row.total_out).toLocaleString()}</td>
            <td class="text-end fw-bold ${textColorClass}">${variance.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchAllTransactions(page = 1) {
    showSpinner();
    try {
        const params = {
            page: page,
            part_no: document.getElementById('filterPartNo').value,
            line: document.getElementById('filterLine').value, // API จะค้นหาทั้ง Source และ Destination
            lot_no: document.getElementById('filterLotNo').value,
            startDate: document.getElementById('filterStartDate').value,
            endDate: document.getElementById('filterEndDate').value,
        };
        const result = await sendRequest(INVENTORY_API_URL, 'get_all_transactions', 'GET', null, params);
        if (result.success) {
            renderAllTransactionsTable(result.data);
            renderPagination('transactionLogPagination', result.total, result.page, result.limit, fetchAllTransactions);
        }
    } finally {
        hideSpinner();
    }
}

function renderAllTransactionsTable(data) {
    const tbody = document.getElementById('transactionLogTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">No transactions found.</td></tr>`;
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
            <td>${transactionDate.toLocaleString('en-GB')}</td>
            <td><span class="badge bg-secondary">${row.transaction_type}</span></td>
            <td>${row.part_no}</td>
            <td>${row.source_location || 'N/A'}</td>
            <td>${row.destination_location || 'N/A'}</td>
            <td class="text-end fw-bold ${quantityClass}">${quantityPrefix}${quantity.toLocaleString()}</td>
            <td>${row.lot_no || ''}</td>
            <td>${row.username || 'N/A'}</td>
            <td>${row.notes || ''}</td>
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
    const currentTime = now.toTimeString().substring(0, 8);
    document.getElementById('out_start_time').value = currentTime;
    document.getElementById('out_end_time').value = currentTime;

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

    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
    document.getElementById('editEntryForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('editProductionForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('adjustStockForm')?.addEventListener('submit', handleAdjustStockSubmit);
    document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
    document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));

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
    document.getElementById('entry_from_location_id')?.addEventListener('change', updateAvailableStockDisplay);

    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.id;
            handleFilterChange(); // โหลดข้อมูลใหม่
            updateControls(activeTabId); // สร้างปุ่มใหม่
            updateFilterVisibility(activeTabId); // แสดง/ซ่อนฟิลเตอร์
        });
    });

    const activeTab = document.querySelector('#mainTab .nav-link.active');
    if (activeTab) {
        const activeTabId = activeTab.id;
        handleFilterChange(); // โหลดข้อมูลเริ่มต้น
        updateControls(activeTabId); // สร้างปุ่มเริ่มต้น
        updateFilterVisibility(activeTabId); // แสดง/ซ่อนฟิลเตอร์เริ่มต้น
    }

    const timeInputs = document.querySelectorAll('input[name="start_time"], input[name="end_time"], input[name="log_time"]');
    timeInputs.forEach(input => {
        input.addEventListener('input', applyTimeMask);
    });
});