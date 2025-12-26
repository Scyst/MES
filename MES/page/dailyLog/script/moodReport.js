// MES/page/dailyLog/script/moodReport.js
"use strict";

const API_URL = 'api/moodReportAPI.php';

// Global State
let chartInstances = {}; 
let isPrivacyMode = true; 
let passwordModalInstance = null;
let currentMissingData = []; // เก็บข้อมูล Missing ของหน้าปัจจุบัน
let tableDataCache = [];     // เก็บข้อมูล Issues ของหน้าปัจจุบัน (สำคัญสำหรับ Negative Modal)

// Pagination State
let issueState = { page: 1, limit: 10, total: 0 };
let missingState = { page: 1, limit: 10, total: 0 };

// Modal Instances
let missingModalInstance = null;
let negModalInstance = null;
let histModalInstance = null;
let histChartInstance = null;

// ===== 1. Privacy Helper Functions =====

function getDisplayName(row) {
    if (isPrivacyMode) {
        return '<span class="text-muted fst-italic opacity-50">Unknown User</span>';
    }
    return row.fullname ? row.fullname : row.username;
}

function getEmpId(id) {
    return isPrivacyMode ? '******' : id;
}

function getAvatarChar(name) {
    const n = name || '';
    return isPrivacyMode ? '?' : n.charAt(0);
}

// ฟังก์ชันสลับโหมด พร้อมถามรหัสผ่าน
window.togglePrivacyMode = function() {
    if (!isPrivacyMode) {
        // ถ้าจะปิดข้อมูล (Hide) -> ทำได้เลย
        isPrivacyMode = true;
        updatePrivacyUI();
        refreshAllTables();
        return;
    }

    // ถ้าจะเปิดข้อมูล (Show) -> เปิด Modal ถามรหัส
    if (!passwordModalInstance) {
        passwordModalInstance = new bootstrap.Modal(document.getElementById('passwordModal'));
    }
    
    // เคลียร์ค่าเก่า
    document.getElementById('confirmPasswordInput').value = '';
    document.getElementById('passwordErrorMsg').classList.add('d-none');
    
    passwordModalInstance.show();
    setTimeout(() => document.getElementById('confirmPasswordInput').focus(), 500);
}

