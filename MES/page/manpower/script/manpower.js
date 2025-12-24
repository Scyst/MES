// page/manpower/script/manpower.js
"use strict";

const API_SYNC_URL    = 'api/sync_from_api.php'; 
const API_GET_URL     = 'api/api_daily_operations.php?action=read_daily';
const API_SUMMARY_URL = 'api/api_daily_operations.php?action=read_summary';
const API_MANAGE_EMP  = 'api/api_master_data.php'; 
const API_MAPPING     = 'api/api_master_data.php';

// Global Variables
let editLogModal, shiftPlannerModal, editEmployeeModal, mappingModal;
let allManpowerData = [];
let rawSummaryData = [];  
let displayGroups = []; 
let currentViewMode = 'LINE'; 
let activeFilter = { type: null, value: null, subValue: null }; 
let currentPage = 1;
const rowsPerPage = 50;
let currentStatusFilter = 'TOTAL'; 

const SUMMARY_TABLE_HEADER = `
    <tr>
        <th class="ps-3 align-middle" style="width: 52%;">Categories</th>
        
        <th class="text-center text-primary border-end align-middle" style="width: 6%;">HC</th> 
        <th class="text-center align-middle" style="width: 6%;">Plan</th>
        <th class="text-center text-success align-middle" style="width: 6%;">Pres.</th>
        <th class="text-center text-info align-middle" style="width: 6%;">Leave</th>
        <th class="text-center text-danger align-middle" style="width: 6%;">Abs.</th>
        <th class="text-center text-warning align-middle" style="width: 6%;">Late</th>
        <th class="text-center border-start border-end align-middle" style="width: 6%;">Act.</th>
        <th class="text-center fw-bold align-middle" style="width: 6%;">Diff</th>
    </tr>`;

// ==========================================
// 1. Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Init Modals
    const logEl = document.getElementById('editLogModal'); if(logEl) editLogModal = new bootstrap.Modal(logEl);
    const shiftEl = document.getElementById('shiftPlannerModal'); if(shiftEl) shiftPlannerModal = new bootstrap.Modal(shiftEl);
    const empEl = document.getElementById('editEmployeeModal'); if(empEl) editEmployeeModal = new bootstrap.Modal(empEl);
    const mapEl = document.getElementById('mappingModal'); if(mapEl) mappingModal = new bootstrap.Modal(mapEl);

    // Date & Toggle Events
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const rangeToggle = document.getElementById('dateRangeToggle');

    if (rangeToggle) {
        rangeToggle.addEventListener('change', toggleDateMode);
    }

    if (startInput) {
        startInput.addEventListener('change', () => {
            // ถ้าไม่ได้เปิด Range Mode ให้ End Date ตาม Start Date เสมอ
            const isRange = document.getElementById('dateRangeToggle')?.checked;
            if (!isRange && endInput) {
                endInput.value = startInput.value;
            }
            refreshData();
        });
    }
    
    if (endInput) {
        endInput.addEventListener('change', refreshData);
    }

    setupViewSwitcher();
    refreshData();
    loadFilterOptions();
});

// [NEW] Toggle Date Mode Logic
function toggleDateMode() {
    const isRange = document.getElementById('dateRangeToggle').checked;
    const endWrapper = document.getElementById('endDateWrapper');
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (isRange) {
        // เปิดโหมดช่วงเวลา: โชว์ช่อง End Date
        endWrapper.classList.remove('d-none');
    } else {
        // ปิดโหมดช่วงเวลา: ซ่อนช่อง End Date และ Reset ค่า
        endWrapper.classList.add('d-none');
        if (startInput && endInput) {
            endInput.value = startInput.value;
            refreshData(); // โหลดข้อมูลใหม่ทันที
        }
    }
}

function setupViewSwitcher() {
    const container = document.getElementById('summaryViewControls');
    if(!container) return; 
    
    container.innerHTML = `
        <div class="btn-group shadow-sm" role="group">
            <input type="radio" class="btn-check" name="viewMode" id="viewLine" value="LINE" checked onchange="switchView('LINE')">
            <label class="btn btn-outline-primary px-3 btn-sm" for="viewLine"><i class="fas fa-list-ul me-2"></i>Line</label>

            <input type="radio" class="btn-check" name="viewMode" id="viewShift" value="SHIFT" onchange="switchView('SHIFT')">
            <label class="btn btn-outline-primary px-3 btn-sm" for="viewShift"><i class="fas fa-clock me-2"></i>Shift</label>

            <input type="radio" class="btn-check" name="viewMode" id="viewType" value="TYPE" onchange="switchView('TYPE')">
            <label class="btn btn-outline-primary px-3 btn-sm" for="viewType"><i class="fas fa-users me-2"></i>Type</label>
        </div>
    `;
}

// ==========================================
// 2. Main Logic: Refresh Data
// ==========================================
function refreshData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    resetTableFilter(false);

    // สลับค่าถ้า Start > End
    if (startDate > endDate) {
        document.getElementById('endDate').value = startDate;
        loadManpowerList(startDate, startDate);
        loadExecutiveSummary(startDate, startDate);
    } else {
        loadManpowerList(startDate, endDate);
        loadExecutiveSummary(startDate, endDate);
    }
}

window.resetTableFilter = function(redraw = true) {
    activeFilter = { type: null, value: null, subValue: null };
    
    const badge = document.getElementById('activeFilterBadge');
    if(badge) {
        badge.classList.add('d-none');
        badge.classList.remove('d-flex');
    }

    document.querySelectorAll('#mainSummaryTable tr').forEach(tr => tr.classList.remove('table-warning'));

    if(redraw) processData();
}

window.handleSummaryClick = function(event, filterType, mainValue, subValue = null) {
    const tr = event.currentTarget;
    
    if (tr.classList.contains('table-warning')) {
        tr.classList.remove('table-warning');
        resetTableFilter(true);
        return;
    }

    document.querySelectorAll('#mainSummaryTable tr').forEach(row => row.classList.remove('table-warning'));
    tr.classList.add('table-warning'); // ใช้ Bootstrap class หรือ custom css ก็ได้

    activeFilter = { type: filterType, value: mainValue, subValue: subValue };

    const badge = document.getElementById('activeFilterBadge');
    const txt = document.getElementById('activeFilterText');
    if(badge && txt) {
        let label = `${mainValue}`;
        if(subValue) label += ` > ${subValue}`;
        
        txt.innerText = label;
        badge.classList.remove('d-none');
        badge.classList.add('d-flex');
    }

    processData();
}

