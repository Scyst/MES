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
                        if(lineName) Actions.openDetailModal(lineName, '', 'ALL'); // Open All Shifts
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

    // --- 3. DATA TABLE (HIERARCHY ENGINE) ---
    processGroupedData(rawData, viewMode) {
        const groups = {};
        const grandTotal = {
            name: 'GRAND TOTAL',
            hc: 0, plan: 0, present: 0, late: 0, 
            absent: 0, leave: 0, actual: 0, diff: 0, cost: 0
        };

        rawData.forEach(row => {
            // Level 1: Line
            let mainKey = viewMode === 'LINE' ? (row.line_name || 'Unassigned') : (row.shift_name || 'Unassigned');
            // Level 2: Shift (หรือ Team)
            let subKeyName = viewMode === 'LINE' 
                ? `${row.shift_name || '-'} ${row.team_group ? '('+row.team_group+')' : ''}`
                : (row.line_name || '-');
            // Level 3: Emp Type
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

            // Init Groups
            if (!groups[mainKey]) groups[mainKey] = { name: mainKey, subs: {}, total: this._initStats() };
            this._accumulateStats(groups[mainKey].total, stats);

            if (!groups[mainKey].subs[subKeyName]) groups[mainKey].subs[subKeyName] = { name: subKeyName, items: {}, total: this._initStats() };
            this._accumulateStats(groups[mainKey].subs[subKeyName].total, stats);

            if (!groups[mainKey].subs[subKeyName].items[itemKeyName]) {
                groups[mainKey].subs[subKeyName].items[itemKeyName] = { name: itemKeyName, ...stats };
            } else {
                this._accumulateStats(groups[mainKey].subs[subKeyName].items[itemKeyName], stats);
            }

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

    _initStats() {
        return { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 };
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

        // 1. Grand Total
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true });

        // 2. Groups
        const sortedKeys = Object.keys(groups).sort();
        sortedKeys.forEach(key => {
            const group = groups[key];
            
            // Parent Row (Line)
            // * คลิกเพื่อดู Drill-down ทั้งไลน์ *
            tbody.innerHTML += this._createRowHtml(group.name, group.total, { isParent: true, viewMode, rawName: group.name });

            const sortedSubs = Object.values(group.subs).sort((a, b) => a.name.localeCompare(b.name));
            sortedSubs.forEach(sub => {
                // Child Row (Shift)
                tbody.innerHTML += this._createRowHtml(sub.name, sub.total, { isChild: true });

                // GrandChild Row (Emp Type)
                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                sortedItems.forEach(item => {
                    tbody.innerHTML += this._createRowHtml(item.name, item, { isGrandChild: true });
                });
            });
        });
    },

    _createRowHtml(label, stats, options = {}) {
        const { isGrand, isParent, isChild, isGrandChild, viewMode, rawName } = options;

        let diffClass = 'text-muted opacity-50';
        let diffPrefix = '';
        if (stats.diff < 0) diffClass = 'text-danger fw-bold';
        else if (stats.diff > 0) { diffClass = 'text-warning fw-bold text-dark'; diffPrefix = '+'; }
        else if (stats.plan > 0) diffClass = 'text-success fw-bold';

        let rowClass = '', nameHtml = label, rowAttr = '';

        if (isGrand) {
            rowClass = 'table-dark fw-bold border-bottom-0';
            nameHtml = `<i class="fas fa-chart-pie me-2"></i>${label}`;
        } else if (isParent) {
            rowClass = 'table-secondary fw-bold border-top border-white';
            nameHtml = `<i class="fas fa-layer-group me-2 opacity-50"></i>${label}`;
            
            // 🔥 Drill-down Link for Line
            if (viewMode === 'LINE') {
                rowClass += ' cursor-pointer';
                rowAttr = `onclick="Actions.openDetailModal('${rawName}', '', 'ALL')" title="ดูรายละเอียด ${rawName}"`;
            }
        } else if (isChild) {
            rowClass = 'bg-light fw-bold';
            nameHtml = `<div style="padding-left: 25px; border-left: 3px solid #dee2e6;"><span class="text-dark small"><i class="fas fa-clock me-1 text-muted"></i>${label}</span></div>`;
        } else if (isGrandChild) {
            rowClass = 'bg-white';
            nameHtml = `<div style="padding-left: 50px; border-left: 3px solid #dee2e6;"><span class="text-secondary small" style="font-size: 0.85rem;">• ${label}</span></div>`;
        }

        const costDisplay = stats.cost > 0 ? new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(stats.cost) : '-';

        return `
            <tr class="${rowClass}" ${rowAttr}>
                <td class="ps-3 text-truncate" style="max-width: 300px;">${nameHtml}</td>
                <td class="text-center text-primary border-end border-light opacity-75 small">${stats.hc || '-'}</td>
                <td class="text-center fw-bold">${stats.plan}</td>
                <td class="text-center text-success">${stats.present || '-'}</td>
                <td class="text-center text-warning text-dark">${stats.late || '-'}</td>
                <td class="text-center text-danger cursor-pointer" onclick="event.stopPropagation(); Actions.openDetailModal('${rawName || ''}', '', 'ABSENT')" title="ดูคนขาด">${stats.absent || '-'}</td>
                <td class="text-center text-info text-dark">${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end" style="background-color: rgba(0,0,0,0.02);">${stats.actual}</td>
                <td class="text-center ${diffClass}">${diffPrefix}${stats.diff}</td>
                <td class="text-end pe-4 text-secondary small">${costDisplay}</td>
            </tr>
        `;
    },

    animateNumber(elementId, endValue) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        obj.innerHTML = endValue.toLocaleString();
    },

    showToast(message, type) { alert(message); }, // เปลี่ยนเป็น Toast จริงๆ สวยกว่าถ้ามี Lib
    showLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'block'; },
    hideLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'none'; },
    
    getStatusBadge(status) {
        const map = { 'PRESENT': 'bg-success', 'LATE': 'bg-warning text-dark', 'ABSENT': 'bg-danger', 'LEAVE': 'bg-info text-dark', 'WAITING': 'bg-secondary' };
        let badgeClass = map[status] || (status && status.includes('LEAVE') ? map['LEAVE'] : 'bg-light text-dark border');
        return `<span class="badge ${badgeClass} fw-normal px-2 py-1">${status}</span>`;
    }
};

