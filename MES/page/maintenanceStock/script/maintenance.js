"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES & CONSTANTS
// =================================================================
const MT_API_URL = 'api/mt_stockManage.php';
const ROWS_PER_PAGE = 50;

// State variables
const state = {
    onHand: { currentPage: 1, data: [] },
    transactions: { currentPage: 1, data: [] },
    items: { currentPage: 1, data: [] },
    locations: { currentPage: 1, data: [] },
    tabLoaded: {}
};
let mtAllLocations = []; // We still need locations for dropdowns

// =================================================================
// SECTION: CORE & UTILITY FUNCTIONS
// =================================================================

async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) url += `&${new URLSearchParams(params).toString()}`;
        
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

function updateControls(activeTabId) {
    const buttonGroup = document.getElementById('mt-button-group');
    const toggleBtn = document.getElementById('mt_toggleInactiveBtn'); 
    
    if (!buttonGroup || !toggleBtn) return;
    
    buttonGroup.innerHTML = '';
    toggleBtn.style.display = 'none';

    switch (activeTabId) {
        case 'onhand-tab':
            if (canTransact) {
                buttonGroup.innerHTML = `
                    <button class="btn btn-success" onclick="openReceiveModal()"><i class="fas fa-plus"></i> Receive</button>
                    <button class="btn btn-warning" onclick="openIssueModal()"><i class="fas fa-minus"></i> Issue</button>
                `;
            }
            break;
        case 'transactions-tab':
             buttonGroup.innerHTML = `<button class="btn btn-primary"><i class="fas fa-file-export"></i> Export</button>`;
            break;
        case 'items-tab':
            toggleBtn.style.display = 'inline-block'; 
            if (canManage) {
                buttonGroup.innerHTML = `<button class="btn btn-success" onclick="openMtItemModal()"><i class="fas fa-plus"></i> Add New Item</button>`;
            }
            break;
        case 'locations-tab':
            if (canManage) {
                buttonGroup.innerHTML = `<button class="btn btn-success" onclick="openMtLocationModal()"><i class="fas fa-plus"></i> Add New Location</button>`;
            }
            break;
    }
}


// =================================================================
// SECTION: DATA FETCHING & RENDERING
// =================================================================

// --- On-Hand Tab ---
async function fetchOnHand(page = 1) {
    state.onHand.currentPage = page;
    showSpinner();
    try {
        const result = await sendRequest(MT_API_URL, 'get_onhand', 'GET');
        if (result.success) {
            renderOnHandTable(result.data);
        }
    } finally {
        hideSpinner();
    }
}

