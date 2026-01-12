// page/manpower/script/manpower_ui.js
"use strict";

const UI = {
    charts: {},

    // --- 1. KPI CARDS ---
    renderKPI(data) {
        let totalPlan = 0, totalActual = 0, totalLate = 0, totalAbsent = 0;
        let totalCost = 0;

        data.forEach(row => {
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            const absent = parseInt(row.absent || 0);
            
            // 🔥 รับค่าเงินจาก SQL (ถ้าไม่มีให้เป็น 0)
            const cost = parseFloat(row.total_cost || 0);

            totalPlan += plan;
            totalActual += (present + late);
            totalLate += late;
            totalAbsent += absent;
            totalCost += cost;
        });

        this.animateNumber('kpi-plan', totalPlan);
        this.animateNumber('kpi-actual', totalActual);
        this.animateNumber('kpi-cost', parseInt(totalCost));
        this.animateNumber('kpi-absent', totalAbsent);
        document.getElementById('kpi-late').innerText = totalLate;

        const rate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : 0;
        document.getElementById('kpi-rate').innerText = `${rate}% Attendance`;
    },

    // --- 2. CHARTS ---
    renderCharts(data) {
        // Group Data by Line Name
        const labels = [];
        const dataPlan = [];
        const dataActual = [];
        const grouped = {};

        // นับยอดรวมสถานะสำหรับ Pie Chart
        let sumPresent = 0, sumLate = 0, sumAbsent = 0, sumLeave = 0;

        data.forEach(row => {
            const line = row.line_name || 'Other';
            if (!grouped[line]) grouped[line] = { plan: 0, actual: 0 };
            
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            
            grouped[line].plan += plan;
            grouped[line].actual += (present + late);

            // Pie Data
            sumPresent += present;
            sumLate += late;
            sumAbsent += parseInt(row.absent || 0);
            sumLeave += parseInt(row.leave || 0);
        });

        for (const [line, val] of Object.entries(grouped)) {
            labels.push(line);
            dataPlan.push(val.plan);
            dataActual.push(val.actual);
        }

        // 2.1 Bar Chart
        const ctxBar = document.getElementById('barChart').getContext('2d');
        if (this.charts.bar) this.charts.bar.destroy();

        this.charts.bar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Plan', data: dataPlan, backgroundColor: '#0d6efd', borderRadius: 4 },
                    { label: 'Actual', data: dataActual, backgroundColor: '#198754', borderRadius: 4 }
                ]
            },
            options: {
                // [FIX] แก้ไข onClick ให้ดึงค่า Line Name จากตัวแปร labels โดยตรง (Closure) เพื่อความแม่นยำ
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const lineName = labels[index]; // ใช้ค่าจากตัวแปร labels ที่ scope ด้านบน
                        const date = document.getElementById('filterDate').value;
                        
                        console.log("Clicking Line:", lineName);
                        
                        if(lineName) {
                            Actions.openDetailModal(lineName, date);
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { borderDash: [2, 2] } } },
                plugins: { legend: { position: 'top' } }
            }
        });

        // 2.2 Pie Chart
        const ctxPie = document.getElementById('pieChart').getContext('2d');
        if (this.charts.pie) this.charts.pie.destroy();

        this.charts.pie = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Present', 'Late', 'Absent', 'Leave'],
                datasets: [{
                    data: [sumPresent, sumLate, sumAbsent, sumLeave],
                    backgroundColor: ['#198754', '#ffc107', '#dc3545', '#0dcaf0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }
            }
        });
    },

    // --- 3. DATA TABLE ---
    renderTable(data, viewMode = 'LINE') {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        let grouped = {};

        data.forEach(row => {
            let key = viewMode === 'LINE' ? (row.line_name || 'Unassigned') : (row.shift_name || 'Unassigned');
            
            if (!grouped[key]) {
                grouped[key] = {
                    name: key,
                    plan: 0, present: 0, late: 0, absent: 0, leave: 0,
                    cost: 0,
                    subs: [] 
                };
            }

            const plan = parseInt(row.plan || 0);
            const pres = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            const abs  = parseInt(row.absent || 0);
            const lve  = parseInt(row.leave || 0);
            const cost = parseFloat(row.total_cost || 0);

            grouped[key].plan += plan;
            grouped[key].present += pres;
            grouped[key].late += late;
            grouped[key].absent += abs;
            grouped[key].leave += lve;
            grouped[key].cost += cost;

            grouped[key].subs.push({
                subName: viewMode === 'LINE' ? row.shift_name : row.line_name,
                team: row.team_group || '-',
                category: row.emp_type || '-',
                cost: cost,
                ...row 
            });
        });

        Object.values(grouped).forEach(g => {
            const actual = g.present + g.late;
            const diff = actual - g.plan;
            const diffClass = diff < 0 ? 'text-danger' : (diff > 0 ? 'text-success' : 'text-muted');
            const cost = g.cost;

            // Master Row (เพิ่ม onclick เพื่อให้กดที่ชื่อแผนกในตารางแล้วเปิด Drill-down ได้ด้วย)
            const tr = document.createElement('tr');
            tr.className = 'table-light fw-bold border-bottom cursor-pointer'; // เพิ่ม cursor-pointer
            
            // ผูก event click ที่แถวแม่
            if(viewMode === 'LINE') {
                tr.onclick = () => {
                    const date = document.getElementById('filterDate').value;
                    Actions.openDetailModal(g.name, date);
                };
                tr.title = "คลิกเพื่อดูรายละเอียด";
            }

            tr.innerHTML = `
                <td class="ps-4 text-primary"><i class="fas fa-search-plus me-2 opacity-50"></i>${g.name}</td>
                <td class="text-center">-</td>
                <td class="text-center">${g.plan}</td>
                <td class="text-center text-success">${g.present}</td>
                <td class="text-center text-warning">${g.late}</td>
                <td class="text-center text-danger">${g.absent}</td>
                <td class="text-center text-info">${g.leave}</td>
                <td class="text-center ${diffClass}">${diff > 0 ? '+'+diff : diff}</td>
                <td class="text-end pe-4">${cost.toLocaleString()}</td>
            `;
            tbody.appendChild(tr);

            // Sub Rows
            g.subs.forEach(s => {
                const sPlan = parseInt(s.plan||0);
                const sPres = parseInt(s.present||0);
                const sLate = parseInt(s.late||0);
                const sAbs  = parseInt(s.absent||0);
                const sLve  = parseInt(s.leave||0);
                const sAct  = sPres + sLate;
                const sDiff = sAct - sPlan;
                const sDiffClass = sDiff < 0 ? 'text-danger' : (sDiff > 0 ? 'text-success' : 'text-muted');
                const sCost = s.cost;

                const subTr = document.createElement('tr');
                subTr.innerHTML = `
                    <td class="ps-5 text-muted small" style="font-size:0.85rem;">
                        <i class="fas fa-angle-right me-2 opacity-50"></i>${s.category} (${s.team})
                    </td>
                    <td class="text-center small text-muted">${s.subName}</td>
                    <td class="text-center text-muted small">${sPlan}</td>
                    <td class="text-center small">${sPres > 0 ? sPres : '-'}</td>
                    <td class="text-center small">${sLate > 0 ? sLate : '-'}</td>
                    <td class="text-center small">${sAbs > 0 ? sAbs : '-'}</td>
                    <td class="text-center small">${sLve > 0 ? sLve : '-'}</td>
                    <td class="text-center ${sDiffClass} small">${sDiff > 0 ? '+'+sDiff : sDiff}</td>
                    <td class="text-end pe-4 text-muted small">${sCost.toLocaleString()}</td>
                `;
                tbody.appendChild(subTr);
            });
        });
    },

    animateNumber(elementId, endValue) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        const startValue = parseInt(obj.innerHTML.replace(/,/g, '')) || 0;
        if (startValue === endValue) return;
        obj.innerHTML = endValue.toLocaleString();
    },

    showToast(message, type) { alert(message); },
    showLoader() { document.getElementById('syncLoader').style.display = 'block'; },
    hideLoader() { document.getElementById('syncLoader').style.display = 'none'; }
};

