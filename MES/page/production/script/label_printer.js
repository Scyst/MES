"use strict";

// =================================================================
// SECTION: GLOBAL STATE
// =================================================================
let allItems = [];
let allLocations = [];
let selectedItem = null;

// =================================================================
// SECTION: CORE & UTILITY (คัดลอกจาก mobile.js)
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

// (Autocomplete: เหมือนเดิม)
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

// (populateInitialData: เหมือนเดิม)
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
// SECTION: LABEL PRINTING LOGIC
// =================================================================

// (handleGenerateLabel: เหมือนเดิม)
// นี่คือบรรทัด ~146
async function handleGenerateLabel(event) {
    event.preventDefault();
    
    const locationId = document.getElementById('location_id').value;
    const locationInfo = allLocations.find(l => l.location_id == locationId);
    const qty = document.getElementById('quantity').value;
    const lot = document.getElementById('lot_no').value;
    const type = document.getElementById('count_type').value;
    const notes = document.getElementById('notes').value;
    const date = new Date();
    const printTime = date.toLocaleString('en-GB');

    if (!selectedItem || !locationId || !qty || !lot) {
        showToast("Please fill in all required fields: Part, Location, Lot, and Quantity.", 'var(--bs-danger)');
        return;
    }

    // 1. สร้าง URL
    const baseUrl = window.location.href.replace('label_printer.php', 'mobile_entry.php');
    const params = new URLSearchParams({
        type: 'receipt',
        sap_no: selectedItem.sap_no,
        lot: lot,
        qty: qty,
        from_loc_id: locationId 
    });
    
    // (สำคัญ) นี่คือตัวแปรชื่อ 'qrDataURL'
    const qrDataURL = `${baseUrl}?${params.toString()}`;
    
    // 2. สร้างข้อมูลฉลาก
    const labelData = {
        sap_no: selectedItem.sap_no,
        part_no: selectedItem.part_no,
        description: selectedItem.part_description || '',
        quantity: qty,
        lot_no: lot,
        location_name: locationInfo.location_name,
        count_type: type,
        print_time: printTime,
        notes: notes
    };

    // 3. ส่ง 'qrDataURL' (ตัวแปร) เข้าไปในฟังก์ชัน
    openPrintWindow(labelData, qrDataURL);
}


/**
 * (หน้าต่างพิมพ์: แก้ไขแล้ว)
 */
// (สำคัญ) พารามิเตอร์ที่ 2 ต้องชื่อ 'qrStringURL' 
// (หรือชื่ออะไรก็ได้ที่ตรงกับที่ 'handleGenerateLabel' ส่งมา)
// *** เราจะทำให้มันเหมือนกัน 100% เพื่อป้องกันการสับสน ***
function openPrintWindow(data, qrDataURL) { // ⭐️ (แก้ไข) เปลี่ยนชื่อพารามิเตอร์เป็น 'qrDataURL'
    const newWin = window.open("", "Print Label", "width=800,height=600");
    if (!newWin) {
        alert("Please allow popups for this site to generate the print page.");
        return;
    }
    
    newWin.document.write('<html><head><title>Print Label</title>');
    
    // CSS สำหรับฉลาก (ปรับขนาดตามที่คุณต้องการ)
    newWin.document.write(`
        <style>
            @media print {
                body { margin: 0; }
                .label-box { border: 1px solid #000 !important; }
            }
            body { 
                margin: 5mm; 
                font-family: sans-serif; 
            }
            .label-box {
                width: 100mm; /* ความกว้างฉลาก */
                height: 70mm; /* ความสูงฉลาก */
                border: 1px dashed #999;
                padding: 4mm;
                box-sizing: border-box;
                page-break-inside: avoid;
                display: flex; /* ใช้ Flexbox จัดการ layout */
                justify-content: space-between;
                overflow: hidden;
            }
            .label-left {
                width: 65%;
                height: 100%;
                display: flex;
                flex-direction: column;
                font-size: 10pt;
                line-height: 1.4;
            }
            .label-right {
                width: 33%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .label-left strong { font-size: 11pt; }
            .label-left .desc { font-size: 9pt; font-style: italic; }
            .label-left .lot { font-size: 14pt; font-weight: bold; margin-top: auto; }
            
            .qr-img {
                width: 30mm;
                height: 30mm;
            }
            .qr-qty {
                font-size: 16pt;
                font-weight: bold;
                margin-top: 2mm;
            }
        </style>
    `);
    
    // โหลด qrcode.js Library
    newWin.document.write('<script src="../../utils/libs/qrcode.min.js"><\/script>');
    newWin.document.write('</head><body>');
    
    // สร้าง "โครง" HTML (ข้อมูลจากข้อ 2)
    newWin.document.write(`
        <div class="label-box">
            <div class="label-left">
                <div><strong>Part:</strong> ${data.part_no} (${data.sap_no})</div>
                <div class="desc">${data.description}</div>
                <div><strong>Loc:</strong> ${data.location_name} (${data.count_type})</div>
                <div><strong>Note:</strong> ${data.notes || '-'}</div>
                <div class="lot">LOT: ${data.lot_no}</div>
            </div>
            <div class="label-right">
                <div id="qr-placeholder" class="qr-img"></div>
                <div class="qr-qty">${data.quantity} PCS</div>
            </div>
        </div>
        <div style="font-size: 7pt; margin-top: 1mm;">Printed: ${data.print_time} by ${currentUser.username}</div>
    `);

    // (JS Inline: แก้ไขแล้ว)
    // นี่คือบรรทัด ~243
    newWin.document.write(`
        <script>
            window.onload = function() {
                try {
                    const qrData = "${qrDataURL}"; 
                    
                    new QRCode(document.getElementById('qr-placeholder'), {
                        text: qrData,
                        width: 115, // (30mm)
                        height: 115,
                        correctLevel: QRCode.CorrectLevel.M
                    });

                    setTimeout(function() {
                        window.print();
                        window.close(); 
                    }, 500); 

                } catch (e) { alert("Error generating QR codes: " + e.message); }
            };
        <\/script>
    `);
    
    newWin.document.write('</body></html>');
    newWin.document.close();
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