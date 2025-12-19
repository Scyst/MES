"use strict";

// --- API Configuration ---
const API_SYNC_URL    = 'api/sync_from_api.php';
const API_GET_URL     = 'api/get_daily_manpower.php';
const API_MANAGE_EMP  = 'api/manage_employees.php';
const API_SUMMARY_URL = 'api/get_manpower_summary.php';
const API_MAPPING     = 'api/manage_mapping.php';

// --- Global Variables ---
let editLogModal, shiftPlannerModal, editEmployeeModal, mappingModal;
let allManpowerData = [];
let displayGroups = []; 

// Pagination & Sort State
let currentPage = 1;
const rowsPerPage = 50;
let currentFilter = 'TOTAL'; 

// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1.1 Init Modals
    const logEl = document.getElementById('editLogModal');
    if(logEl) editLogModal = new bootstrap.Modal(logEl);
    
    const shiftEl = document.getElementById('shiftPlannerModal');
    if(shiftEl) shiftPlannerModal = new bootstrap.Modal(shiftEl);

    const empEl = document.getElementById('editEmployeeModal');
    if(empEl) editEmployeeModal = new bootstrap.Modal(empEl);

    const mapEl = document.getElementById('mappingModal');
    if(mapEl) mappingModal = new bootstrap.Modal(mapEl);

    // 1.2 Bind Events
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    
    if (startInput) startInput.addEventListener('change', refreshData);
    if (endInput) endInput.addEventListener('change', refreshData);

    // 1.3 Initial Load
    refreshData();
    loadFilterOptions();
});

// ==========================================
// 2. Main Logic: Refresh Data
// ==========================================
function refreshData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    // Validate Range
    if (startDate > endDate) {
        document.getElementById('endDate').value = startDate;
        loadManpowerList(startDate, startDate);
        loadExecutiveSummary(startDate, startDate);
    } else {
        loadManpowerList(startDate, endDate);
        loadExecutiveSummary(startDate, endDate);
    }
}

// ==========================================
// 3. Sync Logic (Day-by-Day Queue) *** ไฮไลท์ ***
// ==========================================
window.syncApiData = async function(manual) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (manual && !confirm(`ยืนยันการดึงข้อมูลจาก Scanner?\nช่วงเวลา: ${startDate} ถึง ${endDate}`)) return;

    // 1. เปิด Loader
    const loader = document.getElementById('syncLoader');
    const statusText = document.getElementById('syncStatusText');
    const detailText = document.getElementById('syncProgressDetailText');
    
    if (loader) loader.style.display = 'block';

    // 2. สร้างรายการวันที่ต้อง Sync
    const dateList = [];
    let temp = new Date(startDate);
    const last = new Date(endDate);
    
    // Logic พิเศษ: ถ้าเลือกวันเดียว ให้แถมเมื่อวานด้วย (เพื่อเก็บตกกะดึก)
    if (startDate === endDate) {
        const yesterday = new Date(startDate);
        yesterday.setDate(yesterday.getDate() - 1);
        dateList.push(yesterday.toISOString().split('T')[0]);
    }

    while (temp <= last) {
        dateList.push(temp.toISOString().split('T')[0]);
        temp.setDate(temp.getDate() + 1);
    }

    // 3. เริ่มวนลูปยิง API ทีละวัน (Queue)
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dateList.length; i++) {
        const targetDate = dateList[i];
        
        // อัปเดตข้อความบนหน้าจอ (Real Progress)
        if (statusText) statusText.innerText = `กำลังประมวลผล... (${i + 1}/${dateList.length})`;
        if (detailText) detailText.innerText = `ดึงข้อมูลและคำนวณค่าแรงประจำวันที่: ${targetDate}`;

        try {
            // เรียก API แบบเจาะจงวันเดียว
            const res = await fetch(`${API_SYNC_URL}?startDate=${targetDate}&endDate=${targetDate}`);
            const json = await res.json();

            if (json.success) {
                successCount++;
            } else {
                console.error(`Sync Error at ${targetDate}:`, json.message);
                errorCount++;
            }
        } catch (e) {
            console.error(`Network Error at ${targetDate}:`, e);
            errorCount++;
        }
    }

    // 4. เสร็จสิ้น
    if (statusText) statusText.innerText = 'เสร็จสมบูรณ์!';
    
    setTimeout(() => {
        if (loader) loader.style.display = 'none';
        
        if (errorCount === 0) {
            // alert(`Sync สำเร็จครบ ${successCount} วัน`);
        } else {
            alert(`Sync เสร็จสิ้น: สำเร็จ ${successCount} วัน, ล้มเหลว ${errorCount} วัน`);
        }
        
        refreshData(); // โหลดข้อมูลใหม่ขึ้นหน้าจอ
    }, 500);
}

