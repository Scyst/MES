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

// =================================================================
// SECTION: HELPER FUNCTIONS
// =================================================================
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
        // ตรวจสอบว่า Response เป็น JSON หรือไม่
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             throw new Error("Server returned non-JSON response. Possible PHP Error.");
        }
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.message || 'HTTP error');
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        // แสดง Toast เฉพาะถ้าไม่ใช่การยกเลิกโดยผู้ใช้ (เผื่ออนาคตมี AbortController)
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
// SECTION: DATA ENTRY PAGE LOGIC (mobile_entry.php)
// =================================================================

function initEntryPage() {
    // เริ่มต้นโหลดข้อมูลพื้นฐาน (Items, Locations)
    populateInitialData(); 
    initializeDateTimeFields(); 
    
    const timeInputs = document.querySelectorAll('input[name="log_time"]');
    timeInputs.forEach(input => input.addEventListener('input', applyTimeMask));

    if (g_EntryType === 'production') {
        setupAutocomplete('out_item_search', 'out_item_id');
        document.getElementById('mobileProductionForm')?.addEventListener('submit', handleFormSubmit);
    } else {
        // --- ส่วนของ RECEIPT (IN) ---
        setupAutocomplete('entry_item_search', 'entry_item_id');
        document.getElementById('mobileReceiptForm')?.addEventListener('submit', handleFormSubmit);
        
        // เริ่มระบบสแกน
        initQrScanner(); 

        // ผูกปุ่ม Manual Load
        const manualBtn = document.getElementById('manual_scan_id_btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', handleManualScanLoad);
        }
        
        // บังคับช่องกรอก ID เป็นตัวพิมพ์ใหญ่
        const manualInput = document.getElementById('manual_scan_id_input');
        if(manualInput) {
            manualInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
            // เพิ่มให้กด Enter ได้ด้วย
            manualInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualScanLoad();
                }
            });
        }
    }
}

function handleManualScanLoad() {
    const inputElement = document.getElementById('manual_scan_id_input');
    const scanId = inputElement.value.trim(); 

    if (!scanId) {
        showToast("กรุณากรอก Scan ID", 'var(--bs-warning)');
        inputElement.focus();
        return;
    }

    // สร้าง URL ใหม่เพื่อ Reload
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('scan', scanId); 
    
    // ล้างพารามิเตอร์เก่าที่อาจค้างอยู่
    ['type', 'sap_no', 'lot', 'qty', 'from_loc_id'].forEach(p => currentUrl.searchParams.delete(p));

    showSpinner();
    // Reload หน้าเว็บไปยัง URL ใหม่
    window.location.href = currentUrl.toString();
}

function initializeDateTimeFields() {
    const now = new Date();
    // ปรับเวลาให้เป็น Local Timezone (Asia/Bangkok) แบบง่ายๆ
    const offsetMs = now.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(now.getTime() - offsetMs);
    
    const dateStr = localDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = localDate.toTimeString().substring(0, 8); // HH:MM:SS

    const outLogDate = document.getElementById('out_log_date');
    if (outLogDate) outLogDate.value = dateStr;
    
    const inLogDate = document.getElementById('entry_log_date');
    if (inLogDate) inLogDate.value = dateStr;
    const inLogTime = document.getElementById('entry_log_time');
    if (inLogTime) inLogTime.value = timeStr;
}

async function populateInitialData() {
    // ดึงข้อมูล Items และ Locations
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
    
    if (result.success) {
        allItems = result.items || [];
        allLocations = result.locations || [];
        
        // Debug: เช็คว่ามีข้อมูลมารึเปล่า
        console.log(`Loaded ${allItems.length} items and ${allLocations.length} locations.`);
        
        // Setup Dropdown Locations
        const locationDisplay = document.getElementById('location_display');
        if (locationDisplay) {
            const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
            if (g_LocationId > 0) {
                const foundLocation = allLocations.find(loc => loc.location_id == g_LocationId);
                locationDisplay.innerHTML = `<option value="${g_LocationId}">${foundLocation ? foundLocation.location_name : 'Unknown Location'}</option>`;
            } else {
                locationDisplay.innerHTML = '<option value="">-- เลือกสถานที่ --</option>' + optionsHtml;
            }
        }

        if (g_EntryType === 'receipt') {
            const fromLocationSelect = document.getElementById('entry_from_location_id');
            if (fromLocationSelect) {
                const optionsHtml = allLocations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
                fromLocationSelect.innerHTML = '<option value="">-- เลือกสถานที่ --</option>' + optionsHtml;
                fromLocationSelect.addEventListener('change', updateAvailableStockDisplay);
            }
        }

        // ⭐️ ตรวจสอบและเริ่ม Autofill ⭐️
        console.log("Autofill Data from PHP:", g_AutoFillData);
        if (g_AutoFillData && g_AutoFillData.sap_no) {
            console.log("Starting Autofill process...");
            await autoFillForm(g_AutoFillData);
        }
    }
}

