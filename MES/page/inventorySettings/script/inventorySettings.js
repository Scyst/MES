"use strict";

// --- API Endpoints ---
const LOCATIONS_API = 'api/locationsManage.php';
const TRANSFER_API = 'api/stockTransferManage.php';
const OPENING_BALANCE_API = 'api/openingBalanceManage.php';
const ITEM_MASTER_API = 'api/itemMasterManage.php';

// --- Global Variables ---
let allItems = []; // ใช้ร่วมกันระหว่าง Transfer และ Opening Balance
let currentEditingLocation = null;
let selectedItem = null;
let debounceTimer;
let currentPage = 1;
const ROWS_PER_PAGE = 50;


// --- Shared Utility Function ---
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


// --- Location Manager Functions ---
async function loadLocations() {
    showSpinner();
    try {
        const result = await sendRequest(LOCATIONS_API, 'get_locations', 'GET');
        const tbody = document.getElementById('locationsTableBody');
        tbody.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(location => {
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.title = 'Click to edit';
                
                tr.innerHTML = `
                    <td>${location.location_name}</td>
                    <td>${location.location_description || ''}</td>
                    <td class="text-center">
                        <span class="badge ${location.is_active == 1 ? 'bg-success' : 'bg-secondary'}">
                            ${location.is_active == 1 ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                `;

                tr.addEventListener('click', () => openLocationModal(location));
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No locations found. Click "Add New Location" to start.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

function openLocationModal(location = null) {
    currentEditingLocation = location;
    const form = document.getElementById('locationForm');
    const modalLabel = document.getElementById('locationModalLabel');
    const deleteBtn = document.getElementById('deleteLocationBtn');
    
    form.reset();
    
    if (location) {
        modalLabel.textContent = 'Edit Location';
        document.getElementById('location_id').value = location.location_id;
        document.getElementById('location_name').value = location.location_name;
        document.getElementById('location_description').value = location.location_description;
        document.getElementById('is_active').checked = location.is_active == 1; // ** แก้ไขตรงนี้ด้วย **
        deleteBtn.classList.remove('d-none');
    } else {
        modalLabel.textContent = 'Add New Location';
        document.getElementById('location_id').value = '0';
        document.getElementById('is_active').checked = true;
        deleteBtn.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('locationModal'));
    modal.show();
}

async function handleLocationFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    data.is_active = document.getElementById('is_active').checked;

    showSpinner();
    try {
        const result = await sendRequest(LOCATIONS_API, 'save_location', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
            await loadLocations();
        }
    } finally {
        hideSpinner();
    }
}

async function deleteLocation() {
    if (!currentEditingLocation) return;
    
    if (confirm(`Are you sure you want to delete the location "${currentEditingLocation.location_name}"? This action cannot be undone.`)) {
        showSpinner();
        try {
            const result = await sendRequest(LOCATIONS_API, 'delete_location', 'POST', { location_id: currentEditingLocation.location_id });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('locationModal')).hide();
                await loadLocations();
            }
        } finally {
            hideSpinner();
        }
    }
}


// --- Stock Transfer Functions ---
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
        const result = await sendRequest(TRANSFER_API, 'get_transfer_history', 'GET', null, params);
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

async function populateTransferInitialData() {
    const result = await sendRequest(TRANSFER_API, 'get_initial_data', 'GET');
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

    const result = await sendRequest(TRANSFER_API, 'get_stock_onhand', 'GET', null, { item_id: selectedItem.item_id, location_id: locationId });
    if (result.success) {
        displaySpan.textContent = parseFloat(result.quantity).toLocaleString();
    }
}

async function handleTransferFormSubmit(event) {
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
        const result = await sendRequest(TRANSFER_API, 'execute_transfer', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('transferModal')).hide();
            fetchTransferHistory(); // Refresh history
        }
    } finally {
        hideSpinner();
    }
}

const updateBothStockDisplays = () => {
    updateStockDisplay('from_location_id', 'fromStock');
    updateStockDisplay('to_location_id', 'toStock');
};

