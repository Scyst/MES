let currentDashboardData = null;
// MES/page/storeManagement/script/storeRequest.js
"use strict";

let allItems = [];
let debounceTimer;
let currentPage = 1;
let rowsPerPage = 100;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', async () => {
    await initData();
    
    if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE) {
        const filterEl = document.getElementById('filterStatus');
        if (filterEl) filterEl.value = 'PENDING';
    }

    loadRequests();
    loadDashboard();

    document.getElementById('filterSearch')?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { currentPage = 1; loadRequests(); loadDashboard(); }, 500); 
    });

    ['filterStartDate', 'filterEndDate', 'filterStatus', 'filterLine', 'filterTeam'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', () => { currentPage = 1; loadRequests(); loadDashboard(); });
    });
});

async function initData() {
    try {
        const res = await fetchAPI('get_master_data', 'GET');
        if (res && res.data) {
            allItems = res.data.items || [];
            
            const wipSelect = document.getElementById('wip_loc');
            const storeContainer = document.getElementById('store_buttons_container');
            const storeInput = document.getElementById('store_loc');

            if (wipSelect && storeContainer) {
                wipSelect.innerHTML = '<option value="">-- เลือก --</option>';
                storeContainer.innerHTML = '';

                res.data.locations.forEach(loc => {
                    if (loc.location_type === 'STORE' || loc.location_type === 'WAREHOUSE') {
                        const btn = document.createElement('div');
                        btn.className = 'btn-custom-select'; 
                        btn.innerText = loc.location_name;
                        
                        btn.onclick = () => {
                            storeInput.value = loc.location_id;
                            const allBtns = storeContainer.querySelectorAll('.btn-custom-select');
                            allBtns.forEach(b => b.classList.remove('active'));
                            btn.classList.add('active');
                        };
                        storeContainer.appendChild(btn);
                    } else {
                        wipSelect.add(new Option(loc.location_name, loc.location_id));
                    }
                });
            }
        }
    } catch (e) { 
        console.error("Init Data Failed", e); 
    }
}

const searchInp = document.getElementById('item_search');
const listDiv = document.getElementById('autocomplete-list');