// ==========================================
// 3. Sync Logic (คงเดิม)
// ==========================================
window.syncApiData = async function(manual) {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (manual && !confirm(`ยืนยันการดึงข้อมูลจาก Scanner?\nช่วงเวลา: ${startDate} ถึง ${endDate}`)) return;

    const loader = document.getElementById('syncLoader');
    const statusText = document.getElementById('syncStatusText');
    const detailText = document.getElementById('syncProgressDetailText');
    
    if (loader) loader.style.display = 'block';

    const dateList = [];
    let temp = new Date(startDate);
    const last = new Date(endDate);
    
    if (startDate === endDate) {
        const yesterday = new Date(startDate);
        yesterday.setDate(yesterday.getDate() - 1);
        dateList.push(yesterday.toISOString().split('T')[0]);
    }

    while (temp <= last) {
        dateList.push(temp.toISOString().split('T')[0]);
        temp.setDate(temp.getDate() + 1);
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < dateList.length; i++) {
        const targetDate = dateList[i];
        if (statusText) statusText.innerText = `กำลังประมวลผล... (${i + 1}/${dateList.length})`;
        if (detailText) detailText.innerText = `ดึงข้อมูลและคำนวณค่าแรงประจำวันที่: ${targetDate}`;

        try {
            const res = await fetch(`${API_SYNC_URL}?startDate=${targetDate}&endDate=${targetDate}`);
            const json = await res.json();
            if (json.success) successCount++;
            else { console.error(`Sync Error at ${targetDate}:`, json.message); errorCount++; }
        } catch (e) { console.error(`Network Error at ${targetDate}:`, e); errorCount++; }
    }

    if (statusText) statusText.innerText = 'เสร็จสมบูรณ์!';
    setTimeout(() => {
        if (loader) loader.style.display = 'none';
        if (errorCount > 0) alert(`Sync เสร็จสิ้น: สำเร็จ ${successCount} วัน, ล้มเหลว ${errorCount} วัน`);
        refreshData(); 
    }, 500);
}

// ==========================================
// 4. Executive Summary Logic
// ==========================================
async function loadExecutiveSummary(startDate, endDate) {
    try {
        const res = await fetch(`${API_SUMMARY_URL}&date=${startDate}`);
        const json = await res.json();

        if (json.success) {
            const label = document.getElementById('lastUpdateLabel');
            if(label && json.last_update) label.innerText = json.last_update;

            rawSummaryData = json.raw_data || [];
            switchView(currentViewMode);
        }
    } catch (e) { console.error("Summary Error:", e); }
}

window.switchView = function(mode) {
    currentViewMode = mode;
    resetTableFilter(true);
    if (mode === 'LINE') renderByLine(rawSummaryData);
    else if (mode === 'SHIFT') renderByShift(rawSummaryData);
    else if (mode === 'TYPE') renderByType(rawSummaryData);
}

function getTableElements() {
    let tbody = document.querySelector('#mainSummaryTable tbody');
    let thead = document.querySelector('#mainSummaryTable thead'); 
    return { tbody, thead };
}