// --- 4. DRILL-DOWN & ACTIONS ---

const Actions = {
    currentLine: null,
    
    // 4.1 เปิดหน้าต่างรายชื่อ (Drill-down)
    async openDetailModal(lineName, date) {
        this.currentLine = lineName;
        const modalEl = document.getElementById('detailListModal');
        const modal = new bootstrap.Modal(modalEl);
        
        document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-layer-group me-2"></i>${lineName}`;
        document.getElementById('detailModalSubtitle').innerText = `ข้อมูลประจำวันที่ ${date}`;
        document.getElementById('detailTableBody').innerHTML = `<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
        
        // [FIX] เรียก Init Search แบบล้างค่าเก่า
        this.initSearch();

        modal.show();

        try {
            const rawData = await API.getDailyLog(date, lineName);
            this.renderDetailList(rawData);
        } catch (err) {
            console.error(err);
            document.getElementById('detailTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error loading data</td></tr>`;
        }
    },

    // 4.2 วาดตารางรายชื่อ
    renderDetailList(data) {
        const tbody = document.getElementById('detailTableBody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">ไม่พบพนักงานในแผนกนี้</td></tr>`;
            return;
        }

        data.forEach(row => {
            const statusBadge = this.getStatusBadge(row.status);
            const timeIn = row.scan_in_time ? row.scan_in_time.substring(11, 16) : '-';
            const timeOut = row.scan_out_time ? row.scan_out_time.substring(11, 16) : '-';
            const shiftName = row.shift_name || '-';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4">
                    <div class="fw-bold text-dark">${row.name_th}</div>
                    <small class="text-muted" style="font-size:0.75rem;">${row.emp_id} | ${row.position}</small>
                </td>
                <td class="text-primary fw-bold font-monospace">${timeIn}</td>
                <td class="text-primary fw-bold font-monospace">${timeOut}</td>
                <td class="text-center"><span class="badge bg-light text-dark border">${shiftName}</span></td>
                <td class="text-center">${statusBadge}</td>
                <td class="small text-muted text-truncate" style="max-width: 150px;">${row.remark || '-'}</td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-primary border-0" onclick='Actions.openEditModal(${JSON.stringify(row)})'>
                        <i class="fas fa-pen-square fa-lg"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 4.3 เปิดหน้าต่างแก้ไข (Edit Modal)
    openEditModal(row) {
        // ไม่ต้องซ่อน Detail Modal เพราะเราใช้ Z-Index จัดการแล้ว
        const modal = new bootstrap.Modal(document.getElementById('editLogModal'));
        
        // Fill Data
        document.getElementById('editLogId').value = row.log_id || 0;
        document.getElementById('editEmpIdHidden').value = row.emp_id;
        document.getElementById('editEmpName').value = row.name_th;
        
        document.getElementById('editLogLine').value = row.line || '-';
        document.getElementById('editLogTeam').value = row.team_group || '-';
        
        document.getElementById('editStatus').value = row.status || 'WAITING';
        document.getElementById('editLogShift').value = row.actual_shift_id || '';
        
        // Fix Date Format for datetime-local input (replace space with T)
        document.getElementById('editScanInTime').value = row.scan_in_time ? row.scan_in_time.replace(' ', 'T') : '';
        document.getElementById('editScanOutTime').value = row.scan_out_time ? row.scan_out_time.replace(' ', 'T') : '';
        
        document.getElementById('editRemark').value = row.remark || '';
        
        modal.show();
    },

    // 4.4 บันทึกข้อมูล (Save)
    async saveLogChanges() {
        const payload = {
            action: 'update_log',
            log_id: document.getElementById('editLogId').value,
            emp_id: document.getElementById('editEmpIdHidden').value,
            status: document.getElementById('editStatus').value,
            shift_id: document.getElementById('editLogShift').value,
            scan_in_time: document.getElementById('editScanInTime').value.replace('T', ' '),
            scan_out_time: document.getElementById('editScanOutTime').value.replace('T', ' '),
            remark: document.getElementById('editRemark').value
        };

        if(!confirm('ยืนยันการบันทึกข้อมูล?')) return;

        try {
            const res = await API.updateLog(payload); 
            if(res.success) {
                alert('บันทึกเรียบร้อย!');
                bootstrap.Modal.getInstance(document.getElementById('editLogModal')).hide();
                
                // Refresh Detail List
                const date = document.getElementById('filterDate').value;
                this.openDetailModal(this.currentLine, date); 
                
                // Refresh Main Dashboard
                App.loadData();
            } else {
                alert('Error: ' + res.message);
            }
        } catch(err) {
            alert('Save Failed: ' + err.message);
        }
    },

    // [FIX] ระบบค้นหาแบบ Robust (ลบ Event เก่าทิ้งก่อนสร้างใหม่)
    initSearch() {
        const input = document.getElementById('searchDetail');
        if(!input) return;

        // Reset Value
        input.value = '';

        // Clone Node เพื่อลบ Event Listener เก่าที่อาจค้างอยู่
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        // Bind Event ใหม่
        newInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#detailTableBody tr');

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                if (text.includes(filter)) {
                    row.style.removeProperty('display');
                } else {
                    row.style.display = 'none';
                }
            });
        });
        
        // Auto Focus
        setTimeout(() => newInput.focus(), 500);
    },

    getStatusBadge(status) {
        const map = {
            'PRESENT': 'bg-success',
            'LATE': 'bg-warning text-dark',
            'ABSENT': 'bg-danger',
            'LEAVE': 'bg-info text-dark',
            'WAITING': 'bg-secondary'
        };
        let badgeClass = map[status] || (status.includes('LEAVE') ? map['LEAVE'] : 'bg-light text-dark border');
        return `<span class="badge ${badgeClass} fw-normal px-2 py-1">${status}</span>`;
    }
};

window.saveLogChanges = () => Actions.saveLogChanges();