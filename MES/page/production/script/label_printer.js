"use strict";

// =================================================================
// SECTION: GLOBAL STATE
// =================================================================
let allItems = [];
let allLocations = [];
let selectedItem = null; 

// 🔽🔽🔽 [เพิ่ม] 1. กำหนด API Endpoint ใหม่ 🔽🔽🔽
const TRANSFER_API_URL = 'api/transferManage.php';
// (INVENTORY_API_URL ยังคงใช้สำหรับ 'get_initial_data' และ 'get_next_serial')
// =================================================================

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
    // ... (โค้ดส่วนนี้เหมือนเดิม 100% ไม่ต้องแก้ไข) ...
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

// 🔽🔽🔽 [แก้ไข] 2. แก้ไขฟังก์ชันนี้ให้รองรับ Dropdown 2 ตัว 🔽🔽🔽
async function populateInitialData() {
    const result = await sendRequest(INVENTORY_API_URL, 'get_initial_data', 'GET');
     if (result.success) {
        allItems = result.items;
        allLocations = result.locations;
        
        // (อ้างอิง ID ใหม่ที่เราจะสร้างใน .php)
        const fromLocationSelect = document.getElementById('from_location_id'); 
        const toLocationSelect = document.getElementById('to_location_id');

        const optionsHtml = result.locations.map(loc => `<option value="${loc.location_id}">${loc.location_name}</option>`).join('');
        
        if (fromLocationSelect) {
            fromLocationSelect.innerHTML = '<option value="">-- เลือกคลังต้นทาง --</option>' + optionsHtml;
        }
        if (toLocationSelect) {
            toLocationSelect.innerHTML = '<option value="">-- เลือกไลน์ปลายทาง --</option>' + optionsHtml;
        }
    }
}
// =================================================================

// =================================================================
// SECTION: LABEL PRINTING LOGIC (ฉบับอัปเกรด)
// =================================================================

// 🔽🔽🔽 [แก้ไข] 3. แก้ไขฟังก์ชันนี้ทั้งหมด 🔽🔽🔽
async function handleGenerateLabel(event) {
    event.preventDefault();
    
    // 1. --- รวบรวมข้อมูล (จากฟอร์มที่แก้ไขใหม่) ---
    const fromLocationId = document.getElementById('from_location_id').value;
    const toLocationId = document.getElementById('to_location_id').value;
    const fromLocationInfo = allLocations.find(l => l.location_id == fromLocationId);
    
    const qty = document.getElementById('quantity').value;
    const notes = document.getElementById('notes').value;
    const date = new Date();
    const printTime = date.toLocaleString('en-GB');
    const manualLot = document.getElementById('lot_no').value;

    // 2. --- ตรวจสอบข้อมูล (อัปเดตใหม่) ---
    if (!selectedItem || !fromLocationId || !toLocationId || !qty || !manualLot) {
        showToast("กรุณากรอกข้อมูล: Part, ต้นทาง, ปลายทาง, Lot, และจำนวน", 'var(--bs-danger)');
        return;
    }
    if (fromLocationId === toLocationId) {
        showToast("คลังต้นทางและปลายทางห้ามซ้ำกัน", 'var(--bs-warning)');
        return;
    }

    showSpinner();
    try {
        // 3. --- ร้องขอ Serial Number (เหมือนเดิม) ---
        const serialResult = await sendRequest(INVENTORY_API_URL, 'get_next_serial', 'POST', {
            parent_lot: manualLot 
        });
        if (!serialResult.success) {
            throw new Error(serialResult.message || "Failed to get new serial number.");
        }
        
        const newSerial = serialResult.new_serial_number;
        const serialSuffix = `-${String(newSerial).padStart(3, '0')}`;
        const uniqueLotID = `${manualLot}${serialSuffix}`; // (นี่คือ ID ที่เราจะใช้เป็น "UUID")

        // 4. --- (ใหม่) สร้างใบโอนย้าย (Transfer Order) สถานะ PENDING ---
        const transferData = {
            transfer_uuid: uniqueLotID, // ⭐️ ส่ง ID ที่เราสร้างเองไปให้ API
            item_id: selectedItem.item_id,
            quantity: qty,
            from_loc_id: fromLocationId,
            to_loc_id: toLocationId,
            notes: notes
        };
        
        // ⭐️ เรียก API ใหม่ (transferManage.php) และ Action ใหม่
        const transferResult = await sendRequest(TRANSFER_API_URL, 'create_transfer_order', 'POST', transferData);
        
        if (!transferResult.success) {
            throw new Error(transferResult.message || "Failed to create transfer order record.");
        }

        const transfer_uuid = transferResult.transfer_uuid; // (API จะส่ง ID ที่เราส่งไปกลับมา)

        // 5. --- (ใหม่) สร้าง URL สำหรับ QR Code ---
        // ⭐️ ลิงก์ไปยัง mobile_entry.php โหมด receipt และส่ง transfer_id
        const baseUrl = window.location.href.replace('label_printer.php', 'mobile_entry.php');
        const qrDataURL = `${baseUrl}?type=receipt&transfer_id=${transfer_uuid}`;

        // 6. --- สร้าง Data (Human-Readable) ---
        const labelData = {
            sap_no: selectedItem.sap_no,
            part_no: selectedItem.part_no,
            description: selectedItem.part_description || '',
            quantity: qty,
            manual_lot: manualLot,
            serial_no: serialSuffix,
            location_name: fromLocationInfo.location_name, // ⭐️ แสดงคลังต้นทาง
            // count_type: type, // (ลบออก)
            print_time: printTime,
            notes: notes,
            scan_id_display: transfer_uuid // ⭐️ แสดง ID ใบโอน (UUID)
        };

        // 7. --- ส่งไปพิมพ์ (เหมือนเดิม) ---
        openPrintWindow(labelData, qrDataURL);

    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
    }
}

/**
 * (หน้าต่างพิมพ์: ไม่ต้องแก้ไข)
 * (โค้ดส่วนนี้เหมือนเดิม 100% ครับ)
 */
function openPrintWindow(data, qrDataURL) {
    // ... (โค้ดส่วนนี้เหมือนเดิม 100% ไม่ต้องแก้ไข) ...
    const newWin = window.open("", "Print Label", "width=500,height=300");
    if (!newWin) {
        alert("Please allow popups for this site to generate the print page.");
        return;
    }
    
    newWin.document.write('<html><head><title>Print Label</title>');
    
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
    
    newWin.document.write(`
        <div class="label-box">
            <div class="label-left">
                <div><strong>Part:</strong> ${data.part_no} (${data.sap_no})</div>
                <div class="desc">${data.description}</div>
                <div><strong>Loc:</strong> ${data.location_name}</div>
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

    newWin.document.write(`
        <script>
            window.onload = function() {
                try {
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
    
    newWin.document.write('</body></html>');
    newWin.document.close();
}

// =================================================================
// SECTION: INITIALIZATION
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // ... (โค้ดส่วนนี้เหมือนเดิม 100% ไม่ต้องแก้ไข) ...
    if (document.getElementById('printer-container')) {
        populateInitialData();
        setupAutocomplete('item_search', 'item_id');
        document.getElementById('label-generator-form').addEventListener('submit', handleGenerateLabel);
    }
});