function renderOnHandTable(data) {
    const tbody = document.getElementById('mtOnHandTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">No spare parts stock found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        const onHandQty = parseFloat(row.quantity);
        const minStock = parseFloat(row.min_stock);
        let qtyClass = '';
        if (onHandQty < minStock) {
            qtyClass = 'text-danger fw-bold';
        }

        tr.innerHTML = `
            <td data-label="Item Code">${row.item_code}</td>
            <td data-label="Item Name">${row.item_name}</td>
            <td data-label="Location">${row.location_name}</td>
            <td data-label="Min Stock" class="text-center">${parseFloat(row.min_stock).toLocaleString()}</td>
            <td data-label="Max Stock" class="text-center">${parseFloat(row.max_stock).toLocaleString()}</td>
            <td data-label="On-Hand" class="text-end ${qtyClass}">${onHandQty.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Transactions Tab ---
async function fetchTransactions(page = 1) {
    state.transactions.currentPage = page;
    showSpinner();
    try {
        const searchTerm = document.getElementById('mtSearchInput').value;
        const result = await sendRequest(MT_API_URL, 'get_transactions', 'GET', null, { 
            search: searchTerm, 
            page: page 
        });
        if (result.success) {
            renderTransactionsTable(result.data);
            renderPagination('mtTransactionPagination', result.total, page, ROWS_PER_PAGE, fetchTransactions);
        }
    } finally {
        hideSpinner();
    }
}

function renderTransactionsTable(data) {
    const tbody = document.getElementById('mtTransactionTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No transactions found.</td></tr>`;
        return;
    }

    data.forEach(row => {
        const tr = document.createElement('tr');
        const quantity = parseFloat(row.quantity);
        let qtyClass = '';
        let qtyPrefix = '';
        if (quantity > 0) {
            qtyClass = 'text-success';
            qtyPrefix = '+';
        } else if (quantity < 0) {
            qtyClass = 'text-danger';
        }
        
        tr.innerHTML = `
            <td data-label="Timestamp">${new Date(row.created_at).toLocaleString()}</td>
            <td data-label="Item Code">${row.item_code}</td>
            <td data-label="Item Name">${row.item_name}</td>
            <td data-label="Type" class="text-center"><span class="badge bg-secondary">${row.transaction_type}</span></td>
            <td data-label="Quantity" class="text-end fw-bold ${qtyClass}">${qtyPrefix}${quantity.toLocaleString()}</td>
            <td data-label="User">${row.username || 'N/A'}</td>
            <td data-label="Notes">${row.notes || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Item Master Tab ---
async function fetchItems(page = 1) {
    state.items.currentPage = page;
    showSpinner();
    try {
        const searchTerm = document.getElementById('mtSearchInput').value;
        const showInactive = document.getElementById('mt_toggleInactiveBtn').classList.contains('active');
        const result = await sendRequest(MT_API_URL, 'get_items', 'GET', null, { 
            search: searchTerm,
            show_inactive: showInactive // ✅ ส่งสถานะนี้ไปให้ API
        });
        if (result.success) {
            renderItemsTable(result.data);
        }
    } finally {
        hideSpinner();
    }
}

function renderItemsTable(data) {
    const tbody = document.getElementById('mtItemMasterTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No items found.</td></tr>`;
        return;
    }
    data.forEach(item => {
        const tr = document.createElement('tr');
        if (!item.is_active) {
            tr.classList.add('text-muted', 'fst-italic');
        }

        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => openMtItemModal(item));  
        tr.innerHTML = `
            <td data-label="Item Code">${item.item_code}</td>
            <td data-label="Item Name">${item.item_name}</td>
            <td data-label="Description">${item.description || ''}</td>
            <td data-label="Supplier">${item.supplier || ''}</td>
            <td data-label="Min" class="text-center">${parseFloat(item.min_stock).toLocaleString()}</td>
            <td data-label="Max" class="text-center">${parseFloat(item.max_stock).toLocaleString()}</td>
            <td data-label="Status" class="text-center">
                <span class="badge ${item.is_active == 1 ? 'bg-success' : 'bg-secondary'}">
                    ${item.is_active == 1 ? 'Active' : 'Inactive'}
                </span>
            </td>
        `;

        if (!item.is_active) {
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'btn btn-sm btn-info ms-2';
            restoreBtn.innerHTML = '<i class="fas fa-undo"></i> Restore';
            restoreBtn.onclick = async (e) => {
                e.stopPropagation(); // หยุดไม่ให้เปิด Modal แก้ไข
                if(confirm(`Are you sure you want to restore item "${item.item_name}"?`)) {
                    const result = await sendRequest(MT_API_URL, 'restore_item', 'POST', { item_id: item.item_id });
                    if(result.success) {
                        showToast(result.message, 'var(--bs-success)');
                        await fetchItems();
                    }
                }
            };
            // หาที่ใส่ปุ่ม (สมมติว่าคอลัมน์สุดท้ายคือ Status)
            tr.cells[tr.cells.length - 1].appendChild(restoreBtn);
        }
        
        tbody.appendChild(tr);
    });
}

// --- Location Master Tab ---
async function fetchLocations(page = 1) {
    state.locations.currentPage = page;
    showSpinner();
    try {
        const result = await sendRequest(MT_API_URL, 'get_locations', 'GET');
        if (result.success) {
            renderLocationsTable(result.data);
        }
    } finally {
        hideSpinner();
    }
}

