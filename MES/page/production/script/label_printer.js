"use strict";

// =================================================================
// SECTION: GLOBAL STATE
// =================================================================
let allItems = [];
let allLocations = [];
let selectedItem = null; 

const TRANSFER_API_URL = 'api/transferManage.php';

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

async function handleGenerateLabel(event) {
    event.preventDefault();
    
    const fromLocationId = document.getElementById('from_location_id').value;
    const toLocationId = document.getElementById('to_location_id').value;
    const fromLocationInfo = allLocations.find(l => l.location_id == fromLocationId);
    
    const qty = document.getElementById('quantity').value;
    const printCount = document.getElementById('print_count').value;
    const notes = document.getElementById('notes').value;
    const date = new Date();
    const printTime = date.toLocaleString('en-GB');
    const manualLot = document.getElementById('lot_no').value.trim();

    if (!selectedItem || !fromLocationId || !toLocationId || !qty || !manualLot || !printCount) {
        showToast("กรุณากรอกข้อมูลให้ครบถ้วน", 'var(--bs-danger)');
        return;
    }
    if (fromLocationId === toLocationId) {
        showToast("คลังต้นทางและปลายทางห้ามซ้ำกัน", 'var(--bs-warning)');
        return;
    }
    if (printCount > 500) {
        showToast("เพื่อป้องกันระบบค้าง อนุญาตให้ปริ้นสูงสุด 500 ดวงต่อครั้ง", 'var(--bs-warning)');
        return;
    }

    // Operator Proofing: กันกดย้ำ
    const btn = document.getElementById('generate-label-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Batch...';
    showSpinner();
    
    try {
        const transferData = {
            parent_lot: manualLot,
            print_count: printCount,
            item_id: selectedItem.item_id,
            quantity: qty,
            from_loc_id: fromLocationId,
            to_loc_id: toLocationId,
            notes: notes
        };
        
        // ยิง Request สร้าง Batch ครั้งเดียว
        const result = await sendRequest(TRANSFER_API_URL, 'create_batch_transfer_orders', 'POST', transferData);
        
        if (!result.success) throw new Error(result.message || "Failed to create transfer orders.");

        const baseUrl = window.location.href.replace('label_printer.php', 'mobile_entry.php');
        const labelsToPrint = result.labels.map(label => ({
            sap_no: selectedItem.sap_no,
            part_no: selectedItem.part_no,
            description: selectedItem.part_description || '',
            quantity: qty,
            manual_lot: manualLot,
            serial_no: label.serial_no,
            location_name: fromLocationInfo.location_name,
            print_time: printTime,
            notes: notes,
            scan_id_display: label.transfer_uuid,
            qr_url: `${baseUrl}?type=receipt&transfer_id=${label.transfer_uuid}`
        }));

        showToast(result.message, 'var(--bs-success)');
        openPrintWindow(labelsToPrint);

    } catch (error) {
        showToast(error.message, 'var(--bs-danger)');
    } finally {
        hideSpinner();
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function openPrintWindow(labelsArray) {
    // 1. คำนวณขนาดหน้าจอของ Operator และตั้งค่าให้ Popup ใหญ่ 90% ของจอ พร้อมจัดกึ่งกลาง
    const screenWidth = window.screen.availWidth;
    const screenHeight = window.screen.availHeight;
    const popWidth = Math.round(screenWidth * 0.9);
    const popHeight = Math.round(screenHeight * 0.9);
    const popLeft = Math.round((screenWidth - popWidth) / 2);
    const popTop = Math.round((screenHeight - popHeight) / 2);

    // 2. เปิดหน้าต่างด้วยขนาดที่คำนวณได้
    const newWin = window.open(
        "", 
        "Print_Label_Batch", 
        `width=${popWidth},height=${popHeight},top=${popTop},left=${popLeft},resizable=yes,scrollbars=yes`
    );
    
    if (!newWin) {
        showToast("กรุณาอนุญาต Pop-up (Allow Pop-ups) สำหรับเว็บไซต์นี้", 'var(--bs-warning)');
        return;
    }
    
    newWin.document.write('<html><head><title>Print Labels Batch</title>');
    
    // CSS สำหรับการปริ้นสติ้กเกอร์ (Page Break สำหรับ Thermal Printer)
    newWin.document.write(`
        <style>
            @media print {
                @page { size: 100mm 50mm; margin: 0 !important; }
                body, html { margin: 0 !important; padding: 0 !important; width: 100mm !important; }
                .label-page { 
                    page-break-after: always; 
                    height: 50mm !important;
                }
                .label-box { border: none !important; }
            }
            body { margin: 0; font-family: sans-serif; background-color: #f0f0f0; }
            .label-page {
                width: 100mm; height: 50mm;
                margin: 0 auto; margin-bottom: 10px;
                background-color: white;
                box-sizing: border-box; display: flex; align-items: center; justify-content: center;
            }
            .label-box {
                width: 100%; height: 100%;
                border: 1px dashed #999; 
                padding: 3mm; box-sizing: border-box;
                display: flex; flex-direction: row; justify-content: space-between; overflow: hidden;
            }
            .label-left {
                width: 60%; font-size: 10pt; line-height: 1.4; word-wrap: break-word; 
                display: flex; flex-direction: column; justify-content: flex-start;
            }
            .label-left strong { font-size: 11pt; }
            .label-left .desc { font-size: 9pt; font-style: italic; max-height: 25px; overflow: hidden; }
            .label-left .lot-group { margin-top: auto; }
            .label-left .lot-parent { font-size: 14pt; font-weight: bold; }
            .label-left .lot-serial { font-size: 10pt; font-weight: bold; color: #333; margin-left: 5px; }
            .label-right {
                width: 38%; display: flex; flex-direction: column; align-items: center; justify-content: center;
                border-left: 1px dashed #ccc; padding-left: 2mm;
            }
            .qr-img { width: 35mm; height: 35mm; }
            .qr-qty { font-size: 16pt; font-weight: bold; margin-top: 1mm; }
        </style>
    `);
    
    // เรียก Local qrcode.js (อย่าลืมเช็ค Path ให้ตรงกับ Environment ของคุณ)
    newWin.document.write('<script src="../../utils/libs/qrcode.min.js"><\/script>');
    newWin.document.write('</head><body>');
    
    let qrRenderJobs = [];

    // วน Loop สร้าง HTML ทีละหน้า
    labelsArray.forEach((data, index) => {
        const qrId = `qr-${index}`;
        qrRenderJobs.push({ id: qrId, url: data.qr_url });

        newWin.document.write(`
            <div class="label-page">
                <div class="label-box">
                    <div class="label-left">
                        <div><strong>Part:</strong> ${data.part_no}</div>
                        <div><strong>SAP:</strong> ${data.sap_no}</div>
                        <div class="desc">${data.description}</div>
                        <div><strong>Loc:</strong> ${data.location_name}</div>
                        <div class="lot-group">
                            <span class="lot-parent">${data.manual_lot}</span>
                            <span class="lot-serial">${data.serial_no}</span>
                        </div>
                    </div>
                    <div class="label-right">
                        <div id="${qrId}" class="qr-img"></div>
                        <div class="qr-qty">${data.quantity} PCS</div>
                        <div style="font-size: 8pt; margin-top: 1mm; font-family: monospace;">${data.scan_id_display}</div>
                    </div>
                </div>
            </div>
        `);
    });

    // Script ฝั่ง Print Window
    newWin.document.write(`
        <script>
            window.onload = function() {
                try {
                    const jobs = ${JSON.stringify(qrRenderJobs)};
                    
                    // Render QR ทีละรูป
                    jobs.forEach(job => {
                        new QRCode(document.getElementById(job.id), {
                            text: job.url,
                            width: 132,
                            height: 132,
                            correctLevel: QRCode.CorrectLevel.M
                        });
                    });

                    // หน่วงเวลาให้ Browser เรนเดอร์ QR เสร็จแล้วค่อยสั่งปริ้น (ถ้าจำนวนเยอะต้องหน่วง)
                    setTimeout(function() {
                        window.print();
                        window.close(); 
                    }, 1000); 

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