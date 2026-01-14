// page/manpower/script/manpower_ui.js
"use strict";

const UI = {
    charts: {},

    // =========================================================================
    // 1. KPI CARDS
    // =========================================================================
    // =========================================================================
    // 1. KPI CARDS
    // =========================================================================
    renderKPI(data) {
        let totalPlan = 0, totalActual = 0, totalLate = 0, totalAbsent = 0, totalLeave = 0;
        let totalCost = 0;

        data.forEach(row => {
            const plan = parseInt(row.plan || 0);
            const present = parseInt(row.present || 0);
            const late = parseInt(row.late || 0);
            const absent = parseInt(row.absent || 0);
            const leave = parseInt(row.leave || 0); // 🔥 เพิ่มการรับค่า Leave
            const cost = parseFloat(row.total_cost || 0);

            totalPlan += plan;
            totalActual += (present + late);
            totalLate += late;
            totalAbsent += absent;
            totalLeave += leave; // 🔥 บวกยอด Leave
            totalCost += cost;
        });

        this.animateNumber('kpi-plan', totalPlan);
        this.animateNumber('kpi-actual', totalActual);
        this.animateNumber('kpi-cost', parseInt(totalCost));
        this.animateNumber('kpi-absent', totalAbsent);
        
        // Update Text
        document.getElementById('kpi-late').innerText = totalLate;
        document.getElementById('kpi-leave').innerText = totalLeave; // 🔥 แสดงยอด Leave

        const rate = totalPlan > 0 ? ((totalActual / totalPlan) * 100).toFixed(1) : 0;
        document.getElementById('kpi-rate').innerText = `${rate}% Attendance`;

        // --------------------------------------------------------
        // 🔥 Event Bindings (แก้เรื่องกดแล้วซ้อนกันตรงนี้)
        // --------------------------------------------------------
        
        // 1. Plan Card
        const cardPlan = document.getElementById('card-plan');
        if(cardPlan) cardPlan.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ALL');

        // 2. Actual Card
        const cardActual = document.getElementById('card-actual'); 
        if(cardActual) cardActual.onclick = () => Actions.openDetailModal('', '', 'ALL', 'PRESENT_AND_LATE');

        // 3. Absent Card (Parent) -> กดพื้นที่ว่างๆ จะไป Absent
        const cardAbsent = document.getElementById('card-absent');
        if(cardAbsent) cardAbsent.onclick = () => Actions.openDetailModal('', '', 'ALL', 'ABSENT');

        // 4. Late Button (Child) -> 🔥 ต้องมี stopPropagation() ไม่ให้ไปกระตุ้น Absent
        const cardLate = document.getElementById('card-late');
        if(cardLate) {
            cardLate.onclick = (e) => {
                e.stopPropagation(); // หยุดไม่ให้ทะลุไปหา Parent
                Actions.openDetailModal('', '', 'ALL', 'LATE');
            };
        }

        // 5. Leave Button (Child) -> 🔥 ต้องมี stopPropagation()
        const cardLeave = document.getElementById('card-leave');
        if(cardLeave) {
            cardLeave.onclick = (e) => {
                e.stopPropagation(); // หยุดไม่ให้ทะลุไปหา Parent
                Actions.openDetailModal('', '', 'ALL', 'LEAVE');
            };
        }
    },

    _bindKpiClick(elementId, status) {
        const el = document.getElementById(elementId);
        if (el) {
            el.style.cursor = 'pointer';
            el.onclick = () => Actions.openDetailModal('', '', 'ALL', status);
        }
    },

    // =========================================================================
    // 2. CHARTS
    // =========================================================================
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
            
            // รวม Leave ทุกประเภท (ตาม Logic ใหม่ใน DB)
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
                    { label: 'Plan', data: dataPlan, backgroundColor: '#4e73df', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 },
                    { label: 'Actual', data: dataActual, backgroundColor: '#1cc88a', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 }
                ]
            },
            options: {
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const lineName = labels[index]; 
                        if(lineName) Actions.openDetailModal(lineName, '', 'ALL', 'ALL'); 
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
        legend: { 
            position: 'top', 
            align: 'end', 
            labels: { 
                usePointStyle: true, 
                boxWidth: 8, 
                font: { family: 'Prompt', size: 14 } // 🔥 แก้ตรงนี้: เพิ่มขนาด Font Legend
            } 
        },
        tooltip: {
            bodyFont: { size: 14 },
            titleFont: { size: 14 }
        }
    },
    scales: { 
        y: { 
            beginAtZero: true, 
            border: { display: false },
            grid: { color: '#f3f6f9', drawBorder: false },
            ticks: { 
                font: { family: 'Prompt', size: 12 }, // 🔥 แก้ตรงนี้: แกน Y ใหญ่ขึ้น
                color: '#a0aec0' 
            }
        },
        x: { 
            grid: { display: false }, 
            ticks: { 
                font: { family: 'Prompt', size: 12, weight: 'bold' }, // 🔥 แก้ตรงนี้: แกน X (ชื่อ Line) ใหญ่และหนา
                color: '#718096' 
            }
        }
    },
    barThickness: 35,
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
                    backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 4
                }]
            },
            options: {
                onClick: (e, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const statuses = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE']; 
                        Actions.openDetailModal('', '', 'ALL', statuses[index]);
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { 
                            usePointStyle: true, 
                            padding: 20,
                            font: { family: 'Prompt', size: 14 } // 🔥 แก้ตรงนี้: ขยาย Font Legend ด้านล่าง
                        } 
                    },
                    tooltip: {
                        bodyFont: { size: 14 }
                    }
                },
                cutout: '65%',
                layout: { padding: 10 }
            }
        });
    },

    // =========================================================================
    // 3. MAIN TABLE (Hierarchy View - 3 Levels)
    // =========================================================================
    processGroupedData(rawData, viewMode) {
        const groups = {};
        const grandTotal = { name: 'GRAND TOTAL', hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 };

        rawData.forEach(row => {
            // ---------------------------------------------------------
            // 🔥 Logic การจัดกลุ่มตาม View Mode
            // ---------------------------------------------------------
            let mainKey, subKeyName, itemKeyName;
            
            // Meta Data สำหรับ Drill-down
            let metaLine = '', metaShift = '', metaType = '';

            // Extract Shift ID (Helper)
            let shiftId = '';
            if (row.shift_name && row.shift_name.includes('Day')) shiftId = '1';
            else if (row.shift_name && row.shift_name.includes('Night')) shiftId = '2';

            if (viewMode === 'TYPE') {
                // Mode 3: By Type (Type -> Line -> Shift)
                mainKey = row.emp_type || 'Uncategorized'; // Level 1
                subKeyName = row.line_name || '-';         // Level 2
                itemKeyName = `${row.shift_name} (${row.team_group})`; // Level 3
                
                // Set Meta for Child (Line)
                metaLine = row.line_name;
                metaType = mainKey;
                
            } else if (viewMode === 'SHIFT') {
                // Mode 2: By Shift (Shift -> Line -> Type)
                mainKey = row.shift_name || 'Unassigned';
                subKeyName = row.line_name || '-';
                itemKeyName = row.emp_type || 'General';
                
                // Set Meta for Child (Line)
                metaLine = row.line_name;
                metaShift = shiftId;

            } else {
                // Mode 1: By Line (Default: Line -> Shift -> Type)
                mainKey = row.line_name || 'Unassigned';
                subKeyName = `${row.shift_name} ${row.team_group ? '('+row.team_group+')' : ''}`;
                itemKeyName = row.emp_type || 'General';
                
                // Set Meta for Child (Shift)
                metaLine = mainKey;
                metaShift = shiftId;
            }
            // ---------------------------------------------------------

            const stats = {
                hc: parseInt(row.total_hc || 0), plan: parseInt(row.plan || 0),
                present: parseInt(row.present || 0), late: parseInt(row.late || 0),
                absent: parseInt(row.absent || 0), leave: parseInt(row.leave || 0),
                cost: parseFloat(row.total_cost || 0)
            };
            stats.actual = stats.present + stats.late;

            // 1. Parent
            if (!groups[mainKey]) groups[mainKey] = { name: mainKey, subs: {}, total: this._initStats() };
            this._accumulateStats(groups[mainKey].total, stats);

            // 2. Child (Sub)
            if (!groups[mainKey].subs[subKeyName]) {
                groups[mainKey].subs[subKeyName] = { 
                    name: subKeyName, 
                    items: {}, 
                    total: this._initStats(),
                    // 🔥 Meta Data ที่ถูกต้องตาม Mode
                    meta: { line: metaLine, shift: metaShift, type: metaType }
                };
            }
            this._accumulateStats(groups[mainKey].subs[subKeyName].total, stats);

            // 3. GrandChild (Item)
            if (!groups[mainKey].subs[subKeyName].items[itemKeyName]) {
                // สำหรับ Grandchild เราใส่ Meta ให้ครบทุกมิติเลยเพื่อความชัวร์
                groups[mainKey].subs[subKeyName].items[itemKeyName] = { 
                    name: itemKeyName, 
                    meta: { 
                        line: row.line_name, 
                        shift: shiftId, 
                        type: row.emp_type 
                    },
                    ...stats 
                };
            } else {
                this._accumulateStats(groups[mainKey].subs[subKeyName].items[itemKeyName], stats);
            }
            this._accumulateStats(grandTotal, stats);
        });

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

    _initStats() { return { hc: 0, plan: 0, present: 0, late: 0, absent: 0, leave: 0, actual: 0, diff: 0, cost: 0 }; },

    _accumulateStats(target, source) {
        target.hc += source.hc; target.plan += source.plan; target.present += source.present;
        target.late += source.late; target.absent += source.absent; target.leave += source.leave;
        target.actual += source.actual; target.cost += source.cost;
    },

    _calculateDiff(obj) { obj.diff = obj.actual - obj.plan; },

    renderTable(data, viewMode = 'LINE') {
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        if (!data || data.length === 0) { tbody.innerHTML = `<tr><td colspan="10" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`; return; }
        
        const { groups, grandTotal } = this.processGroupedData(data, viewMode);
        
        // 1. Grand Total
        tbody.innerHTML += this._createRowHtml('GRAND TOTAL', grandTotal, { isGrand: true });
        
        const sortedKeys = Object.keys(groups).sort();
        sortedKeys.forEach(key => {
            const group = groups[key];
            // 2. Parent Row (Line)
            tbody.innerHTML += this._createRowHtml(group.name, group.total, { 
                isParent: true, 
                viewMode, 
                rawName: group.name 
            });
            
            const sortedSubs = Object.values(group.subs).sort((a, b) => a.name.localeCompare(b.name));
            sortedSubs.forEach(sub => {
                // 3. Child Row (Shift)
                tbody.innerHTML += this._createRowHtml(sub.name, sub.total, { 
                    isChild: true, 
                    meta: sub.meta // Pass Metadata
                });
                
                const sortedItems = Object.values(sub.items).sort((a, b) => a.name.localeCompare(b.name));
                sortedItems.forEach(item => {
                    // 4. Grandchild Row (Type) - Clickable!
                    tbody.innerHTML += this._createRowHtml(item.name, item, { 
                        isGrandChild: true,
                        meta: item.meta // Pass Metadata
                    });
                });
            });
        });
    },

    _createRowHtml(label, stats, options = {}) {
        const { isGrand, isParent, isChild, isGrandChild, viewMode, rawName, meta } = options;
        
        let diffClass = 'text-muted opacity-50', diffPrefix = '';
        if (stats.diff < 0) diffClass = 'text-danger fw-bold';
        else if (stats.diff > 0) { diffClass = 'text-warning fw-bold text-dark'; diffPrefix = '+'; }
        else if (stats.plan > 0) diffClass = 'text-success fw-bold';

        let rowClass = '', nameHtml = label;
        
        // --- 🔗 Drill-down Parameters ---
        let tLine = '', tShift = '', tType = 'ALL';
        let canClick = false;

        if (isGrand) {
            rowClass = 'table-dark fw-bold border-bottom-0';
            nameHtml = `<i class="fas fa-chart-pie me-2"></i>${label}`;
            // Grand Total: View All
            canClick = true; 
        } 
        else if (isParent) {
            rowClass = 'table-secondary fw-bold border-top border-white';
            
            // Icon ตาม Mode
            let icon = 'fa-layer-group';
            if (viewMode === 'TYPE') icon = 'fa-user-tag';
            if (viewMode === 'SHIFT') icon = 'fa-clock';
            nameHtml = `<i class="fas ${icon} me-2 opacity-50"></i>${label}`;

            if (viewMode === 'LINE') {
                tLine = rawName; canClick = true;
            } else if (viewMode === 'TYPE') {
                tType = rawName; canClick = true; // ดู Type นี้ ทั้งโรงงาน
            } else if (viewMode === 'SHIFT') {
                // Shift ชื่ออาจจะซ้ำกัน (Day) ต้องระวัง แต่ปกติกดดูรวมได้
                // tShift = ... (ข้ามไปก่อนเพื่อความชัวร์)
            }

            // ถ้ากดได้ ให้ชื่อเป็น Link
            if (canClick) {
                nameHtml = `<span onclick="event.stopPropagation(); Actions.openDetailModal('${tLine}', '${tShift}', '${tType}', 'ALL')" class="cursor-pointer text-decoration-underline">${nameHtml}</span>`;
            }
        } 
        else if (isChild) {
            rowClass = 'bg-light fw-bold';
            nameHtml = `<div style="padding-left: 25px; border-left: 3px solid #dee2e6;"><span class="text-dark small"><i class="fas fa-angle-right me-1 text-muted"></i>${label}</span></div>`;
            
            // ใช้ Meta ที่ฝังมาจาก processGroupedData
            if (meta) {
                tLine = meta.line || '';
                tShift = meta.shift || '';
                tType = meta.type || 'ALL';
                canClick = true;
            }
        } 
        else if (isGrandChild) {
            rowClass = 'bg-white';
            nameHtml = `<div style="padding-left: 50px; border-left: 3px solid #dee2e6;"><span class="text-secondary small" style="font-size: 0.85rem;">• ${label}</span></div>`;
            
            if (meta) {
                tLine = meta.line;
                tShift = meta.shift;
                tType = meta.type;
                canClick = true;
            }
        }

        const clickAttr = (status) => canClick ? `onclick="event.stopPropagation(); Actions.openDetailModal('${tLine}', '${tShift}', '${tType}', '${status}')" title="Filter: ${status}" style="cursor: pointer;"` : '';
        const hoverClass = canClick ? 'cursor-pointer-cell' : '';
        const costDisplay = stats.cost > 0 ? new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(stats.cost) : '-';

        return `
            <tr class="${rowClass}">
                <td class="ps-3 text-truncate" style="max-width: 300px;">${nameHtml}</td>
                <td class="text-center text-primary border-end border-light opacity-75 small">${stats.hc || '-'}</td>
                <td class="text-center fw-bold ${hoverClass}" ${clickAttr('ALL')}>${stats.plan}</td>
                <td class="text-center text-success ${hoverClass}" ${clickAttr('PRESENT')}>${stats.present || '-'}</td>
                <td class="text-center text-warning text-dark ${hoverClass}" ${clickAttr('LATE')}>${stats.late || '-'}</td>
                <td class="text-center text-danger ${hoverClass}" ${clickAttr('ABSENT')}>${stats.absent || '-'}</td>
                <td class="text-center text-info text-dark ${hoverClass}" ${clickAttr('LEAVE')}>${stats.leave || '-'}</td>
                <td class="text-center fw-bold border-start border-end ${hoverClass}" style="background-color: rgba(0,0,0,0.02);" ${clickAttr('PRESENT_AND_LATE')}>${stats.actual}</td>
                <td class="text-center ${diffClass}">${diffPrefix}${stats.diff}</td>
                <td class="text-end pe-4 text-secondary small">${costDisplay}</td>
            </tr>`;
    },

    animateNumber(elementId, endValue) {
        const obj = document.getElementById(elementId);
        if (!obj) return;
        obj.innerHTML = endValue.toLocaleString();
    },

    showToast(message, type) { alert(message); },
    showLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'block'; },
    hideLoader() { if(document.getElementById('syncLoader')) document.getElementById('syncLoader').style.display = 'none'; },
};