function renderLocationsTable(data) {
    const tbody = document.getElementById('mtLocationMasterTableBody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center">No locations found.</td></tr>`;
        return;
    }
    data.forEach(loc => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => openMtLocationModal(loc));
        tr.innerHTML = `
            <td data-label="Location Name">${loc.location_name}</td>
            <td data-label="Description">${loc.description || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =================================================================
// SECTION: MODAL & FORM HANDLING
// =================================================================

// --- Universal Functions for Modals ---
async function populateModalDropdowns() {
    // Only fetches locations now, as items are searched via server-side API
    const result = await sendRequest(MT_API_URL, 'get_initial_data', 'GET');
    if (result.success) {
        mtAllLocations = result.locations;
    }
}

function setupAutocomplete(inputId, hiddenId, onSelectCallback) {
    const searchInput = document.getElementById(inputId);
    if (!searchInput) return;

    let resultsWrapper = searchInput.parentNode.querySelector('.autocomplete-results');
    if (!resultsWrapper) {
        resultsWrapper = document.createElement('div');
        resultsWrapper.className = 'autocomplete-results';
        searchInput.parentNode.appendChild(resultsWrapper);
    }
    
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const value = searchInput.value;
        document.getElementById(hiddenId).value = '';
        resultsWrapper.innerHTML = '';
        resultsWrapper.style.display = 'none';

        if (value.length < 2) return;

        debounceTimer = setTimeout(async () => {
            const result = await sendRequest(MT_API_URL, 'search_mt_items', 'GET', null, { search: value });
            
            if (result.success && result.data.length > 0) {
                result.data.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.item_code}</strong><br><small class="text-muted">${item.item_name}</small>`;
                    resultItem.addEventListener('click', () => {
                        searchInput.value = `${item.item_code} | ${item.item_name}`;
                        document.getElementById(hiddenId).value = item.item_id;
                        resultsWrapper.style.display = 'none';
                        if (onSelectCallback) onSelectCallback(item);
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = 'block';
            } else {
                resultsWrapper.innerHTML = `<div class="autocomplete-item text-muted">No items found.</div>`;
                resultsWrapper.style.display = 'block';
            }
        }, 300);
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}


// --- Item Master Modal ---
function openMtItemModal(item = null) {
    const form = document.getElementById('mt_itemForm');
    form.reset();
    document.getElementById('mt_item_id').value = '0';
    
    const modalTitle = document.getElementById('mt_itemModalLabel');
    const deleteBtn = document.getElementById('mt_deleteItemBtn');
    const restoreBtn = document.getElementById('mt_restoreItemBtn');
    
    deleteBtn.style.display = 'none';
    restoreBtn.style.display = 'none';

    if (item) {
        modalTitle.textContent = `Edit Spare Part: ${item.item_code}`;
        
        if (item.is_active == 1) {
            deleteBtn.style.display = 'block';
        } else {
            restoreBtn.style.display = 'block';
        }

        document.getElementById('mt_item_id').value = item.item_id;
        document.getElementById('mt_item_code').value = item.item_code;
        document.getElementById('mt_item_name').value = item.item_name;
        document.getElementById('mt_description').value = item.description || '';
        document.getElementById('mt_supplier').value = item.supplier || '';
        document.getElementById('mt_min_stock').value = item.min_stock;
        document.getElementById('mt_max_stock').value = item.max_stock;
    } else {
        modalTitle.textContent = 'Add New Spare Part';
    }
    
    new bootstrap.Modal(document.getElementById('mt_itemModal')).show();
}

async function handleMtItemFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const result = await sendRequest(MT_API_URL, 'save_item', 'POST', data);
    
    if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('mt_itemModal')).hide();
        showToast(result.message, 'var(--bs-success)');
        await fetchItems();
        await populateModalDropdowns();
    }
}

async function deleteMtItem() {
    const itemId = document.getElementById('mt_item_id').value;
    if (!itemId || itemId === '0') return;
    if (confirm('Are you sure you want to deactivate this item?')) {
        const result = await sendRequest(MT_API_URL, 'delete_item', 'POST', { item_id: itemId });
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('mt_itemModal')).hide();
            showToast(result.message, 'var(--bs-success)');
            await fetchItems();
            state.tabLoaded['#onhand-pane'] = false;
            await populateModalDropdowns();
        }
    }
}

async function restoreMtItem() {
    const itemId = document.getElementById('mt_item_id').value;
    if (!itemId || itemId === '0') return;

    if (confirm('Are you sure you want to restore this item to active status?')) {
        const result = await sendRequest(MT_API_URL, 'restore_item', 'POST', { item_id: itemId });
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('mt_itemModal')).hide();
            showToast(result.message, 'var(--bs-success)');
            await fetchItems();
            state.tabLoaded['#onhand-pane'] = false;
        }
    }
}

// --- Location Master Modal ---
function openMtLocationModal(location = null) {
    const form = document.getElementById('mt_locationForm');
    form.reset();
    document.getElementById('mt_location_id').value = '0';
    const modalTitle = document.getElementById('mt_locationModalLabel');
    
    if (location) {
        modalTitle.textContent = `Edit Location: ${location.location_name}`;
        document.getElementById('mt_location_id').value = location.location_id;
        document.getElementById('mt_location_name').value = location.location_name;
        document.getElementById('mt_location_description').value = location.description || '';
    } else {
        modalTitle.textContent = 'Add New Location';
    }
    new bootstrap.Modal(document.getElementById('mt_locationModal')).show();
}