function setupTransferAutocomplete() {
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


// --- Opening Balance Functions ---
async function populateOpeningBalanceLocations() {
    const locationSelect = document.getElementById('locationSelect');
    const result = await sendRequest(OPENING_BALANCE_API, 'get_locations', 'GET');
    if (result.success) {
        locationSelect.innerHTML = '<option value="">-- Please select a location --</option>';
        result.data.forEach(loc => {
            locationSelect.innerHTML += `<option value="${loc.location_id}">${loc.location_name}</option>`;
        });
    }
}

async function loadItemsForLocation() {
    const locationId = document.getElementById('locationSelect').value;
    const tableBody = document.getElementById('stockTakeTableBody');
    const searchInput = document.getElementById('addItemSearch');
    const saveBtn = document.getElementById('saveStockBtn');
    
    if (!locationId) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Please select a location to begin.</td></tr>';
        searchInput.disabled = true;
        saveBtn.disabled = true;
        return;
    }

    searchInput.disabled = false;
    saveBtn.disabled = false;
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading items...</td></tr>';
    showSpinner();

    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'get_items_for_location', 'GET', null, { location_id: locationId });
        if (result.success) {
            allItems = result.data;
            renderItemsTable(allItems);
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load items.</td></tr>';
        }
    } finally {
        hideSpinner();
    }
}

function renderItemsTable(items) {
    const tableBody = document.getElementById('stockTakeTableBody');
    tableBody.innerHTML = '';

    const noItemsRow = tableBody.querySelector('.no-items-row');
    if (noItemsRow) {
        noItemsRow.remove();
    }

    if (items.length === 0) {
        if (tableBody.querySelectorAll('tr').length === 0) {
            tableBody.innerHTML = '<tr class="no-items-row"><td colspan="5" class="text-center">No items with stock > 0 found. Use the search bar to add items.</td></tr>';
        }
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.itemId = item.item_id;
        tr.style.cursor = 'pointer';

        const originalQty = parseFloat(item.onhand_qty);

        tr.innerHTML = `
            <td>${item.sap_no}</td>
            <td>${item.part_no}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-center">${originalQty.toLocaleString()}</td>
            <td>
                <input type="number" class="form-control form-control-sm stock-input text-center" 
                       value="${originalQty}"
                       data-original-value="${originalQty}"
                       min="0" step="any"
                       readonly> 
            </td>
        `;
        
        const inputField = tr.querySelector('.stock-input');

        tr.addEventListener('click', () => {
            if (inputField.readOnly === false) {
                return;
            }
            inputField.readOnly = false;
            inputField.focus();
            inputField.select();
        });

        inputField.addEventListener('blur', () => {
            const currentValue = parseFloat(inputField.value);
            const originalValue = parseFloat(inputField.dataset.originalValue);

            if (currentValue !== originalValue) {
                inputField.classList.add('is-changed');
            } else {
                inputField.classList.remove('is-changed');
            }
            
            inputField.readOnly = true;
        });
        
        tableBody.appendChild(tr);
    });
}