function initQrScanner() {
    const scanBtn = document.getElementById('start-scan-btn');
    const stopBtn = document.getElementById('stop-scan-btn');
    const readerDivId = "qr-reader";

    const onScanSuccess = (decodedText, decodedResult) => {
        console.log(`Scan result: ${decodedText}`);
        stopScanning();
        
        try {
            // ตรวจสอบว่าเป็น URL ที่มีพารามิเตอร์ ?scan= หรือไม่
            let scanId = null;
            try {
                const scannedUrl = new URL(decodedText);
                scanId = scannedUrl.searchParams.get('scan');
            } catch (e) {
                // ถ้าไม่ใช่ URL อาจจะเป็น Plain Text รหัสโค้ดเลยก็ได้ (เผื่อไว้)
                if (decodedText.length >= 6 && decodedText.length <= 20 && /^[A-Z0-9]+$/i.test(decodedText)) {
                    scanId = decodedText;
                }
            }

            if (scanId) {
                // ถ้าเจอ Scan ID ให้ Reload หน้าเว็บเหมือนการกรอก Manual
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('scan', scanId);
                ['type', 'sap_no', 'lot', 'qty', 'from_loc_id'].forEach(p => currentUrl.searchParams.delete(p));
                
                showSpinner();
                window.location.href = currentUrl.toString();
            } else {
                throw new Error("QR Code ไม่ถูกต้อง (ไม่พบ Scan ID)");
            }

        } catch (e) {
            console.error(e);
            showToast(e.message, 'var(--bs-danger)');
        }
    };
    
    const stopScanning = () => {
        if (html5QrCodeScanner) {
            html5QrCodeScanner.clear().then(_ => {
                document.getElementById('qr-reader-container').style.display = 'none';
                html5QrCodeScanner = null;
            }).catch(err => console.warn("Scanner clear failed", err));
        }
    };

    scanBtn?.addEventListener('click', () => {
        if (html5QrCodeScanner) return;
        document.getElementById('qr-reader-container').style.display = 'block';
        html5QrCodeScanner = new Html5QrcodeScanner(readerDivId, { fps: 10, qrbox: { width: 250, height: 250 } }, false);
        html5QrCodeScanner.render(onScanSuccess, (err) => { /* ignore failures */ });
    });

    stopBtn?.addEventListener('click', stopScanning);
}

async function autoFillForm(data) {
    // 1. ตรวจสอบข้อมูลเบื้องต้น
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

        // 3. แยกการทำงานตามสถานะ
        if (result.status === 'received') {
            // === กรณี ก.: รับไปแล้ว (แสดง Overlay) ===
            const details = result.details;
            
            // แปลงวันที่เป็นรูปแบบ DD/MM/YYYY (แบบสากล)
            const receivedDate = new Date(details.transaction_timestamp);
            const dateStr = receivedDate.toLocaleDateString('en-GB'); // เช่น 07/11/2025
            const timeStr = receivedDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // เช่น 16:05

            // แสดงข้อความ: ใครรับ, เมื่อไหร่
            document.getElementById('status-details').innerHTML = 
                `รับเข้าแล้วโดย: <strong class="text-warning">${details.username || 'Unknown User'}</strong><br>
                 เมื่อ: <strong>${dateStr} @ ${timeStr}</strong>`;
            document.getElementById('status-overlay').style.display = 'flex';

        } else {
            // === กรณี ข.: ยังไม่เคยรับ (กรอกฟอร์ม) ===
            const item = allItems.find(i => i.sap_no.toLowerCase() === data.sap_no.toLowerCase().trim());
            
            if (item) {
                selectedItem = item;
                document.getElementById('entry_item_search').value = `${item.sap_no} | ${item.part_no}`;
                document.getElementById('entry_item_id').value = item.item_id;
            } else {
                showToast(`ไม่พบชิ้นส่วน SAP No: ${data.sap_no}`, 'var(--bs-warning)');
            }

            if (data.lot) document.getElementById('entry_lot_no').value = data.lot;
            if (data.qty) document.getElementById('entry_quantity_in').value = data.qty;
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
        const qty = parseFloat(result.quantity);
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
        ).slice(0, 15); // แสดงสูงสุด 15 รายการ

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

    // ซ่อนเมื่อคลิกที่อื่น
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsWrapper.contains(e.target)) {
            resultsWrapper.style.display = 'none';
        }
    });
}