// --- 4. ACTIONS & DRILL-DOWN ---

const Actions = {
    // เก็บโครงสร้าง Line/Team ไว้ใช้สร้าง Dropdown ในตาราง
    _structureCache: { lines: [], teams: [] },

    // 4.1 เปิดหน้าต่างรายชื่อ (Drill-down)
    async openDetailModal(line, shiftId, filterStatus = 'ALL') {
        const date = document.getElementById('filterDate').value;
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        
        let title = line ? `${line}` : 'รายละเอียด';
        if (shiftId) title += ` (${shiftId == 1 ? 'กะเช้า ☀️' : 'กะดึก 🌙'})`;
        if (filterStatus !== 'ALL') title += ` - แสดงเฉพาะ ${filterStatus}`;

        document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-users me-2"></i> ${title}`;
        
        // [FIXED] แก้ colspan เป็น 9 ให้พอดีกับจำนวนคอลัมน์ใหม่
        document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="9" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;
        
        modal.show();

        // [FIX] Reset Search Box
        const searchInput = document.getElementById('searchDetail');
        if(searchInput) searchInput.value = '';

        // [Logic สำคัญ] เช็คว่ามีข้อมูล Dropdown หรือยัง ถ้าไม่มีให้โหลดก่อน
        if (this._structureCache.lines.length === 0) {
            await this.initDropdowns(); 
        }

        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'get_daily_details',
                    date: document.getElementById('filterDate').value,
                    line: line,
                    shift_id: shiftId,
                    filter_status: filterStatus
                })
            });
            const json = await res.json();
            
            if (json.success) {
                this.renderDetailTable(json.data);
            } else {
                document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">${json.message}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="9" class="text-center text-danger">Failed to load data</td></tr>`;
        }
    },

    // 4.2 วาดตารางรายชื่อ (Inline Edit)
    renderDetailTable(list) {
        const tbody = document.getElementById('detailModalBody');
        tbody.innerHTML = '';

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        const formatTime = (t) => t ? t.substring(11, 16) : '';
        const createOptions = (items, selectedVal, isTeam = false) => {
            let html = '';
            items.forEach(item => {
                const val = item;
                const sel = (val == selectedVal) ? 'selected' : '';
                html += `<option value="${val}" ${sel}>${val}</option>`;
            });
            return html;
        };

        list.forEach(row => {
            const uid = row.emp_id; 
            
            // 1. Snapshot Options (ข้อมูลรายวัน)
            const lineOpts = createOptions(this._structureCache.lines, row.actual_line || row.line); 
            const teamOpts = createOptions(this._structureCache.teams, row.actual_team || row.team_group, true);
            const shift1Sel = (row.shift_id == 1 || (!row.shift_id && row.default_shift_id == 1)) ? 'selected' : '';
            const shift2Sel = (row.shift_id == 2 || (!row.shift_id && row.default_shift_id == 2)) ? 'selected' : '';

            // 2. Status Options
            const statusOptions = [
                { val: 'PRESENT', label: '✅ มา' },
                { val: 'LATE', label: '⏰ สาย' },
                { val: 'ABSENT', label: '❌ ขาด' },
                { val: 'SICK', label: '🤢 ป่วย' },
                { val: 'BUSINESS', label: '👜 กิจ' },
                { val: 'VACATION', label: '🏖️ พักร้อน' },
                { val: 'OTHER', label: '⚪ อื่นๆ' }
            ];
            let statusOptsHtml = '';
            statusOptions.forEach(opt => {
                const selected = (row.status === opt.val) ? 'selected' : '';
                statusOptsHtml += `<option value="${opt.val}" ${selected}>${opt.label}</option>`;
            });

            // 🔥 [NEW] 3. เตรียมข้อมูล Master เพื่อส่งไปหน้า Edit Modal
            // เราต้อง map ชื่อ field ให้ตรงกับที่ openEmpEdit ต้องการ
            const masterData = {
                emp_id: row.emp_id,
                name_th: row.name_th,
                position: row.position,
                // ระวัง! ต้องส่งค่า Master (row.line) ไม่ใช่ Snapshot (row.actual_line)
                line: row.line, 
                team_group: row.team_group,
                default_shift_id: row.default_shift_id,
                is_active: 1 // สมมติว่าเป็น 1 เพราะโชว์ในหน้านี้ได้
            };
            const masterDataJson = encodeURIComponent(JSON.stringify(masterData));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="ps-4">
                    <div class="fw-bold text-truncate" style="max-width: 150px;" title="${row.name_th}">${row.name_th}</div>
                    <small class="text-muted" style="font-size:0.7rem;">${row.emp_id}</small>
                </td>
                
                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-light small" id="line_${uid}" style="font-size: 0.8rem;">
                        ${lineOpts}
                    </select>
                </td>

                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-light small" id="team_${uid}" style="font-size: 0.8rem;">
                        <option value="-">-</option>
                        ${teamOpts}
                    </select>
                </td>

                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-light small fw-bold text-primary" id="shift_${uid}" style="font-size: 0.8rem;">
                        <option value="1" ${shift1Sel}>Day</option>
                        <option value="2" ${shift2Sel}>Night</option>
                    </select>
                </td>

                <td class="p-1 text-center">
                    <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0" 
                           id="in_${uid}" value="${formatTime(row.scan_in_time)}">
                </td>
                <td class="p-1 text-center">
                    <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0" 
                           id="out_${uid}" value="${formatTime(row.scan_out_time)}">
                </td>

                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-light fw-bold" id="status_${uid}" style="font-size: 0.8rem;">
                        ${statusOptsHtml}
                    </select>
                </td>

                <td class="p-1">
                    <input type="text" class="form-control form-control-sm border-0 border-bottom rounded-0" 
                           id="remark_${uid}" value="${row.remark || ''}" placeholder="...">
                </td>

                <td class="text-center pe-4 text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary border-0 rounded-circle me-1" 
                            style="width: 30px; height: 30px;"
                            onclick="Actions.openEmpEdit('${masterDataJson}')" 
                            title="แก้ไขข้อมูลหลัก (Master Data)">
                        <i class="fas fa-user-edit"></i>
                    </button>

                    <button class="btn btn-sm btn-primary shadow-sm rounded-circle" 
                            style="width: 30px; height: 30px;"
                            onclick="Actions.saveLogStatus('${row.log_id}', '${uid}')" 
                            title="บันทึกการลงเวลา">
                        <i class="fas fa-save"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 4.3 บันทึกสถานะ (แก้ไขให้รับ empId และเช็ค Element ก่อนดึงค่า)
    async saveLogStatus(logId, empId) {
        // ดึงค่าจาก Input ทั้งหมด
        const elStatus = document.getElementById(`status_${empId}`);
        const elLine   = document.getElementById(`line_${empId}`);
        const elTeam   = document.getElementById(`team_${empId}`);
        const elShift  = document.getElementById(`shift_${empId}`);
        const elRemark = document.getElementById(`remark_${empId}`);
        const elIn     = document.getElementById(`in_${empId}`);
        const elOut    = document.getElementById(`out_${empId}`);
        
        if (!elStatus || !elLine) return; // Safety check

        // เตรียม Payload
        const dateStr = document.getElementById('filterDate').value;
        const timeIn = elIn.value;
        const timeOut = elOut.value;

        // Date Logic (เหมือนเดิม)
        let scanInFull = timeIn ? `${dateStr} ${timeIn}:00` : null;
        let scanOutFull = null;
        if (timeOut) {
            let outDate = dateStr;
            const hourOut = parseInt(timeOut.split(':')[0]);
            if ((timeIn && timeOut < timeIn) || (hourOut >= 0 && hourOut <= 7)) {
                const d = new Date(dateStr); d.setDate(d.getDate() + 1);
                outDate = d.toISOString().split('T')[0];
            }
            scanOutFull = `${outDate} ${timeOut}:00`;
        }

        const btn = event.currentTarget; 
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;

        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_log',
                    log_id: logId,
                    emp_id: empId,
                    log_date: dateStr,
                    
                    // 🔥 ส่งข้อมูล Snapshot ที่แก้ไขไปด้วย
                    actual_line: elLine.value,
                    actual_team: elTeam.value,
                    shift_id: elShift.value,

                    status: elStatus.value,
                    remark: elRemark.value,
                    scan_in_time: scanInFull,
                    scan_out_time: scanOutFull
                })
            });
            const json = await res.json();

            if (json.success) {
                btn.classList.replace('btn-primary', 'btn-success');
                btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    btn.classList.replace('btn-success', 'btn-primary');
                    btn.innerHTML = originalIcon;
                    btn.disabled = false;
                    App.loadData(); // Refresh Main Dashboard
                }, 1000);
            } else {
                alert('Error: ' + json.message);
                btn.innerHTML = originalIcon;
                btn.disabled = false;
            }
        } catch (err) {
            alert('Failed: ' + err.message);
            btn.innerHTML = originalIcon;
            btn.disabled = false;
        }
    },

    // 4.3 เปิดหน้าต่างแก้ไข (Edit Modal) - แก้ไขให้รับค่า Line/Team มาใส่
    openEditModal(row) {
        const modal = new bootstrap.Modal(document.getElementById('editLogModal'));
        
        // Fill IDs
        document.getElementById('editLogId').value = row.log_id || 0;
        document.getElementById('editEmpIdHidden').value = row.emp_id;
        document.getElementById('editEmpName').value = row.name_th;
        
        // 🔥 Fill Snapshot Data (Line & Team)
        // ถ้าเป็นข้อมูลเก่า row.line คือ actual_line, ถ้าใหม่คือ master line
        document.getElementById('editLogLine').value = row.line || 'ASSEMBLY'; 
        document.getElementById('editLogTeam').value = row.team_group || '-';
        
        // Fill Status & Shift
        document.getElementById('editStatus').value = row.status || 'WAITING';
        document.getElementById('editLogShift').value = row.actual_shift_id || '';
        
        // Fix Date Format
        document.getElementById('editScanInTime').value = row.scan_in_time ? row.scan_in_time.replace(' ', 'T') : '';
        document.getElementById('editScanOutTime').value = row.scan_out_time ? row.scan_out_time.replace(' ', 'T') : '';
        document.getElementById('editRemark').value = row.remark || '';
        
        modal.show();
    },

    // 4.4 บันทึกข้อมูล (Save) - ส่ง Line/Team กลับไปด้วย
    async saveLogChanges() {
        const payload = {
            action: 'update_log',
            log_id: document.getElementById('editLogId').value,
            emp_id: document.getElementById('editEmpIdHidden').value,
            
            // 🔥 ส่งค่า Snapshot ที่เลือกใหม่กลับไป
            actual_line: document.getElementById('editLogLine').value,
            actual_team: document.getElementById('editLogTeam').value,
            
            status: document.getElementById('editStatus').value,
            shift_id: document.getElementById('editLogShift').value,
            scan_in_time: document.getElementById('editScanInTime').value.replace('T', ' '),
            scan_out_time: document.getElementById('editScanOutTime').value.replace('T', ' '),
            remark: document.getElementById('editRemark').value,
            
            // เอาวันที่จาก Dashboard ไปด้วย เพื่อความชัวร์
            log_date: document.getElementById('filterDate').value 
        };

        if(!confirm('ยืนยันการบันทึกการแก้ไขประวัติ?')) return;

        try {
            const res = await fetch('api/api_daily_operations.php', { // เรียกใช้ไฟล์เดิม
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }); 
            const json = await res.json();
            
            if(json.success) {
                alert('บันทึกเรียบร้อย!');
                bootstrap.Modal.getInstance(document.getElementById('editLogModal')).hide();
                
                // Refresh หน้าจอ
                const date = document.getElementById('filterDate').value;
                // ถ้าเปิดมาจาก Drill-down ให้รีเฟรช Drill-down ด้วย
                if (document.getElementById('detailModal').classList.contains('show')) {
                     // ดึงชื่อ Line จากหัวข้อ Modal (Trick) หรือตัวแปร Global
                     const currentTitle = document.getElementById('detailModalTitle').innerText; // e.g. "PAINT (Day)"
                     // แต่เพื่อความง่าย Refresh Main Data ก็พอ
                }
                
                App.loadData();
            } else {
                alert('Error: ' + json.message);
            }
        } catch(err) {
            alert('Save Failed: ' + err.message);
        }
    },

    // [FIX] ระบบค้นหา (แก้ Bug ให้หาเจอใน detailModalBody)
    initSearch() {
        const input = document.getElementById('searchDetail');
        if(!input) return;

        // Clone Node เพื่อลบ Event เก่า
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            // [FIX] ต้องหาใน #detailModalBody
            const rows = document.querySelectorAll('#detailModalBody tr');

            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
            });
        });
    },

    // --- 5. SHIFT PLANNER ---
    async openShiftPlanner() {
        const modalEl = document.getElementById('shiftPlannerModal');
        const modal = new bootstrap.Modal(modalEl);
        document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-warning"></div></td></tr>`;
        modal.show();

        try {
            const res = await fetch('api/api_master_data.php?action=read_team_shifts');
            const json = await res.json();
            if (json.success) this.renderShiftPlannerTable(json.data);
            else alert('Error: ' + json.message);
        } catch (err) {
            console.error(err);
            document.getElementById('shiftPlannerBody').innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load data</td></tr>`;
        }
    },

    renderShiftPlannerTable(teams) {
        const tbody = document.getElementById('shiftPlannerBody');
        tbody.innerHTML = '';
        let currentLine = null;

        teams.forEach(t => {
            if (t.line !== currentLine) {
                currentLine = t.line;
                tbody.innerHTML += `<tr class="table-secondary fw-bold"><td colspan="4">${currentLine}</td></tr>`;
            }
            
            const isDay = (t.default_shift_id == 1);
            const shiftBadge = isDay 
                ? `<span class="badge bg-info text-dark"><i class="fas fa-sun me-1"></i> DAY</span>`
                : `<span class="badge bg-dark"><i class="fas fa-moon me-1"></i> NIGHT</span>`;

            const btnClass = isDay ? 'btn-outline-dark' : 'btn-outline-info';
            const btnLabel = isDay ? '<i class="fas fa-moon me-1"></i> To Night' : '<i class="fas fa-sun me-1"></i> To Day';
            const targetShiftId = isDay ? 2 : 1;

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4"><span class="fw-bold text-primary">${t.team_group || '-'}</span> <small class="text-muted">(${t.member_count} คน)</small></td>
                    <td class="text-center">${shiftBadge}</td>
                    <td class="text-center text-muted small">${t.default_shift_id}</td>
                    <td class="text-center pe-4">
                        <button class="btn btn-sm ${btnClass} fw-bold" onclick="Actions.switchTeamShift('${t.line}', '${t.team_group}', ${targetShiftId})">${btnLabel}</button>
                    </td>
                </tr>
            `;
        });
    },

    async switchTeamShift(line, team, newShiftId) {
        const shiftName = (newShiftId == 1) ? "🌞 DAY" : "🌙 NIGHT";
        if (!confirm(`เปลี่ยนกะของ [${line} - ${team}] เป็น ${shiftName} ?`)) return;

        try {
            const res = await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_team_shift', line, team, new_shift_id: newShiftId })
            });
            const json = await res.json();

            if (json.success) {
                alert(`✅ เปลี่ยนกะสำเร็จ! กรุณากด 'Reset & Sync' ข้อมูลใหม่`);
                this.openShiftPlanner();
            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    },

    // 5.5 Export Excel
    exportExcel() {
        const date = document.getElementById('filterDate').value;
        // ส่งไปยังไฟล์ export ที่สร้างไว้
        window.location.href = `api/api_export.php?date=${date}`;
    },
    
    // Variables Cache สำหรับ Address Book (เก็บข้อมูลดิบไว้ค้นหา)
    _employeeCache: [],

    // 5.6 เปิดสมุดรายชื่อ (Address Book)
    async openEmployeeManager() {
        const modal = new bootstrap.Modal(document.getElementById('empListModal'));
        document.getElementById('empListBody').innerHTML = `<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
        modal.show();

        try {
            const res = await fetch('api/api_master_data.php?action=read_employees');
            const json = await res.json();
            
            if (json.success) {
                this._employeeCache = json.data;
                this.renderEmployeeTable(json.data);
            } else {
                alert('Error loading employees');
            }
        } catch (err) {
            console.error(err);
        }
    },

    // 5.7 วาดตารางพนักงาน
    renderEmployeeTable(list) {
        const tbody = document.getElementById('empListBody');
        tbody.innerHTML = '';

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        const displayList = list.slice(0, 100); // Limit 100 คนแรกเพื่อความลื่น

        displayList.forEach(emp => {
            const statusBadge = (emp.is_active == 1) 
                ? '<span class="badge bg-success bg-opacity-10 text-success">Active</span>' 
                : '<span class="badge bg-secondary bg-opacity-10 text-secondary">Inactive</span>';
            
            const empJson = encodeURIComponent(JSON.stringify(emp));

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 font-monospace small">${emp.emp_id}</td>
                    <td class="fw-bold text-primary">${emp.name_th}</td>
                    <td>${emp.position || '-'}</td>
                    <td><span class="badge bg-light text-dark border">${emp.line}</span></td>
                    <td class="text-center">${emp.shift_name || '-'}</td>
                    <td class="text-center fw-bold">${emp.team_group || '-'}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center pe-4">
                        <button class="btn btn-sm btn-outline-secondary" onclick="Actions.openEmpEdit('${empJson}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </td>
                </tr>
            `;
        });
    },

    // 5.8 กรองรายชื่อ (Search)
    filterEmployeeList() {
        const term = document.getElementById('empSearchBox').value.toLowerCase();
        const filtered = this._employeeCache.filter(emp => {
            return (emp.name_th && emp.name_th.toLowerCase().includes(term)) ||
                   (emp.emp_id && emp.emp_id.toLowerCase().includes(term)) ||
                   (emp.line && emp.line.toLowerCase().includes(term));
        });
        this.renderEmployeeTable(filtered);
    },

    // 5.9 เปิดหน้าแก้ไข/สร้างใหม่ (Edit Modal)
    openEmpEdit(empDataEncoded = null) {
        const modal = new bootstrap.Modal(document.getElementById('empEditModal'));
        const isEdit = !!empDataEncoded;
        
        document.getElementById('isEditMode').value = isEdit ? '1' : '0';
        document.getElementById('empEditTitle').innerHTML = isEdit ? '<i class="fas fa-user-edit me-2"></i>Edit Employee' : '<i class="fas fa-user-plus me-2"></i>New Employee';
        
        const btnDel = document.getElementById('btnDeleteEmp');
        if(btnDel) btnDel.style.display = isEdit ? 'block' : 'none';

        if (isEdit) {
            const emp = JSON.parse(decodeURIComponent(empDataEncoded));
            document.getElementById('empEditId').value = emp.emp_id;
            document.getElementById('empEditId').readOnly = true;
            document.getElementById('empEditName').value = emp.name_th;
            document.getElementById('empEditPos').value = emp.position;
            document.getElementById('empEditLine').value = emp.line;
            document.getElementById('empEditShift').value = emp.default_shift_id;
            document.getElementById('empEditTeam').value = emp.team_group;
            document.getElementById('empEditActive').checked = (emp.is_active == 1);
        } else {
            document.getElementById('empEditForm').reset();
            document.getElementById('empEditId').readOnly = false;
            document.getElementById('empEditActive').checked = true;
        }
        modal.show();
    },

    // 5.10 บันทึกข้อมูลพนักงาน
    async saveEmployee() {
        const isEdit = document.getElementById('isEditMode').value === '1';
        const payload = {
            action: isEdit ? 'update_employee' : 'create_employee',
            emp_id: document.getElementById('empEditId').value,
            name_th: document.getElementById('empEditName').value,
            position: document.getElementById('empEditPos').value,
            line: document.getElementById('empEditLine').value,
            shift_id: document.getElementById('empEditShift').value,
            team_group: document.getElementById('empEditTeam').value,
            is_active: document.getElementById('empEditActive').checked ? 1 : 0
        };

        if(!payload.emp_id || !payload.name_th || !payload.line) {
            alert('กรุณากรอกข้อมูลให้ครบ (ID, Name, Line)');
            return;
        }

        try {
            const res = await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (json.success) {
                alert('Saved Successfully!');
                bootstrap.Modal.getInstance(document.getElementById('empEditModal')).hide();
                this.openEmployeeManager(); // Refresh List
                App.loadData(); // Refresh Dashboard
            } else {
                alert('Error: ' + json.message);
            }
        } catch (err) {
            alert('Failed: ' + err.message);
        }
    },

    // 5.11 ปิดการใช้งานพนักงาน (Soft Delete / Disable)
    async deleteEmployee() {
        const empId = document.getElementById('empEditId').value;
        const empName = document.getElementById('empEditName').value;

        // เปลี่ยนข้อความยืนยันให้ชัดเจน
        if(!confirm(`ยืนยันการ "ปิดการใช้งาน" (Set Inactive) พนักงานท่านนี้?\n\nรหัส: ${empId}\nชื่อ: ${empName}\n\n(ข้อมูลประวัติการทำงานจะยังคงอยู่)`)) return;

        // เทคนิค: สั่ง Uncheck ปุ่ม Active ในฟอร์ม แล้วเรียก Save เลย
        document.getElementById('empEditActive').checked = false;
        
        // เรียกฟังก์ชัน saveEmployee() เพื่อส่งค่า update_employee ไปที่ API
        // ซึ่งมันจะส่งค่า is_active = 0 ไปให้เอง
        await this.saveEmployee();
    },

    // [FIXED] Init Dropdowns - เพิ่มการเก็บ Cache
    async initDropdowns() {
        try {
            const res = await fetch('api/api_master_data.php?action=read_structure');
            const json = await res.json();

            if (json.success) {
                // 🔥 [สำคัญมาก] เก็บข้อมูลเข้า Cache เพื่อให้ DetailTable ดึงไปใช้
                this._structureCache.lines = json.lines;
                this._structureCache.teams = json.teams;

                // (โค้ดเดิมที่ Populate หน้า Modal อื่นๆ...)
                const lineSelects = ['editLogLine', 'filterLine', 'empEditLine']; 
                const teamSelects = ['editLogTeam', 'empEditTeam'];
                
                lineSelects.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        let currentVal = el.value;
                        el.innerHTML = '<option value="">-- Select --</option>';
                        if(id==='filterLine') el.innerHTML += '<option value="ALL">All Lines</option>';
                        json.lines.forEach(l => el.innerHTML += `<option value="${l}">${l}</option>`);
                        if(currentVal && json.lines.includes(currentVal)) el.value = currentVal;
                    }
                });

                teamSelects.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.innerHTML = '<option value="">-</option>';
                        json.teams.forEach(t => el.innerHTML += `<option value="${t}">Team ${t}</option>`);
                    }
                });
            }
        } catch (err) {
            console.error('Failed to load dropdowns:', err);
        }
    }
};
