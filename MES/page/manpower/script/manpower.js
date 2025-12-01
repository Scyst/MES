// page/manpower/script/manpower.js
"use strict";

const API_SYNC_URL = 'api/sync_from_api.php';
const API_GET_URL = 'api/get_daily_manpower.php';
const API_MANAGE_EMP = 'api/manage_employees.php';

// Global Variables
let editLogModal, shiftPlannerModal, editEmployeeModal;
let allManpowerData = [];   
let displayData = [];       

let currentPage = 1;
const rowsPerPage = 50;

// State for Filter & Sort
let currentFilter = 'TOTAL'; 
let currentSort = { column: 'log_date', order: 'desc' }; 

// Sync Progress Variables
let syncTimerInterval;
let estimatedDuration = 45; 

// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const logModalEl = document.getElementById('editLogModal');
    if(logModalEl) editLogModal = new bootstrap.Modal(logModalEl);
    
    const shiftModalEl = document.getElementById('shiftPlannerModal');
    if(shiftModalEl) shiftPlannerModal = new bootstrap.Modal(shiftModalEl);

    const empModalEl = document.getElementById('editEmployeeModal');
    if(empModalEl) editEmployeeModal = new bootstrap.Modal(empModalEl);

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.addEventListener('change', () => loadManpowerData(true));
    if (endInput) endInput.addEventListener('change', () => loadManpowerData(true));

    loadManpowerData();
    loadFilterOptions();
});

// ==========================================
// 2. Data Loading & Processing
// ==========================================

async function loadManpowerData(checkAutoSync = true) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const tbody = document.getElementById('manpowerTableBody');
    const updateLabel = document.getElementById('lastUpdateLabel');

    if (allManpowerData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><div class="text-muted mt-2 fw-bold">กำลังโหลดข้อมูล...</div></td></tr>';
        if(updateLabel) updateLabel.innerText = 'Checking...';
    }

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_GET_URL}?startDate=${start}&endDate=${end}&t=${timestamp}`);
        const result = await response.json();

        if (result.success) {
            const summary = result.summary;
            updateKPI(summary);
            if(updateLabel) updateLabel.innerText = result.last_update || 'Never';
            allManpowerData = result.data || [];
            processData(); 

            // =========================================================
            // ★ SMART AUTO SYNC V4 (Background Check)
            // =========================================================
            const todayStr = new Date().toISOString().slice(0, 10);
            const isToday = (start === todayStr && end === todayStr);
            const STALE_THRESHOLD_MINUTES = 30; // ตั้งเวลาความเก่าที่ยอมรับได้
            const isStale = checkIfDataIsStale(result.last_update, STALE_THRESHOLD_MINUTES);
            
            // Gap Detection (เช็คข้อมูลฟันหลอ)
            let isMissingHead = false;
            if (allManpowerData.length > 0) {
                const earliestRec = allManpowerData[allManpowerData.length - 1];
                const earliestDate = new Date(earliestRec.log_date);
                const startDate = new Date(start);
                const diffTime = earliestDate - startDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 3) isMissingHead = true;
            } else {
                isMissingHead = true;
            }

            const syncKey = `autosync_${start}_${end}`;
            const alreadySynced = sessionStorage.getItem(syncKey);
            const shouldSyncStale = (isToday && isStale);
            const shouldSyncGap   = (checkAutoSync && isMissingHead && !alreadySynced);

            // ถ้าเข้าเงื่อนไข ให้ Sync ต่อในพื้นหลัง (โดยไม่ล้างตารางที่เพิ่งโชว์ไป)
            if (shouldSyncStale || shouldSyncGap) {
                console.log(`Background Sync Triggered. Stale: ${shouldSyncStale}, Gap: ${shouldSyncGap}`);
                
                if (shouldSyncGap) {
                    sessionStorage.setItem(syncKey, "true");
                    showToast("กำลังดึงข้อมูลย้อนหลังเพิ่มเติม...", "#0dcaf0");
                }
                syncApiData(false); 
            }

        } else {
            if (allManpowerData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">${result.message}</td></tr>`;
            }
        }
    } catch (err) {
        console.error(err);
        if (allManpowerData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger py-4">Failed to load data.</td></tr>';
        }
    }
}