if (searchInp && listDiv) {
    searchInp.addEventListener('input', function() {
        const val = this.value.toLowerCase().trim();
        listDiv.innerHTML = '';
        document.getElementById('selected_item_id').value = '';
        
        if (!val) {
            listDiv.style.display = 'none';
            return;
        }

        const matches = allItems.filter(i =>
            (i.sap_no && i.sap_no.toLowerCase().includes(val)) ||
            (i.part_no && i.part_no.toLowerCase().includes(val)) ||
            (i.part_description && i.part_description.toLowerCase().includes(val))
        ).slice(0, 10);

        if (matches.length === 0) {
            listDiv.style.display = 'none';
            return;
        }

        listDiv.style.display = 'block';

        matches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            const safeSap = escapeHTML(item.sap_no);
            const safePartNo = escapeHTML(item.part_no);
            const safeDesc = escapeHTML(item.part_description || '-');

            div.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span class="fw-bold text-dark">${safeSap}</span>
                    <span class="text-secondary small">${safePartNo}</span>
                </div>
                <div class="small text-muted text-truncate">${safeDesc}</div>
            `;
            div.onclick = () => {
                searchInp.value = `${item.sap_no} | ${item.part_no}`;
                document.getElementById('selected_item_id').value = item.item_id;
                listDiv.innerHTML = '';
                listDiv.style.display = 'none';
            };
            listDiv.appendChild(div);
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target !== searchInp) listDiv.style.display = 'none';
    });
}

function openRequestModal() {
    const form = document.getElementById('scrapForm');
    if (form) form.reset();
    
    document.getElementById('selected_item_id').value = '';
    document.getElementById('source_snc').checked = true;

    const storeContainer = document.getElementById('store_buttons_container');
    if(storeContainer) {
        const allBtns = storeContainer.querySelectorAll('.btn-custom-select');
        allBtns.forEach(b => b.classList.remove('active'));
        const firstBtn = storeContainer.querySelector('.btn-custom-select');
        if (firstBtn) firstBtn.click();
    }
    
    if(listDiv) listDiv.style.display = 'none';
    
    const modal = new bootstrap.Modal(document.getElementById('addRequestModal'));
    modal.show();
    
    setTimeout(() => {
        const searchInput = document.getElementById('item_search');
        if(searchInput) searchInput.focus();
    }, 500);
}

async function loadRequests() {
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const line = encodeURIComponent(document.getElementById('filterLine')?.value || '');
    const team = encodeURIComponent(document.getElementById('filterTeam')?.value || '');

    const spinnerHTML = '<div class="spinner-border spinner-border-sm text-secondary" role="status"></div>';
    document.getElementById('sumCount').innerHTML = spinnerHTML;
    document.getElementById('sumQty').innerHTML   = spinnerHTML;
    document.getElementById('sumCost').innerHTML  = spinnerHTML;
    
    const tbody = document.getElementById('reqTableBody');
    const cardCon = document.getElementById('reqCardContainer');
    
    if(tbody) tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></td></tr>`;
    if(cardCon) cardCon.innerHTML = `<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-primary"></i></div>`;

    try {
        const queryParams = `get_scrap_requests&status=${status}&search=${search}&start_date=${startDate}&end_date=${endDate}&line=${line}&team=${team}&page=${currentPage}&limit=${rowsPerPage}`;
        const res = await fetchAPI(queryParams, 'GET');

        if (res.kpi) {
            const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            const fmtMoney = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            document.getElementById('sumCount').innerText = fmt.format(res.kpi.total_count);
            document.getElementById('sumQty').innerText = fmt.format(res.kpi.total_qty);
            document.getElementById('sumCost').innerText = fmtMoney.format(res.kpi.total_cost);
        }
        renderTableHTML(res.data);

        if (res.pagination) {
            totalPages = res.pagination.total_pages || 1;
            renderPaginationControls(res.pagination.total_records);
        }

    } catch (e) {
        const errorHtml = `<tr><td colspan="10" class="text-center py-4 text-danger"><i class="fas fa-exclamation-circle"></i> เกิดข้อผิดพลาด</td></tr>`;
        if(tbody) tbody.innerHTML = errorHtml;
        if(cardCon) cardCon.innerHTML = errorHtml;
    }
}

function renderTableHTML(data) {
    const tbody = document.getElementById('reqTableBody');
    const cardCon = document.getElementById('reqCardContainer');
    
    let tableRowsHTML = '';
    let mobileCardsHTML = '';

    if (data && data.length > 0) {
        const fmtNum = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        data.forEach(row => {
            let reason = (row.notes || '-').replace(/\[TXN:\d+\]/g, '').trim();
            if (reason.includes('Reason: ')) reason = reason.split('Reason: ')[1];
            else if (reason.includes('Defect: ')) reason = reason.split('Defect: ')[1];
            else if (reason.includes('Replacement: ')) reason = reason.split('Replacement: ')[1];

            let badgeClass = '';
            let icon = '';
            if (row.status === 'PENDING') {
                badgeClass = 'bg-warning bg-opacity-50 text-dark border border-warning';
                icon = '<i class="fas fa-clock me-1"></i>';
            } else if (row.status === 'COMPLETED') {
                badgeClass = 'bg-success bg-opacity-50 text-dark border border-success';
                icon = '<i class="fas fa-check-circle me-1"></i>';
            } else if (row.status === 'REJECTED') {
                badgeClass = 'bg-danger bg-opacity-50 text-dark border border-danger';
                icon = '<i class="fas fa-times-circle me-1"></i>';
            }

            const statusBadge = `<span class="badge ${badgeClass} rounded-pill fw-normal text-dark px-2 py-1">${icon}${escapeHTML(row.status)}</span>`;
            const createdDate = row.created_at ? escapeHTML(row.created_at.substring(0, 16)) : '-';
            const requesterName = escapeHTML(row.requester || '-');
            const unitCost = parseFloat(row.unit_cost || 0);
            const totalCost = parseFloat(row.quantity) * unitCost;
            const safeSap = escapeHTML(row.sap_no);
            const safePartNo = escapeHTML(row.part_no);
            const safeDesc = escapeHTML(row.part_description || '-');
            const safeReason = escapeHTML(reason);

            let btnAction = '';
            if (typeof IS_STORE_ROLE !== 'undefined' && IS_STORE_ROLE && row.status === 'PENDING') {
                btnAction = `
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-success rounded-circle me-1" style="width:32px;height:32px;" onclick="approveReq(${row.transfer_id})" title="อนุมัติ"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle" style="width:32px;height:32px;" onclick="rejectReq(${row.transfer_id})" title="ปฏิเสธ"><i class="fas fa-times"></i></button>
                </div>`;
            }

            tableRowsHTML += `
                <tr>
                    <td class="text-secondary small text-nowrap">${createdDate}</td>
                    <td class="fw-bold text-primary">${safeSap}</td>
                    <td class="text-dark">${safePartNo}</td>
                    <td class="small text-secondary text-truncate" style="max-width: 150px;" title="${safeDesc}">${safeDesc}</td>
                    <td class="fw-bold text-center text-danger fs-6">${fmtNum.format(row.quantity)}</td>
                    <td class="text-end small text-muted">${fmtNum.format(totalCost)}</td>
                    <td class="small text-secondary text-truncate" style="max-width: 120px;" title="${safeReason}">${safeReason}</td>
                    <td class="small text-secondary text-nowrap text-center">${requesterName}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">${btnAction}</td>
                </tr>`;

            mobileCardsHTML += `
                <div class="card req-card status-${escapeHTML(row.status)} border-0 shadow-sm mb-3">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <div class="text-truncate pe-2">
                                <strong class="text-primary d-block" style="font-size: 1.1rem;">${safeSap}</strong>
                                <span class="small text-secondary">${safePartNo}</span>
                            </div>
                            <div class="flex-shrink-0 ms-2">${statusBadge}</div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mb-3 p-2 rounded border bg-light">
                            <div class="small text-secondary text-truncate me-2" style="max-width: 60%;">${safeDesc}</div>
                            <div class="text-end">
                                <div class="fw-bold fs-4 text-danger" style="line-height: 1;">${fmtNum.format(row.quantity)}</div>
                                <small class="text-muted" style="font-size: 0.7rem;">Est: ${fmtNum.format(totalCost)} ฿</small>
                            </div>
                        </div>
                        <div class="mb-2 small"><span class="text-muted">Req:</span> <strong class="text-dark ms-1">${requesterName}</strong></div>
                        <div class="mb-3 small text-secondary text-truncate"><span class="text-muted me-1">Note:</span> <span title="${safeReason}">${safeReason}</span></div>
                        <div class="d-flex justify-content-between align-items-center pt-2 border-top mt-2">
                            <small class="text-muted">${createdDate}</small>
                            <div>${btnAction}</div>
                        </div>
                    </div>
                </div>`;
        });
    } else {
        const empty = '<div class="text-center text-muted py-5"><i class="fas fa-inbox fa-3x mb-3 opacity-25"></i><br>ไม่พบรายการในช่วงเวลานี้</div>';
        tableRowsHTML = `<tr><td colspan="10">${empty}</td></tr>`;
        mobileCardsHTML = empty;
    }

    if (tbody) tbody.innerHTML = tableRowsHTML;
    if (cardCon) cardCon.innerHTML = mobileCardsHTML;
}

function renderPaginationControls(totalRecords) {
    const start = totalRecords === 0 ? 0 : ((currentPage - 1) * rowsPerPage) + 1;
    const end = Math.min(currentPage * rowsPerPage, totalRecords);
    
    const infoEl = document.getElementById('paginationInfo');
    if(infoEl) infoEl.innerText = `แสดง ${start} ถึง ${end} จาก ${totalRecords} รายการ`;

    const paginationUl = document.getElementById('paginationControls');
    if(!paginationUl) return;
    
    paginationUl.innerHTML = '';
    if (totalPages <= 1) return;

    paginationUl.innerHTML += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage - 1}, event)">ก่อนหน้า</a></li>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        paginationUl.innerHTML += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="changePage(${i}, event)">${i}</a></li>`;
    }
    paginationUl.innerHTML += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="changePage(${currentPage + 1}, event)">ถัดไป</a></li>`;
}

function changePage(page, event) {
    if (event) event.preventDefault();
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadRequests();
}

async function submitRequest(e) {
    e.preventDefault();
    
    const sourceVal = document.querySelector('input[name="defect_source"]:checked').value;
    const itemId = document.getElementById('selected_item_id').value;
    const storeId = document.getElementById('store_loc').value;
    const qty = document.getElementById('qty').value;
    const reason = document.getElementById('reason').value;

    if (!itemId || !storeId) {
        showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'var(--bs-warning)');
        return;
    }

    if (!confirm('ยืนยันการแจ้งของเสียและขอเบิก?')) return;

    const data = {
        item_id: itemId,
        wip_location_id: document.getElementById('wip_loc').value,
        store_location_id: storeId,
        quantity: qty,
        reason: reason,
        defect_source: sourceVal
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const btnId = submitBtn ? submitBtn.id : null;
    
    if (submitBtn && !btnId) submitBtn.id = 'tempSubmitBtn';

    const res = await fetchAPI('create_request', 'POST', data, submitBtn ? submitBtn.id : null);
    
    if (res) {
        showToast('บันทึกสำเร็จ', 'var(--bs-success)');
        const modalEl = document.getElementById('addRequestModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
        currentPage = 1;
        loadRequests(); 
    }
}

window.approveReq = async (id) => {
    if (!confirm('ยืนยันการอนุมัติจ่ายของ?')) return;
    const res = await fetchAPI('approve_request', 'POST', { transfer_id: id });
    if (res) loadRequests();
};

window.rejectReq = async (id) => {
    const r = prompt("ระบุเหตุผลที่ปฏิเสธ:");
    if (!r) return;
    const res = await fetchAPI('reject_request', 'POST', { transfer_id: id, reject_reason: r });
    if (res) loadRequests();
};

async function exportData() {
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const line = encodeURIComponent(document.getElementById('filterLine')?.value || '');
    const team = encodeURIComponent(document.getElementById('filterTeam')?.value || '');
    
    const queryParams = `get_scrap_requests&status=${status}&search=${search}&start_date=${startDate}&end_date=${endDate}&line=${line}&team=${team}&export=true`;
    const res = await fetchAPI(queryParams, 'GET', null, 'btnExportExcel');
    
    if (res && res.data && res.data.length > 0) {
        const excelData = res.data.map(row => ({
            'Date/Time': row.created_at ? row.created_at.substring(0, 19) : '',
            'Req ID': row.transfer_uuid,
            'SAP No': row.sap_no,
            'Part No': row.part_no,
            'Description': row.part_description,
            'Quantity': parseFloat(row.quantity) || 0,
            'Unit Cost': parseFloat(row.unit_cost) || 0,
            'Total Cost': (parseFloat(row.quantity) || 0) * (parseFloat(row.unit_cost) || 0),
            'From Loc': row.from_loc,
            'To Loc': row.to_loc,
            'Status': row.status,
            'Reason/Notes': (row.notes || '').replace(/\[TXN:\d+\]/g, '').trim(),
            'Requester': row.requester,
            'Approver': row.approver
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);

        ws['!cols'] = [
            { wch: 22 }, { wch: 25 }, { wch: 18 }, { wch: 20 }, { wch: 50 }, 
            { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
            { wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 20 }
        ];

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; ++R) { 
            let cellQty = ws[XLSX.utils.encode_cell({r: R, c: 5})];
            if (cellQty) cellQty.z = '#,##0.00'; 
            let cellUnit = ws[XLSX.utils.encode_cell({r: R, c: 6})];
            if (cellUnit) cellUnit.z = '#,##0.00';
            let cellTotal = ws[XLSX.utils.encode_cell({r: R, c: 7})];
            if (cellTotal) cellTotal.z = '#,##0.00';
        }

        ws['!autofilter'] = { ref: `A1:N${excelData.length + 1}` };
        XLSX.utils.book_append_sheet(wb, ws, "Scrap_Request");

        const fileName = `Scrap_Request_${new Date().toISOString().slice(0,10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('Export สำเร็จ', 'var(--bs-success)');
    } else {
        showToast('ไม่พบข้อมูลสำหรับ Export', 'var(--bs-warning)');
    }
}