// [UPDATED] createRowHtml: ลบพื้นหลังทึบ (bg-*) ออก ใช้ border และ text color แทน
function createRowHtml(id, label, data, colorClass, bgClass, isParent, indentLevel=0, parentId=null, filterParams=null) {
    const toggleAttr = isParent ? `data-bs-toggle="collapse" data-bs-target=".${id}"` : '';
    // ใช้พื้นหลังแบบ transparent หรือ class ที่รองรับ theme
    // ถ้าเป็น Parent ให้พื้นหลังเข้มกว่า Child นิดนึง (ใช้ var--bs-tertiary-bg)
    const rowClass = isParent ? 'fw-bold border-bottom' : 'border-bottom';
    const rowStyle = isParent ? 'background-color: var(--bs-tertiary-bg);' : '';
    
    const collapseClass = parentId ? `collapse ${parentId}` : '';
    const icon = isParent ? '<i class="fas fa-caret-right me-2 transition-icon"></i>' : '';
    const padding = indentLevel > 0 ? `ps-${indentLevel}` : 'ps-3';
    
    const showHC = (data.total_hc !== null && data.total_hc !== undefined) ? data.total_hc : '<span class="text-muted opacity-25">-</span>';
    
    let diffHtml = data.diff > 0 ? `<span class="text-success fw-bold">+${data.diff}</span>` : 
                   (data.diff < 0 ? `<span class="text-danger fw-bold">${data.diff}</span>` : `<span class="text-muted opacity-25">-</span>`);

    let clickEvent = '';
    if (filterParams) {
        const main = filterParams.main.replace(/'/g, "\\'");
        const sub = filterParams.sub ? `'${filterParams.sub.replace(/'/g, "\\'")}'` : 'null';
        clickEvent = `onclick="handleSummaryClick(event, '${filterParams.type}', '${main}', ${sub}); if(this.getAttribute('data-bs-toggle')) this.querySelector('.fa-caret-right').classList.toggle('fa-rotate-90');"`;
    }

    return `
        <tr class="${rowClass} ${collapseClass} cursor-pointer" style="${rowStyle}" ${toggleAttr} ${clickEvent}>
            <td class="${padding} text-truncate" style="color: var(--bs-body-color);">${icon}${label}</td>
            <td class="text-center text-primary border-end">${showHC}</td>
            <td class="text-center text-secondary">${data.plan}</td>
            <td class="text-center text-success">${data.present}</td>
            <td class="text-center text-info">${data.leave||'-'}</td>
            <td class="text-center text-danger">${data.absent||'-'}</td>
            <td class="text-center text-warning">${data.late||'-'}</td>
            <td class="text-center fw-bold border-start border-end" style="color: var(--bs-body-color);">${data.actual}</td>
            <td class="text-center">${diffHtml}</td>
        </tr>`;
}

// ------------------------------------------------------------------
// 4.1 VIEW: BY LINE
// ------------------------------------------------------------------
function renderByLine(data) {
    const { tbody, thead } = getTableElements();
    if (!tbody || !thead) return;
    
    tbody.innerHTML = '';
    thead.innerHTML = SUMMARY_TABLE_HEADER.replace('Categories', 'Line Structure');

    if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No Data</td></tr>'; return; }

    const grouped = {};
    let grandTotal = { total_hc:0, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0 };

    data.forEach(row => {
        const line = row.line_name;
        const shiftKey = `${row.shift_name}::${row.team_group}`;

        if (!grouped[line]) {
            const lineHC = parseInt(row.total_hc) || 0;
            grouped[line] = { name: line, total_hc: lineHC, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0, shifts: {} };
            grandTotal.total_hc += lineHC;
        }
        if (!grouped[line].shifts[shiftKey]) {
            grouped[line].shifts[shiftKey] = { name: row.shift_name, team: row.team_group, total_hc: null, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0, types: [] };
        }
        const vals = parseRowValues(row);
        accumulate(grouped[line], vals);
        accumulate(grouped[line].shifts[shiftKey], vals);
        grouped[line].shifts[shiftKey].types.push({ name: row.emp_type, total_hc: null, ...vals });
        accumulate(grandTotal, vals);
    });

    Object.values(grouped).forEach((group, idx) => {
        const id = `L-${idx}`;
        tbody.innerHTML += createRowHtml(id, group.name, group, '', '', true, 0, null, { type: 'LINE', main: group.name });
        
        Object.values(group.shifts).forEach((shift, sIdx) => {
            const sId = `${id}-S-${sIdx}`;
            let meta = `<span class="badge bg-secondary bg-opacity-25 text-body border me-1">${shift.name}</span>` + (shift.team!='-'?`<span class="badge bg-info bg-opacity-25 text-body border">${shift.team}</span>`:'');
            const shiftVal = shift.team!='-' ? `${shift.name}::${shift.team}` : shift.name;
            tbody.innerHTML += createRowHtml(sId, meta, shift, '', '', true, 4, id, { type: 'LINE_SHIFT', main: group.name, sub: shiftVal });

            shift.types.forEach(type => {
                tbody.innerHTML += createRowHtml(null, `<span class="text-muted small"><i class="fas fa-circle me-2" style="font-size:0.4em;"></i>${type.name}</span>`, type, '', '', false, 5, sId, { type: 'LINE_SHIFT_TYPE', main: group.name, sub: `${shiftVal}|${type.name}` });
            });
        });
    });
    renderGrandTotal(tbody, grandTotal);
}

// ------------------------------------------------------------------
// 4.2 VIEW: BY SHIFT
// ------------------------------------------------------------------
function renderByShift(data) {
    const { tbody, thead } = getTableElements();
    if (!tbody || !thead) return;
    tbody.innerHTML = '';
    thead.innerHTML = SUMMARY_TABLE_HEADER.replace('Categories', 'Shift Breakdown');

    const grouped = {};
    let grandTotal = { total_hc:0, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0 };

    data.forEach(row => {
        const key = `${row.shift_name}::${row.team_group}`;
        if (!grouped[key]) grouped[key] = { name: row.shift_name, team: row.team_group, total_hc: 0, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0, lines: {} };
        const vals = parseRowValues(row);
        const rowHC = vals.plan;
        accumulate(grouped[key], vals);
        grouped[key].total_hc += rowHC;
        accumulate(grandTotal, vals);
        grandTotal.total_hc += rowHC;

        if(!grouped[key].lines[row.line_name]) {
            grouped[key].lines[row.line_name] = { name: row.line_name, total_hc: rowHC, ...vals };
        } else {
            accumulate(grouped[key].lines[row.line_name], vals);
            grouped[key].lines[row.line_name].total_hc += rowHC;
        }
    });

    Object.values(grouped).forEach((group, idx) => {
        const id = `S-${idx}`;
        let meta = `<span class="badge bg-secondary bg-opacity-25 text-body border me-1">${group.name}</span>` + (group.team!='-'?`<span class="badge bg-info bg-opacity-25 text-body border">${group.team}</span>`:'');
        const shiftVal = group.team!='-' ? `${group.name}::${group.team}` : group.name;
        tbody.innerHTML += createRowHtml(id, meta, group, '', '', true, 0, null, { type: 'SHIFT', main: shiftVal });

        Object.values(group.lines).forEach(line => {
             tbody.innerHTML += createRowHtml(null, `<span class="text-muted"><i class="fas fa-level-up-alt fa-rotate-90 me-2 text-secondary"></i>${line.name}</span>`, line, '', '', false, 4, id, { type: 'SHIFT_LINE', main: shiftVal, sub: line.name });
        });
    });
    renderGrandTotal(tbody, grandTotal);
}

// ------------------------------------------------------------------
// 4.3 VIEW: BY TYPE
// ------------------------------------------------------------------
function renderByType(data) {
    const { tbody, thead } = getTableElements();
    if (!tbody || !thead) return;
    tbody.innerHTML = '';
    thead.innerHTML = SUMMARY_TABLE_HEADER.replace('Categories', 'Employee Type');

    const grouped = {};
    let grandTotal = { total_hc:0, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0 };

    data.forEach(row => {
        const key = row.emp_type;
        if (!grouped[key]) grouped[key] = { name: row.emp_type, total_hc: 0, plan:0, present:0, late:0, absent:0, leave:0, actual:0, diff:0, lines: {} };
        const vals = parseRowValues(row);
        const rowHC = vals.plan;
        accumulate(grouped[key], vals);
        grouped[key].total_hc += rowHC;
        accumulate(grandTotal, vals);
        grandTotal.total_hc += rowHC;

        if(!grouped[key].lines[row.line_name]) {
            grouped[key].lines[row.line_name] = { name: row.line_name, total_hc: rowHC, ...vals };
        } else {
            accumulate(grouped[key].lines[row.line_name], vals);
            grouped[key].lines[row.line_name].total_hc += rowHC;
        }
    });

    Object.values(grouped).forEach((group, idx) => {
        const id = `T-${idx}`;
        tbody.innerHTML += createRowHtml(id, group.name, group, '', '', true, 0, null, { type: 'TYPE', main: group.name });

        Object.values(group.lines).forEach(line => {
             tbody.innerHTML += createRowHtml(null, `<span class="text-muted"><i class="fas fa-level-up-alt fa-rotate-90 me-2 text-secondary"></i>${line.name}</span>`, line, '', '', false, 4, id, { type: 'TYPE_LINE', main: group.name, sub: line.name });
        });
    });
    renderGrandTotal(tbody, grandTotal);
}

// --- Helpers ---
function parseRowValues(row) {
    return {
        plan: parseInt(row.plan)||0,
        present: parseInt(row.present)||0, late: parseInt(row.late)||0,
        absent: parseInt(row.absent)||0, leave: parseInt(row.leave)||0,
        actual: parseInt(row.actual)||0, diff: parseInt(row.diff)||0
    };
}

function accumulate(target, source) {
    target.plan += source.plan;
    target.present += source.present; target.late += source.late;
    target.absent += source.absent; target.leave += source.leave;
    target.actual += source.actual; target.diff += source.diff;
}

function renderGrandTotal(tbody, total) {
    // Grand Total Row - ใช้สีพื้นหลังที่ตัดกันเล็กน้อย (tertiary)
    tbody.innerHTML += `
        <tr class="fw-bold" style="background-color: var(--bs-tertiary-bg); border-top: 2px solid var(--bs-border-color);">
            <td class="ps-3">TOTAL</td>
            <td class="text-center text-primary border-end">${total.total_hc}</td>
            <td class="text-center text-secondary">${total.plan}</td>
            <td class="text-center text-success">${total.present}</td>
            <td class="text-center text-info">${total.leave}</td>
            <td class="text-center text-danger">${total.absent}</td>
            <td class="text-center text-warning">${total.late}</td>
            <td class="text-center border-start border-end" style="color: var(--bs-body-color);">${total.actual}</td>
            <td class="text-center">${total.diff > 0 ? `<span class="text-success">+${total.diff}</span>` : `<span class="text-danger">${total.diff}</span>`}</td>
        </tr>`;
}

// ==========================================
// 5. Manpower List (Accordion Table)
// ==========================================
async function loadManpowerList(startDate, endDate) {
    if (allManpowerData.length === 0) showSpinner();
    try {
        const t = new Date().getTime();
        const res = await fetch(`${API_GET_URL}&startDate=${startDate}&endDate=${endDate}&t=${t}`);
        const json = await res.json();

        if (json.success) {
            allManpowerData = json.data || [];
            processData(); 
        }
    } catch (e) {
        console.error(e);
    } finally {
        hideSpinner();
    }
}

function processData() {
    let filteredLogs = allManpowerData;

    // 1. Status Filter
    if (currentStatusFilter !== 'TOTAL') {
        filteredLogs = filteredLogs.filter(d => {
            const s = d.status || 'WAITING';
            if (currentStatusFilter === 'PRESENT') return s === 'PRESENT';
            if (currentStatusFilter === 'LATE') return s === 'LATE';
            if (currentStatusFilter === 'LEAVE') return ['SICK_LEAVE', 'BUSINESS_LEAVE', 'VACATION', 'OTHER'].includes(s) || s.includes('LEAVE');
            if (currentStatusFilter === 'ABSENT') return ['ABSENT', 'WAITING'].includes(s);
            
            return true;
        });
    }

    // 2. Interactive Filter
    if (activeFilter.type) {
        const { type, value, subValue } = activeFilter;
        
        filteredLogs = filteredLogs.filter(d => {
            const checkShift = (shiftName, teamGroup, target) => {
                const parts = target.split('::');
                const tName = parts[0];
                const tTeam = parts[1] || '-';
                const dTeam = teamGroup || '-';
                return shiftName === tName && dTeam === tTeam;
            };

            if (type === 'LINE') return d.line === value;
            else if (type === 'LINE_SHIFT') return d.line === value && checkShift(d.shift_name, d.team_group, subValue);
            else if (type === 'LINE_SHIFT_TYPE') {
                const [targetShift, targetType] = subValue.split('|');
                return d.line === value && checkShift(d.shift_name, d.team_group, targetShift) && d.category_name === targetType;
            }
            else if (type === 'SHIFT') return checkShift(d.shift_name, d.team_group, value);
            else if (type === 'SHIFT_LINE') return checkShift(d.shift_name, d.team_group, value) && d.line === subValue;
            else if (type === 'TYPE') return d.category_name === value;
            else if (type === 'TYPE_LINE') return d.category_name === value && d.line === subValue;
            return true;
        });
    }

    const groups = {};
    filteredLogs.forEach(log => {
        if (!groups[log.emp_id]) {
            groups[log.emp_id] = {
                emp_info: log,
                logs: [],
                // [แก้ไข] แยกตัวแปรนับประเภทการลาออกจากกัน
                stats: { 
                    present: 0, 
                    late: 0, 
                    absent: 0, 
                    sick: 0,      // ลาป่วย
                    business: 0,  // ลากิจ
                    vacation: 0,  // พักร้อน
                    other: 0 
                } 
            };
        }
        groups[log.emp_id].logs.push(log);
        
        const s = (log.status || '').toUpperCase();
        
        // [แก้ไข] Logic การนับแยกประเภท
        if (s === 'PRESENT') groups[log.emp_id].stats.present++;
        else if (s === 'LATE') groups[log.emp_id].stats.late++;
        else if (['ABSENT', 'WAITING'].includes(s)) groups[log.emp_id].stats.absent++;
        
        // แยกเคสการลา
        else if (s === 'SICK_LEAVE') groups[log.emp_id].stats.sick++;
        else if (s === 'BUSINESS_LEAVE') groups[log.emp_id].stats.business++;
        else if (s === 'VACATION') groups[log.emp_id].stats.vacation++;
        
        else groups[log.emp_id].stats.other++;
    });

    displayGroups = Object.values(groups);

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

        // 1. ตรวจสอบสถานะ Inactive
        // สมมติว่า API ส่ง info.is_active มาเป็น 1 หรือ 0 (หรือ true/false)
        const isInactive = (info.is_active == 0 || info.is_active === false);

        // 2. สร้าง Badge เตือนภัย
        let statusIndicator = '';
        let nameStyle = '';
        
        if (isInactive) {
            statusIndicator = `<span class="badge bg-danger ms-2"><i class="fas fa-user-slash me-1"></i>INACTIVE</span>`;
            nameStyle = 'text-decoration: line-through; color: var(--bs-danger) !important;'; // ขีดฆ่าชื่อ + สีแดง
        }

        let summaryBadges = '';
        
        // 1. มา (เขียว)
        if(stats.present > 0) summaryBadges += `<span class="badge bg-success bg-opacity-10 text-success border border-success me-1">${stats.present} มา</span>`;
        
        // 2. สาย (เหลือง)
        if(stats.late > 0)    summaryBadges += `<span class="badge bg-warning bg-opacity-10 text-warning border border-warning me-1">${stats.late} สาย</span>`;
        
        // 3. กลุ่มการลา (ฟ้า) - [แก้ไข] แยกแสดงผล
        if(stats.sick > 0)     summaryBadges += `<span class="badge bg-info bg-opacity-10 text-primary border border-info me-1">${stats.sick} ป่วย</span>`;
        if(stats.business > 0) summaryBadges += `<span class="badge bg-info bg-opacity-10 text-primary border border-info me-1">${stats.business} กิจ</span>`;
        if(stats.vacation > 0) summaryBadges += `<span class="badge bg-info bg-opacity-10 text-primary border border-info me-1">${stats.vacation} พักร้อน</span>`;
        
        // 4. ขาด (แดง)
        if(stats.absent > 0)  summaryBadges += `<span class="badge bg-danger bg-opacity-10 text-danger border border-danger me-1">${stats.absent} ขาด</span>`;
        
        // 5. อื่นๆ (เทา)
        if(stats.other > 0)   summaryBadges += `<span class="badge bg-secondary bg-opacity-25 text-body border me-1">${stats.other} อื่นๆ</span>`;
        
        if(summaryBadges === '') summaryBadges = '-';

        const trMain = document.createElement('tr');
        trMain.className = 'align-middle cursor-pointer hover-bg collapsed';
        trMain.setAttribute('data-bs-toggle', 'collapse');
        trMain.setAttribute('data-bs-target', `#collapse-${rowId}`);
        
        trMain.innerHTML = `
            <td class="text-center"><i class="fas text-muted expand-icon fa-chevron-right"></i></td>
            <td class="fw-bold ${isInactive ? 'text-danger' : 'text-primary'} ps-2">
                ${info.emp_id}
            </td>
            <td>
                <div class="fw-bold" style="color: var(--bs-body-color); ${nameStyle}">
                    ${info.name_th || '-'} ${statusIndicator}
                </div>
                <div class="small text-muted">
                    <i class="fas fa-briefcase me-1"></i>${info.department_api || '-'} 
                    <span class="mx-1 text-secondary">|</span> 
                    ${info.position || '-'}
                </div>
            </td>
            <td class="text-center"><span class="badge bg-secondary bg-opacity-25 text-body border">${info.line || '-'}</span></td>
            <td class="text-center"><span class="badge bg-info bg-opacity-25 text-body border">${info.team_group || '-'}</span></td>
            <td class="text-center"><span class="badge bg-light text-dark border">${info.shift_name || '-'}</span></td>
            <td class="text-center">${summaryBadges}</td>
        `;

        const trDetail = document.createElement('tr');
        trDetail.innerHTML = `
            <td colspan="7" class="p-0 border-0">
                <div class="collapse" id="collapse-${rowId}" style="background-color: var(--bs-body-bg);">
                    <div class="p-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="m-0 text-primary fw-bold"><i class="fas fa-history me-2"></i>Attendance History</h6>
                            <button class="btn btn-sm btn-outline-secondary bg-white" onclick="editEmployee('${info.emp_id}')">
                                <i class="fas fa-user-cog me-1"></i> Edit Employee Info
                            </button>
                        </div>
                        <table class="table table-sm table-bordered mb-0 shadow-sm" style="background-color: var(--bs-body-bg);">
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
            
            // เช็คว่าตอนนี้เป็นลูกศรขวาใช่ไหม?
            if (icon.classList.contains('fa-chevron-right')) {
                // ถ้าใช่ -> เปลี่ยนเป็นหัวทิ่มลง (เปิด)
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                // ถ้าไม่ใช่ (เป็นหัวทิ่มลงอยู่) -> เปลี่ยนเป็นขวา (ปิด)
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
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
                    <button class="btn btn-xs btn-link text-primary" 
                        onclick="openEditLogModal('${log.emp_id}', '${log.log_date}', '${log.log_id}')">
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

function renderPagination() {
    const totalPages = Math.ceil(displayGroups.length / rowsPerPage);
    const nav = document.getElementById('paginationControls');
    if(!nav) return;
    
    let html = `<li class="page-item ${currentPage===1?'disabled':''}"><button class="page-link" onclick="event.preventDefault(); changePage(${currentPage-1})">Prev</button></li>`;
    for(let i=1; i<=totalPages; i++) {
        if(i===1 || i===totalPages || (i >= currentPage-1 && i <= currentPage+1)) {
            html += `<li class="page-item ${currentPage===i?'active':''}"><button class="page-link" onclick="event.preventDefault(); changePage(${i})">${i}</button></li>`;
        } else if (i === currentPage-2 || i === currentPage+2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    html += `<li class="page-item ${currentPage===totalPages?'disabled':''}"><button class="page-link" onclick="event.preventDefault(); changePage(${currentPage+1})">Next</button></li>`;
    nav.innerHTML = html;
}

window.changePage = function(p) { if(p < 1) return; currentPage = p; renderMainTable(); }
window.setFilter = function(f) { currentStatusFilter = f; processData(); }
// ไฟล์: manpower.js

// ไฟล์: manpower.js (ค้นหา function getStatusBadge)

function getStatusBadge(s) {
    if (!s || s === 'WAITING') return '<span class="badge bg-light text-secondary border">WAITING</span>';
    
    if (s === 'PRESENT') return '<span class="badge bg-success bg-opacity-75">PRESENT</span>';
    if (s === 'LATE') return '<span class="badge bg-warning text-dark bg-opacity-75">LATE</span>';
    if (s === 'ABSENT') return '<span class="badge bg-danger bg-opacity-75">ABSENT</span>';
    
    // [แก้ไข] เปลี่ยนกลับเป็นสีฟ้า (bg-info) ตามที่ต้องการ
    // ใช้ bg-info text-dark เพื่อให้เป็นสีฟ้าอ่อน ตัวหนังสือดำ อ่านง่ายแบบเดิม
    if (s === 'SICK_LEAVE') return '<span class="badge bg-info text-dark bg-opacity-75">SICK LEAVE</span>';
    if (s === 'BUSINESS_LEAVE') return '<span class="badge bg-info text-dark bg-opacity-75">BUSINESS LEAVE</span>';
    if (s === 'VACATION') return '<span class="badge bg-info text-dark bg-opacity-75">VACATION</span>';
    
    if (s === 'OTHER') return '<span class="badge bg-secondary">OTHER</span>';

    // Fallback
    return `<span class="badge bg-secondary">${s}</span>`;
}

function showSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'flex'; }
function hideSpinner() { const el = document.getElementById('loadingOverlay'); if(el) el.style.display = 'none'; }

// 6.1 Edit Log
// ไฟล์: manpower.js

// [แก้ตรงนี้] รับ parameter เพิ่ม
window.openEditLogModal = function(empId, dateStr, logId) {
    
    // [LOGIC สำคัญ] ค้นหาจาก emp_id และ log_date เพื่อความแม่นยำ 100%
    const log = allManpowerData.find(d => d.emp_id == empId && d.log_date == dateStr);
    
    // ถ้าหาไม่เจอ (เผื่อไว้) ให้ลองหาจาก log_id สำหรับเคสที่มี ID แล้ว
    const fallbackLog = log || allManpowerData.find(d => d.log_id == logId && logId != 0);
    
    const target = log || fallbackLog;

    if(target) {
        document.getElementById('editLogId').value = target.log_id || 0;
        
        // เซ็ตค่าลง Hidden Fields ที่เราเพิ่มไปเมื่อกี้
        document.getElementById('editEmpIdHidden').value = target.emp_id;
        document.getElementById('editLogDateHidden').value = target.log_date;

        document.getElementById('editEmpName').value = target.name_th;
        
        // ถ้าสถานะเป็น WAITING ให้ Default เป็น PRESENT เพื่อความสะดวก
        let statusToShow = target.status;
        if(statusToShow === 'WAITING' || !statusToShow) statusToShow = 'PRESENT';
        
        document.getElementById('editStatus').value = statusToShow;
        document.getElementById('editLogShift').value = target.actual_shift_id || ""; 
        
        const fmt = (t) => t ? t.replace(' ', 'T').substring(0, 16) : '';
        document.getElementById('editScanInTime').value = fmt(target.scan_in_time);
        document.getElementById('editScanOutTime').value = fmt(target.scan_out_time);
        
        // [เพิ่ม] ถ้าเป็น New Record (WAITING) ให้เปิดให้แก้วันที่ได้เผื่อ User อยากเปลี่ยนวัน
        // แต่ถ้าเป็นรายการเดิม ให้ล็อกวันที่ไว้
        
        editLogModal.show();
    } else {
        console.error("Data row not found for:", empId, dateStr);
        alert("ไม่พบข้อมูลแถวที่เลือก กรุณา Refresh หน้าจอ");
    }
}

window.saveLogChanges = async function() {
    const id = document.getElementById('editLogId').value;
    const empId = document.getElementById('editEmpIdHidden').value;
    const logDate = document.getElementById('editLogDateHidden').value;

    const st = document.getElementById('editStatus').value;
    const sh = document.getElementById('editLogShift').value;
    const rem = document.getElementById('editRemark').value;
    const si = document.getElementById('editScanInTime').value;
    const so = document.getElementById('editScanOutTime').value;
    
    showSpinner();
    try {
        const res = await fetch('api/api_daily_operations.php?action=update_log', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                log_id: id,
                emp_id: empId,   // [ส่งค่าเพิ่ม]
                log_date: logDate, // [ส่งค่าเพิ่ม]
                status: st,
                shift_id: sh,
                remark: rem,
                scan_in_time: si ? si.replace('T', ' ') : null,
                scan_out_time: so ? so.replace('T', ' ') : null
            })
        });
        const json = await res.json();
        if(json.success){ 
            editLogModal.hide(); 
            refreshData();
            if(typeof showToast === 'function') showToast(json.message, '#198754');
        } else {
            alert(json.message);
        }
    } catch(e) {
        console.error(e);
        alert("Error updating data");
    } finally {
        hideSpinner();
    }
}

// 6.2 Edit Employee
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
        const res=await fetch(`${API_MANAGE_EMP}?action=update_employee`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emp_id:id,line:l,shift_id:s,team_group:t,is_active:1})});
        const j=await res.json();
        if(j.success){ editEmployeeModal.hide(); refreshData(); } else alert(j.message);
    } catch(e){console.error(e);} finally{hideSpinner();}
}

// 6.3 Shift Planner (Batch Update)
window.openShiftPlanner = async function() {
    showSpinner();
    try{
        const res=await fetch(`${API_MANAGE_EMP}?action=read_employees`);
        const j=await res.json();
        if(j.success){ renderShiftPlannerTable(j.lines, j.shifts); shiftPlannerModal.show(); }
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
        await fetch(`${API_MANAGE_EMP}?action=update_team_shift`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
                line: l,
                shift_a: sa,
                shift_b: sb
            })
        });
        alert('Saved');
    } catch(e){console.error(e);} finally{hideSpinner();}
}

// 6.4 Mapping
window.openMappingModal = async function() {
    mappingModal.show();
    try{
        const res=await fetch(`${API_MAPPING}?action=read_mappings`); 
        const j=await res.json();
        if(j.success){
            const b=document.getElementById('categoryMappingBody');
            
            b.innerHTML=j.categories.map(r=>`
                <tr>
                    <td><input class="form-control cat-api" value="${r.keyword}"></td>
                    <td><input class="form-control cat-display" value="${r.category_name}"></td>
                    <td>
                        <select class="form-select cat-type">
                            <option value="HOURLY" ${r.rate_type === 'HOURLY' ? 'selected' : ''}>รายชั่วโมง (Hr)</option>
                            <option value="DAILY"  ${r.rate_type === 'DAILY'  ? 'selected' : ''}>รายวัน (Day)</option> 
                            <option value="MONTHLY" ${r.rate_type === 'MONTHLY' ? 'selected' : ''}>รายเดือน (Mth)</option>
                            <option value="MONTHLY_NO_OT" ${r.rate_type === 'MONTHLY_NO_OT' ? 'selected' : ''}>รายเดือน (No OT)</option>
                        </select>
                    </td>
                    <td><input type="number" class="form-control cat-rate" value="${r.hourly_rate}"></td>
                    <td><button class="btn btn-sm btn-outline-danger border-0" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
                </tr>
            `).join('');
            
            if(j.categories.length==0) addMappingRow();
        }
    } catch(e){}
}

window.addMappingRow = function() {
    const b = document.getElementById('categoryMappingBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input class="form-control cat-api" placeholder="เช่น Manager"></td>
        <td><input class="form-control cat-display" placeholder="Manager"></td>
        <td>
            <select class="form-select cat-type">
                <option value="HOURLY">รายชั่วโมง (Hr)</option>
                <option value="DAILY">รายวัน (Day)</option>
                <option value="MONTHLY">รายเดือน (Mth)</option>
                <option value="MONTHLY_NO_OT">รายเดือน (No OT)</option>
            </select>
        </td>
        <td><input type="number" class="form-control cat-rate" value="0"></td>
        <td><button class="btn btn-sm btn-outline-danger border-0" onclick="this.closest('tr').remove()"><i class="fas fa-times"></i></button></td>
    `;
    b.appendChild(tr);
}

window.saveAllMappings=async function(){
    const c=Array.from(document.querySelectorAll('#categoryMappingBody tr')).map(r=>({
        api_position: r.querySelector('.cat-api').value,
        category_name: r.querySelector('.cat-display').value,
        rate_type: r.querySelector('.cat-type').value, 
        hourly_rate: r.querySelector('.cat-rate').value
    })).filter(x=>x.api_position);

    showSpinner();
    try{
        const res=await fetch(`${API_MAPPING}?action=save_mappings`,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({categories:c})
        });
        const j=await res.json();
        if(j.success){mappingModal.hide(); alert('บันทึกการตั้งค่าเรียบร้อย');}
    } catch(e){} finally{hideSpinner();}
}