function setupStockAdjustmentAutocomplete() {
    const searchInput = document.getElementById('addItemSearch');
    const tableBody = document.getElementById('stockTakeTableBody');
    if (!searchInput) return;

    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        const locationId = document.getElementById('locationSelect').value;
        resultsWrapper.innerHTML = '';

        if (value.length < 2 || !locationId) return;

        debounce = setTimeout(async () => {
            const result = await sendRequest(OPENING_BALANCE_API, 'search_all_items', 'GET', null, { 
                search: value,
                location_id: locationId
            });
            if (result.success) {
                resultsWrapper.innerHTML = '';
                result.data.forEach(item => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'autocomplete-item';
                    resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                    resultItem.addEventListener('click', () => {
                        addItemToTable(item); // เรียกใช้ฟังก์ชันเพิ่มไอเทม
                        searchInput.value = ''; // เคลียร์ช่องค้นหา
                        resultsWrapper.style.display = 'none';
                    });
                    resultsWrapper.appendChild(resultItem);
                });
                resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

function addItemToTable(item) {
    const tableBody = document.getElementById('stockTakeTableBody');
    const noItemsRow = tableBody.querySelector('.no-items-row');
    if (noItemsRow) {
        tableBody.innerHTML = '';
    }

    if (tableBody.querySelector(`tr[data-item-id="${item.item_id}"]`)) {
        showToast('This item is already in the list.', 'var(--bs-warning)');
        const existingInput = tableBody.querySelector(`tr[data-item-id="${item.item_id}"] .stock-input`);
        existingInput.focus();
        existingInput.select();
        return;
    }

    const tr = document.createElement('tr');
    tr.dataset.itemId = item.item_id;
    tr.style.cursor = 'pointer';

    const originalQty = parseFloat(item.onhand_qty);

    tr.innerHTML = `
        <td>${item.sap_no}</td>
        <td>${item.part_no}</td>
        <td>${item.part_description || ''}</td>
        <td class="text-center">${originalQty.toLocaleString()}</td>
        <td>
            <input type="number" class="form-control form-control-sm stock-input text-center" 
                   value="${originalQty}"
                   data-original-value="${originalQty}"
                   min="0" step="any"
                   readonly>
        </td>
    `;

    const inputField = tr.querySelector('.stock-input');

    tr.addEventListener('click', () => {
        if (inputField.readOnly === false) {
            return;
        }
        inputField.readOnly = false;
        inputField.focus();
        inputField.select();
    });

    inputField.addEventListener('blur', () => {
        const currentValue = parseFloat(inputField.value);
        const originalValue = parseFloat(inputField.dataset.originalValue);

        if (currentValue !== originalValue) {
            inputField.classList.add('is-changed');
        } else {
            inputField.classList.remove('is-changed');
        }
        inputField.readOnly = true;
    });

    tableBody.prepend(tr);
}

async function saveStockTake() {
    const locationId = document.getElementById('locationSelect').value;
    if (!locationId) {
        showToast('Please select a location first.', 'var(--bs-warning)');
        return;
    }

    const rows = document.querySelectorAll('#stockTakeTableBody tr');
    const stock_data = [];
    rows.forEach(row => {
        const input = row.querySelector('.stock-input');
        if (input) {
            stock_data.push({
                item_id: row.dataset.itemId,
                quantity: parseFloat(input.value) || 0
            });
        }
    });

    if (stock_data.length === 0) {
        showToast('No items to save.', 'var(--bs-info)');
        return;
    }

    if (!confirm(`Are you sure you want to save stock levels for ${stock_data.length} items in this location? This will overwrite existing values.`)) {
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(OPENING_BALANCE_API, 'save_stock_take', 'POST', { location_id: locationId, stock_data: stock_data });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            await loadItemsForLocation(); // Refresh data
        }
    } finally {
        hideSpinner();
    }
}

// --- Item Master Functions ---
async function fetchItems(page = 1) {
    showSpinner();
    const searchTerm = document.getElementById('itemMasterSearch').value;
    const showInactive = document.getElementById('toggleInactiveBtn').classList.contains('active');
    const selectedModel = document.getElementById('modelFilterValue').value; // <-- แก้ไขบรรทัดนี้

    try {
        const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
            page, 
            search: searchTerm, 
            show_inactive: showInactive,
            filter_model: selectedModel
        });
        if (result.success) {
            renderItemsMasterTable(result.data);
            renderPagination('itemMasterPagination', result.total, result.page, 50, fetchItems);
        } else {
            document.getElementById('itemsTableBody').innerHTML = `<tr><td colspan="6" class="text-center text-danger">${result.message}</td></tr>`;
        }
    } finally {
        hideSpinner();
    }
}

function setupItemMasterAutocomplete() {
    const searchInput = document.getElementById('itemMasterSearch');
    if (!searchInput) return;

    // สร้างกล่องสำหรับแสดงผลลัพธ์
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    // แทรกกล่องผลลัพธ์เข้าไปใน div ที่เราครอบไว้
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        resultsWrapper.innerHTML = '';

        debounce = setTimeout(async () => {
            // 1. กรองข้อมูลในตารางหลักทันที (Live Search)
            fetchItems(1);

            // 2. ดึงข้อมูล Autocomplete มาแสดงเป็นตัวช่วย
            if (value.length > 1) { // เริ่มแสดงตัวช่วยเมื่อพิมพ์ 2 ตัวอักษรขึ้นไป
                const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
                    page: 1, 
                    search: value 
                });
                
                if (result.success && result.data.length > 0) {
                    resultsWrapper.innerHTML = '';
                    result.data.slice(0, 7).forEach(item => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
                        resultItem.addEventListener('click', () => {
                            searchInput.value = item.sap_no; // เติม SAP No. ลงในช่องค้นหา
                            resultsWrapper.style.display = 'none';
                            fetchItems(1); // กรองตารางอีกครั้งด้วยค่าที่เลือกเต็มๆ
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                    resultsWrapper.style.display = 'block';
                } else {
                    resultsWrapper.style.display = 'none';
                }
            } else {
                resultsWrapper.style.display = 'none';
            }
        }, 500);
    });

    // ซ่อนผลลัพธ์เมื่อคลิกที่อื่น
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

