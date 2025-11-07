"use strict";

// =================================================================
// SECTION: GLOBAL STATE
// =================================================================
let allItems = [];
let allLocations = [];
let selectedItem = null; 

// =================================================================
// SECTION: CORE & UTILITY
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
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'HTTP error');
        return result;
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        showToast(error.message || 'An unexpected error occurred.', 'var(--bs-danger)');
        return { success: false, message: "Network or server error." };
    }
}

function setupAutocomplete(inputId, hiddenId) {
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
            });
            resultsWrapper.appendChild(resultItem);
        });
        resultsWrapper.style.display = filteredItems.length > 0 ? 'block' : 'none';
    });
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) resultsWrapper.style.display = 'none';
    });
}

async function populateInitialData() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
     if (result.success) {
        allItems = result.items;
        allLocations = result.locations;
        const locationSelect = document.getElementById('location_id');
        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
        locationSelect.innerHTML = '<option value="">-- Select Location --</option>' + optionsHtml;
    }
}

// =================================================================
// SECTION: LABEL PRINTING LOGIC (ฉบับไฮบริด)
// =================================================================

async function handleGenerateLabel(event) {
    event.preventDefault();
    
    // 1. --- รวบรวมข้อมูล (เหมือนเดิม) ---
    const locationId = document.getElementById('location_id').value;
    const locationInfo = allLocations.find(l => l.location_id == locationId);
    const qty = document.getElementById('quantity').value;
    const type = document.getElementById('count_type').value;
    const notes = document.getElementById('notes').value;
    const date = new Date();
    const printTime = date.toLocaleString('en-GB');
    const manualLot = document.getElementById('lot_no').value;

    // 2. --- ตรวจสอบข้อมูล (เหมือนเดิม) ---
    if (!selectedItem || !locationId || !qty || !manualLot) {
        showToast("Please fill in all required fields: Part, Location, Lot, and Quantity.", 'var(--bs-danger)');
        return;
    }

    showSpinner();
    try {
        // 3. --- (แก้ไข) ร้องขอ Serial Number (เหมือนเดิม) ---
        const serialResult = await sendRequest(INVENTORY_API_URL, 'get_next_serial', 'POST', {
            parent_lot: manualLot 
        });
        if (!serialResult.success) {
            throw new Error(serialResult.message || "Failed to get new serial number.");
        }
        
        const newSerial = serialResult.new_serial_number;
        const serialSuffix = `-${String(newSerial).padStart(3, '0')}`;
        const uniqueLotID = `${manualLot}${serialSuffix}`;

        // 4. --- (ใหม่) ส่งข้อมูลไป "ฝาก" ที่ Backend ---
        const jobData = {
            sap_no: selectedItem.sap_no,
            lot: uniqueLotID,
            qty: qty,
            from_loc_id: locationId
        };
        
        const jobResult = await sendRequest(INVENTORY_API_URL, 'create_scan_job', 'POST', jobData);
        console.log('Job Create Result:', jobResult);
        if (!jobResult.success || !jobResult.scan_id) {
            throw new Error(jobResult.message || "Failed to create scan job.");
        }

        const scanId = jobResult.scan_id; // (เช่น "A7B9C1")
        console.log('Generated Scan ID:', scanId);

        // 5. --- (ใหม่) สร้าง URL สำหรับ QR Code (แบบสั้น) ---
        const baseUrl = window.location.href.replace('label_printer.php', 'mobile_entry.php');
        const qrDataURL = `${baseUrl}?scan=${scanId}`; // ⭐️ URL สั้นและโปร่งมาก ⭐️

        // 6. --- สร้าง Data (Human-Readable) (เหมือนเดิม) ---
        const labelData = {
            sap_no: selectedItem.sap_no,
            part_no: selectedItem.part_no,
            description: selectedItem.part_description || '',
            quantity: qty,
            manual_lot: manualLot,
            serial_no: serialSuffix,
            location_name: locationInfo.location_name,
            count_type: type,
            print_time: printTime,
            notes: notes,
            scan_id_display: scanId // ⭐️ (ใหม่) เพิ่มรหัสสั้นๆ ไปพิมพ์บน Label ด้วย
        };

        // 7. --- ส่งไปพิมพ์ ---
        openPrintWindow(labelData, qrDataURL);

    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

/**
 * (หน้าต่างพิมพ์: อัปเดตสำหรับ 4x2 แนวนอน)
 * (ฉบับแก้ไข: Bug 'appendChild of null' และ 'SyntaxError')
 */
function openPrintWindow(data, qrDataURL) {
    const newWin = window.open("", "Print Label", "width=500,height=300");
    if (!newWin) {
        alert("Please allow popups for this site to generate the print page.");
        return;
    }
    
    newWin.document.write('<html><head><title>Print Label</title>');
    
    // (CSS ... เหมือนเดิม)
    newWin.document.write(`
        <style>
            @media print {
                @page { size: 100mm 50mm; margin: 0 !important; }
                body, html { margin: 0 !important; padding: 0 !important; width: 100mm !important; height: 50mm !important; }
            }
            body { margin: 0; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .label-box {
                width: 100mm; height: 50mm;
                border: 1px dashed #999;
                padding: 3mm; box-sizing: border-box;
                page-break-inside: avoid;
                display: flex; flex-direction: row; 
                justify-content: space-between; overflow: hidden;
            }
            .label-left {
                width: 60%; font-size: 10pt; line-height: 1.4;
                word-wrap: break-word; display: flex; flex-direction: column;
            }
            .label-left strong { font-size: 11pt; }
            .label-left .desc { font-size: 9pt; font-style: italic; }
            .label-left .lot-group { margin-top: auto; }
            .label-left .lot-parent { font-size: 14pt; font-weight: bold; }
            .label-left .lot-serial { font-size: 10pt; font-weight: bold; color: #333; margin-left: 5px; }
            .label-right {
                width: 38%; display: flex; flex-direction: column;
                align-items: center; justify-content: center;
                border-left: 1px dashed #ccc; padding-left: 2mm;
            }
            .qr-img { width: 35mm; height: 35mm; }
            .qr-qty { font-size: 18pt; font-weight: bold; margin-top: 2mm; }
        </style>
    `);
    
    newWin.document.write('<script src="../../utils/libs/qrcode.min.js"><\/script>');
    newWin.document.write('</head><body>');
    
    // (HTML Layout ... เหมือนเดิม)
    newWin.document.write(`
        <div class="label-box">
            <div class="label-left">
                <div><strong>Part:</strong> ${data.part_no} (${data.sap_no})</div>
                <div class="desc">${data.description}</div>
                <div><strong>Loc:</strong> ${data.location_name} (${data.count_type})</div>
                <div><strong>Note:</strong> ${data.notes || '-'}</div>
                <div class="lot-group">
                    <span class="lot-parent">${data.manual_lot}</span>
                    <span class="lot-serial">${data.serial_no}</span>
                </div>
            </div>
            <div class="label-right">
                <div id="qr-placeholder" class="qr-img"></div>
                <div class="qr-qty">${data.quantity} PCS</div>
                <div style="font-size: 8pt; margin-top: 1mm; font-family: monospace;">ID: ${data.scan_id_display}</div>
            </div>
        </div>
    `);

    // === ⭐️ โค้ดที่แก้ไข (วิธีที่ปลอดภัย) ⭐️ ===
    
    // 1. เราจะ "เขียน" <script> ลงไปใน HTML โดยตรง
    // 2. (สำคัญ) เราจะใช้ JSON.stringify(qrDataURL) เพื่อแปลง URL (เช่น http://...) 
    //    ให้เป็น String ของ JavaScript ที่ถูกต้อง (เช่น "http://...")
    //    นี่คือสิ่งที่แก้ Bug "missing ) after argument list" ครับ
    
    newWin.document.write(`
        <script>
            window.onload = function() {
                try {
                    // (JSON.stringify จะเพิ่ม "" ให้อัตโนมัติ)
                    const qrData = ${JSON.stringify(qrDataURL)}; 
                    
                    new QRCode(document.getElementById('qr-placeholder'), {
                        text: qrData,
                        width: 132,
                        height: 132,
                        correctLevel: QRCode.CorrectLevel.M
                    });

                    setTimeout(function() {
                        window.print();
                        window.close(); 
                    }, 500); 

                } catch (e) {
                    alert("Error generating QR codes: " + e.message); 
                }
            };
        </script>
    `);
    
    // 3. (เราไม่ใช้ appendChild แล้ว)
    
    newWin.document.write('</body></html>');
    newWin.document.close();
    // === ⭐️ จบส่วนที่แก้ไข ⭐️ ===
}

// =================================================================
// SECTION: INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('printer-container')) {
        populateInitialData();
        setupAutocomplete('item_search', 'item_id');
        document.getElementById('label-generator-form').addEventListener('submit', handleGenerateLabel);
    }
});