// =============================================================================
// 4. ACTIONS
// =============================================================================

const Actions = {
    _structureCache: { lines: [], teams: [] },
    
    // 🔥 State Management
    _lastDetailParams: { line: '', shiftId: '', empType: '', filterStatus: 'ALL' },

    // -------------------------------------------------------------------------
    // 4.1 DETAIL MODAL (Drill-down)
    // -------------------------------------------------------------------------
    async openDetailModal(line, shiftId, empType = 'ALL', filterStatus = 'ALL') {
        // Handle Backward Compatibility
        if (arguments.length === 3 && (empType === 'ALL' || empType === 'PRESENT' || empType === 'LATE' || empType === 'ABSENT')) {
             filterStatus = empType;
             empType = 'ALL';
        }

        this._lastDetailParams = { line, shiftId, empType, filterStatus };
        
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        
        let title = line ? `${line}` : 'รายละเอียดทั้งหมด';
        if (shiftId) title += ` (${shiftId == 1 ? 'กะเช้า ☀️' : 'กะดึก 🌙'})`;
        if (empType !== 'ALL') title += ` [${empType}]`;
        if (filterStatus !== 'ALL') title += ` - ${filterStatus}`;
        
        document.getElementById('detailModalTitle').innerHTML = `<i class="fas fa-users me-2"></i> ${title}`;
        
        // Dynamic Header (with Cost)
        const tableHeader = `
            <thead>
                <tr class="table-light text-secondary small text-center">
                    <th>พนักงาน</th>
                    <th width="10%">ไลน์</th>
                    <th width="8%">ทีม</th>
                    <th width="8%">กะ</th>
                    <th width="10%">เข้า</th>
                    <th width="10%">ออก</th>
                    <th width="10%">สถานะ</th>
                    <th width="15%">หมายเหตุ</th>
                    <th width="10%" class="text-end">Est. Cost</th>
                    <th width="8%">Action</th>
                </tr>
            </thead>
        `;
        document.getElementById('detailModalTable').innerHTML = `${tableHeader}<tbody id="detailModalBody"><tr><td colspan="10" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr></tbody>`;
        
        modal.show();
        const searchInput = document.getElementById('searchDetail');
        if(searchInput) searchInput.value = '';

        await this.fetchDetailData();
    },

    async fetchDetailData() {
        const { line, shiftId, empType, filterStatus } = this._lastDetailParams;
        const date = document.getElementById('filterDate').value;

        if (this._structureCache.lines.length === 0) { await this.initDropdowns(); }

        try {
            // 🔥 ส่ง empType ไป API
            const url = `api/api_daily_operations.php?action=read_daily&date=${date}&line=${encodeURIComponent(line)}&type=${encodeURIComponent(empType)}`;
            const res = await fetch(url);
            const json = await res.json();
            
            if (json.success) {
                let filteredData = json.data;
                
                // Filter Logic
                if (filterStatus !== 'ALL') {
                    if (filterStatus === 'PRESENT_AND_LATE') {
                        filteredData = json.data.filter(r => r.status === 'PRESENT' || r.status === 'LATE');
                    } else if (filterStatus === 'LEAVE') {
                        // รวมกลุ่ม Leave
                        const nonLeaveStatus = ['PRESENT', 'LATE', 'ABSENT', 'WAITING'];
                        filteredData = json.data.filter(r => !nonLeaveStatus.includes(r.status));
                    } else {
                        filteredData = json.data.filter(r => r.status === filterStatus);
                    }
                }
                
                // Filter Shift
                if (shiftId) {
                    filteredData = filteredData.filter(r => r.shift_id == shiftId || r.default_shift_id == shiftId);
                }

                // Sorting
                filteredData.sort((a, b) => {
                    const score = (row) => {
                        if (parseInt(row.is_forgot_out) === 1) return 0;
                        if (row.status === 'ABSENT') return 1;
                        if (row.status === 'LATE') return 2;
                        return 3;
                    };
                    return score(a) - score(b);
                });

                this.renderDetailTable(filteredData);
            } else {
                document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">${json.message}</td></tr>`;
            }
        } catch (err) {
            console.error(err);
            document.getElementById('detailModalBody').innerHTML = `<tr><td colspan="10" class="text-center text-danger">Failed to load data</td></tr>`;
        }
    },

    renderDetailTable(list) {
        const tbody = document.getElementById('detailModalBody');
        tbody.innerHTML = '';

        if (!list || list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">ไม่พบข้อมูล</td></tr>`;
            return;
        }

        const createOptions = (items, selectedVal) => { /* ...โค้ดเดิม... */
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
            const lineOpts = createOptions(this._structureCache.lines, row.actual_line || row.line); 
            const teamOpts = createOptions(this._structureCache.teams, row.actual_team || row.team_group);
            const shift1Sel = (row.shift_id == 1 || (!row.shift_id && row.default_shift_id == 1)) ? 'selected' : '';
            const shift2Sel = (row.shift_id == 2 || (!row.shift_id && row.default_shift_id == 2)) ? 'selected' : '';

            // --- Status List ---
            const statusOptions = [
                { val: 'WAITING',  label: '⏳ รอเข้างาน' },
                { val: 'PRESENT',  label: '✅ มา (Present)' },
                { val: 'LATE',     label: '⏰ สาย (Late)' },
                { val: 'ABSENT',   label: '❌ ขาด (Absent)' },
                { val: 'SICK',     label: '🤢 ลาป่วย (Sick)' },
                { val: 'BUSINESS', label: '👜 ลากิจ (Business)' },
                { val: 'VACATION', label: '🏖️ พักร้อน (Vacation)' },
                { val: 'OTHER',    label: '⚪ อื่นๆ (Other)' }
            ];
            let statusOptsHtml = '';
            statusOptions.forEach(opt => {
                const sel = (row.status === opt.val) ? 'selected' : '';
                statusOptsHtml += `<option value="${opt.val}" ${sel}>${opt.label}</option>`;
            });

            // --- 🔥 [NEW] Logic เลือกสี Badge แบบ Soft UI ---
            let badgeClass = 'badge-soft-primary'; // Default
            if (row.status === 'PRESENT') badgeClass = 'badge-soft-success';
            else if (row.status === 'LATE') badgeClass = 'badge-soft-warning';
            else if (row.status === 'ABSENT') badgeClass = 'badge-soft-danger';
            else if (['SICK', 'BUSINESS', 'VACATION'].includes(row.status)) badgeClass = 'badge-soft-info';
            else if (row.status === 'WAITING') badgeClass = 'badge bg-light text-secondary border'; // ยังไม่มา

            // Master Data (สำหรับปุ่ม Edit)
            const masterData = { emp_id: row.emp_id, name_th: row.name_th, position: row.position, line: row.line, team_group: row.team_group, default_shift_id: row.default_shift_id, is_active: 1 };
            const masterJson = encodeURIComponent(JSON.stringify(masterData));

            // Logic แถวแดง (ลืมรูด)
            let trClass = '';
            let outTimeDisplay = row.out_time;
            if (parseInt(row.is_forgot_out) === 1) {
                trClass = 'table-danger bg-opacity-10'; // ปรับให้จางลงหน่อยจะได้ไม่แสบตา
                outTimeDisplay = `<span class="text-danger fw-bold small" title="ระบบตัดจบ 8 ชม."><i class="fas fa-exclamation-circle"></i> ลืมรูด</span>`;
            } else if (!outTimeDisplay) {
                outTimeDisplay = ''; 
            }

            const costVal = parseFloat(row.est_cost || 0);
            const costHtml = costVal > 0 ? `<span class="fw-bold ${costVal > 1000 ? 'text-primary' : 'text-dark'}">${costVal.toLocaleString()}</span>` : '<span class="text-muted">-</span>';

            const tr = document.createElement('tr');
            if(trClass) tr.className = trClass;

            tr.innerHTML = `
                <td class="ps-4">
                    <div class="fw-bold text-dark text-truncate" style="max-width: 150px;">${row.name_th}</div>
                    <small class="text-muted font-monospace" style="font-size:0.75rem;">${row.emp_id}</small>
                </td>
                <td class="p-1"><select class="form-select form-select-sm border-0 bg-transparent small shadow-none" id="line_${uid}" style="font-size: 0.8rem;">${lineOpts}</select></td>
                <td class="p-1"><select class="form-select form-select-sm border-0 bg-transparent small shadow-none" id="team_${uid}" style="font-size: 0.8rem;"><option value="-">-</option>${teamOpts}</select></td>
                <td class="p-1">
                    <select class="form-select form-select-sm border-0 bg-transparent small fw-bold text-primary shadow-none" id="shift_${uid}" style="font-size: 0.8rem;">
                        <option value="1" ${shift1Sel}>Day</option><option value="2" ${shift2Sel}>Night</option>
                    </select>
                </td>
                
                <td class="p-1 text-center cursor-pointer-cell">
                    <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0" id="in_${uid}" value="${row.in_time || ''}">
                </td>
                <td class="p-1 text-center cursor-pointer-cell">
                     ${parseInt(row.is_forgot_out) === 1 ? outTimeDisplay : ''}
                     <input type="time" class="form-control form-control-sm border-0 bg-transparent text-center p-0 ${parseInt(row.is_forgot_out) === 1 ? 'd-none' : ''}" id="out_${uid}" value="${row.out_time || ''}">
                     ${parseInt(row.is_forgot_out) === 1 ? `<a href="#" class="small text-decoration-none" onclick="this.previousElementSibling.classList.remove('d-none'); this.previousElementSibling.previousElementSibling.style.display='none'; this.style.display='none'; return false;">แก้</a>` : ''}
                </td>
                
                <td class="p-1">
                    <div class="position-relative">
                        <select class="form-select form-select-sm border-0 bg-transparent fw-bold shadow-none text-uppercase" id="status_${uid}" style="font-size: 0.75rem; z-index:2; position:relative;">
                            ${statusOptsHtml}
                        </select>
                        </div>
                </td>

                <td class="p-1"><input type="text" class="form-control form-control-sm border-0 border-bottom rounded-0 bg-transparent shadow-none" id="remark_${uid}" value="${row.remark || ''}" placeholder="..."></td>
                <td class="text-end pe-3 align-middle">${costHtml}</td>
                <td class="text-center text-nowrap">
                    <button class="btn btn-sm btn-light border shadow-sm rounded-circle me-1" style="width: 28px; height: 28px;" onclick="Actions.openEmpEdit('${masterJson}')"><i class="fas fa-pen text-secondary" style="font-size: 0.7rem;"></i></button>
                    <button class="btn btn-sm btn-primary shadow-sm rounded-circle" style="width: 28px; height: 28px;" onclick="Actions.saveLogStatus('${row.log_id}', '${uid}')"><i class="fas fa-save" style="font-size: 0.7rem;"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // 4.3 Save Inline Status
    async saveLogStatus(logId, empId) {
        const elStatus = document.getElementById(`status_${empId}`);
        const elLine = document.getElementById(`line_${empId}`);
        const elTeam = document.getElementById(`team_${empId}`);
        const elShift = document.getElementById(`shift_${empId}`);
        const elRemark = document.getElementById(`remark_${empId}`);
        const elIn = document.getElementById(`in_${empId}`);
        const elOut = document.getElementById(`out_${empId}`);
        
        if (!elStatus || !elLine) return;

        const dateStr = document.getElementById('filterDate').value;
        const timeIn = elIn.value;
        const timeOut = elOut.value;

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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

        try {
            const res = await fetch('api/api_daily_operations.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update_log', log_id: logId, emp_id: empId, log_date: dateStr,
                    actual_line: elLine.value, actual_team: elTeam.value, shift_id: elShift.value,
                    status: elStatus.value, remark: elRemark.value,
                    scan_in_time: scanInFull, scan_out_time: scanOutFull
                })
            });
            const json = await res.json();

            if (json.success) {
                btn.classList.replace('btn-primary', 'btn-success'); btn.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(async () => {
                    btn.classList.replace('btn-success', 'btn-primary'); btn.innerHTML = originalIcon; btn.disabled = false;
                    await Actions.fetchDetailData(); 
                    App.loadData();
                }, 500);
            } else {
                alert('Error: ' + json.message); btn.innerHTML = originalIcon; btn.disabled = false;
            }
        } catch (err) {
            alert('Failed: ' + err.message); btn.innerHTML = originalIcon; btn.disabled = false;
        }
    },

    // -------------------------------------------------------------------------
    // 4.4 INITIALIZE DROPDOWNS
    // -------------------------------------------------------------------------
    async initDropdowns() {
        try {
            const res = await fetch('api/api_master_data.php?action=read_structure');
            const json = await res.json();
            if (json.success) {
                this._structureCache.lines = json.lines;
                this._structureCache.teams = json.teams;
                
                const lineSelects = ['editLogLine', 'filterLine', 'empEditLine', 'newEmpLine']; 
                lineSelects.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.innerHTML = '<option value="">-- Select --</option>';
                        if(id==='filterLine') el.innerHTML += '<option value="ALL">All Lines</option>';
                        json.lines.forEach(l => el.innerHTML += `<option value="${l}">${l}</option>`);
                    }
                });
                const teamSelects = ['editLogTeam', 'empEditTeam', 'newEmpTeam'];
                teamSelects.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.innerHTML = '<option value="">-</option>';
                        json.teams.forEach(t => el.innerHTML += `<option value="${t}">Team ${t}</option>`);
                    }
                });
            }
        } catch (err) { console.error('Failed to load dropdowns:', err); }
    },

    initSearch() {
        const input = document.getElementById('searchDetail');
        if(!input) return;
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        newInput.addEventListener('keyup', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('#detailModalBody tr');
            rows.forEach(row => {
                const text = row.innerText.toLowerCase();
                row.style.display = text.includes(filter) ? '' : 'none';
            });
        });
    },

    // -------------------------------------------------------------------------
    // 6. SHIFT PLANNER & EMPLOYEE MANAGER
    // -------------------------------------------------------------------------
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
            const shiftBadge = isDay ? `<span class="badge bg-info text-dark"><i class="fas fa-sun me-1"></i> DAY</span>` : `<span class="badge bg-dark"><i class="fas fa-moon me-1"></i> NIGHT</span>`;
            const btnClass = isDay ? 'btn-outline-dark' : 'btn-outline-info';
            const btnLabel = isDay ? '<i class="fas fa-moon me-1"></i> To Night' : '<i class="fas fa-sun me-1"></i> To Day';
            const targetShiftId = isDay ? 2 : 1;
            tbody.innerHTML += `<tr><td class="ps-4"><span class="fw-bold text-primary">${t.team_group || '-'}</span> <small class="text-muted">(${t.member_count} คน)</small></td><td class="text-center">${shiftBadge}</td><td class="text-center text-muted small">${t.default_shift_id}</td><td class="text-center pe-4"><button class="btn btn-sm ${btnClass} fw-bold" onclick="Actions.switchTeamShift('${t.line}', '${t.team_group}', ${targetShiftId})">${btnLabel}</button></td></tr>`;
        });
    },
    async switchTeamShift(line, team, newShiftId) {
        const shiftName = (newShiftId == 1) ? "🌞 DAY" : "🌙 NIGHT";
        if (!confirm(`เปลี่ยนกะของ [${line} - ${team}] เป็น ${shiftName} ?`)) return;
        try {
            const res = await fetch('api/api_master_data.php', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_team_shift', line, team, new_shift_id: newShiftId })
            });
            const json = await res.json();
            if (json.success) { alert(`✅ เปลี่ยนกะสำเร็จ! กรุณากด 'Reset & Sync' ข้อมูลใหม่`); this.openShiftPlanner(); }
            else { alert('Error: ' + json.message); }
        } catch (err) { alert('Failed: ' + err.message); }
    },

    exportExcel() { window.location.href = `api/api_export.php?date=${document.getElementById('filterDate').value}`; },
    
    // Employee Manager Functions
    _employeeCache: [],
    async openEmployeeManager() {
        const modal = new bootstrap.Modal(document.getElementById('empListModal'));
        document.getElementById('empListBody').innerHTML = `<tr><td colspan="8" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>`;
        
        // เช็คว่า Modal เปิดอยู่แล้วหรือเปล่า (ถ้าเปิดอยู่ไม่ต้องสั่ง show ซ้ำ เดี๋ยวจอดำ)
        if(!document.getElementById('empListModal').classList.contains('show')) {
            modal.show();
        }

        // 🔥 รับค่าจาก Checkbox
        const showAll = document.getElementById('showInactiveToggle').checked;

        try {
            // ส่ง param show_all ไป
            const res = await fetch(`api/api_master_data.php?action=read_employees&show_all=${showAll}`);
            const json = await res.json();
            if (json.success) { this._employeeCache = json.data; this.renderEmployeeTable(json.data); }
        } catch (e) { console.error(e); }
    },

    renderEmployeeTable(list) {
         const tbody = document.getElementById('empListBody'); 
         tbody.innerHTML = '';
         
         if (!list || list.length === 0) { 
             tbody.innerHTML = `<tr><td colspan="8" class="text-center py-5 text-muted">ไม่พบข้อมูล</td></tr>`; 
             return; 
         }
         
         list.forEach(emp => {
             // 🔥 [NEW] Badge สถานะ Active (Soft UI)
             const statusBadge = (emp.is_active == 1) 
                ? '<span class="badge badge-soft-success badge-pill">Active</span>' 
                : '<span class="badge bg-light text-secondary border badge-pill">Inactive</span>';
             
             // 🔥 [NEW] Badge ประเภทพนักงาน (Soft UI)
             let typeClass = 'badge-soft-secondary';
             if (emp.emp_type === 'Monthly') typeClass = 'badge-soft-primary';      // สีฟ้า
             else if (emp.emp_type === 'Daily') typeClass = 'badge-soft-success';   // สีเขียว
             else if (emp.emp_type === 'Subcontract') typeClass = 'badge-soft-warning'; // สีเหลือง
             else if (emp.emp_type === 'Student') typeClass = 'badge-soft-info';    // สีฟ้าทะเล
             
             const typeBadge = `<span class="badge ${typeClass} badge-pill">${emp.emp_type}</span>`;

             const empJson = encodeURIComponent(JSON.stringify(emp));
             
             tbody.innerHTML += `
                <tr>
                    <td class="ps-4 font-monospace small text-muted">${emp.emp_id}</td>
                    <td class="fw-bold text-dark">${emp.name_th}</td>
                    <td>${typeBadge}</td> <td><span class="fw-bold text-primary small">${emp.line}</span></td>
                    <td class="text-center small">${emp.shift_name || '-'}</td>
                    <td class="text-center fw-bold text-dark">${emp.team_group || '-'}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center pe-4">
                        <button class="btn btn-sm btn-light border shadow-sm rounded-circle" 
                                style="width: 32px; height: 32px;"
                                onclick="Actions.openEmpEdit('${empJson}')" title="แก้ไขข้อมูล">
                            <i class="fas fa-pen text-secondary" style="font-size: 0.8rem;"></i>
                        </button>
                    </td>
                </tr>
             `;
         });
    },

    filterEmployeeList() {
        const term = document.getElementById('empSearchBox').value.toLowerCase();
        const filtered = this._employeeCache.filter(emp => 
            (emp.name_th && emp.name_th.toLowerCase().includes(term)) || 
            (emp.emp_id && emp.emp_id.toLowerCase().includes(term)) || 
            (emp.line && emp.line.toLowerCase().includes(term)) ||
            (emp.emp_type && emp.emp_type.toLowerCase().includes(term))
        );
        this.renderEmployeeTable(filtered);
    },
    openEmpEdit(data) {
        const modal = new bootstrap.Modal(document.getElementById('empEditModal'));
        const isEdit = !!data;
        document.getElementById('isEditMode').value = isEdit ? '1' : '0';
        document.getElementById('empEditTitle').innerHTML = isEdit ? 'Edit Employee' : 'New Employee';
        
        if(this._structureCache.lines.length === 0) this.initDropdowns();

        if(isEdit) {
            const emp = JSON.parse(decodeURIComponent(data));
            document.getElementById('empEditId').value = emp.emp_id; document.getElementById('empEditId').readOnly = true;
            document.getElementById('empEditName').value = emp.name_th; document.getElementById('empEditPos').value = emp.position;
            
            setTimeout(() => {
                document.getElementById('empEditLine').value = emp.line; 
                document.getElementById('empEditShift').value = emp.default_shift_id;
                document.getElementById('empEditTeam').value = emp.team_group; 
            }, 100);
            
            document.getElementById('empEditActive').checked = (emp.is_active==1);
            if(document.getElementById('btnDeleteEmp')) document.getElementById('btnDeleteEmp').style.display = 'block';
        } else {
            document.getElementById('empEditForm').reset(); 
            document.getElementById('empEditId').readOnly = false; 
            document.getElementById('empEditActive').checked = true;
            if(document.getElementById('btnDeleteEmp')) document.getElementById('btnDeleteEmp').style.display = 'none';
        }
        modal.show();
    },
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
        
        if(!payload.emp_id || !payload.name_th) { alert('Please fill in required fields'); return; }

        try {
            const res = await fetch('api/api_master_data.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const json = await res.json();
            if(json.success) { 
                alert('Saved Successfully!'); 
                bootstrap.Modal.getInstance(document.getElementById('empEditModal')).hide(); 
                
                // 🔥 Auto Refresh Detail Modal
                if(document.getElementById('detailModal').classList.contains('show')){
                    await Actions.fetchDetailData();
                }
                if(document.getElementById('empListModal').classList.contains('show')){
                    Actions.openEmployeeManager(); 
                }
                
                App.loadData(); 
            }
            else alert('Error: ' + json.message);
        } catch(e) { alert('Failed: ' + e.message); }
    },
    async createEmployee() { 
        const payload = {
            action: 'create_employee',
            emp_id: document.getElementById('newEmpId').value,
            name_th: document.getElementById('newEmpName').value,
            position: document.getElementById('newEmpPos').value,
            line: document.getElementById('newEmpLine').value,
            shift_id: document.getElementById('newEmpShift').value,
            team_group: document.getElementById('newEmpTeam').value,
            is_active: 1
        };
        if(!payload.emp_id || !payload.name_th || !payload.line) { alert('Please fill in required fields'); return; }
        try {
            const res = await fetch('api/api_master_data.php', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
            const json = await res.json();
            if(json.success) { alert('Created!'); bootstrap.Modal.getInstance(document.getElementById('createEmpModal')).hide(); App.loadData(); }
            else alert('Error: ' + json.message);
        } catch(e) { alert('Failed: ' + e.message); }
    },
    async deleteEmployee() {
        if(!confirm('Disable this employee?')) return;
        document.getElementById('empEditActive').checked = false;
        this.saveEmployee();
    },

    // -------------------------------------------------------------------------
    // 7. MAPPING MANAGER (Position -> Type)
    // -------------------------------------------------------------------------
    _mappingCache: [],

    async openMappingManager() {
        const modal = new bootstrap.Modal(document.getElementById('mappingModal'));
        modal.show();
        await this.loadMappings();
    },

    async loadMappings() {
        try {
            const res = await fetch('api/api_master_data.php?action=read_mappings');
            const json = await res.json();
            if (json.success) {
                this.renderMappingTable(json.categories);
            }
        } catch (e) { console.error(e); }
    },

    renderMappingTable(list) {
        const tbody = document.getElementById('mappingBody');
        const datalist = document.getElementById('typeList');
        
        tbody.innerHTML = '';
        datalist.innerHTML = ''; // Clear old options

        // เก็บ Type ที่มีอยู่แล้ว (เพื่อเอามาทำ Suggestion)
        const uniqueTypes = new Set(['Monthly', 'Daily', 'Subcontract', 'Student']); // Default

        list.forEach((item, index) => {
            if(item.category_name) uniqueTypes.add(item.category_name);

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4 fw-bold text-dark">${item.keyword}</td>
                    <td><span class="badge bg-light text-dark border">${item.category_name}</span></td>
                    <td class="text-center">
                        <button class="btn btn-sm text-danger" onclick="Actions.deleteMapping(${index})">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        // Update Datalist (สร้างตัวเลือกให้อัตโนมัติ)
        uniqueTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            datalist.appendChild(option);
        });

        this._mappingCache = list; 
    },

    async addMapping() {
        const key = document.getElementById('newMapKeyword').value.trim();
        const type = document.getElementById('newMapType').value.trim(); // รับค่าจากการพิมพ์
        
        if (!key || !type) return alert('กรุณาระบุทั้ง Keyword และ Type');

        // เพิ่มข้อมูลใหม่ลงใน Cache
        this._mappingCache.push({ keyword: key, category_name: type, hourly_rate: 0 });
        
        // Save & Refresh
        await this.saveMappings();
        
        // Clear Inputs
        document.getElementById('newMapKeyword').value = '';
        document.getElementById('newMapType').value = '';
        
        // Re-render (เพื่ออัปเดตตารางและ Datalist)
        this.renderMappingTable(this._mappingCache);
    },

    async deleteMapping(index) {
        if(!confirm('ลบการจับคู่นี้?')) return;
        this._mappingCache.splice(index, 1);
        await this.saveMappings();
        this.renderMappingTable(this._mappingCache);
    },

    async saveMappings() {
        try {
            await fetch('api/api_master_data.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'save_mappings',
                    categories: this._mappingCache
                })
            });
        } catch (e) { alert('Save Error: ' + e.message); }
    }
};