// ฟังก์ชันปรับปรุงใหม่สำหรับ Autocomplete และ Live Search ของ Model Filter
function setupModelFilterAutocomplete() {
    const searchInput = document.getElementById('modelFilterSearch');
    const valueInput = document.getElementById('modelFilterValue');
    if (!searchInput) return;

    // สร้างกล่องสำหรับแสดงผลลัพธ์
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);

    let debounce;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        const value = searchInput.value;
        
        // --- ส่วนที่แก้ไข ---
        // 1. อัปเดตค่าที่จะใช้กรองทันทีที่ผู้ใช้พิมพ์
        valueInput.value = value;
        resultsWrapper.innerHTML = '';
        
        // 2. หน่วงเวลาเล็กน้อย (500ms) เพื่อรอให้ผู้ใช้พิมพ์เสร็จ
        debounce = setTimeout(async () => {
            // 3. สั่งให้กรองข้อมูลในตารางหลักทันที
            fetchItems(1);

            // 4. ดึงข้อมูล Autocomplete มาแสดงเพื่อช่วยผู้ใช้ (ถ้ายังพิมพ์ไม่เสร็จ)
            if (value.length > 0) {
                const result = await sendRequest(ITEM_MASTER_API, 'get_models', 'GET', null, { search: value });
                if (result.success) {
                    resultsWrapper.innerHTML = '';
                    result.data.slice(0, 10).forEach(model => {
                        const resultItem = document.createElement('div');
                        resultItem.className = 'autocomplete-item';
                        resultItem.textContent = model;
                        resultItem.addEventListener('click', () => {
                            searchInput.value = model;
                            valueInput.value = model;
                            resultsWrapper.style.display = 'none';
                            fetchItems(1);
                        });
                        resultsWrapper.appendChild(resultItem);
                    });
                    resultsWrapper.style.display = result.data.length > 0 ? 'block' : 'none';
                }
            } else {
                resultsWrapper.style.display = 'none';
            }
        }, 500); // Debounce 500ms เหมาะสำหรับ Live Search
    });

    // ซ่อนผลลัพธ์เมื่อคลิกที่อื่น
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) {
            resultsWrapper.style.display = 'none';
        }
    });
}

function renderItemsMasterTable(items) {
    const tbody = document.getElementById('itemsTableBody');
    tbody.innerHTML = '';
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No items found.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';

        if (item.is_active != 1) {
            tr.classList.add('table-secondary', 'text-muted');
            tr.style.textDecoration = 'line-through';
        }
        
        tr.addEventListener('click', () => {
            openItemModal(item);
        });

        // สร้างคอลัมน์ข้อมูล
        tr.innerHTML = `
            <td>${item.sap_no}</td>
            <td>${item.part_no}</td>
            <td>${item.used_models || '-'}</td>
            <td>${item.part_description || ''}</td>
            <td class="text-end">${new Date(item.created_at).toLocaleDateString()}</td>
        `;
        tbody.appendChild(tr);
    });
}

