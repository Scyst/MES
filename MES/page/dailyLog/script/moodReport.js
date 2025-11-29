// MES/page/dailyLog/script/moodReport.js
"use strict";

const API_URL = 'api/moodReportAPI.php';

// Global Variables
let chartInstances = {}; 
let currentMissingData = []; // เก็บข้อมูลคนหาย
let tableDataCache = [];     // เก็บข้อมูลตาราง (Issues) เพื่อใช้กรองใน Negative Modal

// Modal Instances (ประกาศไว้ก่อน เพื่อทำ Lazy Load)
let missingModalInstance = null;
let negModalInstance = null;
let histModalInstance = null;
let histChartInstance = null; // สำหรับกราฟใน History Modal

// ===== 1. Helper Functions =====

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

function formatNumber(num) {
    return num ? parseFloat(num).toFixed(2) : '-';
}

function formatDateShort(dateStr) {
    if(!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ===== 2. Main Logic =====

async function initPage() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const formatDate = (d) => d.toISOString().split('T')[0];

    const params = new URLSearchParams(window.location.search);
    
    const startEl = document.getElementById('filterStartDate');
    const endEl = document.getElementById('filterEndDate');
    const lineEl = document.getElementById('filterLine');

    if (startEl && !startEl.value) startEl.value = params.get('start_date') || formatDate(firstDay);
    if (endEl && !endEl.value) endEl.value = params.get('end_date') || formatDate(today);

    // Fetch Filters
    try {
        const formData = new FormData();
        formData.append('action', 'get_filters');
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) {
            populateSelectWithOptions(lineEl, result.data.lines, "Lines", params.get('line') || "All");
        }
    } catch (err) {
        console.error("Error fetching filters:", err);
    }

    // Load Data
    handleFilterChange();
}

async function handleFilterChange() {
    const start = document.getElementById('filterStartDate').value;
    const end = document.getElementById('filterEndDate').value;
    const line = document.getElementById('filterLine').value;

    const params = new URLSearchParams({ start_date: start, end_date: end, line: line });
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

    const formData = new FormData();
    formData.append('action', 'get_report_data');
    formData.append('start_date', start);
    formData.append('end_date', end);
    formData.append('line', line);

    try {
        toggleLoading(true);

        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success) {
            // เก็บค่าเข้าตัวแปร Global
            currentMissingData = data.missing || [];
            tableDataCache = data.table || []; 

            renderKPI(data.kpi, currentMissingData.length);
            renderTrendChart(data.trend);
            renderLineChart(data.byLine);
            renderDistChart(data.dist);
            
            renderTable(tableDataCache); // Render ตาราง Issues
            renderMissingTable(currentMissingData); // Render ตาราง Missing
        } else {
            console.warn(data.message);
        }

    } catch (err) {
        console.error(err);
    } finally {
        setTimeout(() => toggleLoading(false), 300);
    }
}

// ===== 3. Event Listeners =====

document.addEventListener('DOMContentLoaded', () => {
    initPage();
    ['filterStartDate', 'filterEndDate', 'filterLine'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', handleFilterChange);
        }
    });
});

// ===== 4. Rendering Functions =====
function renderKPI(kpi, missingCount) {
    // Helper function เพื่อลดการเขียนซ้ำและป้องกัน Error
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.innerText = text;
    };

    const setDisplay = (id, show) => {
        const el = document.getElementById(id);
        if (el) el.style.display = show ? 'block' : 'none';
    };

    // 1. Avg Mood
    setText('kpiAvgMood', formatNumber(kpi.avg_mood));
    setText('kpiTotal', kpi.total_responses || 0);

    // 2. Negative Count (Card 3)
    const negCount = kpi.negative_count || 0;
    setText('kpiNegative', negCount);
    
    // Badge สีแดง (อาจจะไม่มีใน HTML เก่า)
    if (negCount > 0) {
        setDisplay('kpiNegativeBadge', true);
        setText('kpiNegativeBadge', negCount);
    } else {
        setDisplay('kpiNegativeBadge', false);
    }

    // 3. Missing Count (Card 2)
    // ส่วนนี้คือจุดที่น่าจะ Error ถ้า HTML ไม่ตรง
    const missingEl = document.getElementById('kpiResponseText');
    const percentEl = document.getElementById('kpiResponsePercent');
    const badgeEl = document.getElementById('kpiMissingCountBadge');

    if (missingEl) {
        missingEl.innerText = missingCount;
        missingEl.className = missingCount > 0 ? "mb-0 fw-bold text-warning display-5" : "mb-0 fw-bold text-success display-5";
    }
    
    if (percentEl) {
        percentEl.innerText = missingCount > 0 ? "พนักงานที่ยังไม่ส่งข้อมูล" : "ส่งครบทุกคนแล้ว (Excellent!)";
    }
    
    if (badgeEl) {
        if(missingCount > 0) {
            badgeEl.style.display = 'block';
            badgeEl.innerText = missingCount > 99 ? '99+' : missingCount;
        } else {
            badgeEl.style.display = 'none';
        }
    }
}