// ==========================================
// 4. Executive Summary (Report)
// ==========================================
async function loadExecutiveSummary(startDate, endDate) {
    try {
        const res = await fetch(`${API_SUMMARY_URL}?startDate=${startDate}&endDate=${endDate}`);
        const json = await res.json();

        if (json.success) {
            const label = document.getElementById('lastUpdateLabel');
            if(label && json.last_update) label.innerText = json.last_update;

            renderSummaryTable('tableByLine', json.summary_by_line, ['line_name', 'total_people']);
            renderSummaryTable('tableByShift', json.summary_by_shift_team, ['shift_name', 'team_name', 'total_people']);
            renderSummaryTable('tableByType', json.summary_by_type, ['emp_type', 'total_people']);
        }
    } catch (e) {
        console.error("Summary Error:", e);
    }
}

function renderSummaryTable(tableId, data, columns) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${columns.length}" class="text-center text-muted small py-3">No Data</td></tr>`;
        return;
    }

    let grandTotal = 0;
    data.forEach(row => {
        let tr = '<tr>';
        columns.forEach((col, index) => {
            const val = row[col] !== null ? row[col] : '-';
            if (index === columns.length - 1) {
                tr += `<td class="text-end fw-bold">${val}</td>`;
                grandTotal += parseInt(val) || 0;
            } else {
                tr += `<td>${val}</td>`;
            }
        });
        tr += '</tr>';
        tbody.innerHTML += tr;
    });

    const colspan = columns.length - 1;
    tbody.innerHTML += `
        <tr class="table-light fw-bold" style="border-top: 2px solid #dee2e6;">
            <td colspan="${colspan}">TOTAL</td>
            <td class="text-end text-primary">${grandTotal}</td>
        </tr>`;
}

// ==========================================
// 5. Manpower List (Accordion Table)
// ==========================================
async function loadManpowerList(startDate, endDate) {
    // Show spinner only if empty
    if (allManpowerData.length === 0) showSpinner();
    
    try {
        const t = new Date().getTime();
        const res = await fetch(`${API_GET_URL}?startDate=${startDate}&endDate=${endDate}&t=${t}`);
        const json = await res.json();

        if (json.success) {
            allManpowerData = json.data || [];
            updateKPI(json.summary);
            processData(); 
        }
    } catch (e) {
        console.error(e);
    } finally {
        hideSpinner();
    }
}

