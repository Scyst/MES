"use strict";

// --- Global variables for this specific table ---
let productionHistoryCurrentPage = 1;
const PRODUCTION_ROWS_PER_PAGE = 50;
const PD_API_URL = '../../api/pdTable/pdTableManage.php';

/**
 * Fetches production history from the new STOCK_TRANSACTIONS table.
 * @param {number} [page=1] - The page number to fetch.
 */
async function fetchProductionHistory(page = 1) {
    productionHistoryCurrentPage = page;
    showSpinner();
    
    // Use the main filters on the page
    const params = {
        page: currentPage,
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
            renderPagination('paginationControls', result.total, result.page, PRODUCTION_ROWS_PER_PAGE, fetchProductionHistory);
        } else {
             document.getElementById('partTableBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

/**
 * Renders the new production history table.
 * @param {Array<object>} data - The production history data from the API.
 */
function renderProductionHistoryTable(data) {
    const tbody = document.getElementById('partTableBody');
    tbody.innerHTML = '';
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No production history found in the new system.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.transactionId = row.transaction_id; // Use transaction_id as the unique identifier

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

function saveFiltersToLocalStorage() {
    const filters = {
        part_no: document.getElementById('filterPartNo')?.value,
        lot_no: document.getElementById('filterLotNo')?.value,
        line: document.getElementById('filterLine')?.value,
        model: document.getElementById('filterModel')?.value,
        count_type: document.getElementById('filterCountType')?.value,
        startDate: document.getElementById('filterStartDate')?.value,
        endDate: document.getElementById('filterEndDate')?.value,
    };
    localStorage.setItem('pdTableFilters', JSON.stringify(filters));
}

function loadFiltersFromLocalStorage() {
    const savedFilters = localStorage.getItem('pdTableFilters');
    if (savedFilters) {
        const filters = JSON.parse(savedFilters);
        document.getElementById('filterPartNo').value = filters.part_no || '';
        document.getElementById('filterLotNo').value = filters.lot_no || '';
        document.getElementById('filterLine').value = filters.line || '';
        document.getElementById('filterModel').value = filters.model || '';
        document.getElementById('filterCountType').value = filters.count_type || '';
        document.getElementById('filterStartDate').value = filters.startDate || '';
        document.getElementById('filterEndDate').value = filters.endDate || '';
    }
}

function renderAdvancedPagination(containerId, currentPage, totalPages, callbackFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (totalPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    const createPageItem = (text, page) => {
        const li = document.createElement('li');
        const isActive = page === currentPage;
        const isDisabled = !page;
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!isDisabled) {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                callbackFunction(page);
            });
        }
        li.appendChild(a);
        return li;
    };
    
    const createEllipsis = () => {
        const li = document.createElement('li');
        li.className = 'page-item disabled';
        const span = document.createElement('span');
        span.className = 'page-link';
        span.textContent = '...';
        li.appendChild(span);
        return li;
    };

    ul.appendChild(createPageItem('Previous', currentPage > 1 ? currentPage - 1 : null));

    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            ul.appendChild(createPageItem(i, i));
        }
    } else {
        ul.appendChild(createPageItem(1, 1));
        if (currentPage > 4) {
            ul.appendChild(createEllipsis());
        }

        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 4) {
            startPage = 2;
            endPage = 4;
        }
        if (currentPage >= totalPages - 3) {
            startPage = totalPages - 3;
            endPage = totalPages - 1;
        }

        for (let i = startPage; i <= endPage; i++) {
            ul.appendChild(createPageItem(i, i));
        }

        if (currentPage < totalPages - 3) {
            ul.appendChild(createEllipsis());
        }
        
        ul.appendChild(createPageItem(totalPages, totalPages));
    }

    ul.appendChild(createPageItem('Next', currentPage < totalPages ? currentPage + 1 : null));
    container.appendChild(ul);
}

