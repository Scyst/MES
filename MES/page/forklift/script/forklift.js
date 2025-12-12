let globalForkliftData = [];
let globalBookings = [];
let dashboardInterval;
let isFirstLoad = true; 

// 1. [FIX] ใช้ Event 'pageshow' สำหรับมือถือ
// Event นี้จะทำงานเสมอเมื่อหน้าเว็บแสดงผล ไม่ว่าจะโหลดใหม่ หรือดึงมาจาก Cache (Back/Forward Cache)
window.addEventListener('pageshow', (event) => {
    // event.persisted = true แปลว่าหน้านี้ถูกกู้คืนมาจาก Cache ของ Browser
    if (event.persisted) {
        console.log("Resumed from bfcache: Reloading data...");
        // ให้รีโหลดข้อมูลใหม่ทันที
        loadDashboard(); 
        startPolling();
    }
});

// 2. Event ปกติเมื่อโหลดหน้าเว็บครั้งแรก
document.addEventListener('DOMContentLoaded', () => {
    // เริ่มโหลดข้อมูล
    loadDashboard();
    startPolling(); 

    // [Logic เดิม] Smart Polling: หยุดโหลดเมื่อพับหน้าจอ/เปลี่ยนแท็บ
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopPolling();
        } else {
            // กลับมาดูหน้าจอ -> โหลดข้อมูลล่าสุดทันที แล้วเริ่มนับเวลาใหม่
            console.log("Tab Active: Reloading data...");
            loadDashboard(); 
            startPolling();
        }
    });

    // [Logic เดิม] คำนวณเวลาคืนรถอัตโนมัติ (+1 ชม.)
    const bookStartInput = document.getElementById('book_start_time');
    if (bookStartInput) {
        bookStartInput.addEventListener('change', function() {
            if(this.value) {
                let d = new Date(this.value);
                d.setHours(d.getHours() + 1);
                // จัด Format ให้ลง Input datetime-local ได้ (ตัดวินาทีทิ้ง)
                let iso = d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
                document.getElementById('book_end_time').value = iso;
            }
        });
    }
});

// [NEW] Helper Functions for Polling (เหมือนเดิมแต่ย้ายตำแหน่งให้ดูง่าย)
function startPolling() {
    // เคลียร์อันเก่าก่อนเสมอ เพื่อป้องกันการเปิดซ้อนกัน 2 ตัว
    if (dashboardInterval) clearInterval(dashboardInterval);
    
    dashboardInterval = setInterval(loadDashboard, 5000); // 5 วินาที
}

function stopPolling() {
    if (dashboardInterval) {
        clearInterval(dashboardInterval);
        dashboardInterval = null;
    }
}

function syncBatteryInput(prefix, val) {
    const range = document.getElementById(prefix + '_battery_range');
    const input = document.getElementById(prefix + '_battery_input');
    if(range) range.value = val;
    if(input) input.value = val;
}

async function loadDashboard() {
    try {
        // [NEW] Silent Refresh Logic
        // ถ้าเป็นครั้งแรก ให้แสดง Spinner (เหมือนเดิม)
        // ถ้าไม่ใช่ครั้งแรก (Auto Refresh) ไม่ต้องเคลียร์หน้าจอ ปล่อยให้ User ดูข้อมูลเก่าไปก่อน
        if (isFirstLoad) {
             document.getElementById('forklift-grid').innerHTML = 
                `<div class="col-12 text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Loading...</p></div>`;
        }

        const formData = new FormData();
        formData.append('action', 'get_dashboard');
        
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        if (!res.ok) throw new Error("HTTP Error: " + res.status);
        
        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (e) {
            console.error("Invalid JSON:", text);
            return;
        }

        if (json.status) {
            globalForkliftData = json.data;
            await loadTimelineData();
            renderGrid(globalForkliftData);
            
            // [NEW] อัปเดตเวลาล่าสุด
            const now = new Date();
            const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const el = document.getElementById('last-update-time'); // ต้องเพิ่ม id นี้ใน HTML ถ้าอยากโชว์
            if(el) el.innerText = timeStr;

            isFirstLoad = false; // ปิด flag ครั้งแรก
        } else {
            console.error(json.message);
            // แสดง Error เฉพาะครั้งแรก ถ้า Refresh เงียบๆ แล้ว Error ไม่ต้องไปกวน User
            if (isFirstLoad) {
                document.getElementById('forklift-grid').innerHTML = 
                    `<div class="col-12 text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>${json.message}</div>`;
            }
        }
    } catch (e) { 
        console.error(e);
    }
}