function processData() {
    if (currentFilter === 'TOTAL') {
        displayData = [...allManpowerData];
    } else {
        displayData = allManpowerData.filter(row => {
            const s = (row.status || 'UNKNOWN').toUpperCase(); 
            if (currentFilter === 'PRESENT') return s === 'PRESENT';
            if (currentFilter === 'ABSENT') return s === 'ABSENT';
            if (currentFilter === 'OTHER') return s !== 'PRESENT' && s !== 'ABSENT'; 
            return true;
        });
    }

    displayData.sort((a, b) => {
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable(displayData);
    updateUIState();
}

function renderTable(data) {
    const tbody = document.getElementById('manpowerTableBody');
    const paginationControls = document.getElementById('paginationControls');
    
    tbody.innerHTML = '';
    paginationControls.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">ไม่พบข้อมูลตามเงื่อนไข</td></tr>`;
        document.getElementById('pageInfo').innerText = 'Showing 0 entries';
        return;
    }

    const groupedMap = new Map();
    
    data.forEach(row => {
        if (!groupedMap.has(row.emp_id)) {
            groupedMap.set(row.emp_id, {
                emp_info: row,
                logs: [],
                stats: { present: 0, late: 0, absent: 0, leave: 0 }
            });
        }
        const empGroup = groupedMap.get(row.emp_id);
        empGroup.logs.push(row);

        const st = (row.status || '').toUpperCase();
        if (st === 'PRESENT') empGroup.stats.present++;
        else if (st === 'LATE') empGroup.stats.late++;
        else if (st === 'ABSENT') empGroup.stats.absent++;
        else if (st.includes('LEAVE')) empGroup.stats.leave++;
    });

    const groupedArray = Array.from(groupedMap.values());
    const totalItems = groupedArray.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages > 0 ? totalPages : 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    const currentSlice = groupedArray.slice(startIndex, endIndex);

    document.getElementById('pageInfo').innerText = `Showing ${startIndex + 1} to ${endIndex} of ${totalItems} employees`;

    currentSlice.forEach(group => {
        const info = group.emp_info;
        const stats = group.stats;
        const rowId = `emp-${info.emp_id}`; 

        const trMain = document.createElement('tr');
        trMain.className = 'align-middle cursor-pointer hover-bg';
        trMain.setAttribute('data-bs-toggle', 'collapse');
        trMain.setAttribute('data-bs-target', `#collapse-${rowId}`);
        trMain.setAttribute('aria-expanded', 'false');
        trMain.style.cursor = 'pointer';

        let statBadges = '';
        if (stats.present > 0) statBadges += `<span class="badge bg-success me-1">${stats.present} มา</span>`;
        if (stats.late > 0)    statBadges += `<span class="badge bg-warning text-dark me-1">${stats.late} สาย</span>`;
        if (stats.absent > 0)  statBadges += `<span class="badge bg-danger me-1">${stats.absent} ขาด</span>`;
        if (stats.leave > 0)   statBadges += `<span class="badge bg-info text-dark me-1">${stats.leave} ลา</span>`;

        trMain.innerHTML = `
            <td class="text-center"><i class="fas fa-chevron-right text-muted expand-icon"></i></td>
            <td class="fw-bold text-primary ps-2">${info.emp_id}</td>
            <td>
                <div class="fw-bold text-dark">${info.name_th || '-'}</div>
                <div class="small text-muted">
                    <i class="fas fa-briefcase me-1"></i>${info.department_api || '-'} 
                    <span class="mx-1 text-secondary">|</span> 
                    ${info.position || '-'}
                </div>
            </td>
            <td><span class="badge bg-light text-dark border">${info.line || '-'}</span></td>
            <td><span class="badge bg-info bg-opacity-10 text-info border border-info">${info.team_group || '-'}</span></td>
            <td><span class="badge bg-secondary">${info.shift_name || 'Main'}</span></td>
            <td>${statBadges || '<span class="text-muted small">-</span>'}</td>
        `;
        tbody.appendChild(trMain);

        const trDetail = document.createElement('tr');
        trDetail.innerHTML = `
            <td colspan="7" class="p-0 border-0">
                <div class="collapse bg-light" id="collapse-${rowId}">
                    <div class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="m-0 text-primary fw-bold"><i class="fas fa-history me-2"></i>Attendance History</h6>
                            <button class="btn btn-sm btn-outline-secondary bg-white" onclick="editEmployee('${info.emp_id}')">
                                <i class="fas fa-user-cog me-1"></i> Edit Employee Info
                            </button>
                        </div>
                        <table class="table table-sm table-bordered mb-0 bg-white shadow-sm">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 15%;">Date</th>
                                    <th style="width: 10%;">Shift</th>
                                    <th style="width: 15%;">In</th>
                                    <th style="width: 15%;">Out</th>
                                    <th style="width: 10%;">Status</th>
                                    <th>Remark</th>
                                    <th style="width: 50px;" class="text-center"><i class="fas fa-cog"></i></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${generateDetailRows(group.logs)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(trDetail);
        
        trMain.addEventListener('click', function() {
            const icon = this.querySelector('.expand-icon');
            setTimeout(() => {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                if (isExpanded) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                    this.classList.add('table-active');
                } else {
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                    this.classList.remove('table-active');
                }
            }, 50);
        });
    });

    renderPagination(totalPages, paginationControls);
}

function generateDetailRows(logs) {
    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));

    return logs.map(log => {
        const statusBadge = getStatusBadge(log.status);
        const scanIn = log.scan_in_time ? formatTime(log.scan_in_time) : '-';
        const scanOut = log.scan_out_time ? formatTime(log.scan_out_time) : '-';
        
        return `
            <tr>
                <td class="fw-bold text-secondary">${formatDateShort(log.log_date)}</td>
                <td><small class="text-muted">${log.shift_name || '-'}</small></td>
                <td class="${log.status === 'LATE' ? 'text-danger fw-bold' : 'text-success'}">${scanIn}</td>
                <td>${scanOut}</td>
                <td>${statusBadge}</td>
                <td><small class="text-muted">${log.remark || ''}</small></td>
                <td class="text-center">
                    <button class="btn btn-xs btn-link text-primary" onclick="openEditLogModal('${log.log_id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPagination(totalPages, nav) {
    let buttons = '';
    buttons += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); changePage(${currentPage - 1})">Previous</a>
                </li>`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            buttons += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); changePage(${i})">${i}</a>
                        </li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            buttons += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    buttons += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); changePage(${currentPage + 1})">Next</a>
                </li>`;
    nav.innerHTML = buttons;
}

window.changePage = function(page) {
    if (page < 1) return;
    currentPage = page;
    renderTable(displayData);
}

// ==========================================
// 4. API Actions (Sync with Background Mode)
// ==========================================

async function syncApiData(manual = false) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    // Manual: ถามยืนยัน -> แล้วเริ่ม Background Process (ไม่โชว์ Spinner ล็อคจอแล้ว)
    if (manual) {
        if (!confirm(`ยืนยันการดึงข้อมูลจาก Scanner?\nช่วงเวลา: ${start} ถึง ${end}`)) return;
        
        // [FIXED] ไม่ใช้ showSpinner() ที่บล็อกจอ แต่ใช้ Toast บอกแทน
        showToast("กำลังดึงข้อมูล... กรุณารอสักครู่", "#0dcaf0"); // สีฟ้า
    } 
    
    // เริ่ม UI ตรง Last Update
    startBackgroundSyncUI();

    try {
        const response = await fetch(`${API_SYNC_URL}?startDate=${start}&endDate=${end}`);
        const result = await response.json();
        
        if (result.success) {
            // แจ้งเตือนเมื่อเสร็จ
            const msg = manual ? result.message : 'ข้อมูลอัปเดตเรียบร้อยแล้ว';
            showToast(msg, '#198754');
            
            // โหลดข้อมูลใหม่ (false = ไม่ต้องเช็ค auto sync ซ้ำ)
            loadManpowerData(false); 
        } else {
            showToast(result.message, '#dc3545');
        }
    } catch (err) {
        console.error(err);
        showToast('Connection Error', '#dc3545');
    } finally {
        // จบการทำงาน Background UI
        stopBackgroundSyncUI();
    }
}

// --- ฟังก์ชันจัดการ UI ตอนโหลดเบื้องหลัง ---
function startBackgroundSyncUI() {
    const updateLabel = document.getElementById('lastUpdateLabel');
    if (!updateLabel) return;

    let progress = 0;
    let startTime = Date.now();

    // เคลียร์ Interval เก่าถ้ามี
    if (syncTimerInterval) clearInterval(syncTimerInterval);

    // แสดงสถานะเริ่มต้น
    updateLabel.innerHTML = `<span class="text-primary fw-bold">
        <span class="spinner-border spinner-border-sm me-1" role="status"></span>
        Syncing... 0%
    </span>`;

    // เริ่มนับเวลา
    syncTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000); // วินาทีที่ผ่านไป
        
        let increment = 0;

        // --- STAGE 1: ช่วงต้น (0-60%) วิ่งโชว์พาว ---
        if (progress < 60) {
            // วิ่งแบบ Linear ปกติ (กะให้ถึง 60% ใน 5-10 วินาที)
            increment = Math.random() * 2 + 1; 
        } 
        // --- STAGE 2: ช่วงปลาย (60-99%) วิ่งมาราธอน ---
        else {
            // สูตร: (เป้าหมาย - ปัจจุบัน) / ตัวหารความหนืด
            // ยิ่งใกล้ 99 ยิ่งหนืดขึ้นเรื่อยๆ ไม่มีวันถึง 100
            const remaining = 99 - progress;
            increment = remaining / 20; // หาร 20 เพื่อให้มันค่อยๆ กระดึ๊บ (ปรับเลขนี้ได้ ยิ่งมากยิ่งช้า)
            
            // ถ้าขยับน้อยเกินไป (น้อยกว่าทศนิยม 2 ตำแหน่ง) ให้ขยับนิดนึงเพื่อให้ตัวเลขเปลี่ยน
            // แต่ต้องระวังไม่ให้มันวิ่งเร็วเกินไปสำหรับงาน 10 นาที
            if (increment < 0.01) increment = 0.005; 
        }
        
        progress += increment;
        
        // กันทะลุเพดาน 99.9% (เผื่อรอนานระดับชั่วโมง)
        if (progress > 99.9) progress = 99.9;
        
        // จัดรูปแบบทศนิยม: ช่วงแรกไม่มีจุด, ช่วงหลังมีจุดทศนิยมเพื่อให้เห็นความเคลื่อนไหว
        let displayProgress = progress < 90 ? Math.floor(progress) : progress.toFixed(1);

        updateLabel.innerHTML = `<span class="text-primary fw-bold">
            <span class="spinner-border spinner-border-sm me-1" role="status"></span>
            Syncing... ${displayProgress}% <small class="text-muted ms-1">(${elapsed}s)</small>
        </span>`;
    }, 800); // อัปเดตทุกๆ 0.8 วินาที
}