async function loadFilterOptions() {
    try {
        const res = await fetch(`${API_MANAGE_EMP}?action=read_employees`);
        const json = await res.json();
        if (json.success) {
            const lineSelect = document.getElementById('empEditLine');
            const shiftSelect = document.getElementById('empEditShift');
            if(lineSelect) { let lineHtml = '<option value="">-- Select Line --</option>'; json.lines.forEach(l => lineHtml += `<option value="${l}">${l}</option>`); lineSelect.innerHTML = lineHtml; }
            if(shiftSelect) { let shiftHtml = ''; json.shifts.forEach(s => shiftHtml += `<option value="${s.shift_id}">${s.shift_name} (${s.start_time.substring(0,5)})</option>`); shiftSelect.innerHTML = shiftHtml; }
        }
    } catch (e) {}
}

// ==========================================
// 7. Export Functions (CSV)
// ==========================================

// 7.1 Export Summary (ข้อมูลสรุป)
window.exportSummaryCSV = function() {
    if (!rawSummaryData || rawSummaryData.length === 0) {
        alert("ไม่มีข้อมูลสำหรับ Export");
        return;
    }

    // Header
    const headers = [
        "Line", "Shift", "Team", "Employee Type", 
        "Total HC", "Plan", "Present", "Leave", "Absent", "Late", "Actual", "Diff"
    ];

    // Data Rows
    const rows = rawSummaryData.map(d => [
        `"${d.line_name}"`, // ใส่ "" กันกรณีมี comma ในชื่อ
        `"${d.shift_name}"`,
        `"${d.team_group}"`,
        `"${d.emp_type}"`,
        d.total_hc,
        d.plan,
        d.present,
        d.leave,
        d.absent,
        d.late,
        d.actual,
        d.diff
    ]);

    downloadCSV(headers, rows, `Manpower_Summary_${getDateString()}.csv`);
}