// --- Charts ---

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
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: true
                }
            }
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
            scales: {
                y: { beginAtZero: true, max: 5, grid: { borderDash: [2, 2], color: '#f0f0f0' } },
                x: { grid: { display: false } }
            },
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
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 15, padding: 15, font: { size: 11 } } }
            }
        }
    });
}

// --- Tables ---

function renderTable(data) {
    const tbody = document.getElementById('issueTableBody');
    tbody.innerHTML = '';

    const emojis = {1:'😤', 2:'😓', 3:'😐', 4:'🙂', 5:'🤩'};
    const periods = {1:'Start', 2:'Break', 3:'End'};

    data.forEach(row => {
        const score = parseInt(row.mood_score);
        const scoreClass = score <= 2 ? 'text-danger fw-bold' : 'text-body';
        const displayName = row.name_th ? row.name_th : row.username;

        const html = `
            <tr>
                <td class="ps-3"><i class="far fa-calendar me-2 text-muted"></i>${formatDateShort(row.log_date)}</td>
                <td><span class="badge bg-light text-dark border px-3 py-2 rounded-pill">${row.line || '-'}</span></td>
                
                <td onclick="openHistoryModal('${row.emp_id}', '${displayName}')" style="cursor:pointer;" title="View History">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center me-3" style="width:35px; height:35px; font-weight:bold;">
                            ${displayName.charAt(0)}
                        </div>
                        <div>
                            <div class="fw-bold text-primary text-decoration-underline" style="font-size:0.95rem;">${displayName}</div>
                            <small class="text-muted" style="font-size:0.75rem;">${row.emp_id || '-'}</small>
                        </div>
                    </div>
                </td>

                <td class="text-center"><span class="badge bg-secondary bg-opacity-10 text-secondary border fw-normal">${periods[row.period_id] || '-'}</span></td>
                <td class="text-center fs-5 ${scoreClass}">${emojis[score]}</td>
                <td>${row.note ? `<div class="bg-warning bg-opacity-10 text-dark p-2 rounded small border border-warning border-opacity-25"><i class="fas fa-comment-dots me-2 text-warning"></i>${row.note}</div>` : '<span class="text-muted opacity-25">-</span>'}</td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted"><i class="fas fa-check-circle fa-3x mb-3 text-success opacity-25"></i><br>เยี่ยมมาก! ไม่พบรายงานปัญหาในช่วงเวลานี้</td></tr>';
    }
}

function renderMissingTable(data) {
    const tbody = document.getElementById('missingTableBody');
    tbody.innerHTML = '';
    
    document.getElementById('tabMissingCount').innerText = data.length;

    data.forEach(row => {
        const displayName = row.name_th ? row.name_th : row.username;
        const html = `
            <tr>
                <td class="ps-3"><span class="badge bg-light text-dark border">${row.line || '-'}</span></td>
                <td class="font-monospace text-muted">${row.emp_id || '-'}</td>
                <td class="fw-bold">${displayName}</td>
                <td><span class="badge bg-warning bg-opacity-10 text-dark border border-warning">ยังไม่บันทึก</span></td>
            </tr>
        `;
        tbody.innerHTML += html;
    });

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-success"><i class="fas fa-check-circle fa-2x mb-2"></i><br>สุดยอด! ส่งครบทุกคน</td></tr>';
    }
}

// ===== 5. Modal Interaction Functions =====

// A. Missing Modal
window.openMissingModal = function() {
    if (!missingModalInstance) missingModalInstance = new bootstrap.Modal(document.getElementById('missingModal'));

    const list = document.getElementById('missingModalList');
    list.innerHTML = '';

    if (currentMissingData.length === 0) {
        list.innerHTML = `<div class="p-5 text-center text-muted"><i class="fas fa-check-circle fa-3x text-success mb-3 opacity-50"></i><br>ส่งข้อมูลครบทุกคน</div>`;
    } else {
        currentMissingData.forEach(row => {
            const displayName = row.name_th ? row.name_th : row.username;
            list.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-secondary bg-opacity-10 text-secondary rounded-circle d-flex align-items-center justify-content-center me-3" style="width:40px; height:40px;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${displayName}</div>
                            <small class="text-muted"><i class="fas fa-id-badge me-1"></i>${row.emp_id} • Line ${row.line}</small>
                        </div>
                    </div>
                    <span class="badge bg-warning text-dark border border-warning bg-opacity-25 rounded-pill px-3">Pending</span>
                </div>
            `;
        });
    }
    missingModalInstance.show();
}