function stopBackgroundSyncUI() {
    if (syncTimerInterval) clearInterval(syncTimerInterval);
}

// ฟังก์ชันช่วยเช็คความเก่าของข้อมูล
function checkIfDataIsStale(lastUpdateStr, thresholdMinutes) {
    if (!lastUpdateStr || lastUpdateStr === 'Never') return true; 
    try {
        const [datePart, timePart] = lastUpdateStr.split(' ');
        const [day, month, year] = datePart.split('/');
        const [hour, minute] = timePart.split(':');
        const lastUpdateDate = new Date(year, month - 1, day, hour, minute);
        const now = new Date();
        const diffMs = now - lastUpdateDate;
        const diffMins = Math.floor(diffMs / 60000);
        return diffMins > thresholdMinutes; 
    } catch (e) {
        return false; 
    }
}

// ==========================================
// 5. Helpers (Formatting & Badges)
// ==========================================

function updateKPI(summary) {
    const setText = (id, val) => {
        const el = document.getElementById(id);
        if(el) el.textContent = val || 0;
    };
    setText('kpi-total', summary.total);
    setText('kpi-present', summary.present);
    setText('kpi-absent', summary.absent);
    setText('kpi-other', summary.other_total);
}

window.setFilter = function(filterType) {
    currentFilter = filterType;
    currentPage = 1; 
    processData();
}