function showToast(msg, color) {
    const t = document.getElementById('liveToast');
    const tb = document.getElementById('toastMessage');
    if (t && tb) {
        tb.innerText = msg;
        t.className = `toast align-items-center text-white border-0 ${color.replace('var(--bs-','bg-')}`;
        new bootstrap.Toast(t).show();
    }
}
// --- Dashboard Logic ---

let chartInstances = {};

async function loadDashboard() {
    const status = document.getElementById('filterStatus')?.value || 'ALL';
    const search = encodeURIComponent(document.getElementById('filterSearch')?.value.trim() || '');
    const startDate = document.getElementById('filterStartDate')?.value || '';
    const endDate = document.getElementById('filterEndDate')?.value || '';
    const line = encodeURIComponent(document.getElementById('filterLine')?.value || '');
    const team = encodeURIComponent(document.getElementById('filterTeam')?.value || '');

    const queryParams = `get_scrap_dashboard&status=${status}&search=${search}&start_date=${startDate}&end_date=${endDate}&line=${line}&team=${team}`;
    const res = await fetchAPI(queryParams, 'GET');
    
    if (res && res.success) {
        currentDashboardData = res;
        renderCharts(res);
    }
}

function renderCharts(data) {
    const textColor = getComputedStyle(document.body).getPropertyValue('--bs-body-color') || '#6c757d';
    const gridColor = getComputedStyle(document.body).getPropertyValue('--bs-border-color') || '#dee2e6';
    
    // Set Global Chart Defaults
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Prompt', sans-serif";
        Chart.defaults.color = textColor;
    }

    // Common Tooltip configuration
    const tooltipConfig = {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#212529',
        bodyColor: '#495057',
        borderColor: '#dee2e6',
        borderWidth: 1,
        titleFont: { size: 13, weight: 'bold', family: "'Prompt', sans-serif" },
        bodyFont: { size: 13, family: "'Prompt', sans-serif" },
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
            label: function(context) {
                return ' ' + new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.raw);
            }
        }
    };

    // Common Scales
    const verticalScales = {
        x: { ticks: { color: textColor }, grid: { display: false } },
        y: { ticks: { color: textColor }, grid: { color: gridColor, borderDash: [4, 4] }, border: { display: false }, beginAtZero: true }
    };
    const horizontalScales = {
        x: { ticks: { color: textColor }, grid: { color: gridColor, borderDash: [4, 4] }, border: { display: false }, beginAtZero: true },
        y: { ticks: { color: textColor }, grid: { display: false } }
    };

    // 0. Update KPIs
    if (data.summary) {
        document.getElementById('kpiTotalTickets').textContent = new Intl.NumberFormat().format(data.summary.total_tickets);
        document.getElementById('kpiTotalPcs').textContent = new Intl.NumberFormat().format(data.summary.total_pcs);
        document.getElementById('kpiTotalCost').textContent = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.summary.total_cost);
        document.getElementById('kpiTopLine').textContent = data.summary.top_line || '-';
        
        let avgTkt = data.summary.total_tickets > 0 ? (data.summary.total_cost / data.summary.total_tickets) : 0;
        let avgPc = data.summary.total_pcs > 0 ? (data.summary.total_cost / data.summary.total_pcs) : 0;
        document.getElementById('kpiAvgTkt').textContent = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgTkt);
        document.getElementById('kpiAvgPc').textContent = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(avgPc);
    }
    const formatDateTH = (dateStr) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    // 1. Trend Chart
    const trendCtx = document.getElementById('scrapTrendChart');
    if (trendCtx) {
        if (chartInstances.trend) chartInstances.trend.destroy();
        
        let gradient = trendCtx.getContext('2d').createLinearGradient(0, 0, 0, 350);
        gradient.addColorStop(0, 'rgba(13, 110, 253, 0.4)');
        gradient.addColorStop(1, 'rgba(13, 110, 253, 0.0)');

        chartInstances.trend = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: data.trend.map(d => formatDateTH(d.date)),
                datasets: [{
                    label: 'Scrap Cost',
                    data: data.trend.map(d => parseFloat(d.total_cost)),
                    borderColor: '#0d6efd',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#0d6efd',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipConfig },
                scales: verticalScales,
                interaction: { mode: 'index', intersect: false }
            }
        });
    }

    // 2. Line Chart
    const lineCtx = document.getElementById('scrapLineChart');
    if (lineCtx) {
        if (chartInstances.line) chartInstances.line.destroy();
        chartInstances.line = new Chart(lineCtx, {
            type: 'bar',
            data: {
                labels: data.line.map(d => d.line),
                datasets: [{
                    label: 'Cost',
                    data: data.line.map(d => parseFloat(d.total_cost)),
                    backgroundColor: 'rgba(13, 202, 240, 0.8)',
                    hoverBackgroundColor: '#0dcaf0',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipConfig },
                scales: verticalScales
            }
        });
    }

    // 3. Team Chart
    const teamCtx = document.getElementById('scrapTeamChart');
    if (teamCtx) {
        if (chartInstances.team) chartInstances.team.destroy();
        chartInstances.team = new Chart(teamCtx, {
            type: 'bar',
            data: {
                labels: data.team.map(d => d.team),
                datasets: [{
                    label: 'Cost',
                    data: data.team.map(d => parseFloat(d.total_cost)),
                    backgroundColor: 'rgba(255, 193, 7, 0.8)',
                    hoverBackgroundColor: '#ffc107',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipConfig },
                scales: verticalScales
            }
        });
    }



    // 5. Top Defect Reasons
    const reasonCtx = document.getElementById('scrapReasonChart');
    if (reasonCtx && data.reasons) {
        if (chartInstances.reasons) chartInstances.reasons.destroy();
        
        const truncateText = (str, len) => str.length > len ? str.substring(0, len) + '...' : str;
        
        chartInstances.reasons = new Chart(reasonCtx, {
            type: 'bar',
            data: {
                labels: data.reasons.map(d => truncateText(d.reason, 20)),
                datasets: [{
                    label: 'Cost',
                    data: data.reasons.map(d => parseFloat(d.total_cost)),
                    backgroundColor: 'rgba(220, 53, 69, 0.8)',
                    hoverBackgroundColor: '#dc3545',
                    borderRadius: 6,
                    maxBarThickness: 40
                }]
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false }, 
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            title: function(context) {
                                return data.reasons[context[0].dataIndex].reason;
                            },
                            label: tooltipConfig.callbacks.label
                        }
                    } 
                },
                scales: horizontalScales
            }
        });
    }

    // 6. Top Parts Doughnut
    const topCtx = document.getElementById('scrapTopPartsChart');
    if (topCtx) {
        if (chartInstances.topParts) chartInstances.topParts.destroy();
        
        // Calculate Others category
        const totalOverallCost = parseFloat(data.summary.total_cost) || 0;
        let topPartsData = [...data.top_parts];
        const sumTop = topPartsData.reduce((sum, item) => sum + parseFloat(item.total_cost), 0);
        const otherCost = totalOverallCost - sumTop;
        
        if (otherCost > 0) {
            topPartsData.push({ part_no: 'Others', total_cost: otherCost });
        }
        
        chartInstances.topParts = new Chart(topCtx, {
            type: 'doughnut',
            data: {
                labels: topPartsData.map(d => d.part_no),
                datasets: [{
                    data: topPartsData.map(d => parseFloat(d.total_cost)),
                    backgroundColor: ['#0d6efd', '#20c997', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#adb5bd'], // Added grey for Others
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12, family: "'Prompt', sans-serif" }, color: textColor } },
                    tooltip: {
                        ...tooltipConfig,
                        callbacks: {
                            label: function(context) {
                                let val = context.raw || 0;
                                let percentage = totalOverallCost > 0 ? ((val / totalOverallCost) * 100).toFixed(1) : 0;
                                return ' ' + new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(val) + ` (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}


function syncDashboardFilters() {
    const dStart = document.getElementById('dash_startDate').value;
    const dEnd = document.getElementById('dash_endDate').value;
    const dTeam = document.getElementById('dash_teamSelect').value;
    const dLine = document.getElementById('dash_lineSelect').value;

    document.getElementById('filterStartDate').value = dStart;
    document.getElementById('filterEndDate').value = dEnd;
    document.getElementById('filterTeam').value = dTeam;
    document.getElementById('filterLine').value = dLine;

    // Reload both to keep everything in sync
    currentPage = 1;
    loadRequests();
    loadDashboard();
}

// When opening dashboard modal, sync from global filters to dash filters
document.addEventListener('DOMContentLoaded', () => {
    const dashboardModalEl = document.getElementById('dashboardModal');
    if (dashboardModalEl) {
        dashboardModalEl.addEventListener('show.bs.modal', () => {
            document.getElementById('dash_startDate').value = document.getElementById('filterStartDate').value;
            document.getElementById('dash_endDate').value = document.getElementById('filterEndDate').value;
            document.getElementById('dash_teamSelect').value = document.getElementById('filterTeam').value;
            document.getElementById('dash_lineSelect').value = document.getElementById('filterLine').value;
        });
        
    }
});

async function exportDashboardToImage() {
    if (typeof html2canvas === 'undefined') {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'script/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        } catch (e) {
            Swal.fire('Failed to dynamically load Image Capture Library. Please check your network.');
            return;
        }
    }

    const modalBody = document.querySelector('#dashboardModal .modal-content');
    if (!modalBody) return;

    Swal.fire({
        title: 'Generating Image...',
        text: 'Please wait while we render the dashboard.',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const originalOverflow = modalBody.style.overflow;
        modalBody.style.overflow = 'visible';

        const canvas = await html2canvas(modalBody, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#f8f9fa',
            logging: false
        });

        modalBody.style.overflow = originalOverflow;

        const link = document.createElement('a');
        link.download = "Scrap_Dashboard_" + new Date().toISOString().slice(0,10) + ".png";
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        Swal.close();
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'Failed to generate image', 'error');
    }
}

function exportDashboardToExcel() {
    if (!currentDashboardData) {
        Swal.fire('Warning', 'No dashboard data available to export.', 'warning');
        return;
    }

    try {
        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summary = currentDashboardData.summary;
        const wsSummary = XLSX.utils.json_to_sheet([{
            'Total Tickets': summary.total_tickets,
            'Total Scrap (Pcs)': summary.total_pcs,
            'Total Cost (THB)': summary.total_cost,
            'Top Defect Line': summary.top_line || 'N/A'
        }]);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

        // 2. Cost Trend
        if (currentDashboardData.trend && currentDashboardData.trend.length > 0) {
            const wsTrend = XLSX.utils.json_to_sheet(currentDashboardData.trend.map(d => ({
                'Date': d.date,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsTrend, "Trend");
        }

        // 3. Top Parts
        if (currentDashboardData.top_parts && currentDashboardData.top_parts.length > 0) {
            const wsParts = XLSX.utils.json_to_sheet(currentDashboardData.top_parts.map(d => ({
                'Part No': d.part_no,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsParts, "Top Parts");
        }

        // 4. Reasons
        if (currentDashboardData.reasons && currentDashboardData.reasons.length > 0) {
            const wsReasons = XLSX.utils.json_to_sheet(currentDashboardData.reasons.map(d => ({
                'Defect Reason': d.reason,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsReasons, "Defect Reasons");
        }

        // 5. Line
        if (currentDashboardData.line && currentDashboardData.line.length > 0) {
            const wsLine = XLSX.utils.json_to_sheet(currentDashboardData.line.map(d => ({
                'Line': d.line,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsLine, "Cost By Line");
        }

        // 6. Team
        if (currentDashboardData.team && currentDashboardData.team.length > 0) {
            const wsTeam = XLSX.utils.json_to_sheet(currentDashboardData.team.map(d => ({
                'Team': d.team,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsTeam, "Cost By Team");
        }

        // 7. Requesters
        if (currentDashboardData.requesters && currentDashboardData.requesters.length > 0) {
            const wsReq = XLSX.utils.json_to_sheet(currentDashboardData.requesters.map(d => ({
                'Requester': d.requester,
                'Total Cost (THB)': parseFloat(d.total_cost)
            })));
            XLSX.utils.book_append_sheet(wb, wsReq, "Top Requesters");
        }

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, "Scrap_Dashboard_Data_" + dateStr + ".xlsx");
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Failed to generate Excel file.', 'error');
    }
}