window.submitPasswordVerification = async function() {
    const passwordInput = document.getElementById('confirmPasswordInput');
    const errorMsg = document.getElementById('passwordErrorMsg');
    const password = passwordInput.value;

    if (!password) {
        errorMsg.innerText = 'กรุณากรอกรหัสผ่าน';
        errorMsg.classList.remove('d-none');
        return;
    }

    try {
        const btn = document.querySelector('#passwordModal .btn-danger');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ตรวจสอบ...';

        const formData = new FormData();
        formData.append('action', 'verify_password');
        formData.append('password', password);

        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await res.json();

        if (result.success) {
            isPrivacyMode = false;
            updatePrivacyUI();
            refreshAllTables();
            passwordModalInstance.hide();
        } else {
            errorMsg.innerText = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่';
            errorMsg.classList.remove('d-none');
            passwordInput.value = '';
            passwordInput.focus();
        }

        btn.disabled = false;
        btn.innerHTML = originalText;

    } catch (err) {
        console.error(err);
        errorMsg.innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';
        errorMsg.classList.remove('d-none');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function updatePrivacyUI() {
    const btn = document.getElementById('privacyToggleBtn');
    const icon = btn.querySelector('i');
    const text = document.getElementById('privacyBtnText');
    
    if (isPrivacyMode) {
        btn.classList.remove('btn-danger', 'text-white');
        btn.classList.add('btn-outline-secondary');
        icon.className = 'fas fa-eye-slash';
        text.innerText = 'Show Names';
    } else {
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-danger', 'text-white');
        icon.className = 'fas fa-eye';
        text.innerText = 'Hide Names';
    }
}

function refreshAllTables() {
    // รีโหลดเฉพาะข้อมูลของหน้าปัจจุบัน (ไม่ต้อง reset page เป็น 1)
    loadIssuesTable(issueState.page);
    loadMissingTable(missingState.page);
    
    // ถ้า Modal เปิดอยู่ ให้วาดใหม่ด้วย
    const missingModalEl = document.getElementById('missingModal');
    if (missingModalEl && missingModalEl.classList.contains('show')) window.openMissingModal();
    
    const negModalEl = document.getElementById('negativeModal');
    if (negModalEl && negModalEl.classList.contains('show')) window.openNegativeModal();
}

// ===== 2. Helper Functions (Common) =====

function toggleLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if(overlay) overlay.style.display = show ? 'flex' : 'none';
}

function populateSelectWithOptions(selectElement, optionsArray, label, selectedValue = "") {
    if (!selectElement) return;
    const currentVal = selectedValue || selectElement.value;
    selectElement.innerHTML = `<option value="All">All ${label}</option>`;
    if (Array.isArray(optionsArray)) {
        optionsArray.forEach(optionText => {
            if (!optionText) return;
            const opt = document.createElement("option");
            opt.value = optionText;
            opt.textContent = optionText;
            if (optionText === currentVal) opt.selected = true;
            selectElement.appendChild(opt);
        });
    }
}

function formatNumber(num) { return num ? parseFloat(num).toFixed(2) : '-'; }

function formatDateShort(dateStr) {
    if(!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getFilterParams() {
    const formData = new FormData();
    formData.append('start_date', document.getElementById('filterStartDate').value);
    formData.append('end_date', document.getElementById('filterEndDate').value);
    formData.append('line', document.getElementById('filterLine').value);
    return formData;
}

// ===== 3. Main Init & Load Data Functions =====

async function initPage() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (d) => d.toISOString().split('T')[0];
    
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');
    if (!startEl.value) startEl.value = formatDate(firstDay);
    if (!endEl.value) endEl.value = formatDate(today);

    // Load Filter Options
    try {
        const formData = new FormData();
        formData.append('action', 'get_filters');
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            populateSelectWithOptions(document.getElementById('filterLine'), result.data.lines, "Lines");
        }
    } catch (err) { console.error(err); }

    handleFilterChange();
}

async function handleFilterChange() {
    // เมื่อเปลี่ยน Filter ให้รีเซ็ตกลับไปหน้า 1
    issueState.page = 1;
    missingState.page = 1;

    toggleLoading(true);
    try {
        await Promise.all([
            loadOverviewStats(),
            loadIssuesTable(),
            loadMissingTable()
        ]);
    } catch (err) {
        console.error("Error loading dashboard:", err);
    } finally {
        setTimeout(() => toggleLoading(false), 300);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPage();
    ['filterStartDate', 'filterEndDate', 'filterLine'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', handleFilterChange);
    });
    
    const passInput = document.getElementById('confirmPasswordInput');
    if(passInput) {
        passInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') submitPasswordVerification();
        });
    }
});

// --- 3.1 Load Overview (KPI & Charts) ---
async function loadOverviewStats() {
    const formData = getFilterParams();
    formData.append('action', 'get_overview_stats');

    const res = await fetch(API_URL, { method: 'POST', body: formData });
    const data = await res.json();

    if (data.success) {
        renderKPI(data.kpi);
        renderTrendChart(data.trend);
        renderLineChart(data.byLine);
        renderDistChart(data.dist);
    }
}

// --- 3.2 Load Issues Table (Pagination) ---
async function loadIssuesTable(page = 1) {
    issueState.page = page;
    const formData = getFilterParams();
    formData.append('action', 'get_issues_table');
    formData.append('page', issueState.page);
    formData.append('limit', issueState.limit);

    const res = await fetch(API_URL, { method: 'POST', body: formData });
    const result = await res.json();

    if (result.success) {
        issueState.total = result.pagination.total;
        
        // [FIXED] ต้องอัปเดต cache เพื่อใช้ใน Negative Modal
        tableDataCache = result.data; 

        renderTable(result.data);
        renderPagination('issuePagination', issueState, loadIssuesTable, 'issuePaginationInfo');
    }
}