// =================================================================
// SECTION: REVIEW PAGE LOGIC (mobile_review.php)
// =================================================================

function initReviewPage() {
    // (ใช้ populateInitialData เพื่อโหลด Location มาใส่ใน Dropdown ของ Modal แก้ไข ถ้ามี)
    // populateInitialData(); --> อาจจะไม่จำเป็นในหน้านี้ถ้าไม่ได้ใช้ Dropdown แบบเต็ม
    
    const btnOut = document.getElementById('btn-load-out');
    const btnIn = document.getElementById('btn-load-in');
    
    btnOut?.addEventListener('click', () => {
        currentReviewType = 'production';
        btnOut.classList.add('active');
        btnIn.classList.remove('active');
        fetchReviewData();
    });
    btnIn?.addEventListener('click', () => {
        currentReviewType = 'receipt';
        btnIn.classList.add('active');
        btnOut.classList.remove('active');
        fetchReviewData();
    });

    document.getElementById('review-list-container')?.addEventListener('click', (event) => {
        const card = event.target.closest('.review-card');
        if (card && card.dataset.transactionId) {
            editTransaction(card.dataset.transactionId, card.dataset.type);
        }
    });

    fetchReviewData();
}

async function fetchReviewData(page = 1) {
    currentReviewPage = page;
    showSpinner();
    
    const action = (currentReviewType === 'production') ? 'get_production_history' : 'get_receipt_history';
    const params = {
        page: page,
        limit: 25,
        user_filter: currentUser.username // กรองเฉพาะ User ปัจจุบัน
    };

    const result = await sendRequest(INVENTORY_API_URL, action, 'GET', null, params);
    const container = document.getElementById('review-list-container');
    
    if (result.success && result.data && result.data.length > 0) {
        renderReviewCards(result.data, currentReviewType);
    } else {
        container.innerHTML = `<div class="alert alert-warning text-center mt-3">ไม่พบประวัติการบันทึก</div>`;
    }
    hideSpinner();
}