window.toggleSort = function(column) {
    if (currentSort.column === column) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.order = 'asc';
    }
    processData();
}

function updateUIState() {
    document.querySelectorAll('.kpi-card').forEach(el => {
        el.classList.remove('active');
        el.style.borderColor = 'transparent';
    });
    let activeId = 'card-total';
    let activeColor = '#0d6efd';
    if (currentFilter === 'PRESENT') { activeId = 'card-present'; activeColor = '#198754'; }
    else if (currentFilter === 'ABSENT') { activeId = 'card-absent'; activeColor = '#dc3545'; }
    else if (currentFilter === 'OTHER') { activeId = 'card-other'; activeColor = '#ffc107'; }
    
    const activeCard = document.getElementById(activeId);
    if(activeCard) {
        activeCard.classList.add('active');
        activeCard.style.borderColor = activeColor;
    }

    document.querySelectorAll('th.sortable i').forEach(icon => icon.className = 'fas fa-sort sort-icon');
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        if (th.getAttribute('onclick') && th.getAttribute('onclick').includes(`'${currentSort.column}'`)) {
            const icon = th.querySelector('i');
            icon.className = currentSort.order === 'asc' ? 'fas fa-sort-up sort-icon' : 'fas fa-sort-down sort-icon';
        }
    });
}