// --- 3.3 Load Missing Table (Pagination) ---
async function loadMissingTable(page = 1) {
    missingState.page = page;
    const formData = getFilterParams();
    formData.append('action', 'get_missing_table');
    formData.append('page', missingState.page);
    formData.append('limit', missingState.limit);

    const res = await fetch(API_URL, { method: 'POST', body: formData });
    const result = await res.json();

    if (result.success) {
        missingState.total = result.pagination.total;
        
        // เก็บ data ชุดนี้ไว้เปิด Modal (จะได้เฉพาะหน้าปัจจุบัน)
        currentMissingData = result.data;

        renderMissingTable(result.data);
        renderPagination('missingPagination', missingState, loadMissingTable, 'missingPaginationInfo');
        
        // Update Tabs Count & KPI Text
        document.getElementById('tabMissingCount').innerText = missingState.total;
        const kpiText = document.getElementById('kpiResponseText');
        const kpiBadge = document.getElementById('kpiMissingCountBadge');
        if(kpiText) {
            kpiText.innerText = missingState.total;
            kpiText.className = missingState.total > 0 ? "mb-0 fw-bold text-warning display-5" : "mb-0 fw-bold text-success display-5";
        }
        if(kpiBadge) {
            kpiBadge.innerText = missingState.total > 99 ? '99+' : missingState.total;
            kpiBadge.style.display = missingState.total > 0 ? 'block' : 'none';
        }
    }
}

// ===== 4. Pagination Renderer =====