// -- Element References --
const filterLine = document.getElementById('filterLine');
const filterModel = document.getElementById('filterModel');
const filterPartNo = document.getElementById('filterPartNo');
const lineList = document.getElementById('lineList');
const modelList = document.getElementById('modelList');
const partNoList = document.getElementById('partNoList');

function updateDatalist(datalistElement, options) {
    if (datalistElement) {
        datalistElement.innerHTML = options.map(opt => `<option value="${opt}"></option>`).join('');
    }
}

async function updateModelOptions() {
    const selectedLine = filterLine.value;
    filterModel.value = '';
    filterPartNo.value = '';
    updateDatalist(partNoList, []);

    showSpinner();
    try {
        if (selectedLine) {
            const response = await fetch(`${API_URL}?action=get_models_by_line&line=${selectedLine}`);
            const result = await response.json();
            if (result.success) {
                updateDatalist(modelList, result.data);
            }
        } else {
            updateDatalist(modelList, window.allModels || []);
        }
    } finally {
        hideSpinner();
    }
}

async function updatePartNoOptions() {
    const selectedLine = filterLine.value;
    const selectedModel = filterModel.value;
    filterPartNo.value = '';

    showSpinner();
    try {
        if (selectedModel) {
            const params = new URLSearchParams({ action: 'get_parts_by_model', model: selectedModel, line: selectedLine });
            const response = await fetch(`${API_URL}?${params.toString()}`);
            const result = await response.json();
            if (result.success) {
                updateDatalist(partNoList, result.data);
            }
        } else {
            updateDatalist(partNoList, window.allPartNos || []);
        }
    } finally {
        hideSpinner();
    }
}

async function populateAllDatalistsOnLoad() {
    showSpinner();
    try {
        const response = await fetch(`${API_URL}?action=get_datalist_options`);
        const result = await response.json();
        if (result.success) {
            window.allModels = result.models;
            window.allPartNos = result.partNos;
            updateDatalist(lineList, result.lines);
            updateDatalist(modelList, result.models);
            updateDatalist(partNoList, result.partNos);
        }
    } catch (error) {
        console.error('Failed to populate datalists:', error);
    } finally {
        hideSpinner();
    }
}

