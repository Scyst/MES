let globalForkliftData = [];
let globalBookings = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setInterval(loadDashboard, 5000);

    // Auto-fill End Time
    document.getElementById('book_start_time').addEventListener('change', function() {
        if(this.value) {
            let d = new Date(this.value);
            d.setHours(d.getHours() + 1);
            let iso = d.toLocaleString('sv').replace(' ', 'T').slice(0, 16);
            document.getElementById('book_end_time').value = iso;
        }
    });
});

// [NEW] Helper Sync Value (เชื่อม Slider กับ Number Box เข้าด้วยกัน)
function syncBatteryInput(prefix, val) {
    const range = document.getElementById(prefix + '_battery_range');
    const input = document.getElementById(prefix + '_battery_input');
    
    // ตรวจสอบว่ามี Element ไหมก่อนเซ็ตค่า
    if(range) range.value = val;
    if(input) input.value = val;
}

async function loadDashboard() {
    try {
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
            
            // [เพิ่ม] อัปเดตเวลาล่าสุดให้ User เห็น
            const now = new Date();
            const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const el = document.getElementById('last-update-time');
            if(el) el.innerText = timeStr;
            
        } else {
            console.error(json.message);
            document.getElementById('forklift-grid').innerHTML = 
                `<div class="col-12 text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>${json.message}</div>`;
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
    container.innerHTML = '';

    forklifts.forEach(fl => {
        let statusClass = 'status-available';
        let statusText = 'ว่าง (Available)';
        let badgeClass = 'bg-success';
        
        if (fl.status === 'IN_USE') {
            statusClass = 'status-in-use';
            statusText = 'ใช้งานอยู่';
            badgeClass = 'bg-primary';
        } else if (fl.status === 'CHARGING' || fl.current_battery < 20) {
            statusClass = 'status-charging';
            statusText = 'ชาร์จ / แบตต่ำ';
            badgeClass = 'bg-warning text-dark';
        }

        const batColor = fl.current_battery < 30 ? '#dc3545' : (fl.current_battery < 70 ? '#ffc107' : '#198754');
        const driverName = fl.current_driver || '-';
        const locationName = fl.last_location || '-';

        // --- BUTTON LOGIC (ปรับข้อความให้เข้ากับ Walk-in) ---
        
        const myPendingBooking = globalBookings.find(b => 
            b.forklift_id == fl.id && b.user_name === CURRENT_USER_NAME && b.status === 'BOOKED'
        );

        let btnHtml = '';

        // 1. เราขับอยู่ -> คืนรถ
        if (fl.status === 'IN_USE' && (fl.current_driver === CURRENT_USER_NAME || IS_ADMIN)) {
            
            // ถ้าเป็น Admin กดคืนแทนคนอื่น ให้เปลี่ยนสีปุ่มหน่อยจะได้รู้ว่าเป็น Force Return
            let btnClass = (fl.current_driver === CURRENT_USER_NAME) ? 'btn-warning' : 'btn-danger';
            let btnText = (fl.current_driver === CURRENT_USER_NAME) ? 'คืนรถ (Return)' : 'บังคับคืน (Force Return)';
            
            btnHtml = `<button class="btn ${btnClass} w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">
                        <i class="fas fa-undo me-2"></i>${btnText}
                       </button>`;
        }
        // 2. เราจองไว้ (เผื่อระบบจองกลับมาใช้) -> เริ่มงาน
        else if (fl.status !== 'IN_USE' && myPendingBooking) {
            btnHtml = `<button class="btn btn-primary w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">เริ่มใช้งาน (Start)</button>`;
        }
        // 3. คนอื่นขับ -> จองต่อ (หรือ Disabled ตามต้องการ)
        else if (fl.status === 'IN_USE') {
            btnHtml = `<button class="btn btn-outline-secondary w-100" onclick="event.stopPropagation(); checkAction(${fl.id})">ไม่ว่าง</button>`;
        } 
        // 4. รถว่าง -> เบิกใช้ทันที (เปลี่ยนข้อความตรงนี้)
        else {
            btnHtml = `<button class="btn btn-primary w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); checkAction(${fl.id})">เริ่มใช้งาน (Start)</button>`;
        }

        // --- HTML CARD ---
        const html = `
        <div class="col-md-6 col-xl-3">
            <div class="forklift-card h-100 rounded-3 shadow-sm p-3" 
                 style="cursor: pointer;" 
                 onclick="checkAction(${fl.id})"> 
                 
                <div class="status-strip ${statusClass}"></div>
                
                <div class="d-flex justify-content-between align-items-start mb-3 mt-1">
                    <div class="d-flex flex-column" style="min-width: 0;"> <h5 class="fw-bold mb-0 text-body text-truncate" title="${fl.code}">${fl.code}</h5>
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
        container.insertAdjacentHTML('beforeend', html);
    });
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
            // ส่งแบตปัจจุบันไปด้วย
            openStartJobModal(bk.booking_id, bk.forklift_id, fl ? fl.name : 'Forklift', bk.usage_details, fl ? fl.current_battery : 100);
        } else {
            alert(`📅 จองไว้โดย: ${bk.user_name}\nเวลา: ${bk.start_time.substring(11,16)} - ${bk.end_time_est.substring(11,16)}\nรายละเอียด: ${bk.usage_details}`);
        }
        return;
    }
}

// [FIXED] Action Router: เช็คสถานะให้ครบทุกเคส (คืน -> จอง -> Walk-in)
// =======================================================
async function checkAction(forkliftId) {
    // 1. ดึงข้อมูลรถจากตัวแปร Global (เพื่อให้ได้สถานะล่าสุด)
    const flData = globalForkliftData.find(f => f.id == forkliftId);
    if (!flData) return;

    const currentBatt = flData.current_battery || 100;

    // 2. [สำคัญ] เช็คก่อนว่า "ฉันกำลังขับคันนี้อยู่ไหม" (Priority 1: คืนรถ)
    // ต้องเช็คทั้งสถานะรถ และชื่อคนขับ
    if (flData.status === 'IN_USE' && flData.current_driver === CURRENT_USER_NAME) {
        openReturnModal(flData.active_booking_id, flData.id, flData.code, currentBatt);
        return; 
    }

    // 3. ถ้าคนอื่นขับอยู่ -> แจ้งเตือน (ห้ามแย่งรถ)
    if (flData.status === 'IN_USE') {
        alert(`รถคันนี้กำลังถูกใช้งานโดย: ${flData.current_driver}`);
        return;
    }

    // 4. เช็คว่า "ฉันจองคันนี้ค้างไว้ไหม" (Priority 2: เริ่มงานตามที่จอง)
    const myBooking = globalBookings.find(b => 
        b.forklift_id == forkliftId && 
        b.user_name === CURRENT_USER_NAME && 
        b.status === 'BOOKED'
    );

    if (myBooking) {
        // มีจอง -> เปิดหน้าเริ่มงาน (โดยดึงข้อมูลจองมาใส่)
        openStartJobModal(myBooking.booking_id, forkliftId, flData.name, myBooking.usage_details, currentBatt);
    } else {
        // 5. ถ้าไม่มีอะไรเลย -> เปิดหน้าเริ่มงานแบบ Walk-in (Instant Start)
        // ส่ง bookingId = null เพื่อบอกว่าเป็นงานใหม่
        openStartJobModal(null, forkliftId, flData.name, '', currentBatt);
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
    
    await callApi(formData, '#bookingModal', 'จองสำเร็จ! (กด Start เมื่อต้องการใช้งาน)');
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
        // A. กรณีมี Booking เดิม (Flow เก่า - เผื่ออนาคตกลับมาใช้)
        formData.append('action', 'start_job');
    } else {
        // B. [NEW] กรณีไม่มี Booking (Walk-in) -> ใช้ API จองแบบ INSTANT
        formData.append('action', 'book_forklift');
        formData.append('booking_type', 'INSTANT');
        
        // สร้างเวลาปัจจุบันส่งไปให้ API (เพราะ API จองต้องการเวลา)
        const now = new Date();
        const nextHour = new Date(now.getTime() + 60*60*1000); // กะเวลาคืนคร่าวๆ 1 ชม.
        
        // แปลงเวลาให้เป็น Format ที่ PHP เข้าใจ (YYYY-MM-DDTHH:mm)
        const toLocalISO = (date) => {
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };

        formData.append('start_time', toLocalISO(now));
        formData.append('end_time_est', toLocalISO(nextHour));
    }

    await callApi(formData, '#startJobModal', 'เริ่มงานแล้ว! (ขับขี่ปลอดภัยนะครับ)');
}

// [UPDATED] openReturnModal (แก้ ID ให้ตรงกับ HTML ใหม่)
function openReturnModal(bookingId, forkliftId, code, currentBatt) {
    document.getElementById('returnForm').reset();
    document.getElementById('return_booking_id').value = bookingId;
    document.getElementById('return_forklift_id').value = forkliftId;
    
    // [FIX] ใช้ syncBatteryInput เพื่อเซ็ตค่า
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
    
    const btn = document.getElementById('btn-save-forklift');
    btn.innerHTML = '<i class="fas fa-plus"></i> เพิ่ม';
    btn.classList.remove('btn-warning');
    btn.classList.add('btn-success');
    
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

function editForklift(id, code, name, location) {
    document.getElementById('manage_id').value = id;
    document.getElementById('manage_code').value = code;
    document.getElementById('manage_name').value = name;
    document.getElementById('manage_location').value = location;
    document.getElementById('manage_action').value = 'edit_forklift'; 

    const btn = document.getElementById('btn-save-forklift');
    btn.innerHTML = '<i class="fas fa-save"></i> บันทึก';
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
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="editForklift(${fl.id}, '${fl.code}', '${safeName}', '${safeLoc}')"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteForklift(${fl.id})"><i class="fas fa-trash"></i></button>
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
    // 1. หาปุ่ม Submit ใน Modal นั้น แล้วสั่ง Disabled + ใส่ Spinner
    const modalEl = document.querySelector(modalId);
    const submitBtn = modalEl.querySelector('.modal-footer .btn-success, .modal-footer .btn-secondary, .modal-footer .btn-primary'); // หาปุ่มยืนยัน
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
            // [Fix] ถ้ามีปัญหาเรื่องแย่งกันจอง ให้ปิด Modal แล้วโหลดใหม่เลย
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
        // 2. คืนค่าปุ่ม (เผื่อ Error แล้ว Modal ไม่ปิด)
        if(submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }
}