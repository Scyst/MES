"use strict";

// (Global States... เหมือนเดิม)
let allItems = [];
let allLocations = [];
let selectedItem = null;
let currentReviewPage = 1;
let currentReviewType = 'production';

// (sendRequest, applyTimeMask: เหมือนเดิม)
async function sendRequest(endpoint, action, method, body = null, params = null) {
    try {
        let url = `${endpoint}?action=${action}`;
        if (params) url += `&${new URLSearchParams(params).toString()}`;
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
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
        if (!response.ok) throw new Error(result.message || 'HTTP error');
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
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
// SECTION: DATA ENTRY PAGE LOGIC (mobile_entry.php)
// =================================================================

function initEntryPage() {
    populateInitialData();
    initializeDateTimeFields(); 

    const timeInputs = document.querySelectorAll('input[name="log_time"]');
    timeInputs.forEach(input => input.addEventListener('input', applyTimeMask));

    if (g_EntryType === 'production') {
        setupAutocomplete('out_item_search', 'out_item_id');
        document.getElementById('mobileProductionForm')?.addEventListener('submit', handleFormSubmit); // ⭐️ (อัปเดตแล้ว)
    } else {
        setupAutocomplete('entry_item_search', 'entry_item_id');
        document.getElementById('mobileReceiptForm')?.addEventListener('submit', handleFormSubmit);
    }
}

function initializeDateTimeFields() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().substring(0, 8);

    const outLogDate = document.getElementById('out_log_date');
    if (outLogDate) outLogDate.value = dateStr;
    
    const inLogDate = document.getElementById('entry_log_date');
    if (inLogDate) inLogDate.value = dateStr;
    const inLogTime = document.getElementById('entry_log_time');
    if (inLogTime) inLogTime.value = timeStr;
}

// === ⭐️ โค้ดที่แก้ไข (สำคัญ) ⭐️ ===
async function populateInitialData() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
    if (result.success) {
        allItems = result.items;
        allLocations = result.locations;
        
        const locationDisplay = document.getElementById('location_display');
        if (!locationDisplay) return; // (ถ้าเราอยู่หน้า Review ก็ให้ออกไป)

        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        // g_LocationId มาจาก PHP (อาจจะเป็น 0 หรือ 10)
        if (g_LocationId > 0) {
            // --- 1. QR Mode ---
            // (เหมือนเดิม)
            const foundLocation = allLocations.find(loc => loc.location_id == g_LocationId);
            locationDisplay.options[0].text = foundLocation ? foundLocation.location_name : 'Error: Unknown Location';
        } else {
            // --- 2. Manual Mode (ปุ่ม "กลับ") ---
            // (ใหม่) เติม Location ทั้งหมดลงใน Dropdown ที่ "เปิดอยู่"
            locationDisplay.innerHTML = '<option value="">-- กรุณาเลือก Location --</option>' + optionsHtml;
        }

        if (g_EntryType === 'receipt') {
            const fromLocationSelect = document.getElementById('entry_from_location_id');
            fromLocationSelect.innerHTML = '<option value="">-- From Warehouse / External --</option>' + optionsHtml;
            fromLocationSelect.addEventListener('change', updateAvailableStockDisplay);
        }
    }
}
// === ⭐️ จบส่วนที่แก้ไข ⭐️ ===

async function updateAvailableStockDisplay() { /* (เหมือนเดิม) */
    const display = document.getElementById('entry_available_stock');
    const fromLocationId = document.getElementById('entry_from_location_id').value;
    display.textContent = '--';
    if (!selectedItem || !fromLocationId) return;
    display.textContent = 'Loading...';
    const result = await sendRequest(INVENTORY_API_URL, 'get_stock_onhand', 'GET', null, {
        item_id: selectedItem.item_id, 
        location_id: fromLocationId 
    });
    display.textContent = result.success ? (parseFloat(result.quantity).toLocaleString()) : 'Error';
}