function getStatusBadge(status) {
    if (!status) return '<span class="badge bg-secondary">-</span>';
    const s = status.toUpperCase();
    if (s === 'PRESENT') return '<span class="badge bg-success">PRESENT</span>';
    if (s === 'LATE') return '<span class="badge bg-warning text-dark">LATE</span>';
    if (s === 'ABSENT') return '<span class="badge bg-danger">ABSENT</span>';
    if (s.includes('LEAVE')) return '<span class="badge bg-info text-dark">' + s + '</span>';
    return `<span class="badge bg-secondary">${s}</span>`;
}

function formatTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    if (d.getFullYear() <= 1970) return '-';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
}

function showAutoSyncSpinner() {
    // Legacy function support
}

// --- Edit Log / Emp / Shift ---
window.openEditLogModal = function(logId) {
    const log = allManpowerData.find(l => l.log_id == logId);
    if (!log) return;
    document.getElementById('editLogId').value = log.log_id;
    document.getElementById('editEmpName').value = `${log.emp_id} - ${log.name_th}`;
    document.getElementById('editStatus').value = log.status || 'ABSENT';
    document.getElementById('editRemark').value = log.remark || '';
    let inVal = ''; if (log.scan_in_time) inVal = log.scan_in_time.replace(' ', 'T').substring(0, 16);
    document.getElementById('editScanInTime').value = inVal;
    let outVal = ''; if (log.scan_out_time) outVal = log.scan_out_time.replace(' ', 'T').substring(0, 16);
    document.getElementById('editScanOutTime').value = outVal;
    editLogModal.show();
}

async function saveLogChanges() {
    const logId = document.getElementById('editLogId').value;
    const status = document.getElementById('editStatus').value;
    const remark = document.getElementById('editRemark').value;
    let scanIn = document.getElementById('editScanInTime').value; if (scanIn) scanIn = scanIn.replace('T', ' ') + ':00';
    let scanOut = document.getElementById('editScanOutTime').value; if (scanOut) scanOut = scanOut.replace('T', ' ') + ':00';
    showSpinner(); // อันนี้เป็น Modal แก้ไข ยังใช้ Spinner ได้
    try {
        const res = await fetch('api/update_daily_manpower.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ log_id: logId, status: status, remark: remark, scan_in_time: scanIn, scan_out_time: scanOut }) });
        const json = await res.json();
        if (json.success) { showToast('Updated successfully', '#198754'); editLogModal.hide(); loadManpowerData(false); } else { showToast(json.message, '#dc3545'); }
    } catch (err) { console.error(err); showToast('Error updating record', '#dc3545'); } finally { hideSpinner(); }
}

window.editEmployee = function(empId) {
    const empRow = allManpowerData.find(r => r.emp_id == empId);
    if (!empRow) return;
    document.getElementById('empEditId').value = empId;
    document.getElementById('empEditName').value = `${empId} - ${empRow.name_th}`;
    document.getElementById('empEditLine').value = empRow.line || '';
    document.getElementById('empEditTeam').value = empRow.team_group || '';
    document.getElementById('empEditShift').value = empRow.default_shift_id || 1;
    if (!editEmployeeModal) { const el = document.getElementById('editEmployeeModal'); editEmployeeModal = new bootstrap.Modal(el); }
    editEmployeeModal.show();
}

window.saveEmployeeInfo = async function() {
    const empId = document.getElementById('empEditId').value;
    const line = document.getElementById('empEditLine').value;
    const shiftId = document.getElementById('empEditShift').value;
    const team = document.getElementById('empEditTeam').value;
    if(!line) { alert("Please select Line"); return; }
    showSpinner();
    try {
        const res = await fetch(`${API_MANAGE_EMP}?action=update`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ emp_id: empId, line: line, shift_id: shiftId, team_group: team, is_active: 1 }) });
        const json = await res.json();
        if (json.success) { showToast('Employee info updated!', '#198754'); editEmployeeModal.hide(); loadManpowerData(false); } else { showToast(json.message, '#dc3545'); }
    } catch (err) { console.error(err); showToast('Error saving data', '#dc3545'); } finally { hideSpinner(); }
}

