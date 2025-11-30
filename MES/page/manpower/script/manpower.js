// page/manpower/script/manpower.js
"use strict";

const API_SYNC_URL = 'api/sync_from_api.php';
const API_GET_URL = 'api/get_daily_manpower.php';

// Global Variables
let editLogModal, shiftPlannerModal;
let allManpowerData = [];   // ข้อมูลดิบทั้งหมด
let displayData = [];       // ข้อมูลที่ผ่านการกรองและเรียงแล้ว (ใช้แสดงผล)

let currentPage = 1;
const rowsPerPage = 50;

// State for Filter & Sort
let currentFilter = 'TOTAL'; // TOTAL, PRESENT, ABSENT, OTHER
let currentSort = { column: 'log_date', order: 'desc' }; // asc, desc

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Init Modals
    const modalEl = document.getElementById('editLogModal');
    if(modalEl) editLogModal = new bootstrap.Modal(modalEl);
    
    const shiftEl = document.getElementById('shiftPlannerModal');
    if(shiftEl) shiftPlannerModal = new bootstrap.Modal(shiftEl);

    // Listeners
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.addEventListener('change', () => loadManpowerData(true));
    if (endInput) endInput.addEventListener('change', () => loadManpowerData(true));

    // Load Initial Data
    loadManpowerData();
});

// ==========================================
// 1. Data Loading
// ==========================================