async function fetchPartsData(page = 1) {
    currentPage = page;
    const filters = {
        part_no: document.getElementById('filterPartNo')?.value,
        lot_no: document.getElementById('filterLotNo')?.value,
        line: document.getElementById('filterLine')?.value,
        model: document.getElementById('filterModel')?.value,
        count_type: document.getElementById('filterCountType')?.value,
        startDate: document.getElementById('filterStartDate')?.value,
        endDate: document.getElementById('filterEndDate')?.value,
    };
    const params = new URLSearchParams({ action: 'get_parts', page: currentPage, limit: 50, ...filters });

    showSpinner();
    try {
        const response = await fetch(`${API_URL}?${params.toString()}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        renderTable(result.data); 
        totalPages = Math.ceil(result.total / result.limit);
        renderAdvancedPagination('paginationControls', result.page, totalPages, fetchPartsData);
        renderSummary(result.summary, result.grand_total);
    } catch (error) {
        console.error('Failed to fetch parts data:', error);
        // We will calculate colspan inside renderTable, so we can simplify it here
        document.getElementById('partTableBody').innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error loading data.</td></tr>`;
    } finally {
        hideSpinner();
    }
}

/**
 * ฟังก์ชันสำหรับ Render ตารางข้อมูล Production
 * @param {Array<object>} data - ข้อมูลที่ได้จาก API
 */
function renderTable(data) {
    const tbody = document.getElementById('partTableBody');
    tbody.innerHTML = ''; 
    
    // --- MODIFICATION: Determine if the actions column should be shown for any row ---
    const showActionsColumn = data.some(row => 
        canManage || (currentUser && currentUser.role === 'operator' && currentUser.username === row.operator_name)
    );
    const colSpan = showActionsColumn ? 11 : 10;

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">No records found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.dataset.id = row.id;

        const createCell = (text) => {
            const td = document.createElement('td');
            td.textContent = text;
            return td;
        };
        
        const formattedDate = row.log_date ? new Date(row.log_date).toLocaleDateString('en-GB') : '';
        const formattedStartTime = row.start_time ? row.start_time.substring(0, 8) : '';
        const formattedTime = row.log_time ? row.log_time.substring(0, 8) : '';
        
        tr.appendChild(createCell(formattedDate));
        tr.appendChild(createCell(formattedStartTime));
        tr.appendChild(createCell(formattedTime));
        tr.appendChild(createCell(row.line));
        tr.appendChild(createCell(row.model));
        tr.appendChild(createCell(row.part_no));
        tr.appendChild(createCell(row.lot_no || ''));

        const qtyCell = createCell(row.count_value);
        qtyCell.classList.add('text-center-col');
        tr.appendChild(qtyCell);

        const typeCell = createCell(row.count_type);
        typeCell.classList.add('text-center-col');
        tr.appendChild(typeCell);
        
        const noteTd = document.createElement('td');
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-truncate';
        noteDiv.title = row.note || '';
        noteDiv.textContent = row.note || '';
        noteTd.appendChild(noteDiv);
        tr.appendChild(noteTd);
        
        // --- MODIFICATION START ---
        // Conditionally create the actions cell
        if (showActionsColumn) {
            const actionsTd = document.createElement('td');
            actionsTd.classList.add('text-center-col');
            
            // Show buttons only if user is a manager OR if the operator owns the record
            if (canManage || (currentUser && currentUser.role === 'operator' && currentUser.username === row.operator_name)) {
                const buttonWrapper = document.createElement('div');
                buttonWrapper.className = 'd-flex justify-content-center gap-1'; 

                const editButton = document.createElement('button');
                editButton.className = 'btn btn-sm btn-warning w-100'; 
                editButton.textContent = 'Edit';
                editButton.addEventListener('click', () => openEditModal(row, editButton));
                
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-danger w-100'; 
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', () => handleDelete(row.id));

                buttonWrapper.appendChild(editButton);
                buttonWrapper.appendChild(deleteButton);
                actionsTd.appendChild(buttonWrapper);
            }
            tr.appendChild(actionsTd);
        }
        // --- MODIFICATION END ---

        tbody.appendChild(tr);
    });
}