async function handleMtLocationFormSubmit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    const result = await sendRequest(MT_API_URL, 'save_location', 'POST', data);
    
    if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('mt_locationModal')).hide();
        showToast(result.message, 'var(--bs-success)');
        await fetchLocations();
        await populateModalDropdowns();
    }
}

// --- Transaction Modals (Receive/Issue) ---
function openReceiveModal() {
    const form = document.getElementById('mt_receiveForm');
    form.reset();
    const locationSelect = document.getElementById('receive_location_id');
    locationSelect.innerHTML = '<option value="">-- Select Location --</option>' + mtAllLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
    new bootstrap.Modal(document.getElementById('mt_receiveModal')).show();
}

function openIssueModal() {
    const form = document.getElementById('mt_issueForm');
    form.reset();
    const locationSelect = document.getElementById('issue_location_id');
    locationSelect.innerHTML = '<option value="">-- Select Location --</option>' + mtAllLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
    new bootstrap.Modal(document.getElementById('mt_issueModal')).show();
}

async function handleTransactionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    
    if (!data.item_id) {
        showToast('Please search and select a valid item.', 'var(--bs-warning)');
        return;
    }
    
    const result = await sendRequest(MT_API_URL, 'execute_transaction', 'POST', data);
    
    if (result.success) {
        const modalId = form.closest('.modal').id;
        bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
        showToast(result.message, 'var(--bs-success)');
        await fetchOnHand();
        state.tabLoaded['#transactions-pane'] = false;
    }
}


// =================================================================
// SECTION: INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching Logic
    function loadTabData(targetTabId) {
        if (!targetTabId || state.tabLoaded[targetTabId]) return;
        const searchInput = document.getElementById('mtSearchInput');
        
        switch (targetTabId) {
            case '#onhand-pane':
                searchInput.placeholder = 'Search by Item Code, Name, or Location...';
                fetchOnHand();
                break;
            case '#transactions-pane':
                searchInput.placeholder = 'Search Transactions...';
                fetchTransactions();
                break;
            case '#items-pane':
                if (canManage) {
                    searchInput.placeholder = 'Search by Item Code, Name, or Description...';
                    fetchItems();
                }
                break;
            case '#locations-pane':
                if (canManage) {
                    searchInput.placeholder = 'Search by Location Name...';
                    fetchLocations();
                }
                break;
        }
        state.tabLoaded[targetTabId] = true;
    }

    document.querySelectorAll('#mtStockTab button[data-bs-toggle="tab"]').forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.getAttribute('id');
            const activePaneId = event.target.getAttribute('data-bs-target');
            updateControls(activeTabId);
            document.querySelectorAll('.sticky-bottom[data-tab-target]').forEach(p => {
                p.style.display = p.dataset.tabTarget === activePaneId ? 'block' : 'none';
            });
            loadTabData(activePaneId);
        });
    });

    // Main Search Input Logic
    const searchInput = document.getElementById('mtSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(() => {
                const activePaneId = document.querySelector('#mtStockTabContent .tab-pane.active').id;
                state.tabLoaded[`#${activePaneId}`] = false; // Force reload
                loadTabData(`#${activePaneId}`);
            }, 500);
        });
    }

    // Form Event Listeners
    document.getElementById('mt_itemForm')?.addEventListener('submit', handleMtItemFormSubmit);
    document.getElementById('mt_deleteItemBtn')?.addEventListener('click', deleteMtItem);
    document.getElementById('mt_restoreItemBtn')?.addEventListener('click', restoreMtItem);
    document.getElementById('mt_locationForm')?.addEventListener('submit', handleMtLocationFormSubmit);
    document.getElementById('mt_receiveForm')?.addEventListener('submit', handleTransactionFormSubmit);
    document.getElementById('mt_issueForm')?.addEventListener('submit', handleTransactionFormSubmit);

    const toggleBtn = document.getElementById('mt_toggleInactiveBtn');
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            toggleBtn.classList.toggle('active');
            fetchItems(); // โหลดข้อมูลใหม่ตามสถานะปุ่ม
        });
    }

    // Initial Page Load
    populateModalDropdowns();
    setupAutocomplete('receive_item_search', 'receive_item_id');
    setupAutocomplete('issue_item_search', 'issue_item_id');

    const initialActiveTab = document.querySelector('#mtStockTab .nav-link.active');
    if (initialActiveTab) {
        const activeTabId = initialActiveTab.id;
        const activePaneId = initialActiveTab.getAttribute('data-bs-target');
        updateControls(activeTabId);
        loadTabData(activePaneId);
    }
});