async function loadManpowerData(checkAutoSync = true) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const tbody = document.getElementById('manpowerTableBody');
    
    tbody.innerHTML = '...'; // (Code เดิม)
    document.getElementById('lastUpdateLabel').innerText = 'Checking...';

    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_GET_URL}?startDate=${start}&endDate=${end}&t=${timestamp}`);
        
        const result = await response.json();

        if (result.success) {
            // Update KPI & Last Update
            const summary = result.summary;
            updateKPI(summary);
            
            document.getElementById('lastUpdateLabel').innerText = result.last_update || 'Never';

            allManpowerData = result.data || [];

            // Smart Sync Logic
            const todayStr = new Date().toISOString().slice(0, 10);
            const isToday = (start === todayStr && end === todayStr);
            
            if (checkAutoSync && isToday && allManpowerData.length === 0) {
                console.log("Auto-syncing...");
                await syncApiData(false); 
                return;
            }
            
            // Apply Filters & Render
            processData();

        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Failed to load data.</td></tr>';
    }
}

function updateKPI(summary) {
    const setText = (id, val) => document.getElementById(id).textContent = val || 0;
    setText('kpi-total', summary.total);
    setText('kpi-present', summary.present);
    setText('kpi-absent', summary.absent);
    setText('kpi-other', summary.other_total);
}

// ==========================================
// 2. Filter & Sort Logic (The Core) - [FIXED]
// ==========================================

function processData() {
    // 1. Filter Data
    if (currentFilter === 'TOTAL') {
        displayData = [...allManpowerData];
    } else {
        displayData = allManpowerData.filter(row => {
            // แปลง status เป็น String ตัวพิมพ์ใหญ่ และถ้าเป็น null ให้เป็น 'UNKNOWN'
            const s = (row.status || 'UNKNOWN').toUpperCase(); 
            
            if (currentFilter === 'PRESENT') return s === 'PRESENT';
            if (currentFilter === 'ABSENT') return s === 'ABSENT';
            
            if (currentFilter === 'OTHER') {
                return s !== 'PRESENT' && s !== 'ABSENT'; 
            }
            
            return true;
        });
    }

    // 2. Sort Data
    displayData.sort((a, b) => {
        // [FIX] ป้องกัน NULL ในการเรียงด้วย
        let valA = a[currentSort.column] || '';
        let valB = b[currentSort.column] || '';

        // Handle time comparison specifically
        if (currentSort.column === 'scan_in_time') {
            valA = valA || '9999-99-99'; // Nulls last
            valB = valB || '9999-99-99';
        }

        // แปลงเป็นตัวพิมพ์เล็กถ้าเป็น string เพื่อให้ sort แม่นยำ
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return currentSort.order === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.order === 'asc' ? 1 : -1;
        return 0;
    });

    // 3. Render
    if (displayData.length === 0) {
        const tbody = document.getElementById('manpowerTableBody');
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-5"><i class="fas fa-filter fa-3x mb-3 opacity-25"></i><br>No data matches filter.</td></tr>';
        document.getElementById('pageInfo').textContent = 'Showing 0 entries';
        document.getElementById('paginationControls').innerHTML = '';
    } else {
        renderTablePage(1);
    }
    
    // Update UI States
    updateUIState();
}

// เรียกโดยปุ่ม KPI
window.setFilter = function(filterType) {
    currentFilter = filterType;
    processData();
}

// เรียกโดยหัวตาราง
window.toggleSort = function(column) {
    if (currentSort.column === column) {
        // Toggle order
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        // New column, default to asc
        currentSort.column = column;
        currentSort.order = 'asc';
    }
    processData();
}

function updateUIState() {
    // Update Active Card
    document.querySelectorAll('.kpi-card').forEach(el => {
        el.classList.remove('active');
        el.style.borderColor = 'transparent';
    });
    
    let activeId = 'card-total';
    let activeColor = '#0d6efd'; // Primary

    if (currentFilter === 'PRESENT') { activeId = 'card-present'; activeColor = '#198754'; }
    else if (currentFilter === 'ABSENT') { activeId = 'card-absent'; activeColor = '#dc3545'; }
    else if (currentFilter === 'OTHER') { activeId = 'card-other'; activeColor = '#ffc107'; }

    const activeCard = document.getElementById(activeId);
    if(activeCard) {
        activeCard.classList.add('active');
        activeCard.style.borderColor = activeColor;
    }

    // Update Sort Icons
    document.querySelectorAll('th.sortable i').forEach(icon => icon.className = 'fas fa-sort sort-icon'); // Reset
    document.querySelectorAll('th.sortable').forEach(th => th.classList.remove('active'));

    // Find active header based on onclick attribute (a bit hacky but works simply)
    const headers = document.querySelectorAll('th.sortable');
    headers.forEach(th => {
        if (th.getAttribute('onclick').includes(`'${currentSort.column}'`)) {
            th.classList.add('active');
            const icon = th.querySelector('i');
            icon.className = currentSort.order === 'asc' ? 'fas fa-sort-up sort-icon' : 'fas fa-sort-down sort-icon';
        }
    });
}

// ==========================================
// 3. Table Rendering (Pagination)
// ==========================================

function renderTablePage(page) {
    const tbody = document.getElementById('manpowerTableBody');
    currentPage = page;

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = displayData.slice(start, end); // ใช้ displayData แทน allManpowerData

    const rowsHTML = pageData.map(row => {
        const empId = row.emp_id || '-';
        const name = row.name_th || 'Unknown';
        const pos = row.position || '-';
        const line = row.line || '-';
        const team = row.team_group ? `<span class="badge bg-light text-secondary border">${row.team_group}</span>` : '-';
        const status = (row.status || 'UNKNOWN').toUpperCase(); // Safe check

        // Logic เวลา เข้า-ออก
        let timeDisplay = '-';
        if (row.scan_in_time) {
            const inTime = row.scan_in_time.substring(11, 16); 
            timeDisplay = `<span class="text-success fw-bold">${inTime}</span>`;
            if (row.scan_out_time && row.scan_out_time !== row.scan_in_time) {
                const outTime = row.scan_out_time.substring(11, 16);
                timeDisplay += ` <span class="text-muted mx-1">-</span> <span class="text-danger fw-bold">${outTime}</span>`;
            }
        }

        // Badge Logic
        let badgeClass = 'bg-secondary';
        let icon = '';
        if (status === 'PRESENT') { badgeClass = 'bg-success'; icon = '<i class="fas fa-check me-1"></i>'; }
        else if (status === 'ABSENT') { badgeClass = 'bg-danger'; icon = '<i class="fas fa-times me-1"></i>'; }
        else if (status === 'LATE') { badgeClass = 'bg-warning text-dark'; icon = '<i class="fas fa-clock me-1"></i>'; }
        else if (status.includes('LEAVE')) { badgeClass = 'bg-info text-dark'; icon = '<i class="fas fa-file-medical me-1"></i>'; }
        else { badgeClass = 'bg-warning text-dark'; icon = '<i class="fas fa-question-circle me-1"></i>'; }

        const rowClass = (status === 'ABSENT') ? 'table-danger bg-opacity-10' : '';

        return `
            <tr class="${rowClass}">
                <td class="ps-4"><span class="font-monospace small text-muted">${formatDateShort(row.log_date)}</span></td>
                <td><span class="fw-bold text-primary">${empId}</span></td>
                <td>
                    <div class="fw-bold text-dark">${name}</div>
                    <small class="text-muted">${pos}</small>
                </td>
                <td class="text-center">${team}</td>
                <td><span class="badge bg-light text-dark border">${line}</span></td>
                <td class="text-center font-monospace small">${timeDisplay}</td>
                <td class="text-center"><span class="badge ${badgeClass} status-badge shadow-sm">${icon}${status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary rounded-circle" style="width:32px; height:32px;" onclick='openEditLog(${JSON.stringify(row)})'>
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHTML;
    updatePaginationInfo();
}