function renderPagination(elementId, state, callback, infoId) {
    const ul = document.getElementById(elementId);
    const info = document.getElementById(infoId);
    if (!ul) return;

    const totalPages = Math.ceil(state.total / state.limit);
    const startItem = (state.page - 1) * state.limit + 1;
    const endItem = Math.min(state.page * state.limit, state.total);

    if(info) info.innerText = state.total === 0 ? 'No records' : `Showing ${startItem}-${endItem} of ${state.total}`;

    ul.innerHTML = '';
    if (totalPages <= 1) return;

    const createLi = (text, page, isActive = false, isDisabled = false) => {
        const li = document.createElement('li');
        li.className = `page-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
        li.innerHTML = `<button class="page-link shadow-none">${text}</button>`;
        if (!isDisabled && !isActive) {
            li.addEventListener('click', () => callback(page));
        }
        return li;
    };

    ul.appendChild(createLi('<i class="fas fa-chevron-left"></i>', state.page - 1, false, state.page === 1));

    let startPage = Math.max(1, state.page - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    if (startPage > 1) {
        ul.appendChild(createLi('1', 1));
        if (startPage > 2) ul.appendChild(createLi('...', state.page, false, true));
    }

    for (let i = startPage; i <= endPage; i++) {
        ul.appendChild(createLi(i, i, i === state.page));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) ul.appendChild(createLi('...', state.page, false, true));
        ul.appendChild(createLi(totalPages, totalPages));
    }

    ul.appendChild(createLi('<i class="fas fa-chevron-right"></i>', state.page + 1, false, state.page === totalPages));
}

// ===== 5. Rendering Functions (Tables & Charts) =====

function renderKPI(kpi) {
    const setText = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };
    const setDisplay = (id, show) => { const el = document.getElementById(id); if (el) el.style.display = show ? 'block' : 'none'; };
    
    setText('kpiAvgMood', formatNumber(kpi.avg_mood));
    const negCount = kpi.negative_count || 0;
    setText('kpiNegative', negCount);
    
    if (negCount > 0) { 
        setDisplay('kpiNegativeBadge', true); 
        setText('kpiNegativeBadge', negCount); 
    } else { 
        setDisplay('kpiNegativeBadge', false); 
    }
}

function renderTrendChart(data) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const labels = data.map(d => formatDateShort(d.log_date));
    const values = data.map(d => d.daily_avg);
    const volumes = data.map(d => d.daily_vol);
    
    if (chartInstances.trend) chartInstances.trend.destroy();
    
    chartInstances.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Avg Mood Score', 
                    data: values, 
                    borderColor: '#0d6efd',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(13, 110, 253, 0.4)'); 
                        gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');
                        return gradient;
                    },
                    yAxisID: 'y', 
                    tension: 0.4, 
                    fill: true, 
                    pointRadius: 4, 
                    pointBackgroundColor: '#fff', 
                    pointBorderColor: '#0d6efd', 
                    pointBorderWidth: 2
                },
                {
                    label: 'Responses', 
                    data: volumes, 
                    type: 'bar', 
                    backgroundColor: 'rgba(200, 200, 200, 0.2)', 
                    hoverBackgroundColor: 'rgba(200, 200, 200, 0.4)',
                    yAxisID: 'y1', 
                    barThickness: 12, 
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false, 
            interaction: { mode: 'index', intersect: false },
            scales: { 
                y: { min: 1, max: 5, title: { display: true, text: 'Score' }, grid: { borderDash: [2, 2], color: '#f0f0f0' } }, 
                y1: { position: 'right', grid: { display: false }, beginAtZero: true }, 
                x: { grid: { display: false } } 
            },
            plugins: { tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, cornerRadius: 8, displayColors: true } }
        }
    });
}

function renderLineChart(data) {
    const ctx = document.getElementById('lineBarChart').getContext('2d');
    const labels = data.map(d => d.line || 'Unknown');
    const values = data.map(d => d.line_avg);
    
    if (chartInstances.byLine) chartInstances.byLine.destroy();
    
    const colors = values.map(v => v >= 4 ? '#198754' : (v >= 3 ? '#ffc107' : '#dc3545'));
    
    chartInstances.byLine = new Chart(ctx, {
        type: 'bar', 
        data: { 
            labels: labels, 
            datasets: [{ 
                label: 'Avg Mood Score', 
                data: values, 
                backgroundColor: colors, 
                borderRadius: 6, 
                barThickness: 30 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { y: { beginAtZero: true, max: 5, grid: { borderDash: [2, 2], color: '#f0f0f0' } }, x: { grid: { display: false } } }, 
            plugins: { legend: { display: false } } 
        }
    });
}

function renderDistChart(data) {
    const ctx = document.getElementById('distPieChart').getContext('2d');
    const map = {1:0, 2:0, 3:0, 4:0, 5:0};
    data.forEach(d => map[d.mood_score] = d.count_val);
    
    if (chartInstances.dist) chartInstances.dist.destroy();
    
    chartInstances.dist = new Chart(ctx, {
        type: 'doughnut', 
        data: { 
            labels: ['😤 Frustrated (1)', '😓 Stressed (2)', '😐 Neutral (3)', '🙂 Happy (4)', '🤩 Excited (5)'], 
            datasets: [{ 
                data: [map[1], map[2], map[3], map[4], map[5]], 
                backgroundColor: ['#dc3545', '#fd7e14', '#ffc107', '#20c997', '#0d6efd'], 
                borderWidth: 2, 
                borderColor: '#ffffff' 
            }] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '75%', 
            plugins: { legend: { position: 'right', labels: { boxWidth: 15, padding: 15, font: { size: 11 } } } } 
        }
    });
}

// ===== Tables Rendering =====

function renderTable(data) {
    const tbody = document.getElementById('issueTableBody');
    tbody.innerHTML = '';
    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};
    const periods = {1:'Start', 2:'Break', 3:'End'};

    data.forEach(row => {
        const score = parseInt(row.mood_score);
        const scoreClass = score <= 2 ? 'text-danger fw-bold' : 'text-body';
        const displayName = getDisplayName(row);
        const displayId = getEmpId(row.emp_id);
        const avatarChar = getAvatarChar(row.name_th || row.username);
        const clickAttr = isPrivacyMode ? '' : `onclick="openHistoryModal('${row.emp_id}', '${displayName}')" style="cursor:pointer;"`;

        const html = `
            <tr>
                <td class="ps-3 text-nowrap"><i class="far fa-calendar me-2 text-muted"></i>${formatDateShort(row.log_date)}</td>
                <td class="text-center"><span class="badge bg-light text-dark border px-3 py-2 rounded-pill">${row.line || '-'}</span></td>
                <td ${clickAttr} title="${isPrivacyMode ? 'Locked' : 'View History'}">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width:35px; height:35px; font-weight:bold; flex-shrink:0;">
                            ${avatarChar}
                        </div>
                        <div class="text-truncate" style="max-width: 200px;">
                            <div class="fw-bold text-primary ${isPrivacyMode ? '' : 'text-decoration-underline'}" style="font-size:0.95rem;">${displayName}</div>
                            <small class="text-muted" style="font-size:0.75rem;">${displayId}</small>
                        </div>
                    </div>
                </td>
                <td class="text-center"><span class="badge bg-secondary bg-opacity-10 text-secondary border fw-normal">${periods[row.period_id] || '-'}</span></td>
                <td class="text-center fs-5 ${scoreClass}">${emojis[score]}</td>
                <td class="text-wrap" style="word-break: break-word;">
                    ${row.note ? `<div class="bg-warning bg-opacity-10 text-dark p-2 rounded small border border-warning border-opacity-25"><i class="fas fa-comment-dots me-2 text-warning"></i>${row.note}</div>` : '<span class="text-muted opacity-25">-</span>'}
                </td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    if (data.length === 0) tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-check-circle fa-3x mb-3 text-success opacity-25"></i><br>เยี่ยมมาก! ไม่พบรายงานปัญหาในช่วงเวลานี้</td></tr>';
}

function renderMissingTable(data) {
    const tbody = document.getElementById('missingTableBody');
    tbody.innerHTML = '';
    
    data.forEach(row => {
        const displayName = getDisplayName(row);
        const displayId = getEmpId(row.emp_id);

        const html = `
            <tr>
                <td class="ps-3"><span class="badge bg-light text-dark border">${row.line || '-'}</span></td>
                <td class="font-monospace text-muted">${displayId}</td>
                <td class="fw-bold">${displayName}</td>
                <td><span class="badge bg-warning bg-opacity-10 text-dark border border-warning">ยังไม่บันทึก</span></td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    if (data.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-success"><i class="fas fa-check-circle fa-2x mb-2"></i><br>สุดยอด! ส่งครบทุกคน</td></tr>';
}

// ===== 6. Modal Functions =====

window.openMissingModal = function() {
    if (!missingModalInstance) missingModalInstance = new bootstrap.Modal(document.getElementById('missingModal'));
    const list = document.getElementById('missingModalList');
    list.innerHTML = '';

    if (currentMissingData.length === 0) {
        list.innerHTML = `<div class="p-5 text-center text-muted"><i class="fas fa-check-circle fa-3x text-success mb-3 opacity-50"></i><br>ส่งข้อมูลครบทุกคน (ในหน้านี้)</div>`;
    } else {
        currentMissingData.forEach(row => {
            const displayName = getDisplayName(row);
            const displayId = getEmpId(row.emp_id);
            
            list.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style="width:40px; height:40px;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${displayName}</div>
                            <small class="text-muted"><i class="fas fa-id-badge me-1"></i>${displayId} • Line ${row.line}</small>
                        </div>
                    </div>
                    <span class="badge bg-warning text-dark border border-warning bg-opacity-25 rounded-pill px-3">ยังไม่บันทึก</span>
                </div>
            `;
        });
    }
    missingModalInstance.show();
}

