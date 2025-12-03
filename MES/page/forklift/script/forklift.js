let globalForkliftData = [];
let globalBookings = [];

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
    setInterval(loadDashboard, 30000);

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

        let btnHtml = '';
        if (fl.status === 'IN_USE' && fl.current_driver === CURRENT_USER_NAME) {
            // ส่งแบตปัจจุบันไปที่ Modal Return ด้วย
            btnHtml = `<button class="btn btn-warning w-100 fw-bold shadow-sm" onclick="event.stopPropagation(); openReturnModal(${fl.active_booking_id}, ${fl.id}, '${fl.code}', ${fl.current_battery})"><i class="fas fa-undo me-2"></i>คืนรถ (Return)</button>`;
        } else if (fl.status === 'IN_USE') {
            btnHtml = `<button class="btn btn-secondary w-100 opacity-75" disabled><i class="fas fa-user-lock me-2"></i>${fl.current_driver}</button>`;
        } else {
            btnHtml = `<button class="btn btn-outline-primary w-100 fw-bold" onclick="event.stopPropagation(); checkAction(${fl.id}, '${fl.code}', '${fl.name}')"><i class="far fa-hand-point-up me-2"></i>จัดการ (Action)</button>`;
        }

        const html = `
        <div class="col-md-6 col-xl-3">
            <div class="forklift-card h-100 rounded-3 shadow-sm p-3" style="cursor: pointer;" onclick="checkAction(${fl.id}, '${fl.code}', '${fl.name}')">
                <div class="status-strip ${statusClass}"></div>
                <div class="d-flex justify-content-between align-items-center mb-3 mt-1">
                    <h5 class="fw-bold mb-0 text-body">${fl.code}</h5>
                    <span class="badge ${badgeClass} rounded-pill">${statusText}</span>
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

// [UPDATED] Check Action with Battery Init
async function checkAction(forkliftId, code, name) {
    const flData = globalForkliftData.find(f => f.id == forkliftId);
    const currentBatt = flData ? flData.current_battery : 100;

    const myBooking = globalBookings.find(b => 
        b.forklift_id == forkliftId && 
        b.user_name === CURRENT_USER_NAME && 
        b.status === 'BOOKED'
    );

    if (myBooking) {
        // [FIX] ส่ง currentBatt ไปที่ StartJob Modal ด้วย
        openStartJobModal(myBooking.booking_id, forkliftId, name, myBooking.usage_details, currentBatt);
    } else {
        openBookingModal(forkliftId, code, name);
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

// [UPDATED] openStartJobModal (รับ currentBatt)
function openStartJobModal(bookingId, forkliftId, name, details, currentBatt) {
    document.getElementById('startJobForm').reset();
    document.getElementById('start_booking_id').value = bookingId;
    document.getElementById('start_forklift_id').value = forkliftId;
    document.getElementById('start_usage_details').value = details || '';
    document.getElementById('start_forklift_name').innerText = name;

    // [FIX] ใช้ syncBatteryInput เพื่อเซ็ตค่าทั้ง Slider และ Input
    const batt = currentBatt || 100;
    syncBatteryInput('start', batt);
    
    new bootstrap.Modal(document.getElementById('startJobModal')).show();
}

async function submitStartJob() {
    const form = document.getElementById('startJobForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    
    const formData = new FormData(form);
    formData.append('action', 'start_job');
    await callApi(formData, '#startJobModal', 'เริ่มงานแล้ว! (สถานะรถ: Active)');
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
    try {
        const res = await fetch('api/forkliftManage.php', { method: 'POST', body: formData });
        const json = await res.json();
        
        if (json.status) {
            bootstrap.Modal.getInstance(document.querySelector(modalId)).hide();
            loadDashboard();
            alert(successMsg);
        } else {
            alert("Error: " + json.message);
        }
    } catch (e) {
        console.error(e);
        alert("System Error");
    }
}