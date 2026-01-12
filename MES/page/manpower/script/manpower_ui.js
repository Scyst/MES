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
        const labels = [];
        const dataPlan = [];
        const dataActual = [];
        const grouped = {};
        let sumPresent = 0, sumLate = 0, sumAbsent = 0, sumLeave = 0;

        data.forEach(row => {
            const line = row.line_name || 'Other';
            if (!grouped[line]) grouped[line] = { plan: 0, actual: 0 };
            
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            
            grouped[line].plan += plan;
            grouped[line].actual += (present + late);

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

        // Bar Chart
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
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const lineName = labels[index]; 
                        if(lineName) Actions.openDetailModal(lineName, document.getElementById('filterDate').value);
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, grid: { borderDash: [2, 2] } } },
                plugins: { legend: { position: 'top' } }
            }
        });

        // Pie Chart
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

    // --- 3. DATA TABLE (3-LEVEL HIERARCHY ENGINE) ---
    
    processGroupedData(rawData, viewMode) {
        const groups = {};
        const grandTotal = {
            name: 'GRAND TOTAL',
            hc: 0, plan: 0, present: 0, late: 0, 
            absent: 0, leave: 0, actual: 0, diff: 0, cost: 0
        };

        rawData.forEach(row => {
            // Level 1 Key (Line)
            let mainKey = viewMode === 'LINE' ? (row.line_name || 'Unassigned') : (row.shift_name || 'Unassigned');
            
            // Level 2 Key (Shift)
            let subKeyName = viewMode === 'LINE' 
                ? `${row.shift_name || '-'} ${row.team_group ? '('+row.team_group+')' : ''}`
                : (row.line_name || '-');

            // Level 3 Key (Emp Type) - 🔥 สิ่งที่คุณต้องการ
            let itemKeyName = row.emp_type || 'General';

            const stats = {
                hc: parseInt(row.total_hc || 0), 
                plan: parseInt(row.plan || 0),
                present: parseInt(row.present || 0),
                late: parseInt(row.late || 0),
                absent: parseInt(row.absent || 0),
                leave: parseInt(row.leave || 0),
                cost: parseFloat(row.total_cost || 0)
            };
            stats.actual = stats.present + stats.late;

            // 1. Init Main Group
            if (!groups[mainKey]) {
                groups[mainKey] = {
                    name: mainKey,
                    subs: {}, // Level 2 Container
                    total: { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 }
                };
            }
            this._accumulateStats(groups[mainKey].total, stats);

            // 2. Init Sub Group (Shift)
            if (!groups[mainKey].subs[subKeyName]) {
                groups[mainKey].subs[subKeyName] = { 
                    name: subKeyName, 
                    items: {}, // Level 3 Container
                    total: { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 }
                };
            }
            this._accumulateStats(groups[mainKey].subs[subKeyName].total, stats);

            // 3. Init Item (Emp Type) - 🔥 เก็บแยกประเภทตรงนี้
            if (!groups[mainKey].subs[subKeyName].items[itemKeyName]) {
                groups[mainKey].subs[subKeyName].items[itemKeyName] = {
                    name: itemKeyName,
                    ...stats
                };
            } else {
                this._accumulateStats(groups[mainKey].subs[subKeyName].items[itemKeyName], stats);
            }

            // Grand Total
            this._accumulateStats(grandTotal, stats);
        });

        // Calculate Diffs
        this._calculateDiff(grandTotal);
        Object.values(groups).forEach(group => {
            this._calculateDiff(group.total);
            Object.values(group.subs).forEach(sub => {
                this._calculateDiff(sub.total);
                Object.values(sub.items).forEach(item => this._calculateDiff(item));
            });
        });

        return { groups, grandTotal };
    },

    _accumulateStats(target, source) {
        target.hc += source.hc;
        target.plan += source.plan;
        target.present += source.present;
        target.late += source.late;
        target.absent += source.absent;
        target.leave += source.leave;
        target.actual += source.actual;
        target.cost += source.cost;
    },

    _calculateDiff(obj) {
        obj.diff = obj.actual - obj.plan;
    },

    renderTable(data, viewMode = 'LINE') {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        const { groups, grandTotal } = this.processGroupedData(data, viewMode);

        // 1. Render Grand Total
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true });

        // 2. Render Groups
        const sortedKeys = Object.keys(groups).sort();
        
        sortedKeys.forEach(key => {
            const group = groups[key];

            // 2.1 Parent Row (Line)
            tbody.innerHTML += this._createRowHtml(group.name, group.total, { isParent: true, viewMode });

            // 2.2 Sub Rows (Shift)
            const sortedSubs = Object.values(group.subs).sort((a, b) => a.name.localeCompare(b.name));
            sortedSubs.forEach(sub => {
                // Shift Row (Bold หน่อย เพื่อเป็นหัวข้อของลูกๆ)
                tbody.innerHTML += this._createRowHtml(sub.name, sub.total, { isChild: true });

                // 2.3 Item Rows (Emp Type) - 🔥 แสดงรายการย่อยตรงนี้
                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                sortedItems.forEach(item => {
                    tbody.innerHTML += this._createRowHtml(item.name, item, { isGrandChild: true });
                });
            });
        });
    },

    _createRowHtml(label, stats, options = {}) {
        const { isGrand = false, isParent = false, isChild = false, isGrandChild = false, viewMode = 'LINE' } = options;

        // Logic สี Diff
        let diffClass = 'text-muted opacity-50';
        let diffPrefix = '';
        if (stats.diff < 0) {
            diffClass = 'text-danger fw-bold';
        } else if (stats.diff > 0) {
            diffClass = 'text-warning fw-bold text-dark';
            diffPrefix = '+';
        } else if (stats.plan > 0 && stats.diff === 0) {
            diffClass = 'text-success fw-bold';
        }

        // Style ของ Row
        let rowClass = '';
        let nameHtml = label;
        let rowAttr = '';

        if (isGrand) {
            rowClass = 'table-dark fw-bold border-bottom-0';
            nameHtml = `<i class="fas fa-chart-pie me-2"></i>${label}`;
        } else if (isParent) {
            rowClass = 'table-secondary fw-bold border-top border-white';
            nameHtml = `<i class="fas fa-layer-group me-2 opacity-50"></i>${label}`;
            
            if (viewMode === 'LINE') {
                rowClass += ' cursor-pointer';
                rowAttr = `onclick="Actions.openDetailModal('${label}', document.getElementById('filterDate').value)" title="คลิกเพื่อดูรายละเอียด"`;
            }
        } else if (isChild) {
            // Level 2 (Shift)
            rowClass = 'bg-light fw-bold';
            nameHtml = `<div style="padding-left: 25px; border-left: 3px solid #dee2e6;">
                            <span class="text-dark small"><i class="fas fa-clock me-1 text-muted"></i>${label}</span>
                        </div>`;
        } else if (isGrandChild) {
            // Level 3 (Emp Type) - 🔥 ย่อหน้าลึกเข้าไปอีก
            rowClass = 'bg-white';
            nameHtml = `<div style="padding-left: 50px; border-left: 3px solid #dee2e6;">
                            <span class="text-secondary small" style="font-size: 0.85rem;">• ${label}</span>
                        </div>`;
        }

        const costDisplay = stats.cost > 0 
            ? new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(stats.cost) 
            : '-';

        return `
            <tr class="${rowClass}" ${rowAttr}>
                <td class="ps-3 text-truncate" style="max-width: 300px;">${nameHtml}</td>
                <td class="text-center text-primary border-end border-light opacity-75 small">${stats.hc || '-'}</td>
                <td class="text-center fw-bold">${stats.plan}</td>
                <td class="text-center text-success">${stats.present || '-'}</td>
                <td class="text-center text-warning text-dark">${stats.late || '-'}</td>
                <td class="text-center text-danger">${stats.absent || '-'}</td>
                <td class="text-center text-info text-dark">${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end" style="background-color: rgba(0,0,0,0.02);">
                    ${stats.actual}
                </td>
                <td class="text-center ${diffClass}">
                    ${diffPrefix}${stats.diff}
                </td>
                <td class="text-end pe-4 text-secondary small">${costDisplay}</td>
            </tr>
        `;
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
    hideLoader() { document.getElementById('syncLoader').style.display = 'none'; },
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
    },

    // 4.5 เปิดหน้าจัดการกะ (Shift Planner)
    async openShiftPlanner() {
        const modalEl = document.getElementById('shiftPlannerModal');
        const modal = new bootstrap.Modal(modalEl);
        
        // ใส่ Loading รอ
        document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>`;
        modal.show();

        try {
            // เรียก API ไปดึงข้อมูลทีม
            const res = await fetch('api/api_master_data.php?action=read_team_shifts');
            const json = await res.json();
            
            if (json.success) {
                this.renderShiftPlannerTable(json.data);
            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            console.error(err);
            document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load data</td></tr>`;
        }
    },

    // 4.6 วาดตาราง Shift Planner
    renderShiftPlannerTable(teams) {
        const tbody = document.getElementById('shiftPlannerBody');
        tbody.innerHTML = '';

        // Group by Line เพื่อความสวยงาม
        let currentLine = null;

        teams.forEach(t => {
            // สร้าง Header แยก Line
            if (t.line !== currentLine) {
                currentLine = t.line;
                tbody.innerHTML += `<tr class="table-secondary fw-bold"><td colspan="4">${currentLine}</td></tr>`;
            }

            // ตรวจสอบกะปัจจุบัน (1=Day, 2=Night)
            const isDay = (t.default_shift_id == 1);
            const shiftBadge = isDay 
                ? `<span class="badge bg-info text-dark"><i class="fas fa-sun me-1"></i>DAY SHIFT</span>`
                : `<span class="badge bg-dark"><i class="fas fa-moon me-1"></i>NIGHT SHIFT</span>`;

            // ปุ่มสลับกะ (ตรงข้ามกับปัจจุบัน)
            const targetShiftId = isDay ? 2 : 1;
            const btnClass = isDay ? 'btn-outline-dark' : 'btn-outline-info';
            const btnLabel = isDay ? '<i class="fas fa-moon me-1"></i>Switch to Night' : '<i class="fas fa-sun me-1"></i>Switch to Day';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4">
                    <span class="fw-bold text-primary">${t.team_group || '-'}</span>
                    <small class="text-muted ms-2">(${t.member_count} คน)</small>
                </td>
                <td class="text-center">${shiftBadge}</td>
                <td class="text-center text-muted small">ID: ${t.default_shift_id}</td>
                <td class="text-center pe-4">
                    <button class="btn btn-sm ${btnClass} fw-bold" onclick="Actions.switchTeamShift('${t.line}', '${t.team_group}', ${targetShiftId})">
                        ${btnLabel}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 4.7 สั่งสลับกะ (API Call)
    async switchTeamShift(line, team, newShiftId) {
        const shiftName = (newShiftId == 1) ? "🌞 DAY" : "🌙 NIGHT";
        if (!confirm(`ยืนยันเปลี่ยนกะของ [${line} - ${team}] \nให้เป็น ${shiftName} SHIFT ?`)) return;

        try {
            const res = await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_team_shift',
                    line: line,
                    team: team,
                    new_shift_id: newShiftId
                })
            });
            const json = await res.json();

            if (json.success) {
                alert(`✅ เรียบร้อย! เปลี่ยนกะสำเร็จ\n\nคำแนะนำ: กรุณากดปุ่ม 'Reset & Sync' ที่หน้า Dashboard เพื่ออัปเดตข้อมูลของวันนี้ใหม่`);
                this.openShiftPlanner(); // โหลดตารางใหม่
            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    }
};

window.saveLogChanges = () => Actions.saveLogChanges();