function processData() {
    // 1. Filter
    let filteredLogs = allManpowerData;
    if (currentFilter !== 'TOTAL') {
        filteredLogs = allManpowerData.filter(d => {
            if (currentFilter === 'PRESENT') return d.status === 'PRESENT';
            if (currentFilter === 'LATE') return d.status === 'LATE';
            if (currentFilter === 'ABSENT') return d.status === 'ABSENT';
            if (currentFilter === 'OTHER') return !['PRESENT','LATE','ABSENT'].includes(d.status);
            return true;
        });
    }

    // 2. Group By Employee
    const groups = {};
    filteredLogs.forEach(log => {
        if (!groups[log.emp_id]) {
            groups[log.emp_id] = {
                emp_info: log,
                logs: [],
                stats: { present: 0, late: 0, absent: 0, other: 0 }
            };
        }
        groups[log.emp_id].logs.push(log);
        
        const s = (log.status || '').toUpperCase();
        if (s === 'PRESENT') groups[log.emp_id].stats.present++;
        else if (s === 'LATE') groups[log.emp_id].stats.late++;
        else if (s === 'ABSENT') groups[log.emp_id].stats.absent++;
        else groups[log.emp_id].stats.other++;
    });

    displayGroups = Object.values(groups);

    // 3. Sort
    displayGroups.sort((a, b) => {
        const lineA = a.emp_info.line || 'ZZ';
        const lineB = b.emp_info.line || 'ZZ';
        if (lineA !== lineB) return lineA.localeCompare(lineB);
        return (a.emp_info.emp_id || '').localeCompare(b.emp_info.emp_id || '');
    });

    currentPage = 1;
    renderMainTable();
}

function renderMainTable() {
    const tbody = document.getElementById('manpowerTableBody');
    const pageInfo = document.getElementById('pageInfo');
    tbody.innerHTML = '';

    if (displayGroups.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>`;
        if(pageInfo) pageInfo.innerText = 'Showing 0 entries';
        return;
    }

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, displayGroups.length);
    const slice = displayGroups.slice(start, end);

    if(pageInfo) pageInfo.innerText = `Showing ${start+1} to ${end} of ${displayGroups.length} employees`;

    slice.forEach(group => {
        const info = group.emp_info;
        const stats = group.stats;
        const rowId = `emp-${info.emp_id}`;

        let summaryBadges = '';
        if(stats.present > 0) summaryBadges += `<span class="badge bg-success me-1">${stats.present} มา</span>`;
        if(stats.late > 0)    summaryBadges += `<span class="badge bg-warning text-dark me-1">${stats.late} สาย</span>`;
        if(stats.absent > 0)  summaryBadges += `<span class="badge bg-danger me-1">${stats.absent} ขาด</span>`;
        if(summaryBadges === '') summaryBadges = '-';

        // Main Row
        const trMain = document.createElement('tr');
        trMain.className = 'align-middle cursor-pointer hover-bg collapsed';
        trMain.setAttribute('data-bs-toggle', 'collapse');
        trMain.setAttribute('data-bs-target', `#collapse-${rowId}`);
        
        trMain.innerHTML = `
            <td class="text-center"><i class="fas text-muted expand-icon fa-chevron-right"></i></td>
            <td class="fw-bold text-primary ps-2">${info.emp_id}</td>
            <td>
                <div class="fw-bold text-dark">${info.name_th || '-'}</div>
                <div class="small text-muted">
                    <i class="fas fa-briefcase me-1"></i>${info.department_api || '-'} 
                    <span class="mx-1 text-secondary">|</span> 
                    ${info.position || '-'}
                </div>
            </td>
            <td class="text-center"><span class="badge bg-light text-dark border">${info.line || '-'}</span></td>
            <td class="text-center"><span class="badge bg-info bg-opacity-10 text-info border border-info">${info.team_group || '-'}</span></td>
            <td class="text-center"><span class="badge bg-secondary">${info.shift_name || '-'}</span></td>
            <td class="text-center">${summaryBadges}</td>
        `;

        // Detail Row
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

        trMain.addEventListener('click', function() {
            const icon = this.querySelector('.expand-icon');
            if (this.classList.contains('collapsed')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            } else {
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            }
        });

        tbody.appendChild(trMain);
        tbody.appendChild(trDetail);
    });

    renderPagination();
}

