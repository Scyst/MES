// page/manpower/script/manpower.js

const API_SYNC_URL = 'api/sync_from_api.php';
const API_GET_URL = 'api/get_daily_manpower.php';

let editLogModal;
let allManpowerData = []; 
let currentPage = 1;
const rowsPerPage = 50;   

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('editLogModal');
    if(modalEl) editLogModal = new bootstrap.Modal(modalEl);

    loadManpowerData();
});

async function syncApiData() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    
    if(!confirm(`Confirm Sync from ${start} to ${end}?`)) return;

    showSpinner();
    try {
        const response = await fetch(`${API_SYNC_URL}?startDate=${start}&endDate=${end}`);
        const result = await response.json();
        if(result.success) {
            showToast(result.message, '#198754');
            loadManpowerData();
        } else {
            showToast(result.message || 'Sync failed', '#dc3545');
        }
    } catch (err) {
        console.error(err);
        showToast('Error connecting to server', '#dc3545');
    } finally {
        hideSpinner();
    }
}

async function loadManpowerData() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const tbody = document.getElementById('manpowerTableBody');
    
    allManpowerData = [];
    currentPage = 1;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4"><div class="spinner-border text-primary" role="status"></div><br>Loading data...</td></tr>';
    
    try {
        const response = await fetch(`${API_GET_URL}?startDate=${start}&endDate=${end}`);
        const result = await response.json();

        if (result.success) {
            const summary = result.summary;
            document.getElementById('kpi-total').textContent = summary.total || 0;
            document.getElementById('kpi-present').textContent = summary.present || 0;
            document.getElementById('kpi-absent').textContent = summary.absent || 0;
            document.getElementById('kpi-other').textContent = summary.other_total || 0;

            allManpowerData = result.data || [];

            const today = new Date().toISOString().slice(0, 10);
            if (allManpowerData.length === 0 && start === end && start === today) {
                showToast("Auto-syncing data...", "#0d6efd");
                await syncApiData();
                return;
            }
            
            if (allManpowerData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No data found.</td></tr>';
                updatePaginationInfo();
            } else {
                renderTablePage(1);
            }
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Failed to load data.</td></tr>';
    }
}

