"use strict";

// =================================================================
// SECTION: GLOBAL VARIABLES
// =================================================================
let allItems = [];
let allLocations = [];
let selectedItem = null;
let currentReviewPage = 1;
let currentReviewType = 'production';
let html5QrCodeScanner = null;
let g_CurrentTransferOrder = null;

// =================================================================
// SECTION: HELPER FUNCTIONS
// =================================================================
function playBeep(type = 'error') {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        if (type === 'success') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else {
            osc.type = 'square';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start();
            osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) { console.log("Audio not supported"); }
}

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
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             throw new Error("Server returned non-JSON response. Possible PHP Error.");
        }
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.message || 'HTTP error');
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: error.message || "Network or server error." };
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
// SECTION: DATA ENTRY PAGE LOGIC
// =================================================================
function initEntryPage() {
    populateInitialData(); 
    initializeDateTimeFields(); 
    
    const timeInputs = document.querySelectorAll('input[name="log_time"]');
    timeInputs.forEach(input => input.addEventListener('input', applyTimeMask));

    const entryType = typeof g_EntryType !== 'undefined' ? g_EntryType : 'receipt';
    const transferIdNew = typeof g_TransferId_NEW !== 'undefined' ? g_TransferId_NEW : null;

    if (entryType === 'production') {
        setupAutocomplete('out_item_search', 'out_item_id');
        document.getElementById('mobileProductionForm')?.addEventListener('submit', handleFormSubmit);
    } else {
        setupAutocomplete('entry_item_search', 'entry_item_id');
        document.getElementById('mobileReceiptForm')?.addEventListener('submit', handleFormSubmit);
        
        if (!transferIdNew) {
            initQrScanner(); 
        }
        
        const manualBtn = document.getElementById('manual_scan_id_btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', handleManualScanLoad);
        }
        
        const manualInput = document.getElementById('manual_scan_id_input');
        if(manualInput) {
            manualInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualScanLoad();
                }
            });
        }
    }
}

async function populateInitialData() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
    
    if (result.success) {
        allItems = result.items || [];
        allLocations = result.locations || [];
        
        const entryType = typeof g_EntryType !== 'undefined' ? g_EntryType : 'receipt';
        const locId = typeof g_LocationId !== 'undefined' ? g_LocationId : 0;
        const transferIdNew = typeof g_TransferId_NEW !== 'undefined' ? g_TransferId_NEW : null;
        const autoFillDataOld = typeof g_AutoFillData_OLD !== 'undefined' ? g_AutoFillData_OLD : null;
        const locationDisplay = document.getElementById('location_display');
        if (locationDisplay) {
            const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
            if (locId > 0) {
                const foundLocation = allLocations.find(loc => loc.location_id == locId);
                locationDisplay.innerHTML = `<option value="${locId}">${foundLocation ? foundLocation.location_name : 'Unknown Location'}</option>`;
            } else {
                locationDisplay.innerHTML = '<option value="">-- เลือกสถานที่ --</option>' + optionsHtml;
            }
        }

        if (entryType === 'receipt') {
            const fromLocationSelect = document.getElementById('entry_from_location_id');
            if (fromLocationSelect) {
                const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
                fromLocationSelect.innerHTML = '<option value="">-- เลือกสถานที่ --</option>' + optionsHtml;
                fromLocationSelect.addEventListener('change', updateAvailableStockDisplay);
            }
        }

        const outLocationCustom = document.getElementById('out_location_id_custom');
        if (outLocationCustom) {
            const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
            outLocationCustom.innerHTML = '<option value="">-- เลือกสถานที่ --</option>' + optionsHtml;
        }

        if (entryType === 'production') {
            const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry_OUT'));
            if (lastData && lastData.item_id) {
                const searchEl = document.getElementById('out_item_search');
                const idEl = document.getElementById('out_item_id');
                
                if (searchEl) searchEl.value = lastData.item_display_text || '';
                if (idEl) idEl.value = lastData.item_id;
                if (locId <= 0 && lastData.location_id && outLocationCustom) {
                    outLocationCustom.value = lastData.location_id;
                }
                selectedItem = allItems.find(i => i.item_id == lastData.item_id) || null;
            }
        } else {
            const lastData = JSON.parse(localStorage.getItem('inventoryUILastEntry_IN'));
            if (lastData && lastData.item_id) {
                const searchEl = document.getElementById('entry_item_search');
                const idEl = document.getElementById('entry_item_id');
                const fromLocEl = document.getElementById('entry_from_location_id');

                if (searchEl) searchEl.value = lastData.item_display_text || '';
                if (idEl) idEl.value = lastData.item_id;
                if (fromLocEl) fromLocEl.value = lastData.from_location_id || '';
                
                if (locId <= 0 && lastData.to_location_id && locationDisplay) {
                    locationDisplay.value = lastData.to_location_id;
                }
                selectedItem = allItems.find(i => i.item_id == lastData.item_id) || null;
                updateAvailableStockDisplay();
            }
        }

        if (transferIdNew) {
            await autoFillFromTransferOrder(transferIdNew);
        } else if (autoFillDataOld && autoFillDataOld.sap_no) {
            await autoFillForm_OLD(autoFillDataOld);
        }
    }
}