function updatePaginationInfo() {
    const totalItems = displayData.length; // ใช้ displayData
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalItems);

    document.getElementById('pageInfo').textContent = `Showing ${startItem} to ${endItem} of ${totalItems} entries`;

    const nav = document.getElementById('paginationControls');
    let buttons = '';

    buttons += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); renderTablePage(${currentPage - 1})">Previous</a>
                </li>`;

    // Logic ย่อหน้า (1 2 3 ... 10)
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            buttons += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" onclick="event.preventDefault(); renderTablePage(${i})">${i}</a>
                        </li>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            buttons += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    buttons += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); renderTablePage(${currentPage + 1})">Next</a>
                </li>`;

    nav.innerHTML = buttons;
}

// ==========================================
// 4. API Actions (Sync, Edit, Planner)
// ==========================================

async function syncApiData(manual = false) {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if(manual && !confirm(`ยืนยันการดึงข้อมูลจาก Scanner?\nช่วงเวลา: ${start} ถึง ${end}`)) return;

    if(manual) showSpinner(); 
    else showAutoSyncSpinner();

    try {
        const response = await fetch(`${API_SYNC_URL}?startDate=${start}&endDate=${end}`);
        const result = await response.json();
        if(result.success) {
            if(manual) showToast(result.message, '#198754');
            loadManpowerData(false);
        } else {
            if(manual) showToast(result.message || 'Sync failed', '#dc3545');
        }
    } catch (err) {
        console.error(err);
        if(manual) showToast('Error connecting to server', '#dc3545');
    } finally {
        hideSpinner();
    }
}

function openEditLog(row) {
    if (!editLogModal) return;
    document.getElementById('editLogId').value = row.log_id;
    document.getElementById('editEmpName').value = `${row.emp_id} - ${row.name_th}`;
    document.getElementById('editStatus').value = row.status || 'ABSENT';
    document.getElementById('editRemark').value = row.remark || '';
    
    let timeVal = '';
    if (row.scan_in_time) timeVal = row.scan_in_time.substring(0, 16);
    document.getElementById('editScanTime').value = timeVal;
    editLogModal.show();
}

async function saveLogChanges() {
    const logId = document.getElementById('editLogId').value;
    const status = document.getElementById('editStatus').value;
    const remark = document.getElementById('editRemark').value;
    let scanTime = document.getElementById('editScanTime').value;

    if (scanTime) scanTime = scanTime.replace('T', ' ') + ':00'; 

    showSpinner();
    try {
        const res = await fetch('api/update_daily_manpower.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ log_id: logId, status: status, remark: remark, scan_time: scanTime })
        });
        const json = await res.json();

        if (json.success) {
            showToast('Updated successfully', '#198754');
            editLogModal.hide();
            loadManpowerData(false);
        } else {
            showToast(json.message, '#dc3545');
        }
    } catch (err) {
        console.error(err);
        showToast('Error updating record', '#dc3545');
    } finally {
        hideSpinner();
    }
}