function openItemModal(item = null) {
    const form = document.getElementById('itemForm');
    const modalLabel = document.getElementById('itemModalLabel');
    const saveBtn = document.getElementById('saveItemBtn');
    const deleteBtn = document.getElementById('deleteItemBtn');
    const bomBtn = document.getElementById('manageBomBtn');
    
    form.reset();
    
    if (item) { // กรณี Edit หรือดูข้อมูล
        // เติมข้อมูลลงในฟอร์ม
        document.getElementById('item_id').value = item.item_id;
        document.getElementById('sap_no').value = item.sap_no;
        document.getElementById('part_no').value = item.part_no;
        document.getElementById('part_description').value = item.part_description;        
        
        if (item.is_active == 1) {
            // --- ถ้า Active ---
            modalLabel.textContent = 'Edit Item';
            saveBtn.textContent = 'Save Changes';
            saveBtn.className = 'btn btn-primary'; // เปลี่ยนปุ่มเป็นสีปกติ
            deleteBtn.classList.remove('d-none'); // แสดงปุ่ม Delete
            bomBtn.classList.remove('d-none');    // แสดงปุ่ม Manage BOM
        } else {
            // --- ถ้า Inactive ---
            modalLabel.textContent = 'Restore Item';
            saveBtn.textContent = 'Restore'; // เปลี่ยนข้อความปุ่มเป็น Restore
            saveBtn.className = 'btn btn-success'; // เปลี่ยนปุ่มเป็นสีเขียว
            deleteBtn.classList.add('d-none');    // ซ่อนปุ่ม Delete
            bomBtn.classList.add('d-none');       // ซ่อนปุ่ม Manage BOM
        }

    } else { // กรณี Add New
        modalLabel.textContent = 'Add New Item';
        document.getElementById('item_id').value = '0';
        saveBtn.textContent = 'Save Changes';
        saveBtn.className = 'btn btn-primary';
        deleteBtn.classList.add('d-none');
        bomBtn.classList.add('d-none');
    }

    const modal = new bootstrap.Modal(document.getElementById('itemModal'));
    modal.show();
}

async function handleItemFormSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const itemId = data.item_id;

    const saveBtn = document.getElementById('saveItemBtn');
    if (saveBtn.textContent === 'Restore') {
        restoreItem(itemId);
        return;
    }

    showSpinner();
    try {
        const result = await sendRequest(ITEM_MASTER_API, 'save_item', 'POST', data);
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success) {
            bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
            await fetchItems(1);
        }
    } finally {
        hideSpinner();
    }
}

async function deleteItem() {
    const itemId = document.getElementById('item_id').value;
    if (!itemId || itemId === '0') return;
    
    if (confirm(`Are you sure you want to delete this item? This action cannot be undone.`)) {
        showSpinner();
        try {
            const result = await sendRequest(ITEM_MASTER_API, 'delete_item', 'POST', { item_id: itemId });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
                await fetchItems(1);
            }
        } finally {
            hideSpinner();
        }
    }
}

function manageBomForItem(item) {
    if (!item || !item.part_no) {
        showToast('Cannot manage BOM without a valid item.', 'var(--bs-danger)');
        return;
    }
    
    // สร้าง URL ที่มี parameter สำหรับการค้นหา และระบุให้เปิด Tab "BOM Manager"
    const url = `../paraManage/paraManageUI.php?search=${encodeURIComponent(item.part_no)}&tab=bom`;
    
    // แสดงข้อความให้ผู้ใช้ทราบเล็กน้อยก่อนเปลี่ยนหน้า
    showToast(`Loading BOM Manager for ${item.part_no}...`, 'var(--bs-info)');
    
    // สั่งให้เบราว์เซอร์เปิดไปที่หน้านั้น
    setTimeout(() => {
        window.location.href = url;
    }, 500); // หน่วงเวลาเล็กน้อยเพื่อให้ผู้ใช้เห็นข้อความ
}

async function restoreItem(itemId) {
    if (!itemId) return;
    
    if (confirm(`Are you sure you want to restore this item?`)) {
        showSpinner();
        try {
            const result = await sendRequest(ITEM_MASTER_API, 'restore_item', 'POST', { item_id: itemId });
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                await fetchItems(1);
            }
        } finally {
            hideSpinner();
        }
    }
}