function handleManualScanLoad() {
    const inputElement = document.getElementById('manual_scan_id_input');
    const transferId = inputElement.value.trim().toUpperCase();

    if (!transferId) {
        showToast("กรุณากรอก Transfer ID", 'var(--bs-warning)');
        inputElement.focus();
        return;
    }
    
    autoFillFromTransferOrder(transferId);
    inputElement.value = '';
}

function initializeDateTimeFields() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}:${seconds}`;

    const outLogDate = document.getElementById('out_log_date');
    if (outLogDate) outLogDate.value = dateStr;    
    const inLogDate = document.getElementById('entry_log_date');
    if (inLogDate) inLogDate.value = dateStr;
    const inLogTime = document.getElementById('entry_log_time');
    if (inLogTime) inLogTime.value = timeStr;
}

function stopScanning() {
    if (html5QrCodeScanner) {
        html5QrCodeScanner.clear().then(_ => {
            const readerContainer = document.getElementById('qr-reader-container');
            if (readerContainer) readerContainer.style.display = 'none';
            html5QrCodeScanner = null;
        }).catch(err => console.warn("Scanner clear failed", err));
    }
}

function startScanning() {
    if (html5QrCodeScanner) return;

    const readerContainer = document.getElementById('qr-reader-container');
    const readerDivId = "qr-reader";
    if (readerContainer) readerContainer.style.display = 'block';

    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Scan result: ${decodedText}`);
        stopScanning();
        
        try {
            let transferId = null;
            try {
                const scannedUrl = new URL(decodedText);
                transferId = scannedUrl.searchParams.get('transfer_id'); 
            } catch (e) {
                if (decodedText.startsWith('T-') && decodedText.length > 8) {
                    transferId = decodedText;
                }
            }

            if (transferId) {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('transfer_id', transferId);
                currentUrl.searchParams.set('type', 'receipt');
                ['scan', 'sap_no', 'lot', 'qty', 'from_loc_id'].forEach(p => currentUrl.searchParams.delete(p));
                
                showSpinner();
                window.location.href = currentUrl.toString();
            } else {
                throw new Error("QR Code ไม่ถูกต้อง (ไม่พบ Transfer ID)");
            }
        } catch (e) {
            console.error(e);
            showToast(e.message, 'var(--bs-danger)');
        }
    };

    html5QrCodeScanner = new Html5QrcodeScanner(
        readerDivId, 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
    );
    html5QrCodeScanner.render(onScanSuccess, (err) => { /* ignore failures */ });
}