async function loadFilterOptions() {
    try {
        const res = await fetch(`${API_MANAGE_EMP}?action=read`);
        const json = await res.json();
        if (json.success) {
            const lineSelect = document.getElementById('empEditLine');
            const shiftSelect = document.getElementById('empEditShift');
            if(lineSelect) { let lineHtml = '<option value="">-- Select Line --</option>'; json.lines.forEach(l => lineHtml += `<option value="${l}">${l}</option>`); lineSelect.innerHTML = lineHtml; }
            if(shiftSelect) { let shiftHtml = ''; json.shifts.forEach(s => shiftHtml += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time.substring(0,5)})</option>`); shiftSelect.innerHTML = shiftHtml; }
        }
    } catch (e) { console.error("Error loading options", e); }
}

let availableShifts = [];
async function openShiftPlanner() {
    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php?action=get_options');
        const json = await res.json();
        if (json.success) { availableShifts = json.shifts; renderShiftPlannerTable(json.lines, json.shifts, json.current_assignments); shiftPlannerModal.show(); } else { alert(json.message); }
    } catch (err) { console.error(err); alert('Failed to load planner'); } finally { hideSpinner(); }
}

function renderShiftPlannerTable(lines, shifts, currentAssignments = {}) {
    const tbody = document.getElementById('shiftPlannerBody');
    tbody.innerHTML = '';
    const createOptions = (currentShiftId) => {
        let html = '<option value="">-- Select --</option>';
        shifts.forEach(s => { const isSelected = (s.shift_id == currentShiftId) ? 'selected' : ''; const labelPrefix = isSelected ? '★ ' : ''; const classText = isSelected ? 'fw-bold text-dark' : ''; html += `<option value="${s.shift_id}" ${isSelected} class="${classText}">${labelPrefix}${s.shift_name} (${s.start_time.substring(0,5)})</option>`; });
        return html;
    };
    lines.forEach((line, index) => {
        const safeLine = line.replace(/"/g, '&quot;');
        const currentA = currentAssignments[line] ? currentAssignments[line]['A'] : null;
        const currentB = currentAssignments[line] ? currentAssignments[line]['B'] : null;
        tbody.innerHTML += `
            <tr id="row-${index}">
                <td class="ps-4 fw-bold text-primary align-middle">${line}</td>
                <td><div class="input-group input-group-sm"><span class="input-group-text bg-primary text-white fw-bold" style="width:30px;">A</span><select class="form-select fw-bold text-primary" id="shiftA-${index}">${createOptions(currentA)}</select></div></td>
                <td class="text-center align-middle"><button class="btn btn-sm btn-light border rounded-circle shadow-sm" onclick="swapDropdowns(${index})"><i class="fas fa-exchange-alt text-secondary"></i></button></td>
                <td><div class="input-group input-group-sm"><span class="input-group-text bg-warning text-dark fw-bold" style="width:30px;">B</span><select class="form-select fw-bold text-dark" id="shiftB-${index}">${createOptions(currentB)}</select></div></td>
                <td class="text-center pe-4 align-middle"><button class="btn btn-sm btn-outline-success fw-bold w-100" onclick="saveTeamShift('${safeLine}', ${index})"><i class="fas fa-save me-1"></i> Save</button></td>
            </tr>`;
    });
}

window.swapDropdowns = function(index) { const selA = document.getElementById(`shiftA-${index}`); const selB = document.getElementById(`shiftB-${index}`); const valA = selA.value; selA.value = selB.value; selB.value = valA; }

window.saveTeamShift = async function(line, index) {
    const shiftA = document.getElementById(`shiftA-${index}`).value;
    const shiftB = document.getElementById(`shiftB-${index}`).value;
    if (!shiftA && !shiftB) { alert("กรุณาเลือกกะอย่างน้อย 1 ทีม"); return; }
    if (!confirm(`ยืนยันการเปลี่ยนกะสำหรับ Line: ${line}?`)) return;
    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ action: 'update_team_shift', line: line, shift_a: shiftA, shift_b: shiftB }) });
        const json = await res.json();
        if (json.success) { if(typeof showToast === 'function') showToast(json.message, '#198754'); else alert(json.message); } else { alert(json.message); }
    } catch (err) { console.error(err); alert('Update failed'); } finally { hideSpinner(); }
}