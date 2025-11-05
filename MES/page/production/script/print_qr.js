"use strict";

/**
 * (เหมือนเดิม) ฟังก์ชันสำหรับเรียก API
 * และดึง CSRF Token
 */
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
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.message || 'HTTP error');
        }
        return await response.json();
    } catch (error) {
        console.error(`Request for action '${action}' failed:`, error);
        document.getElementById('location-list-container').innerHTML = 
            `<div class="alert alert-danger">${error.message}</div>`;
        return { success: false };
    }
}

/**
 * ฟังก์ชันใหม่: สร้างรายการ Location พร้อมช่องใส่ตัวเลข
 */
async function fetchAndBuildList() {
    // 1. ดึงข้อมูล Location
    const result = await sendRequest(INVENTORY_API_URL, 'get_locations_for_qr', 'GET');
    const container = document.getElementById('location-list-container');

    if (!result || !result.success || !result.locations) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load locations.</div>`;
        return;
    }

    container.innerHTML = ''; // ล้าง "Loading..."

    // 2. สร้าง List Group ของ Bootstrap
    const listGroup = document.createElement('div');
    listGroup.className = 'list-group list-group-flush';

    // 3. วน Loop สร้างรายการ
    result.locations.forEach(loc => {
        const item = document.createElement('div');
        item.className = 'location-list-item list-group-item';
        
        // เราจะเก็บข้อมูลไว้ใน HTML element
        item.dataset.locationId = loc.location_id;
        item.dataset.locationName = loc.location_name;

        item.innerHTML = `
            <div class="location-name">${loc.location_name}</div>
            <div class="location-inputs">
                <div class="form-group">
                    <label for="qty-in-${loc.location_id}" class="text-success">IN:</label>
                    <input type="number" id="qty-in-${loc.location_id}" class="form-control form-control-sm qty-input" data-type="receipt" min="0" value="0">
                </div>
                <div class="form-group">
                    <label for="qty-out-${loc.location_id}" class="text-primary">OUT:</label>
                    <input type="number" id="qty-out-${loc.location_id}" class="form-control form-control-sm qty-input" data-type="production" min="0" value="0">
                </div>
            </div>
        `;
        listGroup.appendChild(item);
    });
    
    container.appendChild(listGroup);

    // 4. ผูก Event Listener กับปุ่ม "Generate"
    document.getElementById('generate-print-btn').addEventListener('click', handleGeneratePrintPage);
}

/**
 * ฟังก์ชันใหม่: เมื่อกดปุ่ม "Generate"
 */
function handleGeneratePrintPage() {
    const printJob = [];
    const baseUrl = window.location.href.replace('print_location_qr.php', 'mobile_entry.php');

    // 1. รวบรวม "งาน" จากช่อง Input ทั้งหมด
    document.querySelectorAll('.location-list-item').forEach(item => {
        const locId = item.dataset.locationId;
        const locName = item.dataset.locationName;

        const qtyIn = parseInt(item.querySelector('input[data-type="receipt"]').value, 10) || 0;
        const qtyOut = parseInt(item.querySelector('input[data-type="production"]').value, 10) || 0;

        if (qtyIn > 0) {
            printJob.push({
                quantity: qtyIn,
                locationName: locName,
                type: 'IN',
                typeText: 'รับของเข้า (IN)',
                className: 'text-success',
                url: `${baseUrl}?type=receipt&location_id=${locId}`
            });
        }
        
        if (qtyOut > 0) {
            printJob.push({
                quantity: qtyOut,
                locationName: locName,
                type: 'OUT',
                typeText: 'ผลิตของออก (OUT)',
                className: 'text-primary',
                url: `${baseUrl}?type=production&location_id=${locId}`
            });
        }
    });

    if (printJob.length === 0) {
        alert("Please enter a quantity for at least one item.");
        return;
    }

    // 2. ส่ง "งาน" ไปยังฟังก์ชันสร้างหน้าต่างใหม่
    openPrintWindow(printJob);
}

/**
 * ฟังก์ชันใหม่: สร้างหน้าต่างพิมพ์ (นี่คือหัวใจของวิธีแก้)
 * (ฉบับปรับปรุง: ขยายขนาด QR Code และลดขอบ)
 */
function openPrintWindow(job) {
    // 1. เปิดหน้าต่างใหม่
    const newWin = window.open("", "Print QR Codes", "width=800,height=600");
    if (!newWin) {
        alert("Please allow popups for this site to generate the print page.");
        return;
    }
    
    // 2. เขียน HTML, CSS, และ JS ลงในหน้าต่างใหม่นั้น
    newWin.document.write('<html><head><title>Print QR Codes</title>');
    
    // 3. เขียน CSS สำหรับกระดาษ A4 (ปรับปรุงแล้ว)
    newWin.document.write(`
        <style>
            @media print {
                body { margin: 0; }
                .label-block { border: 1px dashed #999 !important; }
            }
            body { 
                margin: 5mm; /* (ปรับปรุง) ลดขอบกระดาษลง */
                font-family: sans-serif; 
            }
            .page-layout {
                display: flex;
                flex-wrap: wrap;
                gap: 5mm; /* ระยะห่างระหว่างป้าย */
            }
            .label-block {
                width: 85mm; /* (ปรับปรุง) ขยายความกว้าง (ประมาณ 2 ป้ายต่อแถว A4) */
                height: 50mm; /* (ปรับปรุง) เพิ่มความสูง */
                border: 1px dashed #999;
                padding: 4mm;
                text-align: center;
                box-sizing: border-box;
                page-break-inside: avoid;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                overflow: hidden;
            }
            .label-block .qr-img {
                width: 35mm !important;  /* (ปรับปรุง) ขยายขนาดรูป QR Code */
                height: 35mm !important; /* (ปรับปรุง) ขยายขนาดรูป QR Code */
            }
            .label-block .label-text {
                font-size: 10pt; /* (ปรับปรุง) ขยายฟอนต์ */
                font-weight: bold;
                margin-top: 3mm;
                line-height: 1.3;
            }
            .text-success { color: #198754; }
            .text-primary { color: #0d6efd; }
        </style>
    `);
    
    // 4. โหลด qrcode.js Library
    newWin.document.write('<script src="../../utils/libs/qrcode.min.js"><\/script>');
    newWin.document.write('</head><body>');
    
    // 5. สร้าง "โครง" HTML สำหรับ QR Code ทั้งหมด
    newWin.document.write('<div class="page-layout">');
    
    let qrRenderJobs = []; 
    let counter = 0;

    job.forEach(item => {
        for (let i = 0; i < item.quantity; i++) {
            const uniqueId = `qr-${counter++}`;
            qrRenderJobs.push({ id: uniqueId, url: item.url });
            
            newWin.document.write(`
                <div class="label-block">
                    <div id="${uniqueId}" class="qr-img"></div>
                    <div class="label-text ${item.className}">
                        ${item.locationName}<br>${item.typeText}
                    </div>
                </div>
            `);
        }
    });
    
    newWin.document.write('</div>');

    // 6. เขียน JS (Inline) ที่จะทำงานในหน้าต่างใหม่
    newWin.document.write(`
        <script>
            window.onload = function() {
                try {
                    const jobsToRender = ${JSON.stringify(qrRenderJobs)};
                    
                    jobsToRender.forEach(job => {
                        const el = document.getElementById(job.id);
                        if (el) {
                            new QRCode(el, {
                                text: job.url,
                                width: 132, // (ปรับปรุง) 35mm ≈ 132px
                                height: 132,
                                correctLevel: QRCode.CorrectLevel.M
                            });
                        }
                    });

                    setTimeout(function() {
                        window.print();
                        window.close(); 
                    }, 500); 

                } catch (e) {
                    alert("Error generating QR codes: " + e.message);
                }
            };
        <\/script>
    `);
    
    newWin.document.write('</body></html>');
    newWin.document.close();
}

// เริ่มทำงานเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', fetchAndBuildList);