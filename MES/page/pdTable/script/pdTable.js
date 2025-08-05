"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES & CONSTANTS
// =================================================================
const PD_API_URL = '../../api/pdTable/pdTableManage.php';
const WIP_API_URL = '../../api/pdTable/wipManage.php';
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
        const result = await sendRequest(WIP_API_URL, 'get_receipt_history', 'GET', null, { page });
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
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No receipt history found in the new system.</td></tr>';
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
        const result = await sendRequest(PD_API_URL, 'get_production_history', 'GET', null, params);
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
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No production history found in the new system.</td></tr>`;
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
        `;
        
        tbody.appendChild(tr);
    });
}

// =================================================================
// SECTION: REFACTORED REPORTING FUNCTIONS
// =================================================================

async function fetchStockInventoryReport(page = 1) {
    stockCurrentPage = page;
    showSpinner();
    try {
        const search = document.getElementById('filterPartNo').value; // ใช้ Filter หลักในการค้นหา
        const result = await sendRequest(WIP_API_URL, 'get_stock_inventory_report', 'GET', null, { page, search });
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

async function fetchWipInventoryReport(page = 1) {
    wipCurrentPage = page;
    showSpinner();
    try {
        const params = {
            page: page,
            part_no: document.getElementById('filterPartNo').value,
            location: document.getElementById('filterLine').value 
        };
        const result = await sendRequest(WIP_API_URL, 'get_wip_inventory_report', 'GET', null, params);
        if (result.success) {
            renderWipInventoryTable(result.data);
            renderPagination('wipReportPagination', result.total, result.page, ROWS_PER_PAGE, fetchWipInventoryReport);
        } else {
            document.getElementById('wipReportTableBody').innerHTML = `<tr><td colspan="5" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

function renderWipInventoryTable(data) {
    const tbody = document.getElementById('wipReportTableBody');
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

// =================================================================
// SECTION: OLD SYSTEM FUNCTIONS (For WIP Reports - to be refactored later)
// =================================================================
async function fetchWipReport(page = 1) {
    const reportBody = document.getElementById('wipReportTableBody');
    if (!reportBody) return;
    reportBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading Report...</td></tr>';
    
    const params = new URLSearchParams({
        page: page,
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    showSpinner();
    try {
        const response = await fetch(`${WIP_API_URL}?action=get_wip_report&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.cachedWipReport = result.data;

        reportBody.innerHTML = '';
        if (result.data.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="7" class="text-center">No WIP data found.</td></tr>';
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to see details';
                tr.addEventListener('click', () => {
                    if (typeof openWipDetailModal === 'function') {
                        openWipDetailModal(item);
                    }
                });

                tr.innerHTML = `
                    <td>${item.line}</td>
                    <td>${item.model}</td>
                    <td>${item.part_no}</td>
                    <td>${item.part_description || ''}</td>
                    <td style="text-align: center;">${parseInt(item.total_in).toLocaleString()}</td>
                    <td style="text-align: center;">${parseInt(item.total_out).toLocaleString()}</td>
                    <td class="fw-bold text-center">${(item.total_out - item.total_in).toLocaleString()}</td>
                `;
                reportBody.appendChild(tr);
            });
        }
        
        renderPagination('wipReportPagination', result.total, result.page, ROWS_PER_PAGE, fetchWipReport);

    } catch (error) {
        console.error('Failed to fetch WIP report:', error);
        window.cachedWipReport = [];
        reportBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    } finally {
        hideSpinner();
    }
}

/**
 * Renders the data for the old WIP/Variance report table.
 * @param {Array<object>} data - The WIP report data from the API.
 */
function renderWipTable(data) {
    const reportBody = document.getElementById('wipReportTableBody');
    if (!reportBody) return;

    reportBody.innerHTML = '';
    if (!data || data.length === 0) {
        reportBody.innerHTML = '<tr><td colspan="7" class="text-center">No WIP data found.</td></tr>';
        return;
    }

    data.forEach(item => {
        const variance = parseInt(item.variance, 10);
        let textColorClass = '';
        if (variance > 0) {
            textColorClass = 'text-warning';
        } else if (variance < 0) {
            textColorClass = 'text-danger';
        }

        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click to see details';
        
        // Add event listener to open drill-down modal
        tr.addEventListener('click', () => {
            if (typeof openWipDetailModal === 'function') {
                openWipDetailModal(item);
            }
        });

        tr.innerHTML = `
            <td>${item.line}</td>
            <td>${item.model}</td>
            <td>${item.part_no}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${parseInt(item.total_in).toLocaleString()}</td>
            <td class="text-center">${parseInt(item.total_out).toLocaleString()}</td>
            <td class="fw-bold text-center ${textColorClass}">${variance.toLocaleString()}</td>
        `;
        reportBody.appendChild(tr);
    });
}

async function fetchWipReportByLot(page = 1) {
    const reportBody = document.getElementById('wipReportByLotTableBody');
    if (!reportBody) return;
    reportBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading Report by Lot...</td></tr>';
    
    const params = new URLSearchParams({
        page: page,
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || '',
        lot_no: document.getElementById('filterLotNo')?.value || '',
        startDate: document.getElementById('filterStartDate')?.value || '',
        endDate: document.getElementById('filterEndDate')?.value || ''
    });

    showSpinner();
    try {
        const response = await fetch(`${WIP_API_URL}?action=get_wip_report_by_lot&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        window.cachedWipReportByLot = result.data;

        reportBody.innerHTML = '';
        if (result.data.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="8" class="text-center">No active WIP Lot found.</td></tr>';
        } else {
            result.data.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to see details for this Lot';
                tr.addEventListener('click', () => {
                    if (typeof openWipDetailModal === 'function') {
                        openWipDetailModal(item);
                    }
                });

                tr.innerHTML = `
                    <td>${item.line}</td>
                    <td>${item.model}</td>
                    <td>${item.part_no}</td>
                    <td>${item.part_description || ''}</td>
                    <td>${item.lot_no}</td>
                    <td style="text-align: center;">${parseInt(item.total_in).toLocaleString()}</td>
                    <td style="text-align: center;">${parseInt(item.total_out).toLocaleString()}</td>
                    <td class="fw-bold text-center">${(item.total_out - item.total_in).toLocaleString()}</td>
                `;
                reportBody.appendChild(tr);
            });
        }
        
        renderPagination('wipReportByLotPagination', result.total, result.page, ROWS_PER_PAGE, fetchWipReportByLot);

    } catch (error) {
        console.error('Failed to fetch WIP report by lot:', error);
        window.cachedWipReportByLot = [];
        reportBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    } finally {
        hideSpinner();
    }
}

async function fetchStockCountReport(page = 1) {
    const tableBody = document.getElementById('stockCountTableBody');
    if (!tableBody) return;

    const tableHead = tableBody.previousElementSibling;
    if (tableHead) {
        tableHead.innerHTML = `
            <tr>
                <th>Line</th>
                <th>Model</th>
                <th>Part No.</th>
                <th>Part Description</th>
                <th class="text-end">Total IN</th>
                <th class="text-end">Total OUT</th>
                <th class="text-end">On-Hand</th>
                ${canManage ? '<th class="text-center">Actions</th>' : ''}
            </tr>
        `;
    }

    const colspan = canManage ? 8 : 7;
    tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">Loading Stock Count...</td></tr>`;

    const params = new URLSearchParams({
        page: page, // เพิ่ม page
        line: document.getElementById('filterLine')?.value || '',
        part_no: document.getElementById('filterPartNo')?.value || '',
        model: document.getElementById('filterModel')?.value || ''
    });

    showSpinner(); // <-- เพิ่ม: แสดง Spinner
    try {
        const response = await fetch(`../../api/pdTable/wipManage.php?action=get_stock_count&${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        
        tableBody.innerHTML = '';
        if (!result.data || result.data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center">No parts found in parameters.</td></tr>`;
        } else {
            result.data.forEach(row => {
                const tr = document.createElement('tr');
                const variance = parseInt(row.variance, 10);
                let varianceClass = '';
                if (variance == 0) {
                    varianceClass = 'text-secondary';
                } else if (variance > 0 && variance <= 100) {
                    varianceClass = 'text-danger';
                } else if (variance > 100 && variance < 400) {
                    varianceClass = 'text-warning';
                } else if (variance > 400) {
                    varianceClass = 'text-success';
                } else if (variance < 0) {
                    varianceClass = 'text-info';
                }

                let actionsHtml = '';
                if (canManage) {
                    actionsHtml = `
                        <td class="text-center">
                            <button class="btn btn-sm btn-warning" onclick='openAdjustStockModal(${JSON.stringify(row)})'>
                                Adjust
                            </button>
                        </td>
                    `;
                }
                tr.innerHTML = `
                    <td>${row.line}</td>
                    <td>${row.model}</td>
                    <td>${row.part_no}</td>
                    <td>${row.part_description || ''}</td>
                    <td class="text-end">${parseInt(row.total_in).toLocaleString()}</td>
                    <td class="text-end">${parseInt(row.total_out).toLocaleString()}</td>
                    <td class="text-end fw-bold ${varianceClass}">${variance.toLocaleString()}</td>
                    ${actionsHtml}
                `;
                tableBody.appendChild(tr);
            });
        }
        
        // ===== ส่วนที่แก้ไข: เรียกใช้ฟังก์ชัน Pagination ใหม่ =====
        const totalPages = Math.ceil(result.total / result.limit);
        renderAdvancedPagination('stockCountPagination', result.page, totalPages, fetchStockCountReport);

    } catch (error) {
        console.error("Failed to fetch Stock Count report:", error);
        tableBody.innerHTML = `<tr><td colspan="${colspan}" class="text-center text-danger">Failed to load report.</td></tr>`;
    } finally {
        hideSpinner(); // <-- เพิ่ม: ซ่อน Spinner เสมอ
    }
}


// =================================================================
// SECTION: MODAL HANDLING
// =================================================================
async function populateModalDatalists() {
    const wipResult = await sendRequest(WIP_API_URL, 'get_initial_data', 'GET');
     if (wipResult.success) {
        allItems = wipResult.items;
        const inLocationSelect = document.getElementById('entry_location_id');
        const outLocationSelect = document.getElementById('out_location_id');
        
        const optionsHtml = wipResult.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        if (inLocationSelect) {
            inLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
        if (outLocationSelect) {
            outLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
    }
}

function openAddPartModal() {
    const form = document.getElementById('addPartForm');
    if(form) form.reset();
    
    selectedOutItem = null; 
    document.getElementById('out_item_id').value = '';
    document.getElementById('out_item_search').value = '';

    const now = new Date();
    const tzOffset = 7 * 60 * 60 * 1000;
    const localNow = new Date(now.getTime() + tzOffset);
    document.querySelector('#addPartModal input[name="start_time"]').value = localNow.toISOString().split('T')[1].substring(0, 8);
    document.querySelector('#addPartModal input[name="end_time"]').value = document.querySelector('#addPartModal input[name="start_time"]').value;
    
    new bootstrap.Modal(document.getElementById('addPartModal')).show();
}

function openAddEntryModal() {
    const form = document.getElementById('addEntryForm');
    if(form) form.reset();
    
    wipSelectedItem = null; 
    document.getElementById('entry_item_id').value = '';
    document.getElementById('entry_item_search').value = '';
    
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
    let endpoint = '';
    let successCallback = null;

    switch(action) {
        case 'addPart':
            apiAction = 'execute_production';
            endpoint = PD_API_URL;
            if (!data.item_id) {
                showToast('Please select a valid item from the search results.', 'var(--bs-warning)');
                return;
            }
            successCallback = fetchProductionHistory;
            break;
        case 'addEntry':
            apiAction = 'execute_receipt';
            endpoint = WIP_API_URL;
            if (!data.item_id) {
                showToast('Please select a valid item from the search results.', 'var(--bs-warning)');
                return;
            }
            successCallback = fetchReceiptHistory;
            break;
        /*case 'editEntry':
            apiAction = 'update_wip_entry';
            endpoint = WIP_API_URL;
            successCallback = () => fetchOldHistoryData(wipCurrentPage);
            break;
        case 'editPart':
            apiAction = 'update_part';
            endpoint = PD_API_URL;
            successCallback = () => fetchPartsData(currentPage);
            break;*/
        // NOTE: editPart and editEntry logic will be added when those modals are refactored
    }

    if (!apiAction || !endpoint) {
        showToast('Form configuration error.', 'var(--bs-danger)');
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(endpoint, apiAction, 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            const modalId = form.closest('.modal').id;
            bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
            if (successCallback) await successCallback();
        }
    } finally {
        hideSpinner();
    }
}

// =================================================================
// SECTION: INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    populateModalDatalists();
    setupEntryAutocomplete();
    setupProductionAutocomplete();

    document.querySelectorAll('form[data-action]').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });

    // --- Tab Initialization ---
    const entryHistoryTab = document.getElementById('entry-history-tab'); 
    if (entryHistoryTab) {
        entryHistoryTab.addEventListener('shown.bs.tab', () => fetchReceiptHistory(1)); 
    }
    
    const productionHistoryTab = document.getElementById('production-history-tab');
    if (productionHistoryTab) {
        productionHistoryTab.addEventListener('shown.bs.tab', () => fetchProductionHistory(1));
    }
    
    const stockTab = document.getElementById('stock-count-tab');
    if (stockTab) {
        stockTab.addEventListener('shown.bs.tab', () => fetchStockInventoryReport(1));
    }
    
    // ** NEW: Listener for the refactored WIP/Variance Tab **
    const wipTab = document.getElementById('wip-report-tab');
    if(wipTab){
        wipTab.addEventListener('shown.bs.tab', () => fetchWipInventoryReport(1));
    }

    // Initialize the active tab
    const activeTab = document.querySelector('#mainTab .nav-link.active');
    if (activeTab) {
        if (activeTab.id === 'entry-history-tab') {
            fetchReceiptHistory(1);
        } else if (activeTab.id === 'production-history-tab') {
            fetchProductionHistory(1);
        } else if (activeTab.id === 'stock-count-tab') {
            fetchStockInventoryReport(1);
        } else if (activeTab.id === 'wip-report-tab') {
            fetchWipInventoryReport(1);
        }
    }
});