async function handleFileScan(file) {
    if (!file) return;
    stopScanning(); 
    showSpinner();

    try {
        const html5QrCode = new Html5Qrcode("qr-reader"); 
        const decodedText = await html5QrCode.scanFile(file, false);
        
        console.log(`File scan result: ${decodedText}`);
        
        let transferId = null;
        try {
            const scannedUrl = new URL(decodedText);
            transferId = scannedUrl.searchParams.get('transfer_id');
        } catch (e) {
            if (decodedText.startsWith('T-') && decodedText.length > 8) {
                transferId = decodedText;
            }
        }

        if (transferId) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('transfer_id', transferId);
            ['scan', 'type', 'sap_no', 'lot', 'qty', 'from_loc_id'].forEach(p => currentUrl.searchParams.delete(p));
            
            window.location.href = currentUrl.toString();
        } else {
            throw new Error("QR Code ไม่ถูกต้อง (ไม่พบ Transfer ID)");
        }

    } catch (err) {
        console.error("File scan error:", err);
        showToast(err.message || "ไม่พบ QR Code ในภาพที่เลือก", 'var(--bs-danger)');
        hideSpinner();
    }
}

function initQrScanner() {
    const fileInput = document.getElementById('scan-image-file');
    const manualBtn = document.getElementById('manual_scan_id_btn');
    const manualInput = document.getElementById('manual_scan_id_input');

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileScan(e.target.files[0]);
            e.target.value = null; 
        }
    });

    if (manualBtn) {
        manualBtn.replaceWith(manualBtn.cloneNode(true));
        document.getElementById('manual_scan_id_btn').addEventListener('click', handleManualScanLoad);
    }

    if (manualInput) {
        manualInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleManualScanLoad();
            }
        });
    }

    const sectionIn = document.getElementById('section-in');
    if (sectionIn && sectionIn.classList.contains('active')) {
        startScanning();
    }
}