async function exportItemsToExcel() {
    showSpinner();
    showToast('Preparing data for export...', 'var(--bs-info)');
    try {
        // ดึงข้อมูลทั้งหมดโดยไม่แบ่งหน้า
        const result = await sendRequest(ITEM_MASTER_API, 'get_items', 'GET', null, { 
            page: 1, 
            search: '', 
            show_inactive: true,
            limit: -1 // ส่ง limit = -1 เพื่อบอก backend ว่าต้องการข้อมูลทั้งหมด
        });

        if (result.success && result.data.length > 0) {
            const worksheetData = result.data.map(item => ({
                'sap_no': item.sap_no,
                'part_no': item.part_no,
                'part_description': item.part_description,
                'is_active': item.is_active ? '1' : '0' // ส่งออกเป็น 1 หรือ 0
            }));

            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "ItemMaster");
            XLSX.writeFile(workbook, `ItemMaster_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            showToast('No items to export.', 'var(--bs-warning)');
        }
    } catch (error) {
        showToast('Failed to export data.', 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

async function handleItemImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        showSpinner();
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const itemsToImport = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (itemsToImport.length === 0) {
                showToast('No data found in the file to import.', 'var(--bs-warning)');
                return;
            }

            if (confirm(`Are you sure you want to import/update ${itemsToImport.length} items?`)) {
                const result = await sendRequest(ITEM_MASTER_API, 'bulk_import_items', 'POST', itemsToImport);
                showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
                if (result.success) {
                    await fetchItems(1); // รีเฟรชตาราง
                }
            }
        } catch (error) {
            console.error("Import failed:", error);
            showToast('Failed to process the import file.', 'var(--bs-danger)');
        } finally {
            event.target.value = ''; // เคลียร์ค่าใน input file
            hideSpinner();
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Location Manager Init
    loadLocations();
    document.getElementById('addLocationBtn').addEventListener('click', () => openLocationModal());
    document.getElementById('locationForm').addEventListener('submit', handleLocationFormSubmit);
    document.getElementById('deleteLocationBtn').addEventListener('click', deleteLocation);

    // Stock Transfer Init
    populateTransferInitialData();
    setupTransferAutocomplete();
    fetchTransferHistory();
    document.getElementById('addTransferBtn').addEventListener('click', openTransferModal);
    document.getElementById('transferForm').addEventListener('submit', handleTransferFormSubmit);
    document.getElementById('from_location_id').addEventListener('change', () => updateStockDisplay('from_location_id', 'fromStock'));
    document.getElementById('to_location_id').addEventListener('change', () => updateStockDisplay('to_location_id', 'toStock'));
    const filterIds = ['filterPartNo', 'filterFromLocation', 'filterToLocation', 'filterStartDate', 'filterEndDate'];
    filterIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => fetchTransferHistory(1), 500);
            });
        }
    });

    // Opening Balance Init
    populateOpeningBalanceLocations();
    setupStockAdjustmentAutocomplete();
    document.getElementById('locationSelect').addEventListener('change', loadItemsForLocation);
    document.getElementById('saveStockBtn').addEventListener('click', saveStockTake);

    // Item Master Init
    document.getElementById('exportItemsBtn').addEventListener('click', exportItemsToExcel);
    document.getElementById('importItemsBtn').addEventListener('click', () => document.getElementById('itemImportFile').click());
    document.getElementById('itemImportFile').addEventListener('change', handleItemImport);
    
    setupModelFilterAutocomplete();
    setupItemMasterAutocomplete();

    const itemMasterTab = document.getElementById('item-master-tab');
    if (itemMasterTab) {
        itemMasterTab.addEventListener('shown.bs.tab', () => {
            fetchItems(1);
        }, { once: true });
    }
    document.getElementById('addNewItemBtn').addEventListener('click', () => openItemModal());
    document.getElementById('itemForm').addEventListener('submit', handleItemFormSubmit);
    document.getElementById('deleteItemBtn').addEventListener('click', deleteItem);
    document.getElementById('manageBomBtn').addEventListener('click', () => {
        const item_id = document.getElementById('item_id').value;
        const part_no = document.getElementById('part_no').value;
        const sap_no = document.getElementById('sap_no').value;
        bootstrap.Modal.getInstance(document.getElementById('itemModal')).hide();
        manageBomForItem({ item_id, part_no, sap_no });
    });
    
    const toggleBtn = document.getElementById('toggleInactiveBtn');
    toggleBtn.addEventListener('click', () => {
        toggleBtn.classList.toggle('active');
        
        const icon = toggleBtn.querySelector('i');
        if (toggleBtn.classList.contains('active')) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
        
        fetchItems(1);
    });
});