// B. Negative Modal
window.openNegativeModal = function() {
    if (!negModalInstance) negModalInstance = new bootstrap.Modal(document.getElementById('negativeModal'));
    
    const list = document.getElementById('negativeModalList');
    list.innerHTML = '';

    // Filter from cache
    const negatives = tableDataCache.filter(r => parseInt(r.mood_score) <= 2);

    if (negatives.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-muted">ไม่มีรายงานอารมณ์เชิงลบในขณะนี้</div>';
    } else {
        negatives.forEach(row => {
            const displayName = row.name_th ? row.name_th : row.username;
            const emojis = {1:'😤', 2:'😓'};
            
            // Add onclick to open history
            list.innerHTML += `
                <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3" 
                     onclick="openHistoryModal('${row.emp_id}', '${displayName}')" style="cursor:pointer;">
                    <div class="d-flex align-items-center">
                        <div class="fs-1 me-3">${emojis[row.mood_score]}</div>
                        <div>
                            <div class="fw-bold text-dark">${displayName}</div>
                            <small class="text-muted">Line ${row.line} • ${formatDateShort(row.log_date)}</small>
                            ${row.note ? `<div class="text-danger small mt-1"><i class="fas fa-comment"></i> ${row.note}</div>` : ''}
                        </div>
                    </div>
                    <i class="fas fa-chevron-right text-muted opacity-50"></i>
                </div>
            `;
        });
    }
    negModalInstance.show();
}

// C. History Modal & Chart
window.openHistoryModal = async function(empId, empName) {
    if (!empId || empId === '-') return;

    // Close other modals if open
    if(negModalInstance) negModalInstance.hide();
    
    if (!histModalInstance) histModalInstance = new bootstrap.Modal(document.getElementById('historyModal'));
    
    document.getElementById('historyModalTitle').innerText = empName;
    document.getElementById('historyModalSubtitle').innerText = `Emp ID: ${empId}`;
    
    histModalInstance.show();
    
    // Fetch History
    const formData = new FormData();
    formData.append('action', 'get_user_history');
    formData.append('emp_id', empId);

    try {
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();

        if(data.success) {
            renderHistoryChart(data.history);
        } else {
            console.error('History fetch failed');
        }
    } catch(err) {
        console.error(err);
    }
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
                label: 'Mood Score',
                data: dataPoints,
                borderColor: '#6610f2',
                backgroundColor: 'rgba(102, 16, 242, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                pointBackgroundColor: (ctx) => {
                    const val = ctx.raw;
                    return val <= 2 ? '#dc3545' : (val >= 4 ? '#198754' : '#ffc107');
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 1, max: 5, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 2.5, yMax: 2.5,
                            borderColor: 'red', borderWidth: 1, borderDash: [5,5],
                            label: { content: 'Alert Level', enabled: true, position: 'end', color: 'red' }
                        }
                    }
                }
            }
        }
    });
    
    // Render History Text List below chart (Optional)
    const listDiv = document.getElementById('historyList');
    if(listDiv) {
        listDiv.innerHTML = '';
        sortedData.slice().reverse().forEach(d => { // Show newest first in list
             if(d.note) {
                 listDiv.innerHTML += `<div class="mb-1"><span class="fw-bold">${formatDateShort(d.log_date)}:</span> ${d.note}</div>`;
             }
        });
    }
}

// ===== 6. Export Function =====

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