// Shift Planner Logic (เหมือนเดิม)
let availableShifts = [];
async function openShiftPlanner() {
    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php?action=get_options');
        const json = await res.json();
        if (json.success) {
            availableShifts = json.shifts;
            renderShiftPlannerTable(json.lines, json.shifts, json.current_assignments); 
            shiftPlannerModal.show();
        } else {
            alert(json.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load planner');
    } finally {
        hideSpinner();
    }
}

function renderShiftPlannerTable(lines, shifts, currentAssignments = {}) {
    const tbody = document.getElementById('shiftPlannerBody');
    tbody.innerHTML = '';
    const createOptions = (currentShiftId) => {
        let html = '<option value="">-- Select --</option>';
        shifts.forEach(s => {
            const isSelected = (s.shift_id == currentShiftId) ? 'selected' : '';
            const labelPrefix = isSelected ? '★ ' : ''; 
            const classText = isSelected ? 'fw-bold text-dark' : '';
            html += `<option value="${s.shift_id}" ${isSelected} class="${classText}">${labelPrefix}${s.shift_name} (${s.start_time.substring(0,5)})</option>`;
        });
        return html;
    };

    lines.forEach((line, index) => {
        const safeLine = line.replace(/"/g, '&quot;');
        const currentA = currentAssignments[line] ? currentAssignments[line]['A'] : null;
        const currentB = currentAssignments[line] ? currentAssignments[line]['B'] : null;

        tbody.innerHTML += `
            <tr id="row-${index}">
                <td class="ps-4 fw-bold text-primary align-middle">${line}</td>
                <td>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-primary text-white fw-bold" style="width:30px;">A</span>
                        <select class="form-select fw-bold text-primary" id="shiftA-${index}">${createOptions(currentA)}</select>
                    </div>
                </td>
                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm" onclick="swapDropdowns(${index})"><i class="fas fa-exchange-alt text-secondary"></i></button>
                </td>
                <td>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-warning text-dark fw-bold" style="width:30px;">B</span>
                        <select class="form-select fw-bold text-dark" id="shiftB-${index}">${createOptions(currentB)}</select>
                    </div>
                </td>
                <td class="text-center pe-4 align-middle">
                    <button class="btn btn-sm btn-outline-success fw-bold w-100" onclick="saveTeamShift('${safeLine}', ${index})"><i class="fas fa-save me-1"></i> Save</button>
                </td>
            </tr>
        `;
    });
}

function swapDropdowns(index) {
    const selA = document.getElementById(`shiftA-${index}`);
    const selB = document.getElementById(`shiftB-${index}`);
    const valA = selA.value; selA.value = selB.value; selB.value = valA;
}

async function saveTeamShift(line, index) {
    const shiftA = document.getElementById(`shiftA-${index}`).value;
    const shiftB = document.getElementById(`shiftB-${index}`).value;
    if (!shiftA && !shiftB) { alert("กรุณาเลือกกะอย่างน้อย 1 ทีม"); return; }
    if (!confirm(`ยืนยันการเปลี่ยนกะสำหรับ Line: ${line}?`)) return;

    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ action: 'update_team_shift', line: line, shift_a: shiftA, shift_b: shiftB })
        });
        const json = await res.json();
        if (json.success) {
            if(typeof showToast === 'function') showToast(json.message, '#198754');
            else alert(json.message);
        } else {
            alert(json.message);
        }
    } catch (err) { console.error(err); alert('Update failed'); } finally { hideSpinner(); }
}

// Helpers
function formatDateShort(dateStr) {
    if(!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
function showAutoSyncSpinner() {
    const overlay = document.getElementById('loadingOverlay');
    const text = overlay.querySelector('h5');
    if(text) text.innerText = "🚀 ระบบกำลังดึงข้อมูลล่าสุดให้อัตโนมัติ...";
    overlay.style.display = 'flex';
}