function setupAutocomplete(inputId, hiddenId) { /* (เหมือนเดิม) */
    const searchInput = document.getElementById(inputId);
    if (!searchInput) return;
    const resultsWrapper = document.createElement('div');
    resultsWrapper.className = 'autocomplete-results';
    searchInput.parentNode.appendChild(resultsWrapper);
    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase();
        resultsWrapper.innerHTML = '';
        selectedItem = null;
        document.getElementById(hiddenId).value = '';
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
                selectedItem = item;
                document.getElementById(hiddenId).value = item.item_id;
                resultsWrapper.innerHTML = '';
                if (g_EntryType === 'receipt') updateAvailableStockDisplay();
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
// SECTION: REVIEW PAGE LOGIC (mobile_review.php)
// =================================================================

function initReviewPage() {
    populateModalDatalists();
    const btnOut = document.getElementById('btn-load-out');
    const btnIn = document.getElementById('btn-load-in');
    btnOut.addEventListener('click', () => {
        currentReviewType = 'production';
        btnOut.classList.add('active');
        btnIn.classList.remove('active');
        fetchReviewData();
    });
    btnIn.addEventListener('click', () => {
        currentReviewType = 'receipt';
        btnIn.classList.add('active');
        btnOut.classList.remove('active');
        fetchReviewData();
    });
    document.getElementById('review-list-container').addEventListener('click', (event) => {
        const card = event.target.closest('.review-card');
        if (card && card.dataset.transactionId) {
            editTransaction(card.dataset.transactionId, card.dataset.type);
        }
    });
    fetchReviewData();
}

// === ⭐️ โค้ดที่แก้ไข (สำคัญ) ⭐️ ===
async function fetchReviewData(page = 1) {
    currentReviewPage = page;
    showSpinner();
    
    let action = '';
    let params = {
        page: page,
        limit: 25, 
        // (สำคัญ) เปลี่ยนจาก search_term เป็น user_filter
        user_filter: currentUser.username 
    };
    
    if (currentReviewType === 'production') {
        action = 'get_production_history';
    } else {
        action = 'get_receipt_history';
    }
    
    // (โค้ดที่เหลือเหมือนเดิม)
    const result = await sendRequest(INVENTORY_API_URL, action, 'GET', null, params);
    if (result.success) {
        renderReviewCards(result.data, currentReviewType);
    } else {
        document.getElementById('review-list-container').innerHTML = `<div class="alert alert-warning">No data found.</div>`;
    }
    hideSpinner();
}
// === ⭐️ จบส่วนที่แก้ไข ⭐️ ===

function renderReviewCards(data, type) { /* (เหมือนเดิม) */
    const container = document.getElementById('review-list-container');
    container.innerHTML = '';
    if (!data || data.length === 0) {
        container.innerHTML = `<div class="alert alert-secondary text-center">No transactions found.</div>`;
        return;
    }
    data.forEach(row => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.dataset.transactionId = row.transaction_id;
        let header = '', body = '', footer = '';
        const transactionDate = new Date(row.transaction_timestamp);
        const dateStr = transactionDate.toLocaleDateString('en-GB');
        const timeStr = transactionDate.toTimeString().substring(0, 8);
        if (type === 'production') {
            card.dataset.type = 'production';
            header = `<span class="text-primary">${row.count_type}</span> <span class="item">${parseFloat(row.quantity).toLocaleString()} PCS</span>`;
            body = `<div><span class="item">${row.part_no}</span> (${row.location_name})</div> <div>Lot: ${row.lot_no || '-'}</div>`;
            footer = `${dateStr} @ ${timeStr}`;
        } else {
            card.dataset.type = 'entry';
            header = `<span class="text-success">${row.transaction_type}</span> <span class="item">+${parseFloat(row.quantity).toLocaleString()} PCS</span>`;
            body = `<div><span class="item">${row.part_no}</span></div> <div>To: ${row.destination_location || 'N/A'}</div> <div>From: ${row.source_location || 'External'}</div>`;
            footer = `${dateStr} @ ${timeStr} (Lot: ${row.lot_no || '-'})`;
        }
        card.innerHTML = `<div class="card-header">${header}</div><div class="card-body">${body}</div><div class="card-footer">${footer}</div>`;
        container.appendChild(card);
    });
}


// =================================================================
// SECTION: EDIT / DELETE LOGIC (เหมือนเดิม)
// =================================================================