function renderReviewCards(data, type) {
    const container = document.getElementById('review-list-container');
    container.innerHTML = '';
    
    data.forEach(row => {
        const card = document.createElement('div');
        card.className = 'review-card';
        card.dataset.transactionId = row.transaction_id;
        card.dataset.type = type;

        const dateObj = new Date(row.transaction_timestamp);
        // ปรับเวลาให้เป็น Local Time แบบอ่านง่าย
        const dateStr = dateObj.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
        const timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        let header, body;
        if (type === 'production') {
            header = `<span class="text-primary fw-bold">${row.count_type}</span> <span class="float-end fw-bold">${parseFloat(row.quantity).toLocaleString()}</span>`;
            body = `<div class="text-white">${row.part_no}</div>
                    <small class="text-muted">Loc: ${row.location_name} | Lot: ${row.lot_no || '-'}</small>`;
        } else {
            header = `<span class="text-success fw-bold">IN</span> <span class="float-end fw-bold">+${parseFloat(row.quantity).toLocaleString()}</span>`;
            body = `<div class="text-white">${row.part_no}</div>
                    <small class="text-muted">To: ${row.destination_location} | From: ${row.source_location || 'Ext.'}</small>`;
        }

        card.innerHTML = `
            <div class="card-header d-flex justify-content-between align-items-center">${header}</div>
            <div class="card-body py-2">${body}</div>
            <div class="card-footer text-end text-muted py-1" style="font-size: 0.8rem;">
                ${dateStr} ${timeStr}
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
    showSpinner();

    try {
        // --- กรณี ADD (Production/Receipt) ---
        if (action === 'addPart' || action === 'addEntry') {
            // 1. ตรวจสอบ Location
            let locationId = g_LocationId;
            if (locationId <= 0) { // Manual Mode
                locationId = document.getElementById('location_display').value;
            }
            if (!locationId) throw new Error("กรุณาเลือก Location");

            // 2. เตรียมข้อมูลพื้นฐาน
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            if (action === 'addPart') {
                // จัดการ Time Slot ของ Production
                const timeSlot = formData.get('time_slot');
                if (!timeSlot || !timeSlot.includes('|')) throw new Error("ช่วงเวลาไม่ถูกต้อง");
                const [startTime, endTime] = timeSlot.split('|');

                // เตรียมข้อมูลสำหรับส่ง (Base Data)
                const baseData = {
                    item_id: data.item_id,
                    location_id: locationId,
                    lot_no: data.lot_no,
                    log_date: data.log_date,
                    start_time: startTime,
                    end_time: endTime,
                    notes: data.notes
                };

                // รวบรวมยอด FG/HOLD/SCRAP
                const transactions = [];
                if (data.quantity_fg > 0) transactions.push({ ...baseData, quantity: data.quantity_fg, count_type: 'FG' });
                if (data.quantity_hold > 0) transactions.push({ ...baseData, quantity: data.quantity_hold, count_type: 'HOLD' });
                if (data.quantity_scrap > 0) transactions.push({ ...baseData, quantity: data.quantity_scrap, count_type: 'SCRAP' });

                if (transactions.length === 0) throw new Error("กรุณากรอกจำนวนอย่างน้อย 1 ประเภท");

                // ส่งข้อมูลทีละรายการ
                for (const trans of transactions) {
                    const res = await sendRequest(INVENTORY_API_URL, 'execute_production', 'POST', trans);
                    if (!res.success) throw new Error(res.message);
                }

            } else {
                // จัดการ Receipt (IN)
                data.to_location_id = locationId; // บังคับใช้ Location ที่เลือก
                const res = await sendRequest(INVENTORY_API_URL, 'execute_receipt', 'POST', data);
                if (!res.success) throw new Error(res.message);
            }

            // สำเร็จ: ล้างฟอร์มและแจ้งเตือน
            showToast("บันทึกสำเร็จ", 'var(--bs-success)');
            form.reset();
            initializeDateTimeFields();
            // ล้างค่าที่เลือกค้างไว้
            selectedItem = null;
            document.getElementById(action === 'addPart' ? 'out_item_id' : 'entry_item_id').value = '';
            if (g_LocationId <= 0) document.getElementById('location_display').value = '';
            if (action === 'addEntry') updateAvailableStockDisplay();

        } 
        // --- กรณี EDIT (จากหน้า Review) ---
        else if (action === 'editEntry' || action === 'editProduction') {
            const formData = new FormData(form);
            const res = await sendRequest(INVENTORY_API_URL, 'update_transaction', 'POST', Object.fromEntries(formData));
            if (!res.success) throw new Error(res.message);

            showToast("แก้ไขสำเร็จ", 'var(--bs-success)');
            bootstrap.Modal.getInstance(form.closest('.modal'))?.hide();
            fetchReviewData(currentReviewPage);
        }
        hideSpinner();
    } catch (error) {
        if (error.message === 'SCAN_ALREADY_USED') {
            hideSpinner();
            const currentData = {
               sap_no: selectedItem ? selectedItem.sap_no : '',
               lot: document.getElementById('entry_lot_no').value
            };
            autoFillForm(currentData);
        } else {
            hideSpinner();
            showToast(error.message, 'var(--bs-danger)');
        }
    }
}

async function editTransaction(transactionId, type) {
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

function handleDeleteFromModal(type) {
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
// SECTION: INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('review-container')) {
        initReviewPage();
        // ผูก Event สำหรับ Modal แก้ไข/ลบ ในหน้า Review (ถ้ามี)
        document.getElementById('editEntryForm')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('editProductionForm')?.addEventListener('submit', handleFormSubmit);
        document.getElementById('deleteEntryFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('entry'));
        document.getElementById('deleteProductionFromModalBtn')?.addEventListener('click', () => handleDeleteFromModal('production'));
    } else if (document.getElementById('entry-container')) {
        initEntryPage();
    }

    document.getElementById('close-overlay-btn')?.addEventListener('click', () => {
        document.getElementById('status-overlay').style.display = 'none';
    });
});