function renderTablePage(page) {
    const tbody = document.getElementById('manpowerTableBody');
    currentPage = page;

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = allManpowerData.slice(start, end);

    const rowsHTML = pageData.map(row => {
        const empId = row.emp_id || '-';
        const name = row.name_th || 'Unknown';
        const pos = row.position || '-';
        const line = row.line || '-';
        const time = row.scan_time_display || '-';
        const status = row.status || 'UNKNOWN';

        let badgeClass = 'bg-secondary';
        if (status === 'PRESENT') badgeClass = 'bg-success';
        else if (status === 'ABSENT') badgeClass = 'bg-danger';
        else if (status === 'LATE') badgeClass = 'bg-warning text-dark';
        else if (status.includes('LEAVE')) badgeClass = 'bg-info text-dark';

        return `
            <tr>
                <td><small>${empId}</small></td>
                <td class="fw-bold">${name}</td>
                <td>${pos}</td>
                <td><span class="badge bg-light text-dark border">${line}</span></td>
                <td>-</td>
                <td>${time}</td>
                <td><span class="badge ${badgeClass} status-badge">${status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary" onclick='openEditLog(${JSON.stringify(row)})'>
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
    const totalItems = allManpowerData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startItem = totalItems === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalItems);

    document.getElementById('pageInfo').textContent = `Showing ${startItem} to ${endItem} of ${totalItems} entries`;

    const nav = document.getElementById('paginationControls');
    let buttons = '';

    buttons += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                    <a class="page-link" href="#" onclick="event.preventDefault(); renderTablePage(${currentPage - 1})">Previous</a>
                </li>`;

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

function openEditLog(row) {
    if (!editLogModal) return;

    document.getElementById('editLogId').value = row.log_id;
    document.getElementById('editEmpName').value = `${row.emp_id} - ${row.name_th}`;
    document.getElementById('editStatus').value = row.status || 'ABSENT';
    document.getElementById('editRemark').value = row.remark || '';
    
    let timeVal = '';
    if (row.scan_in_time) {
        timeVal = row.scan_in_time.substring(0, 16).replace(' ', 'T');
    }
    document.getElementById('editScanTime').value = timeVal;
    editLogModal.show();
}

async function saveLogChanges() {
    const logId = document.getElementById('editLogId').value;
    const status = document.getElementById('editStatus').value;
    const remark = document.getElementById('editRemark').value;
    let scanTime = document.getElementById('editScanTime').value;

    if (scanTime) {
        scanTime = scanTime.replace('T', ' ') + ':00'; 
    }

    showSpinner();
    try {
        const res = await fetch('api/update_daily_manpower.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ 
                log_id: logId, 
                status: status, 
                remark: remark,
                scan_time: scanTime
            })
        });
        const json = await res.json();

        if (json.success) {
            showToast('Updated successfully', '#198754');
            editLogModal.hide();
            loadManpowerData();
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

let shiftPlannerModal;
let availableShifts = [];

document.addEventListener('DOMContentLoaded', () => {
    // Init modal
    const el = document.getElementById('shiftPlannerModal');
    if(el) shiftPlannerModal = new bootstrap.Modal(el);
});

async function openShiftPlanner() {
    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php?action=get_options');
        const json = await res.json();

        if (json.success) {
            availableShifts = json.shifts;
            // ส่ง current_assignments ไปด้วย
            renderShiftPlannerTable(json.lines, json.shifts, json.current_assignments); 
            shiftPlannerModal.show();
        } else {
            alert(json.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load planner data');
    } finally {
        hideSpinner();
    }
}

function renderShiftPlannerTable(lines, shifts, currentAssignments = {}) {
    const tbody = document.getElementById('shiftPlannerBody');
    tbody.innerHTML = '';

    // Helper: สร้าง Options และเลือกค่าปัจจุบัน (Selected)
    const createOptions = (currentShiftId) => {
        let html = '<option value="">-- Select --</option>';
        shifts.forEach(s => {
            // เช็คว่าตรงกับค่าปัจจุบันไหม
            const isSelected = (s.shift_id == currentShiftId) ? 'selected' : '';
            // เพิ่มดาว ★ หน้าชื่อกะปัจจุบันเพื่อให้สังเกตง่าย
            const labelPrefix = isSelected ? '★ ' : ''; 
            const classText = isSelected ? 'fw-bold text-dark' : '';
            
            html += `<option value="${s.shift_id}" ${isSelected} class="${classText}">
                        ${labelPrefix}${s.shift_name} (${s.start_time.substring(0,5)})
                     </option>`;
        });
        return html;
    };

    lines.forEach((line, index) => {
        const safeLine = line.replace(/"/g, '&quot;');
        
        // หาค่ากะปัจจุบันของ Team A และ B ในไลน์นี้
        const currentA = currentAssignments[line] ? currentAssignments[line]['A'] : null;
        const currentB = currentAssignments[line] ? currentAssignments[line]['B'] : null;

        tbody.innerHTML += `
            <tr id="row-${index}">
                <td class="ps-4 fw-bold text-primary align-middle">${line}</td>
                
                <td>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-primary text-white fw-bold" style="width:30px;">A</span>
                        <select class="form-select fw-bold text-primary" id="shiftA-${index}">
                            ${createOptions(currentA)}
                        </select>
                    </div>
                </td>

                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-light border rounded-circle shadow-sm" onclick="swapDropdowns(${index})" title="สลับกะ A <-> B">
                        <i class="fas fa-exchange-alt text-secondary"></i>
                    </button>
                </td>

                <td>
                    <div class="input-group input-group-sm">
                        <span class="input-group-text bg-warning text-dark fw-bold" style="width:30px;">B</span>
                        <select class="form-select fw-bold text-dark" id="shiftB-${index}">
                            ${createOptions(currentB)}
                        </select>
                    </div>
                </td>

                <td class="text-center pe-4 align-middle">
                    <button class="btn btn-sm btn-outline-success fw-bold w-100" onclick="saveTeamShift('${safeLine}', ${index})">
                        <i class="fas fa-save me-1"></i> Save
                    </button>
                </td>
            </tr>
        `;
    });
}

// ฟังก์ชันสลับค่า Dropdown A <-> B (เพื่อความไว)
function swapDropdowns(index) {
    const selA = document.getElementById(`shiftA-${index}`);
    const selB = document.getElementById(`shiftB-${index}`);
    
    const valA = selA.value;
    selA.value = selB.value;
    selB.value = valA;
}

async function saveTeamShift(line, index) {
    const shiftA = document.getElementById(`shiftA-${index}`).value;
    const shiftB = document.getElementById(`shiftB-${index}`).value;

    if (!shiftA && !shiftB) {
        alert("กรุณาเลือกกะอย่างน้อย 1 ทีม");
        return;
    }

    if (!confirm(`ยืนยันการเปลี่ยนกะสำหรับ Line: ${line} ?\n\nTeam A -> ${getShiftName(shiftA)}\nTeam B -> ${getShiftName(shiftB)}`)) {
        return;
    }

    showSpinner();
    try {
        const res = await fetch('api/batch_shift_update.php', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                action: 'update_team_shift',
                line: line,
                shift_a: shiftA,
                shift_b: shiftB
            })
        });
        const json = await res.json();

        if (json.success) {
            // alert(json.message);
            // ใช้ Toast หรือเปลี่ยนสีปุ่มให้รู้ว่าเสร็จ
            const btn = document.querySelector(`#row-${index} .btn-outline-success`);
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Saved';
            btn.classList.replace('btn-outline-success', 'btn-success');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.replace('btn-success', 'btn-outline-success');
            }, 2000);

            if(typeof showToast === 'function') showToast(json.message, '#198754');
            else alert(json.message);

        } else {
            alert(json.message);
        }
    } catch (err) {
        console.error(err);
        alert('Update failed');
    } finally {
        hideSpinner();
    }
}

function getShiftName(id) {
    if (!id) return "No Change";
    const s = availableShifts.find(x => x.shift_id == id);
    return s ? s.shift_name : id;
}