async function populateModalDatalists() { /* (เหมือนเดิม) */
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
     if (result.success) {
        allItems = result.items;
        allLocations = result.locations;
        const editInLocationSelect = document.getElementById('edit_entry_location_id');
        const editOutLocationSelect = document.getElementById('edit_production_location_id');
        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
        if (editInLocationSelect) {
            editInLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
        if (editOutLocationSelect) {
            editOutLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
    }
}

async function editTransaction(transactionId, type) { /* (เหมือนเดิม) */
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_transaction_details', 'GET', null, { transaction_id: transactionId });
        if (!result.success) throw new Error(result.message);
        const data = result.data;
        let modalId;
        if (type === 'entry') {
            modalId = 'editEntryModal';
            document.getElementById('edit_entry_transaction_id').value = data.transaction_id;
            document.getElementById('edit_entry_item_display').value = `${data.sap_no} | ${data.part_no}`;
            document.getElementById('edit_entry_location_id').value = data.to_location_id;
            document.getElementById('edit_entry_quantity').value = data.quantity;
            document.getElementById('edit_entry_lot_no').value = data.reference_id;
            document.getElementById('edit_entry_notes').value = data.notes;
            if (data.transaction_timestamp) {
                const [datePart, timePart] = data.transaction_timestamp.split(' ');
                document.getElementById('edit_entry_log_date').value = datePart;
                document.getElementById('edit_entry_log_time').value = timePart ? timePart.substring(0, 8) : '00:00:00';
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
            if (data.transaction_timestamp) {
                const datePart = data.transaction_timestamp.split(' ')[0];
                document.getElementById('edit_production_log_date').value = datePart;
            }
            document.getElementById('edit_production_start_time').value = data.start_time ? data.start_time.substring(0, 8) : '';
            document.getElementById('edit_production_end_time').value = data.end_time ? data.end_time.substring(0, 8) : '';
        }
        if (modalId) new bootstrap.Modal(document.getElementById(modalId)).show();
    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

function handleDeleteFromModal(type) { /* (เหมือนเดิม) */
    let transactionId, modalId;
    if (type === 'entry') {
        transactionId = document.getElementById('edit_entry_transaction_id').value;
        modalId = 'editEntryModal';
    } else {
        transactionId = document.getElementById('edit_production_transaction_id').value;
        modalId = 'editProductionModal';
    }
    if (!transactionId) return;
    const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
    if (modalInstance) modalInstance.hide();
    deleteTransaction(transactionId, () => fetchReviewData(currentReviewPage));
}

async function deleteTransaction(transactionId, successCallback) { /* (เหมือนเดิม) */
    if (!confirm('Are you sure you want to delete this transaction record?')) return;
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'delete_transaction', 'POST', { transaction_id: transactionId });
        showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
        if (result.success && successCallback) {
            successCallback();
        }
    } finally {
        hideSpinner();
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;
    
    const isManualMode = (g_LocationId <= 0);
    let manualLocationId = null; 
    
    showSpinner();
    
    // ------------------------------------
    // 1. Logic (ADD PART)
    // ------------------------------------
    if (action === 'addPart') {
        
        if (isManualMode) {
            manualLocationId = document.getElementById('location_display').value;
        }
        const locationId = isManualMode ? manualLocationId : g_LocationId;
        if (!locationId) {
            showToast('Please select a location.', 'var(--bs-warning)');
            hideSpinner(); return;
        }

        // 1. (ใหม่) อ่านค่าจาก Dropdown
        const timeSlot = form.querySelector('#out_time_slot').value; // เช่น "11:00:00|11:59:59"
        // 2. (ใหม่) แยกค่า
        const [startTime, endTime] = timeSlot.split('|');

        if (!startTime || !endTime) {
            showToast('Invalid time slot selected.', 'var(--bs-danger)');
            hideSpinner(); return;
        }

        // 3. (แก้ไข) สร้าง baseData โดยใช้ค่าใหม่
        const baseData = {
            item_id: form.querySelector('#out_item_id').value,
            location_id: locationId, 
            lot_no: form.querySelector('#out_lot_no').value,
            log_date: form.querySelector('input[name="log_date"]').value,
            start_time: startTime,
            end_time: endTime,
            notes: form.querySelector('#out_notes').value
        };

        const transactions = [];
        const qtyFg = parseFloat(form.querySelector('#out_qty_fg').value) || 0;
        const qtyHold = parseFloat(form.querySelector('#out_qty_hold').value) || 0;
        const qtyScrap = parseFloat(form.querySelector('#out_qty_scrap').value) || 0;
        if (qtyFg > 0) transactions.push({ quantity: qtyFg, count_type: 'FG' });
        if (qtyHold > 0) transactions.push({ quantity: qtyHold, count_type: 'HOLD' });
        if (qtyScrap > 0) transactions.push({ quantity: qtyScrap, count_type: 'SCRAP' });

        if (transactions.length === 0) {
            showToast('Please enter a quantity.', 'var(--bs-warning)');
            hideSpinner(); return;
        }
        let allSuccess = true;
        for (const trans of transactions) {
            const result = await sendRequest(INVENTORY_API_URL, 'execute_production', 'POST', { ...baseData, ...trans });
            if (!result.success) allSuccess = false;
        }
        hideSpinner();
        if (allSuccess) {
            showToast('Production saved successfully.', 'var(--bs-success)');
            form.reset(); 
            initializeDateTimeFields();
            if (isManualMode) document.getElementById('location_display').value = ''; 
            document.getElementById('out_item_search').focus(); 
        } else {
            showToast('An error occurred.', 'var(--bs-danger)');
        }
        return; 
    }
    
    if (action === 'addEntry') {
        
        // --- ⭐️ โค้ดที่แก้ไข ⭐️ ---
        // 3. ย้ายโค้ดที่อ่าน .value มาไว้ "ข้างใน" นี้
        if (isManualMode) {
            manualLocationId = document.getElementById('location_display').value;
        }
        // --- ⭐️ จบส่วนที่แก้ไข ⭐️ ---

        const locationId = isManualMode ? manualLocationId : g_LocationId;
        if (!locationId) {
            showToast('Please select a location.', 'var(--bs-warning)');
            hideSpinner(); return;
        }
        
        const data = Object.fromEntries(new FormData(form).entries());
        data.to_location_id = locationId; 
        
        const result = await sendRequest(INVENTORY_API_URL, 'execute_receipt', 'POST', data);
        hideSpinner();
        if (result.success) {
            showToast('Receipt saved successfully.', 'var(--bs-success)');
            form.reset(); 
            initializeDateTimeFields();
            if (isManualMode) document.getElementById('location_display').value = ''; 
            document.getElementById('entry_item_search').focus(); 
            updateAvailableStockDisplay();
        } else {
            showToast(result.message, 'var(--bs-danger)');
        }
        return; 
    }

    // ------------------------------------
    // 2. Logic จาก mobile_review.php (EDIT)
    // ------------------------------------
    // ⭐️ (สำคัญ) โค้ดส่วนนี้จะทำงานเมื่อ action เป็น "edit..."
    // ⭐️ มันจะไม่พยายามอ่าน "location_display" อีกต่อไป
    // ------------------------------------
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    let apiAction = 'update_transaction';
    let successCallback = () => fetchReviewData(currentReviewPage);

    if (action === 'editEntry' || action === 'editProduction') {
        try {
            const result = await sendRequest(INVENTORY_API_URL, apiAction, 'POST', data);
            showToast(result.message, result.success ? 'var(--bs-success)' : 'var(--bs-danger)');
            if (result.success) {
                const modalId = form.closest('.modal').id;
                // (เพิ่ม) ตรวจสอบว่า Modal Instance มีอยู่จริงก่อนปิด
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById(modalId));
                if (modalInstance) {
                    modalInstance.hide();
                }
                if (successCallback) await successCallback();
            }
        } finally {
            hideSpinner();
        }
    } else {
        hideSpinner();
    }
}

// =================================================================
// SECTION: INITIALIZATION (Router หลัก)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    if (document.getElementById('review-container')) {
        initReviewPage();
        document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
        document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));
        document.getElementById('editEntryForm')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('editProductionForm')?.addEventListener('submit', handleFormSubmit);

    } else if (document.getElementById('entry-container')) {
        initEntryPage();
    }
});