// -- No longer used because renderAdvancedPagination is used for pagination. --
function renderPagination(page, totalItems, limit) {
    totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
    currentPage = parseInt(page);
    const paginationContainer = document.getElementById('paginationControls');
    paginationContainer.innerHTML = ''; 

    if (totalPages <= 1) return;

    const createPageItem = (pageNum, text, isDisabled = false, isActive = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isDisabled ? 'disabled' : ''} ${isActive ? 'active' : ''}`;
        
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = text;
        if (!isDisabled) {
            a.onclick = (e) => {
                e.preventDefault();
                fetchPartsData(pageNum);
            };
        }
        li.appendChild(a);
        return li;
    };

    paginationContainer.appendChild(createPageItem(currentPage - 1, 'Previous', currentPage === 1));
    for (let i = 1; i <= totalPages; i++) {
        paginationContainer.appendChild(createPageItem(i, i, false, i === currentPage));
    }
    paginationContainer.appendChild(createPageItem(currentPage + 1, 'Next', currentPage === totalPages));
}

function renderSummary(summaryData, grandTotalData) {
    window.cachedSummary = summaryData || [];
    window.cachedGrand = grandTotalData || {};
    const grandSummaryContainer = document.getElementById('grandSummary');
    if (!grandSummaryContainer) return;
    let grandSummaryHTML = '<strong>Grand Total: </strong>';
    if (grandTotalData) {
        grandSummaryHTML += Object.entries(grandTotalData).filter(([, value]) => value > 0).map(([key, value]) => `${key.toUpperCase()}: ${value || 0}`).join(' | ');
    }
    grandSummaryContainer.innerHTML = grandSummaryHTML;
}

async function handleDelete(id) {
    if (!confirm(`Are you sure you want to delete Part ID ${id}?`)) return;
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    
    showSpinner();
    try {
        const response = await fetch(`${API_URL}?action=delete_part`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify({ id: id })
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }

        showToast(result.message, result.success ? '#28a745' : '#dc3545');

        if (result.success) {
            const rowCount = document.querySelectorAll('#partTableBody tr').length;
            const newPage = (rowCount === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
            await fetchPartsData(newPage);
        }
    } catch (error) {
        showToast(error.message, '#dc3545');
    } finally {
        hideSpinner();
    }
}

function handleFilterChange() {
    saveFiltersToLocalStorage(); 
    
    const activePane = document.querySelector('#mainTabContent .tab-pane.active');
    if (!activePane) return;
    switch (activePane.id) {
        case 'production-history-pane':
            fetchPartsData(1);
            break;
        case 'entry-history-pane':
            if (typeof fetchHistoryData === 'function') fetchHistoryData();
            break;
        case 'wip-report-pane':
            if (typeof fetchWipReport === 'function') fetchWipReport();
            break;
        case 'wip-report-by-lot-pane':
            if (typeof fetchWipReportByLot === 'function') fetchWipReportByLot();
            break;
        case 'stock-count-pane':
            if (typeof fetchStockCountReport === 'function') fetchStockCountReport();
            break;
    }
}

// --- Event Listener to initialize the Production History Tab ---
document.addEventListener('DOMContentLoaded', () => {
    const productionHistoryTab = document.getElementById('production-history-tab'); 
    if (productionHistoryTab) {
        // Check if it's the initially active tab
        if (productionHistoryTab.classList.contains('active')) {
            fetchProductionHistory(1);
        } else {
            // Or, add a listener for when it's shown
            productionHistoryTab.addEventListener('shown.bs.tab', () => {
                fetchProductionHistory(1);
            }, { once: true }); 
        }
    }

    // Add event listeners for filters to trigger a refresh
    const filterIds = ['filterPartNo', 'filterLine', 'filterLotNo', 'filterCountType', 'filterStartDate', 'filterEndDate'];
    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                // Use a debounce timer to avoid too many API calls
                clearTimeout(window.filterDebounceTimer);
                window.filterDebounceTimer = setTimeout(() => {
                    // Only refetch if the production history tab is active
                    if (document.getElementById('production-history-pane')?.classList.contains('active')) {
                        fetchProductionHistory(1);
                    }
                }, 500);
            });
        }
    });
});

/*document.addEventListener('DOMContentLoaded', () => {
    loadFiltersFromLocalStorage();
    populateAllDatalistsOnLoad(); 

    const debouncedFilterChange = () => {
        clearTimeout(window.filterDebounceTimer);
        window.filterDebounceTimer = setTimeout(handleFilterChange, 500);
    };

    document.getElementById('filterPartNo')?.addEventListener('input', debouncedFilterChange);
    document.getElementById('filterLotNo')?.addEventListener('input', debouncedFilterChange);
    document.getElementById('filterCountType')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterStartDate')?.addEventListener('change', handleFilterChange);
    document.getElementById('filterEndDate')?.addEventListener('change', handleFilterChange);
    
    if (filterLine) {
        filterLine.addEventListener('change', () => {
            updateModelOptions().then(() => {
                handleFilterChange();
            });
        });
    }
    if (filterModel) {
        filterModel.addEventListener('change', () => {
            updatePartNoOptions().then(() => {
                handleFilterChange();
            });
        });
    }

    document.querySelectorAll('#mainTab .nav-link').forEach(tab => {
        tab.addEventListener('shown.bs.tab', handleFilterChange);
    });

    setTimeout(() => {
        const activeTabPane = document.querySelector('#mainTabContent .tab-pane.active');
        if (activeTabPane) {
            handleFilterChange();
        }
    }, 100); 
});*/