// 7.2 Export Details (รายชื่อพนักงาน)
window.exportDetailsCSV = function() {
    // ใช้ displayGroups (ข้อมูลที่ผ่านการกรองแล้ว)
    
    let exportData = [];
    if(displayGroups && displayGroups.length > 0) {
        displayGroups.forEach(g => {
            // วนลูป logs ของแต่ละคน
            g.logs.forEach(log => {
                exportData.push({
                    emp_id: g.emp_info.emp_id,
                    name: g.emp_info.name_th,
                    position: g.emp_info.position || '-', // <--- [เพิ่ม] ดึงตำแหน่งมาใส่
                    line: g.emp_info.line,
                    team: g.emp_info.team_group,
                    date: log.log_date,
                    shift: log.shift_name,
                    scan_in: log.scan_in_time || '',
                    scan_out: log.scan_out_time || '',
                    status: log.status || 'WAITING',
                    remark: log.remark || ''
                });
            });
        });
    }

    if (exportData.length === 0) {
        alert("ไม่มีข้อมูลรายชื่อสำหรับ Export");
        return;
    }

    // [UPDATED] เพิ่ม Header "Position"
    const headers = [
        "Date", "Emp ID", "Name", "Position", "Line", "Team", 
        "Shift", "In", "Out", "Status", "Remark"
    ];

    // [UPDATED] เพิ่ม Value "d.position" ในลำดับที่ตรงกัน
    const rows = exportData.map(d => [
        d.date,
        `"${d.emp_id}"`, // ใส่ "" บังคับ Text กัน Excel ตัดเลข 0
        `"${d.name}"`,
        `"${d.position}"`, // <--- [เพิ่ม] ใส่ค่าตำแหน่งตรงนี้
        `"${d.line}"`,
        `"${d.team}"`,
        `"${d.shift}"`,
        d.scan_in,
        d.scan_out,
        d.status,
        `"${d.remark}"`
    ]);

    downloadCSV(headers, rows, `Manpower_Details_${getDateString()}.csv`);
}

