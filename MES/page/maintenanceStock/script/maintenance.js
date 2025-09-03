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

let mtAllItems = [];
let mtAllLocations = [];


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
        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
            throw new Error(errorResult.message);
        }
        return await response.json();
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        // Assume showToast, showSpinner, hideSpinner are globally available from other scripts
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
    }
}

// Function to dynamically update the buttons in the control bar
function updateControls(activeTabId) {
    const buttonGroup = document.getElementById('mt-button-group');
    if (!buttonGroup) return;
    buttonGroup.innerHTML = '';

    switch (activeTabId) {
        case 'onhand-tab':
            if (canTransact) {
                buttonGroup.innerHTML = `
                    <button class="btn btn-success" onclick="openReceiveModal()"><i class="fas fa-plus"></i> Receive</button>
                    <button class="btn btn-warning" onclick="openIssueModal()"><i class="fas fa-minus"></i> Issue</button>
                `;
            }
            break;
        case 'items-tab':
            if (canManage) {
                buttonGroup.innerHTML = `<button class="btn btn-success" onclick="openMtItemModal()"><i class="fas fa-plus"></i> Add New Item</button>`;
            }
            break;
        case 'locations-tab':
            if (canManage) {
                buttonGroup.innerHTML = `<button class="btn btn-success" onclick="openMtLocationModal()"><i class="fas fa-plus"></i> Add New Location</button>`;
            }
            break;
        case 'transactions-tab':
             buttonGroup.innerHTML = `<button class="btn btn-primary"><i class="fas fa-file-export"></i> Export</button>`;
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
            // renderPagination('mtOnHandPagination', result.total, page, ROWS_PER_PAGE, fetchOnHand);
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
            qtyClass = 'text-danger fw-bold'; // Highlight items with low stock
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

// --- Other Tab Functions (placeholders for now) ---
async function fetchTransactions(page = 1) {
    document.getElementById('mtTransactionTableBody').innerHTML = `<tr><td colspan="7" class="text-center">Loading...</td></tr>`;
}

async function fetchItems(page = 1) {
    state.items.currentPage = page;
    showSpinner();
    try {
        const result = await sendRequest(MT_API_URL, 'get_items', 'GET');
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
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => openMtItemModal(item));

        tr.innerHTML = `
            <td>${item.item_code}</td>
            <td>${item.item_name}</td>
            <td>${item.description || ''}</td>
            <td>${item.supplier || ''}</td>
            <td class="text-center">${parseFloat(item.min_stock).toLocaleString()}</td>
            <td class="text-center">${parseFloat(item.max_stock).toLocaleString()}</td>
            <td class="text-center">
                <span class="badge ${item.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${item.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

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

function openMtItemModal(item = null) {
    const form = document.getElementById('mt_itemForm');
    form.reset();
    document.getElementById('mt_item_id').value = '0';
    document.getElementById('mt_is_active').checked = true;
    
    const modalTitle = document.getElementById('mt_itemModalLabel');
    const deleteBtn = document.getElementById('mt_deleteItemBtn');
    
    if (item) {
        // --- Edit Mode ---
        modalTitle.textContent = `Edit Spare Part: ${item.item_code}`;
        deleteBtn.style.display = 'block'; // แสดงปุ่มลบ

        document.getElementById('mt_item_id').value = item.item_id;
        document.getElementById('mt_item_code').value = item.item_code;
        document.getElementById('mt_item_name').value = item.item_name;
        document.getElementById('mt_description').value = item.description || '';
        document.getElementById('mt_supplier').value = item.supplier || '';
        document.getElementById('mt_min_stock').value = item.min_stock;
        document.getElementById('mt_max_stock').value = item.max_stock;
        document.getElementById('mt_is_active').checked = item.is_active;

    } else {
        // --- Add New Mode ---
        modalTitle.textContent = 'Add New Spare Part';
        deleteBtn.style.display = 'none'; // ซ่อนปุ่มลบ
    }
    
    new bootstrap.Modal(document.getElementById('mt_itemModal')).show();
}

// ✅ เพิ่มฟังก์ชันนี้สำหรับจัดการการ Submit ฟอร์ม
async function handleMtItemFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // FormData ไม่ได้ส่งค่า checkbox ที่ไม่ถูกติ๊ก เราต้องจัดการเอง
    data.is_active = document.getElementById('mt_is_active').checked;

    const result = await sendRequest(MT_API_URL, 'save_item', 'POST', data);
    
    if (result.success) {
        bootstrap.Modal.getInstance(document.getElementById('mt_itemModal')).hide();
        showToast(result.message, 'var(--bs-success)');
        await fetchItems(); // โหลดข้อมูลตารางใหม่
    }
}

// ✅ เพิ่มฟังก์ชันนี้สำหรับจัดการการลบ Item
async function deleteMtItem() {
    const itemId = document.getElementById('mt_item_id').value;
    if (!itemId || itemId === '0') return;

    if (confirm('Are you sure you want to deactivate this item?')) {
        const result = await sendRequest(MT_API_URL, 'delete_item', 'POST', { item_id: itemId });
        
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('mt_itemModal')).hide();
            showToast(result.message, 'var(--bs-success)');
            await fetchItems();
        }
    }
}

async function populateModalDropdowns() {
    const result = await sendRequest(MT_API_URL, 'get_initial_data', 'GET');
    if (result.success) {
        mtAllItems = result.items;
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

    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        document.getElementById(hiddenId).value = '';
        if (value.length < 2) return;

        const filteredItems = mtAllItems.filter(item => 
            item.item_code.toLowerCase().includes(value) ||
            item.item_name.toLowerCase().includes(value)
        ).slice(0, 10);

        filteredItems.forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'autocomplete-item';
            resultItem.innerHTML = `<strong>${item.item_code}</strong><br><small>${item.item_name}</small>`;
            resultItem.addEventListener('click', () => {
                searchInput.value = `${item.item_code} | ${item.item_name}`;
                document.getElementById(hiddenId).value = item.item_id;
                resultsWrapper.innerHTML = '';
                if (onSelectCallback) onSelectCallback(item);
            });
            resultsWrapper.appendChild(resultItem);
        });
        resultsWrapper.style.display = filteredItems.length > 0 ? 'block' : 'none';
    });
    
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

function openReceiveModal() {
    const form = document.getElementById('mt_receiveForm');
    form.reset();
    const locationSelect = document.getElementById('receive_location_id');
    locationSelect.innerHTML = mtAllLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
    new bootstrap.Modal(document.getElementById('mt_receiveModal')).show();
}

function openIssueModal() {
    const form = document.getElementById('mt_issueForm');
    form.reset();
    const locationSelect = document.getElementById('issue_location_id');
    locationSelect.innerHTML = mtAllLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
    new bootstrap.Modal(document.getElementById('mt_issueModal')).show();
}

async function handleTransactionFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const data = Object.fromEntries(new FormData(form).entries());
    
    const result = await sendRequest(MT_API_URL, 'execute_transaction', 'POST', data);
    
    if (result.success) {
        const modalId = form.closest('.modal').id;
        bootstrap.Modal.getInstance(document.getElementById(modalId)).hide();
        showToast(result.message, 'var(--bs-success)');
        await fetchOnHand();
        state.tabLoaded['#transactions-pane'] = false; // Mark transaction tab for reload
    }
}

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
        // เพิ่ม data-label สำหรับ Responsive
        tr.innerHTML = `
            <td data-label="Location Name">${loc.location_name}</td>
            <td data-label="Description">${loc.description || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

// =================================================================
// SECTION: INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Main Tab Switching Logic ---
    function loadTabData(targetTabId) {
        if (!targetTabId || state.tabLoaded[targetTabId]) return;

        switch (targetTabId) {
            case '#onhand-pane': fetchOnHand(); break;
            case '#transactions-pane': fetchTransactions(); break;
            case '#items-pane': if (canManage) fetchItems(); break;
            case '#locations-pane': if (canManage) fetchLocations(); break;
        }
        state.tabLoaded[targetTabId] = true;
    }

    const mainTabs = document.querySelectorAll('#mtStockTab button[data-bs-toggle="tab"]');
    mainTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', (event) => {
            const activeTabId = event.target.getAttribute('id');
            const activePaneId = event.target.getAttribute('data-bs-target');
            
            // Update controls and pagination visibility
            updateControls(activeTabId);
            document.querySelectorAll('.sticky-bottom[data-tab-target]').forEach(p => {
                p.style.display = p.dataset.tabTarget === activePaneId ? 'block' : 'none';
            });

            // Load data for the new tab
            loadTabData(activePaneId);
        });
    });

    const searchInput = document.getElementById('mtSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            // ใช้ Debounce เพื่อลดการยิง API
            clearTimeout(window.debounceTimer);
            window.debounceTimer = setTimeout(() => {
                const activeTabId = document.querySelector('#mtStockTab .nav-link.active')?.id;
                if (activeTabId === 'items-tab') {
                    fetchItems();
                }
            }, 500);
        });
    }

    document.getElementById('mt_itemForm')?.addEventListener('submit', handleMtItemFormSubmit);
    document.getElementById('mt_deleteItemBtn')?.addEventListener('click', deleteMtItem);

    populateModalDropdowns();
    setupAutocomplete('receive_item_search', 'receive_item_id');
    setupAutocomplete('issue_item_search', 'issue_item_id');

    document.getElementById('mt_receiveForm')?.addEventListener('submit', handleTransactionFormSubmit);
    document.getElementById('mt_issueForm')?.addEventListener('submit', handleTransactionFormSubmit);

    document.getElementById('mt_locationForm')?.addEventListener('submit', handleMtLocationFormSubmit);

    // --- Initial Page Load ---
    const initialActiveTab = document.querySelector('#mtStockTab .nav-link.active');
    if (initialActiveTab) {
        const activeTabId = initialActiveTab.id;
        const activePaneId = initialActiveTab.getAttribute('data-bs-target');
        updateControls(activeTabId);
        loadTabData(activePaneId); // Load data for the default tab
    }
});