function generateDetailRows(logs) {
    logs.sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
    return logs.map(log => {
        const statusBadge = getStatusBadge(log.status);
        const scanIn = formatTime(log.scan_in_time);
        const scanOut = formatTime(log.scan_out_time);
        const d = new Date(log.log_date);
        const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });

        return `
            <tr>
                <td class="fw-bold text-secondary">${dateStr}</td>
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

function formatTime(str) {
    if (!str) return '-';
    if (str.includes(' ')) return str.split(' ')[1].substring(0, 5);
    return str.substring(0, 5);
}

// ... (Helpers: Pagination, KPI, Modals) ...
function renderPagination() {
    const totalPages = Math.ceil(displayGroups.length / rowsPerPage);
    const nav = document.getElementById('paginationControls');
    if(!nav) return;
    
    let html = `<li class="page-item ${currentPage===1?'disabled':''}"><button class="page-link" onclick="changePage(${currentPage-1})">Prev</button></li>`;
    for(let i=1; i<=totalPages; i++) {
        if(i===1 || i===totalPages || (i >= currentPage-1 && i <= currentPage+1)) {
            html += `<li class="page-item ${currentPage===i?'active':''}"><button class="page-link" onclick="changePage(${i})">${i}</button></li>`;
        } else if (i === currentPage-2 || i === currentPage+2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    html += `<li class="page-item ${currentPage===totalPages?'disabled':''}"><button class="page-link" onclick="changePage(${currentPage+1})">Next</button></li>`;
    nav.innerHTML = html;
}

window.changePage = function(p) { if(p < 1) return; currentPage = p; renderMainTable(); }
window.setFilter = function(f) { currentFilter = f; processData(); }
function getStatusBadge(s) {
    if (s === 'PRESENT') return '<span class="badge bg-success">PRESENT</span>';
    if (s === 'LATE') return '<span class="badge bg-warning text-dark">LATE</span>';
    if (s === 'ABSENT') return '<span class="badge bg-danger">ABSENT</span>';
    return `<span class="badge bg-secondary">${s}</span>`;
}
function updateKPI(s) { if(!s)return; const e = (id,v)=>document.getElementById(id).innerText=v; e('kpi-total', s.total); e('kpi-present', s.present); e('kpi-late', s.late); e('kpi-absent', s.absent); }

function showSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'flex'; }
function hideSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'none'; }

// Modals
window.openEditLogModal = function(logId) {
    // หา log จาก allManpowerData (ซึ่งเป็น array รวม)
    const log = allManpowerData.find(d => d.log_id == logId);
    if(log) {
        document.getElementById('editLogId').value = logId;
        document.getElementById('editEmpName').value = log.name_th;
        document.getElementById('editStatus').value = log.status;
        document.getElementById('editLogShift').value = log.shift_id || ""; 
        const fmt = (t) => t ? t.replace(' ', 'T').substring(0, 16) : '';
        document.getElementById('editScanInTime').value = fmt(log.scan_in_time);
        document.getElementById('editScanOutTime').value = fmt(log.scan_out_time);
        editLogModal.show();
    }
}

window.saveLogChanges = async function() {
    const id=document.getElementById('editLogId').value;
    const st=document.getElementById('editStatus').value;
    const sh=document.getElementById('editLogShift').value;
    const rem=document.getElementById('editRemark').value;
    const si=document.getElementById('editScanInTime').value;
    const so=document.getElementById('editScanOutTime').value;
    showSpinner();
    try{
        const res=await fetch('api/update_daily_manpower.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({log_id:id,status:st,shift_id:sh,remark:rem,scan_in_time:si?si.replace('T',' '):null,scan_out_time:so?so.replace('T',' '):null})});
        const json=await res.json();
        if(json.success){ editLogModal.hide(); refreshData(); } else alert(json.message);
    } catch(e){console.error(e);} finally{hideSpinner();}
}

window.editEmployee = function(id) {
    const r = allManpowerData.find(d=>d.emp_id==id);
    if(r){
        document.getElementById('empEditId').value=id;
        document.getElementById('empEditName').value=r.name_th;
        document.getElementById('empEditLine').value=r.line;
        document.getElementById('empEditTeam').value=r.team_group;
        document.getElementById('empEditShift').value=r.default_shift_id||1;
        editEmployeeModal.show();
    }
}

window.saveEmployeeInfo = async function() {
    const id=document.getElementById('empEditId').value;
    const l=document.getElementById('empEditLine').value;
    const s=document.getElementById('empEditShift').value;
    const t=document.getElementById('empEditTeam').value;
    if(!l){alert('Line Required');return;}
    showSpinner();
    try{
        const res=await fetch(`${API_MANAGE_EMP}?action=update`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emp_id:id,line:l,shift_id:s,team_group:t,is_active:1})});
        const j=await res.json();
        if(j.success){ editEmployeeModal.hide(); refreshData(); } else alert(j.message);
    } catch(e){console.error(e);} finally{hideSpinner();}
}

window.openShiftPlanner = async function() {
    showSpinner();
    try{
        const res=await fetch('api/batch_shift_update.php?action=get_options');
        const j=await res.json();
        if(j.success){ renderShiftPlannerTable(j.lines,j.shifts); shiftPlannerModal.show(); }
    } catch(e){console.error(e);} finally{hideSpinner();}
}

function renderShiftPlannerTable(l,s){
    const tb=document.getElementById('shiftPlannerBody'); tb.innerHTML='';
    const o=s.map(x=>`<option value="${x.shift_id}">${x.shift_name}</option>`).join('');
    l.forEach((ln,i)=>{ tb.innerHTML+=`<tr><td class="fw-bold">${ln}</td><td><select id="sA_${i}" class="form-select">${o}</select></td><td><select id="sB_${i}" class="form-select">${o}</select></td><td><button class="btn btn-sm btn-success" onclick="saveBatchShift('${ln}',${i})">Save</button></td></tr>`; });
}

window.saveBatchShift = async function(l,i){
    const sa=document.getElementById(`sA_${i}`).value;
    const sb=document.getElementById(`sB_${i}`).value;
    if(!confirm('Confirm?'))return;
    showSpinner();
    try{
        await fetch('api/batch_shift_update.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_team_shift',line:l,assignments:{'A':sa,'B':sb}})});
        alert('Saved');
    } catch(e){console.error(e);} finally{hideSpinner();}
}

window.openMappingModal = async function() {
    mappingModal.show();
    try{
        const res=await fetch(`${API_MAPPING}?action=read_all`);
        const j=await res.json();
        if(j.success){
            const b=document.getElementById('categoryMappingBody');
            b.innerHTML=j.categories.map(r=>`<tr><td><input class="form-control cat-api" value="${r.api_position}"></td><td><input class="form-control cat-display" value="${r.category_name}"></td><td><input class="form-control cat-rate" value="${r.hourly_rate}"></td><td><button onclick="this.closest('tr').remove()">X</button></td></tr>`).join('');
            if(j.categories.length==0) addMappingRow('category');
        }
    } catch(e){}
}

window.addMappingRow=function(){
    const b=document.getElementById('categoryMappingBody');
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><input class="form-control cat-api"></td><td><input class="form-control cat-display"></td><td><input class="form-control cat-rate" value="0"></td><td><button onclick="this.closest('tr').remove()">X</button></td>`;
    b.appendChild(tr);
}

window.saveAllMappings=async function(){
    const c=Array.from(document.querySelectorAll('#categoryMappingBody tr')).map(r=>({api_position:r.querySelector('.cat-api').value,category_name:r.querySelector('.cat-display').value,hourly_rate:r.querySelector('.cat-rate').value})).filter(x=>x.api_position);
    showSpinner();
    try{
        const res=await fetch(`${API_MAPPING}?action=save_all`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({categories:c})});
        const j=await res.json();
        if(j.success){mappingModal.hide(); alert('Saved');}
    } catch(e){} finally{hideSpinner();}
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
    } catch (e) {}
}