window.openNegativeModal = function() {
    if (!negModalInstance) negModalInstance = new bootstrap.Modal(document.getElementById('negativeModal'));
    const list = document.getElementById('negativeModalList');
    list.innerHTML = '';
    
    // กรองหาค่าที่ score <= 2 จากข้อมูลที่โหลดมาหน้าปัจจุบัน
    const negatives = tableDataCache.filter(r => parseInt(r.mood_score) <= 2);

    if (negatives.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-muted">ไม่มีรายงานอารมณ์เชิงลบ (ในหน้าปัจจุบัน)</div>';
    } else {
        negatives.forEach(row => {
            const displayName = getDisplayName(row);
            const emojis = {1:'😤', 2:'😓'};
            const clickAttr = isPrivacyMode ? '' : `onclick="openHistoryModal('${row.emp_id}', '${displayName}')" style="cursor:pointer;"`;
            
            list.innerHTML += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3" ${clickAttr}>
                    <div class="d-flex align-items-center">
                        <div class="fs-1 me-3">${emojis[row.mood_score]}</div>
                        <div>
                            <div class="fw-bold text-dark">${displayName}</div>
                            <small class="text-muted">Line ${row.line} • ${formatDateShort(row.log_date)}</small>
                            ${row.note ? `<div class="text-danger small mt-1"><i class="fas fa-comment"></i> ${row.note}</div>` : ''}
                        </div>
                    </div>
                    ${!isPrivacyMode ? '<i class="fas fa-chevron-right text-muted opacity-50"></i>' : ''}
                </div>
            `;
        });
    }
    negModalInstance.show();
}

// History & Export
window.openHistoryModal = async function(empId, empName) {
    if (!empId || empId === '-' || isPrivacyMode) return;
    if(negModalInstance) negModalInstance.hide();
    if (!histModalInstance) histModalInstance = new bootstrap.Modal(document.getElementById('historyModal'));
    
    document.getElementById('historyModalTitle').innerText = empName;
    document.getElementById('historyModalSubtitle').innerText = `Emp ID: ${empId}`;
    histModalInstance.show();
    
    const formData = new FormData();
    formData.append('action', 'get_user_history');
    formData.append('emp_id', empId);
    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) { renderHistoryChart(data.history); }
    } catch(err) { console.error(err); }
}

function renderHistoryChart(historyData) {
    const sortedData = historyData.reverse(); 
    const labels = sortedData.map(d => formatDateShort(d.log_date));
    const dataPoints = sortedData.map(d => parseInt(d.mood_score));
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    if (histChartInstance) histChartInstance.destroy();
    
    histChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Mood Score', data: dataPoints, borderColor: '#6610f2', backgroundColor: 'rgba(102, 16, 242, 0.1)', borderWidth: 2, tension: 0.3, fill: true, pointRadius: 5,
                pointBackgroundColor: (ctx) => { const val = ctx.raw; return val <= 2 ? '#dc3545' : (val >= 4 ? '#198754' : '#ffc107'); }
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, scales: { y: { min: 1, max: 5, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
            plugins: { legend: { display: false }, annotation: { annotations: { line1: { type: 'line', yMin: 2.5, yMax: 2.5, borderColor: 'red', borderWidth: 1, borderDash: [5,5], label: { content: 'Alert Level', enabled: true, position: 'end', color: 'red' } } } } }
        }
    });
    
    const listDiv = document.getElementById('historyList');
    if(listDiv) {
        listDiv.innerHTML = '';
        sortedData.slice().reverse().forEach(d => { if(d.note) { listDiv.innerHTML += `<div class="mb-1"><span class="fw-bold">${formatDateShort(d.log_date)}:</span> ${d.note}</div>`; } });
    }
}

function exportTableToExcel() {
    const isMissingTab = document.getElementById('tab-missing').classList.contains('active');
    const tableId = isMissingTab ? "missingTable" : "issueTable";
    const fileName = isMissingTab ? "Missing_Staff_" : "Mood_Issues_";
    
    let table = document.getElementById(tableId);
    let html = table.outerHTML.replace(/ /g, '%20');
    
    let a = document.createElement('a');
    a.href = 'data:application/vnd.ms-excel,' + html;
    a.download = fileName + new Date().toISOString().slice(0,10) + '.xls';
    a.click();
}