async function loadTimelineData() {
    const formData = new FormData();
    formData.append('action', 'get_timeline');
    const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
    const json = await res.json();
    if(json.status) {
        globalBookings = json.data;
        renderTimelineChart(globalForkliftData, globalBookings);
    }
}

function renderGrid(forklifts) {
    const container = document.getElementById('forklift-grid');
    // เราสร้าง HTML ใหม่ทั้งก้อนแล้วแทนที่ innerHTML ซึ่งเร็วและจัดการง่าย
    // ในกรณี Silent Refresh ผู้ใช้แทบจะไม่รู้สึุกกระตุก
    let gridHtml = '';

    forklifts.forEach(fl => {
        let statusClass = 'status-available';
        let statusText = 'ว่าง (Available)';
        let badgeClass = 'bg-success';
        
        // [NEW] Maintenance Logic
        if (fl.status === 'MAINTENANCE') {
            statusClass = 'status-maintenance';
            statusText = 'แจ้งซ่อม (Maintenance)';
            badgeClass = 'bg-secondary';
        } else if (fl.status === 'IN_USE') {
            statusClass = 'status-in-use';
            statusText = 'ใช้งานอยู่ (In Use)';
            badgeClass = 'bg-primary';
        } else if (fl.status === 'CHARGING' || fl.current_battery < 20) {
            statusClass = 'status-charging';
            statusText = 'ชาร์จ / แบตต่ำ';
            badgeClass = 'bg-warning text-dark';
        }

        const batColor = fl.current_battery < 30 ? '#dc3545' : (fl.current_battery < 70 ? '#ffc107' : '#198754');
        const driverName = fl.current_driver || '-';
        const locationName = fl.last_location || '-';

        // --- BUTTON LOGIC ---
        const myPendingBooking = globalBookings.find(b => 
            b.forklift_id == fl.id && b.user_name === CURRENT_USER_NAME && b.status === 'BOOKED'
        );

        let btnHtml = '';

        // Case 0: ซ่อมบำรุง -> ปุ่ม Disabled
        if (fl.status === 'MAINTENANCE') {
            btnHtml = `<button class="btn btn-light text-secondary border w-100" disabled>
                        <i class="fas fa-tools me-2"></i>งดให้บริการ
                       </button>`;
        }
        // Case 1: เราขับอยู่ -> คืนรถ
        else if (fl.status === 'IN_USE' && (fl.current_driver === CURRENT_USER_NAME || IS_ADMIN)) {
            let btnClass = (fl.current_driver === CURRENT_USER_NAME) ? 'btn-warning' : 'btn-danger';
            let btnText = (fl.current_driver === CURRENT_USER_NAME) ? 'คืนรถ (Return)' : 'บังคับคืน (Force)';
            btnHtml = `<button class="btn ${btnClass} w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">
                        <i class="fas fa-undo me-2"></i>${btnText}
                       </button>`;
        } 
        // Case 2: มีจองค้าง -> เริ่มงาน
        else if (fl.status !== 'IN_USE' && myPendingBooking) {
            btnHtml = `<button class="btn btn-success w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">
                        <i class="fas fa-play me-2"></i>เริ่มงาน (Start Job)
                       </button>`;
        }
        // Case 3: คนอื่นใช้ -> จองต่อ
        else if (fl.status === 'IN_USE') {
            btnHtml = `<button class="btn btn-outline-secondary w-100" onclick="event.stopPropagation(); checkAction(${fl.id})">
                        <i class="far fa-clock me-2"></i>จองต่อคิว
                       </button>`;
        } 
        // Case 4: ว่าง -> ใช้เลย
        else {
            btnHtml = `<button class="btn btn-primary w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">
                        <i class="fas fa-key me-2"></i>เบิกใช้ทันที (Use Now)
                       </button>`;
        }

        gridHtml += `
        <div class="col-md-6 col-xl-3">
            <div class="forklift-card h-100 rounded-3 shadow-sm p-3" 
                 style="cursor: pointer;" 
                 onclick="checkAction(${fl.id})"> 
                 
                <div class="status-strip ${statusClass}"></div>
                
                <div class="d-flex justify-content-between align-items-start mb-3 mt-1">
                    <div class="d-flex flex-column" style="min-width: 0;"> 
                        <h5 class="fw-bold mb-0 text-body text-truncate" title="${fl.code}">${fl.code}</h5>
                        <small class="text-muted text-truncate" style="font-size: 0.8rem;" title="${fl.name}">${fl.name}</small>
                    </div>
                    <span class="badge ${badgeClass} rounded-pill ms-2 text-nowrap" style="font-size: 0.75rem;">${statusText}</span>
                </div>
                
                <div class="mb-3">
                    <div class="card-info-row">
                        <span class="card-info-label">Battery</span>
                        <span class="card-info-value" style="color:${batColor}">${fl.current_battery}%</span>
                    </div>
                    <div class="battery-wrapper mb-3">
                        <div class="battery-fill" style="width: ${fl.current_battery}%; background-color: ${batColor};"></div>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-label"><i class="fas fa-user me-1"></i> Driver</span>
                        <span class="card-info-value text-truncate" style="max-width: 120px;">${driverName}</span>
                    </div>
                    <div class="card-info-row">
                        <span class="card-info-label"><i class="fas fa-map-marker-alt me-1"></i> Location</span>
                        <span class="card-info-value text-truncate" style="max-width: 120px;">${locationName}</span>
                    </div>
                </div>

                <div class="mt-auto pt-2 border-top">
                    ${btnHtml}
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = gridHtml;
}

function renderTimelineChart(forklifts, bookings) {
    const container = document.getElementById('timeline-chart');
    container.innerHTML = '';

    let headerHtml = '<div class="timeline-header"><div class="timeline-label-col border-bottom-0 bg-transparent">Forklift</div>';
    for (let i = 0; i < 24; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        headerHtml += `<div class="time-slot">${hour}</div>`;
    }
    headerHtml += '</div>';
    
    let bodyHtml = '<div class="timeline-body">';
    forklifts.forEach(fl => {
        bodyHtml += `
            <div class="timeline-row">
                <div class="timeline-label-col text-truncate" title="${fl.name}">${fl.code}</div>
                <div class="timeline-track" id="track-${fl.id}"></div>
            </div>
        `;
    });
    bodyHtml += '</div>';

    container.innerHTML = headerHtml + bodyHtml;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    const totalMs = endOfDay - startOfDay;

    bookings.forEach(bk => {
        const track = document.getElementById(`track-${bk.forklift_id}`);
        if (track) {
            let start = new Date(bk.start_time).getTime();
            let end = (bk.status === 'COMPLETED' && bk.end_time_actual) 
                      ? new Date(bk.end_time_actual).getTime() 
                      : new Date(bk.end_time_est).getTime();

            if (end < startOfDay || start > endOfDay) return; 
            if (start < startOfDay) start = startOfDay;
            if (end > endOfDay) end = endOfDay;

            const leftPercent = ((start - startOfDay) / totalMs) * 100;
            const widthPercent = ((end - start) / totalMs) * 100;

            let barClass = 'booked';
            if (bk.status === 'ACTIVE') barClass = 'active';
            if (bk.status === 'COMPLETED') barClass = 'completed';

            const startTimeStr = bk.start_time.substring(11, 16);
            const endTimeStr = (bk.status === 'COMPLETED' && bk.end_time_actual) 
                               ? bk.end_time_actual.substring(11, 16) 
                               : bk.end_time_est.substring(11, 16);
            
            const tooltip = `${bk.user_name}\n${startTimeStr} - ${endTimeStr}\n${bk.usage_details}`;
            const bkData = JSON.stringify(bk).replace(/"/g, '&quot;');

            const barHtml = `
                <div class="booking-bar ${barClass}" 
                     style="left: ${leftPercent}%; width: ${widthPercent}%;" 
                     title="${tooltip}"
                     onclick="handleTimelineClick(event, ${bkData})">
                    ${bk.user_name}
                </div>`;
            track.insertAdjacentHTML('beforeend', barHtml);
        }
    });
}

function handleTimelineClick(event, bk) {
    event.stopPropagation();

    const isOwner = (bk.user_name === CURRENT_USER_NAME);
    const canManage = isOwner || (typeof IS_ADMIN !== 'undefined' && IS_ADMIN);

    if (bk.status === 'COMPLETED') {
        alert(`✅ งานนี้เสร็จสิ้นแล้ว\nโดย: ${bk.user_name}\nงาน: ${bk.usage_details}\nเวลาคืน: ${bk.end_time_actual}`);
        return;
    }

    if (bk.status === 'ACTIVE') {
        if (canManage) {
            const fl = globalForkliftData.find(f => f.id == bk.forklift_id);
            const flCode = fl ? fl.code : 'Forklift';
            openReturnModal(bk.booking_id, bk.forklift_id, flCode, fl ? fl.current_battery : 100);
        } else {
            alert(`🚧 กำลังใช้งานอยู่โดย: ${bk.user_name}\nรายละเอียด: ${bk.usage_details}`);
        }
        return;
    }

    if (bk.status === 'BOOKED') {
        if (canManage) {
            const fl = globalForkliftData.find(f => f.id == bk.forklift_id);
            openStartJobModal(bk.booking_id, bk.forklift_id, fl ? fl.name : 'Forklift', bk.usage_details, fl ? fl.current_battery : 100);
        } else {
            alert(`📅 จองไว้โดย: ${bk.user_name}\nเวลา: ${bk.start_time.substring(11,16)} - ${bk.end_time_est.substring(11,16)}\nรายละเอียด: ${bk.usage_details}`);
        }
        return;
    }
}

async function checkAction(forkliftId, code, name) {
    const flData = globalForkliftData.find(f => f.id == forkliftId);
    // [FIX] Maintenance Check: ถ้าซ่อมอยู่ ห้ามทำอะไร
    if (flData && flData.status === 'MAINTENANCE') {
        alert('รถคันนี้งดให้บริการ (Maintenance)');
        return;
    }

    const safeName = flData ? flData.name : (name || 'Forklift');
    const safeCode = flData ? flData.code : (code || '-');
    const currentBatt = flData ? flData.current_battery : 100;

    // 1. คืนรถ (เราขับเอง) -> อันนี้ทำงานถูกแล้ว
    if (flData.status === 'IN_USE' && flData.current_driver === CURRENT_USER_NAME) {
        openReturnModal(flData.active_booking_id, flData.id, safeCode, currentBatt);
        return; 
    }

    // 2. คนอื่นใช้ (จุดที่ต้องแก้ไข)
    if (flData.status === 'IN_USE') {
        // [FIX] เพิ่มการเช็ค IS_ADMIN: ถ้าเป็น Admin ให้กดเข้าไปคืนรถได้ (Force Return)
        if (typeof IS_ADMIN !== 'undefined' && IS_ADMIN) {
             // ส่งแจ้งเตือนเล็กน้อยเพื่อให้รู้ว่ากำลังทำ Force Return
             if(confirm(`⚠️ Admin Action: รถคันนี้ใช้งานโดย "${flData.current_driver}"\nคุณต้องการบังคับคืนรถ (Force Return) ใช่หรือไม่?`)) {
                 openReturnModal(flData.active_booking_id, flData.id, safeCode, currentBatt);
             }
             return;
        }

        // ถ้าไม่ใช่ Admin ให้แจ้งเตือนเหมือนเดิม
        alert(`รถคันนี้กำลังถูกใช้งานโดย: ${flData.current_driver}`);
        return;
    }
    // 3. เริ่มงานที่จองไว้
    const myBooking = globalBookings.find(b => 
        b.forklift_id == forkliftId && 
        b.user_name === CURRENT_USER_NAME && 
        b.status === 'BOOKED'
    );
    if (myBooking) {
        openStartJobModal(myBooking.booking_id, forkliftId, safeName, myBooking.usage_details, currentBatt);
    } else {
        // 4. จอง/เริ่มใหม่ (Walk-in)
        // ส่ง bookingId = null เพื่อบอกว่าเป็นงานใหม่
        // [IMPORTANT] ถ้าจะกลับไปใช้ระบบจอง ให้เปลี่ยนตรงนี้เป็น openBookingModal
        openStartJobModal(null, forkliftId, safeName, '', currentBatt);
    }
}

// --- MODALS ---

function openBookingModal(id, code, name) {
    document.getElementById('bookingForm').reset();
    document.getElementById('book_forklift_id').value = id;
    document.getElementById('book_forklift_name').innerText = code + " : " + name;
    
    const now = new Date();
    const isoNow = now.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
    document.getElementById('book_start_time').value = isoNow;
    document.getElementById('book_start_time').dispatchEvent(new Event('change'));
    
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
}

async function submitBooking() {
    const form = document.getElementById('bookingForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    formData.append('action', 'book_forklift');
    
    await callApi(formData, '#bookingModal', 'จองสำเร็จ!');
}

function openStartJobModal(bookingId, forkliftId, name, details, currentBatt) {
    document.getElementById('startJobForm').reset();
    document.getElementById('start_booking_id').value = bookingId || '';
    document.getElementById('start_forklift_id').value = forkliftId;
    document.getElementById('start_usage_details').value = details || '';
    document.getElementById('start_forklift_name').innerText = name;

    const batt = currentBatt || 100;
    syncBatteryInput('start', batt);
    
    new bootstrap.Modal(document.getElementById('startJobModal')).show();
}

async function submitStartJob() {
    const form = document.getElementById('startJobForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    const bookingId = document.getElementById('start_booking_id').value;

    if (bookingId) {
        // มี Booking เดิม -> Start
        formData.append('action', 'start_job');
    } else {
        // ไม่มี Booking -> Instant Book
        formData.append('action', 'book_forklift');
        formData.append('booking_type', 'INSTANT');
        
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60*60*1000);
        const toLocalISO = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };
        formData.append('start_time', toLocalISO(now));
        formData.append('end_time_est', toLocalISO(nextHour));
    }

    await callApi(formData, '#startJobModal', 'เริ่มงานแล้ว! (ขับขี่ปลอดภัยนะครับ)');
}

function openReturnModal(bookingId, forkliftId, code, currentBatt) {
    document.getElementById('returnForm').reset();
    document.getElementById('return_booking_id').value = bookingId;
    document.getElementById('return_forklift_id').value = forkliftId;
    
    const batt = currentBatt || 100;
    syncBatteryInput('return', batt);

    new bootstrap.Modal(document.getElementById('returnModal')).show();
}

async function submitReturn() {
    const form = document.getElementById('returnForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    formData.append('action', 'return_forklift');
    await callApi(formData, '#returnModal', 'คืนรถเรียบร้อย!');
}

async function openManageModal() {
    new bootstrap.Modal(document.getElementById('manageModal')).show();
    loadFleetList();
}

function resetManageForm() {
    document.getElementById('manageForkliftForm').reset();
    document.getElementById('manage_id').value = '';
    document.getElementById('manage_action').value = 'add_forklift';
    document.getElementById('manage_status').value = 'AVAILABLE'; 

    const btn = document.getElementById('btn-save-forklift');
    btn.innerHTML = '<i class="fas fa-plus"></i> เพิ่มรถใหม่';
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-success');
    
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

function editForklift(id, code, name, location, status) {
    document.getElementById('manage_id').value = id;
    document.getElementById('manage_code').value = code;
    document.getElementById('manage_name').value = name;
    document.getElementById('manage_location').value = location;
    document.getElementById('manage_status').value = status; 
    document.getElementById('manage_action').value = 'edit_forklift'; 

    const btn = document.getElementById('btn-save-forklift');
    btn.innerHTML = '<i class="fas fa-save"></i> บันทึกการแก้ไข';
    btn.classList.remove('btn-success');
    btn.classList.add('btn-warning');

    document.getElementById('btn-cancel-edit').style.display = 'inline-block';
}

async function loadFleetList() {
    const formData = new FormData();
    formData.append('action', 'get_dashboard');
    const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
    const json = await res.json();
    
    const tbody = document.getElementById('manageTableBody');
    tbody.innerHTML = '';
    
    json.data.forEach(fl => {
        const safeName = fl.name.replace(/'/g, "&apos;");
        const safeLoc = (fl.last_location || '').replace(/'/g, "&apos;");
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-3 fw-bold">${fl.code}</td>
                <td>${fl.name}</td>
                <td><span class="badge bg-light text-dark border">${fl.status}</span></td>
                <td>${fl.last_location}</td>
                <td class="text-end pe-3">
                    <button class="btn btn-sm btn-outline-warning me-1" 
                        onclick="editForklift(${fl.id}, '${fl.code}', '${safeName}', '${safeLoc}', '${fl.status}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteForklift(${fl.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

async function saveForklift() {
    const form = document.getElementById('manageForkliftForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
    const json = await res.json();
    if(json.status) {
        resetManageForm();
        loadFleetList();
        loadDashboard();
    } else {
        alert(json.message);
    }
}

async function deleteForklift(id) {
    if(!confirm('ยืนยันลบรถคันนี้?')) return;
    const formData = new FormData();
    formData.append('action', 'delete_forklift');
    formData.append('id', id);
    
    const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
    const json = await res.json();
    if(json.status) {
        loadFleetList();
        loadDashboard();
    }
}

async function openHistoryModal() {
    new bootstrap.Modal(document.getElementById('historyModal')).show();
    const formData = new FormData();
    formData.append('action', 'get_history');
    const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
    const json = await res.json();
    
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = '';
    
    if(json.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">No history found</td></tr>';
        return;
    }

    json.data.forEach(h => {
        let duration = '-';
        if(h.end_time_actual && h.start_time) {
            const diffMs = new Date(h.end_time_actual) - new Date(h.start_time);
            const diffMins = Math.round(diffMs / 60000);
            duration = `${Math.floor(diffMins/60)}h ${diffMins%60}m`;
        }

        const startB = h.start_battery || '-';
        const endB = h.end_battery || '-';
        
        tbody.innerHTML += `
            <tr>
                <td class="ps-3 small text-muted text-nowrap">${h.start_time.substring(0,16)}</td>
                <td class="fw-bold text-primary text-nowrap">${h.forklift_code}</td>
                <td class="text-nowrap">${h.user_name}</td>
                <td>${h.usage_details}</td>
                <td class="text-nowrap">${duration}</td>
                <td class="small text-truncate" style="max-width:80px;">${h.location_start || '-'}</td>
                <td class="small text-truncate" style="max-width:80px;">${h.last_location || '-'}</td>
                <td class="text-center text-muted">${startB}%</td>
                <td class="text-center fw-bold text-dark">${endB}%</td>
            </tr>
        `;
    });
}

async function callApi(formData, modalId, successMsg) {
    const modalEl = document.querySelector(modalId);
    const submitBtn = modalEl.querySelector('.modal-footer .btn-success, .modal-footer .btn-secondary, .modal-footer .btn-primary');
    const originalText = submitBtn ? submitBtn.innerHTML : '';

    if(submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
    }

    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        
        if (json.status) {
            bootstrap.Modal.getInstance(modalEl).hide();
            loadDashboard();
            alert(successMsg);
        } else {
            alert("แจ้งเตือน: " + json.message);
            if(json.message.includes('จองแล้ว') || json.message.includes('ไม่ว่าง')) {
                bootstrap.Modal.getInstance(modalEl).hide();
                loadDashboard();
            }
        }
    } catch (e) {
        console.error(e);
        alert("System Error: เชื่อมต่อ Server ไม่ได้");
    } finally {
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}