// Helper: สร้างไฟล์ CSV และสั่ง Download
function downloadCSV(headers, rows, filename) {
    let csvContent = "\uFEFF"; // BOM for Excel (แก้ภาษาต่างดาว)
    
    // Add Headers
    csvContent += headers.join(",") + "\n";

    // Add Rows
    rows.forEach(rowArray => {
        const row = rowArray.join(",");
        csvContent += row + "\n";
    });

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Helper: วันที่ปัจจุบันสำหรับชื่อไฟล์
function getDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${y}${m}${d}_${h}${min}`;
}

// ==========================================
// 8. Advanced Export (SheetJS Pivot + Auto Width) 📊
// ==========================================
window.exportPivotExcel = function() {
    if (!rawSummaryData || rawSummaryData.length === 0) {
        alert("ไม่มีข้อมูลสำหรับ Export");
        return;
    }

    // สร้าง Workbook ใหม่
    const wb = XLSX.utils.book_new();

    // 1. สร้าง Sheet: By Line
    const dataLine = generatePivotData('LINE');
    const wsLine = XLSX.utils.aoa_to_sheet(dataLine);
    setColumnWidths(wsLine, dataLine); // <--- จัดความกว้าง
    XLSX.utils.book_append_sheet(wb, wsLine, "By Line");

    // 2. สร้าง Sheet: By Shift
    const dataShift = generatePivotData('SHIFT');
    const wsShift = XLSX.utils.aoa_to_sheet(dataShift);
    setColumnWidths(wsShift, dataShift); // <--- จัดความกว้าง
    XLSX.utils.book_append_sheet(wb, wsShift, "By Shift");

    // 3. สร้าง Sheet: By Type
    const dataType = generatePivotData('TYPE');
    const wsType = XLSX.utils.aoa_to_sheet(dataType);
    setColumnWidths(wsType, dataType); // <--- จัดความกว้าง
    XLSX.utils.book_append_sheet(wb, wsType, "By Type");

    // สั่ง Download
    XLSX.writeFile(wb, `Manpower_Summary_${getDateString()}.xlsx`);
}

// Helper: จัดความกว้างคอลัมน์อัตโนมัติ (SheetJS รองรับ !cols)
function setColumnWidths(ws, data) {
    if(!data || data.length === 0) return;
    
    // คำนวณความกว้างสูงสุดของแต่ละคอลัมน์
    const colWidths = data[0].map((_, colIndex) => {
        let maxLength = 0;
        data.forEach(row => {
            if (row[colIndex]) {
                const cellValue = row[colIndex].toString();
                // ภาษาไทย * 1.5 เพราะตัวอักษรกว้างกว่า
                const length = cellValue.length + (cellValue.match(/[ก-๙]/g) || []).length * 0.5;
                if (length > maxLength) maxLength = length;
            }
        });
        return { wch: maxLength + 2 }; // เผื่อขอบนิดหน่อย
    });

    ws['!cols'] = colWidths;
}

// Helper: เตรียมข้อมูล Pivot (Logic เดิม)
function generatePivotData(mode) {
    // Header
    const headerRow = ["Structure", "Total HC", "Plan", "Present", "Leave", "Absent", "Late", "Actual", "Diff"];
    const rows = [headerRow];

    const grouped = {};
    let grandTotal = { total_hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0 };

    rawSummaryData.forEach(row => {
        const vals = parseRowValues(row);
        let key;

        if (mode === 'LINE') {
            key = row.line_name;
            if (!grouped[key]) {
                const lineHC = parseInt(row.total_hc) || 0;
                grouped[key] = { name: key, total_hc: lineHC, ...emptyStats(), subs: [] };
                grandTotal.total_hc += lineHC;
            }
            const shiftName = row.shift_name + (row.team_group !== '-' ? ` (${row.team_group})` : '');
            let subObj = grouped[key].subs.find(s => s.name === shiftName);
            if (!subObj) {
                subObj = { name: shiftName, total_hc: null, ...emptyStats() };
                grouped[key].subs.push(subObj);
            }
            accumulate(grouped[key], vals);
            accumulate(subObj, vals);
            accumulate(grandTotal, vals);

        } else {
            const rowHC = vals.plan; 
            if (mode === 'SHIFT') key = `${row.shift_name}` + (row.team_group!=='-' ? ` (${row.team_group})` : '');
            else key = row.emp_type;

            if (!grouped[key]) {
                grouped[key] = { name: key, total_hc: 0, ...emptyStats(), subs: [] };
            }
            accumulate(grouped[key], vals);
            grouped[key].total_hc += rowHC;
            accumulate(grandTotal, vals);
            grandTotal.total_hc += rowHC;

            const lineName = row.line_name;
            let subObj = grouped[key].subs.find(s => s.name === lineName);
            if (!subObj) {
                subObj = { name: lineName, total_hc: rowHC, ...vals }; 
                grouped[key].subs.push(subObj);
            } else {
                accumulate(subObj, vals);
                subObj.total_hc += rowHC;
            }
        }
    });

    Object.values(grouped).forEach(g => {
        rows.push([
            g.name, 
            g.total_hc !== null ? g.total_hc : '-', 
            g.plan, g.present, g.leave, g.absent, g.late, g.actual, g.diff
        ]);
        g.subs.forEach(s => {
            rows.push([
                "    " + s.name, // Indentation ด้วย space
                s.total_hc !== null ? s.total_hc : '-',
                s.plan, s.present, s.leave, s.absent, s.late, s.actual, s.diff
            ]);
        });
    });

    rows.push([
        "GRAND TOTAL",
        grandTotal.total_hc,
        grandTotal.plan, grandTotal.present, grandTotal.leave, grandTotal.absent, grandTotal.late, grandTotal.actual, grandTotal.diff
    ]);

    return rows;
}