async function autoFillForm_OLD(data) {
    if (!data || !data.sap_no || !data.lot) {
        console.warn("Autofill data incomplete:", data);
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const scanIdFromUrl = urlParams.get('scan');

    showSpinner();
    try {
        const checkParams = {
            sap_no: data.sap_no,
            lot_no: data.lot
        };
        if (scanIdFromUrl) {
            checkParams.scan_id = scanIdFromUrl;
        }
        const result = await sendRequest(INVENTORY_API_URL, 'check_lot_status', 'GET', null, checkParams);        
        if (!result.success) throw new Error(result.message || "Failed to check lot status.");

        if (result.status === 'received') {
            const details = result.details;
            const receivedDate = new Date(details.transaction_timestamp);
            const dateStr = receivedDate.toLocaleDateString('en-GB');
            const timeStr = receivedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            document.getElementById('status-details').innerHTML = 
                `รับเข้าแล้วโดย: <strong class="text-warning">${details.username || 'Unknown User'}</strong><br>
                 เมื่อ: <strong>${dateStr} @ ${timeStr}</strong>`;
            document.getElementById('status-overlay').style.display = 'flex';

        } else {
            const item = allItems.find(i => i.sap_no.toLowerCase() === data.sap_no.toLowerCase().trim());
            
            if (item) {
                selectedItem = item;
                document.getElementById('entry_item_search').value = `${item.sap_no} | ${item.part_no}`;
                document.getElementById('entry_item_id').value = item.item_id;
            } else {
                showToast(`ไม่พบชิ้นส่วน SAP No: ${data.sap_no}`, 'var(--bs-warning)');
            }

            if (data.lot) document.getElementById('entry_lot_no').value = data.lot;
            if (data.qty) document.getElementById('entry_quantity_in').value = Math.floor(data.qty);
            if (data.from_loc_id) {
                const fromSelect = document.getElementById('entry_from_location_id');
                if (fromSelect) {
                    fromSelect.value = data.from_loc_id;
                    updateAvailableStockDisplay();
                }
            }

            document.getElementById('mobileReceiptForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast("ข้อมูลพร้อมบันทึก", 'var(--bs-success)');
        }

    } catch (error) {
        console.error("Autofill Error:", error);
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

async function autoFillFromTransferOrder(transferId) {
    if (!transferId) return;

    const scannerBox = document.querySelector('.scanner-box');
    if (scannerBox) scannerBox.style.display = 'none';

    showSpinner();
    try {
        const result = await sendRequest(TRANSFER_API_URL, 'get_transfer_details', 'GET', null, { transfer_id: transferId });
        
        if (!result.success) throw new Error(result.message || "Failed to get transfer details.");

        const order = result.data;
        g_CurrentTransferOrder = order; 

        if (order.status === 'COMPLETED' || order.status === 'REJECTED') {
            const statusText = order.status === 'COMPLETED' ? 'รับเข้าแล้ว' : 'ถูกปฏิเสธแล้ว';
            let detailsHtml = `สถานะ: <strong class="text-warning">${statusText}</strong><br>`;
            
            if (order.confirmed_at && order.confirmed_by_user_id) {
                const confirmedDate = new Date(order.confirmed_at);
                const dateStr = confirmedDate.toLocaleDateString('th-TH');
                const timeStr = confirmedDate.toLocaleTimeString('th-TH');
                detailsHtml += `เมื่อ: <strong>${dateStr} @ ${timeStr}</strong>`;
            }

            document.getElementById('status-details').innerHTML = detailsHtml;
            document.getElementById('status-overlay').style.display = 'flex';

        } else if (order.status === 'PENDING') {
            selectedItem = {
                item_id: order.item_id,
                sap_no: order.sap_no,
                part_no: order.part_no,
                part_description: order.part_description
            };
            
            const itemSearchEl = document.getElementById('entry_item_search');
            const fromLocationEl = document.getElementById('entry_from_location_id');
            const lotNoEl = document.getElementById('entry_lot_no');
            const locationDisplayEl = document.getElementById('location_display');

            itemSearchEl.value = `${order.sap_no} | ${order.part_no}`;
            document.getElementById('entry_item_id').value = order.item_id;
            lotNoEl.value = order.transfer_uuid;
            document.getElementById('entry_quantity_in').value = Math.floor(order.quantity); // Force Int
            fromLocationEl.value = order.from_location_id;
            document.getElementById('entry_notes').value = order.notes || '';

            itemSearchEl.readOnly = true;
            itemSearchEl.classList.add('form-control-readonly');
            
            lotNoEl.readOnly = true;
            lotNoEl.classList.add('form-control-readonly');

            fromLocationEl.disabled = true;
            fromLocationEl.classList.add('form-control-readonly');
            if (locationDisplayEl && locationDisplayEl.disabled) {
                locationDisplayEl.disabled = false;
                locationDisplayEl.classList.remove('form-control-readonly');
            }

            await updateAvailableStockDisplay(); 

            document.getElementById('mobileReceiptForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast("สแกนสำเร็จ กรุณาเลือกคลังเก็บ", 'var(--bs-success)');
        }

    } catch (error) {
        console.error("Autofill Error (New):", error);
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

async function updateAvailableStockDisplay() {
    const display = document.getElementById('entry_available_stock');
    const fromLocationId = document.getElementById('entry_from_location_id')?.value;
    
    if (!display) return;

    display.className = 'form-control-plaintext ps-2 fw-bold mb-3';
    display.textContent = '--';

    if (!selectedItem || !fromLocationId) return;

    display.textContent = 'Loading...';
    const result = await sendRequest(INVENTORY_API_URL, 'get_stock_onhand', 'GET', null, {
        item_id: selectedItem.item_id, 
        location_id: fromLocationId 
    });

    if (result.success) {
        const qty = Math.floor(result.quantity); // Force Int
        display.textContent = qty.toLocaleString();
        if (qty <= 0) {
            display.classList.add('text-danger');
        }
    } else {
        display.textContent = 'Error';
        display.classList.add('text-danger');
    }
}

function setupAutocomplete(inputId, hiddenId) {
    const searchInput = document.getElementById(inputId);
    if (!searchInput) return;
    
    let resultsWrapper = searchInput.parentNode.querySelector('.autocomplete-results');
    if (!resultsWrapper) {
        resultsWrapper = document.createElement('div');
        resultsWrapper.className = 'autocomplete-results';
        searchInput.parentNode.appendChild(resultsWrapper);
    }

    searchInput.addEventListener('input', () => {
        const value = searchInput.value.toLowerCase().trim();
        resultsWrapper.innerHTML = '';
        selectedItem = null;
        document.getElementById(hiddenId).value = '';
        
        if (value.length < 2) {
            resultsWrapper.style.display = 'none';
            return;
        }

        const filteredItems = allItems.filter(item => 
            item.sap_no.toLowerCase().includes(value) ||
            item.part_no.toLowerCase().includes(value) ||
            (item.part_description || '').toLowerCase().includes(value)
        ).slice(0, 15);

        if (filteredItems.length === 0) {
            resultsWrapper.style.display = 'none';
            return;
        }

        filteredItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerHTML = `<strong>${item.sap_no}</strong> - ${item.part_no}<br><small class="text-muted">${item.part_description || ''}</small>`;
            div.addEventListener('click', () => {
                searchInput.value = `${item.sap_no} | ${item.part_no}`;
                document.getElementById(hiddenId).value = item.item_id;
                selectedItem = item;
                resultsWrapper.style.display = 'none';
                if (g_EntryType === 'receipt') updateAvailableStockDisplay();
            });
            resultsWrapper.appendChild(div);
        });
        resultsWrapper.style.display = 'block';
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsWrapper.contains(e.target)) {
            resultsWrapper.style.display = 'none';
        }
    });
}

// =================================================================
// SECTION: REVIEW PAGE LOGIC (mobile_review.php)
// =================================================================
async function initReviewPage() {
    const container = document.getElementById('review-list-container');
    if (!container) return; 

    await populateReviewModals();
    const reviewOutTab = document.getElementById('review-out-tab');
    const reviewInTab = document.getElementById('review-in-tab');
    
    reviewOutTab?.addEventListener('shown.bs.tab', () => {
        currentReviewType = 'production';
        fetchReviewData();
    });

    reviewInTab?.addEventListener('shown.bs.tab', () => {
        currentReviewType = 'receipt';
        fetchReviewData();
    });

    container.addEventListener('click', (event) => {
        const card = event.target.closest('.review-card');
        if (card && card.dataset.transactionId) {
            editTransaction(card.dataset.transactionId, card.dataset.type);
        }
    });

    if (reviewOutTab && reviewOutTab.classList.contains('active')) {
        currentReviewType = 'production';
    } else {
        currentReviewType = 'receipt';
    }
    await fetchReviewData();
}

async function populateReviewModals() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
    if (result.success && result.locations) {
        allLocations = result.locations;
        
        const editInFromLocationSelect = document.getElementById('edit_entry_from_location_id');
        const editInToLocationSelect = document.getElementById('edit_entry_to_location_id');
        
        const editOutLocationSelect = document.getElementById('edit_production_location_id');        
        const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');

        if (editInFromLocationSelect) {
            editInFromLocationSelect.innerHTML = '<option value="">-- Select Source --</option>' + optionsHtml;
        }
        if (editInToLocationSelect) {
            editInToLocationSelect.innerHTML = '<option value="">-- Select Destination --</option>' + optionsHtml;
        }

        if (editOutLocationSelect) {
            editOutLocationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
        }
    }
}

async function fetchReviewData(page = 1) {
    currentReviewPage = page;
    const container = document.getElementById('review-list-container');
    if (!container) return;

    showSpinner();
    
    const action = (currentReviewType === 'production') ? 'get_production_history' : 'get_receipt_history';
    const params = {
        page: page,
        limit: 25,
        user_filter: currentUser.username
    };

    const result = await sendRequest(INVENTORY_API_URL, action, 'GET', null, params);
    
    if (result.success && result.data && result.data.length > 0) {
        renderReviewCards(result.data, currentReviewType);
    } else {
        container.innerHTML = `<div class="alert alert-warning text-center mt-3">ไม่พบประวัติการบันทึก</div>`;
    }
    hideSpinner();
}

function renderReviewCards(data, type) {
    const container = document.getElementById('review-list-container');
    if (!container) return;

    container.innerHTML = '';
    
    data.forEach(row => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.dataset.transactionId = row.transaction_id;
        card.dataset.type = type;

        const dateObj = new Date(row.transaction_timestamp);
        const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        let badgeHtml = '';
        let qtyDisplay = '';
        let locationName = '';

        if (type === 'production') {
            let badgeClass = 'bg-secondary';
            switch (row.count_type.toUpperCase()) {
                case 'FG': badgeClass = 'bg-primary'; break;
                case 'HOLD': badgeClass = 'bg-warning text-dark'; break;
                case 'SCRAP': badgeClass = 'bg-danger'; break;
            }
            badgeHtml = `<span class="badge ${badgeClass}">${row.count_type}</span>`;
            qtyDisplay = `<span class="fw-bold">${Math.floor(row.quantity).toLocaleString()} PCS</span>`;
            locationName = row.location_name || 'N/A';
            
        } else {
            badgeHtml = `<span class="badge bg-success">IN</span>`;
            qtyDisplay = `<span class="fw-bold text-success">+${Math.floor(row.quantity).toLocaleString()} PCS</span>`;
            locationName = row.destination_location || 'N/A';
        }

        const header = `
            <span class="fs-6 fw-bold">${row.sap_no}</span>
            ${badgeHtml}
        `;

        const line2 = `<div class="mb-1">
                         <span class="text-body fw-medium">${row.part_no}</span>
                         <small class="text-muted fst-italic">(${(row.part_description || 'No Desc.')})</small>
                       </div>`;

        const line3 = `<small class="text-muted d-block">
                         Loc: ${locationName} | Lot: ${row.lot_no || '-'}
                       </small>`;
        
        const body = line2 + line3;
        const footer = `
            <span>${dateStr} ${timeStr}</span>
            ${qtyDisplay}
        `;
        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">${header}</div>
            <div class="card-body py-2">${body}</div>
            <div class="card-footer d-flex justify-content-between align-items-center text-muted py-1" style="font-size: 0.8rem;">
                ${footer}
            </div>
        `;
        container.appendChild(card);
    });
}

// =================================================================
// SECTION: FORM SUBMISSION HANDLER
// =================================================================
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;
    const submitBtn = form.querySelector('button[type="submit"]');
    
    submitBtn.disabled = true; 
    showSpinner();

    try {
        if (action === 'addPart' || action === 'addEntry') { 
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (action === 'addPart') {
                let locationId = g_LocationId;
                if (locationId <= 0) {
                    const locCustom = document.getElementById('out_location_id_custom');
                    if (locCustom) locationId = locCustom.value;
                }
                
                if (!locationId) throw new Error("กรุณาเลือก Location ปลายทาง");
                data.location_id = locationId;

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
                // Force Integer
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
                    if (!res.success) {
                        allSuccess = false;
                        throw new Error(res.message);
                    }
                }
                
                if (allSuccess) { 
                    playBeep('success');
                    
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
                        location_id: locationId
                    };
                    localStorage.setItem('inventoryUILastEntry_OUT', JSON.stringify(lastEntryData));
                    
                    form.reset();
                    initializeDateTimeFields();
                    selectedItem = null;
                    document.getElementById('out_item_id').value = '';
                    if (g_LocationId <= 0) document.getElementById('location_display').value = '';
                }

            } else {
                const transferUuid = data.transfer_uuid;
                
                let locationId = g_LocationId;
                if (locationId <= 0) {
                    const locDisplay = document.getElementById('location_display');
                    if (locDisplay) locationId = locDisplay.value;
                }

                if (transferUuid) {
                    let toLocationId = g_LocationId;
                    if (toLocationId <= 0) {
                        toLocationId = document.getElementById('location_display').value;
                    }
                    if (!toLocationId) throw new Error("กรุณาเลือก Location ปลายทาง (To)");
                    const body = {
                        transfer_uuid: transferUuid,
                        confirmed_quantity: Math.floor(data.confirmed_quantity), // Force Integer
                        to_location_id: toLocationId 
                    };
                    
                    const res = await sendRequest(TRANSFER_API_URL, 'confirm_transfer', 'POST', body);
                    if (!res.success) throw new Error(res.message);

                    playBeep('success');
                    showToast("ยืนยันการรับของสำเร็จ!", 'var(--bs-success)');
                    
                    form.reset();
                    initializeDateTimeFields();
                    selectedItem = null;
                    g_CurrentTransferOrder = null;
                    
                    const itemSearchEl = document.getElementById('entry_item_search');
                    const fromLocationEl = document.getElementById('entry_from_location_id');
                    const lotNoEl = document.getElementById('entry_lot_no');
                    const locationDisplayEl = document.getElementById('location_display');

                    itemSearchEl.readOnly = false;
                    itemSearchEl.classList.remove('form-control-readonly');
                    lotNoEl.readOnly = false;
                    lotNoEl.classList.remove('form-control-readonly');
                    fromLocationEl.disabled = false;
                    fromLocationEl.classList.remove('form-control-readonly');
                    
                    if (g_LocationId <= 0 && locationDisplayEl) {
                        locationDisplayEl.disabled = false;
                        locationDisplayEl.classList.remove('form-control-readonly');
                    }
                    
                    const scannerBox = document.querySelector('.scanner-box');
                    if (scannerBox) scannerBox.style.display = 'block';
                    initQrScanner();

                } else {
                    if (!locationId) throw new Error("กรุณาเลือก Location ปลายทาง (To)");
                    
                    data.to_location_id = locationId;
                    data.quantity = Math.floor(data.confirmed_quantity); // Force Integer
                    
                    const res = await sendRequest(INVENTORY_API_URL, 'execute_receipt', 'POST', data);
                    if (!res.success) throw new Error(res.message);

                    playBeep('success');
                    showToast("บันทึกสำเร็จ", 'var(--bs-success)');

                    const searchInputValue = document.getElementById('entry_item_search').value;
                    let lastEntryData = {
                        item_id: data.item_id,
                        item_display_text: searchInputValue,
                        from_location_id: data.from_location_id,
                        to_location_id: locationId
                    };
                    localStorage.setItem('inventoryUILastEntry_IN', JSON.stringify(lastEntryData));

                    form.reset();
                    initializeDateTimeFields();
                    selectedItem = null;
                    document.getElementById('entry_item_id').value = '';
                    if (g_LocationId <= 0) document.getElementById('location_display').value = '';
                    updateAvailableStockDisplay();
                }
            }

        }
        else if (action === 'editEntry' || action === 'editProduction') {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.quantity = Math.floor(data.quantity); // Force Integer

            const res = await sendRequest(INVENTORY_API_URL, 'update_transaction', 'POST', data);
            if (!res.success) throw new Error(res.message);

            playBeep('success');
            showToast("แก้ไขสำเร็จ", 'var(--bs-success)');
            bootstrap.Modal.getInstance(form.closest('.modal'))?.hide();
            fetchReviewData(currentReviewPage);
        }
    } catch (error) {
        playBeep('error');
        const errorMessage = error.message || 'An unexpected error occurred.';
        
        if (errorMessage.includes("ใบโอนย้ายนี้ถูกประมวลผลไปแล้ว") || errorMessage === 'SCAN_ALREADY_USED') {
            
            const transferId = document.getElementById('entry_transfer_uuid')?.value;
            const lotNo = document.getElementById('entry_lot_no')?.value;
            
            if (transferId || lotNo) {
                if(g_TransferId_NEW) {
                    autoFillFromTransferOrder(g_TransferId_NEW);
                } else if (g_AutoFillData_OLD) {
                    autoFillForm_OLD(g_AutoFillData_OLD);
                }
            }
        } else if (errorMessage.includes('วัตถุดิบในจุดจัดเก็บ')) {
            const errorHtml = errorMessage.replace(/\n/g, '<br>');
            Swal.fire({
                title: '<i class="fas fa-exclamation-triangle text-warning"></i> วัตถุดิบไม่พอผลิต!',
                html: `
                    <div class="text-start alert alert-warning border-warning mt-3" style="font-size: 0.95rem; max-height: 250px; overflow-y: auto;">
                        ${errorHtml}
                    </div>
                    <div class="small text-muted mt-2">
                        <i class="fas fa-info-circle"></i> กรุณาเบิกของเข้าไลน์ให้ครบก่อนกดผลิต
                    </div>
                `,
                icon: 'warning',
                confirmButtonColor: '#d33',
                confirmButtonText: 'รับทราบ',
                allowOutsideClick: false
            }).then(() => {
                const qtyInput = document.querySelector('input[name="quantity_fg"]');
                if(qtyInput) qtyInput.select();
            });

        } else {
            Swal.fire({
                title: 'ข้อผิดพลาด',
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

async function editTransaction(transactionId, type) {
    showSpinner();
    try {
        const result = await sendRequest(INVENTORY_API_URL, 'get_transaction_details', 'GET', null, { transaction_id: transactionId });
        if (!result.success) throw new Error(result.message);
        
        const data = result.data;
        let modalId, modal, deleteBtn, saveBtn;

        if (type === 'receipt') {
            modalId = 'editEntryModal';
            modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId));
            
            deleteBtn = document.getElementById('deleteEntryFromModalBtn');
            saveBtn = modal._element.querySelector('button[type="submit"]');

            document.getElementById('edit_entry_transaction_id').value = data.transaction_id;
            document.getElementById('edit_entry_item_display').value = `${data.sap_no} | ${data.part_no}`;
            
            document.getElementById('edit_entry_from_location_id').value = data.from_location_id || "";
            document.getElementById('edit_entry_to_location_id').value = data.to_location_id;
            
            document.getElementById('edit_entry_quantity').value = Math.floor(data.quantity);
            document.getElementById('edit_entry_lot_no').value = data.reference_id;
            document.getElementById('edit_entry_notes').value = data.notes;
            if (data.transaction_timestamp) {
                const [datePart, timePart] = data.transaction_timestamp.split(' ');
                document.getElementById('edit_entry_log_date').value = datePart;
                document.getElementById('edit_entry_log_time').value = timePart ? timePart.substring(0, 8) : '00:00:00';
            }

        } else if (type === 'production') {
            modalId = 'editProductionModal';
            modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId));
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
            
            if (type === 'entry') setEntryModalReadOnly_Mobile(true);

        } else {
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.remove('btn-warning');
            deleteBtn.classList.add('btn-danger');
            deleteBtn.dataset.transferUuid = '';
            if (saveBtn) saveBtn.style.display = 'inline-block'; 
            
            if (type === 'entry') setEntryModalReadOnly_Mobile(false);
        }

        modal.show();
    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

function setEntryModalReadOnly_Mobile(isReadOnly) {
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
            await fetchReviewData(currentReviewPage);
        }
    } finally {
        hideSpinner();
    }
}

async function deleteTransaction(transactionId, successCallback) {
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

// =================================================================
// SECTION: INITIALIZATION (SPA Update)
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    initEntryPage();
    initReviewPage();

    document.getElementById('editEntryForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('editProductionForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
    document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));

    document.getElementById('close-overlay-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('status-overlay');
        if(overlay) overlay.style.display = 'none';
    });
});